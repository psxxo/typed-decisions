# Changelog

## 1.3.3

- Fix the state read: the plugin's `decision-intervention.state` action declares
  an empty-object schema, so `plugins.sessionAction` must carry `payload: {}`.
  Omitting it made the host reject every read with
  `INVALID_REQUEST … does not match schema: <root>: must be object`, which the
  UI painted as an error (red label) on first paint until the first successful
  write cleared it. The read now sends the payload, and retries once.
- Separate read failures from write failures (`errorKind`): only a failed
  **write** marks the control as errored; a read failure stays diagnostic
  (`lastError` in the probe plus a console warning) instead of recolouring the
  label, since it does not mean the control itself is broken.

## 1.3.2

- Keep the on-state colour tied to the host theme (`var(--accent, #2f7cf6)`). The
  1.3.1 attempt to force green is withdrawn at the owner's request — the red seen
  here is the theme accent, not an error, and it should stay consistent with the
  rest of the UI. The real error state is still distinguishable by its red label
  text (`data-state="error"`).

## 1.3.1

- Placement tweak from the owner's review: default offset becomes `{x: 61, y: 24}`
  (15 px right, 10 px down from the 1.3.0 defaults), so the switch sits where the
  red-box annotation pointed.
- Drop the switch's border and drop shadow; it now reads as a bare control in the
  composer row.

## 1.3.0

- Put the original「决策介入」switch back and **move it by offset** into the chat
  composer row instead of swapping registration surfaces. The control is still a
  `registerAccessory` (session-header) mount, positioned with `position: fixed`
  at coordinates derived from the composer box (`left = composer.left + dx`,
  `top = composer.bottom - dy`), re-computed on resize/scroll/layout changes.
  A fixed element escapes ancestor clipping and the explicit z-index keeps it on
  top, so it is neither clipped by the transcript nor covered by app overlays.
  Supersedes the 1.2.0 composer-action approach, which replaced the control's
  look and feel; the owner wanted this control relocated, not replaced.
- Offsets default to `{x: 46, y: 34}` and are tunable live from the page:
  `window.__openclawTypedDecisions.nudge(dx, dy)` returns the new offset. The
  probe reports `placement` (anchored / offset / left / top / anchor) alongside
  the previous `hitTest`, so the placement can be verified from the console.
- Falls back to the plain session-header position when no composer is on screen
  (non-chat views), and hides while its pane is not presented.

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
