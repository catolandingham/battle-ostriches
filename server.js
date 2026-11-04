// Battle Ostriches online server: serves public/ and runs authoritative games over WebSocket.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const B = require('./game.js'), AI = require('./ai.js'), T = require('./three.js');
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
  if (room.team) return viewT(room, role);
  if (room.three) return view3(room, role);
  const g = room.g, mine = g.phase === 'play' && g.turn === role, pub = AI.redView(g);
  const v = { role, code: room.code, phase: g.phase, turn: g.turn, round: g.round, cfg: g.cfg, winner: g.winner, winBy: g.winBy,
    eggsLeft: B.aliveEggs(g).length, marks: pub.marks, vulture: g.vulture, ostrich: g.ostrich, stones: g.stones, hungerLeft: g.hungerLeft, sniff: g.sniff,
    sitRun: g.sitRun, carried: g.carrying !== null, lastAction: role === 'blue' || g.phase === 'over' ? g.lastAction : pub.lastAction,
    lastCold: (g.lastCold || []).length, opponent: !!room.ai || !!room.pass || !!(room.players[role === 'blue' ? 'red' : 'blue'] || {}).ws, myTurn: mine,
    // 'joined' = the other seat has ever been taken; the invite panel is only for a seat nobody has claimed yet
    joined: !!room.ai || !!room.pass || !!room.players[role === 'blue' ? 'red' : 'blue'], ai: room.ai ? room.level : null, pass: !!room.pass };
  // during setup the vulture doesn't see where the ostrich will stand until play starts (ostrich is null until then anyway)
  if (role === 'blue' || g.phase === 'over') {
    Object.assign(v, { eggs: g.eggs.map(e => ({ pos: e.pos, alive: e.alive, coldIn: B.coldIn(g, e), carried: g.carrying === e.id })),
      carrying: g.carrying, onEgg: B.onEgg(g), mustLeave: B.mustLeave(g) });
    if (role === 'blue') Object.assign(v, { moves: mine ? B.ostrichMoves(g) : [], carryMoves: mine ? B.ostrichMoves(g, true) : [],
      can: { sit: B.canSit(g), carry: B.canCarry(g) } });
  }
  if (role === 'red') Object.assign(v, { fly: pub.fly, throw: pub.throw });
  return v;
}
const active = g => g.phase === 'play' ? g.turn : 'blue'; // pass & play: whose hands the phone is in
function broadcast(room) { if (room.team) return broadcastT(room); if (room.three) return broadcast3(room); schedAI(room);
  if (room.pass) { const p = room.players.blue; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', pass: true, active: active(room.g), views: { blue: view(room, 'blue'), red: view(room, 'red') } })); return; }
  for (const r of ['blue', 'red']) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: view(room, r) })); } }
