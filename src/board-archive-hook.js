import { appendFileSync } from "node:fs";
import { execFile } from "node:child_process";

const LOG = "/data/oc/logs/board-archive-unpin.log";
const BIN = process.env.OPENCLAW_BIN || "/home/fcslx/.npm-global/bin/openclaw";

function log(msg) {
  try { appendFileSync(LOG, new Date().toISOString() + " [plugin] " + msg + String.fromCharCode(10)); } catch {}
}
function pick(obj, keys) {
  for (const k of keys) { const v = obj && obj[k]; if (typeof v === "string" && v) return v; }
  return null;
}
function sessionKeyOf(e) {
  return pick(e, ["sessionKey"]) || pick(e?.context || {}, ["sessionKey", "key"]) || pick(e?.payload || {}, ["sessionKey", "key"]);
}
function patchOf(e) {
  for (const c of [e?.patch, e?.payload?.patch, e?.data?.patch, e?.context?.patch]) {
    if (c && typeof c === "object") return c;
  }
  return null;
}
function looksArchived(e, patch) {
  if (patch && patch.archived === true) return true;
  if (e?.archived === true) return true;
  const ctx = e?.context;
  return Boolean(ctx && (ctx.archived === true || ctx.archivedAt));
}
function call(method, params) {
  return new Promise((resolve) => {
    execFile(BIN, ["gateway", "call", method, "--params", JSON.stringify(params)], { timeout: 30000 }, (err, stdout) => {
      if (err) return resolve({ error: String(err.message || err) });
      try { resolve(JSON.parse(String(stdout).slice(String(stdout).indexOf("{")))); } catch { resolve({ error: "bad json" }); }
    });
  });
}

// 归档走网关 RPC 清空看板：直接删库表会绕过看板快照，hasBoard 投影仍为 true，
// 仪表盘继续列出归档会话（2026-11-17 实测）。
async function clearBoard(key) {
  const board = await call("board.get", { sessionKey: key });
  if (board.error) { log("board.get FAILED " + key + " :: " + board.error); return; }
  const widgets = Array.isArray(board.widgets) ? board.widgets : [];
  const tabs = Array.isArray(board.tabs) ? board.tabs : [];
  if (widgets.length === 0 && tabs.length === 0) { log("board already empty " + key); return; }
  for (const w of widgets) {
    const r = await call("board.update", { sessionKey: key, ops: [{ kind: "widget_remove", name: w.name }] });
    if (r.error) log("widget_remove FAILED " + w.name + " :: " + r.error);
  }
  for (const t of tabs) {
    const r = await call("board.update", { sessionKey: key, ops: [{ kind: "tab_delete", tabId: t.tabId }] });
    if (r.error) log("tab_delete FAILED " + t.tabId + " :: " + r.error);
  }
  const after = await call("board.get", { sessionKey: key });
  log("board cleared " + key + " widgets=" + widgets.length + " tabs=" + tabs.length + " left=" + ((after.widgets || []).length) + "/" + ((after.tabs || []).length));
}

export function registerBoardArchiveHook(api) {
  const handler = async (event) => {
    try {
      const type = pick(event, ["type", "event", "name", "eventKey"]) || "";
      if (type !== "session" && type !== "session:patch") return;
      if (type === "session" && event.action && event.action !== "patch") return;
      const patch = patchOf(event);
      if (!looksArchived(event, patch)) return;
      const key = sessionKeyOf(event);
      if (!key) return;
      log("archived -> " + key);
      await clearBoard(key);
    } catch (e) {
      log("handler error " + (e && e.message));
    }
  };
  try {
    api.registerHook?.(["session:patch"], handler, { name: "board-archive-unpin" });
    return true;
  } catch (error) {
    api.logger?.warn?.(`[typed-decisions] archive hook unavailable: ${error?.message ?? error}`);
    return false;
  }
}
