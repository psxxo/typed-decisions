# Changelog

## 1.6.7

Targets OpenClaw 2026.9.9.

- Match the HTML lane's monospace family. That lane's shell defines
  `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`, while
  the Control UI page maps its own mono to `--mono` (a different family). The
  widget's chain fell through `--mono`, so the native widget painted a different
  typeface. `--mono` is out of the chain; both lanes now resolve the same system
  mono stack.

## 1.6.6

Targets OpenClaw 2026.9.9.

- Give the widget's monospace text a working fallback chain. The fragment reads
  `var(--font-mono)`, which the sandboxed HTML lane's theme bridge defines but the
  Control UI page does not (that page defines `--mono`), so in the native widget
  the values fell back to the inherited proportional font and lost the intended
  mono look. The chain is now
  `var(--font-mono, var(--mono, ui-monospace, SFMono-Regular, Menlo, Consolas,
  "Liberation Mono", monospace))` — unchanged in the HTML lane, correct in the page.

## 1.6.5

Targets OpenClaw 2026.9.9.

- Mount the native widget in a shadow root. In the light DOM the Control UI's
  own stylesheet reached the fragment's inner elements — the host ships classes
  such as `.badge` and `.metric` with their own font family and sizes — so the
  widget's typography drifted from the sandboxed HTML lane, which is isolated.
  Theme custom properties still inherit through the shadow boundary.

## 1.6.4

Targets OpenClaw 2026.9.9.

- Pin the widget's typography to the host theme. The native board widget renders
  inside the Control UI page and so inherited the surrounding container's font,
  which differs from the sandboxed HTML lane's shell (that shell uses
  `var(--font-body, ui-sans-serif, system-ui, …)`). `#oa-sys` now sets the same
  family expression, a line height, and keeps the fixed 12px base.

## 1.6.3

Targets OpenClaw 2026.9.9.

- Fix the native sys-status widget under the Control UI CSP. That page serves
  `script-src 'self'` with no `'unsafe-inline'`, so the injected inline
  `<script>` never ran and the widget sat on its initial 读取中… badge. The
  fragment's logic is now compiled into the browser bundle by
  `scripts/generate-widget.mjs`, and the render function looks its nodes up from
  its own root instead of `document`.
- Route the host-metrics read through the plugin: `connect-src` does not cover
  the metrics origin, so the backend exposes `typed-decisions.metrics`
  (`operator.read`, loopback fetch) and the widget reads it through
  `host.request`.

## 1.6.2

Targets OpenClaw 2026.9.9.

- Give the sys-status widget a native board-widget kind (`typed-decisions:sys-status`)
  and pin it through the core `dashboard` tool instead of `show_widget`. The host
  exposes `show_widget` only to runs whose originating client declares the
  inline-widgets capability, so a channel run (for example a Feishu turn) never had
  it: the nudge there could only fail and spend the session's one slot. `dashboard`
  is available on every surface, so the same guidance now mounts the widget in any
  session.
- Register the matching Control UI descriptor (`surface: "widget"`) and declare
  `uiCapabilities`, so the kind is a trusted dashboard renderer any session can put
  on its board.
- Mount the widget in the light DOM and bridge its `openclaw.data.read` handle to the
  plugin host's authenticated Gateway request (a shadow root hid the markup from the
  fragment's own `getElementById`, and the sandboxed-lane bridges do not exist in the
  Control UI page).
- Keep the embedded widget HTML generated from `assets/sys-status-widget.html` in the
  browser build instead of a manual copy.

## 1.6.1

Targets OpenClaw 2026.9.9.

- Gate the sys-status nudge on the turn's finalized tool surface. The guidance
  needs show_widget, which the host exposes only to runs from an inline-capable
  client (Control UI, supported native apps, Discord Activities) or an explicitly
  allowed scheduled pinned-only surface. A channel run without an inline client —
  for example a Feishu turn — never receives it, so the old nudge there could only
  burn the session's one slot and then fail. Registration moved from
  agent_turn_prepare to before_prompt_build with requiresToolAuthority, and the
  guidance is injected only when ctx.toolAuthority allows a widget author; when the
  host cannot prove that authority the handler is skipped (fail closed).
- Count a session as nudged only when the guidance is actually appended, so a turn
  the gate rejects does not spend the session's one nudge.

## 1.6.0

Targets OpenClaw 2026.9.6.

- Port the sys-status dashboard widget nudge from the retired `memory-lancedb-cip`
  plugin: once per session the plugin asks the agent to pin the shared `sys-status`
  widget on that session's board — hook-only (`agent_turn_prepare`), no other
  capability, and it never touches the decision lanes.
