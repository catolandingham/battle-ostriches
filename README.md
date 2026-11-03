# Battle Ostriches (online, 2 phones)
Node + WebSocket server (`server.js`) holds the authoritative game (`game.js`, all tuning in `CONFIG`) and serves `public/`.
- Run: `npm install && npm start` → http://localhost:3000. Create a game, share the `/?room=CODE` link.
- Tests: `node test.js` (rules) and `node e2e.js` (two headless iPhone browsers play a few turns; needs Chromium for playwright-core).
- Deploy: Render (render.yaml, free plan: New → Blueprint, pick the repo) or Fly.io (`fly launch --copy-config && fly deploy`, uses Dockerfile).
Games live in memory: a restart or free-tier sleep ends games in progress.

## Balance (sim.js)
`node sim.js 6000` pits an ostrich bot (coldest-egg routing, guards when the vulture is near, carries spotted eggs away, obeys the sit cap) against a vulture bot (hunts footprints, uses smell history to rule squares in/out, throws at guarded/spotted squares).
Balanced CONFIG: rounds 30, warmth 20, maxSit 3, fly 2, throw adjacent (unlimited stones), smell 2 → Normal bots: vulture ~50%, avg ~25.5 rounds; Easy ~40%. Stone throws animate via public/smash.js (egg crack + yolk on a hit, dust on a miss, feather bounce when guarded).

## Themes
`classic` (default), `nature`, `neon`. Use 🎨 in the HUD/title, or `?theme=nature`; saved in localStorage `bo_theme`. CSS only (`public/themes.css`, `public/theme.js`).
