// Battle Ostriches online server: serves public/ and runs authoritative games over WebSocket.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const B = require('./game.js'), AI = require('./ai.js'), T = require('./three.js'), HU = require('./hunt.js'), HA = require('./huntai.js');
const LB = require('./lobby.js');
const RULES = require('./public/roles.js').rulesFromModules(); // the numbers on the role card, from the rules (plain numbers only, nothing hidden)
const SUR = require('./public/surprise');
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
const ST = require('./store.js');
const rooms = new Map(); // code -> {g, players:{blue:{ws,token},red:{ws,token}}, touched}
const code = () => { let c; do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c)); return c; };
const tok = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
// Display preference only. Missing or any value other than false means the round counter and shot clock are shown.
// The 10s clock still expires the turn when it is hidden. Lobby code can set this at create time via settings.showTimers.
function timersOn(room) { if (room && room.clock === false) return false; return !(room && room.settings && room.settings.showTimers === false); }
// A big event is announced to every seat; where it happened goes only to a seat that can see that square.
// popout: the badger came out of its burrow without a catch. Every seat gets the event (seq, round); `seen` says whether this seat can see the badger.
// how many squares a kick actually moved the animal (0 to 2); the words say "back 2 squares" only when it went that far
const kickMoved = k => k.moved != null ? k.moved : Math.max(Math.abs(k.to[0] - k.from[0]), Math.abs(k.to[1] - k.from[1]));
const popView = (po, seen) => po ? { seq: po.seq, round: po.round, seen: !!seen } : null;
function eggView(g) { return g.eggs.map(e => ({ pos: e.pos, alive: e.alive, coldIn: B.coldIn(g, e), carried: g.carrying === e.id })); }
function view(room, role) {
  if (room.hunt) return viewH(room, role);
  if (room.team) return viewT(room, role);
  if (room.three) return view3(room, role);
  const g = room.g, mine = g.phase === 'play' && g.turn === role, pub = AI.redView(g);
  const v = { role, code: room.code, phase: g.phase, turn: g.turn, round: g.round, cfg: g.cfg, winner: g.winner, winBy: g.winBy,
    eggsLeft: B.aliveEggs(g).length, marks: pub.marks, vulture: g.vulture, ostrich: g.ostrich, stones: g.stones, hungerLeft: g.hungerLeft, sniff: g.sniff, sniffKeep: g.phase === 'play' ? (g.sniffKeep || null) : null,
    sitRun: g.sitRun, carried: g.carrying !== null, lastAction: role === 'blue' || g.phase === 'over' ? g.lastAction : pub.lastAction,
    kick: g.lastKick ? { who: g.lastKick.who, seq: g.lastKick.seq, round: g.lastKick.round, moved: kickMoved(g.lastKick), to: g.lastKick.to } : null, // classic: both birds always see each other
    lastCold: (g.lastCold || []).length, opponent: !!room.ai || !!room.pass || !!(room.players[role === 'blue' ? 'red' : 'blue'] || {}).ws, myTurn: mine,
    // 'joined' = the other seat has ever been taken; the invite panel is only for a seat nobody has claimed yet
    joined: !!room.ai || !!room.pass || !!room.players[role === 'blue' ? 'red' : 'blue'], ai: room.ai ? room.level : null, pass: !!room.pass, showTimers: timersOn(room) };
  // during setup the vulture doesn't see where the ostrich will stand until play starts (ostrich is null until then anyway)
  if (role === 'blue' || g.phase === 'over') {
    Object.assign(v, { eggs: g.eggs.map(e => ({ pos: e.pos, alive: e.alive, coldIn: B.coldIn(g, e), carried: g.carrying === e.id })),
      carrying: g.carrying, onEgg: B.onEgg(g), mustLeave: B.mustLeave(g) });
    if (role === 'blue') Object.assign(v, { moves: mine ? B.ostrichMoves(g) : [], carryMoves: mine ? B.ostrichMoves(g, true) : [],
      can: { sit: B.canSit(g), carry: B.canCarry(g), kick: mine && B.kickTargets(g).length > 0 }, kickTargets: mine ? B.kickTargets(g) : [], kickPlans: mine ? B.kickPlans(g) : [], kickNear: mine && B.kickable(g).length > 0 });
  }
  if (role === 'red') Object.assign(v, { fly: pub.fly, throw: pub.throw });
  return stamp(room, v, role);
}
const active = g => g.phase === 'play' ? g.turn : 'blue'; // pass & play: whose hands the phone is in
function persist(room) { if (room.saveT) return; room.saveT = setTimeout(() => { room.saveT = null; if (rooms.get(room.code) === room) ST.save(room); }, 150); }
function tellArrivals(room) {
  const list = (room.arrivals || []).concat(room.watchers || []);
  for (const a of list) if (a && a.ws && a.ws.readyState === 1) {
    try { a.ws.send(JSON.stringify({ t: 'state', lobby: true, state: LB.benchView(room, a) })); } catch {}
  }
}
function broadcast(room) { persist(room); tellArrivals(room); if (room.hunt) return broadcastH(room); if (room.team) return broadcastT(room); if (room.three) return broadcast3(room); schedAI(room);
  if (room.pass) { const p = room.players.blue; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', pass: true, active: active(room.g), views: { blue: view(room, 'blue'), red: view(room, 'red') } })); return; }
  for (const r of ['blue', 'red']) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: view(room, r) })); } }
