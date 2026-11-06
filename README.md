# Battle Ostriches (online, 2 phones)
Node + WebSocket server (`server.js`) holds the authoritative game (`game.js`, all tuning in `CONFIG`) and serves `public/`.
- Run: `npm install && npm start` → http://localhost:3000. Create a game, share the `/?room=CODE` link.
- Tests: `node test.js` (rules) and `node e2e.js` (two headless iPhone browsers play a few turns; needs Chromium for playwright-core).
- Deploy: Render (render.yaml, free plan: New → Blueprint, pick the repo) or Fly.io (`fly launch --copy-config && fly deploy`, uses Dockerfile).
Games live in memory: a restart or free-tier sleep ends games in progress.

## Balance (sim.js)
`node sim.js 6000` pits an ostrich bot (coldest-egg routing, guards when the vulture is near, carries spotted eggs away, obeys the sit cap) against a vulture bot (hunts footprints, uses smell history to rule squares in/out, throws at guarded/spotted squares).
Balanced CONFIG: rounds 30, warmth 20, maxSit 3, fly 2, throw adjacent (unlimited stones), smell 2 → Normal bots: vulture ~50%, avg ~25.5 rounds; Easy ~40%. Stone throws animate via public/smash.js (egg crack + yolk on a hit, dust on a miss, feather bounce when guarded).

## Gameplay UI
Tap your animal when it has something to do besides the glowing squares. That opens only the relevant actions next to it (Carry, Sit, Throw, Stay, Burrow, or Stop). Stepping and flying are the glowing squares themselves, so those are not listed again. Unavailable actions stay out of that list; the hint says why. The buttons under the board are off-screen until a keyboard user focuses one. There is no separate Vulture's Eye Island screen in this repo. The ostrich does not get a "Vulture smells nothing" popup. The vulture still sees its own sniff.

Hyena sense is still only yes or no inside a 2-square box, diagonals included. North is the top of the board. The compass labels name that box. They do not point at a bird. When a living bird first sees a hunter, the board says HYENA NEAR or HONEY BADGER NEAR once. A burrowed badger does not trigger it and stays hidden from the birds. The player who is the honey badger still gets their own graphic on the board before burrow and while burrowed, on the classic board and on every theme. Theme sprites replace the birds only; hunter pieces stay in the board.

An eliminated bird is off the board. A stone on the egg it was covering smashes that egg. A living ostrich on an egg still makes the stone bounce.

A catch that does not knock a bird out shows HURT on that animal. OUT means eliminated. An eliminated human bird then gets a read-only view of every animal and the eggs (`god: true`) and is sent no actions. Until that moment the old visibility rules apply, including a living hunter seeing no birds or eggs. Hunters are not eliminated mid-game, so they do not get that view before the game ends.

The ⏱ control shows the round counter and the shot clock. It defaults on. `room.settings.showTimers` (set from create `showTimers`, default true) is copied onto each view as `showTimers`. A phone can override it with localStorage `bo_timers` (`1` or `0`). Rounds left is still `rounds - round + 1`, counting the current round. Hiding the clock does not stop it: the turn still ends after 10 seconds. Catch counts, movement, hunter visibility for living players, the badger speed boost, and win conditions are unchanged.

## Themes
`classic` (default), `nature`, `neon`. Use 🎨 in the HUD/title, or `?theme=nature`; saved in localStorage `bo_theme`. CSS only (`public/themes.css`, `public/theme.js`).
