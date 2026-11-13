# Code review, Battle Ostriches, 2026-11-06 (one page)

> Point-in-time review of commit `6e7c072` (2026-11-06). It is not a description of current `main`.

Reviewer: Agent B (Claude), about 15 minutes, repo at `main` = `6e7c072` (37 commits, 2026-11-02 to 2026-11-05, same agent workflow as Space Snack Quest). Nothing committed. **[ran]** = I executed it here. **[read]** = I read the code.

## What it is [read]

A 2-to-5-player online board game (ostrich hides eggs, vulture hunts them; later modes add a hyena and a badger as hunters, 2v2 teams, and bots). A Node server (`server.js`, 576 lines) holds the authoritative game over WebSockets and serves the static client in `public/`. Rules are small, separate modules: `game.js` (163 lines, all tuning in `CONFIG`), `three.js`, `team.js`, `hunt.js`, `lobby.js`, bots in `ai.js`, `huntai.js`, `teamai.js`. The client is `public/index.html` (65 lines) plus `ui.js`, `ring.js`, `lobby-ui.js`, `three-ui.js`, `smash.js`, `sound.js`, themes. Rooms persist to Redis (`REDIS_URL`) or a JSON file (`store.js`), with a 6-hour expiry. Deploy files for Render, Fly.io and Docker are present. Unlike Space Snack Quest, the source is real, modular and readable; nothing is minified.

## How it runs [read, server start ran inside tests]

```
npm install && npm start      # http://localhost:3000, create a game, share /?room=CODE
```

Dependencies: `ws`, `redis` (runtime); `playwright-core` (end-to-end tests). Node 18 or newer. Env knobs: `PORT`, `REDIS_URL`, `BO_STORE`, `BO_NOSTORE`, `BO_BOTMS`, `BO_CLOCKMS`, `BO_H3START`, `BO_H4START`.

## Test status [ran on this Mac, Node 26.7]

The clone had no `node_modules`. Pure-rules suites run without any install:

| Suite | Result |
| --- | --- |
| `node test.js` | 16 passed |
| `node ai-test.js` | ok (easy vulture 43%, normal 48%, matches README's ~40/50) |
| `node testhunt.js` | 16 passed |
| `node testlobby.js` | 16 passed |

Suites that load `server.js` need `ws`. With `ws` provided from a scratch folder via `NODE_PATH` (not installed in the repo):

| Suite | Result |
| --- | --- |
| `node testplay.js` | 11 passed |
| `node test3.js` | 18 passed |
| `node testteam.js` | 17 passed |
| `node testrestore.js` | PASS (spawns a server, kills it with SIGTERM, restores the room) |

Not run: the 14 `e2e-*.js` scripts (`npm test` and `test:rest` chain them). They need `playwright-core` plus a downloaded WebKit, which is not on this Mac. So the UI, the lobby flow on a phone, the action ring and the smash animation are unverified here. `npm test` as written fails on a fresh clone until `npm install` and a Playwright browser download.

## Three biggest risks

1. **One 576-line server file wires four game modes by hand.** `server.js` branches on mode with separate handlers for the 2-player game, the 3-player game (`T`), teams (`TT`), hunters (`HU`) and the lobby (`LB`), with repeated bot-delay and shot-clock code (about lines 88-376) and env-string parsing in five places. A fix in one mode is easy to miss in another; the only guard for the live wire protocol is the e2e set, which needs Playwright and was not run. [read]
2. **Games are fragile to hosting.** Rooms live in an in-memory `Map` (line 25). Without `REDIS_URL`, the file store writes to `./data/rooms.json`, which is git-ignored and, on Render's free tier, on a disk that is wiped on restart or sleep. The README says this honestly, but a player mid-game will not have read it. The restore test proves SIGTERM saves; it cannot prove the disk is still there afterwards. [read, testrestore ran]
3. **No limits on create, join or message rate.** Room codes are 4 letters from 24 (about 330,000), tokens are `Math.random`, and every WebSocket message is `JSON.parse`d and dispatched (lines 26-27, 460) with no per-connection throttle or cap on room count. Fine for friends; a bored script could fill memory or guess codes. Also, the repo root mixes product code with 14 e2e scripts, 9 `make-*-shots.js` screenshot tools and `gen-themes3.js`, so an agent cannot tell at a glance what ships and what is tooling. [read]

Smaller notes: `server.js` has only 7 `try {` blocks for a long-running process; `README.md` is the best-kept doc in either repo and matches the code where I checked (timers, hunters' sense, badger burrow). If Brian keeps only one habit from this repo for Space Snack Quest, it should be this one: small named modules, each with a Node test that runs with no browser.
