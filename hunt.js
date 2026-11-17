// 4-player "Hunters" mode: ostrich (blue) + vulture (red) + hyena + badger, one seat each. Wraps the 2-player rules in
// game.js without changing them (like three.js). Turn order each round: vulture, ostrich, hyena, badger. 10s shot clock.
// Hyena: Pounce, 2 catches knock a bird out. Badger: Burrow, 2 catches knock a bird out.
// Fearless rivalry: badger moves onto the hyena -> the hyena is knocked back 2; hyena moves onto the badger -> the hyena
// bounces back 2. Nobody is hurt. Hunters win when both birds are out (more knock-outs wins; if even, more catches; if both even, a tie).
const B = require('./game.js'), K = B.key, D = B.dist;
const TH = { sense: 2, see: 2, walk: 2, pounce: 1, knock: 3, rivalKnock: 2, clockMs: 10000, ko: { hyena: 2, badger: 2 }, starts: [[0, 3], [8, 3]] };
const OFF = [-99, -99], BIRDS = ['red', 'blue'], HUNTERS = ['hyena', 'badger'], ORDER = ['red', 'blue', 'hyena', 'badger'], sgn = Math.sign;
function newHunt(cfg = B.CONFIG, starts) {
  const g = B.newGame(cfg), st = starts || (Math.random() < .5 ? TH.starts : TH.starts.slice().reverse());
  const mk = (kind, p) => ({ kind, p: p.slice(), burrowed: false, dig: 0, pounce: false, sense: null, senseSeq: 0, kos: 0, lastKO: -1, catches: 0, last: null });
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
// Hunters win when both birds are out: more knock-outs wins; if equal, more catches; if still equal, a tie (rule 9.2).
function winHunters(g, by, why) {
  const [a, b] = HUNTERS.map(h => g.hunt.hs[h]);
  const w = a.kos !== b.kos ? (a.kos > b.kos ? a : b) : a.catches !== b.catches ? (a.catches > b.catches ? a : b) : null;
  g.phase = 'over'; g.winner = w ? w.kind : 'none'; g.winBy = by; g.hunt.final = true;
  const nm = h => h === 'badger' ? 'badger' : 'hyena';
  g.endWhy = w
    ? (why || 'Both birds are out.') + ` The ${nm(w.kind)} wins with ${w.kos > (w === a ? b : a).kos ? 'more knock-outs' : 'more catches'}.`
    : (by === 'last' ? why : 'Both birds are out.') + ' The hunters tie: you have the same number of knock-outs, and the same number of catches.'; // "last": the vulture is out and the eggs went cold (rule clash R4)
}
// Endings (rules 9). A side is out when all its birds are knocked out or it can no longer meet its goal; the hunters are never out.
function settle(g) {
  const t = g.hunt; if (t.final && g.phase === 'over') return true;
  const timeUp = g.phase === 'over' && g.winBy === 'survived', eggs = B.aliveEggs(g).length, vIn = !isOut(g, 'red'), oIn = !isOut(g, 'blue') && eggs > 0;
  if (BIRDS.every(b => isOut(g, b))) { winHunters(g, 'ko', BIRDS.every(b => t.birds[b].why === 'caught') ? 'The hunters knocked out both birds.' : 'Both birds are out.'); return true; }
  let w = null, by = null, why = null;
  if (eggs === 0 && vIn) { w = 'red'; by = g.winBy === 'cold' ? 'cold' : 'smashed'; why = g.winBy === 'cold' ? 'The last egg went cold, so the vulture wins.' : 'The vulture smashed every egg.'; }
  else if (timeUp && oIn) { w = 'blue'; by = 'survived'; why = `An egg was still alive after round ${g.cfg.rounds}, so the ostrich wins.`; }
  else if (!vIn && !oIn) { winHunters(g, 'last', 'The vulture is out and the eggs went cold.'); return true; } // the ostrich is still on the board (Brian, 2026-11-15, rule clash R4)
  else if (timeUp) { w = 'none'; by = 'time'; why = 'Time ran out and nobody met their goal.'; }
  if (!w) return false;
  g.phase = 'over'; g.winner = w; g.winBy = by; g.endWhy = why; t.final = true; return true;
}
const finish = settle;
function knockout(g, b, why, h) {
  const t = g.hunt, st = t.birds[b]; st.out = true; st.why = why; st.skip = 0;
  if (h) { t.hs[h].kos++; t.hs[h].lastKO = ++t.koSeq; }
  if (b === 'blue') { if (g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = g.ostrich.slice(); } g.ostrich = OFF.slice(); }
  else g.vulture = OFF.slice();
  settle(g);
}
// squares an animal that is up occupies (a push stops before these): the birds in the game, and a hunter that is not buried
const upAt = (g, p, except) => (birdAt(g, p) && birdAt(g, p) !== except) || HUNTERS.some(h => h !== except && !g.hunt.hs[h].burrowed && K(g.hunt.hs[h].p) === K(p));
function catchBird(g, b, h, back) {
  const t = g.hunt, st = t.birds[b], at = pos(g, b).slice(); st.catches++; t.hs[h].catches++;
  if (b === 'blue' && g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = at.slice(); }
  if (st.catches >= TH.ko[h]) { t.lastCatch = { bird: b, by: h, at, to: null, ko: true, seq: ++t.seq, round: g.round }; knockout(g, b, 'caught', h); return; }
  const q = B.relocateCaught(g.cfg, at, m => !B.wrecked(g, m) && !upAt(g, m, b) && !(K(t.hs[h].p) === K(m)), TH.knock);
  if (b === 'blue') g.sitting = false;
  if (q) { if (b === 'blue') g.ostrich = q; else g.vulture = q; } else if (back) back();
  for (const o of HUNTERS) if (t.hs[o].burrowed && K(t.hs[o].p) === K(at) && o !== h) { t.hs[o].burrowed = false; t.hs[o].dig = 0; } // a bird landed on the buried badger
  t.lastCatch = { bird: b, by: h, at, to: (q || pos(g, b)).slice(), ko: false, seq: ++t.seq, round: g.round };
}
// --- turns ---
function ostrichStay(g) {
  g.sitRun = 0; g.sitting = false; g.lastAction = { type: 'stay' };
  if (B.isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; return; }
  B.endRound(g);
}
function afterOstrich(g) {
  if (g.phase === 'over' && g.winBy === 'starved' && !g.hunt.final) { g.phase = 'play'; g.winner = g.winBy = null; knockout(g, 'blue', 'starved'); if (g.phase === 'over') return; B.endRound(g); }
  // Round 30: the eggs survived the ostrich's turn, but both hunters still take their last move before anyone wins (Brian, 2026-11-15).
  if (g.phase === 'over' && g.winBy === 'survived' && !g.hunt.final) { g.phase = 'play'; g.winner = g.winBy = null; g.hunt.lastRound = true; }
  if (finish(g)) return;
  startHunter(g, 'hyena');
}
function startHunter(g, h) { const x = g.hunt.hs[h]; g.turn = h; x.pounce = false; x.sense = senses(g, h); x.senseSeq++; }
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
function endHunter(g, h) { g.hunt.hs[h].pounce = false; if (h === 'hyena') return startHunter(g, 'badger');
  if (g.hunt.lastRound && g.phase === 'play') { g.phase = 'over'; g.winner = 'blue'; g.winBy = 'survived'; finish(g); return; } // both hunters moved in round 30: time is up
  g.turn = 'red'; advance(g); }
// --- actions ---
function placeOstrichH(g, p) { if (p && hunterAt(g, p)) return false; return B.placeOstrich(g, p); }
function vultureFlyH(g, p) {
  const from = g.vulture.slice(); if (!B.vultureFly(g, p)) return false;
  const h = hunterAt(g, p); if (h) { catchBird(g, 'red', h, () => { g.vulture = from.slice(); }); g.hunt.lastCatch.walked = true; } // the vulture flew onto a buried badger (birds may not land on a hunter they can see)
  if (!finish(g)) advance(g); return true;
}
// The stone resolver's view of this mode: any hunter on the square is pushed 2 away from the vulture and a buried badger comes up.
const stoneWH = g => { const t = g.hunt; return { thrower: () => g.vulture.slice(), setThrower: q => { g.vulture = q.slice(); },
  ostrichAt: p => !isOut(g, 'blue') && B.dist(p, g.ostrich) === 0 && g.ostrich[0] >= 0, eggAt: p => B.eggAt(g, p),
  pushAt: (p, dir, n) => { const moved = []; for (const h of HUNTERS) { const x = t.hs[h]; if (K(x.p) !== K(p)) continue; const from = x.p.slice(), wasBur = x.burrowed; x.burrowed = false; x.dig = 0;
      if (wasBur) t.popout = { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round };
      x.p = B.slide(g.cfg, from, dir, n, m => upAt(g, m, h), g.marks); moved.push({ kind: h, from, to: x.p.slice() }); } return moved; },
  open: q => !B.wrecked(g, q) && !upAt(g, q), ostrichPos: () => g.ostrich }; };
function vultureThrowH(g, p) { const r = B.vultureThrow(g, p, stoneWH); if (!r) return false; if (!finish(g)) advance(g); return r; }
// --- Kick (rules in game.js): the ostrich may kick the vulture, the hyena or the badger next to it (never a burrowed badger).
function kickableH(g) {
  const r = [];
  if (isOut(g, 'blue')) return r;
  if (!isOut(g, 'red') && g.vulture[0] >= 0 && D(g.vulture, g.ostrich) === 1) r.push(g.vulture.slice());
  for (const h of HUNTERS) { const x = g.hunt.hs[h]; if (!x.burrowed && D(x.p, g.ostrich) === 1) r.push(x.p.slice()); }
  return r;
}
const kickTargetsH = g => B.canKick(g) ? kickableH(g) : [];
function kickPlansH(g) {
  if (!B.canKick(g)) return [];
  return kickableH(g).map(at => {
    const h = hunterAt(g, at), n = h === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
    const path = B.slideN(g.cfg, at, B.awayFrom(g.ostrich, at), n, m => upAt(g, m, h || 'red'), g.marks, true);
    const who = h || 'vulture';
    return { at: at.slice(), to: path.to.slice(), points: path.points, who, key: h || 'red' };
  });
}
function ostrichKickH(g, p) {
  if (!kickTargetsH(g).some(q => K(q) === K(p))) return false;
  const h = hunterAt(g, p), from = p.slice(), n = h === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
  const kr = B.slideN(g.cfg, from, B.awayFrom(g.ostrich, from), n, m => upAt(g, m, h || 'red'), g.marks, true), to = kr.to; // wraps at the edge; stops before a wrecked square or an animal that is up
  if (h) g.hunt.hs[h].p = to; else g.vulture = to;
  B.kickDone(g, h || 'vulture', from, to, kr.moved);
  afterOstrich(g); return true;
}
function ostrichActH(g, a, p) {
  if (a === 'kick') return g.phase === 'play' && g.turn === 'blue' && ostrichKickH(g, p);
  const from = g.ostrich.slice(); const ok = a === 'sit' ? B.ostrichSit(g) : B.ostrichStep(g, p, a === 'carry'); if (!ok) return false;
  const h = a !== 'sit' && !(g.phase === 'over' && g.winBy === 'starved') && hunterAt(g, g.ostrich);
  if (h) { catchBird(g, 'blue', h, () => { g.ostrich = from.slice(); }); g.hunt.lastCatch.walked = true; } // the ostrich stepped onto a buried badger
  afterOstrich(g); return true;
}
const hunterRange = (g, h = g.turn) => g.hunt.hs[h] && g.hunt.hs[h].pounce ? TH.pounce : TH.walk;
function hunterMoves(g, h = g.turn) {
  if (g.phase !== 'play' || g.turn !== h || !isH(h)) return [];
  const at = g.hunt.hs[h].p, r = [], n = hunterRange(g, h);
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], at); if (d >= 1 && d <= n && !B.wrecked(g, [x, y])) r.push([x, y]); }
  return r;
}
// the direction of a move for a push (rule 5.1): the sign of each part, or only the longer part when the move is not straight
function moveDir(from, to) { const dx = to[0] - from[0], dy = to[1] - from[1];
  if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return Math.abs(dx) > Math.abs(dy) ? [sgn(dx), 0] : [0, sgn(dy)]; return [sgn(dx), sgn(dy)]; }
