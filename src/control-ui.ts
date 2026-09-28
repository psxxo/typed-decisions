// Typed Decisions — native Control UI contribution.
//
// Contributes a composer action「决策介入」in the chat input toolbar (host
// placement `composer`), so the control sits inside the composer row rather
// than in the session header. The host renders the action inside the composer's
// own stacking context, which keeps it above the message layer instead of
// relying on our own z-index.
//
// State is per session, stored as this plugin's session extension through the
// host's `sessions.pluginPatch` method and read back through the plugin's
// `decision-intervention.state` session action.
//
// Monitoring: the registry keeps a probe (`window.__openclawTypedDecisions`),
// exposed on the page as a function:
//
//   window.__openclawTypedDecisions.probe()
//   // { surface, activated, checked, loaded, pending, lastError, writes, updatedAt }
//
// `activated: true` means this entry ran to completion inside the Control UI;
// `writes` counts successful toggles, so a click that never reaches the Gateway
// is visible instead of silent.

import { defineControlUiPlugin, type ControlUiHost } from "openclaw/plugin-sdk/control-ui";

const PLUGIN_ID = "typed-decisions";
const NAMESPACE = "decision-intervention";
const SESSION_ACTION_ID = "decision-intervention.state";
const LABEL = "决策介入";

type Probe = {
  surface: "composer-action";
  activated: boolean;
  checked: Record<string, boolean>;
  loaded: string[];
  pending: boolean;
  lastError: string | null;
  writes: number;
  updatedAt: number | null;
};

type Registry = {
  readonly state: Probe;
  probe: () => Probe;
};

declare global {
  interface Window {
    __openclawTypedDecisions?: Registry;
  }
}

function registry(): Registry {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state: Probe = {
    surface: "composer-action",
    activated: false,
    checked: {},
    loaded: [],
    pending: false,
    lastError: null,
    writes: 0,
    updatedAt: null,
  };
  const entry: Registry = {
    state,
    probe: () => ({ ...state, checked: { ...state.checked }, loaded: [...state.loaded] }),
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}

export default defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host: ControlUiHost) {
    const state = registry().state;
    state.activated = true;
    state.updatedAt = Date.now();

    const inflight = new Set<string>();

    const read = async (sessionKey: string, agentId?: string) => {
      try {
        const response = await host.request<{
          ok?: boolean;
          result?: { enabled?: boolean };
          error?: string;
        }>("plugins.sessionAction", {
          pluginId: PLUGIN_ID,
          actionId: SESSION_ACTION_ID,
          sessionKey,
          agentId,
        });
        if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
        state.checked[sessionKey] = response?.result?.enabled === true;
        if (!state.loaded.includes(sessionKey)) state.loaded.push(sessionKey);
        state.lastError = null;
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[${PLUGIN_ID}] 读取决策介入状态失败：${state.lastError}`);
      } finally {
        state.updatedAt = Date.now();
        host.ui.invalidate();
      }
    };

    const ensureLoaded = (sessionKey: string, agentId?: string) => {
      if (!sessionKey) return;
      if (Object.prototype.hasOwnProperty.call(state.checked, sessionKey)) return;
      if (inflight.has(sessionKey)) return;
      inflight.add(sessionKey);
      void read(sessionKey, agentId).finally(() => inflight.delete(sessionKey));
    };

    const toggle = async (sessionKey: string, agentId?: string) => {
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
          value: { enabled: next },
        });
        state.checked[sessionKey] = next;
        state.writes += 1;
        state.lastError = null;
      } catch (error) {
        state.lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[${PLUGIN_ID}] 写入决策介入状态失败：${state.lastError}`);
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
          label: known ? `${LABEL} · ${on ? "开" : "关"}` : LABEL,
          disabled: state.pending,
        };
      },
      run: ({ sessionKey, agentId }) => toggle(sessionKey, agentId),
    });
  },
});
