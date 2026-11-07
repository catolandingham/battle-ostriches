// 4-player (2v2) and 5-player (2v2 + hunter) modes. Two ostriches (o1, o2), each with its own 2-egg nest, against two
// vultures (v1, v2); in 5 players a hunter (hyena / honey badger) moves last. Turn order: V1, O1, V2, O2 (, hunter).
// Reuses the 2-player CONFIG and the 3-player hunter rules (sense, pounce, burrow, catches, knock-back, boost).
const B = require('./game.js'), K = B.key, D = B.dist;
const TM = { eggs: 2, vStarts: [[4, 2], [4, 4]], sense: 2, see: 2, knock: 2, clockMs: 10000, ko: { hyena: 2, badger: 2 }, boost: 2, hStarts: [[0, 3], [8, 3]] };
const OFF = [-99, -99], OS = ['o1', 'o2'], VS = ['v1', 'v2'], sgn = Math.sign;
const isO = s => s === 'o1' || s === 'o2', isV = s => s === 'v1' || s === 'v2';
const mate = s => ({ o1: 'o2', o2: 'o1', v1: 'v2', v2: 'v1' })[s];
function newTeam(n, kind, cfg = B.CONFIG, hstart) {
  const g = { team: true, n: n === 5 ? 5 : 4, cfg: { ...cfg, eggs: TM.eggs }, phase: 'setup', round: 1, turn: null, eggs: [], marks: {}, winner: null, winBy: null,
    order: n === 5 ? ['v1', 'o1', 'v2', 'o2', 'hunter'] : ['v1', 'o1', 'v2', 'o2'], b: {}, sniffs: {}, lastAction: null, lastCold: [], seq: 0, lastCatch: null, lost: null,
    h: n === 5 ? { kind: kind === 'badger' || kind === 'hyena' ? kind : null, p: (hstart || TM.hStarts[Math.random() * 2 | 0]).slice(), burrowed: false, dig: 0, pounce: false,
      sense: null, senseSeq: 0, kos: { o: 0, v: 0 }, last: null } : null };
  VS.forEach((s, i) => g.b[s] = { pos: TM.vStarts[i].slice(), stones: cfg.stones, out: false, why: null, catches: 0, skip: 0 });
  OS.forEach((s, i) => g.b[s] = { pos: null, nest: i, hunger: cfg.food, sitRun: 0, carrying: null, out: false, why: null, catches: 0, skip: 0 });
  return g;
}
const inB = (g, p) => p && p[0] >= 0 && p[1] >= 0 && p[0] < g.cfg.cols && p[1] < g.cfg.rows;
const alive = g => g.eggs.filter(e => e.alive);
const eggAt = (g, p) => g.eggs.find(e => e.alive && e.pos && K(e.pos) === K(p));
const live = (g, s) => g.b[s] && !g.b[s].out && g.b[s].pos && g.b[s].pos[0] >= 0;
const birdsIn = g => OS.concat(VS).filter(s => live(g, s));
const myTurn = (g, s) => g.phase === 'play' && g.turn === s;
const eggPos = (g, e) => e.pos || OS.map(s => g.b[s]).find(b => b.carrying === e.id)?.pos || null;
// --- setup: each ostrich hides its own 2 eggs, then places itself ---
const nestOf = (g, s) => g.eggs.filter(e => e.nest === g.b[s].nest);
function canPlaceEgg(g, s, p) {
  return g.phase === 'setup' && isO(s) && nestOf(g, s).length < TM.eggs && inB(g, p) && !eggAt(g, p) && !TM.vStarts.some(v => K(v) === K(p))
    && !B.isRock(g, p) && !g.cfg.foods.some(f => D(f, p) <= 1) && !(g.h && K(g.h.p) === K(p));
}
function place(g, s, p) {
  if (!isO(s) || g.phase !== 'setup') return false;
  const b = g.b[s];
  if (nestOf(g, s).length < TM.eggs) { if (!canPlaceEgg(g, s, p)) return false; g.eggs.push({ id: g.eggs.length, nest: b.nest, pos: p.slice(), alive: true, lastWarm: 0 }); return true; }
  if (b.pos || !inB(g, p) || (g.h && K(g.h.p) === K(p)) || OS.some(o => g.b[o].pos && K(g.b[o].pos) === K(p)) || TM.vStarts.some(v => K(v) === K(p))) return false;
  b.pos = p.slice();
  if (OS.every(o => g.b[o].pos)) { g.phase = 'play'; g.turn = 'v1'; }
  return true;
}
const setupStep = (g, s) => g.phase !== 'setup' || !isO(s) ? null : nestOf(g, s).length < TM.eggs ? 'eggs' : !g.b[s].pos ? 'ostrich' : 'done';
// --- ostriches ---
const onEgg = (g, s) => live(g, s) && g.b[s].carrying === null && !!eggAt(g, g.b[s].pos);
const canSit = (g, s) => myTurn(g, s) && onEgg(g, s) && g.b[s].sitRun < g.cfg.maxSit;
const canCarry = (g, s) => myTurn(g, s) && onEgg(g, s);
const mustLeave = (g, s) => myTurn(g, s) && onEgg(g, s) && g.b[s].sitRun >= g.cfg.maxSit;
function ostrichMoves(g, s, carry = false) {
  if (!myTurn(g, s) || !isO(s) || (carry && !canCarry(g, s))) return [];
  const o = g.b[s].pos, m = g.b[mate(s)], r = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const p = [o[0] + dx, o[1] + dy];
    if (!inB(g, p) || g.marks[K(p)] === 'hit' || (!m.out && m.pos && K(m.pos) === K(p))) continue;
    if (carry && (eggAt(g, p) || B.isFood(g, p) || B.isRock(g, p) || g.marks[K(p)] === 'stone')) continue; r.push(p); }
  return r;
}
function feed(g, s) { // after an ostrich's move or stay: food resets hunger, else it gets hungrier and may starve (out; its partner plays on)
  const b = g.b[s];
  if (B.isFood(g, b.pos)) { b.hunger = g.cfg.food; if (g.lastAction) g.lastAction.ate = true; return; }
  if (--b.hunger <= 0) knockout(g, s, 'starved');
}
function ostrichAct(g, s, a, p) {
  const b = g.b[s]; if (!myTurn(g, s) || !isO(s)) return false;
  const from = b.pos.slice();
  if (a === 'sit') { if (!canSit(g, s)) return false; b.sitRun++; }
  else { const carry = a === 'carry'; if (!ostrichMoves(g, s, carry).some(q => K(q) === K(p))) return false;
    if (carry) { const e = eggAt(g, b.pos); e.pos = null; b.carrying = e.id; if (g.marks[K(b.pos)] === 'spotted') delete g.marks[K(b.pos)]; }
    b.pos = p.slice(); b.sitRun = 0; }
  g.lastAction = { seat: s, type: a === 'sit' ? 'sit' : a === 'carry' ? 'carry' : 'step' };
  const e = b.carrying !== null ? g.eggs[b.carrying] : eggAt(g, b.pos); if (e) e.lastWarm = g.round; // either ostrich may warm any egg
  feed(g, s);
  if (!b.out && a !== 'sit' && g.h && K(b.pos) === K(g.h.p)) { catchBird(g, s, [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.lastCatch.walked = true; } // the ostrich stepped onto the hunter
  next(g); return true;
}
function ostrichStay(g, s, why) { const b = g.b[s]; b.sitRun = 0; g.lastAction = { seat: s, type: 'stay', [why]: true }; feed(g, s); }
// --- vultures (they share what they sniff) ---
function dropAll(g) { for (const s of OS) { const b = g.b[s]; if (b.carrying === null) continue; const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = b.pos.slice(); } }
function flyTargets(g, s) {
  if (!myTurn(g, s) || !isV(s)) return [];
  const v = g.b[s].pos, m = g.b[mate(s)], r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], v);
    if (d >= 1 && d <= g.cfg.vultureFly && !(!m.out && K(m.pos) === K([x, y]))) r.push([x, y]); }
  return r;
}
function throwTargets(g, s) {
  if (!myTurn(g, s) || !isV(s) || g.b[s].stones < 1) return [];
  const v = g.b[s].pos, r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const k = x + ',' + y;
    if (D([x, y], v) <= g.cfg.throwRange && g.marks[k] !== 'hit' && g.marks[k] !== 'stone') r.push([x, y]); }
  return r;
}
const smells = (g, p) => alive(g).some(e => { const q = eggPos(g, e); return q && D(q, p) <= g.cfg.smellRange; });
function clearOut(g) { for (const s of OS.concat(VS)) { const b = g.b[s]; if (!b.out || !b.pos || b.pos[0] < 0) continue;
  if (isO(s) && b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e && e.alive) e.pos = b.pos.slice(); } b.pos = OFF.slice(); } }
