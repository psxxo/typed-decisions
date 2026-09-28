// Typed Decisions — native Control UI contribution.
//
// Contributes a session-header accessory that renders the「决策介入」switch
// (switch left of the label) and persists its state as this plugin's session
// extension through the host's `sessions.pluginPatch` method.
//
// Monitoring is built in: the component owns a probe that reports whether the
// switch is actually clickable (`document.elementFromPoint` hit test) so an
// overlay stealing clicks is detected without repeated manual clicking.
//
// Only the documented SDK subpath is imported; everything else is plain DOM.

import { defineControlUiPlugin, type ControlUiHost } from "openclaw/plugin-sdk/control-ui";

const PLUGIN_ID = "typed-decisions";
const NAMESPACE = "decision-intervention";
const SESSION_ACTION_ID = "decision-intervention.state";
const LABEL = "决策介入";
const TAG = "typed-decisions-intervention";
const PROBE_INTERVAL_MS = 3000;
const PROBE_WINDOW_MS = 60_000;

type Probe = {
  mounted: boolean;
  sessionKey: string | null;
  agentId: string | null;
  checked: boolean | null;
  pending: boolean;
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
  padding: 3px 8px 3px 6px; border-radius: 999px;
  border: 1px solid var(--border, rgba(127,127,127,.35));
  background: transparent; color: inherit;
  font: inherit; font-size: 12px; line-height: 1.4;
  cursor: pointer; user-select: none;
}
.td-switch:hover { background: var(--hover, rgba(127,127,127,.12)); }
.td-switch:disabled { cursor: progress; opacity: .7; }
.td-switch:focus-visible { outline: 2px solid var(--accent, #4c8dff); outline-offset: 1px; }
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
.td-switch[data-state="error"] { border-color: #d9534f; }
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
    hitTest: { ok: null, x: 0, y: 0, blocking: null },
    lastError: null,
    writes: 0,
    updatedAt: null,
  };
  const elements: HTMLElement[] = [];
  const entry: ProbeRegistry = {
    state,
    probe: () => ({ ...state, hitTest: { ...state.hitTest } }),
    elements: () => [...elements],
    add: (element) => {
      if (elements.indexOf(element) < 0) elements.push(element);
    },
    drop: (element) => {
      const index = elements.indexOf(element);
      if (index >= 0) elements.splice(index, 1);
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
        let probeTimer: ReturnType<typeof setInterval> | undefined;
        let probeDeadline = 0;

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
          state.hitTest = {
            ok: hits,
            x,
            y,
            blocking: hits ? null : describe(top),
          };
          if (!hits && top) {
            // A non-throwing diagnostic; repeated logging is bounded by the probe window.
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
          hitTest();
        };

        const startProbe = () => {
          probeDeadline = Date.now() + PROBE_WINDOW_MS;
          if (probeTimer) clearInterval(probeTimer);
          probeTimer = setInterval(tick, PROBE_INTERVAL_MS);
          requestAnimationFrame(tick);
        };

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
            if (nextKey !== sessionKey || nextAgent !== agentId) {
              sessionKey = nextKey ?? sessionKey;
              agentId = nextAgent;
              checked = false;
              state.lastError = null;
              render();
              void readState();
            }
            if (next.presented) startProbe();
          },
          focus() {
            button.focus();
          },
          dispose() {
            disposed = true;
            if (probeTimer) clearInterval(probeTimer);
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          },
        };
      },
    });
  },
});
