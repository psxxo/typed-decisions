// ../../../../usr/local/lib/node_modules/openclaw/dist/plugin-sdk/control-ui.js
function defineControlUiPlugin(plugin) {
  return plugin;
}

// src/control-ui.ts
var PLUGIN_ID = "typed-decisions";
var NAMESPACE = "decision-intervention";
var SESSION_ACTION_ID = "decision-intervention.state";
var LABEL = "\u51B3\u7B56\u4ECB\u5165";
var Z_INDEX = 2147483e3;
var PROBE_INTERVAL_MS = 3e3;
var PROBE_WINDOW_MS = 6e4;
var DEFAULT_OFFSET = { x: 61, y: 24 };
var STYLE = `
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
function registry() {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state = {
    mounted: false,
    sessionKey: null,
    agentId: null,
    checked: null,
    pending: false,
    placement: { anchored: false, offset: { ...DEFAULT_OFFSET }, left: null, top: null, anchor: null },
    hitTest: { ok: null, x: 0, y: 0, blocking: null },
    lastError: null,
    writes: 0,
    updatedAt: null
  };
  const elements = [];
  const entry = {
    state,
    probe: () => ({
      ...state,
      placement: { ...state.placement, offset: { ...state.placement.offset } },
      hitTest: { ...state.hitTest }
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
    }
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}
function describe(element) {
  if (!element) return null;
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const cls = typeof element.className === "string" && element.className ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}`;
}
function findComposer(anchor) {
  const areas = Array.from(document.querySelectorAll("textarea")).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 120 && rect.height > 0 && element.offsetParent !== null;
  });
  if (areas.length === 0) return null;
  areas.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
  const textarea = areas[areas.length - 1];
  const own = textarea.getBoundingClientRect();
  let node = textarea;
  let best = own;
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
var control_ui_default = defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host) {
    const probe = registry();
    const state = probe.state;
    host.ui.registerAccessory({
      id: "decision-intervention",
      placement: "session-header",
      mount(container, context) {
        const props = context.props ?? {};
        const readKey = () => typeof props.sessionKey === "string" && props.sessionKey || typeof props.key === "string" && props.key || host.sessions.selectedKey || null;
        const readAgent = () => typeof props.agentId === "string" && props.agentId || null;
        let sessionKey = readKey();
        let agentId = readAgent();
        let checked = false;
        let pending = false;
        let disposed = false;
        let presented = context.presented !== false;
        let probeTimer;
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
              anchor: null
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
            anchor: anchorLabel
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
          button.title = state.lastError ? `${LABEL}\uFF1A${state.lastError}` : `${LABEL}\uFF1A${checked ? "\u5F00" : "\u5173"}\uFF08\u672C\u4F1A\u8BDD\uFF09`;
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
              `[${PLUGIN_ID}] \u51B3\u7B56\u4ECB\u5165\u5F00\u5173\u88AB\u9875\u9762\u5143\u7D20\u906E\u6321\uFF1A(${x},${y}) \u547D\u4E2D ${describe(top)}`
            );
          }
        };
        const tick = () => {
          if (disposed) return;
          if (Date.now() > probeDeadline) {
            if (probeTimer) clearInterval(probeTimer);
            probeTimer = void 0;
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
            const response = await host.request("plugins.sessionAction", {
              pluginId: PLUGIN_ID,
              actionId: SESSION_ACTION_ID,
              sessionKey,
              agentId: agentId ?? void 0
            });
            if (disposed) return;
            if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
            checked = response?.result?.enabled === true;
            state.lastError = null;
          } catch (error) {
            if (disposed) return;
            state.lastError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] \u8BFB\u53D6\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
          }
          render();
        };
        const writeState = async (next) => {
          if (!sessionKey) return;
          pending = true;
          render();
          try {
            await host.request("sessions.pluginPatch", {
              key: sessionKey,
              agentId: agentId ?? void 0,
              pluginId: PLUGIN_ID,
              namespace: NAMESPACE,
              value: { enabled: next }
            });
            checked = next;
            state.lastError = null;
            state.writes += 1;
          } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] \u5199\u5165\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
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
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : void 0;
        observer?.observe(document.documentElement);
        render();
        startProbe();
        void readState();
        return {
          update(next) {
            const nextProps = next.props ?? {};
            const nextKey = typeof nextProps.sessionKey === "string" && nextProps.sessionKey || typeof nextProps.key === "string" && nextProps.key || null;
            const nextAgent = typeof nextProps.agentId === "string" && nextProps.agentId || null;
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
            window.removeEventListener("scroll", reposition, { capture: true });
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          }
        };
      }
    });
  }
});
export {
  control_ui_default as default
};