function vultureFly(g, s, p) { clearOut(g);
  if (!flyTargets(g, s).some(q => K(q) === K(p))) return false;
  const b = g.b[s], from = b.pos.slice(); b.pos = p.slice();
  g.lastAction = { seat: s, type: 'fly', from };
  const e = eggAt(g, p);
  if (e && !OS.some(o => live(g, o) && K(g.b[o].pos) === K(p))) { g.marks[K(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  if (B.isRock(g, p)) { g.lastAction.refill = b.stones < g.cfg.stones; b.stones = g.cfg.stones; }
  g.lastAction.smell = smells(g, p); g.sniffs[s] = { p: p.slice(), yes: g.lastAction.smell, round: g.round };
  dropAll(g);
  if (g.h && K(p) === K(g.h.p)) { catchBird(g, s, [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.lastCatch.walked = true; } // the vulture flew onto the hunter
  next(g); return true;
}
function vultureThrow(g, s, p) { clearOut(g);
  if (!throwTargets(g, s).some(q => K(q) === K(p))) return false;
  const b = g.b[s]; b.stones--; g.sniffs[s] = null;
  const e = eggAt(g, p), guard = OS.find(o => live(g, o) && K(g.b[o].pos) === K(p)); let result;
  if (guard) result = 'bounce'; else if (e) { e.alive = false; result = 'hit'; g.marks[K(p)] = 'hit'; } else { result = 'miss'; g.marks[K(p)] = 'stone'; }
  g.lastAction = { seat: s, type: 'throw', from: b.pos.slice(), p: p.slice(), result };
  if (guard) g.lastAction.egg = !!(e || g.b[guard].carrying !== null);
  dropAll(g); next(g); return result;
}
// --- hunter (5 players) ---
const koAt = g => TM.ko[(g.h && g.h.kind) || 'hyena'];
const kos = g => g.h ? g.h.kos.o + g.h.kos.v : 0;
const senses = g => birdsIn(g).some(s => D(g.b[s].pos, g.h.p) <= TM.sense);
// ambush sight: a burrowed badger sees the exact square of any living bird next to it (1 square). Nobody else learns anything.
const ambushSight = g => !g.h || g.h.kind !== 'badger' || !g.h.burrowed ? [] : birdsIn(g).filter(s => D(g.b[s].pos, g.h.p) === 1).map(s => ({ seat: s, type: isO(s) ? 'o' : 'v', p: g.b[s].pos.slice() }));
const hunterSeenBy = (g, s) => !!(g.h && (isO(s) || isV(s)) && live(g, s) && !g.h.burrowed && D(g.b[s].pos, g.h.p) <= TM.see);
const hunterRange = g => !g.h ? 0 : g.h.pounce ? 1 : kos(g) ? TM.boost : 1;
function hunterMoves(g) {
  if (!myTurn(g, 'hunter')) return [];
  const h = g.h.p, n = hunterRange(g), r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], h); if (d >= 1 && d <= n) r.push([x, y]); }
  return r;
}
function startHunter(g) { const h = g.h; h.pounce = false; h.sense = senses(g); h.senseSeq++; }
function hunterMove(g, p) {
  if (!hunterMoves(g).some(q => K(q) === K(p))) return false;
  const h = g.h, from = h.p.slice(), wasP = h.pounce, wasBur = h.burrowed; h.p = p.slice(); h.burrowed = false; h.dig = 0; let caught = false;
  for (const s of birdsIn(g)) if (g.phase === 'play' && K(g.b[s].pos) === K(p)) { catchBird(g, s, [sgn(p[0] - from[0]), sgn(p[1] - from[1])]); caught = true; }
  if (caught && wasBur && g.lastCatch) g.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  g.popout = !caught && wasBur ? { seq: ++g.seq, round: g.round } : null; // popped out of the burrow without a catch (shown only to who can see the badger)
  h.last = { type: 'move', from, to: p.slice(), caught, pounce: wasP };
  if (g.phase === 'over') return true;
  if (!caught && !wasP && h.kind === 'hyena' && h.sense) { h.pounce = true; h.sense = senses(g); h.senseSeq++; return true; } // Pounce
  h.pounce = false; next(g); return true;
}
function hunterStay(g) {
  if (!myTurn(g, 'hunter')) return false;
  g.popout = null; const h = g.h; if (!h.pounce && h.kind === 'badger') { h.dig = 2; h.burrowed = true; } // one still turn always burrows
  h.last = { type: h.pounce ? 'skip' : 'stay' }; h.pounce = false; next(g); return true;
}
// --- catches, knock-outs, game end ---
function knockout(g, s, why) {
  const b = g.b[s]; b.out = true; b.why = why; b.skip = 0;
  if (b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = b.pos.slice(); }
  b.pos = OFF.slice();
  if (why === 'caught' && g.h) g.h.kos[isO(s) ? 'o' : 'v']++;
  checkEnd(g);
}
function catchBird(g, s, dir) {
  const b = g.b[s], at = b.pos.slice(); b.catches++;
  if (b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = at.slice(); } // a carried egg drops where it was caught
  if (b.catches >= koAt(g)) { g.lastCatch = { bird: s, at, to: null, ko: true, seq: ++g.seq, round: g.round }; knockout(g, s, 'caught'); return; }
  b.skip = 1; let [dx, dy] = dir; if (!dx && !dy) { dx = at[0] < g.cfg.cols / 2 ? -1 : 1; dy = at[1] < g.cfg.rows / 2 ? -1 : 1; }
  let q = at.slice();
  for (let i = 0; i < TM.knock; i++) { const n = [q[0] + dx, q[1] + dy];
    if (!inB(g, n) || K(n) === K(g.h.p) || (isO(s) && g.marks[K(n)] === 'hit') || birdsIn(g).some(o => o !== s && K(g.b[o].pos) === K(n))) break; q = n; }
  b.pos = q; if (isO(s)) b.sitRun = 0;
  g.lastCatch = { bird: s, at, to: q.slice(), ko: false, seq: ++g.seq, round: g.round };
}
function end(g, w, by) { if (g.phase === 'over') return; g.phase = 'over'; g.winner = w; g.winBy = by; }
function checkEnd(g) {
  if (g.phase === 'over') return true;
  const vIn = VS.some(s => !g.b[s].out), oIn = OS.some(s => !g.b[s].out), hWin = g.h && g.h.kos.o >= 1 && g.h.kos.v >= 1;
  if (hWin) end(g, 'hunter', 'ko');
  else if (!alive(g).length) vIn ? end(g, 'red', g.lastAction && g.lastAction.type === 'throw' ? 'smashed' : 'cold') : end(g, 'none', 'eggs-lost');
  else if (!oIn) vIn ? end(g, 'red', 'ostriches-out') : end(g, 'none', 'all-out');
  return g.phase === 'over';
}
function endRound(g) {
  g.lastCold = [];
  for (const e of alive(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id); const c = OS.find(s => g.b[s].carrying === e.id); if (c) g.b[c].carrying = null;
    if (e.pos && g.marks[K(e.pos)] === 'spotted') delete g.marks[K(e.pos)]; }
  if (checkEnd(g)) return;
  if (g.round >= g.cfg.rounds) return end(g, 'blue', 'survived');
  g.round++;
}
// whose turn: skip seats that are out; a caught bird loses its next turn (an ostrich still gets hungry)
function next(g) {
  if (checkEnd(g)) return;
  let i = g.order.indexOf(g.turn);
  for (let n = 0; n < 20; n++) {
    i++; if (i >= g.order.length) { endRound(g); if (g.phase === 'over') return; i = 0; }
    const s = g.order[i];
    if (s === 'hunter') { g.turn = 'hunter'; startHunter(g); return; }
    const b = g.b[s]; if (b.out) continue;
    if (b.skip) { b.skip--; g.lost = { bird: s, round: g.round };
      if (isO(s)) { ostrichStay(g, s, 'lost'); if (checkEnd(g)) return; } else { g.sniffs[s] = null; dropAll(g); }
      continue; }
    g.turn = s; return;
  }
}
function timeout(g) { // shot clock ran out: vulture passes, ostrich stays put (no warmth, still hungry), hunter stays put
  if (g.phase !== 'play') return false; const s = g.turn;
  if (s === 'hunter') return hunterStay(g);
  if (isV(s)) { g.sniffs[s] = null; g.lastAction = { seat: s, type: 'pass', timeout: true }; dropAll(g); }
  else ostrichStay(g, s, 'timeout');
  next(g); return true;
}
// public status every seat may see: no positions
function status(g) {
  return { n: g.n, order: g.order, kind: g.h ? g.h.kind : null, ko: koAt(g), boost: !!kos(g), hkos: g.h ? { ...g.h.kos } : null,
    birds: Object.fromEntries(OS.concat(VS).map(s => [s, { out: g.b[s].out, why: g.b[s].why, catches: g.b[s].catches, skip: g.b[s].skip }])) };
}
module.exports = { TM, OFF, OS, VS, isO, isV, mate, newTeam, place, canPlaceEgg, setupStep, nestOf, ostrichMoves, ostrichAct, canSit, canCarry, mustLeave, onEgg,
  flyTargets, throwTargets, vultureFly, vultureThrow, hunterMoves, hunterMove, hunterStay, hunterRange, hunterSeenBy, ambushSight, senses, timeout, status, alive, eggAt,
  eggPos, live, catchBird, knockout, next, checkEnd, endRound };
