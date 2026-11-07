// 3-player mode: ostrich (blue) + vulture (red) + a hunter (hyena or honey badger). Wraps the 2-player rules in game.js
// without changing them. Turn order each round: vulture, ostrich, hunter. All tuning lives in T3.
const B = require('./game.js'), K = B.key, D = B.dist;
const T3 = { sense: 2, see: 2, knock: 2, clockMs: 10000, ko: { hyena: 2, badger: 2 }, boost: 2, starts: [[0, 3], [8, 3]] };
const OFF = [-99, -99], BIRDS = ['red', 'blue'], NAME = { red: 'vulture', blue: 'ostrich', hunter: 'hunter' };
const sgn = Math.sign;
function newGame3(kind, cfg = B.CONFIG, start) {
  const g = B.newGame(cfg);
  g.three = { kind: kind === 'badger' ? 'badger' : kind === 'hyena' ? 'hyena' : null, h: (start || T3.starts[Math.random() * 2 | 0]).slice(),
    burrowed: false, dig: 0, pounce: false, sense: null, senseSeq: 0, seq: 0, lastCatch: null, lastHunter: null,
    birds: { red: { out: false, catches: 0, skip: 0, why: null }, blue: { out: false, catches: 0, skip: 0, why: null } } };
  return g;
}
const pos = (g, b) => b === 'blue' ? g.ostrich : g.vulture;
const isOut = (g, b) => g.three.birds[b].out;
const anyOut = g => BIRDS.some(b => isOut(g, b));
const koAt = g => T3.ko[g.three.kind || 'hyena'];
// yes/no: is any bird (still in the game) within 2 squares of the hunter? No direction.
const senses = g => BIRDS.some(b => !isOut(g, b) && pos(g, b) && D(pos(g, b), g.three.h) <= T3.sense);
// ambush sight: a burrowed badger sees the exact square of any living bird next to it (1 square). Nobody else learns anything.
const ambushSight = g => { const t = g.three; if (t.kind !== 'badger' || !t.burrowed) return [];
  return BIRDS.filter(b => !isOut(g, b) && pos(g, b) && pos(g, b)[0] >= 0 && D(pos(g, b), t.h) === 1).map(b => ({ seat: b, type: b === 'blue' ? 'o' : 'v', p: pos(g, b).slice() })); };
