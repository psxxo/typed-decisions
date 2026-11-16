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
    execFile(BIN, ["gateway", "call", method, "--params", JSON.stringify(params)], { timeout: 20000 }, (err, stdout) => {
      if (err) { log(method + " FAILED " + (err.message || "")); resolve(null); return; }
      try { resolve(JSON.parse(stdout.slice(stdout.indexOf("{")))); } catch { resolve(null); }
    });
  });
}

export default async function handler(event) {
  try {
    const type = pick(event, ["type", "event", "name", "eventKey"]) || "";
    if (type !== "session" && type !== "session:patch") return;
    const patch = patchOf(event);
    if (!looksArchived(event, patch)) return;
    const key = sessionKeyOf(event);
    if (!key) { log("archived but no sessionKey"); return; }
    const board = await call("board.get", { sessionKey: key });
    const widgets = board?.widgets || [];
    for (const w of widgets) {
      await call("board.update", { sessionKey: key, ops: [{ kind: "widget_remove", name: w.name }] });
    }
    log("board cleared " + key + " widgets=" + widgets.length + " tabs=" + (board?.tabs || []).length);
  } catch (e) {
    log("handler error " + (e && e.message));
  }
}
