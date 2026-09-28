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

## 「决策介入」 (native Control UI)

The plugin ships a native Control UI action in the chat **composer toolbar**
(`registerAction`, `placement: "composer"`), beside the other input controls.
Turning it on marks **that session** so the agent routes judgments through the
decision model (`typed_decide`) instead of guessing; turning it off restores
plain reasoning. The label carries the state (`决策介入 · 开` / `决策介入 · 关`)
and is disabled while a write is in flight. State lives in this plugin's session
extension (`decisionIntervention`), so it is per session and survives a page
reload.

Because the host renders the action inside the composer row, it stays above the
message layer on its own; there is no plugin-managed z-index or overlay risk.

Requirements on the host:

- **Settings → Labs → Custom plugin UI** (`gateway.controlUi.experimental.customPlugins`)
  for user-installed native UI, plus HTTPS (native assets need the secure cookie).
- `plugins.entries.typed-decisions.hooks.allowConversationAccess: true` if you
  want the prompt-hook half (the control alone works without it; the agent then
  just follows the switch state manually).

The registry keeps a probe for verification:

```js
window.__openclawTypedDecisions.probe()
// { surface: "composer-action", activated: true,
//   checked: { "<sessionKey>": true }, loaded: ["<sessionKey>"],
//   pending: false, lastError: null, writes: 1, updatedAt: 179056... }
//   activated -> the entry ran to completion in the Control UI
//   writes    -> successful toggles; a click that never reached the Gateway shows up here
```

## Building the browser bundle

The backend has no build step and no runtime dependencies. The Control UI
bundle does:

```bash
npm install
npm run build          # scripts/build-ui.mjs -> dist/control-ui/<hash>/index.js
```

The build writes the content-hashed entry into `openclaw.plugin.json.controlUi`.
After a browser-only change, rebuild and use **Plugins → Customize UI → Reload
plugin UI** in the Control UI.

## Notes

- Credentials are re-read per request with a 15 s cache; a transient filesystem
  error keeps the last-known-good key so decisions do not flap.
- Downstream failures map to typed `unavailable` reasons
  (`credentials-unavailable`, `authentication`, `rate-limited`, `transport`,
  `unsupported-input`, `invalid-response`). Caller cancellation rejects, as the
  provider contract requires.
- No runtime dependencies. Only documented host SDK subpaths are imported
  (`openclaw/plugin-sdk/plugin-entry` eagerly, optional host helpers lazily);
  the browser bundle keeps its `openclaw/plugin-sdk/control-ui` import external.