function act(room, role, m) {
  if (room.hunt) return actH(room, role, m);
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
    if (m.a === 'kick') return B.ostrichKick(g, p);
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
// ===== 3 players: ostrich (blue), vulture (red), hunter (hyena / badger). Any seat can be a computer bot. =====
const SEATS3 = ['blue', 'red', 'hunter'];
const start3 = () => process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined;
function create3(m, ws) {
  const c = code(), role = SEATS3.includes(m.role) ? m.role : 'blue', token = tok();
  const kind = m.kind === 'badger' || m.kind === 'hyena' ? m.kind : null;
  const room = { code: c, three: true, g: T.newGame3(role === 'hunter' || (m.bots || []).includes('hunter') ? (kind || 'hyena') : null, undefined, start3()),
    players: { blue: null, red: null, hunter: null }, bots: [], level: m.level === 'easy' ? 'easy' : 'normal', mem: {}, touched: Date.now(),
    settings: { showTimers: m.showTimers !== false } };
  room.players[role] = { ws, token };
  for (const b of m.bots || []) if (SEATS3.includes(b) && b !== role) { room.bots.push(b); room.players[b] = { ws: null, token: tok(), bot: true }; }
  rooms.set(c, room); return { room, role, token };
}
const ready3 = room => SEATS3.every(s => room.players[s]) && !!room.g.three.kind;
// Found-egg marks belong to bird views, never to hunter packets. Wreckage remains public.
const hunterMarks = marks => Object.fromEntries(Object.entries(marks).filter(([,m]) => m === 'hit' || m === 'stone').map(([k]) => [k, 'stone']));
function view3(room, role) {
  const g = room.g, t = g.three, over = g.phase === 'over', pub = AI.redView(g), mine = g.phase === 'play' && g.turn === role && ready3(room);
  const seats = Object.fromEntries(SEATS3.map(s => [s, room.bots.includes(s) ? 'bot' : room.players[s] ? (room.players[s].ws ? 'on' : 'off') : 'open']));
  const lc = t.lastCatch && { bird: t.lastCatch.bird, ko: t.lastCatch.ko, walked: !!t.lastCatch.walked, ambush: !!t.lastCatch.ambush, seq: t.lastCatch.seq, round: t.lastCatch.round,
    at: role === t.lastCatch.bird || role === 'hunter' || over || T.hunterSeenBy(g, role) ? t.lastCatch.at : null, to: role !== 'hunter' || over ? t.lastCatch.to : null }; // a bird sees where the catch was only if it can see the hunter now (birds see birds, so `to` is public to them)
  const h3 = Object.assign(T.status3(g), { seats, ready: ready3(room), needKind: role === 'hunter' && !t.kind, lastCatch: lc, lost: t.lost || null,
    clockLeft: room.deadline && g.phase === 'play' ? Math.max(0, room.deadline - Date.now()) : null, clockMs: T.T3.clockMs, senseRange: T.T3.sense,
    hunter: over || role === 'hunter' || T.hunterSeenBy(g, role) ? t.h : null, burrowed: role === 'hunter' || over ? t.burrowed : false, range: role === 'hunter' ? T.hunterRange(g) : 1,
    popout: popView(t.popout, role === 'hunter' || over || T.hunterSeenBy(g, role)) });
  let v;
  if (role === 'hunter') {
    v = { role, code: room.code, phase: g.phase, turn: g.turn, round: g.round, cfg: g.cfg, winner: g.winner, winBy: g.winBy, eggsLeft: B.aliveEggs(g).length,
      marks: over ? g.marks : hunterMarks(pub.marks), vulture: over ? g.vulture : T.OFF, ostrich: over ? g.ostrich : T.OFF, stones: g.stones, hungerLeft: g.hungerLeft, sniff: null, sitRun: 0, carried: false,
      lastAction: null, lastCold: 0, myTurn: mine, opponent: true, joined: SEATS3.every(s => room.players[s]), ai: null, pass: false,
      hunter: t.h, kind: t.kind, sense: g.turn === 'hunter' || t.pounce ? t.sense : null, senseSeq: t.senseSeq, senseRange: T.T3.sense, pounce: t.pounce, firstAt: t.pounce ? t.firstAt : null, burrowed: t.burrowed, dig: t.dig || 0,
      hmoves: mine ? T.hunterMoves(g) : [], lastHunter: t.lastHunter, seenBirds: g.phase === 'play' ? T.ambushSight(g) : [] };
  } else {
    const sub = { ...room, three: false, ai: room.bots.length ? 'bot' : null, players: room.players };
    v = view(sub, role); v.myTurn = mine; v.joined = SEATS3.every(s => room.players[s]); v.ai = null;
    if (role === 'blue' && !mine) { v.moves = []; v.carryMoves = []; v.can = { sit: false, carry: false }; }
    if (role === 'red' && !mine) { v.fly = []; v.throw = []; }
    // Brian: an eliminated bird watches a read-only full board for the rest of the game.
    if (g.phase === 'play' && T.isOut(g, role)) {
      v.god = true; v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; v.hmoves = [];
      v.can = { sit: false, carry: false }; v.ostrich = g.ostrich; v.vulture = g.vulture; v.eggs = eggView(g);
      h3.hunter = t.h.slice(); h3.burrowed = !!t.burrowed; if (h3.popout) h3.popout.seen = true; if (lc) lc.at = t.lastCatch.at;
    }
  }
  // Kick: the ostrich's options; the kick itself is announced to every seat, the square it ended on only to a seat that can see that square
  if (role === 'blue') { v.kickTargets = mine && !v.god ? T.kickTargets3(g) : []; v.kickPlans = mine && !v.god ? T.kickPlans3(g) : []; v.kickNear = !!mine && !v.god && T.kickable3(g).length > 0; v.can = Object.assign(v.can || {}, { kick: v.kickTargets.length > 0 }); }
  const lk = g.lastKick;
  v.kick = lk ? { who: lk.who, by: 'blue', target: lk.who === 'vulture' ? 'red' : lk.who, seq: lk.seq, round: lk.round, moved: kickMoved(lk), to: over || v.god || (role === 'hunter' ? lk.who !== 'vulture' : lk.who === 'vulture' || T.hunterSeenBy(g, role)) ? lk.to : null } : null;
  if (over && role === 'hunter') v.eggs = eggView(g);
  v.h3 = h3; v.three = true; v.showTimers = timersOn(room); return stamp(room, v, role);
}
function broadcast3(room) {
  noteHolds(room, SEATS3, view3);
  sched3(room); clock3(room);
  for (const r of SEATS3) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: view3(room, r) })); }
  rememberViews(room, SEATS3, view3);
}
function act3(room, role, m) {
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = T.newGame3(g.three.kind, undefined, start3()); room.mem = {}; return true; }
  if (m.a === 'kind' && role === 'hunter' && !g.three.kind && (m.kind === 'hyena' || m.kind === 'badger')) { g.three.kind = m.kind; return true; }
  if (g.phase === 'play' && role !== 'hunter' && T.isOut(g, role)) return false;
  if (role === 'blue' && g.phase === 'setupEggs') return B.placeEgg(g, p);
  if (role === 'blue' && g.phase === 'setupOstrich') return T.placeOstrich3(g, p);
  if (!ready3(room) || g.phase !== 'play' || g.turn !== role) return false;
  if (role === 'blue') return m.a === 'sit' || m.a === 'step' || m.a === 'carry' || m.a === 'kick' ? T.ostrichAct3(g, m.a, p) : false;
  if (role === 'red') return m.a === 'fly' ? T.vultureFly3(g, p) : m.a === 'throw' ? !!T.vultureThrow3(g, p) : false;
  if (role === 'hunter') return m.a === 'hmove' ? T.hunterMove(g, p) : m.a === 'hstay' ? T.hunterStay(g) : false;
  return false;
}
function botMove3(room, r) {
  const g = room.g, mem = room.mem[r] || (room.mem[r] = {});
  if (r === 'hunter') { const v = view3(room, 'hunter'); if (g.three.lastCatch && mem.seenCatch !== g.three.lastCatch.seq) { mem.seenCatch = g.three.lastCatch.seq; mem.reset = true; mem.lastCatch = g.three.h.slice(); } return AI.hunter(v, mem); }
  const hv = T.hunterSeenBy(g, r) ? g.three.h : null, reach = T.hunterReach(g);
  if (r === 'blue') { if (g.phase !== 'play') { let m = AI.ostrich(g, room.level); if (g.phase === 'setupOstrich' && B.key(m.p) === B.key(g.three.h)) m = { a: 'place', p: g.eggs[1].pos.slice() }; return m; }
    const m = AI.ostrich(g, room.level);
    const alts = (B.canCarry(g) ? B.ostrichMoves(g, true).map(p => ({ a: 'carry', p })) : []).concat(B.ostrichMoves(g).map(p => ({ a: 'step', p })));
    return AI.ostrichReact(m, { at: g.ostrich, hunger: g.hungerLeft, cfg: g.cfg, legal: alts, hv, reach, kicks: T.kickTargets3(g), guard: B.onEgg(g) }); }
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
// A restart does not bring the hold timer back. Drop the saved flag so the shot clock can arm.
function scrubSaved(saved) {
  if (!saved) return saved;
  for (const k of ['clockHoldKey', 'clockFire', 'clockMsPending', 'deadline', 'lastViews', 'holdUntil', 'cardHold', 'clockT', 'clockKey', 'aiT', 'saveT', 'clockAskPause']) delete saved[k];
  return saved;
}
function isBotSeat(room, seat) {
  if (!seat || !room) return false;
  if (room.ai && room.ai === seat) return true;
  if (Array.isArray(room.bots) && room.bots.includes(seat)) return true;
  const p = room.players && room.players[seat];
  return !!(p && p.bot);
}
function rememberViews(room, seats, viewFn) {
  room.lastViews = {};
  for (const s of seats) { try { room.lastViews[s] = viewFn(room, s); } catch (e) {} }
}
// A hit player's phone is still in the cartoon, the slide, or the reading pause
// even when someone else moves first. Remember that hold per seat, so their own
// 10s clock waits when the turn arrives and never runs while they watch.
function noteHolds(room, seats, viewFn) {
  if (!room.holdUntil) room.holdUntil = {};
  const now = Date.now();
  for (const s of seats) {
    if (isBotSeat(room, s)) { delete room.holdUntil[s]; continue; }
    const prev = room.lastViews && room.lastViews[s];
    let nowView = null;
    try { nowView = viewFn(room, s); } catch (e) { continue; }
    if (!nowView || nowView.phase === 'over') continue;
    const pol = SUR.policy(nowView, prev);
    if (pol && pol.affected) {
      const until = now + (pol.animMs || 0) + (pol.readMs || 0);
      if (until > (room.holdUntil[s] || 0)) room.holdUntil[s] = until;
    }
  }
}
function holdLeftMs(room, seat) {
  const until = room.holdUntil && seat && room.holdUntil[seat];
  return until ? Math.max(0, until - Date.now()) : 0;
}
function cardHoldMs(room, seat) {
  return room && room.cardHold && seat && room.cardHold[seat] ? 24 * 60 * 60 * 1000 : 0;
}
function clockDelayFor(room, viewFn, seat) {
  const card = cardHoldMs(room, seat);
  if (!seat || isBotSeat(room, seat)) return 0;
  const prev = room.lastViews && room.lastViews[seat];
  let now = null;
  try { now = viewFn(room, seat); } catch (e) { return Math.max(holdLeftMs(room, seat), card); }
  let pol = null;
  try { pol = SUR.policy(now, prev); } catch (e) { return Math.max(holdLeftMs(room, seat), card); }
  const sees = !!(pol && pol.ev);
  return Math.max(SUR.clockDelayMs(pol, { isBot: false, isCurrent: true, seesEvent: sees }), holdLeftMs(room, seat), card);
}
function clearClock(room) {
  clearTimeout(room.clockT); room.clockT = null;
  room.clockKey = null; room.deadline = null; room.clockHoldKey = null;
  room.clockFire = null; room.clockMsPending = null; room.clockAskPause = null;
}
// The table is looking at "Let them in / Not them". Same check as the prompt in stamp().
function rejoinPromptOpen(room) {
  if (!room || room.lobby || room.pass || !room.g || room.g.phase === 'over') return false;
  return (room.rejoinAsks || []).some(a => a && seatOpen(room, a.seat) && personLive(room, a.hid));
}
// Freeze the shot clock that is already counting. A card or surprise hold is left alone,
// because that clock has not started. The saved time is what resumes after the answer.
function holdClockForAsk(room, k, ms, onFire) {
  if (!k) return;
  if (room.clockHoldKey && !room.deadline && !room.clockAskPause) return;
  if (room.clockAskPause && room.clockAskPause.key === k) {
    room.clockAskPause.fire = onFire;
    room.clockFire = onFire;
    return;
  }
  let left = ms;
  if (room.deadline && room.clockKey === k) left = Math.max(0, room.deadline - Date.now());
  clearTimeout(room.clockT);
  room.clockT = null;
  room.deadline = null;
  room.clockHoldKey = null;
  room.clockKey = k;
  room.clockFire = onFire;
  room.clockMsPending = left;
  room.clockAskPause = { key: k, left, fire: onFire };
}
function resumeClockAfterAsk(room, k) {
  const p = room.clockAskPause;
  if (!p) return;
  room.clockAskPause = null;
  if (!p.key || p.key !== k || !p.fire || !room.g || room.g.phase !== 'play') return;
  clearTimeout(room.clockT);
  const left = Math.max(0, p.left);
  room.clockHoldKey = null;
  room.clockKey = p.key;
  room.clockFire = p.fire;
  room.clockMsPending = left;
  room.deadline = Date.now() + left;
  room.clockT = setTimeout(p.fire, left);
}
function armClock(room, k, ms, onFire, delay) {
  if (room.clock === false) { clearClock(room); return; }
  if (rejoinPromptOpen(room)) return holdClockForAsk(room, k, ms, onFire, delay);
  if (room.clockAskPause) resumeClockAfterAsk(room, k);
  if (k && k === room.clockKey && room.deadline) return;
  if (k && k === room.clockHoldKey) return;
  clearClock(room);
  if (!k) return;
  const start = () => {
    room.clockHoldKey = null;
    room.clockKey = k;
    room.deadline = Date.now() + ms;
    room.clockFire = onFire;
    room.clockMsPending = ms;
    room.clockT = setTimeout(onFire, ms);
  };
  if (!delay) { start(); return; }
  room.clockHoldKey = k;
  room.clockMsPending = ms;
  room.clockFire = onFire;
  room.clockT = setTimeout(() => {
    if (room.clockHoldKey !== k) return;
    if (rejoinPromptOpen(room)) {
      room.clockHoldKey = null;
      room.clockT = null;
      room.deadline = null;
      room.clockKey = k;
      room.clockFire = onFire;
      room.clockMsPending = ms;
      room.clockAskPause = { key: k, left: ms, fire: onFire };
      broadcast(room);
      return;
    }
    start();
    broadcast(room);
  }, delay);
}
function surpriseDone(room, seat) {
  if (!room || !seat) return false;
  if (room.holdUntil) delete room.holdUntil[seat];
  if (!room.clockHoldKey || !room.clockFire) return false;
  const g = room.g;
  if (!g || g.phase !== 'play' || g.turn !== seat) return false;
  const k = room.clockHoldKey, ms = room.clockMsPending, onFire = room.clockFire;
  clearTimeout(room.clockT);
  room.clockHoldKey = null;
  if (rejoinPromptOpen(room)) {
    room.clockT = null;
    room.deadline = null;
    room.clockKey = k;
    room.clockFire = onFire;
    room.clockMsPending = ms;
    room.clockAskPause = { key: k, left: ms, fire: onFire };
    return true;
  }
  room.clockKey = k;
  room.deadline = Date.now() + ms;
  room.clockT = setTimeout(onFire, ms);
  return true;
}
function seatsOwned(room, ws) {
  const out = [];
  for (const s of Object.keys(room.players || {})) if (room.players[s] && room.players[s].ws === ws) out.push(s);
  return out;
}
// 10-second shot clock on every play turn (3 players only); runs once all seats are filled and the hunter is picked
function clock3(room) {
  const g = room.g, k = room.clock !== false && g && g.phase === 'play' && ready3(room) ? g.round + ':' + g.turn + ':' + (g.three && g.three.extra ? '2' : '1') : null;
  const delay = k ? clockDelayFor(room, view3, g.turn) : 0;
  armClock(room, k, +process.env.BO_CLOCKMS || T.T3.clockMs, () => { if (room.clockKey !== k || room.g !== g) return; room.clockKey = null; T.timeout(g); room.touched = Date.now(); broadcast(room); }, delay);
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
    players: Object.fromEntries(seats.map(s => [s, null])), bots, level: m.level === 'easy' ? 'easy' : 'normal', mem: {}, touched: Date.now(),
    settings: { showTimers: m.showTimers !== false } };
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
  const lc = g.lastCatch && { bird: g.lastCatch.bird, ko: g.lastCatch.ko, walked: !!g.lastCatch.walked, ambush: !!g.lastCatch.ambush, seq: g.lastCatch.seq, round: g.lastCatch.round,
    at: seat === g.lastCatch.bird || seat === 'hunter' || over || TT.hunterSeenBy(g, seat) ? g.lastCatch.at : null, to: seat !== 'hunter' || over ? g.lastCatch.to : null }; // a bird sees where the catch was only if it can see the hunter now
  const pub = Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m === 'spotted' || m === 'hit' || m === 'stone'));
  // other birds on the board: birds always see each other (vultures don't see where the ostriches start until play begins); the hunter sees none
  const pieces = seat === 'hunter' && !over ? [] : TT.OS.concat(TT.VS).filter(s => s !== seat && TT.live(g, s) && !(setup && isV && TT.isO(s)))
    .map(s => ({ seat: s, type: TT.isO(s) ? 'o' : 'v', p: g.b[s].pos, mate: (TT.isO(s) && isO) || (TT.isV(s) && isV), carrying: isO && TT.isO(s) && g.b[s].carrying != null }));
  const teamSetup = !setup ? null : TT.OS.some(o => TT.setupStep(g, o) === 'eggs') ? 'eggs' : TT.OS.some(o => TT.setupStep(g, o) === 'ostrich') ? 'ostrich' : 'done';
  const h3 = Object.assign(TT.status(g), { team: true, seats, ready, needKind: seat === 'hunter' && g.h && !g.h.kind, lastCatch: lc, lost: g.lost, mySeat: seat, pieces, setupStep: step, teamSetup, eggsToPlace: isO && setup ? Math.max(0, TT.TM.eggs - TT.nestOf(g, seat).length) : null,
    clockLeft: room.deadline && g.phase === 'play' ? Math.max(0, room.deadline - Date.now()) : null, clockMs: TT.TM.clockMs, senseRange: TT.TM.sense,
    hunter: g.h && (over || seat === 'hunter' || TT.hunterSeenBy(g, seat)) ? g.h.p : null, burrowed: g.h && (seat === 'hunter' || over) ? g.h.burrowed : false, range: seat === 'hunter' ? TT.hunterRange(g) : 1,
    popout: g.h ? popView(g.popout, seat === 'hunter' || over || TT.hunterSeenBy(g, seat)) : null,
    block: setup ? TT.TM.vStarts.concat(g.h ? [g.h.p] : []) : [], mateSniff: isV && g.phase === 'play' ? g.sniffs[TT.mate(seat)] || null : null, eggsTotal: g.eggs.length });
  const eggs = () => g.eggs.map(e => { const c = TT.OS.find(o => g.b[o].carrying === e.id);
    return { pos: e.pos || (c && c !== seat ? g.b[c].pos : null), alive: e.alive, coldIn: B.coldIn(g, e), carried: c === seat, nest: e.nest, mine: isO && e.nest === myB.nest }; });
  // Kick: announced to every seat; the square it ended on only to a seat that can see it (birds see every bird, a bird sees the hunter within 2, the hunter sees no bird)
  const kickOf = god => { const k = g.lastKick; if (!k) return null; const hk = k.seat === 'hunter';
    return { who: k.who, by: k.by || null, target: k.seat, seq: k.seq, round: k.round, moved: kickMoved(k), to: over || god || (seat === 'hunter' ? hk : !hk || TT.hunterSeenBy(g, seat)) ? k.to : null }; };
  const base = { code: room.code, turn: g.turn, round: g.round, winner: g.winner, winBy: g.winBy, eggsLeft: TT.alive(g).length, marks: over ? g.marks : seat === 'hunter' ? hunterMarks(pub) : pub, kick: kickOf(false),
    lastCold: (g.lastCold || []).length, myTurn: mine, opponent: true, joined: tseats(g).every(s => room.players[s]), ai: null, pass: false, three: true, h3, showTimers: timersOn(room) };
  if (seat === 'hunter') return stamp(room, Object.assign(base, { role: 'hunter', phase: setup ? 'setupEggs' : g.phase, cfg: g.cfg, vulture: TT.OFF, ostrich: TT.OFF, stones: Math.max(0, ...TT.VS.filter(x => !g.b[x].out).map(x => g.b[x].stones)), hungerLeft: Math.min(g.cfg.food, ...TT.OS.filter(x => !g.b[x].out).map(x => g.b[x].hunger)), sniff: null,
    sitRun: 0, carried: false, lastAction: null, hunter: g.h.p, kind: g.h.kind, sense: g.turn === 'hunter' || g.h.pounce ? g.h.sense : null, senseSeq: g.h.senseSeq,
    senseRange: TT.TM.sense, pounce: g.h.pounce, firstAt: g.h.pounce ? g.h.firstAt : null, burrowed: g.h.burrowed, dig: g.h.dig || 0, hmoves: mine ? TT.hunterMoves(g) : [], lastHunter: g.h.last, seenBirds: g.phase === 'play' ? TT.ambushSight(g) : [], eggs: over ? eggs() : undefined }), seat);
  const la = g.lastAction && (isO || over || g.lastAction.type !== 'throw' ? g.lastAction : { type: 'throw', from: g.lastAction.from, p: g.lastAction.p, result: g.lastAction.result, egg: !!g.lastAction.egg });
  const v = Object.assign(base, { role: isO ? 'blue' : 'red', phase: setup ? (isO ? (step === 'eggs' ? 'setupEggs' : step === 'ostrich' ? 'setupOstrich' : 'play') : 'setupEggs') : g.phase,
    cfg: { ...g.cfg, eggs: isO && setup ? g.eggs.length + (TT.TM.eggs - TT.nestOf(g, seat).length) : g.cfg.eggs * 2 },
    ostrich: isO ? (myB.pos || null) : TT.OFF, vulture: isV ? myB.pos : TT.OFF, stones: isV ? myB.stones : Math.max(0, ...TT.VS.filter(x => !g.b[x].out).map(x => g.b[x].stones)), hungerLeft: isO ? myB.hunger : Math.min(g.cfg.food, ...TT.OS.filter(x => !g.b[x].out).map(x => g.b[x].hunger)),
    sniff: isV && g.phase === 'play' ? g.sniffs[seat] || null : null, sniffKeep: isV && g.phase === 'play' ? ((g.sniffKeeps && g.sniffKeeps[seat]) || null) : null, sitRun: isO ? myB.sitRun : 0, carried: isO && myB.carrying != null, lastAction: la });
  if (setup && step === 'done') v.myTurn = false;
  if (isO || over) Object.assign(v, { eggs: isO || over ? eggs() : undefined, carrying: isO ? myB.carrying : null, onEgg: isO && TT.onEgg(g, seat), mustLeave: isO && TT.mustLeave(g, seat) });
  if (isO) Object.assign(v, { moves: mine ? TT.ostrichMoves(g, seat) : [], carryMoves: mine ? TT.ostrichMoves(g, seat, true) : [], can: { sit: mine && TT.canSit(g, seat), carry: mine && TT.canCarry(g, seat), kick: mine && TT.kickTargets(g, seat).length > 0 },
    kickTargets: mine ? TT.kickTargets(g, seat) : [], kickPlans: mine ? TT.kickPlans(g, seat) : [], kickNear: mine && TT.kickable(g, seat).length > 0 });
  if (isV) Object.assign(v, { fly: mine ? TT.flyTargets(g, seat) : [], throw: mine ? TT.throwTargets(g, seat) : [] });
  if (myB.out && g.phase === 'play') {
    v.god = true; v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; v.hmoves = [];
    v.can = { sit: false, carry: false, kick: false }; v.kickTargets = []; v.kickNear = false; v.kick = kickOf(true); v.eggs = eggs();
    v.h3.pieces = TT.OS.concat(TT.VS).filter(s => s !== seat && TT.live(g, s))
      .map(s => ({ seat: s, type: TT.isO(s) ? 'o' : 'v', p: g.b[s].pos, mate: (TT.isO(s) && isO) || (TT.isV(s) && isV), carrying: isO && TT.isO(s) && g.b[s].carrying != null }));
    if (g.h) { v.h3.hunter = g.h.p.slice(); v.h3.burrowed = !!g.h.burrowed; if (v.h3.popout) v.h3.popout.seen = true; if (lc) lc.at = g.lastCatch.at; }
  } else if (myB.out) { v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; }
  return stamp(room, v, seat);
}
function broadcastT(room) {
  noteHolds(room, tseats(room.g), viewT);
  schedT(room); clockT(room);
  for (const s of tseats(room.g)) { const p = room.players[s]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: viewT(room, s) })); }
  rememberViews(room, tseats(room.g), viewT);
}
function actT(room, seat, m) {
  const g = room.g, p = m.p;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = TT.newTeam(room.n, g.h && g.h.kind, undefined, process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined); room.mem = {}; return true; }
  if (m.a === 'kind' && seat === 'hunter' && g.h && !g.h.kind && (m.kind === 'hyena' || m.kind === 'badger')) { g.h.kind = m.kind; return true; }
  if (g.phase === 'play' && g.b[seat] && g.b[seat].out) return false;
  if (g.phase === 'setup') return TT.isO(seat) && Array.isArray(p) ? TT.place(g, seat, p) : false;
  if (!readyT(room) || g.phase !== 'play' || g.turn !== seat || !Array.isArray(p) && m.a !== 'sit' && m.a !== 'hstay') return false;
  if (TT.isO(seat)) return m.a === 'sit' || m.a === 'step' || m.a === 'carry' || m.a === 'kick' ? TT.ostrichAct(g, seat, m.a, p) : false;
  if (TT.isV(seat)) return m.a === 'fly' ? TT.vultureFly(g, seat, p) : m.a === 'throw' ? !!TT.vultureThrow(g, seat, p) : false;
  if (seat === 'hunter') return m.a === 'hmove' ? TT.hunterMove(g, p) : m.a === 'hstay' ? TT.hunterStay(g) : false;
  return false;
}
function botMoveT(room, s) {
  const g = room.g, mem = room.mem[s] || (room.mem[s] = {});
  if (g.phase === 'setup') return TA.setup(g, s);
  if (s === 'hunter') { const v = viewT(room, 'hunter'); if (g.lastCatch && mem.seenCatch !== g.lastCatch.seq) { mem.seenCatch = g.lastCatch.seq; mem.reset = true; mem.lastCatch = g.h.p.slice(); } return AI.hunter(v, mem); }
  const hv = g.h && TT.hunterSeenBy(g, s) ? g.h.p : null, reach = TT.hunterReach(g);
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
  const g = room.g, k = room.clock !== false && g && g.phase === 'play' && readyT(room) ? g.round + ':' + g.turn : null;
  const delay = k ? clockDelayFor(room, viewT, g.turn) : 0;
  armClock(room, k, +process.env.BO_CLOCKMS || TT.TM.clockMs, () => { if (room.clockKey !== k || room.g !== g) return; room.clockKey = null; TT.timeout(g); room.touched = Date.now(); broadcast(room); }, delay);
}

