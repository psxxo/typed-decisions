# Typed Decisions

OpenClaw **decision model** provider that speaks the System One protocol. One
forward pass returns typed `choice` / `score` / `boolean` judgments with
probability distributions and confidence, without generating text.

- Runtime id: `typed-decisions`
- Model reference: `typed-decisions/decision-model-preview`
- Request: `POST <endpoint>/compatible-mode/v1/systemone`

It registers `contracts.decisionProviders: ["typed-decisions"]` and appears in the
Control UI's **Decision** picker only — never in the chat / primary / fallback /
utility model pickers.

## Configuration

```json5
{
  plugins: {
    entries: {
      "typed-decisions": {
        enabled: true,
        config: {
          // Required: System One endpoint host (bare host or origin URL).
          endpoint: "<host>",
          // Optional: file holding the API key (0600).
          // Default: ~/.openclaw/.secrets/decision-model.key
          keyFile: "~/.openclaw/.secrets/decision-model.key",
          timeoutMs: 20000,
        },
      },
    },
  },
  agents: {
    defaults: { decisionModel: "typed-decisions/decision-model-preview" },
  },
}
```

`credential` is also accepted (an inline string, or a SecretRef when the host
prepares it). `keyFile` is preferred: the secret stays out of the config file.

## Optional evaluation tool

The plugin also registers an **optional** `typed_decide` tool for explicit
agent-side evaluations. It is off until allowlisted:

```json5
{ tools: { allow: ["typed_decide"] } }
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
