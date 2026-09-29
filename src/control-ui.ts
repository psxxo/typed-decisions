// Typed Decisions — native Control UI contribution.
//
// Contributes a session-header accessory that renders the「决策介入」switch and
// **relocates it by offset** into the chat composer row (bottom input area),
// keeping it visually on top of the message layer.
//
// Why offset instead of another registration surface: the Control UI offers
// exactly one accessory placement (`session-header`), so the control is mounted
// there and then positioned with `position: fixed` at coordinates derived from
// the composer, re-computed as the layout changes. A fixed element escapes
// ancestor clipping, and an explicit z-index keeps it above the app layers.
//
// Monitoring is built in: the component owns a probe that reports whether the
// switch is actually the topmost element at its own center
// (`document.elementFromPoint`), so an overlay stealing clicks is detected
// without repeated manual clicking. Tune the placement live with
// `window.__openclawTypedDecisions.nudge(dx, dy)`.
//
// Only the documented SDK subpath is imported; everything else is plain DOM.

import { defineControlUiPlugin, type ControlUiHost } from "openclaw/plugin-sdk/control-ui";

const PLUGIN_ID = "typed-decisions";
const NAMESPACE = "decision-intervention";
const SESSION_ACTION_ID = "decision-intervention.state";
const LABEL = "决策介入";
const Z_INDEX = 2147483000;
const PROBE_INTERVAL_MS = 3000;
const PROBE_WINDOW_MS = 60_000;

/** Distance from the composer box's left/bottom edges to the switch. */
const DEFAULT_OFFSET = { x: 61, y: 24 };
/** Gap between the admission control's right edge and the switch. */
const DEFAULT_GAP = 16;
/** Admission-control labels (the row control the switch sits after). */
const ADMISSION_LABEL = /完全访问|只读|保护|工作区|Full access|Read-only|Guarded|Workspace/;
/** The host stacks cached chat panes in one grid cell at `opacity: 0`. */
const PANE_SELECTOR = ".chat-pane-cache__pane";
const PANE_VISIBLE_CLASS = "chat-pane-cache__pane--visible";
/** The composer's own box; the anchor must never leave it. */
const COMPOSER_SHELL_SELECTOR = ".agent-chat__composer-shell";

type Offset = { x: number; y: number };

type Probe = {
  mounted: boolean;
  sessionKey: string | null;
  agentId: string | null;
  checked: boolean | null;
  pending: boolean;
  placement: {
    anchored: boolean;
    offset: Offset;
    left: number | null;
    top: number | null;
    anchor: string | null;
  };
  hitTest: { ok: boolean | null; x: number; y: number; blocking: string | null };
  lastError: string | null;
  errorKind: "read" | "write" | null;
  writes: number;
  updatedAt: number | null;
  /** Follow-loop diagnostics: is the animation-frame loop still running? */
  loopTicks: number;
  lastLoopAt: number | null;
  /** Placement diagnostics: what the last sync resolved to. */
  places: number;
  lastPlaceAt: number | null;
  reason: "none" | "after-admission" | "composer-offset";
  candidates: number;
  hiddenCandidates: number;
  anchorDetail: string | null;
  placementError: string | null;
};

type ProbeRegistry = {
  readonly state: Probe;
  probe: () => Probe;
  elements: () => HTMLElement[];
  add: (element: HTMLElement) => void;
  drop: (element: HTMLElement) => void;
  nudge: (dx: number, dy: number) => Offset;
};

declare global {
  interface Window {
    __openclawTypedDecisions?: ProbeRegistry;
  }
}

const STYLE = `
:host { display: inline-flex; align-items: center; }
.td-switch {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 3px 6px; border: 0; outline: none;
  background: transparent; color: inherit;
  font: inherit; font-size: 12px; line-height: 1.4;
  cursor: pointer; user-select: none;
}
.td-switch:disabled { cursor: progress; opacity: .7; }
.td-switch:focus-visible { outline: 2px solid #4c8dff; outline-offset: 1px; border-radius: 999px; }
.td-track {
  position: relative; width: 26px; height: 15px; border-radius: 999px;
  background: rgba(127,127,127,.45); transition: background .15s ease;
}
.td-knob {
  position: absolute; top: 1.5px; left: 1.5px; width: 12px; height: 12px;
  border-radius: 50%; background: #fff; transition: transform .15s ease;
}
.td-switch[aria-checked="true"] .td-track { background: var(--accent, #2f7cf6); }
.td-switch[aria-checked="true"] .td-knob { transform: translateX(11px); }
.td-label { white-space: nowrap; }
.td-switch[data-state="error"] .td-label { color: #d9534f; }
`;