// ===== 4 players "Hunters": ostrich (blue) + vulture (red) + hyena + badger. Rules in hunt.js, bots in huntai.js. =====
const SEATSH = ['blue', 'red', 'hyena', 'badger'];
const startH = () => process.env.BO_H4START ? (a => [a.slice(0, 2), a.slice(2, 4)])(process.env.BO_H4START.split(',').map(Number)) : undefined;
function createH(m, ws) {
  const c = code(), role = SEATSH.includes(m.role) ? m.role : 'blue', token = tok();
  const room = { code: c, hunt: true, g: HU.newHunt(undefined, startH()), players: { blue: null, red: null, hyena: null, badger: null }, bots: [],
    level: m.level === 'easy' ? 'easy' : 'normal', mem: {}, touched: Date.now(), settings: { showTimers: m.showTimers !== false } };
  room.players[role] = { ws, token };
  for (const b of m.bots || []) if (SEATSH.includes(b) && b !== role) { room.bots.push(b); room.players[b] = { ws: null, token: tok(), bot: true }; }
  rooms.set(c, room); return { room, role, token };
}
const readyH = room => SEATSH.every(s => room.players[s]);
function viewH(room, seat) {
  const g = room.g, t = g.hunt, over = g.phase === 'over', pub = AI.redView(g), mine = g.phase === 'play' && g.turn === seat && readyH(room), isH = HU.isH(seat);
  const seats = Object.fromEntries(SEATSH.map(s => [s, room.bots.includes(s) ? 'bot' : room.players[s] ? (room.players[s].ws ? 'on' : 'off') : 'open']));
  const lc = t.lastCatch && { bird: t.lastCatch.bird, by: t.lastCatch.by, ko: t.lastCatch.ko, walked: !!t.lastCatch.walked, ambush: !!t.lastCatch.ambush, seq: t.lastCatch.seq, round: t.lastCatch.round,
    at: seat === t.lastCatch.bird || seat === t.lastCatch.by || over || (!isH && HU.seen(g, seat, t.lastCatch.by)) ? t.lastCatch.at : null, to: !isH || over ? t.lastCatch.to : null }; // birds see birds; a bird sees where the catch was only if it can see that hunter now; the hunter that made it knows the square, the other hunter sees no bird
  const hunters = HU.HUNTERS.filter(h => over || HU.seen(g, seat, h)).map(h => ({ kind: h, p: t.hs[h].p, burrowed: (h === seat || over) && t.hs[h].burrowed, me: h === seat }));
  const rv = t.rival && { by: t.rival.by, seq: t.rival.seq, round: t.rival.round, n: HU.TH.rivalKnock, to: isH || over || HU.seen(g, seat, 'hyena') ? t.rival.to : null }; // the meeting is announced to every seat; the square only to a seat that can see the hyena
  const h3 = Object.assign(HU.statusH(g), { seats, ready: readyH(room), needKind: false, kind: isH ? seat : null, mySeat: seat, hunters, hunter: null, burrowed: false,
    lastCatch: lc, rival: rv, lost: t.lost || null, clockLeft: room.deadline && g.phase === 'play' ? Math.max(0, room.deadline - Date.now()) : null, clockMs: HU.TH.clockMs,
    senseRange: HU.TH.sense, range: isH && g.turn === seat ? HU.hunterRange(g, seat) : 1, popout: popView(t.popout, over || HU.seen(g, seat, 'badger')) });
  let v;
  if (isH) { const x = t.hs[seat];
    v = { role: 'hunter', code: room.code, phase: g.phase, turn: HU.isH(g.turn) ? (g.turn === seat ? 'hunter' : g.turn) : g.turn, round: g.round, cfg: g.cfg, winner: g.winner, winBy: g.winBy,
      eggsLeft: B.aliveEggs(g).length, marks: over ? g.marks : hunterMarks(pub.marks), vulture: over ? g.vulture : HU.OFF, ostrich: over ? g.ostrich : HU.OFF, stones: g.stones, hungerLeft: g.hungerLeft,
      sniff: null, sitRun: 0, carried: false, lastAction: null, lastCold: 0, myTurn: mine, opponent: true, joined: readyH(room), ai: null, pass: false,
      hunter: x.p, kind: seat, sense: g.turn === seat ? x.sense : null, senseSeq: x.senseSeq, senseRange: HU.TH.sense, pounce: x.pounce, firstAt: x.pounce ? x.firstAt : null, burrowed: x.burrowed, dig: x.dig, canBurst: !!(mine && seat === 'badger' && HU.canBurst(g)),
      hmoves: mine ? HU.hunterMoves(g, seat) : [], lastHunter: x.last, seenBirds: seat === 'badger' && g.phase === 'play' ? HU.ambushSight(g) : [] };
  } else {
    const sub = { ...room, hunt: false, three: false, ai: room.bots.length ? 'bot' : null, players: room.players };
    v = view(sub, seat); v.myTurn = mine; v.joined = readyH(room); v.ai = null;
    if (seat === 'blue' && !mine) { v.moves = []; v.carryMoves = []; v.can = { sit: false, carry: false }; }
    if (seat === 'red' && !mine) { v.fly = []; v.throw = []; }
    if (g.phase === 'play' && HU.isOut(g, seat)) {
      v.god = true; v.myTurn = false; v.moves = []; v.carryMoves = []; v.fly = []; v.throw = []; v.hmoves = [];
      v.can = { sit: false, carry: false }; v.ostrich = g.ostrich; v.vulture = g.vulture; v.eggs = eggView(g);
      h3.hunters = HU.HUNTERS.map(h => ({ kind: h, p: t.hs[h].p.slice(), burrowed: !!t.hs[h].burrowed, me: false }));
      if (h3.rival) h3.rival.to = t.rival.to; if (h3.popout) h3.popout.seen = true; if (lc) lc.at = t.lastCatch.at;
    }
  }
  if (seat === 'blue') { v.kickTargets = mine && !v.god ? HU.kickTargetsH(g) : []; v.kickPlans = mine && !v.god ? HU.kickPlansH(g) : []; v.kickNear = !!mine && !v.god && HU.kickableH(g).length > 0; v.can = Object.assign(v.can || {}, { kick: v.kickTargets.length > 0 }); }
  const lk = g.lastKick; // announced to every seat; the square only to a seat that can see it (birds see birds, a bird sees a hunter within 2, hunters see no bird)
  v.kick = lk ? { who: lk.who, by: 'blue', target: lk.who === 'vulture' ? 'red' : lk.who, seq: lk.seq, round: lk.round, moved: kickMoved(lk), to: over || v.god || (lk.who === 'vulture' ? !isH : HU.seen(g, seat, lk.who)) ? lk.to : null } : null;
  if (over && isH) v.eggs = eggView(g);
  v.h3 = h3; v.three = true; v.showTimers = timersOn(room); return stamp(room, v, seat);
}
function broadcastH(room) {
  noteHolds(room, SEATSH, viewH);
  schedH(room); clockH(room);
  for (const r of SEATSH) { const p = room.players[r]; if (p && p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify({ t: 'state', state: viewH(room, r) })); }
  rememberViews(room, SEATSH, viewH);
}
function actH(room, seat, m) {
  const g = room.g;
  if (m.a === 'rematch' && g.phase === 'over') { room.g = HU.newHunt(undefined, startH()); room.mem = {}; return true; }
  if (g.phase === 'play' && !HU.isH(seat) && HU.isOut(g, seat)) return false;
  if (g.phase === 'play' && !readyH(room)) return false;
  if (seat !== 'blue' && g.phase !== 'play') return false;
  return HA.act(g, seat, m);
}
function schedH(room) {
  const g = room.g; if (room.aiT || !room.bots.length) return;
  const r = g.phase.startsWith('setup') ? 'blue' : g.phase === 'play' ? g.turn : null;
  if (!r || !room.bots.includes(r) || (g.phase === 'play' && !readyH(room))) return;
  const key = g.phase + g.round + g.turn, delay = g.phase.startsWith('setup') ? 250 : (+process.env.BO_BOTMS || 800 + Math.random() * 700);
  room.aiT = setTimeout(() => { room.aiT = null; if (!rooms.has(room.code) || room.g !== g || g.phase + g.round + g.turn !== key) return broadcast(room);
    const m = HA.move(g, r, room.mem[r] || (room.mem[r] = {}), room.level);
    if (!actH(room, r, m)) { console.error('AI hunt illegal move', r, m); if (g.phase === 'play') HU.timeout(g); }
    room.touched = Date.now(); broadcast(room); }, delay);
}
function clockH(room) {
  const g = room.g, k = room.clock !== false && g && g.phase === 'play' && readyH(room) ? g.round + ':' + g.turn + ':' + (HU.isH(g.turn) ? g.hunt.hs[g.turn].senseSeq : '') : null;
  const delay = k ? clockDelayFor(room, viewH, g.turn) : 0;
  armClock(room, k, +process.env.BO_CLOCKMS || HU.TH.clockMs, () => { if (room.clockKey !== k || room.g !== g) return; room.clockKey = null; HU.timeout(g); room.touched = Date.now(); broadcast(room); }, delay);
}
function viewerIsHost(room, v) {
  const roster = room && room.roster || [];
  if (!v || !roster.length) return !roster.length;
  return roster.some(r => r.host && (r.role === v.role || (v.role === 'hunter' && (r.role === v.kind || r.role === 'hunter'))));
}
// picked: true means Start gave this seat to the player; they did not choose it (lobby.js plan). Roster seat = view seat.
// Motion packets contain ONLY squares this viewer may see. Null steps preserve public timing, not hidden destinations.
const motionPath=require('./public/push-motion').path;
function trailView(room,v,seat,key,from,to,wrap=false,n=3){
 const g=room.g,pts=motionPath(g.cfg,from,to,wrap,n),isHunter=['hunter','hyena','badger'].includes(seat),ownKind=v.kind||(v.h3||{}).kind;
 return pts.map(p=>{if(g.phase==='over'||v.god)return p;
  const bird=key==='blue'||key==='red'||/^[ov][12]$/.test(key);
  if(bird)return isHunter?null:p;
  if(isHunter){if(key===ownKind||key===seat)return p;return g.hunt&&v.hunter&&B.dist(v.hunter,p)<=2?p:null;}
  const eye=v.role==='blue'?v.ostrich:v.vulture;return eye&&eye[0]>=0&&B.dist(eye,p)<=2?p:null;
 });
}
function stamp(room, v, seat) {
  if (v && room && room.g) {
    if (room.g.phase === 'over') v.god = true; // Brian: finished-game full reveal for everyone.
    // Brian: only the kicker may follow the entire kick to its actual landing. Other living seats keep normal sight.
    if(v.kick&&room.g.lastKick&&seat===(v.kick.by||'blue')){v.kick.to=room.g.lastKick.to.slice();if(v.lastAction&&v.lastAction.type==='kick')v.lastAction={...v.lastAction,to:v.kick.to.slice()};}
    // Non-kickers must not receive a hidden landing through the move note.
    if (room.g.phase !== 'over' && v.kick && !v.kick.to && v.lastAction && v.lastAction.type === 'kick')
      v.lastAction = { ...v.lastAction, to: null };
  }
  if (v && v.h3 && room && room.g) { // the badger digging in and bursting out (rule 7.4): the line goes to every seat; the mound only to a bird that could see it dig, only while it stays buried
    const g = room.g, t = g.three || g.hunt || (g.team && g.h ? g : null), over = g.phase === 'over';
    if (t) { const bur = g.three ? g.three.burrowed : g.hunt ? g.hunt.hs.badger.burrowed : g.h.burrowed, m = t.mound;
      v.h3.dug = t.dug ? { seq: t.dug.seq, round: t.dug.round } : null; v.h3.mound = !over && bur && m && (m.seenBy || []).includes(seat) ? m.at.slice() : null;
      const isBadger = g.three ? seat === 'hunter' && g.three.kind === 'badger' : g.hunt ? seat === 'badger' : seat === 'hunter' && g.h.kind === 'badger'; // only the badger's own phone learns whether a bird saw it dig (Brian, 2026-11-15)
      v.h3.dugSeen = isBadger && t.dug && m ? (m.seenBy || []).length > 0 : null;
      const bs = g.hunt && g.hunt.burst; v.h3.burst = bs ? { seq: bs.seq, round: bs.round, n: bs.n, to: over || v.god || ['hyena', 'badger'].includes(seat) || HU.seen(g, seat, 'hyena') ? bs.to : null } : null; } }
  if (v && room && room.g) { const g = room.g; v.endWhy = g.phase === 'over' ? g.endWhy || null : null; v.leftName = g.phase === 'over' && g.winBy === 'left' ? (g.leftName || null) : null; v.leftArt = g.phase === 'over' && g.winBy === 'left' ? (g.leftArt || null) : null; v.stoneNote = g.lastStone ? { seq: g.lastStone.seq, text: g.lastStone.text, by: g.lastStone.by, targets: g.lastStone.targets || [], kicker:g.lastStone.kicker||null } : null;
    v.smashNote = g.lastSmash ? {seq:g.lastSmash.seq,by:g.lastSmash.by,owner:g.team||v.role==='blue'||v.god?g.lastSmash.owner:null} : null;
    if(v.kick&&g.lastKick){const k=g.lastKick,key=g.team?(k.seat==='hunter'?g.h.kind:k.seat):k.who==='vulture'?'red':k.who;v.kick.trail=seat===(v.kick.by||'blue')?motionPath(g.cfg,k.from,k.to,true,k.moved||3):trailView(room,v,seat,key,k.from,k.to,true,k.moved||3);v.kick.key=key;}
    if(v.stoneNote)v.stoneNote.trails=(g.lastStone.trails||[]).map(t=>({key:t.key,points:trailView(room,v,seat,t.key,t.from,t.to,false,2)}));
    if(v.h3&&g.hunt){const rv=g.hunt.rival,bs=g.hunt.burst;if(v.h3.rival&&rv)v.h3.rival.trail=trailView(room,v,seat,rv.by==='hyena'?'badger':'hyena',rv.at,rv.to,false,2);if(v.h3.burst&&bs)v.h3.burst.trail=trailView(room,v,seat,'hyena',bs.at,bs.to,false,2);}

    // anyone who can see the ostrich sees it sit: birds always; hunters only through ambush sight (a buried badger with the ostrich next to it)
    const hunterSeat = ['hunter', 'hyena', 'badger'].includes(seat) && g.phase !== 'over';
    const amb = !hunterSeat ? [] : (g.three && seat === 'hunter' ? T.ambushSight(g) : g.hunt && seat === 'badger' ? HU.ambushSight(g) : g.team && seat === 'hunter' ? TT.ambushSight(g) : []);
    const ambAt = p => amb.some(q => q.p[0] === p[0] && q.p[1] === p[1]);
    v.sittingAt = hunterSeat ? (g.team ? ['o1', 'o2'].filter(o => g.b[o].sitting && g.b[o].pos && g.b[o].pos[0] >= 0 && ambAt(g.b[o].pos)).map(o => g.b[o].pos.slice()) : g.sitting && g.ostrich && g.ostrich[0] >= 0 && ambAt(g.ostrich) ? [g.ostrich.slice()] : [])
      : g.team ? ['o1', 'o2'].filter(o => g.b[o].sitting && g.b[o].pos && g.b[o].pos[0] >= 0).map(o => g.b[o].pos.slice()) : g.sitting && g.ostrich && g.ostrich[0] >= 0 ? [g.ostrich.slice()] : []; }
  if (v) v.picked = !!((room && room.roster || []).find(r => !r.bot && r.role === seat) || {}).picked;
  if (v) v.rules = RULES;
  if (v) { v.showTimers = timersOn(room); v.clockStopped = !!(room && room.clock === false); v.host = viewerIsHost(room, v); }
  if (room && room.flow) {
    v.flow = 1;
    if (room.g && room.g.phase === 'over') v.arrivals = (room.arrivals || []).map(a => a.name).filter(Boolean);
  }
  if (v && room && room.g && !room.pass && !room.lobby) {
    const ask = (room.rejoinAsks || []).find(a => a && seatOpen(room, a.seat) && personLive(room, a.hid));
    if (ask) {
      const label = LB.seatLabel(room, ask.seat);
      v.rejoinAsk = { id: ask.id, seat: ask.seat, title: LB.askLine(label), yes: LB.REJOIN_WORDS.askYes, no: LB.REJOIN_WORDS.askNo };
    }
  }
  if (v && v.h3 && room && room.clockAskPause && room.g && room.g.phase === 'play') {
    v.h3.clockLeft = room.clockAskPause.left;
    v.h3.clockPaused = true;
  }
  return v;
}
const hid = () => Math.random().toString(36).slice(2, 10);
function clientRole(room, seat) { return room.hunt && (seat === 'hyena' || seat === 'badger') ? 'hunter' : seat; }
function tell(ws, room, seat, token) { try { ws.send(JSON.stringify({ t: 'joined', code: room.code, role: clientRole(room, seat), token, flow: 1 })); } catch {} }
function live(p) { return !!(p && p.ws && p.ws.readyState === 1); }
function clearGone(p) {
  if (!p) return;
  if (p.graceT) { clearTimeout(p.graceT); p.graceT = null; }
  p.goneAt = null;
}
function scheduleGrace(room, seat) {
  const p = room.players && room.players[seat];
  if (!p || p.bot) return;
  if (p.graceT) clearTimeout(p.graceT);
  const left = Math.max(0, LB.rejoinGraceMs() - (p.goneAt ? Date.now() - p.goneAt : 0));
  p.graceT = setTimeout(() => {
    p.graceT = null;
    if (rooms.get(room.code) !== room || room.players[seat] !== p || live(p)) return;
    tellArrivals(room);
  }, left);
  if (p.graceT.unref) p.graceT.unref();
}
function markGone(room, seat) {
  const p = room.players && room.players[seat];
  if (!p) return;
  p.ws = null;
  if (p.bot) return;
  if (!p.goneAt) p.goneAt = Date.now();
  scheduleGrace(room, seat);
}
function armGrace(room) {
  for (const [seat, p] of Object.entries(room.players || {})) {
    if (!p || p.bot || live(p)) continue;
    delete p.graceT;
    if (!p.goneAt) p.goneAt = Date.now();
    scheduleGrace(room, seat);
  }
}
function personById(room, id) {
  if (!id) return null;
  return (room.watchers || []).find(x => x.id === id) || (room.arrivals || []).find(x => x.id === id) || null;
}
function personLive(room, id) {
  const w = personById(room, id);
  return !!(w && live(w));
}
function anyLiveHuman(room) {
  return Object.values(room.players || {}).some(p => p && !p.bot && live(p));
}
function seatOpen(room, seat) {
  const p = room.players && room.players[seat];
  if (!room || !room.g || room.g.phase === 'over' || room.pass) return false;
  return !!(p && !p.bot && !live(p) && !LB.seatInGrace(p));
}
function roomDropAsks(room, pred) {
  if (!room.rejoinAsks || !room.rejoinAsks.length) return;
  room.rejoinAsks = room.rejoinAsks.filter(a => !pred(a));
}
function liveToken(room, token) {
  return Object.values(room.players || {}).some(p => p && !p.bot && p.token === token && live(p));
}
function adoptRoster(room, seat, oldToken, fresh, who, name) {
  const roster = room.roster || [];
  const rec = roster.find(x => !x.bot && (x.token === oldToken || x.role === seat));
  if (!rec) return who || null;
  rec.token = fresh;
  if (who) rec.id = who;
  if (name) rec.name = name;
  rec.bot = false;
  if (rec.host) {
    const other = roster.find(x => x !== rec && !x.bot && liveToken(room, x.token));
    if (other) { rec.host = false; other.host = true; }
  }
  return rec.id;
}
// A fallback claim never inherits the seat token. The previous token is retired so it cannot kick the new person.
function takeSeat(room, ws, seat) {
  const p = room.players && room.players[seat];
  if (!seatOpen(room, seat)) return { error: 'That seat is taken.' };
  const who = ws._bo && ws._bo.hid;
  const person = personById(room, who);
  if (room.arrivals) room.arrivals = room.arrivals.filter(a => a.ws !== ws && a.id !== who);
  if (room.watchers) room.watchers = room.watchers.filter(a => a.ws !== ws && a.id !== who);
  roomDropAsks(room, a => a.hid === who || a.seat === seat);
  const fresh = tok();
  const retired = (p.retired || []).concat(p.token).filter((t, i, arr) => t && arr.indexOf(t) === i).slice(-12);
  const rosterId = adoptRoster(room, seat, p.token, fresh, who, person && person.name);
  clearGone(p);
  room.players[seat] = { ws, token: fresh, bot: false, retired };
  ws._bo = { room, seat, hid: rosterId, arrival: false };
  room.touched = Date.now();
  try { ws.send(JSON.stringify({ t: 'joined', code: room.code, role: clientRole(room, seat), token: fresh, flow: room.flow ? 1 : undefined })); } catch {}
  broadcast(room);
  return { ok: true, token: fresh };
}
function leftInfo(room, seat) {
  const g = room.g || {};
  const named = { o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2' };
  if (named[seat]) return { art: seat[0] === 'o' ? 'ostrich' : 'vulture', title: named[seat] + ' left.' };
  if (seat === 'hyena' || seat === 'badger') return { art: seat, title: 'The ' + seat + ' left.' };
  if (seat === 'hunter') {
    const kind = (g.three && g.three.kind) || (g.h && g.h.kind) || 'hyena';
    const k = kind === 'badger' ? 'badger' : 'hyena';
    return { art: k, title: 'The ' + k + ' left.' };
  }
  if (seat === 'red') return { art: 'vulture', title: 'The vulture left.' };
  return { art: 'ostrich', title: 'The ostrich left.' };
}
function leaveGame(room, seat) {
  const g = room.g;
  if (!g || g.phase === 'over' || !seat) return false;
  const info = leftInfo(room, seat);
  g.phase = 'over';
  g.winner = 'none';
  g.winBy = 'left';
  g.leftName = info.title;
  g.leftArt = info.art;
  g.endWhy = 'This game is over.';
  clearClock(room);
  return true;
}
function releaseCard(room, seat) {
  if (!room.cardHold || !seat || !room.cardHold[seat]) return false;
  delete room.cardHold[seat];
  if (room.g && room.g.phase === 'play' && room.g.turn === seat && room.clockHoldKey) clearClock(room);
  return true;
}
function wsFor(room, token) {
  for (const p of Object.values(room.players || {})) if (p && p.token === token && p.ws && p.ws.readyState === 1) return p.ws;
  const a = (room.arrivals || []).find(x => x.token === token && x.ws && x.ws.readyState === 1);
  return a ? a.ws : null;
}
function lobbyBroadcast(room) {
  persist(room);
  for (const h of room.humans || []) if (h.ws && h.ws.readyState === 1) h.ws.send(JSON.stringify({ t: 'state', lobby: true, state: LB.view(room, h.id) }));
}
function stopClock(room) { clearTimeout(room.aiT); room.aiT = null; clearClock(room); }
function rebuildSame(room) {
  stopClock(room); room.mem = {};
  const id = room.setupId, hs = process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined;
  if (id === '2') room.g = B.newGame();
  else if (id === '3') room.g = T.newGame3(room.hunterKind || 'hyena', undefined, start3());
  else if (id === '4h') room.g = HU.newHunt(undefined, startH());
  else if (id === '4' || id === '5') room.g = TT.newTeam(id === '5' ? 5 : 4, id === '5' ? (room.hunterKind || 'hyena') : null, undefined, hs);
}
function applyPlan(room, plan) {
  stopClock(room); room.mem = {}; room.lobby = false; room.setupId = plan.setup; room.hunterKind = plan.kind || room.hunterKind || null; room.note = '';
  room.hunt = plan.setup === '4h'; room.team = plan.setup === '4' || plan.setup === '5'; room.three = plan.setup === '3';
  room.n = plan.setup === '5' ? 5 : plan.setup === '4' ? 4 : undefined; room.pass = false; room.flow = 1;
  room.bots = plan.assignments.filter(a => a.bot).map(a => a.seat); room.ai = null;
  room.level = room.level === 'easy' ? 'easy' : 'normal';
  if (plan.setup === '2') { room.g = B.newGame(); room.players = { blue: null, red: null }; if (room.bots.length === 1) room.ai = room.bots[0]; }
  else if (plan.setup === '3') { room.g = T.newGame3(plan.kind || 'hyena', undefined, start3()); room.players = { blue: null, red: null, hunter: null }; }
  else if (plan.setup === '4h') { room.g = HU.newHunt(undefined, startH()); room.players = { blue: null, red: null, hyena: null, badger: null }; }
  else {
    const hs = process.env.BO_H3START ? process.env.BO_H3START.split(',').map(Number) : undefined;
    room.g = TT.newTeam(room.n, plan.setup === '5' ? (plan.kind || 'hyena') : null, undefined, hs);
    room.players = Object.fromEntries((plan.setup === '5' ? ['v1', 'o1', 'v2', 'o2', 'hunter'] : ['v1', 'o1', 'v2', 'o2']).map(s => [s, null]));
  }
  room.roster = []; room.arrivals = [];
  for (const a of plan.assignments) {
    if (a.bot) { room.players[a.seat] = { ws: null, token: tok(), bot: true }; room.roster.push({ bot: true, role: a.seat }); }
    else {
      const h = a.human;
      room.players[a.seat] = { ws: h.ws, token: h.token };
      room.roster.push({ id: h.id, token: h.token, name: h.name, role: a.seat, kind: h.kind || null, host: !!h.host, picked: !!h.picked, bot: false });
      if (h.ws) { h.ws._bo = { room, seat: a.seat, hid: h.id }; tell(h.ws, room, a.seat, h.token); }
    }
  }
  for (const h of plan.bench || []) {
    room.arrivals.push({ id: h.id, token: h.token, ws: h.ws, name: h.name });
    if (h.ws) { h.ws._bo = { room, seat: null, hid: h.id, arrival: true }; try { h.ws.send(JSON.stringify({ t: 'state', lobby: true, state: LB.benchView(room, h) })); } catch {} }
  }
  room.touched = Date.now(); broadcast(room);
}
function toLobby(room, humans, opt) {
  stopClock(room); room.lobby = true; room.g = null; room.hunt = false; room.team = false; room.three = false; room.ai = null; room.pass = false;
  room.players = {}; room.bots = []; room.arrivals = []; room.botsWanted = 0; room.note = opt.note || '';
  room.humans = humans.map(h => ({ id: h.id, token: h.token, ws: h.ws || null, name: h.name, host: !!h.host, role: opt.clear ? null : (h.role || null), kind: opt.clear ? null : (h.kind || null), animal: opt.clear ? null : (h.animal || null) }));
  if (!room.humans.some(h => h.host)) { const c = room.humans.find(h => h.ws && h.ws.readyState === 1) || room.humans[0]; if (c) c.host = true; }
  LB.clampBots(room); LB.reconcile(room);
  for (const h of room.humans) if (h.ws) h.ws._bo = { room, seat: null, hid: h.id };
  room.touched = Date.now(); lobbyBroadcast(room);
}
function playingHumans(room) {
  return (room.roster || []).filter(r => !r.bot).map(r => ({ id: r.id, token: r.token, name: r.name, host: !!r.host, role: r.role, kind: r.kind, picked: !!r.picked, ws: wsFor(room, r.token) }));
}
function handleRematch(room, how) {
  const humans = playingHumans(room);
  if (how === 'change') return toLobby(room, humans.concat(room.arrivals || []), { clear: true, note: 'Pick roles for the next game. Anyone who joined is here.' });
  const decision = LB.sameOrAdapt({ humans, bots: (room.bots || []).slice(), arrivals: room.arrivals || [], setupChoice: room.setupChoice, hunterKind: room.hunterKind });
  if (decision.type === 'same') { room.arrivals = []; rebuildSame(room); room.touched = Date.now(); return broadcast(room); }
  if (decision.type === 'replace') {
    for (const h of decision.placed) {
      room.players[h.role] = { ws: h.ws, token: h.token };
      if (h.ws) h.ws._bo = { room, seat: h.role, hid: h.id };
      const rec = (room.roster || []).find(r => r.bot && r.role === h.role);
      if (rec) Object.assign(rec, { bot: false, id: h.id, token: h.token, name: h.name, role: h.role, kind: h.kind, host: false });
    }
    room.bots = decision.bots.slice();
    if (room.setupId === '2') room.ai = room.bots.length === 1 ? room.bots[0] : null;
    room.arrivals = []; rebuildSame(room);
    for (const h of decision.placed) if (h.ws) tell(h.ws, room, h.role, h.token);
    room.touched = Date.now(); return broadcast(room);
  }
  if (decision.type === 'expand') return applyPlan(room, decision.plan);
  return toLobby(room, decision.humans, { clear: false, note: decision.note });
}
function openLobby(ws, m) {
  const c = code(), token = tok(), id = hid();
  const human = { id, token, ws, name: 'Player 1', role: null, kind: null, host: true };
  const room = { code: c, lobby: true, flow: 1, solo: !!m.solo, pass: false, humans: [human],
    botsWanted: m.solo ? Math.max(1, Math.min(4, +m.bots || 1)) : 0, setupChoice: null, recovery: null,
    clock: true, level: 'normal', hunterKind: null, arrivals: [], note: '', touched: Date.now(), players: {}, bots: [], mem: {} };
  LB.clampBots(room); LB.reconcile(room); rooms.set(c, room); ws._bo = { room, seat: null, hid: id };
  try { ws.send(JSON.stringify({ t: 'joined', code: c, role: null, token, lobby: true })); } catch {}
  lobbyBroadcast(room);
}
// A square from a client must be exactly [x, y] with whole numbers on the board. Actions that move something need one; the others must not carry a bad one.
const SQUARE_ACTS = new Set(['place', 'step', 'carry', 'fly', 'throw', 'kick', 'hmove']);
const validSquare = p => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[1] >= 0 && p[0] < B.CONFIG.cols && p[1] < B.CONFIG.rows;
function validMove(m) {
  if (m.t === 'seat') return typeof m.role === 'string' && (m.p === undefined || validSquare(m.p));
  if (typeof m.a !== 'string') return false;
  return SQUARE_ACTS.has(m.a) ? validSquare(m.p) : m.p === undefined || validSquare(m.p);
}
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  const send = o => { try { ws.send(JSON.stringify(o)); } catch {} };
  const onMessage = async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object' || Array.isArray(m)) return;
    if (m.t === 'ping') return send({ t: 'pong' });
    if (m.t === 'surprise-done') {
      const b = ws._bo; if (!b || !b.room) return;
      const room = b.room, owned = seatsOwned(room, ws);
      const seat = (room.g && owned.includes(room.g.turn)) ? room.g.turn : b.seat;
      if (surpriseDone(room, seat)) { room.touched = Date.now(); broadcast(room); }
      return;
    }
    if (m.t === 'card-hold' || m.t === 'card-done') {
      const b = ws._bo; if (!b || !b.room || !b.room.g) return;
      const room = b.room, owned = seatsOwned(room, ws);
      const seat = owned.includes(m.seat) ? m.seat : ((room.g && owned.includes(room.g.turn)) ? room.g.turn : b.seat);
      if (!seat) return;
      if (!room.cardHold) room.cardHold = {};
      if (m.t === 'card-hold') {
        room.cardHold[seat] = true;
        if (room.g.phase === 'play' && room.g.turn === seat && (room.clockKey || room.clockHoldKey)) clearClock(room);
      } else releaseCard(room, seat);
      room.touched = Date.now();
      return broadcast(room);
    }
    if (m.t === 'create' && (m.friends || m.solo)) return openLobby(ws, m);
    if (m.t === 'create' && m.hunt) { const rh = createH(m, ws); ws._bo = { room: rh.room, seat: rh.role, hid: null }; send({ t: 'joined', code: rh.room.code, role: HU.isH(rh.role) ? 'hunter' : rh.role, token: rh.token, three: true }); return broadcast(rh.room); }
    if (m.t === 'create' && m.team) { const rt = createT(m, ws); ws._bo = { room: rt.room, seat: rt.role, hid: null }; send({ t: 'joined', code: rt.room.code, role: rt.role, token: rt.token, team: rt.room.n }); return broadcast(rt.room); }
    if (m.t === 'create' && m.three) { const r3 = create3(m, ws); ws._bo = { room: r3.room, seat: r3.role, hid: null }; send({ t: 'joined', code: r3.room.code, role: r3.role, token: r3.token, three: true }); return broadcast(r3.room); }
    if (m.t === 'create') {
      const c = code(); let role = m.role === 'red' ? 'red' : 'blue';
      const room = { code: c, g: B.newGame(), players: { blue: null, red: null }, touched: Date.now(), settings: { showTimers: m.showTimers !== false } };
      rooms.set(c, room); const token = tok(); room.players[role] = { ws, token };
      if (m.pass) { room.pass = true; role = 'blue'; room.players = { blue: { ws, token }, red: { ws, token } }; ws._bo = { room, seat: 'blue', hid: null }; send({ t: 'joined', code: c, role, token, pass: true }); return broadcast(room); }
      if (m.ai) { room.ai = role === 'blue' ? 'red' : 'blue'; room.level = m.ai === 'easy' ? 'easy' : 'normal'; room.players[room.ai] = { ws: null, token: tok(), bot: true }; }
      ws._bo = { room, seat: role, hid: null }; send({ t: 'joined', code: c, role, token }); return broadcast(room);
    }
    if (m.t === 'lobby') {
      const b = ws._bo; if (!b) return send({ t: 'error', msg: 'No open lobby.', soft: true });
      const room = b.room;
      if (!room.lobby && m.a === 'clock') {
        const res = LB.setClock(room, m.on, b.hid);
        if (res && res.error) return send({ t: 'error', msg: res.error, soft: true });
        if (room.three) clock3(room); else if (room.hunt) clockH(room); else if (room.team) clockT(room);
        room.touched = Date.now(); return broadcast(room);
      }
      if (!room.lobby) return send({ t: 'error', msg: 'No open lobby.', soft: true });
      let res;
      if (m.a === 'role') res = LB.claim(room, b.hid, m.role, m.kind);
      else if (m.a === 'bots') res = LB.setBots(room, m.n, b.hid);
      else if (m.a === 'setup') res = LB.setChoice(room, m.setup, b.hid);
      else if (m.a === 'recovery') res = LB.setRecovery(room, m.mode, b.hid);
      else if (m.a === 'clock') res = LB.setClock(room, m.on, b.hid);
      else if (m.a === 'level') res = LB.setLevel(room, m.level, b.hid);
      else if (m.a === 'kind') res = LB.setHunterKind(room, m.kind, b.hid);
      else if (m.a === 'start') {
        if (!LB.isHost(room, b.hid)) res = { error: 'The host starts the game.' };
        else { const plan = LB.plan(room); if (plan.error) res = plan; else return applyPlan(room, plan); }
      } else res = { error: 'Unknown lobby action.' };
      if (res && res.error) return send({ t: 'error', msg: res.error, soft: true });
      room.touched = Date.now(); return lobbyBroadcast(room);
    }
    if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase(); let r = rooms.get(code);
      if (!r) { const saved = await ST.load(code).catch(() => null);
        if (saved && (saved.g || saved.lobby) && !rooms.has(code)) {
          saved.touched = Date.now();
          scrubSaved(saved);
          for (const k in saved.players || {}) if (saved.players[k]) { saved.players[k].ws = null; delete saved.players[k].graceT; }
          for (const h of saved.humans || []) h.ws = null;
          for (const a of saved.arrivals || []) a.ws = null;
          rooms.set(code, saved);
          armGrace(saved);
        }
        r = rooms.get(code); }
      if (!r) return send({ t: 'error', msg: 'No game with that code.', gone: !!m.token });
      if (r.lobby) {
        let h = r.humans.find(x => m.token && x.token === m.token);
        if (!h) {
          if (r.humans.length >= 8) return send({ t: 'error', msg: 'That room is full.' });
          h = { id: hid(), token: tok(), ws, name: 'Player ' + (r.humans.length + 1), role: null, kind: null, host: !r.humans.some(x => x.host) };
          r.humans.push(h); LB.clampBots(r); LB.reconcile(r);
        } else h.ws = ws;
        ws._bo = { room: r, seat: null, hid: h.id }; r.touched = Date.now();
        send({ t: 'joined', code: r.code, role: null, token: h.token, lobby: true }); return lobbyBroadcast(r);
      }
      if (r.pass) {
        if (!m.token || r.players.blue.token !== m.token) return send({ t: 'error', msg: 'That is a pass & play game on another phone.' });
        r.players.blue.ws = r.players.red.ws = ws; ws._bo = { room: r, seat: 'blue', hid: null }; r.touched = Date.now();
        send({ t: 'joined', code: r.code, role: 'blue', token: m.token, pass: true }); return broadcast(r);
      }
      const SEATS = r.hunt ? SEATSH : r.team ? ['o1', 'v1', 'o2', 'v2', 'hunter'].filter(x => x in (r.players || {})) : r.three ? ['blue', 'red', 'hunter'] : ['blue', 'red'];
      let token = m.token || null;
      let seat = token && SEATS.find(s => r.players[s] && !r.players[s].bot && r.players[s].token === token);
      if (seat) {
        const p = r.players[seat];
        clearGone(p);
        roomDropAsks(r, a => a.seat === seat);
        p.ws = ws; p.bot = false;
        ws._bo = { room: r, seat, hid: (r.roster || []).find(x => x.token === p.token)?.id || null };
        r.touched = Date.now();
        send({ t: 'joined', code: r.code, role: clientRole(r, seat), token: p.token, flow: r.flow ? 1 : undefined });
        return broadcast(r);
      }
      const retiredSeat = token && SEATS.find(s => r.players[s] && !r.players[s].bot && (r.players[s].retired || []).includes(token));
      if (retiredSeat && live(r.players[retiredSeat])) return send({ t: 'error', msg: 'That seat is taken.' });
      if (retiredSeat) token = null;
      const back = token && ((r.arrivals || []).find(a => a.token === token) || (r.watchers || []).find(a => a.token === token));
      if (back) {
        back.ws = ws; ws._bo = { room: r, seat: null, hid: back.id, arrival: true };
        send({ t: 'joined', code: r.code, role: null, token: back.token, lobby: true });
        send({ t: 'state', lobby: true, state: LB.benchView(r, back) });
        return broadcast(r);
      }
      seat = SEATS.find(s => !r.players[s]);
      const over = !!(r.g && r.g.phase === 'over');
      if (r.flow && (over || !seat)) {
        const count = (r.roster || []).filter(x => !x.bot).length + (r.arrivals || []).length;
        if (count >= 8) return send({ t: 'error', msg: 'That room is full.' });
        const a = { id: hid(), token: tok(), ws, name: 'Player ' + (count + 1) };
        if (!over) a.late = true; // joined while a game is running: the bench says so (lobby.js benchView)
        r.arrivals = r.arrivals || []; r.arrivals.push(a); ws._bo = { room: r, seat: null, hid: a.id, arrival: true }; r.touched = Date.now();
        send({ t: 'joined', code: r.code, role: null, token: a.token, lobby: true });
        send({ t: 'state', lobby: true, state: LB.benchView(r, a) });
        // between games the players see the new name; mid-game nothing on their screens changes, so only save
        // tell other waiters their reclaim list (an offline seat may already be waiting)
        if (over) return broadcast(r);
        tellArrivals(r); return persist(r);
      }
      // A mid-game return without a token (storage gone). During the grace only the original token can sit back down,
      // so the bench shows the no-seat line until the grace ends and tellArrivals offers the seat.
      if (!seat && r.g && r.g.phase !== 'over' && !r.pass) {
        if (LB.offlineSeats(r).length || LB.graceSeats(r).length) {
          const a = { id: hid(), token: tok(), ws, name: 'Player', late: true };
          r.watchers = r.watchers || []; r.watchers.push(a);
          ws._bo = { room: r, seat: null, hid: a.id, arrival: true }; r.touched = Date.now();
          send({ t: 'joined', code: r.code, role: null, token: a.token, lobby: true });
          send({ t: 'state', lobby: true, state: LB.benchView(r, a) });
          return persist(r);
        }
      }
      if (!seat) return send({ t: 'error', msg: 'That game is full and already started. Ask for a new code.' });
      const freshSeat = tok(); r.players[seat] = { ws, token: freshSeat }; ws._bo = { room: r, seat, hid: null }; r.touched = Date.now();
      send({ t: 'joined', code: r.code, role: clientRole(r, seat), token: freshSeat }); return broadcast(r);
    }
    if (m.t === 'claim') {
      const b0 = ws._bo, room0 = b0 && b0.room;
      if (!room0 || room0.lobby || room0.pass) return send({ t: 'error', msg: 'Not a legal move right now.', soft: true });
      if (b0.seat && room0.players[b0.seat] && room0.players[b0.seat].ws === ws) return;
      const want = String(m.seat || '');
      if (!seatOpen(room0, want)) return send({ t: 'error', msg: 'That seat is taken.', soft: true });
      const who = b0.hid;
      const pending = (room0.rejoinAsks || []).find(a => a.seat === want && a.hid !== who);
      if (pending && personLive(room0, pending.hid)) return send({ t: 'error', msg: 'That seat is taken.', soft: true });
      room0.rejoinAsks = (room0.rejoinAsks || []).filter(a => a.hid !== who && !(a.seat === want && !personLive(room0, a.hid)));
      room0.rejoinAsks.push({ id: hid(), seat: want, hid: who, at: Date.now() });
      room0.touched = Date.now();
      if (!anyLiveHuman(room0)) return takeSeat(room0, ws, want);
      broadcast(room0);
      return;
    }
    if (m.t === 'claim-answer') {
      const b0 = ws._bo, room0 = b0 && b0.room;
      if (!room0 || room0.lobby || room0.pass) return;
      const mine = b0.seat && room0.players[b0.seat];
      if (!mine || mine.bot || mine.ws !== ws) return send({ t: 'error', msg: 'That seat is taken.', soft: true });
      const ask = (room0.rejoinAsks || []).find(a => (m.id && a.id === m.id) || (!m.id && m.seat && a.seat === m.seat));
      if (!ask) return;
      if (!m.yes) { roomDropAsks(room0, a => a === ask); room0.touched = Date.now(); return broadcast(room0); }
      const w = personById(room0, ask.hid);
      if (!w || !live(w) || !seatOpen(room0, ask.seat)) { roomDropAsks(room0, a => a === ask); room0.touched = Date.now(); return broadcast(room0); }
      const res = takeSeat(room0, w.ws, ask.seat);
      if (res && res.error) return send({ t: 'error', msg: res.error, soft: true });
      return;
    }
    const b = ws._bo, room = b && b.room, role = b && b.seat;
    if ((m.t === 'act' || m.t === 'seat') && !validMove(m)) return send({ t: 'error', msg: 'Not a legal move right now.', soft: true }); // a malformed square never reaches the rules
    if (m.t === 'seat' && room && !room.lobby && !room.pass && !room.ai && room.g) {
      const g = room.g, fresh = room.team ? g.phase === 'setup' && !g.eggs.length : g.phase === 'setupEggs' && !g.eggs.length;
      const to = m.role; const SE = room.hunt ? SEATSH : room.team ? Object.keys(room.players) : room.three ? SEATS3 : ['blue', 'red'];
      if (!fresh || !SE.includes(to) || room.players[to] || (room.bots || []).includes(to) || !room.players[role] || room.players[role].ws !== ws) return send({ t: 'error', msg: 'That seat is taken.', soft: true });
      room.players[to] = room.players[role]; room.players[role] = null; ws._bo.seat = to;
      send({ t: 'joined', code: room.code, role: clientRole(room, to), token: room.players[to].token, seat: true }); room.touched = Date.now(); return broadcast(room);
    }
    if (b && b.arrival && (m.t === 'act' || m.t === 'seat')) return; // a friend waiting for the next game cannot act in this one
    if (m.t === 'act' && room && !room.lobby) {
      if (m.a === 'leave') {
        const who = room.pass ? active(room.g) : role;
        if (!who || !room.g || room.g.phase === 'over') return send({ t: 'error', msg: 'Not a legal move right now.', soft: true });
        if (leaveGame(room, who)) { room.touched = Date.now(); broadcast(room); }
        return;
      }
      if (m.a === 'rematch' && room.flow) { if (!room.g || room.g.phase !== 'over') return send({ t: 'error', msg: 'Not a legal move right now.', soft: true }); return handleRematch(room, m.how === 'change' ? 'change' : 'same'); }
      const who = room.pass ? (m.a === 'rematch' ? 'blue' : active(room.g)) : role;
      if (act(room, who, m)) { room.touched = Date.now(); broadcast(room); }
      else send({ t: 'error', msg: 'Not a legal move right now.', soft: true });
    }
  };
  // one bad message must never take the server (and every game on it) down
  ws.on('message', async raw => { try { await onMessage(raw); } catch (e) { console.error('message handler error:', e && e.message); send({ t: 'error', msg: 'Not a legal move right now.', soft: true }); } });
  ws.on('close', () => {
    const b = ws._bo; if (!b) return; const room = b.room;
    if (room.lobby) {
      const h = (room.humans || []).find(x => x.id === b.hid);
      if (h && h.ws === ws) h.ws = null;
      if (h && h.host && !(room.humans || []).some(x => x.host && x.ws && x.ws.readyState === 1)) {
        const n = room.humans.find(x => x.ws && x.ws.readyState === 1);
        if (n) { h.host = false; n.host = true; }
      }
      return lobbyBroadcast(room);
    }
    if (b.arrival) {
      const a = (room.arrivals || []).find(x => x.id === b.hid); if (a && a.ws === ws) a.ws = null;
      const w = (room.watchers || []).find(x => x.id === b.hid); if (w && w.ws === ws) w.ws = null;
      if ((room.rejoinAsks || []).some(x => x.hid === b.hid)) { roomDropAsks(room, x => x.hid === b.hid); broadcast(room); }
      return;
    }
    if (room.cardHold && b.seat && room.cardHold[b.seat]) releaseCard(room, b.seat);
    if (room.pass) { for (const s of ['blue', 'red']) if (room.players[s] && room.players[s].ws === ws) room.players[s].ws = null; return; }
    if (b.seat && room.players[b.seat] && room.players[b.seat].ws === ws) { markGone(room, b.seat); broadcast(room); }
  });
});
setInterval(() => { for (const c of wss.clients) { if (!c.isAlive) { c.terminate(); continue; } c.isAlive = false; try { c.ping(); } catch {} } }, 25000).unref();
setInterval(() => { const now = Date.now(); for (const [c, r] of rooms) if (now - r.touched > 6 * 3600e3) rooms.delete(c); }, 600e3).unref();
server.listen(PORT, () => console.log('Battle Ostriches on http://localhost:' + PORT));
// on shutdown (deploys send SIGTERM) save every live room right away
process.on('SIGTERM', async () => { try { await Promise.all([...rooms.values()].map(r => ST.save(r))); ST.flushFile(); } catch {} process.exit(0); });
module.exports = server; server.view = view; server.timersOn = timersOn; server.view3 = view3; server.create3 = create3; server.viewT = viewT; server.createT = createT; server.viewH = viewH; server.createH = createH; server.act3 = act3; server.actT = actT; server.actH = actH; server.rooms = rooms; server.broadcast = broadcast; server.surpriseDone = surpriseDone; server.clockDelayFor = clockDelayFor; server.isBotSeat = isBotSeat; server.scrubSaved = scrubSaved;
