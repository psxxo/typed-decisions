---
name: board-archive-unpin
description: "Remove the sys-status board widget when a session is archived"
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

Keeps the dashboard clean: when a session is archived, its sys-status widget is
removed from that session's board.

## Behaviour

- Fires on `session:patch` only.
- Acts only when the submitted patch sets `archived: true`.
- Removes the widget named `sys-status` from that session's board.
- Restoring an archived session does **not** remove the widget.
- Failures are logged and ignored; archiving never blocks on this hook.