function registry(): ProbeRegistry {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state: Probe = {
    mounted: false,
    sessionKey: null,
    agentId: null,
    checked: null,
    pending: false,
    placement: { anchored: false, offset: { ...DEFAULT_OFFSET }, left: null, top: null, anchor: null },
    hitTest: { ok: null, x: 0, y: 0, blocking: null },
    lastError: null,
    errorKind: null,
    writes: 0,
    updatedAt: null,
    loopTicks: 0,
    lastLoopAt: null,
    places: 0,
    lastPlaceAt: null,
    reason: "none",
    candidates: 0,
    hiddenCandidates: 0,
    anchorDetail: null,
    placementError: null,
  };
  const elements: HTMLElement[] = [];
  const entry: ProbeRegistry = {
    state,
    probe: () => ({
      ...state,
      placement: { ...state.placement, offset: { ...state.placement.offset } },
      hitTest: { ...state.hitTest },
    }),
    elements: () => [...elements],
    add: (element) => {
      if (elements.indexOf(element) < 0) elements.push(element);
    },
    drop: (element) => {
      const index = elements.indexOf(element);
      if (index >= 0) elements.splice(index, 1);
    },
    nudge: (dx, dy) => {
      state.placement.offset.x += dx;
      state.placement.offset.y += dy;
      for (const element of elements) element.dispatchEvent(new Event("td:reposition"));
      return { ...state.placement.offset };
    },
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}

function describe(element: Element | null): string | null {
  if (!element) return null;
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const cls =
    typeof (element as HTMLElement).className === "string" && (element as HTMLElement).className
      ? `.${(element as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

function isReallyVisible(element: Element): boolean {
  const probe = element as Element & {
    checkVisibility?: (options?: { checkOpacity?: boolean }) => boolean;
  };
  if (typeof probe.checkVisibility === "function") {
    try {
      return probe.checkVisibility({ checkOpacity: true });
    } catch {
      // Older engines reject the options bag; fall through to the manual walk.
    }
  }
  let node: Element | null = element;
  for (let depth = 0; node && depth < 40; depth += 1) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}

function findPlacement(
  container: HTMLElement,
  button: HTMLElement,
  offset: Offset,
  cached: { admission: Element | null; at: number },
): { left: number; top: number; label: "after-admission" | "composer-offset"; box: HTMLElement; anchor: Element | null; candidates: number; hiddenCandidates: number; anchorDetail: string | null } | null {
  const areas = Array.from(document.querySelectorAll("textarea")).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 120 && rect.height > 0 && element.offsetParent !== null;
  });
  if (areas.length === 0) return null;

  // A cached pane's composer keeps a real box (the pane is only translucent), so
  // the geometry filter above cannot tell it apart from the composer on screen.
  // Picking the widest textarea outright therefore latched onto a hidden pane's
  // composer, which never moves while the composer the owner is looking at does:
  // the switch looked correctly placed and then froze. Rank the pane that owns
  // this accessory first, then genuinely visible composers, then width.
  const ownPane = container.closest(PANE_SELECTOR);
  // The common case is exactly one composer on screen; skip the visibility
  // probes then — each one costs a style walk, and running them per candidate on
  // every placement showed up as lag while dragging the window.
  const ranked =
    areas.length === 1
      ? [{ element: areas[0], width: 0, visible: true, samePane: true }]
      : areas
          .map((element) => ({
            element,
            width: element.getBoundingClientRect().width,
            visible: isReallyVisible(element),
            samePane: ownPane !== null && element.closest(PANE_SELECTOR) === ownPane,
          }))
          .sort((a, b) => {
            if (a.samePane !== b.samePane) return a.samePane ? -1 : 1;
            if (a.visible !== b.visible) return a.visible ? -1 : 1;
            return b.width - a.width;
          });
  const textarea = ranked[0].element;
  const candidates = ranked.length;
  const hiddenCandidates = ranked.filter((candidate) => !candidate.visible).length;

  // Root everything in the composer's own shell. Walking up from the textarea
  // works on a settled chat pane, but on a freshly opened page the shell's
  // ancestor (a draft/launcher column) measures as wide as the shell, so the
  // walk kept climbing into a page container — and the control lookup then
  // latched onto an element outside the composer, pushing the switch past the
  // composer's right edge until the next reload. Scoping the box and the
  // control lookups to the shell keeps the switch inside the composer whatever
  // the surrounding layout is doing.
  const shell = textarea.closest(COMPOSER_SHELL_SELECTOR) as HTMLElement | null;
  let box = (shell ?? textarea).getBoundingClientRect();
  let node: HTMLElement = shell ?? textarea;
  if (!shell) {
    const limit = Math.min(window.innerHeight * 0.5, 480);
    for (let depth = 0; depth < 8 && node.parentElement; depth += 1) {
      const parent = node.parentElement;
      const rect = parent.getBoundingClientRect();
      if (rect.width + 4 < box.width) break;
      if (rect.height > limit) break;
      box = rect;
      node = parent;
    }
  }

  const isVisible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  // Vertical: centre on the row's own trailing control (send/mic), which is a
  // stable structural anchor regardless of how the box's height is composed.
  const buttons = Array.from(node.querySelectorAll("button")).filter(isVisible);
  const trailing = buttons[buttons.length - 1];
  const trailingRect = trailing?.getBoundingClientRect();
  const own = button.getBoundingClientRect();
  const top = trailingRect && trailingRect.height > 0
    ? Math.round(trailingRect.top + (trailingRect.height - own.height) / 2)
    : Math.round(box.bottom - offset.y - own.height);

  // Horizontal: after the admission control when we can find it, else a plain
  // offset from the composer box's left edge. The lookup is cached briefly.
  let admission = cached.admission;
  if (!admission || !admission.isConnected || !isVisible(admission)) {
    admission = null;
    if (Date.now() - cached.at > 2000) {
      cached.at = Date.now();
      // The Control UI renders some chips through custom elements, so match on
      // every element and keep only the tightest matches: a container that
      // merely wraps the chip must never capture the anchor, or the switch
      // lands at the container's right edge — outside the composer.
      const matches = Array.from(node.querySelectorAll("*")).filter((element) => {
        const text = (element.textContent ?? "").trim();
        return text.length > 0 && ADMISSION_LABEL.test(text);
      });
      const tightest = matches.filter(
        (element) => !matches.some((other) => other !== element && element.contains(other)),
      );
      tightest.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
      for (const candidate of tightest) {
        const control = (candidate.closest("button, [role='button']") ?? candidate) as Element;
        const anchor = node.contains(control) ? control : candidate;
        if (isVisible(anchor)) {
          admission = anchor;
          break;
        }
      }
      cached.admission = admission;
    }
  }

  // Whatever the anchor resolved to, the control belongs inside the composer:
  // clamp it, so a wrapper that slips through can never park the switch outside
  // the box the owner is looking at.
  const frame = (shell ?? node).getBoundingClientRect();
  const clamp = (value: number, min: number, max: number) =>
    Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
  const rawLeft = admission
    ? Math.round(admission.getBoundingClientRect().right + DEFAULT_GAP)
    : Math.round(box.left + offset.x);
  const left = clamp(rawLeft, frame.left + 4, frame.right - own.width - 4);
  const placementTop = clamp(top, frame.top, frame.bottom - own.height);
  const anchorDetail = admission
    ? `${describe(admission)} right=${Math.round(admission.getBoundingClientRect().right)}`
    : null;

  if (admission) {
    return {
      left,
      top: placementTop,
      label: "after-admission",
      box: node,
      anchor: admission,
      candidates,
      hiddenCandidates,
      anchorDetail,
    };
  }
  return {
    left,
    top: placementTop,
    label: "composer-offset",
    box: node,
    anchor: null,
    candidates,
    hiddenCandidates,
    anchorDetail,
  };
}

export default defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host: ControlUiHost) {
    const probe = registry();
    const state = probe.state;

    host.ui.registerAccessory({
      id: "decision-intervention",
      placement: "session-header",
      mount(container, context) {
        const props = (context.props ?? {}) as Record<string, unknown>;
        const readKey = () =>
          (typeof props.sessionKey === "string" && props.sessionKey) ||
          (typeof props.key === "string" && props.key) ||
          host.sessions.selectedKey ||
          null;
        const readAgent = () => (typeof props.agentId === "string" && props.agentId) || null;

        let sessionKey = readKey();
        let agentId = readAgent();
        let checked = false;
        let pending = false;
        let disposed = false;
        let presented = context.presented !== false;
        let probeTimer: ReturnType<typeof setInterval> | undefined;
        let probeDeadline = 0;
        let frame = 0;

        const root = container.attachShadow ? container.attachShadow({ mode: "open" }) : container;
        const style = document.createElement("style");
        style.textContent = STYLE;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "td-switch";
        button.setAttribute("role", "switch");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("aria-label", LABEL);
        const track = document.createElement("span");
        track.className = "td-track";
        const knob = document.createElement("span");
        knob.className = "td-knob";
        track.append(knob);
        const label = document.createElement("span");
        label.className = "td-label";
        label.textContent = LABEL;
        button.append(track, label);
        root.append(style, button);

        // Places the control in the composer toolbar row; falls back to the
        // session header when no composer is on screen. The control is re-synced
        // continuously (see the follow loop) and only writes styles when the
        // target actually moved, so the switch stays static relative to the
        // toolbar through window resizes, fullscreen, and pane reflows.
        const admissionCache: { admission: Element | null; at: number } = { admission: null, at: 0 };
        const applied = { left: Number.NaN, top: Number.NaN };
        let observedBox: HTMLElement | null = null;
        let observedAnchor: Element | null = null;
        const place = () => {
          if (disposed) return;
          if (!presented) {
            container.style.display = "none";
            return;
          }
          // A cached pane keeps its DOM (and its accessory) mounted at opacity 0:
          // its switch would sit invisible behind the active pane, so skip it
          // instead of painting a control nobody can see or click.
          const ownPane = container.closest(PANE_SELECTOR);
          if (ownPane && !ownPane.classList.contains(PANE_VISIBLE_CLASS)) {
            container.style.display = "none";
            return;
          }
          container.style.display = "";
          const target = findPlacement(container, button, state.placement.offset, admissionCache);
          if (!target) {
            applied.left = Number.NaN;
            applied.top = Number.NaN;
            state.reason = "none";
            state.candidates = 0;
            state.hiddenCandidates = 0;
            state.anchorDetail = null;
            state.placement = {
              anchored: false,
              offset: { ...state.placement.offset },
              left: null,
              top: null,
              anchor: null,
            };
            container.style.position = "";
            container.style.left = "";
            container.style.top = "";
            container.style.zIndex = "";
            return;
          }

          // Watch the geometry we actually depend on: the composer box and the
          // admission control. A pane move that leaves their size unchanged is
          // caught by the follow loop's poll instead.
          if (target.box !== observedBox) {
            if (observedBox) observer?.unobserve(observedBox);
            observedBox = target.box;
            observer?.observe(target.box);
          }
          if (target.anchor !== observedAnchor) {
            if (observedAnchor) observer?.unobserve(observedAnchor);
            observedAnchor = target.anchor;
            if (target.anchor) observer?.observe(target.anchor);
          }

          state.placement = {
            anchored: true,
            offset: { ...state.placement.offset },
            left: target.left,
            top: target.top,
            anchor: target.label,
          };
          state.reason = target.label;
          state.candidates = target.candidates;
          state.hiddenCandidates = target.hiddenCandidates;
          state.anchorDetail = target.anchorDetail;
          if (applied.left === target.left && applied.top === target.top && container.style.position === "fixed") {
            return;
          }
          state.places += 1;
          state.lastPlaceAt = Date.now();
          applied.left = target.left;
          applied.top = target.top;
          container.style.position = "fixed";
          container.style.left = `${target.left}px`;
          container.style.top = `${target.top}px`;
          container.style.zIndex = String(Z_INDEX);
        };

        // A placement must never be able to kill the follow loop: a throw here
        // would otherwise escape every animation frame and leave the switch
        // frozen at whatever coordinate it last wrote.
        const safePlace = () => {
          try {
            place();
          } catch (error) {
            state.placementError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] 定位失败：${state.placementError}`);
          }
        };

        // Continuous alignment, at frame rate but writing only when the tracked
        // geometry actually moved: the composer shell and the control the switch
        // hangs off are measured every frame, and a full placement runs only when
        // that geometry changed (plus a slow poll as a backstop). Signals no
        // longer place synchronously — a window drag fires resize every frame, and
        // placing inside the event both forced layout mid-event and stacked a
        // second placement on top of the frame loop, which read as lag.
        const POLL_MS = 250;
        let lastSync = 0;
        let lastSignature = "";
        const trackedSignature = () => {
          if (!observedBox) return "";
          const box = observedBox.getBoundingClientRect();
          const anchor = observedAnchor?.getBoundingClientRect();
          const anchorKey = anchor ? `${Math.round(anchor.left)},${Math.round(anchor.top)}` : "";
          return `${Math.round(box.left)},${Math.round(box.top)},${Math.round(box.width)},${Math.round(box.height)}|${anchorKey}`;
        };
        const syncNow = () => {
          lastSync = Date.now();
          safePlace();
          lastSignature = trackedSignature();
        };
        // A layout signal only marks the geometry stale; the frame loop below does
        // the work, so a burst of signals cannot stack up placements.
        const follow = () => {
          lastSignature = "";
        };
        const loop = () => {
          if (disposed) return;
          frame = requestAnimationFrame(loop);
          state.loopTicks += 1;
          state.lastLoopAt = Date.now();
          if (trackedSignature() !== lastSignature || Date.now() - lastSync >= POLL_MS) {
            syncNow();
          }
        };

        const render = () => {
          button.setAttribute("aria-checked", checked ? "true" : "false");
          button.disabled = pending;
          button.dataset.state = state.errorKind === "write" ? "error" : "ok";
          button.title = state.lastError
            ? `${LABEL}：${state.lastError}`
            : `${LABEL}：${checked ? "开" : "关"}（本会话）`;
          state.mounted = true;
          state.sessionKey = sessionKey;
          state.agentId = agentId;
          state.checked = checked;
          state.pending = pending;
          state.updatedAt = Date.now();
          probe.add(button);
          follow();
        };

        const hitTest = () => {
          const rect = button.getBoundingClientRect();
          const x = Math.round(rect.left + rect.width / 2);
          const y = Math.round(rect.top + rect.height / 2);
          if (rect.width === 0 || rect.height === 0) {
            state.hitTest = { ok: false, x, y, blocking: "not-rendered" };
            return;
          }
          const top = document.elementFromPoint(x, y);
          const hits = Boolean(top && (top === container || container.contains(top) || top === button));
          state.hitTest = { ok: hits, x, y, blocking: hits ? null : describe(top) };
          if (!hits && top) {
            console.warn(
              `[${PLUGIN_ID}] 决策介入开关被页面元素遮挡：(${x},${y}) 命中 ${describe(top)}`,
            );
          }
        };

        const tick = () => {
          if (disposed) return;
          if (Date.now() > probeDeadline) {
            if (probeTimer) clearInterval(probeTimer);
            probeTimer = undefined;
            return;
          }
          safePlace();
          hitTest();
        };

        const startProbe = () => {
          probeDeadline = Date.now() + PROBE_WINDOW_MS;
          if (probeTimer) clearInterval(probeTimer);
          probeTimer = setInterval(tick, PROBE_INTERVAL_MS);
          requestAnimationFrame(tick);
        };

        const reposition = () => {
          safePlace();
          follow();
        };

        const readState = async () => {
          if (!sessionKey) return;
          // The action's input schema is an empty object, so the payload must be
          // present: omitting it fails host validation with
          // "plugin session action payload does not match schema: <root>: must be object".
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const response = await host.request<{
                ok?: boolean;
                result?: { enabled?: boolean };
                error?: string;
              }>("plugins.sessionAction", {
                pluginId: PLUGIN_ID,
                actionId: SESSION_ACTION_ID,
                sessionKey,
                agentId: agentId ?? undefined,
                payload: {},
              });
              if (disposed) return;
              if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
              checked = response?.result?.enabled === true;
              state.lastError = null;
              state.errorKind = null;
              render();
              return;
            } catch (error) {
              if (disposed) return;
              state.lastError = error instanceof Error ? error.message : String(error);
              state.errorKind = "read";
              console.warn(`[${PLUGIN_ID}] 读取决策介入状态失败：${state.lastError}`);
              if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
          render();
        };

        const writeState = async (next: boolean) => {
          if (!sessionKey) return;
          pending = true;
          render();
          try {
            await host.request("sessions.pluginPatch", {
              key: sessionKey,
              agentId: agentId ?? undefined,
              pluginId: PLUGIN_ID,
              namespace: NAMESPACE,
              value: { enabled: next },
            });
            checked = next;
            state.lastError = null;
            state.errorKind = null;
            state.writes += 1;
          } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
            state.errorKind = "write";
            console.warn(`[${PLUGIN_ID}] 写入决策介入状态失败：${state.lastError}`);
          }
          pending = false;
          render();
          hitTest();
        };

        button.addEventListener("click", () => {
          if (pending) return;
          void writeState(!checked);
        });
        button.addEventListener("td:reposition", reposition);
        const onLayout = () => follow();
        window.addEventListener("resize", onLayout);
        window.addEventListener("scroll", onLayout, { passive: true, capture: true });
        document.addEventListener("fullscreenchange", onLayout);
        window.visualViewport?.addEventListener("resize", onLayout);
        window.visualViewport?.addEventListener("scroll", onLayout);
        const observer =
          typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => follow()) : undefined;
        observer?.observe(document.documentElement);

        // Belt and braces for the follow loop: a plain timer keeps re-placing
        // even when no animation frame arrives (throttled/backgrounded rAF, a
        // frame budget stall), so the switch can never sit frozen while its
        // composer has moved.
        const WATCHDOG_MS = 400;
        const watchdog = setInterval(() => {
          if (disposed) return;
          safePlace();
          lastSignature = trackedSignature();
        }, WATCHDOG_MS);
        document.addEventListener("visibilitychange", onLayout);
        window.addEventListener("pageshow", onLayout);

        render();
        startProbe();
        void readState();
        frame = requestAnimationFrame(loop);

        return {
          update(next) {
            const nextProps = (next.props ?? {}) as Record<string, unknown>;
            const nextKey =
              (typeof nextProps.sessionKey === "string" && nextProps.sessionKey) ||
              (typeof nextProps.key === "string" && nextProps.key) ||
              null;
            const nextAgent = (typeof nextProps.agentId === "string" && nextProps.agentId) || null;
            presented = next.presented !== false;
            if (nextKey !== sessionKey || nextAgent !== agentId) {
              sessionKey = nextKey ?? sessionKey;
              agentId = nextAgent;
              checked = false;
              state.lastError = null;
              state.errorKind = null;
              render();
              void readState();
            } else {
              follow();
            }
            if (next.presented) startProbe();
          },
          focus() {
            button.focus();
          },
          dispose() {
            disposed = true;
            if (probeTimer) clearInterval(probeTimer);
            clearInterval(watchdog);
            if (frame) cancelAnimationFrame(frame);
            observer?.disconnect();
            document.removeEventListener("visibilitychange", onLayout);
            window.removeEventListener("pageshow", onLayout);
            window.removeEventListener("resize", onLayout);
            window.removeEventListener("scroll", onLayout, { capture: true } as EventListenerOptions);
            document.removeEventListener("fullscreenchange", onLayout);
            window.visualViewport?.removeEventListener("resize", onLayout);
            window.visualViewport?.removeEventListener("scroll", onLayout);
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          },
        };
      },
    });
  },
});
