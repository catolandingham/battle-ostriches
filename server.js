// Battle Ostriches online server: serves public/ and runs authoritative games over WebSocket.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const B = require('./game.js');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/healthz') return res.end('ok');
  const f = u === '/game.js' ? path.join(__dirname, 'game.js') : path.join(PUB, path.normalize(u === '/' ? '/index.html' : u));
  if (!f.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { fs.readFile(path.join(PUB, 'index.html'), (e2, d2) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(d2); }); return; }
    const type = TYPES[path.extname(f)] || 'application/octet-stream', m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) { // byte ranges: iOS Safari needs these to play <video>
      let a = m[1] ? +m[1] : d.length - +m[2], z = m[1] && m[2] ? Math.min(+m[2], d.length - 1) : d.length - 1;
      if (isNaN(a) || a < 0 || a >= d.length || a > z) { res.writeHead(416, { 'content-range': `bytes */${d.length}` }); return res.end(); }
      res.writeHead(206, { 'content-type': type, 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${z}/${d.length}`, 'content-length': z - a + 1, 'cache-control': 'no-cache' }); return res.end(d.subarray(a, z + 1));
    }
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': d.length, 'cache-control': 'no-cache' }); res.end(d);
  });
});
const rooms = new Map(); // code -> {g, players:{blue:{ws,token},red:{ws,token}}, touched}
const code = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const tok = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function view(room, role) {
  const g = room.g, mine = g.phase === 'play' && g.turn === role;
  const v = { role, code: room.code, phase: g.phase, turn: g.turn, round: g.round, cfg: g.cfg, winner: g.winner,
    eggsLeft: B.aliveEggs(g).length, marks: g.marks, vulture: g.vulture, lastAction: g.lastAction && (role === 'blue' || /fly|throw/.test(g.lastAction.type)) ? g.lastAction : null,
    lastCold: (g.lastCold || []).length, opponent: !!(room.players[role === 'blue' ? 'red' : 'blue'] || {}).ws, myTurn: mine };
  if (role === 'blue' || g.phase === 'over') {
    Object.assign(v, { eggs: g.eggs.map(e => ({ pos: e.pos, alive: e.alive, coldIn: B.coldIn(g, e), carried: g.carrying === e.id })),
      ostrich: g.ostrich, carrying: g.carrying, onEgg: B.onEgg(g), sitRun: g.sitRun, mustLeave: B.mustLeave(g) });
    if (role === 'blue') Object.assign(v, { moves: mine ? B.ostrichMoves(g) : [], carryMoves: mine ? B.ostrichMoves(g, true) : [],
      can: { sit: B.canSit(g), carry: B.canCarry(g) }, vtracks: g.vtracks });
  }
  if (role === 'red' || g.phase === 'over') Object.assign(v, { prints: g.prints, smells: g.smells });
  if (role === 'red') Object.assign(v, { fly: B.flyTargets(g), throw: B.throwTargets(g) });
  return v;
}
function broadcast(room) { for (const r of ['blue', 'red']) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: view(room, r) })); } }
function act(room, role, m) {
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = B.newGame(); return true; }
  if (role === 'blue') {
    if (g.phase === 'setupEggs') return B.placeEgg(g, p);
    if (g.phase === 'setupOstrich') return B.placeOstrich(g, p);
    if (m.a === 'step') return B.ostrichStep(g, p, false);
    if (m.a === 'carry') return B.ostrichStep(g, p, true);
    if (m.a === 'sit') return B.ostrichSit(g);
  } else {
    if (m.a === 'fly') return B.vultureFly(g, p);
    if (m.a === 'throw') return !!B.vultureThrow(g, p);
  }
  return false;
}
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  let room = null, role = null;
  const send = o => ws.send(JSON.stringify(o));
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') return send({ t: 'pong' });
    if (m.t === 'create') {
      const c = code(); role = m.role === 'red' ? 'red' : 'blue';
      room = { code: c, g: B.newGame(), players: { blue: null, red: null }, touched: Date.now() };
      rooms.set(c, room); const token = tok(); room.players[role] = { ws, token };
      send({ t: 'joined', code: c, role, token }); return broadcast(room);
    }
    if (m.t === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase()); if (!r) return send({ t: 'error', msg: 'No game with that code.' });
      // reconnect with token, else take the free seat
      let seat = ['blue', 'red'].find(s => r.players[s] && m.token && r.players[s].token === m.token);
      if (!seat) seat = ['blue', 'red'].find(s => !r.players[s]);
      if (!seat) return send({ t: 'error', msg: 'That game already has two players.' });
      room = r; role = seat; const token = r.players[seat] ? r.players[seat].token : tok();
      r.players[seat] = { ws, token }; r.touched = Date.now();
      send({ t: 'joined', code: r.code, role, token }); return broadcast(r);
    }
    if (m.t === 'act' && room) {
      if (act(room, role, m)) { room.touched = Date.now(); broadcast(room); }
      else send({ t: 'error', msg: 'Not a legal move right now.', soft: true });
    }
  });
  ws.on('close', () => { if (room && room.players[role] && room.players[role].ws === ws) { room.players[role].ws = null; broadcast(room); } });
});
setInterval(() => { for (const c of wss.clients) { if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch {} } }, 25000).unref();
setInterval(() => { const now = Date.now(); for (const [c, r] of rooms) if (now - r.touched > 6 * 3600e3) rooms.delete(c); }, 600e3).unref();
server.listen(PORT, () => console.log('Battle Ostriches on http://localhost:' + PORT));
module.exports = server;
