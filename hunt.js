// 4-player "Hunters" mode: ostrich (blue) + vulture (red) + hyena + honey badger, one seat each. Wraps the 2-player rules in
// game.js without changing them (like three.js). Turn order each round: vulture, ostrich, hyena, badger. 10s shot clock.
// Hyena: Pounce, 2 catches knock a bird out. Badger: Burrow, 1 catch knocks a bird out.
// Fearless rivalry: badger moves onto the hyena -> the hyena is knocked back 2; hyena moves onto the badger -> the hyena
// bounces back 2. Nobody is hurt. Hunters win when both birds are out (more KOs wins, a tie goes to the last KO).
const B = require('./game.js'), K = B.key, D = B.dist;
const TH = { sense: 2, see: 2, pounce: 2, knock: 2, rivalKnock: 2, clockMs: 10000, ko: { hyena: 2, badger: 2 }, starts: [[0, 3], [8, 3]] };
const OFF = [-99, -99], BIRDS = ['red', 'blue'], HUNTERS = ['hyena', 'badger'], ORDER = ['red', 'blue', 'hyena', 'badger'], sgn = Math.sign;
function newHunt(cfg = B.CONFIG, starts) {
  const g = B.newGame(cfg), st = starts || (Math.random() < .5 ? TH.starts : TH.starts.slice().reverse());
  const mk = (kind, p) => ({ kind, p: p.slice(), burrowed: false, dig: 0, sense: null, senseSeq: 0, kos: 0, lastKO: -1, last: null });
  g.hunt = { hs: { hyena: mk('hyena', st[0]), badger: mk('badger', st[1]) }, seq: 0, koSeq: 0, lastCatch: null, lost: null, rival: null,
    birds: { red: { out: false, catches: 0, skip: 0, why: null }, blue: { out: false, catches: 0, skip: 0, why: null } } };
  return g;
}
const isH = r => r === 'hyena' || r === 'badger';
const pos = (g, b) => b === 'blue' ? g.ostrich : g.vulture;
const isOut = (g, b) => g.hunt.birds[b].out;
const inB = (g, p) => p[0] >= 0 && p[1] >= 0 && p[0] < g.cfg.cols && p[1] < g.cfg.rows;
const hunterAt = (g, p) => HUNTERS.find(h => K(g.hunt.hs[h].p) === K(p));
const birdAt = (g, p) => BIRDS.find(b => !isOut(g, b) && pos(g, b) && K(pos(g, b)) === K(p));
const senses = (g, h) => BIRDS.some(b => !isOut(g, b) && pos(g, b) && D(pos(g, b), g.hunt.hs[h].p) <= TH.sense);
// ambush sight: a burrowed badger sees the exact square of any living bird next to it (1 square). Nobody else learns anything.
const ambushSight = g => { const x = g.hunt.hs.badger; if (!x.burrowed) return [];
  return BIRDS.filter(b => !isOut(g, b) && pos(g, b) && pos(g, b)[0] >= 0 && D(pos(g, b), x.p) === 1).map(b => ({ seat: b, type: b === 'blue' ? 'o' : 'v', p: pos(g, b).slice() })); };
