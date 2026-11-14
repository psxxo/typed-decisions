import { execFile } from "node:child_process";

const WIDGET = "sys-status";

function sessionKeyOf(event) {
  return (
    event?.sessionKey ||
    event?.sessionEntry?.sessionKey ||
    event?.context?.sessionKey ||
    event?.patch?.sessionKey ||
    null
  );
}

function isArchivePatch(event) {
  const patch = event?.patch;
  if (!patch || typeof patch !== "object") return false;
  return patch.archived === true;
}

function unpin(sessionKey) {
  return new Promise((resolve) => {
    const params = JSON.stringify({
      sessionKey,
      ops: [{ kind: "widget_remove", name: WIDGET }],
    });
    execFile(
      "openclaw",
      ["gateway", "call", "board.update", "--params", params],
      { timeout: 20000 },
      () => resolve(),
    );
  });
}

export default async function handler(event) {
  try {
    if (event?.type !== "session:patch") return;
    if (!isArchivePatch(event)) return;
    const key = sessionKeyOf(event);
    if (!key) return;
    await unpin(key);
  } catch {
    // Never fail an archive because of board cleanup.
  }
}
