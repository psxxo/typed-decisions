import { appendFileSync } from "node:fs";
import { execFile } from "node:child_process";

const LOG = "/data/oc/logs/board-archive-unpin.log";
const BIN = process.env.OPENCLAW_BIN || "/home/fcslx/.npm-global/bin/openclaw";

function log(msg) {
  try { appendFileSync(LOG, new Date().toISOString() + " [plugin-hook] " + msg + String.fromCharCode(10)); } catch {}
}
function pick(obj, keys) {
  for (const k of keys) { const v = obj && obj[k]; if (typeof v === "string" && v) return v; }
  return null;
}
function call(method, params) {
  return new Promise((resolve) => {
    execFile(BIN, ["gateway", "call", method, "--params", JSON.stringify(params)], { timeout: 30000 }, (err, stdout) => {
      if (err) return resolve({ error: String(err.message || err) });
      try { resolve(JSON.parse(String(stdout).slice(String(stdout).indexOf("{")))); } catch { resolve({ error: "bad json" }); }
    });
  });
}

export default async function handler(event) {
  try {
    const type = pick(event, ["type", "event", "name", "eventKey"]) || "";
    if (type !== "session" && type !== "session:patch") return;
    if (type === "session" && event.action && event.action !== "patch") return;
    const patch = event?.patch || event?.payload?.patch || event?.data?.patch || event?.context?.patch;
    const archived = (patch && patch.archived === true) || event?.archived === true || Boolean(event?.context && (event.context.archived === true || event.context.archivedAt));
    if (!archived) return;
    const key = pick(event, ["sessionKey"]) || pick(event?.context || {}, ["sessionKey", "key"]);
    if (!key) return;
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
  } catch (e) {
    log("handler error " + (e && e.message));
  }
}
