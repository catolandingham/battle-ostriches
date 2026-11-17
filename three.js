// 3-player mode: ostrich (blue) + vulture (red) + a hunter (hyena or badger). Wraps the 2-player rules in game.js
// without changing them. Turn order each round: vulture, ostrich, hunter. All tuning lives in T3.
const B = require('./game.js'), K = B.key, D = B.dist;
const T3 = { sense: 2, see: 2, walk: 2, pounce: 1, knock: 3, clockMs: 10000, ko: { hyena: 2, badger: 2 }, double: 2, starts: [[0, 3], [8, 3]] };
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
const koAt = g => T3.ko[g.three.kind || 'hyena'];
// yes/no: is any bird (still in the game) within 2 squares of the hunter? No direction.
const senses = g => BIRDS.some(b => !isOut(g, b) && pos(g, b) && D(pos(g, b), g.three.h) <= T3.sense);
// ambush sight: a burrowed badger sees the exact square of any living bird next to it (1 square). Nobody else learns anything.
const ambushSight = g => { const t = g.three; if (t.kind !== 'badger' || !t.burrowed) return [];
  return BIRDS.filter(b => !isOut(g, b) && pos(g, b) && pos(g, b)[0] >= 0 && D(pos(g, b), t.h) === 1).map(b => ({ seat: b, type: b === 'blue' ? 'o' : 'v', p: pos(g, b).slice() })); };
