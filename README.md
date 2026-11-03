# Battle Ostriches (online, 2 phones)
Node + WebSocket server (`server.js`) holds the authoritative game (`game.js`, all tuning in `CONFIG`) and serves `public/`.
- Run: `npm install && npm start` → http://localhost:3000. Create a game, share the `/?room=CODE` link.
- Tests: `node test.js` (rules) and `node e2e.js` (two headless iPhone browsers play a few turns; needs Chromium for playwright-core).
- Deploy: Render (render.yaml, free plan: New → Blueprint, pick the repo) or Fly.io (`fly launch --copy-config && fly deploy`, uses Dockerfile).
Games live in memory: a restart or free-tier sleep ends games in progress.

## Balance (sim.js)
`node sim.js 4000` pits a smart ostrich bot (coldest-egg routing, eats food, flees with spotted eggs, obeys carry limit) against a vulture bot (hunts prints/scent, reloads at rocks).
CONFIG: rounds 35, warmth 14, stones 3, maxCarry 2, food 2-3 squares → vulture wins ~53.5%, avg 26 rounds; ~47% of games end with the ostrich on its last egg or the vulture winning after 60% of rounds.

## Themes
`classic` (default), `nature`, `neon`. Use 🎨 in the HUD/title, or `?theme=nature`; saved in localStorage `bo_theme`. CSS only (`public/themes.css`, `public/theme.js`).
