/**
 * sys-status nudge — once per session, remind the agent to pin the shared
 * system-status dashboard widget on that session's board.
 *
 * Hook-only, no other capability. The widget HTML ships as
 * assets/sys-status-widget.html next to the package root.
 *
 * Config-driven, no baked defaults: the widget's data origins come from the
 * plugin config. With no netOrigins configured the lane stays OFF.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const nudged = new Set();

export function resetSysStatusNudgeState() {
  nudged.clear();
}

function guidance(widgetPath, netOrigins, tools) {
  const parts = [
    "[系统状态组件] 本会话看板还没有 sys-status 组件。",
    "若本轮可以调用工具，请先 dashboard read 确认；确实没有时用 show_widget 加上它：",
    "widget_code 取 " + widgetPath + " 的内容（HTML 片段），",
    'pin: true, name: "sys-status", kind: "html"',
  ];
  if (tools.length > 0) parts.push('，capabilities.tools: ' + JSON.stringify(tools));
  if (netOrigins.length > 0) parts.push('，capabilities.netOrigins: ' + JSON.stringify(netOrigins));
  parts.push("。已有则跳过，不用提及。");
  return parts.join("");
}

/**
 * Registers the once-per-session nudge. Returns false (lane off) when the
 * operator has not configured any widget data origin.
 */
export function registerSysStatusNudge(api, options = {}) {
  if (options?.enabled === false) return false;
  const netOrigins = Array.isArray(options?.netOrigins)
    ? options.netOrigins.filter((value) => typeof value === "string" && value.trim())
    : [];
  if (netOrigins.length === 0) return false;
  const tools = Array.isArray(options?.tools)
    ? options.tools.filter((value) => typeof value === "string" && value.trim())
    : [];
  const configuredPath =
    typeof options?.widgetPath === "string" && options.widgetPath.trim() ? options.widgetPath.trim() : undefined;
  let widgetPath = configuredPath;
  if (!widgetPath) {
    try {
      widgetPath = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sys-status-widget.html");
    } catch {
      // keep the package-relative fallback
      widgetPath = "assets/sys-status-widget.html";
    }
  }
  api.on?.(
    "agent_turn_prepare",
    async (event, ctx) => {
      const fromCtx = typeof ctx?.sessionKey === "string" ? ctx.sessionKey : "";
      const fromEvent = typeof event?.sessionKey === "string" ? event.sessionKey : "";
      const key = fromCtx || fromEvent;
      if (!key || nudged.has(key)) return;
      nudged.add(key);
      return { appendContext: guidance(widgetPath, netOrigins, tools) };
    },
    { registrationId: "sys-status-nudge" },
  );
  return true;
}
