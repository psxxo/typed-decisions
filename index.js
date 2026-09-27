// Typed Decisions — a System One decision provider for OpenClaw's decisionModel role.
//
// Maps OpenClaw's decision question types onto the System One protocol:
//   choice  ->  choice  (reported label + probabilities + confidence)
//   score   ->  score   (fractional zero-based index + index-aligned probabilities)
//   boolean ->  noul    (P(true))
//
// Endpoint: POST <endpoint>/compatible-mode/v1/systemone
//
// Design constraints for long-term stability:
//   * no build step, no runtime dependencies, plain ESM JavaScript
//   * only the documented SDK subpath `openclaw/plugin-sdk/plugin-entry` is
//     imported eagerly; optional host helpers are loaded lazily inside try/catch
//   * every downstream failure maps to a typed `unavailable` reason; only caller
//     cancellation rejects (per the decision-provider contract)
//   * never blocks the event loop: one bounded fetch per request, no timers kept

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";

const PLUGIN_ID = "typed-decisions";
const PROVIDER_ID = "typed-decisions";
const DEFAULT_MODEL = "decision-model-preview";
const DEFAULT_KEY_FILE = join(homedir(), ".openclaw", ".secrets", "decision-model.key");
const DEFAULT_TIMEOUT_MS = 20_000;
const HOST_MAX_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const KEY_CACHE_TTL_MS = 15_000;

/** Typed downstream failure; maps 1:1 onto the contract's ProviderFailureReason. */
class Unavailable extends Error {
  constructor(reason, retryAfterMs) {
    super(`typed-decisions: ${reason}`);
    this.name = "UnavailableDecision";
    this.reason = reason;
    if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs)) {
      this.retryAfterMs = Math.max(0, Math.min(60_000, Math.round(retryAfterMs)));
    }
  }
}

function abortError() {
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}

function expandHome(value) {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  return value;
}