// a bird sees the hunter only within 2 squares of itself, and never a burrowed badger
const hunterSeenBy = (g, b) => !!(BIRDS.includes(b) && !isOut(g, b) && pos(g, b) && !g.three.burrowed && D(pos(g, b), g.three.h) <= T3.see);
function finish(g) { // map a 2-player game end into 3-player outcomes (a bird left alone still has to meet its own goal)
  const t = g.three; if (g.phase !== 'over' || t.final) return g.phase === 'over';
  t.final = true;
  if (g.winBy === 'smashed' || g.winBy === 'cold') { if (isOut(g, 'red')) { g.winner = 'none'; g.winBy = 'eggs-lost'; } }
  else if (g.winBy === 'survived') { if (isOut(g, 'blue')) { g.winner = 'none'; g.winBy = 'time'; } }
  return true;
}
function knockout(g, b, why) {
  const t = g.three, st = t.birds[b]; st.out = true; st.why = why; st.skip = 0;
  if (b === 'blue') { if (g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = g.ostrich.slice(); } g.ostrich = OFF.slice(); }
  else g.vulture = OFF.slice();
  if (BIRDS.every(x => isOut(g, x))) { g.phase = 'over'; g.winner = 'hunter'; g.winBy = 'ko'; t.final = true; return; }
  if (b === 'blue' && !B.aliveEggs(g).length) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; t.final = true; }
}
function catchBird(g, b, dir) {
  const t = g.three, st = t.birds[b], at = pos(g, b).slice();
  st.catches++;
  if (b === 'blue' && g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = at.slice(); } // the egg drops where it was caught
  if (st.catches >= koAt(g)) { t.lastCatch = { bird: b, at, to: null, ko: true, seq: ++t.seq, round: g.round }; knockout(g, b, 'caught'); return; }
  st.skip = 1;
  let [dx, dy] = dir; if (!dx && !dy) { dx = at[0] < g.cfg.cols / 2 ? -1 : 1; dy = at[1] < g.cfg.rows / 2 ? -1 : 1; }
  let q = at.slice();
  for (let i = 0; i < T3.knock; i++) { const n = [q[0] + dx, q[1] + dy];
    if (n[0] < 0 || n[1] < 0 || n[0] >= g.cfg.cols || n[1] >= g.cfg.rows || K(n) === K(t.h) || (b === 'blue' && g.marks[K(n)] === 'hit')) break; q = n; }
  if (b === 'blue') { g.ostrich = q; g.sitRun = 0; } else g.vulture = q;
  t.lastCatch = { bird: b, at, to: q.slice(), ko: false, seq: ++t.seq, round: g.round };
}
// --- whose turn: skip birds that are out or knocked back (they lose their next turn) ---
function ostrichStay(g) { // shot clock ran out or turn lost: the ostrich stays put (no sit, no warmth), still gets hungry
  g.sitRun = 0; g.lastAction = { type: 'stay' };
  if (B.isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; return; }
  B.endRound(g);
}
function afterOstrich(g) {
  if (g.phase === 'over' && g.winBy === 'starved' && !g.three.final) { g.phase = 'play'; g.winner = g.winBy = null; knockout(g, 'blue', 'starved'); if (g.phase === 'over') return; B.endRound(g); }
  if (finish(g)) return;
  g.turn = 'hunter'; startHunter(g);
}
function advance(g) {
  for (let i = 0; i < 6 && g.phase === 'play'; i++) {
    if (g.turn === 'red') { const st = g.three.birds.red; if (!st.out && !st.skip) return;
      if (st.skip) { st.skip--; g.three.lost = { bird: 'red', round: g.round }; }
      g.sniff = null; g.lastAction = { type: 'pass' }; g.turn = 'blue'; B.dropCarried(g); continue; }
    if (g.turn === 'blue') { const st = g.three.birds.blue; if (!st.out && !st.skip) return;
      if (st.out) { B.endRound(g); } else { st.skip--; g.three.lost = { bird: 'blue', round: g.round }; ostrichStay(g); }
      afterOstrich(g); continue; }
    return; // the hunter never loses a turn
  }
}
function startHunter(g) { const t = g.three; t.pounce = false; t.sense = senses(g); t.senseSeq++; t.senseAt = t.h.slice(); }
function endHunter(g) { const t = g.three; t.pounce = false; g.turn = 'red'; advance(g); }
// --- actions ---
function placeOstrich3(g, p) { if (p && K(p) === K(g.three.h)) return false; return B.placeOstrich(g, p); }
function vultureFly3(g, p) {
  const from = g.vulture.slice(); if (!B.vultureFly(g, p)) return false;
  if (K(p) === K(g.three.h)) { catchBird(g, 'red', [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.three.lastCatch.walked = true; } // the vulture flew onto the hunter
  if (!finish(g)) advance(g); return true;
}
function vultureThrow3(g, p) { const r = B.vultureThrow(g, p); if (!r) return false; if (!finish(g)) advance(g); return r; }
function ostrichAct3(g, a, p) {
  const from = g.ostrich.slice(); let ok;
  if (a === 'sit') ok = B.ostrichSit(g); else ok = B.ostrichStep(g, p, a === 'carry');
  if (!ok) return false;
  if (!(g.phase === 'over' && g.winBy === 'starved') && a !== 'sit' && K(g.ostrich) === K(g.three.h)) { catchBird(g, 'blue', [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.three.lastCatch.walked = true; } // the ostrich stepped onto the hunter
  afterOstrich(g); return true;
}
function hunterRange(g) { return g.three.pounce ? 1 : anyOut(g) ? T3.boost : 1; }
function hunterMoves(g) {
  if (g.phase !== 'play' || g.turn !== 'hunter') return [];
  const h = g.three.h, n = hunterRange(g), r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], h); if (d >= 1 && d <= n) r.push([x, y]); }
  return r;
}
function hunterMove(g, p) {
  if (!hunterMoves(g).some(q => K(q) === K(p))) return false;
  const t = g.three, from = t.h.slice(), wasP = t.pounce, wasBur = t.burrowed; t.h = p.slice(); t.burrowed = false; t.dig = 0;
  let caught = false;
  for (const b of BIRDS) if (g.phase === 'play' && !isOut(g, b) && K(pos(g, b)) === K(p)) { catchBird(g, b, [sgn(p[0] - from[0]), sgn(p[1] - from[1])]); caught = true; }
  if (caught && wasBur && t.lastCatch) t.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  t.lastHunter = { type: 'move', from, to: p.slice(), caught, pounce: wasP };
  if (g.phase === 'over') return true;
  // Hyena Pounce: its sense said a bird is within 2 -> one extra 1-square move this same turn
  if (!caught && !wasP && t.kind === 'hyena' && t.sense) { t.pounce = true; t.sense = senses(g); t.senseSeq++; t.senseAt = t.h.slice(); return true; }
  endHunter(g); return true;
}
function hunterStay(g) { // badger: staying still burrows it (invisible to birds). During a pounce: skip the extra move.
  if (g.phase !== 'play' || g.turn !== 'hunter') return false;
  const t = g.three; if (!t.pounce && t.kind === 'badger') { t.dig = 2; t.burrowed = true; } // one still turn always burrows
  t.lastHunter = { type: t.pounce ? 'skip' : 'stay' }; endHunter(g); return true;
}
// shot clock ran out: the current player's turn ends (vulture passes, ostrich stays put, hunter stays put)
function timeout(g) {
  if (g.phase !== 'play') return false;
  if (g.turn === 'hunter') return hunterStay(g);
  if (g.turn === 'red') { g.sniff = null; g.lastAction = { type: 'pass', timeout: true }; g.turn = 'blue'; B.dropCarried(g); advance(g); return true; }
  ostrichStay(g); if (g.lastAction) g.lastAction.timeout = true; afterOstrich(g); return true;
}
// Public 3-player status every seat may see (no positions).
function status3(g) { const t = g.three;
  return { kind: t.kind, ko: koAt(g), boost: anyOut(g), birds: JSON.parse(JSON.stringify(t.birds)), order: ['red', 'blue', 'hunter'] }; }
module.exports = { T3, OFF, NAME, newGame3, senses, hunterSeenBy, ambushSight, hunterMoves, hunterMove, hunterStay, hunterRange, placeOstrich3, vultureFly3, vultureThrow3,
  ostrichAct3, timeout, status3, anyOut, isOut, pos, advance, catchBird, knockout };