// a bird sees the hunter only within 2 squares of itself, and never a burrowed badger
const hunterSeenBy = (g, b) => !!(BIRDS.includes(b) && !isOut(g, b) && pos(g, b) && !g.three.burrowed && D(pos(g, b), g.three.h) <= T3.see);
const hunterName = g => (g.three.kind === 'badger' ? 'badger' : 'hyena');
// Endings (rules 9). Called when the classic rules ended the game (smashed, cold, survived) or after a knock-out. Returns true when the game is over.
// A side is out when all its birds are knocked out or it can no longer meet its goal; a side that meets its goal wins; the last side in wins; time with no goal met is a draw.
function settle(g) {
  const t = g.three; if (t.final && g.phase === 'over') return true;
  const timeUp = g.phase === 'over' && g.winBy === 'survived', eggs = B.aliveEggs(g).length, vIn = !isOut(g, 'red'), oIn = !isOut(g, 'blue') && eggs > 0;
  const HG = B.HUNTER_GOAL('3', g.cfg), nm = hunterName(g), total = BIRDS.reduce((n, b) => n + t.birds[b].catches, 0);
  const all = BIRDS.every(b => isOut(g, b)), first = HG.kind === 'first' && BIRDS.some(b => t.birds[b].why === 'caught'), many = HG.kind === 'catches' && total >= HG.n;
  let w = null, by = null, why = null;
  if (all || first || many) { w = 'hunter'; by = 'ko'; why = all ? `The ${nm} knocked out both birds.` : first ? `The ${nm} knocked out a bird.` : `The ${nm} made ${HG.n} catches.`; }
  else if (eggs === 0 && vIn) { w = 'red'; by = g.winBy === 'cold' ? 'cold' : 'smashed'; why = g.winBy === 'cold' ? 'The last egg went cold, so the vulture wins.' : 'The vulture smashed every egg.'; }
  else if (timeUp && oIn) { w = 'blue'; by = 'survived'; why = `An egg was still alive after round ${g.cfg.rounds}, so the ostrich wins.`; }
  else if (!vIn && !oIn) { w = 'hunter'; by = 'last'; why = `The vulture is out and the eggs went cold, so the ${nm} wins.`; } // the ostrich is still on the board; only its eggs are gone (Brian, 2026-11-15, rule clash R4)
  else if (timeUp) { w = 'none'; by = 'time'; why = 'Time ran out and nobody met their goal.'; }
  if (!w) return false;
  g.phase = 'over'; g.winner = w; g.winBy = by; g.endWhy = why; t.final = true; return true;
}
const finish = settle;
function knockout(g, b, why) {
  const t = g.three, st = t.birds[b]; st.out = true; st.why = why; st.skip = 0;
  if (b === 'blue') { if (g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = g.ostrich.slice(); } g.ostrich = OFF.slice(); }
  else g.vulture = OFF.slice();
  settle(g);
}
// A caught bird lands on a random open square exactly T3.knock (3) king-moves away. No missed turn. If it cannot move at all, whoever moved this turn goes back (back()).
function catchBird(g, b, back) {
  const t = g.three, st = t.birds[b], at = pos(g, b).slice();
  st.catches++;
  if (b === 'blue' && g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e.alive) e.pos = at.slice(); } // the egg drops where it was caught
  if (st.catches >= koAt(g)) { t.lastCatch = { bird: b, at, to: null, ko: true, seq: ++t.seq, round: g.round }; knockout(g, b, 'caught'); return; }
  const other = BIRDS.find(x => x !== b);
  const q = B.relocateCaught(g.cfg, at, m => !B.wrecked(g, m) && !(liveAt(g, other) && K(pos(g, other)) === K(m)) && !(K(t.h) === K(m) && !(t.kind === 'badger' && t.burrowed)), T3.knock);
  if (b === 'blue') g.sitting = false;
  if (q) { if (b === 'blue') { g.ostrich = q; } else g.vulture = q; } else if (back) back();
  if (t.burrowed && K(t.h) === K(at)) { t.burrowed = false; t.dig = 0; }
  t.lastCatch = { bird: b, at, to: (q || pos(g, b)).slice(), ko: false, seq: ++t.seq, round: g.round };
}
// --- whose turn: skip birds that are out or knocked back (they lose their next turn) ---
function ostrichStay(g) { // shot clock ran out or turn lost: the ostrich stays put (no sit, no warmth), still gets hungry
  g.sitRun = 0; g.sitting = false; g.lastAction = { type: 'stay' };
  if (B.isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.phase = 'over'; g.winner = 'red'; g.winBy = 'starved'; return; }
  B.endRound(g);
}
function afterOstrich(g) {
  if (g.phase === 'over' && g.winBy === 'starved' && !g.three.final) { g.phase = 'play'; g.winner = g.winBy = null; knockout(g, 'blue', 'starved'); if (g.phase === 'over') return; B.endRound(g); }
  // Round 30: the eggs survived the ostrich's turn, but the hunter still takes its last move before anyone wins (Brian, 2026-11-15).
  if (g.phase === 'over' && g.winBy === 'survived' && !g.three.final) { g.phase = 'play'; g.winner = g.winBy = null; g.three.lastRound = true; }
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
function firstCaughtKo(g) { return BIRDS.some(b => g.three.birds[b].why === 'caught'); }
// After the first credited catch knock-out, the hunter always takes 2 full turns in a row (fresh sense, pounce reset, new shot clock). Pounce is offered only on the first of those two turns.
function startHunter(g) { const t = g.three; t.pounce = false; t.first = null; t.sense = senses(g); t.senseSeq++; t.senseAt = t.h.slice(); }
function endHunter(g) {
  const t = g.three; t.pounce = false;
  if (g.phase === 'play' && firstCaughtKo(g) && !t.extra) { t.extra = true; startHunter(g); return; }
  t.extra = false;
  if (t.lastRound && g.phase === 'play') { g.phase = 'over'; g.winner = 'blue'; g.winBy = 'survived'; finish(g); return; } // the hunter's last move is done: time is up
  g.turn = 'red'; advance(g);
}
// --- actions ---
function placeOstrich3(g, p) { if (p && K(p) === K(g.three.h)) return false; return B.placeOstrich(g, p); }
function vultureFly3(g, p) {
  const from = g.vulture.slice(), snap = B.eggSnap(g, p); if (!B.vultureFly(g, p)) return false;
  // Landing effect (the break) is already done. A catch only follows if the game is still going. A move that is taken back puts the egg back.
  if (g.phase !== 'over' && K(p) === K(g.three.h)) { catchBird(g, 'red', () => { g.vulture = from.slice(); B.undoBreak(g, p, snap); }); g.three.lastCatch.walked = true; } // the vulture flew onto the buried badger (birds may not land on a hunter they can see)
  if (!finish(g)) advance(g); return true;
}
// The stone resolver's view of this mode: the hunter is pushed 2 away from the vulture and a buried badger comes up.
const stoneW3 = g => { const t = g.three; return { thrower: () => g.vulture.slice(), setThrower: q => { g.vulture = q.slice(); },
  ostrichAt: p => liveAt(g, 'blue') && K(p) === K(g.ostrich), eggAt: p => B.eggAt(g, p),
  pushAt: (p, dir, n) => { if (K(t.h) !== K(p)) return []; const from = t.h.slice(), wasBur = t.burrowed; t.burrowed = false; t.dig = 0; if (wasBur && t.kind === 'badger') t.popout = { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round };
    t.h = B.slide(g.cfg, from, dir, n, m => (liveAt(g, 'blue') && K(m) === K(g.ostrich)) || (liveAt(g, 'red') && K(m) === K(g.vulture)), g.marks); return [{ kind: t.kind || 'hyena', from, to: t.h.slice() }]; },
  open: q => !B.wrecked(g, q) && !(liveAt(g, 'blue') && K(q) === K(g.ostrich)) && !(K(q) === K(t.h) && !(t.kind === 'badger' && t.burrowed)), ostrichPos: () => g.ostrich }; };
function vultureThrow3(g, p) { const r = B.vultureThrow(g, p, stoneW3); if (!r) return false; if (!finish(g)) advance(g); return r; }
// --- Kick (rules in game.js): the ostrich may kick the vulture or the hunter next to it. A burrowed badger can't be seen, so it can't be kicked.
const liveAt = (g, b) => !isOut(g, b) && pos(g, b) && pos(g, b)[0] >= 0;
function kickable3(g) {
  const t = g.three, r = [];
  if (!liveAt(g, 'blue')) return r;
  if (liveAt(g, 'red') && D(g.vulture, g.ostrich) === 1) r.push(g.vulture.slice());
  if (!(t.kind === 'badger' && t.burrowed) && D(t.h, g.ostrich) === 1) r.push(t.h.slice());
  return r;
}
const kickTargets3 = g => B.canKick(g) ? kickable3(g) : [];
function kickPlans3(g) {
  if (!B.canKick(g)) return [];
  const t = g.three;
  return kickable3(g).map(at => {
    const hunter = K(at) === K(t.h), n = hunter && t.kind === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
    const blocked = m => hunter ? liveAt(g, 'red') && K(m) === K(g.vulture) : (K(m) === K(t.h) && !(t.kind === 'badger' && t.burrowed));
    const path = B.slideN(g.cfg, at, B.awayFrom(g.ostrich, at), n, blocked, g.marks, true);
    const who = hunter ? (t.kind || 'hyena') : 'vulture';
    return { at: at.slice(), to: path.to.slice(), points: path.points, who, key: hunter ? who : 'red' };
  });
}
function ostrichKick3(g, p) {
  if (!kickTargets3(g).some(q => K(q) === K(p))) return false;
  const t = g.three, hunter = K(p) === K(t.h), from = p.slice(), n = hunter && t.kind === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
  // a pushed animal stops before a wrecked square or an animal that is up; at the board edge it wraps around
  const kr = B.slideN(g.cfg, from, B.awayFrom(g.ostrich, p), n, m => hunter ? liveAt(g, 'red') && K(m) === K(g.vulture) : (K(m) === K(t.h) && !(t.kind === 'badger' && t.burrowed)), g.marks, true), to = kr.to;
  if (hunter) t.h = to; else g.vulture = to;
  B.kickDone(g, hunter ? (t.kind || 'hyena') : 'vulture', from, to, kr.moved);
  afterOstrich(g); return true;
}
function ostrichAct3(g, a, p) {
  if (a === 'kick') return g.phase === 'play' && g.turn === 'blue' && ostrichKick3(g, p);
  const from = g.ostrich.slice(); let ok;
  if (a === 'sit') ok = B.ostrichSit(g); else ok = B.ostrichStep(g, p, a === 'carry');
  if (!ok) return false;
  if (!(g.phase === 'over' && g.winBy === 'starved') && a !== 'sit' && K(g.ostrich) === K(g.three.h)) { catchBird(g, 'blue', () => { g.ostrich = from.slice(); }); g.three.lastCatch.walked = true; } // the ostrich stepped onto the buried badger
  afterOstrich(g); return true;
}
// Hunters walk T3.walk squares; the Pounce extra step is T3.pounce. They may pass over anything and land anywhere that is not wrecked.
function hunterRange(g) { return g.three.pounce ? T3.pounce : T3.walk; }
// the farthest this hunter can reach on any turn (what a bird has to stay out of)
// One turn, or both turns after the first catch knock-out (the birds do not move between them). Pounce is only on the first of those two.
const hunterReach = g => {
  const one = T3.walk + (g.three.kind === 'hyena' ? T3.pounce : 0);
  return firstCaughtKo(g) ? one + T3.walk : one;
};
function hunterMoves(g) {
  if (g.phase !== 'play' || g.turn !== 'hunter') return [];
  const h = g.three.h, n = hunterRange(g), r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], h); if (d >= 1 && d <= n && !B.wrecked(g, [x, y])) r.push([x, y]); }
  return r;
}
function hunterMove(g, p) {
  if (!hunterMoves(g).some(q => K(q) === K(p))) return false;
  const t = g.three, from = t.h.slice(), wasP = t.pounce, wasBur = t.burrowed; t.h = p.slice(); t.burrowed = false; t.dig = 0;
  let caught = false;
  for (const b of BIRDS) if (g.phase === 'play' && !isOut(g, b) && K(pos(g, b)) === K(p)) { catchBird(g, b, () => { t.h = from.slice(); }); caught = true; }
  if (caught && wasBur && t.lastCatch) t.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  t.popout = !caught && wasBur ? { seq: t.popSeq = (t.popSeq || 0) + 1, round: g.round } : null; // popped out of the burrow without a catch (shown only to who can see the badger)
  t.lastHunter = { type: 'move', from, to: p.slice(), caught, pounce: wasP };
  if (g.phase === 'over') return true;
  // Pounce (rule 7.3): a hyena that sensed a bird at the start of its turn and did not catch senses again from its new square and may take one more step only if a bird is still in range
  const nowSense = senses(g);
  if (!caught && !wasP && !t.extra && t.kind === 'hyena' && t.sense && nowSense) { t.pounce = true; t.first = t.sense; t.firstAt = from.slice(); t.sense = nowSense; t.senseSeq++; t.senseAt = t.h.slice(); return true; }
  endHunter(g); return true;
}
function hunterStay(g, timedOut) { // timedOut: the shot clock ran out, so a badger that is not yet buried just loses its turn (Brian, 2026-11-15) // badger: staying still burrows it (invisible to birds). During a pounce: skip the extra move.
  if (g.phase !== 'play' || g.turn !== 'hunter') return false;
  const t = g.three; t.popout = null;
  if (!t.pounce && t.kind === 'badger' && !(timedOut && !t.burrowed)) { // one still turn always burrows, on any square
    if (!t.burrowed) { t.dug = { seq: t.digSeq = (t.digSeq || 0) + 1, round: g.round }; t.mound = { at: t.h.slice(), seenBy: BIRDS.filter(b => hunterSeenBy(g, b)) }; } // the birds that could see it dig see the spot
    t.dig = 2; t.burrowed = true; }
  t.lastHunter = { type: t.pounce ? 'skip' : 'stay' }; endHunter(g); return true;
}
// shot clock ran out: the current player's turn ends (vulture passes, ostrich stays put, hunter stays put)
function timeout(g) {
  if (g.phase !== 'play') return false;
  if (g.turn === 'hunter') return hunterStay(g, true);
  if (g.turn === 'red') { g.sniff = null; g.lastAction = { type: 'pass', timeout: true }; g.turn = 'blue'; B.dropCarried(g); advance(g); return true; }
  const e = g.carrying === null && g.ostrich && g.ostrich[0] >= 0 ? B.eggAt(g, g.ostrich) : null; if (e) e.lastWarm = g.round; // time ran out on an egg: it is still warmed (Brian, 2026-11-15)
  ostrichStay(g); if (g.lastAction) g.lastAction.timeout = true; afterOstrich(g); return true;
}
// Public 3-player status every seat may see (no positions).
function status3(g) { const t = g.three;
  return { kind: t.kind, ko: koAt(g), birds: JSON.parse(JSON.stringify(t.birds)), order: ['red', 'blue', 'hunter'], extra: !!t.extra }; }
module.exports = { T3, OFF, NAME, newGame3, senses, hunterSeenBy, ambushSight, hunterMoves, hunterMove, hunterStay, hunterRange, hunterReach, kickable3, kickTargets3, kickPlans3, ostrichKick3, placeOstrich3, vultureFly3, vultureThrow3,
  ostrichAct3, finish, timeout, status3, isOut, pos, advance, catchBird, knockout };
