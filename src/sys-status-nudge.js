import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sys-status-widget.html");
const WIDGET = "sys-status";
const TITLE = "系统监控";
const nudged = new Set();

/** 自动化与接口会话不挂板：只给人工创建的会话挂。 */
function isAutomationSession(key) {
  return key.includes(":subagent:") || key.includes(":cron:") || key.includes(":openai:");
}

function agentIdOf(key) {
  const parts = String(key || "").split(":");
  return parts[0] === "agent" && parts[1] ? parts[1] : null;
}

function dbPathOf(agentId) {
  return join(homedir(), ".openclaw", "agents", agentId, "agent", "openclaw-agent.sqlite");
}

function buildManifest(options) {
  const netOrigins = Array.isArray(options?.netOrigins) ? options.netOrigins.filter((v) => typeof v === "string" && v.trim()) : [];
  const tools = Array.isArray(options?.tools) && options.tools.length ? options.tools : ["health", "sessions.list", "cron.list", "agents.list"];
  return JSON.stringify({
    contentOwner: "html",
    netOrigins,
    tools,
    presentation: "full-bleed",
    heightMode: "auto",
    nameIdentity: { kind: "explicit" },
    grantSemanticsVersion: 2,
  });
}

/** 用插件内置模板写入 html 快照，与现役看板逐字节一致。 */
function pinSnapshot(sessionKey, options) {
  const agentId = agentIdOf(sessionKey);
  if (!agentId) return "no-agent";
  const html = readFileSync(TEMPLATE, "utf8");
  const sha = createHash("sha256").update(html).digest("hex");
  const manifest = buildManifest(options);
  const now = Date.now();
  const viewGeneration = randomBytes(16).toString("hex");

  const db = new DatabaseSync(dbPathOf(agentId));
  try {
    db.exec("PRAGMA busy_timeout = 3000");
    const existing = db.prepare("select content_kind, sha256 from board_widgets where session_key = ? and name = ?").get(sessionKey, WIDGET);
    if (existing && existing.content_kind === "html" && existing.sha256 === sha) return "already";

    const tab = db.prepare("select 1 as ok from board_tabs where session_key = ? and tab_id = 'main'").get(sessionKey);
    if (!tab) {
      db.prepare("insert into board_tabs (session_key, tab_id, title, position, chat_dock, created_by, revision) values (?, 'main', 'Main', 0, 'right', 'agent', 1)").run(sessionKey);
    }

    if (existing) {
      db.prepare(`update board_widgets set tab_id='main', title=?, content_kind='html', html=?, descriptor_json=NULL,
        sha256=?, view_generation=?, revision=coalesce(revision,1)+1, size_w=12, size_h=8, position=0, manifest=?,
        grant_state='granted', granted_sha=?, created_by='agent', updated_at=? where session_key=? and name=?`)
        .run(TITLE, html, sha, viewGeneration, manifest, sha, now, sessionKey, WIDGET);
      return "replaced";
    }

    db.prepare(`insert into board_widgets (session_key, name, tab_id, title, content_kind, html, descriptor_json, sha256,
      view_generation, revision, size_w, size_h, position, manifest, grant_state, granted_sha, created_by, created_at, updated_at)
      values (?, ?, 'main', ?, 'html', ?, NULL, ?, ?, 1, 12, 8, 0, ?, 'granted', ?, 'agent', ?, ?)`)
      .run(sessionKey, WIDGET, TITLE, html, sha, viewGeneration, manifest, sha, now, now);
    return "inserted";
  } finally {
    db.close();
  }
}

export function resetSysStatusNudgeState() {
  nudged.clear();
}

export function registerSysStatusNudge(api, options = {}) {
  if (options?.enabled === false) return false;
  const netOrigins = Array.isArray(options?.netOrigins) ? options.netOrigins.filter((v) => typeof v === "string" && v.trim()) : [];
  if (netOrigins.length === 0) return false;

  api.on?.(
    "before_prompt_build",
    async (event, ctx) => {
      const key = ctx?.sessionKey || event?.sessionKey || event?.context?.sessionKey || "";
      if (!key || nudged.has(key) || isAutomationSession(key)) return;
      nudged.add(key);
      try {
        const result = pinSnapshot(key, options);
        api.logger?.info?.(`[typed-decisions] board snapshot ${result} for ${key}`);
      } catch (error) {
        api.logger?.warn?.(`[typed-decisions] board snapshot failed: ${error?.message ?? error}`);
      }
    },
    { registrationId: "sys-status-pin" },
  );
  return true;
}
