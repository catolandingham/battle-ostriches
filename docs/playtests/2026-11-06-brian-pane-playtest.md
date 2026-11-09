# Playtest note, 2026-11-06 about 22:30: Brian in the Claude browser pane, main build (6e7c072), local server

Setup: solo, on the current `main` build, played in the in-app browser pane on the MacBook (phone-shaped layout).

1. Brian chose "start a game against the computer", picked badger as his role, and asked for two computer players. The game started at once with Brian as the ostrich. His role choice and his player count were ignored, with no message saying why. Brian's reaction: "it's so bad."

What this breaks (design checklist): B1 "can I tell what to do" and B2 "can I tell what just happened" both fail at the very first screen; the player's first choice is silently overridden. Gilbert A10: the game should honor the player's stated intent.

Open questions for the planner: is this the same lobby-and-roles problem PR #5 ("Fix the friends lobby and make Step and Fly selectable") and PR #3 ("Join-first lobby: roles, computers at Start") were meant to fix? Does the solo path share the lobby code or bypass it?
