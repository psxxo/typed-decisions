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
  writes: number;
  updatedAt: number | null;
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
.td-switch[aria-checked="true"] .td-track { background: #22c55e; }
.td-switch[aria-checked="true"] .td-knob { transform: translateX(11px); }
.td-label { white-space: nowrap; }
.td-switch[data-state="error"] .td-track { background: #d9534f; }
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
    writes: 0,
    updatedAt: null,
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

/**
 * Locate the composer box: the widest visible textarea's enclosing container.
 * Returns null outside a chat view (no composer on screen).
 */
function findComposer(anchor: Element | null): { rect: DOMRect; label: string | null } | null {
  const areas = Array.from(document.querySelectorAll("textarea")).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 120 && rect.height > 0 && element.offsetParent !== null;
  });
  if (areas.length === 0) return null;
  areas.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
  const textarea = areas[areas.length - 1];
  const own = textarea.getBoundingClientRect();
  let node: HTMLElement = textarea;
  let best = own;
  // Climb while the ancestor still covers the textarea's width, to reach the
  // container that also holds the toolbar row below the input.
  for (let depth = 0; depth < 6 && node.parentElement; depth += 1) {
    const parent = node.parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.width + 1 < best.width) break;
    if (rect.height <= best.height) break;
    best = rect;
    node = parent;
  }
  return { rect: best, label: describe(anchor ?? node) };
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

        // Offsets the control into the composer row; falls back to the session
        // header when no composer is on screen.
        const place = () => {
          if (disposed) return;
          if (!presented) {
            container.style.display = "none";
            return;
          }
          container.style.display = "";
          const found = findComposer(container);
          if (!found) {
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
          const { rect, label: anchorLabel } = found;
          const left = Math.round(rect.left + state.placement.offset.x);
          const top = Math.round(rect.bottom - state.placement.offset.y);
          container.style.position = "fixed";
          container.style.left = `${left}px`;
          container.style.top = `${top}px`;
          container.style.zIndex = String(Z_INDEX);
          state.placement = {
            anchored: true,
            offset: { ...state.placement.offset },
            left,
            top,
            anchor: anchorLabel,
          };
        };

        const schedule = () => {
          if (disposed || frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            place();
          });
        };

        const render = () => {
          button.setAttribute("aria-checked", checked ? "true" : "false");
          button.disabled = pending;
          button.dataset.state = state.lastError ? "error" : "ok";
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
          schedule();
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
          place();
          hitTest();
        };

        const startProbe = () => {
          probeDeadline = Date.now() + PROBE_WINDOW_MS;
          if (probeTimer) clearInterval(probeTimer);
          probeTimer = setInterval(tick, PROBE_INTERVAL_MS);
          requestAnimationFrame(tick);
        };

        const reposition = () => schedule();

        const readState = async () => {
          if (!sessionKey) return;
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
            });
            if (disposed) return;
            if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
            checked = response?.result?.enabled === true;
            state.lastError = null;
          } catch (error) {
            if (disposed) return;
            state.lastError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] 读取决策介入状态失败：${state.lastError}`);
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
            state.writes += 1;
          } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
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
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, { passive: true, capture: true });
        const observer =
          typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : undefined;
        observer?.observe(document.documentElement);

        render();
        startProbe();
        void readState();

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
              render();
              void readState();
            } else {
              schedule();
            }
            if (next.presented) startProbe();
          },
          focus() {
            button.focus();
          },
          dispose() {
            disposed = true;
            if (probeTimer) clearInterval(probeTimer);
            if (frame) cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, { capture: true } as EventListenerOptions);
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          },
        };
      },
    });
  },
});
