// ../../../../usr/local/lib/node_modules/openclaw/dist/plugin-sdk/control-ui.js
function defineControlUiPlugin(plugin) {
  return plugin;
}

// src/control-ui.ts
var PLUGIN_ID = "typed-decisions";
var NAMESPACE = "decision-intervention";
var SESSION_ACTION_ID = "decision-intervention.state";
var LABEL = "\u51B3\u7B56\u4ECB\u5165";
function registry() {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state = {
    surface: "composer-action",
    activated: false,
    checked: {},
    loaded: [],
    pending: false,
    lastError: null,
    writes: 0,
    updatedAt: null
  };
  const entry = {
    state,
    probe: () => ({ ...state, checked: { ...state.checked }, loaded: [...state.loaded] })
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}
var control_ui_default = defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host) {
    const state = registry().state;
    state.activated = true;
    state.updatedAt = Date.now();
    const inflight = /* @__PURE__ */ new Set();
    const read = async (sessionKey, agentId) => {
      try {
        const response = await host.request("plugins.sessionAction", {
          pluginId: PLUGIN_ID,
          actionId: SESSION_ACTION_ID,
          sessionKey,
          agentId
        });
        if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
        state.checked[sessionKey] = response?.result?.enabled === true;
        if (!state.loaded.includes(sessionKey)) state.loaded.push(sessionKey);
        state.lastError = null;
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[${PLUGIN_ID}] \u8BFB\u53D6\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
      } finally {
        state.updatedAt = Date.now();
        host.ui.invalidate();
      }
    };
    const ensureLoaded = (sessionKey, agentId) => {
      if (!sessionKey) return;
      if (Object.prototype.hasOwnProperty.call(state.checked, sessionKey)) return;
      if (inflight.has(sessionKey)) return;
      inflight.add(sessionKey);
      void read(sessionKey, agentId).finally(() => inflight.delete(sessionKey));
    };
    const toggle = async (sessionKey, agentId) => {
      if (!sessionKey) return;
      const next = state.checked[sessionKey] !== true;
      state.pending = true;
      host.ui.invalidate();
      try {
        await host.request("sessions.pluginPatch", {
          key: sessionKey,
          agentId,
          pluginId: PLUGIN_ID,
          namespace: NAMESPACE,
          value: { enabled: next }
        });
        state.checked[sessionKey] = next;
        state.writes += 1;
        state.lastError = null;
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[${PLUGIN_ID}] \u5199\u5165\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
      } finally {
        state.pending = false;
        state.updatedAt = Date.now();
        host.ui.invalidate();
      }
    };
    host.ui.registerAction({
      id: "decision-intervention",
      label: LABEL,
      placement: "composer",
      resolve: ({ sessionKey, agentId }) => {
        ensureLoaded(sessionKey, agentId);
        const known = Object.prototype.hasOwnProperty.call(state.checked, sessionKey);
        const on = state.checked[sessionKey] === true;
        return {
          label: known ? `${LABEL} \xB7 ${on ? "\u5F00" : "\u5173"}` : LABEL,
          disabled: state.pending
        };
      },
      run: ({ sessionKey, agentId }) => toggle(sessionKey, agentId)
    });
  }
});
export {
  control_ui_default as default
};