- Config-driven, no baked defaults: the nudge stays OFF until the operator sets
  `sysStatus.netOrigins` (optional `sysStatus.tools`, `sysStatus.widgetPath`,
  `sysStatus.enabled`). The widget HTML ships as `assets/sys-status-widget.html`.
## 1.5.1

Targets OpenClaw 2026.9.6.

- Keep the switch on screen: rank the pane that owns the accessory first, then
  genuinely visible composers (`checkVisibility({ checkOpacity: true })`, with a
  computed-style opacity walk as a fallback), then width. The Control UI keeps
  whole chat panes mounted in `.chat-pane-cache`, stacked in one grid cell at
  `opacity: 0`, so a cached pane's composer keeps a real box and used to capture
  the anchor — the switch was placed correctly once and then froze while the
  composer on screen moved. An accessory whose own pane is cached stays hidden.
- Keep the horizontal anchor inside the composer. The access-mode chip lookup
  matched only `button`/`span`/`div` and took the narrowest hit; on a freshly
  opened session page the chip renders through a custom element, so the narrowest
  hit collapsed to a full-width row whose right edge is the composer's own right
  edge, and `right + 16` parked the switch just outside it until the next reload.
  The lookup now matches every element, keeps only the tightest (non-nesting)
  hits, prefers the chip's own control, and the final position is clamped inside
  the composer shell; the composer box and the control lookup are scoped to
  `.agent-chat__composer-shell` instead of walking up from the textarea into a
  page container.
- Place from a post-layout hook. A sidebar drag moves the composer without
  resizing it (the shell is capped by `max-width`), so no resize callback fired
  and the switch waited for the animation-frame loop, whose callback measures the
  previous frame's layout and therefore painted a frame behind the composer.
  Observe the ancestor whose width actually tracks the pane and place from that
  callback (after layout, before paint); scrolling places straight away.
- Follow at frame rate instead of on a signal-triggered burst: the composer shell
  and the anchored control are measured each frame and a full placement runs only
  when that geometry actually moved, with a 250 ms poll as a backstop. Layout
  signals only mark the geometry stale, so a window drag cannot stack a
  synchronous placement on top of the frame pass. Visibility probes are skipped
  when only one composer is on screen.
- Keep following even if the animation-frame loop stalls: `place()` is
  exception-guarded, a 400 ms timer watchdog re-places independently of rAF, and
  `visibilitychange` / `pageshow` re-sync.
- The probe (`window.__openclawTypedDecisions.probe()`) additionally reports
  `loopTicks` / `lastLoopAt`, `places` / `lastPlaceAt`, `reason`, `candidates`,
  `hiddenCandidates`, `anchorDetail` and `placementError`.

## 1.5.0

- Follow the toolbar continuously instead of only on window resize. A low-frequency
  poll (250 ms) keeps the switch locked to the composer row, and any layout signal
  — window resize, viewport resize/scroll, fullscreenchange, or an observed element
  resize — switches to a short per-frame burst (800 ms), so the switch never drifts
  while the page is being resized and stays put relative to the toolbar when the
  chat pane moves horizontally.
- Observe the geometry actually used (the composer box and the admission control)
  instead of `document.documentElement` alone, and write styles only when the
  computed target changed, so continuous syncing causes no layout churn.

## 1.4.1

- Fix the session read: the plugin read its extension from `api.runtime.sessions`,
  which does not exist — the plugin runtime exposes session access as
  `api.runtime.agent.session`. The old `typeof read !== "function" -> return false`
  guard turned that into a permanent "off": `sessions.pluginPatch` writes
  succeeded, but the Control UI read action and the `agent_turn_prepare` hook never
  saw them, so the switch could never take effect. Read via `agent.session` (old
  path kept as fallback) and log a warning instead of hiding the failure.

## 1.4.0

- Anchor the switch to the composer toolbar row instead of a bottom offset.
  Vertical placement is centred on the row's trailing control (the send/mic
  button), which is stable however the composer box's height is composed — the
  previous `bottom - dy` math landed the switch over the input placeholder.
  Horizontal placement anchors after the admission control (matching
  `完全访问|只读|保护|工作区|Full access|Read-only|Guarded|Workspace`, cached 2 s)
  with a 16 px gap, so it sits between that control and the model picker; when
  the control cannot be found it falls back to the numeric offset.
- Probe `placement.anchor` now reports `after-admission` or `composer-offset` so
  which path was taken is visible from the console.

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
