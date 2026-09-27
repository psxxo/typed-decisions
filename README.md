# Bailian Decisions

OpenClaw **decision model** provider backed by Aliyun Bailian (Model Studio)
System One — `decision-model-preview`. One forward pass returns typed
`choice` / `score` / `boolean` judgments with probability distributions and
confidence, without generating text.

- Model reference: `bailian-decisions/decision-model-preview`
- Endpoint: `POST https://<endpoint>/compatible-mode/v1/systemone`
- Upstream docs: <https://help.aliyun.com/zh/model-studio/decision-model-api>

It registers `contracts.decisionProviders: ["bailian-decisions"]` and appears in
the Control UI's **Decision** picker only — never in the chat/primary/fallback/
utility model pickers.

## Configuration

```json5
{
  plugins: {
    entries: {
      "bailian-decisions": {
        enabled: true,
        config: {
          // Default: ~/.openclaw/.secrets/dashscope-decision.key (chmod 600)
          keyFile: "~/.openclaw/.secrets/dashscope-decision.key",
          // Default: trial.cn-beijing.maas.aliyuncs.com
          // Production: "<WorkspaceId>.cn-beijing.maas.aliyuncs.com"
          endpoint: "trial.cn-beijing.maas.aliyuncs.com",
          timeoutMs: 20000,
        },
      },
    },
  },
  agents: {
    defaults: { decisionModel: "bailian-decisions/decision-model-preview" },
  },
}
```

`apiKey` is also accepted (an inline string, or a SecretRef when the host
prepares it). `keyFile` is preferred: the secret stays out of the config file.

## Optional evaluation tool

The plugin also registers an **optional** `bailian_decide` tool for explicit
agent-side evaluations. It is off until allowlisted:

```json5
{ tools: { allow: ["bailian_decide"] } }
```

It accepts `state` plus a `questions` map and returns the evaluated outcome.
Tool availability and the decision-model role are independent: allowlisting the
tool does not select a background model, and selecting the role does not expose
the tool.

## Notes

- Credentials are re-read per request with a 15 s cache; a transient filesystem
  error keeps the last-known-good key so decisions do not flap.
- Downstream failures map to typed `unavailable` reasons
  (`credentials-unavailable`, `authentication`, `rate-limited`, `transport`,
  `unsupported-input`, `invalid-response`). Caller cancellation rejects, as the
  provider contract requires.
- No build step, no runtime dependencies. Only the documented
  `openclaw/plugin-sdk/plugin-entry` subpath is imported eagerly.
