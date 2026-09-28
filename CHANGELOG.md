# Changelog

## 1.2.0

- Move「决策介入」from the session header into the chat **composer toolbar**
  (`registerAction` with `placement: "composer"` instead of `registerAccessory`),
  so it sits in the input row beside the other composer controls. The host
  renders the action inside the composer's own stacking context, so it stays
  above the message layer without the plugin managing z-index.
- The control is now a host-rendered action with a state-aware label
  (`决策介入 · 开` / `决策介入 · 关`, `disabled` while a write is in flight)
  instead of a custom shadow-DOM switch, because `registerAccessory` only offers
  the `session-header` placement this change moves away from.
- Rework the probe: it now reports `activated`, per-session `checked`, `loaded`,
  `pending`, `lastError`, `writes` and `updatedAt`
  (`window.__openclawTypedDecisions.probe()`). The click-occlusion hit test is
  gone with the custom element — the host owns the button's layering now.

## 1.1.2

- Fix a scope bug in the browser entry: the probe's element list was declared
  inside `registry()` while `mount()`/`render()` referenced it directly, so the
  accessory threw `ReferenceError: elements is not defined` at mount time and
  the Control UI showed "retry plugin view". The registry now owns `add`/`drop`
  operations and exposes its state.
- Type-check the browser source (`tsc --noEmit`, `npm run typecheck`) as part of
  `npm run build`, so this class of error fails the build instead of the page.

## 1.1.1

- Bundle the host SDK into the browser entry instead of emitting a bare
  `openclaw/plugin-sdk/control-ui` import. This host serves user-installed
  plugin UI without an import map, so the bare import failed module resolution
  and the plugin never activated (`status: failed`, "Failed to resolve module
  specifier") — matching the bundled Workboard asset, which ships no imports.
- Drop the non-contract `label` field from `registerAccessory`.

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