function act(room, role, m) {
  if (room.team) return actT(room, role, m);
  if (room.three) return act3(room, role, m);
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = B.newGame(); room.mem = {}; return true; }
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
// computer opponent: moves after a short, readable delay using only its own side's view
function schedAI(room) {
  const r = room.ai, g = room.g; if (!r || room.aiT) return;
  const due = r === 'blue' ? (g.phase.startsWith('setup') || (g.phase === 'play' && g.turn === 'blue')) : g.phase === 'play' && g.turn === 'red';
  if (!due) return;
  const delay = g.phase.startsWith('setup') ? 250 : 800 + Math.random() * 700;
  room.aiT = setTimeout(() => { room.aiT = null; if (!rooms.has(room.code) || room.g !== g) return broadcast(room);
    const m = r === 'blue' ? AI.ostrich(g, room.level) : AI.vulture(AI.redView(g), room.level, room.mem || (room.mem = {}));
    if (!act(room, r, m)) { console.error('AI illegal move', m); return; } room.touched = Date.now(); broadcast(room); }, delay);
}
// ===== 3 players: ostrich (blue), vulture (red), hunter (hyena / honey badger). Any seat can be a computer bot. =====
const SEATS3 = ['blue', 'red', 'hunter'];
const start3 = () => process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined;
function create3(m, ws) {
  const c = code(), role = SEATS3.includes(m.role) ? m.role : 'blue', token = tok();
  const kind = m.kind === 'badger' || m.kind === 'hyena' ? m.kind : null;
  const room = { code: c, three: true, g: T.newGame3(role === 'hunter' || (m.bots || []).includes('hunter') ? (kind || 'hyena') : null, undefined, start3()),
    players: { blue: null, red: null, hunter: null }, bots: [], level: m.level === 'easy' ? 'easy' : 'normal', mem: {}, touched: Date.now() };
  room.players[role] = { ws, token };
  for (const b of m.bots || []) if (SEATS3.includes(b) && b !== role) { room.bots.push(b); room.players[b] = { ws: null, token: tok(), bot: true }; }
  rooms.set(c, room); return { room, role, token };
}
const ready3 = room => SEATS3.every(s => room.players[s]) && !!room.g.three.kind;
function view3(room, role) {
  const g = room.g, t = g.three, over = g.phase === 'over', pub = AI.redView(g), mine = g.phase === 'play' && g.turn === role && ready3(room);
  const seats = Object.fromEntries(SEATS3.map(s => [s, room.bots.includes(s) ? 'bot' : room.players[s] ? (room.players[s].ws ? 'on' : 'off') : 'open']));
  const lc = t.lastCatch && { bird: t.lastCatch.bird, ko: t.lastCatch.ko, seq: t.lastCatch.seq, round: t.lastCatch.round,
    at: role === t.lastCatch.bird || role === 'hunter' || over ? t.lastCatch.at : null, to: role !== 'hunter' || over ? t.lastCatch.to : null };
  const h3 = Object.assign(T.status3(g), { seats, ready: ready3(room), needKind: role === 'hunter' && !t.kind, lastCatch: lc, lost: t.lost || null,
    clockLeft: room.deadline && g.phase === 'play' ? Math.max(0, room.deadline - Date.now()) : null, clockMs: T.T3.clockMs, senseRange: T.T3.sense,
    hunter: over || role === 'hunter' || T.hunterSeenBy(g, role) ? t.h : null, burrowed: role === 'hunter' || over ? t.burrowed : false, range: T.hunterRange(g) });
  let v;
  if (role === 'hunter') {
    v = { role, code: room.code, phase: g.phase, turn: g.turn, round: g.round, cfg: g.cfg, winner: g.winner, winBy: g.winBy, eggsLeft: B.aliveEggs(g).length,
      marks: pub.marks, vulture: over ? g.vulture : T.OFF, ostrich: over ? g.ostrich : T.OFF, stones: g.stones, hungerLeft: g.hungerLeft, sniff: null, sitRun: 0, carried: false,
      lastAction: null, lastCold: 0, myTurn: mine, opponent: true, joined: SEATS3.every(s => room.players[s]), ai: null, pass: false,
      hunter: t.h, kind: t.kind, sense: g.turn === 'hunter' || t.pounce ? t.sense : null, senseSeq: t.senseSeq, senseRange: T.T3.sense, pounce: t.pounce, burrowed: t.burrowed,
      hmoves: mine ? T.hunterMoves(g) : [], lastHunter: t.lastHunter };
    if (over) v.eggs = g.eggs.map(e => ({ pos: e.pos, alive: e.alive, coldIn: B.coldIn(g, e), carried: false }));
  } else {
    const sub = { ...room, three: false, ai: room.bots.length ? 'bot' : null, players: room.players };
    v = view(sub, role); v.myTurn = mine; v.joined = SEATS3.every(s => room.players[s]); v.ai = null;
    if (role === 'blue' && !mine) { v.moves = []; v.carryMoves = []; v.can = { sit: false, carry: false }; }
    if (role === 'red' && !mine) { v.fly = []; v.throw = []; }
    if (g.phase === 'play' && T.isOut(g, role)) { v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; }
  }
  v.h3 = h3; v.three = true; return v;
}
function broadcast3(room) {
  sched3(room); clock3(room);
  for (const r of SEATS3) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: view3(room, r) })); }
}
function act3(room, role, m) {
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = T.newGame3(g.three.kind, undefined, start3()); room.mem = {}; return true; }
  if (m.a === 'kind' && role === 'hunter' && !g.three.kind && (m.kind === 'hyena' || m.kind === 'badger')) { g.three.kind = m.kind; return true; }
  if (role === 'blue' && g.phase === 'setupEggs') return B.placeEgg(g, p);
  if (role === 'blue' && g.phase === 'setupOstrich') return T.placeOstrich3(g, p);
  if (!ready3(room) || g.phase !== 'play' || g.turn !== role) return false;
  if (role === 'blue') return m.a === 'sit' || m.a === 'step' || m.a === 'carry' ? T.ostrichAct3(g, m.a, p) : false;
  if (role === 'red') return m.a === 'fly' ? T.vultureFly3(g, p) : m.a === 'throw' ? !!T.vultureThrow3(g, p) : false;
  if (role === 'hunter') return m.a === 'hmove' ? T.hunterMove(g, p) : m.a === 'hstay' ? T.hunterStay(g) : false;
  return false;
}
function botMove3(room, r) {
  const g = room.g, mem = room.mem[r] || (room.mem[r] = {});
  if (r === 'hunter') { const v = view3(room, 'hunter'); if (g.three.lastCatch && mem.seenCatch !== g.three.lastCatch.seq) { mem.seenCatch = g.three.lastCatch.seq; mem.reset = true; mem.lastCatch = g.three.h.slice(); } return AI.hunter(v, mem); }
  const hv = T.hunterSeenBy(g, r) ? g.three.h : null, reach = T.hunterRange(g) + (g.three.kind === 'hyena' ? 1 : 0);
  if (r === 'blue') { if (g.phase !== 'play') { let m = AI.ostrich(g, room.level); if (g.phase === 'setupOstrich' && B.key(m.p) === B.key(g.three.h)) m = { a: 'place', p: g.eggs[1].pos.slice() }; return m; }
    const m = AI.ostrich(g, room.level), fd = Math.min(...g.cfg.foods.map(f => B.dist(f, g.ostrich)));
    if (g.hungerLeft - fd <= 1) return m;
    const alts = (B.canCarry(g) ? B.ostrichMoves(g, true).map(p => ({ a: 'carry', p })) : []).concat(B.ostrichMoves(g).map(p => ({ a: 'step', p })));
    return AI.dodge(m, g.ostrich, alts, hv, reach); }
  const v = AI.redView(g), m = AI.vulture(v, room.level, mem);
  return AI.dodge(m, g.vulture, v.fly.map(p => ({ a: 'fly', p })), hv, reach);
}
function sched3(room) {
  const g = room.g; if (room.aiT || !room.bots.length) return;
  const r = g.phase.startsWith('setup') ? 'blue' : g.phase === 'play' ? g.turn : null;
  if (!r || !room.bots.includes(r) || (g.phase === 'play' && !ready3(room))) return;
  const delay = g.phase.startsWith('setup') ? 250 : (+process.env.BO_BOTMS || 800 + Math.random() * 700);
  room.aiT = setTimeout(() => { room.aiT = null; if (!rooms.has(room.code) || room.g !== g || (g.phase === 'play' ? g.turn !== r : !g.phase.startsWith('setup'))) return broadcast(room);
    const m = botMove3(room, r);
    if (!act3(room, r, m)) { console.error('AI3 illegal move', r, m); if (g.phase === 'play') T.timeout(g); }
    room.touched = Date.now(); broadcast(room); }, delay);
}
// 10-second shot clock on every play turn (3 players only); runs once all seats are filled and the hunter is picked
function clock3(room) {
  const g = room.g, k = g.phase === 'play' && ready3(room) ? g.round + ':' + g.turn : null;
  if (k === room.clockKey) return;
  clearTimeout(room.clockT); room.clockKey = k; room.deadline = null; if (!k) return;
  const ms = +process.env.BO_CLOCKMS || T.T3.clockMs;
  room.deadline = Date.now() + ms;
  room.clockT = setTimeout(() => { if (room.clockKey !== k || room.g !== g) return; room.clockKey = null; T.timeout(g); room.touched = Date.now(); broadcast(room); }, ms);
}
// ===== 4 players (2v2: o1, o2 vs v1, v2) and 5 players (+ hunter). Rules in team.js, bots in teamai.js. =====
const TT = require('./team.js'), TA = require('./teamai.js');
const SNAME = { o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2', hunter: 'Hunter' };
const tseats = g => g.order.slice();
function createT(m, ws) {
  const n = +m.team === 5 ? 5 : 4, c = code(), seats = n === 5 ? ['v1', 'o1', 'v2', 'o2', 'hunter'] : ['v1', 'o1', 'v2', 'o2'];
  const role = seats.includes(m.role) ? m.role : 'o1', token = tok(), kind = m.kind === 'badger' || m.kind === 'hyena' ? m.kind : null;
  const bots = (m.bots || []).filter(b => seats.includes(b) && b !== role);
  const hs = process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined;
  const room = { code: c, team: true, three: false, n, g: TT.newTeam(n, n === 5 && (role === 'hunter' || bots.includes('hunter')) ? (kind || (role === 'hunter' ? null : 'hyena')) : kind, undefined, hs),
    players: Object.fromEntries(seats.map(s => [s, null])), bots, level: m.level === 'easy' ? 'easy' : 'normal', mem: {}, touched: Date.now() };
  if (n === 5 && role !== 'hunter' && !room.g.h.kind && bots.includes('hunter')) room.g.h.kind = 'hyena';
  room.players[role] = { ws, token };
  for (const b of bots) room.players[b] = { ws: null, token: tok(), bot: true };
  rooms.set(c, room); return { room, role, token };
}
const readyT = room => tseats(room.g).every(s => room.players[s]) && (!room.g.h || !!room.g.h.kind);
function viewT(room, seat) {
  const g = room.g, over = g.phase === 'over', setup = g.phase === 'setup', ready = readyT(room), mine = g.phase === 'play' && g.turn === seat && ready;
  const isO = TT.isO(seat), isV = TT.isV(seat), myB = g.b[seat], step = TT.setupStep(g, seat);
  const seats = Object.fromEntries(tseats(g).map(s => [s, room.bots.includes(s) ? 'bot' : room.players[s] ? (room.players[s].ws ? 'on' : 'off') : 'open']));
  const lc = g.lastCatch && { bird: g.lastCatch.bird, ko: g.lastCatch.ko, seq: g.lastCatch.seq, round: g.lastCatch.round,
    at: seat === g.lastCatch.bird || seat === 'hunter' || over ? g.lastCatch.at : null, to: seat !== 'hunter' || over ? g.lastCatch.to : null };
  const pub = Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m === 'spotted' || m === 'hit' || m === 'stone'));
  // other birds on the board: birds always see each other (vultures don't see where the ostriches start until play begins); the hunter sees none
  const pieces = seat === 'hunter' && !over ? [] : TT.OS.concat(TT.VS).filter(s => s !== seat && TT.live(g, s) && !(setup && isV && TT.isO(s)))
    .map(s => ({ seat: s, type: TT.isO(s) ? 'o' : 'v', p: g.b[s].pos, mate: (TT.isO(s) && isO) || (TT.isV(s) && isV), carrying: isO && TT.isO(s) && g.b[s].carrying != null }));
  const h3 = Object.assign(TT.status(g), { team: true, seats, ready, needKind: seat === 'hunter' && g.h && !g.h.kind, lastCatch: lc, lost: g.lost, mySeat: seat, pieces, setupStep: step,
    clockLeft: room.deadline && g.phase === 'play' ? Math.max(0, room.deadline - Date.now()) : null, clockMs: TT.TM.clockMs, senseRange: TT.TM.sense,
    hunter: g.h && (over || seat === 'hunter' || TT.hunterSeenBy(g, seat)) ? g.h.p : null, burrowed: g.h && (seat === 'hunter' || over) ? g.h.burrowed : false, range: TT.hunterRange(g),
    block: TT.TM.vStarts.concat(g.h ? [g.h.p] : []), mateSniff: isV && g.phase === 'play' ? g.sniffs[TT.mate(seat)] || null : null, eggsTotal: g.eggs.length });
  const eggs = () => g.eggs.map(e => { const c = TT.OS.find(o => g.b[o].carrying === e.id);
    return { pos: e.pos || (c && c !== seat ? g.b[c].pos : null), alive: e.alive, coldIn: B.coldIn(g, e), carried: c === seat, nest: e.nest, mine: isO && e.nest === myB.nest }; });
  const base = { code: room.code, turn: g.turn, round: g.round, winner: g.winner, winBy: g.winBy, eggsLeft: TT.alive(g).length, marks: over ? g.marks : pub,
    lastCold: (g.lastCold || []).length, myTurn: mine, opponent: true, joined: tseats(g).every(s => room.players[s]), ai: null, pass: false, three: true, h3 };
  if (seat === 'hunter') return Object.assign(base, { role: 'hunter', phase: setup ? 'setupEggs' : g.phase, cfg: g.cfg, vulture: TT.OFF, ostrich: TT.OFF, stones: Math.max(0, ...TT.VS.filter(x => !g.b[x].out).map(x => g.b[x].stones)), hungerLeft: Math.min(g.cfg.food, ...TT.OS.filter(x => !g.b[x].out).map(x => g.b[x].hunger)), sniff: null,
    sitRun: 0, carried: false, lastAction: null, hunter: g.h.p, kind: g.h.kind, sense: g.turn === 'hunter' || g.h.pounce ? g.h.sense : null, senseSeq: g.h.senseSeq,
    senseRange: TT.TM.sense, pounce: g.h.pounce, burrowed: g.h.burrowed, hmoves: mine ? TT.hunterMoves(g) : [], lastHunter: g.h.last, eggs: over ? eggs() : undefined });
  const la = g.lastAction && (isO || over || g.lastAction.type !== 'throw' ? g.lastAction : { type: 'throw', from: g.lastAction.from, p: g.lastAction.p, result: g.lastAction.result, egg: !!g.lastAction.egg });
  const v = Object.assign(base, { role: isO ? 'blue' : 'red', phase: setup ? (isO ? (step === 'eggs' ? 'setupEggs' : step === 'ostrich' ? 'setupOstrich' : 'play') : 'setupEggs') : g.phase,
    cfg: { ...g.cfg, eggs: isO && setup ? g.eggs.length + (TT.TM.eggs - TT.nestOf(g, seat).length) : g.cfg.eggs * 2 },
    ostrich: isO ? (myB.pos || null) : TT.OFF, vulture: isV ? myB.pos : TT.OFF, stones: isV ? myB.stones : Math.max(0, ...TT.VS.filter(x => !g.b[x].out).map(x => g.b[x].stones)), hungerLeft: isO ? myB.hunger : Math.min(g.cfg.food, ...TT.OS.filter(x => !g.b[x].out).map(x => g.b[x].hunger)),
    sniff: isV && g.phase === 'play' ? g.sniffs[seat] || null : null, sitRun: isO ? myB.sitRun : 0, carried: isO && myB.carrying != null, lastAction: la });
  if (setup && step === 'done') v.myTurn = false;
  if (isO || over) Object.assign(v, { eggs: isO || over ? eggs() : undefined, carrying: isO ? myB.carrying : null, onEgg: isO && TT.onEgg(g, seat), mustLeave: isO && TT.mustLeave(g, seat) });
  if (isO) Object.assign(v, { moves: mine ? TT.ostrichMoves(g, seat) : [], carryMoves: mine ? TT.ostrichMoves(g, seat, true) : [], can: { sit: mine && TT.canSit(g, seat), carry: mine && TT.canCarry(g, seat) } });
  if (isV) Object.assign(v, { fly: mine ? TT.flyTargets(g, seat) : [], throw: mine ? TT.throwTargets(g, seat) : [] });
  if (myB.out) { v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; }
  return v;
}
function broadcastT(room) {
  schedT(room); clockT(room);
  for (const s of tseats(room.g)) { const p = room.players[s]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: viewT(room, s) })); }
}
function actT(room, seat, m) {
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = TT.newTeam(room.n, g.h && g.h.kind, undefined, process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined); room.mem = {}; return true; }
  if (m.a === 'kind' && seat === 'hunter' && g.h && !g.h.kind && (m.kind === 'hyena' || m.kind === 'badger')) { g.h.kind = m.kind; return true; }
  if (g.phase === 'setup') return TT.isO(seat) && Array.isArray(p) ? TT.place(g, seat, p) : false;
  if (!readyT(room) || g.phase !== 'play' || g.turn !== seat || !Array.isArray(p) && m.a !== 'sit' && m.a !== 'hstay') return false;
  if (TT.isO(seat)) return m.a === 'sit' || m.a === 'step' || m.a === 'carry' ? TT.ostrichAct(g, seat, m.a, p) : false;
  if (TT.isV(seat)) return m.a === 'fly' ? TT.vultureFly(g, seat, p) : m.a === 'throw' ? !!TT.vultureThrow(g, seat, p) : false;
  if (seat === 'hunter') return m.a === 'hmove' ? TT.hunterMove(g, p) : m.a === 'hstay' ? TT.hunterStay(g) : false;
  return false;
}
function botMoveT(room, s) {
  const g = room.g, mem = room.mem[s] || (room.mem[s] = {});
  if (g.phase === 'setup') return TA.setup(g, s);
  if (s === 'hunter') { const v = viewT(room, 'hunter'); if (g.lastCatch && mem.seenCatch !== g.lastCatch.seq) { mem.seenCatch = g.lastCatch.seq; mem.reset = true; mem.lastCatch = g.h.p.slice(); } return AI.hunter(v, mem); }
  const hv = g.h && TT.hunterSeenBy(g, s) ? g.h.p : null, reach = TT.hunterRange(g) + (g.h && g.h.kind === 'hyena' ? 1 : 0);
  return TT.isO(s) ? TA.ostrich(g, s, room.level, hv, reach) : TA.vulture(g, s, room.level, mem, hv, reach);
}
function schedT(room) {
  const g = room.g; if (room.aiT || !room.bots.length) return;
  const s = g.phase === 'setup' ? room.bots.find(b => TT.isO(b) && TT.setupStep(g, b) !== 'done') : g.phase === 'play' && readyT(room) && room.bots.includes(g.turn) ? g.turn : null;
  if (!s) return;
  const key = g.phase + g.round + g.turn, delay = g.phase === 'setup' ? 250 : (+process.env.BO_BOTMS || 800 + Math.random() * 700);
  room.aiT = setTimeout(() => { room.aiT = null; if (!rooms.has(room.code) || room.g !== g || g.phase + g.round + g.turn !== key) return broadcast(room);
    const m = botMoveT(room, s);
    if (!actT(room, s, m)) { console.error('AI team illegal move', s, m); if (g.phase === 'play') TT.timeout(g); }
    room.touched = Date.now(); broadcast(room); }, delay);
}
function clockT(room) {
  const g = room.g, k = g.phase === 'play' && readyT(room) ? g.round + ':' + g.turn : null;
  if (k === room.clockKey) return;
  clearTimeout(room.clockT); room.clockKey = k; room.deadline = null; if (!k) return;
  const ms = +process.env.BO_CLOCKMS || TT.TM.clockMs;
  room.deadline = Date.now() + ms;
  room.clockT = setTimeout(() => { if (room.clockKey !== k || room.g !== g) return; room.clockKey = null; TT.timeout(g); room.touched = Date.now(); broadcast(room); }, ms);
}
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  let room = null, role = null;
  const send = o => ws.send(JSON.stringify(o));
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') return send({ t: 'pong' });
    if (m.t === 'create' && m.team) { const rt = createT(m, ws); room = rt.room; role = rt.role; send({ t: 'joined', code: room.code, role, token: rt.token, team: room.n }); return broadcast(room); }
    if (m.t === 'create' && m.three) { const r3 = create3(m, ws); room = r3.room; role = r3.role; send({ t: 'joined', code: room.code, role, token: r3.token, three: true }); return broadcast(room); }
    if (m.t === 'create') {
      const c = code(); role = m.role === 'red' ? 'red' : 'blue';
      room = { code: c, g: B.newGame(), players: { blue: null, red: null }, touched: Date.now() };
      rooms.set(c, room); const token = tok(); room.players[role] = { ws, token };
      if (m.pass) { room.pass = true; role = 'blue'; room.players = { blue: { ws, token }, red: { ws, token } }; send({ t: 'joined', code: c, role, token, pass: true }); return broadcast(room); }
      if (m.ai) { room.ai = role === 'blue' ? 'red' : 'blue'; room.level = m.ai === 'easy' ? 'easy' : 'normal'; room.players[room.ai] = { ws: null, token: tok(), bot: true }; }
      send({ t: 'joined', code: c, role, token }); return broadcast(room);
    }
    if (m.t === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase()); if (!r) return send({ t: 'error', msg: 'No game with that code.' });
      // reconnect with token, else take the free seat
      const SEATS = r.team ? ['o1', 'v1', 'o2', 'v2', 'hunter'].filter(x => x in r.players) : r.three ? ['blue', 'red', 'hunter'] : ['blue', 'red'];
      let seat = SEATS.find(s => r.players[s] && m.token && r.players[s].token === m.token);
      if (!seat) seat = SEATS.find(s => !r.players[s]);
      if (!seat) return send({ t: 'error', msg: r.team ? `That game already has ${r.n} players.` : r.three ? 'That game already has three players.' : r.ai ? 'That is a single-player game.' : 'That game already has two players.' });
      if (r.pass) { if (!m.token || r.players.blue.token !== m.token) return send({ t: 'error', msg: 'That is a pass & play game on another phone.' });
        room = r; role = 'blue'; r.players.blue.ws = r.players.red.ws = ws; r.touched = Date.now(); send({ t: 'joined', code: r.code, role, token: m.token, pass: true }); return broadcast(r); }
      room = r; role = seat; const token = r.players[seat] ? r.players[seat].token : tok();
      r.players[seat] = { ws, token }; r.touched = Date.now();
      send({ t: 'joined', code: r.code, role, token }); return broadcast(r);
    }
    if (m.t === 'act' && room) {
      if (act(room, room.pass ? (m.a === 'rematch' ? 'blue' : active(room.g)) : role, m)) { room.touched = Date.now(); broadcast(room); }
      else send({ t: 'error', msg: 'Not a legal move right now.', soft: true });
    }
  });
  ws.on('close', () => { if (room && (room.three || room.team)) { if (room.players[role] && room.players[role].ws === ws) { room.players[role].ws = null; broadcast(room); } return; } if (room && room.pass) { for (const s of ['blue', 'red']) if (room.players[s].ws === ws) room.players[s].ws = null; return; } if (room && room.players[role] && room.players[role].ws === ws) { room.players[role].ws = null; broadcast(room); } });
});
setInterval(() => { for (const c of wss.clients) { if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch {} } }, 25000).unref();
setInterval(() => { const now = Date.now(); for (const [c, r] of rooms) if (now - r.touched > 6 * 3600e3) rooms.delete(c); }, 600e3).unref();
server.listen(PORT, () => console.log('Battle Ostriches on http://localhost:' + PORT));
module.exports = server; server.view3 = view3; server.create3 = create3; server.viewT = viewT; server.createT = createT; server.rooms = rooms; server.broadcast = broadcast;
