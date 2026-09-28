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

The plugin ships a native Control UI accessory: the **决策介入** switch, with the
switch control to the left of the label. It is mounted in the session header and
then **relocated by offset** into the chat composer row (bottom input area), so
it sits where the input controls live while keeping its own look.

Turning it on marks **that session** so the agent routes judgments through the
decision model (`typed_decide`) instead of guessing; turning it off restores
plain reasoning. State lives in this plugin's session extension
(`decisionIntervention`), so it is per session and survives a page reload.

How the offset works: the Control UI offers a single accessory placement
(`session-header`), so the control is mounted there and positioned with
`position: fixed` from the composer box's geometry
(`left = composer.left + dx`, `top = composer.bottom - dy`). A fixed element
escapes ancestor clipping, and an explicit z-index keeps it above the app
layers — so it is not clipped by the transcript nor covered by overlays. The
coordinates are recomputed on resize, scroll, and layout changes; outside a chat
view (no composer) the control falls back to its plain header position.

Requirements on the host:

- **Settings → Labs → Custom plugin UI** (`gateway.controlUi.experimental.customPlugins`)
  for user-installed native UI, plus HTTPS (native assets need the secure cookie).
- `plugins.entries.typed-decisions.hooks.allowConversationAccess: true` if you
  want the prompt-hook half (the switch alone works without it; the agent then
  just follows the switch state manually).

The accessory owns a probe for verification and live tuning:

```js
window.__openclawTypedDecisions.probe()
// { mounted, sessionKey, agentId, checked, pending,
//   placement: { anchored, offset: {x,y}, left, top, anchor },
//   hitTest: { ok, x, y, blocking }, lastError, writes, updatedAt }
//   hitTest.ok === false -> `blocking` names the element covering the switch

window.__openclawTypedDecisions.nudge(-10, 4)  // shift by dx,dy; returns the new offset
```

Defaults are `{x: 46, y: 34}`; `nudge()` adjusts the live placement so the values
can be dialed in from the console and then baked into `DEFAULT_OFFSET`.

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
