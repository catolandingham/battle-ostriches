# Battle Ostriches (online, 2 to 5 players on phones)
Node + WebSocket server (`server.js`) holds the authoritative game (`game.js`, all tuning in `CONFIG`) and serves `public/`.
- Run: `npm install && npm start` → http://localhost:3000. Create a game, share the `/?room=CODE` link.
- Tests: `npm install`, then `npm run setup:e2e` once (downloads about 90 MB of WebKit into `node_modules/.pw-browsers`), then `npm test`. It runs every unit suite (`test*.js`, `ai-test.js`, no browser) and every phone suite (`e2e-*.js`, headless WebKit at phone size), one at a time, and prints one PASS or FAIL line each. Logs and pictures go to `shots/` (git-ignored). `npm run test:unit` runs only the unit suites; `node tests/run-all.js lobby` runs only suites whose names contain "lobby". `e2e-live.js` plays the live site and is not part of `npm test`.
- Tools that make screenshots or theme files are in `tools/`. Run them from the repo root, e.g. `node tools/make-home-shots.js`.
- Deploy: Render (render.yaml, free plan: New → Blueprint, pick the repo) or Fly.io (`fly launch --copy-config && fly deploy`, uses Dockerfile).
Games live in memory: a restart or free-tier sleep ends games in progress.

## Balance (sim.js)
`node sim.js 6000` pits an ostrich bot (coldest-egg routing, guards when the vulture is near, carries spotted eggs away, obeys the sit cap) against a vulture bot (hunts footprints, uses smell history to rule squares in/out, throws at guarded/spotted squares).
CONFIG in `game.js`: rounds 30, warmth 24, maxSit 3, ostrich walk 2 (carryWalk 1), kickPush 2, fly 2, throw adjacent, 1 stone (refill at a rock pile), smell 1, food every 13 turns. `node ai-test.js` on 2026-11-06: vulture bot wins about 48% on Normal and 43% on Easy. Stone throws animate via public/smash.js (egg crack + yolk on a hit, dust on a miss, feather bounce when guarded).

## Rules that are the same in every game type (2026-11-07)
One speed and one skill per animal, in `game.js` / `three.js` / `hunt.js` / `team.js` alike, and printed on the role card (`public/roles.js`, numbers from the rules constants). Sims of these rules: `node sim.js`, `sim3.js`, `simhunt.js`, `simteam.js`.
- **Ostrich:** walks up to `CONFIG.ostrichWalk` (2) squares, 1 (`carryWalk`) when it carries an egg. A 2-square walk needs a middle square that is not smashed; smashed squares are never landed on. Hunger still counts per turn.
- **Ostrich Kick:** on its own turn, instead of moving, it kicks an animal on a square next to it that it can see (the vulture, a hyena, a honey badger that is not burrowed; never its 2 vs 2 teammate). The animal is pushed `CONFIG.kickPush` (2) squares straight away from the ostrich and stops at the board edge or at another piece. The ostrich stays on its square, an egg under it is warmed, hunger counts, and the sit count is left as it was (a kick is not a Sit; it can't be used when the ostrich must step off its egg). No kick while carrying an egg. No cooldown. A kicked animal keeps its stone, finds no egg by landing, and refills nothing.
- **Vulture:** flies up to 2 squares and sniffs. **Hunters:** move 1 square. **Hyena Pounce:** when its sense at the start of its turn says a bird is within 2, it may move up to 2 squares in one move that turn (`pounce` in `T3`, `TH`, `TM`); there is no second step. **Honey badger:** one still turn burrows it. Nobody speeds up after a knock-out.
- **Big events go to every phone as one line** (a kick, a badger coming out of its burrow, the hunters meeting, a catch, a knock-out, the start-of-game line `Roles.huntLine`). The square, the highlight and the piece appear only for a player who can see that square: birds see birds, a bird sees a hunter within 2 squares (never a burrowed badger), hunters see no bird. The views carry `kick`, `h3.popout` (`seen`), `h3.rival` and `h3.lastCatch` with the square left out when the viewer can't see it.

## Gameplay UI
Actions (Carry, Sit, Kick, Throw, Stay, Burrow) are buttons under the board. Walking and flying are the glowing squares themselves. The hint says why an action is unavailable. There is no separate Vulture's Eye Island screen in this repo. The ostrich does not get a "Vulture smells nothing" popup. The vulture still sees its own sniff.

Hyena sense is still only yes or no inside a 2-square box, diagonals included. The hunter sees rose "Bird may be here" dots on the squares a bird could be on. Nothing points at a bird. When a living bird first sees a hunter, the board says HYENA NEAR or HONEY BADGER NEAR once. A burrowed badger does not trigger it and stays hidden from the birds. The player who is the honey badger still gets their own graphic on the board before burrow and while burrowed, on the classic board and on every theme. Theme sprites replace the birds only; hunter pieces stay in the board.

An eliminated bird is off the board. A stone on the egg it was covering smashes that egg. A living ostrich on an egg still makes the stone bounce.

A catch that does not knock a bird out shows HURT on that animal. OUT means eliminated. An eliminated human bird then gets a read-only view of every animal and the eggs (`god: true`) and is sent no actions. Until that moment the old visibility rules apply, including a living hunter seeing no birds or eggs. Hunters are not eliminated mid-game, so they do not get that view before the game ends.

The ⏱ control shows the round counter and the shot clock. It defaults on. `room.settings.showTimers` (set from create `showTimers`, default true) is copied onto each view as `showTimers`. A phone can override it with localStorage `bo_timers` (`1` or `0`). Rounds left is still `rounds - round + 1`, counting the current round. Hiding the clock does not stop it: the turn still ends after 10 seconds. Catch counts, movement, hunter visibility for living players, the badger speed boost, and win conditions are unchanged.

## Themes
`classic` (default), `nature`, `neon`. Use 🎨 in the HUD/title, or `?theme=nature`; saved in localStorage `bo_theme`. CSS only (`public/themes.css`, `public/theme.js`).