function hunterMove(g, p) {
  const h = g.turn; if (!hunterMoves(g, h).some(q => K(q) === K(p))) return false;
  const t = g.hunt, x = t.hs[h], o = h === 'hyena' ? 'badger' : 'hyena', y = t.hs[o], from = x.p.slice(), dir = moveDir(from, p), wasP = x.pounce, wasBur = x.burrowed;
  x.burrowed = false; x.dig = 0; t.popout = null; if (h === 'hyena') x.came = { to: p.slice(), dir };
  if (K(y.p) === K(p) && !(y.burrowed && h === 'hyena')) { // the hunters meet (rule 8): the mover pushes the other 2 squares; nobody is hurt. A hyena that walks onto a buried badger just shares the square.
    const wasBurO = y.burrowed; y.burrowed = false; y.dig = 0; x.p = p.slice();
    const to = B.slide(g.cfg, p, dir, TH.rivalKnock, m => upAt(g, m, o) || K(m) === K(p), g.marks);
    if (K(to) === K(p)) { x.p = from.slice(); t.rival = { by: h, at: p.slice(), to: p.slice(), n: 0, seq: ++t.seq, round: g.round }; } // it could not move: the mover goes back
    else { y.p = to; t.rival = { by: h, at: p.slice(), to: to.slice(), n: D(to, p), seq: ++t.seq, round: g.round }; }
    x.last = { type: 'rival', from, to: x.p.slice(), pounce: wasP }; if (wasBurO) t.popout = { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round }; endHunter(g, h); return true;
  }
  x.p = p.slice(); let caught = false;
  const b = birdAt(g, p); if (b && g.phase === 'play') { catchBird(g, b, h, () => { x.p = from.slice(); }); caught = true; }
  if (caught && wasBur && t.lastCatch) t.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  t.popout = !caught && wasBur ? { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round } : null; // popped out of the burrow without a catch (shown only to who can see the badger)
  x.last = { type: 'move', from, to: p.slice(), caught, pounce: wasP };
  if (g.phase === 'over') return true;
  if (!caught && !wasP && h === 'hyena' && x.sense) { x.pounce = true; x.firstAt = from.slice(); x.sense = senses(g, h); x.senseSeq++; return true; } // Pounce
  endHunter(g, h); return true;
}
// Burst out (rule 7.4): a buried badger with the hyena standing on its square may, on its turn, come up instead of moving. The hyena is pushed 2 back the
// way it came (the opposite of the move that put it on this square); if that is not known, in a random open direction. Nothing is caught.
const canBurst = g => g.phase === 'play' && g.turn === 'badger' && !g.hunt.hs.badger.pounce && g.hunt.hs.badger.burrowed && K(g.hunt.hs.badger.p) === K(g.hunt.hs.hyena.p);
function hunterBurst(g) {
  if (!canBurst(g)) return false;
  const t = g.hunt, x = t.hs.badger, y = t.hs.hyena, at = x.p.slice(), c = y.came, dir = c && K(c.to) === K(y.p) ? [-c.dir[0], -c.dir[1]] : null;
  const to = dir ? B.slide(g.cfg, at, dir, TH.rivalKnock, m => upAt(g, m, 'hyena'), g.marks)
    : B.scrambleTo(g.cfg, at, m => !B.wrecked(g, m) && !upAt(g, m, 'hyena'), TH.rivalKnock) || at.slice();
  const n = D(to, at); y.p = to.slice(); y.came = null; x.burrowed = false; x.dig = 0; t.popout = null;
  t.burst = { seq: t.burstSeq = (t.burstSeq || 0) + 1, round: g.round, n, at, to: to.slice() }; x.last = { type: 'burst', at };
  endHunter(g, 'badger'); return true;
}
function hunterStay(g, timedOut) { // timedOut: the shot clock ran out, so a badger that is not yet buried just loses its turn (Brian, 2026-11-15)
  const h = g.turn; if (g.phase !== 'play' || !isH(h)) return false;
  g.hunt.popout = null; const x = g.hunt.hs[h];
  if (!x.pounce && h === 'badger' && !(timedOut && !x.burrowed)) { // one still turn always burrows, on any square
    if (!x.burrowed) { const t = g.hunt; t.dug = { seq: t.digSeq = (t.digSeq || 0) + 1, round: g.round }; t.mound = { at: x.p.slice(), seenBy: BIRDS.filter(b => seen(g, b, 'badger')) }; } // the birds that could see it dig see the spot
    x.dig = 2; x.burrowed = true; }
  x.last = { type: x.pounce ? 'skip' : 'stay' }; endHunter(g, h); return true;
}
function timeout(g) {
  if (g.phase !== 'play') return false;
  if (isH(g.turn)) return hunterStay(g, true);
  if (g.turn === 'red') { g.sniff = null; g.lastAction = { type: 'pass', timeout: true }; g.turn = 'blue'; B.dropCarried(g); advance(g); return true; }
  const e = g.carrying === null && g.ostrich && g.ostrich[0] >= 0 ? B.eggAt(g, g.ostrich) : null; if (e) e.lastWarm = g.round; // time ran out on an egg: it is still warmed (Brian, 2026-11-15)
  ostrichStay(g); if (g.lastAction) g.lastAction.timeout = true; afterOstrich(g); return true;
}
function statusH(g) { const t = g.hunt;
  return { hunt: true, ko: TH.ko, birds: JSON.parse(JSON.stringify(t.birds)), order: ORDER, hkos: { hyena: t.hs.hyena.kos, badger: t.hs.badger.kos }, hcatches: { hyena: t.hs.hyena.catches, badger: t.hs.badger.catches } }; } // catches are announced to every seat, so the counts are public
module.exports = { TH, OFF, BIRDS, HUNTERS, ORDER, isH, newHunt, senses, seen, ambushSight, hunterMoves, hunterMove, hunterStay, hunterBurst, canBurst, hunterRange, moveDir, upAt, placeOstrichH, vultureFlyH,
  vultureThrowH, ostrichActH, finish, kickableH, kickTargetsH, kickPlansH, ostrichKickH, timeout, statusH, isOut, pos, advance, catchBird, knockout, hunterAt };
