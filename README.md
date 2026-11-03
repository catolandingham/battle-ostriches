# Battle Ostriches (online, 2 phones)
Node + WebSocket server (`server.js`) holds the authoritative game (`game.js`, all tuning in `CONFIG`) and serves `public/`.
- Run: `npm install && npm start` → http://localhost:3000. Create a game, share the `/?room=CODE` link.
- Tests: `node test.js` (rules) and `node e2e.js` (two headless iPhone browsers play a few turns; needs Chromium for playwright-core).
- Deploy: Render (render.yaml, free plan: New → Blueprint, pick the repo) or Fly.io (`fly launch --copy-config && fly deploy`, uses Dockerfile).
Games live in memory: a restart or free-tier sleep ends games in progress.
