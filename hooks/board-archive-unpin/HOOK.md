---
name: board-archive-unpin
description: "Clear an archived session board through the gateway board RPC"
metadata:
  {
    "openclaw":
      {
        "emoji": "🧹",
        "events": ["session:patch"],
      },
  }
---

# Board Archive Unpin

Keeps the dashboard clean: when a session is archived, its board is cleared so
`/dashboards` stops listing the thread.

## Behaviour

- Fires on `session:patch` only.
- Acts only when the submitted patch sets `archived: true`.
- Reads the board with `board.get`, removes every widget with `board.update`
  `widget_remove`, then deletes every tab with `tab_delete`, and logs the
  post-cleanup `board.get`.
- Deleting `board_widgets`/`board_tabs` rows directly is **not** enough: it
  bypasses the board store, leaves the session's `hasBoard` projection true,
  and the dashboard keeps showing the archived card.
- Restoring an archived session does **not** touch the board.
- Failures are logged and ignored; archiving never blocks on this hook.
