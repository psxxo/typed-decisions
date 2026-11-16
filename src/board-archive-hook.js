import { appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const LOG = "/data/oc/logs/board-archive-unpin.log";
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
function agentIdOf(key) {
  const parts = String(key || "").split(":");
  return parts[0] === "agent" && parts[1] ? parts[1] : null;
}
function dropBoard(key) {
  const agentId = agentIdOf(key);
  if (!agentId) return;
  const db = new DatabaseSync(join(homedir(), ".openclaw", "agents", agentId, "agent", "openclaw-agent.sqlite"));
  try {
    db.exec("PRAGMA busy_timeout = 3000");
    const w = db.prepare("delete from board_widgets where session_key = ?").run(key);
    const t = db.prepare("delete from board_tabs where session_key = ?").run(key);
    log("board dropped " + key + " widgets=" + (w.changes ?? 0) + " tabs=" + (t.changes ?? 0));
  } catch (e) {
    log("board drop FAILED " + key + " :: " + (e && e.message));
  } finally { db.close(); }
}

export function registerBoardArchiveHook(api) {
  const handler = async (event) => {
    try {
      const type = pick(event, ["type", "event", "name", "eventKey"]) || "";
      if (type !== "session" && type !== "session:patch") return;
      const patch = patchOf(event);
      if (!looksArchived(event, patch)) return;
      const key = sessionKeyOf(event);
      if (!key) return;
      log("archived -> " + key);
      dropBoard(key);
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
