/**
 * sys-status nudge — once per session, ask the agent to pin the shared
 * system-status board widget on that session's board.
 *
 * Hook-only, no other capability. Off unless the operator configured
 * \`sysStatus.netOrigins\`; that config is the operator's on/off switch even
 * though the native widget kind no longer needs a network grant of its own.
 *
 * Universal mount: the widget is a native board widget this plugin contributes
 * under the kind \`typed-decisions:sys-status\`, pinned with the core \`dashboard\`
 * tool (\`widget_put\`), which every session surface carries. The previous
 * version pinned an HTML document with \`show_widget\`, a tool the host exposes
 * only to runs whose originating client declares the inline-widgets capability
 * (Control UI, native apps, Discord Activities). A channel run such as a Feishu
 * turn never received it, so the guidance could only fail there — and it spent
 * the session's one nudge doing so. \`dashboard\` carries no such restriction.
 *
 * Bookkeeping: a session is marked as nudged only when the guidance is really
 * appended. A turn the gate rejects stays uncounted.
 */

const nudged = new Set();

/** Kind this plugin registers; pinned through the core dashboard tool. */
const WIDGET_KIND = "typed-decisions:sys-status";
const WIDGET_NAME = "sys-status";
/** The tool that pins it; every session surface carries the dashboard tool. */
const PIN_TOOL = "dashboard";

export function resetSysStatusNudgeState() {
  nudged.clear();
}

function guidance() {
  const NL = String.fromCharCode(10);
  const code = [
    'const d = await dashboard({ action: "read" });',
    'if (!(d.widgets || []).some((w) => w.name === "' + WIDGET_NAME + '")) {',
    '  await dashboard({ action: "widget_put", name: "' + WIDGET_NAME + '", pluginKind: "' + WIDGET_KIND + '", size: "lg", position: 0 });',
    "}",
  ].join(NL);
  return [
    "[系统状态组件] 若本轮可以调用工具：本会话看板还没有 sys-status 组件。不要自行判断、不要自写组件，原样执行下面这段代码即可（先检查、再挂上）：",
    NL + NL + "```js" + NL,
    code,
    NL + "```" + NL + NL,
    "要点：组件由 typed-decisions 插件以看板 widget 形式提供（kind = " + WIDGET_KIND + "），用 dashboard 的 widget_put 挂载，数据由宿主直供；不要改用 show_widget、不要自写组件、不要改 pluginKind。已有或已挂好就不用提及。",
  ].join("");
}

/** True only when the finalized turn surface really carries the pin tool. */
function canPinWidget(authority) {
  if (!authority || typeof authority.allows !== "function") return false;
  for (const candidate of [PIN_TOOL, "openclaw:core:" + PIN_TOOL]) {
    try {
      if (authority.allows(candidate) === true) return true;
    } catch {
      // an unusable or inactive capability is not a grant
    }
  }
  return false;
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
  api.on?.(
    "before_prompt_build",
    async (event, ctx) => {
      const fromCtx = typeof ctx?.sessionKey === "string" ? ctx.sessionKey : "";
      const fromEvent = typeof event?.sessionKey === "string" ? event.sessionKey : "";
      const key = fromCtx || fromEvent;
      if (!key || nudged.has(key)) return;
      // Fail closed: only nudge a turn that can actually pin the widget.
      if (!canPinWidget(ctx?.toolAuthority)) return;
      nudged.add(key);
      return { appendContext: guidance() };
    },
    { registrationId: "sys-status-nudge", requiresToolAuthority: true },
  );
  return true;
}