/** Accepts a bare host or an origin URL; returns a bare host, or undefined. */
function normalizeEndpoint(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const host = value.trim().replace(/^https?:\/\//i, "").split("/")[0].trim();
  return host || undefined;
}

function normalizeConfig(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const keyFile =
    typeof cfg.keyFile === "string" && cfg.keyFile.trim() ? expandHome(cfg.keyFile.trim()) : DEFAULT_KEY_FILE;
  const timeoutMs =
    typeof cfg.timeoutMs === "number" && Number.isFinite(cfg.timeoutMs) && cfg.timeoutMs > 0
      ? Math.min(cfg.timeoutMs, HOST_MAX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS;
  return { credential: cfg.credential, keyFile, endpoint: normalizeEndpoint(cfg.endpoint), timeoutMs };
}

/** DecisionEntry -> plain text for the vendor rubric fields. */
function entryText(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function modelName(context) {
  const raw = typeof context?.model === "string" ? context.model.trim() : "";
  if (!raw) return DEFAULT_MODEL;
  const tail = raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
  return tail || DEFAULT_MODEL;
}

/** OpenClaw question batch -> System One request body. */
function buildRequest(model, batch) {
  const questions = {};
  const source =
    batch && typeof batch === "object" && batch.questions && typeof batch.questions === "object"
      ? batch.questions
      : {};
  for (const [id, question] of Object.entries(source)) {
    if (!question || typeof question !== "object") return { error: "unsupported-input" };
    const instructions = entryText(question.instructions);
    if (question.type === "choice") {
      const criteria = {};
      const offered = question.criteria && typeof question.criteria === "object" ? question.criteria : {};
      for (const [label, description] of Object.entries(offered)) {
        criteria[String(label)] = entryText(description) ?? "";
      }
      if (Object.keys(criteria).length < 2) return { error: "unsupported-input" };
      questions[id] = { type: "choice", criteria, ...(instructions !== undefined ? { instructions } : {}) };
    } else if (question.type === "score") {
      const criteria = Array.isArray(question.criteria)
        ? question.criteria.map((level) => entryText(level) ?? "")
        : null;
      if (!criteria || criteria.length < 2) return { error: "unsupported-input" };
      questions[id] = { type: "score", criteria, ...(instructions !== undefined ? { instructions } : {}) };
    } else if (question.type === "boolean") {
      const criteria = {};
      const offered = question.criteria && typeof question.criteria === "object" ? question.criteria : {};
      if (offered.true !== undefined && offered.true !== null) criteria.true = entryText(offered.true);
      if (offered.false !== undefined && offered.false !== null) criteria.false = entryText(offered.false);
      questions[id] = {
        type: "noul",
        ...(instructions !== undefined ? { instructions } : {}),
        ...(Object.keys(criteria).length ? { criteria } : {}),
      };
    } else {
      return { error: "unsupported-input" };
    }
  }
  const state = batch?.state === undefined || batch?.state === null ? "" : batch.state;
  return { model, payload: { model, state, questions } };
}

function clampProbability(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : undefined;
}

function hasMass(values) {
  return values.some((value) => typeof value === "number" && value > 0);
}

/** System One answers -> validated OpenClaw answers, keyed by the submitted ids. */
function normalizeAnswers(batch, raw) {
  if (!raw || typeof raw !== "object") throw new Unavailable("invalid-response");
  const table = raw.answers && typeof raw.answers === "object" ? raw.answers : null;
  if (!table) throw new Unavailable("invalid-response");
  const out = {};
  const questions = batch && typeof batch.questions === "object" ? batch.questions : {};
  for (const [id, question] of Object.entries(questions)) {
    const answer = table[id];
    if (!answer || typeof answer !== "object") throw new Unavailable("invalid-response");
    if (question.type === "choice") {
      if (typeof answer.choice !== "string" || !answer.choice) throw new Unavailable("invalid-response");
      const labels = Object.keys(question.criteria ?? {});
      const probabilities = {};
      for (const label of labels) probabilities[label] = clampProbability(answer.probabilities?.[label]) ?? 0;
      if (!(answer.choice in probabilities)) {
        probabilities[answer.choice] = clampProbability(answer.probabilities?.[answer.choice]) ?? 1;
      }
      if (!hasMass(Object.values(probabilities))) probabilities[answer.choice] = 1;
      const entry = { type: "choice", choice: answer.choice, probabilities };
      const confidence = clampProbability(answer.confidence);
      if (confidence !== undefined) entry.confidence = confidence;
      out[id] = entry;
    } else if (question.type === "score") {
      const levels = Array.isArray(question.criteria) ? question.criteria.length : 0;
      if (levels < 2) throw new Unavailable("invalid-response");
      const score = typeof answer.score === "number" && Number.isFinite(answer.score) ? answer.score : undefined;
      if (score === undefined) throw new Unavailable("invalid-response");
      let probabilities;
      if (Array.isArray(answer.probabilities)) {
        probabilities = answer.probabilities.slice(0, levels).map((value) => clampProbability(value) ?? 0);
      } else if (answer.probabilities && typeof answer.probabilities === "object") {
        probabilities = [];
        for (let index = 0; index < levels; index += 1) {
          probabilities.push(clampProbability(answer.probabilities[String(index)]) ?? 0);
        }
      } else {
        probabilities = [];
      }
      while (probabilities.length < levels) probabilities.push(0);
      if (!hasMass(probabilities)) {
        const index = Math.min(levels - 1, Math.max(0, Math.round(score)));
        probabilities[index] = 1;
      }
      const entry = {
        type: "score",
        score: Math.min(levels - 1, Math.max(0, score)),
        probabilities,
      };
      const confidence = clampProbability(answer.confidence);
      if (confidence !== undefined) entry.confidence = confidence;
      out[id] = entry;
    } else {
      const probabilityTrue = clampProbability(answer.noul);
      if (probabilityTrue === undefined) throw new Unavailable("invalid-response");
      out[id] = { type: "boolean", probabilityTrue };
    }
  }
  return out;
}

function readUsage(raw) {
  const inputTokens = raw?.usage?.input_tokens;
  if (typeof inputTokens !== "number" || !Number.isFinite(inputTokens) || inputTokens < 0) return undefined;
  return { inputTokens: Math.round(inputTokens) };
}

function retryAfterMs(response) {
  const header = response.headers?.get?.("retry-after");
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

async function callSystemOne({ endpoint, payload, credential, signal, timeoutMs }) {
  const url = `https://${endpoint}/compatible-mode/v1/systemone`;
  const controller = new AbortController();
  const outerAborted = () => Boolean(signal?.aborted);
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) throw abortError();
    signal.addEventListener("abort", onOuterAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${credential}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "error",
      });
    } catch {
      if (outerAborted()) throw abortError();
      throw new Unavailable("transport");
    }
    if (response.status === 401 || response.status === 403) throw new Unavailable("authentication");
    if (response.status === 429) throw new Unavailable("rate-limited", retryAfterMs(response));
    let text;
    try {
      text = await response.text();
    } catch {
      if (outerAborted()) throw abortError();
      throw new Unavailable("transport");
    }
    if (!response.ok) {
      if (response.status === 400) throw new Unavailable("unsupported-input");
      throw new Unavailable("transport");
    }
    if (text.length > MAX_RESPONSE_BYTES) throw new Unavailable("invalid-response");
    try {
      return JSON.parse(text);
    } catch {
      throw new Unavailable("invalid-response");
    }
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onOuterAbort);
  }
}