// who sees a hunter: birds and the other hunter within 2 squares, never a burrowed badger; a hunter always sees itself
function seen(g, who, h) {
  const x = g.hunt.hs[h]; if (who === h) return true; if (x.burrowed) return false;
  const at = isH(who) ? g.hunt.hs[who].p : !isOut(g, who) && pos(g, who); return !!(at && at[0] >= 0 && D(at, x.p) <= TH.see);
}
function winHunters(g, by) {
  const [a, b] = HUNTERS.map(h => g.hunt.hs[h]);
  const w = a.kos === b.kos ? (a.lastKO === b.lastKO ? null : a.lastKO > b.lastKO ? a : b) : a.kos > b.kos ? a : b;
  g.phase = 'over'; g.winner = w ? w.kind : 'none'; g.winBy = by; g.hunt.final = true;
}
function finish(g) { // map a 2-player end into 4-player outcomes
  const t = g.hunt; if (g.phase !== 'over' || t.final) return g.phase === 'over';
  if (g.winBy === 'starved') return false; // handled by afterOstrich
  t.final = true;
  if ((g.winBy === 'smashed' || g.winBy === 'cold') && isOut(g, 'red')) winHunters(g, 'eggs-lost');
  else if (g.winBy === 'survived' && isOut(g, 'blue')) winHunters(g, 'time');
  return true;
}
function knockout(g, b, why, h) {
  const t = g.hunt, st = t.birds[b]; st.out = true; st.why = why; st.skip = 0;
  if (h) { t.hs[h].kos++; t.hs[h].lastKO = ++t.koSeq; }
  if (b === 'blue') { if (g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = g.ostrich.slice(); } g.ostrich = OFF.slice(); }
  else g.vulture = OFF.slice();
  if (BIRDS.every(x => isOut(g, x))) return winHunters(g, 'ko');
  if (b === 'blue' && !B.aliveEggs(g).length) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; t.final = true; }
}
function push(g, from, dir, n, skip) { // slide up to n squares; stops at the edge or any piece
  let q = from.slice();
  for (let i = 0; i < n; i++) { const m = [q[0] + dir[0], q[1] + dir[1]];
    if (!inB(g, m) || (hunterAt(g, m) && hunterAt(g, m) !== skip) || birdAt(g, m) || (skip === 'blue' && g.marks[K(m)] === 'hit')) break; q = m; }
  return q;
}
function catchBird(g, b, h, dir) {
  const t = g.hunt, st = t.birds[b], at = pos(g, b).slice(); st.catches++;
  if (b === 'blue' && g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = at.slice(); }
  if (st.catches >= TH.ko[h]) { t.lastCatch = { bird: b, by: h, at, to: null, ko: true, seq: ++t.seq, round: g.round }; knockout(g, b, 'caught', h); return; }
  st.skip = 1;
  let [dx, dy] = dir; if (!dx && !dy) { dx = at[0] < g.cfg.cols / 2 ? -1 : 1; dy = at[1] < g.cfg.rows / 2 ? -1 : 1; }
  if (b === 'blue') g.ostrich = OFF.slice(); else g.vulture = OFF.slice(); // lift it so it doesn't block itself
  const q = push(g, at, [dx, dy], TH.knock, b);
  if (b === 'blue') { g.ostrich = q; g.sitRun = 0; } else g.vulture = q;
  t.lastCatch = { bird: b, by: h, at, to: q.slice(), ko: false, seq: ++t.seq, round: g.round };
}
// --- turns ---
function ostrichStay(g) {
  g.sitRun = 0; g.lastAction = { type: 'stay' };
  if (B.isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; return; }
  B.endRound(g);
}
function afterOstrich(g) {
  if (g.phase === 'over' && g.winBy === 'starved' && !g.hunt.final) { g.phase = 'play'; g.winner = g.winBy = null; knockout(g, 'blue', 'starved'); if (g.phase === 'over') return; B.endRound(g); }
  if (finish(g)) return;
  startHunter(g, 'hyena');
}
function startHunter(g, h) { const x = g.hunt.hs[h]; g.turn = h; x.sense = senses(g, h); x.senseSeq++; }
function advance(g) {
  for (let i = 0; i < 6 && g.phase === 'play'; i++) {
    if (g.turn === 'red') { const st = g.hunt.birds.red; if (!st.out && !st.skip) return;
      if (st.skip) { st.skip--; g.hunt.lost = { bird: 'red', round: g.round }; }
      g.sniff = null; g.lastAction = { type: 'pass' }; g.turn = 'blue'; B.dropCarried(g); continue; }
    if (g.turn === 'blue') { const st = g.hunt.birds.blue; if (!st.out && !st.skip) return;
      if (st.out) B.endRound(g); else { st.skip--; g.hunt.lost = { bird: 'blue', round: g.round }; ostrichStay(g); }
      afterOstrich(g); continue; }
    return; // hunters never lose a turn
  }
}
function endHunter(g, h) { if (h === 'hyena') return startHunter(g, 'badger'); g.turn = 'red'; advance(g); }
// --- actions ---
function placeOstrichH(g, p) { if (p && hunterAt(g, p)) return false; return B.placeOstrich(g, p); }
function vultureFlyH(g, p) {
  const from = g.vulture.slice(); if (!B.vultureFly(g, p)) return false;
  const h = hunterAt(g, p); if (h) { catchBird(g, 'red', h, [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.hunt.lastCatch.walked = true; } // the vulture flew onto a hunter
  if (!finish(g)) advance(g); return true;
}
function vultureThrowH(g, p) { const r = B.vultureThrow(g, p); if (!r) return false; if (!finish(g)) advance(g); return r; }
function ostrichActH(g, a, p) {
  const from = g.ostrich.slice(); const ok = a === 'sit' ? B.ostrichSit(g) : B.ostrichStep(g, p, a === 'carry'); if (!ok) return false;
  const h = a !== 'sit' && !(g.phase === 'over' && g.winBy === 'starved') && hunterAt(g, g.ostrich);
  if (h) { catchBird(g, 'blue', h, [sgn(from[0] - p[0]), sgn(from[1] - p[1])]); g.hunt.lastCatch.walked = true; } // the ostrich stepped onto a hunter
  afterOstrich(g); return true;
}
// Pounce: a hyena whose sense says a bird is near may move up to TH.pounce squares in one move this turn; otherwise every hunter moves 1.
const hunterRange = (g, h = g.turn) => h === 'hyena' && g.hunt.hs.hyena.sense ? TH.pounce : 1;
const hunterReach = h => h === 'hyena' ? TH.pounce : 1; // the farthest it can reach on any turn
function hunterMoves(g, h = g.turn) {
  if (g.phase !== 'play' || g.turn !== h || !isH(h)) return [];
  const at = g.hunt.hs[h].p, r = [];
  const n = hunterRange(g, h);
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], at); if (d >= 1 && d <= n) r.push([x, y]); }
  return r;
}
function hunterMove(g, p) {
  const h = g.turn; if (!hunterMoves(g, h).some(q => K(q) === K(p))) return false;
  const t = g.hunt, x = t.hs[h], o = h === 'hyena' ? 'badger' : 'hyena', y = t.hs[o], from = x.p.slice(), dir = [sgn(p[0] - from[0]), sgn(p[1] - from[1])], wasBur = x.burrowed;
  x.burrowed = false; x.dig = 0; t.popout = null;
  if (K(y.p) === K(p)) { // fearless rivalry: the hyena always ends up 2 squares away; nobody is hurt
    if (h === 'badger') { y.burrowed = false; y.dig = 0; x.p = p.slice(); y.p = push(g, p, dir, TH.rivalKnock, 'hyena'); t.rival = { by: 'badger', at: p.slice(), to: y.p.slice(), seq: ++t.seq, round: g.round }; }
    else { y.burrowed = false; y.dig = 0; x.p = push(g, p, [-dir[0], -dir[1]], TH.rivalKnock, 'hyena'); t.rival = { by: 'hyena', at: p.slice(), to: x.p.slice(), seq: ++t.seq, round: g.round }; }
    x.last = { type: 'rival', from, to: x.p.slice() }; endHunter(g, h); return true;
  }
  x.p = p.slice(); let caught = false;
  const b = birdAt(g, p); if (b && g.phase === 'play') { catchBird(g, b, h, dir); caught = true; }
  if (caught && wasBur && t.lastCatch) t.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  t.popout = !caught && wasBur ? { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round } : null; // popped out of the burrow without a catch (shown only to who can see the badger)
  x.last = { type: 'move', from, to: p.slice(), caught };
  if (g.phase === 'over') return true;
  endHunter(g, h); return true;
}
function hunterStay(g) {
  const h = g.turn; if (g.phase !== 'play' || !isH(h)) return false;
  g.hunt.popout = null; const x = g.hunt.hs[h]; if (h === 'badger') { x.dig = 2; x.burrowed = true; } // one still turn always burrows
  x.last = { type: 'stay' }; endHunter(g, h); return true;
}
function timeout(g) {
  if (g.phase !== 'play') return false;
  if (isH(g.turn)) return hunterStay(g);
  if (g.turn === 'red') { g.sniff = null; g.lastAction = { type: 'pass', timeout: true }; g.turn = 'blue'; B.dropCarried(g); advance(g); return true; }
  ostrichStay(g); if (g.lastAction) g.lastAction.timeout = true; afterOstrich(g); return true;
}
function statusH(g) { const t = g.hunt;
  return { hunt: true, ko: TH.ko, birds: JSON.parse(JSON.stringify(t.birds)), order: ORDER, hkos: { hyena: t.hs.hyena.kos, badger: t.hs.badger.kos } }; }
module.exports = { TH, OFF, BIRDS, HUNTERS, ORDER, isH, newHunt, senses, seen, ambushSight, hunterMoves, hunterMove, hunterStay, hunterRange, hunterReach, placeOstrichH, vultureFlyH,
  vultureThrowH, ostrichActH, timeout, statusH, isOut, pos, advance, catchBird, knockout, hunterAt };
