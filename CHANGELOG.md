# Changelog

## 1.1.0

- Adds a native Control UI accessory: the **「决策介入」** switch in the chat
  window's session header (switch control to the left of the label). It reads
  and writes this plugin's session extension, so the state is per session and
  survives a page reload.
- Adds the `decision-intervention` session extension (mirrored to the
  `decisionIntervention` session slot) plus the `decision-intervention.state`
  session action that the accessory uses to read the current value.
- Adds an `agent_turn_prepare` prompt hook: while a session has 决策介入 on, the
  turn gets guidance to route judgments through the decision model
  (`typed_decide`) instead of guessing. The hook is optional host surface —
  without `hooks.allowConversationAccess` the registration is blocked and the
  provider keeps working unchanged.
- Ships a prebuilt browser bundle (`dist/control-ui/<hash>/index.js`) declared
  through `openclaw.plugin.json.controlUi`; build it with
  `npm run build` (`scripts/build-ui.mjs`, esbuild). Loading it in the Control
  UI requires **Settings → Labs → Custom plugin UI**.
- The accessory carries its own probe (`window.__openclawTypedDecisions.probe()`)
  that reports mount state and a `document.elementFromPoint` hit test, so an
  overlay stealing clicks is detected without repeated manual clicking.

## 1.0.0

Initial release, targeting OpenClaw 2026.9.6.

- Registers the `typed-decisions` decision provider and the static model
  `typed-decisions/decision-model-preview`, so it appears in the Control UI
  **Decision** picker.
- Bridges OpenClaw's `choice` / `score` / `boolean` questions onto the System One
  API (`POST <endpoint>/compatible-mode/v1/systemone`), returning reported
  labels, probability distributions, confidence, and token usage.
- Adds the optional `typed_decide` tool for explicit agent-side evaluations.
- Reads its credential from a `0600` key file (default
  `~/.openclaw/.secrets/decision-model.key`); no build step and no runtime
  dependencies.
- Every downstream failure maps to a typed `unavailable` reason; caller
  cancellation rejects, per the decision-provider contract.