export default definePluginEntry({
  id: PLUGIN_ID,
  name: "Typed Decisions",
  description: "System One typed decision provider (choice / score / boolean) for the decisionModel role.",
  register(api) {
    const config = normalizeConfig(api.pluginConfig);
    const keyCache = { path: undefined, value: undefined, mtimeMs: 0, checkedAt: 0 };

    async function readKeyFile(path) {
      const now = Date.now();
      if (keyCache.path === path && keyCache.value && now - keyCache.checkedAt < KEY_CACHE_TTL_MS) {
        return keyCache.value;
      }
      try {
        const info = await stat(path);
        if (keyCache.path === path && keyCache.value && keyCache.mtimeMs === info.mtimeMs) {
          keyCache.checkedAt = now;
          return keyCache.value;
        }
        const raw = await readFile(path, "utf8");
        const value = raw.trim();
        if (!value) return undefined;
        keyCache.path = path;
        keyCache.value = value;
        keyCache.mtimeMs = info.mtimeMs;
        keyCache.checkedAt = now;
        return value;
      } catch {
        // Transient failures keep the last-known-good value so a blip does not
        // take decisions down; a genuinely missing file yields undefined.
        return keyCache.path === path ? keyCache.value : undefined;
      }
    }

    async function preparedSecret() {
      try {
        const mod = await import("openclaw/plugin-sdk/secret-input-runtime");
        const value = mod?.getPreparedPluginSecretInput?.(PLUGIN_ID, "credential")?.value;
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
      } catch {
        return undefined;
      }
    }

    async function resolveCredential() {
      const configured = config.credential;
      if (typeof configured === "string" && configured.trim()) return configured.trim();
      if (configured && typeof configured === "object") {
        const value = await preparedSecret();
        if (value) return value;
      }
      return readKeyFile(config.keyFile);
    }

    async function evaluate(batch, context) {
      try {
        if (!config.endpoint) return { status: "unavailable", reason: "credentials-unavailable" };
        const credential = await resolveCredential();
        if (!credential) return { status: "unavailable", reason: "credentials-unavailable" };
        const model = modelName(context);
        const built = buildRequest(model, batch);
        if (built.error) return { status: "unavailable", reason: built.error };
        const remaining =
          typeof context?.deadlineMonotonicMs === "number"
            ? context.deadlineMonotonicMs - performance.now()
            : Number.POSITIVE_INFINITY;
        const timeoutMs = Math.max(1, Math.min(config.timeoutMs, remaining));
        const raw = await callSystemOne({
          endpoint: config.endpoint,
          payload: built.payload,
          credential,
          signal: context?.signal,
          timeoutMs,
        });
        const result = {
          model: typeof raw?.model === "string" && raw.model ? raw.model : model,
          answers: normalizeAnswers(batch, raw),
        };
        const usage = readUsage(raw);
        if (usage) result.usage = usage;
        return { status: "ok", result };
      } catch (error) {
        if (context?.signal?.aborted) throw error;
        if (error instanceof Unavailable) {
          const outcome = { status: "unavailable", reason: error.reason };
          if (typeof error.retryAfterMs === "number") outcome.retryAfterMs = error.retryAfterMs;
          return outcome;
        }
        try {
          api.logger?.warn?.(`[${PLUGIN_ID}] unexpected evaluate failure: ${error?.message ?? error}`);
        } catch {
          /* logging must never break a decision */
        }
        return { status: "unavailable", reason: "transport" };
      }
    }

    api.registerDecisionProvider({
      id: PROVIDER_ID,
      contractVersion: 1,
      // Credential availability is checked on every call; reporting ready when an
      // endpoint is configured keeps the provider self-healing when the key file
      // is created later.
      isReady: () => Boolean(config.endpoint),
      evaluate,
    });

    // Optional explicit-evaluation tool. Off unless the operator allowlists it.
    api.registerTool(
      {
        name: "typed_decide",
        label: "Typed Decision",
        description:
          "Evaluate evidence against a rubric with the configured decision model. Returns typed " +
          "choice / score / boolean judgments with probability distributions and confidence. Use " +
          "for routing, urgency scoring, or predicate checks.",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            state: {
              description: "Evidence to judge: a string, or a JSON object/array.",
            },
            questions: {
              type: "object",
              additionalProperties: true,
              description:
                "Map of question id to question object. choice: {type:'choice',instructions?,criteria:{label:description}}. " +
                "score: {type:'score',instructions?,criteria:[level, ...]}. " +
                "boolean: {type:'boolean',instructions?,criteria?:{true?,false?}}.",
            },
          },
          required: ["state", "questions"],
        },
        async execute(_toolCallId, params) {
          const batch = {
            state: params?.state === undefined ? null : params.state,
            questions: params?.questions && typeof params.questions === "object" ? params.questions : {},
          };
          const outcome = await api.runtime.decisions.evaluate(batch, {
            purpose: "typed-decisions.tool",
            rubricVersion: "1",
            timeoutMs: config.timeoutMs,
            signal: new AbortController().signal,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(outcome, null, 2) }],
            details: outcome,
          };
        },
      },
      { name: "typed_decide", optional: true },
    );
  },
});
