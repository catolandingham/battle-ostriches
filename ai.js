// Server-side computer opponent. Each bot sees ONLY its own side's information (the same view the client gets).
// The vulture bot never reads egg positions: it watches the (visible) ostrich, remembers where it lingers and returns,
// uses its yes/no sniffs, and refills its single stone at the rock piles. Memory lives in `mem` (one per game).
const B = require('./game.js');
const K = B.key, D = B.dist, R = a => a[Math.random() * a.length | 0];
const LVL = { easy: { noise: 1.2, throwBar: 3.5, stay: 1, ret: 0, smellW: .25, rand: .04, sitP: .15, wander: 3.5, relocate: 0, camp: .3 },
  normal: { noise: .3, throwBar: 2.5, stay: 1.5, ret: 0, smellW: .35, sitP: .35, wander: 2.5, relocate: 1, camp: .9 } };
const near = (p, arr) => arr.slice().sort((a, b) => D(a, p) - D(b, p))[0];
const sortBy = (arr, f) => arr.map(x => [x, f(x)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
// --- ostrich: its own eggs, the food, and the (public) vulture position ---
function ostrich(g, lvl = 'normal') {
  const L = LVL[lvl] || LVL.normal, C = g.cfg;
  if (g.phase === 'setupEggs') { for (let i = 0; i < 400; i++) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0];
      if (D(p, C.vultureStart) < 2 || !B.canPlaceEgg(g, p) || g.eggs.some(e => D(e.pos, p) < 2 || D(e.pos, p) > 3)) continue; return { a: 'place', p }; }
    for (;;) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0]; if (B.canPlaceEgg(g, p)) return { a: 'place', p }; } }
  if (g.phase === 'setupOstrich') return { a: 'place', p: g.eggs[0].pos.slice() };
  const o = g.ostrich, v = g.vulture, vd = D(v, o), alive = B.aliveEggs(g);
  const fd = near(o, C.foods), slack = g.hungerLeft - D(fd, o);
  const toward = (t, carry) => { const mv = B.ostrichMoves(g, carry); if (!mv.length) return null;
    return { a: carry ? 'carry' : 'step', p: sortBy(mv, q => D(q, t) + (Math.random() - .5) * .4 - D(q, v) * .05)[0] }; };
  // Plan: food and each egg are deadlines (food: hungerLeft moves; egg: coldIn rounds). Try every visiting order and
  // find the one with the most spare moves; head for its first stop once the spare gets small.
  const goals = [{ p: fd, d: g.hungerLeft, food: 1 }].concat(alive.filter(e => e.pos && K(e.pos) !== K(o)).map(e => ({ p: e.pos, d: B.coldIn(g, e) })));
  let plan = null;
  const perm = (left, at, t, minS, first) => { if (!left.length || t > 14) { if (!plan || minS > plan.s) plan = { s: minS, first }; return; }
    left.forEach((q, i) => { const tt = t + Math.max(1, D(at, q.p)); const extra = q.food ? 0 : 0; perm(left.filter((_, j) => j !== i), q.p, tt, Math.min(minS, q.d - tt + extra), first || q); }); };
  perm(goals, o, 0, 99, null);
  if (slack <= 1) return toward(fd) || { a: 'step', p: R(B.ostrichMoves(g)) };           // starving: eat now
  // relocate: on an egg the vulture found or is sniffing around -> carry it away from the vulture (or sit if it's right on top)
  if (B.onEgg(g) && L.relocate && plan.s > 1) { const here = K(o), sus = g.marks[here] === 'spotted' || (g.sniff && g.sniff.yes && D(g.sniff.p, o) <= 1) || vd <= 3;
    if (vd <= 1 && B.canSit(g) && slack >= 2) return { a: 'sit' };
    if (sus && B.canCarry(g)) { const mv = sortBy(B.ostrichMoves(g, true), q => -D(q, v) + (Math.random() - .5)); if (mv.length && D(mv[0], v) >= 2) return { a: 'carry', p: mv[0] }; } }
  const margin = lvl === 'easy' ? 1 : 2 + (Math.random() * 2 | 0);
  if (B.onEgg(g) && B.canSit(g) && plan.s > margin && slack >= 3 && (vd <= 2 || Math.random() < L.sitP)) return { a: 'sit' }; // guard
  if (plan.first && plan.s <= margin) return toward(plan.first.p) || { a: 'step', p: R(B.ostrichMoves(g)) };
  if (slack <= C.food / 2 && vd >= 4) return toward(fd) || { a: 'step', p: R(B.ostrichMoves(g)) }; // eat while it's safe
  // decoy: wander away from the vulture, sometimes near (but not on) its eggs
  const mv = B.ostrichMoves(g); if (!mv.length) return B.canSit(g) ? { a: 'sit' } : { a: 'carry', p: B.ostrichMoves(g, true)[0] };
  return { a: 'step', p: sortBy(mv, q => -(D(q, v) * .6 + Math.random() * L.wander - (alive.some(e => e.pos && D(e.pos, q) <= 1) ? .6 : 0)))[0] };
}
// --- vulture: takes the red client view (ostrich, vulture, marks, last sniff, stones, rocks, fly, throw) - no egg data ---
function observe(v, mem) {
  if (mem.round === v.round) return; mem.round = v.round;
  mem.heat = mem.heat || {}; mem.stay = mem.stay || {}; mem.ret = mem.ret || {}; mem.seen = mem.seen || {}; mem.miss = mem.miss || {}; mem.smells = mem.smells || [];
  const k = K(v.ostrich); for (const x in mem.heat) mem.heat[x] *= .85; mem.heat[k] = (mem.heat[k] || 0) + 1;
  if (mem.last === k) mem.stay[k] = (mem.stay[k] || 0) + 1;
  if (mem.seen[k] && v.round - mem.seen[k] >= 4) mem.ret[k] = (mem.ret[k] || 0) + 1;
  mem.prevO = mem.last; mem.prevStay = mem.last && mem.last !== k ? (mem.stay[mem.last] || 0) : 0;
  mem.seen[k] = v.round; mem.last = k;
  const la = v.lastAction;
  if (v.sniff) { mem.smells.push([v.sniff.p.slice(), v.sniff.yes]); if (mem.smells.length > 4) mem.smells.shift(); }
  if (mem.lastThrow && v.marks[K(mem.lastThrow)] !== 'hit') { const t = K(mem.lastThrow); mem.miss[t] = 1; delete mem.stay[t]; delete mem.ret[t]; mem.heat[t] = 0; }
}
function vulture(v, lvl = 'normal', mem = {}) {
  const L = LVL[lvl] || LVL.normal, C = v.cfg, me = v.vulture, sq = [];
  observe(v, mem);
  for (let x = 0; x < C.cols; x++) for (let y = 0; y < C.rows; y++) sq.push([x, y]);
  const score = p => { const k = K(p); let s = (mem.heat[k] || 0) + (mem.stay[k] || 0) * L.stay + (mem.ret[k] || 0) * L.ret;
    const m = v.marks[k]; if (m === 'spotted') s += 20; if (m === 'hit' || m === 'stone') s -= 50; if (mem.miss[k]) s -= 6;
    if (C.foods.some(f => K(f) === k) || C.rocks.some(r => K(r) === k)) s -= 30; // eggs are never on food or rocks
    const no = mem.smells.some(([q, y]) => !y && D(q, p) <= C.smellRange), yes = mem.smells.filter(([q, y]) => y && D(q, p) <= C.smellRange).length;
    if (no) s *= .2; s += yes * L.smellW;
    return s + Math.random() * L.noise; };
  const fly = t => ({ a: 'fly', p: sortBy(v.fly, q => D(q, t) + (Math.random() - .5) * .5)[0] });
  if (L.rand && Math.random() < L.rand) return { a: 'fly', p: R(v.fly) };                 // easy: often just drifts
  if (v.stones < 1) { const r = near(me, C.rocks); return fly(r); }                        // out of stones: refill
  // camping: the ostrich just stepped off a square it sat on while we hovered next to it -> stone that square now
  const CAMP = L.camp && process.env.BO_NOCAMP !== '1';
  if (CAMP && mem.prevO && mem.prevStay >= 1 && mem.prevO !== K(v.ostrich)) { const t = v.throw.find(q => K(q) === mem.prevO);
    if (t && Math.random() < L.camp) { mem.lastThrow = t; return { a: 'throw', p: t }; } }
  // camping: the ostrich is sitting; hover in a square next to it (throw range covers its square when it leaves)
  if (CAMP && mem.stay[K(v.ostrich)] >= 1 && D(me, v.ostrich) <= 2 && Math.random() < L.camp) { const h = v.fly.filter(q => D(q, v.ostrich) === 1);
    if (h.length) return { a: 'fly', p: R(h) }; }
  const th = v.throw.filter(p => K(p) !== K(v.ostrich)).map(p => [p, score(p)]).sort((a, b) => b[1] - a[1])[0];
  if (th && th[1] >= L.throwBar) { mem.lastThrow = th[0]; return { a: 'throw', p: th[0] }; }
  mem.lastThrow = null;
  // best guess: where the ostrich keeps coming back. If that's under the ostrich, hover next to it and wait for it to leave.
  const best = sq.map(p => [p, score(p) + sq.filter(q => D(p, q) <= 1).reduce((a, q) => a + Math.max(0, score(q)) * .3, 0)]).sort((a, b) => b[1] - a[1])[0][0];
  if (D(best, v.ostrich) <= 1) { const h = v.fly.filter(q => D(q, best) <= 1 && D(q, v.ostrich) >= 1); if (h.length) return { a: 'fly', p: R(h) }; }
  return fly(best);
}
// The public picture both players share (no egg positions): used for the vulture's view and its bot.
function redView(g) {
  const la = g.lastAction;
  return { cfg: g.cfg, round: g.round, phase: g.phase, turn: g.turn, vulture: g.vulture, ostrich: g.ostrich, marks: g.phase === 'over' ? g.marks : B.visible(g).marks,
    lastAction: la ? (la.type === 'fly' ? { type: 'fly', from: la.from, spotted: la.spotted || null, smell: la.smell, refill: !!la.refill }
      : la.type === 'throw' ? { type: 'throw', from: la.from, p: la.p, result: la.result, egg: !!la.egg } : { type: la.type, ate: !!la.ate }) : null,
    sniff: g.sniff, stones: g.stones, hungerLeft: g.hungerLeft, sitRun: g.sitRun, carrying: g.carrying !== null,
    fly: B.flyTargets(g), throw: B.throwTargets(g) };
}
// --- 3-player hunter (hyena / honey badger), ported from the sim3 prototype. Sees ONLY its hunter view: its own square,
// its yes/no sense (a bird within 2, no direction), its legal moves, the public marks and catch/knock-out counts. Keeps a belief
// grid of where a bird might be: diffuses each turn (birds move), sharpens on each sense, and favours squares near new stones.
function hunter(v, mem = {}) {
  const C = v.cfg, h = v.hunter, sq = [];
  for (let x = 0; x < C.cols; x++) for (let y = 0; y < C.rows; y++) sq.push([x, y]);
  if (!mem.bel || mem.reset) { mem.bel = {}; sq.forEach(p => mem.bel[K(p)] = mem.lastCatch ? (D(p, mem.lastCatch) <= 2 ? 6 : .5) : 1); mem.reset = false; mem.lastCatch = null; }
  if (mem.turnKey !== v.round + ':' + v.senseSeq) { mem.turnKey = v.round + ':' + v.senseSeq;
    if (!v.pounce) { const nb = {}; sq.forEach(p => { let s = 0, c = 0; sq.forEach(q => { if (D(p, q) <= 1) { s += mem.bel[K(q)]; c++; } }); nb[K(p)] = .5 * mem.bel[K(p)] + .5 * s / c + .02; }); mem.bel = nb; }
    const mk = Object.values(v.marks).filter(m => m === 'hit' || m === 'stone').length;
    if (mem.markN !== undefined && mk > mem.markN) { const fresh = Object.keys(v.marks).filter(k => !(mem.marks || {})[k]).map(k => k.split(',').map(Number));
      fresh.forEach(f => sq.forEach(p => { if (D(p, f) <= 1) mem.bel[K(p)] *= 2; })); }
    mem.markN = mk; mem.marks = Object.assign({}, v.marks);
    sq.forEach(p => { const inR = D(p, h) <= v.senseRange; mem.bel[K(p)] *= v.sense ? (inR ? 4 : .3) : (inR ? 0 : 1); });
    mem.bel[K(h)] = v.sense ? mem.bel[K(h)] : 0; }
  if (v.kind === 'badger' && !v.pounce) { // burrow when something is near and we're not already hidden; ambush, then pop up
    if (v.dig === 1 && Math.random() < .75) return { a: 'hstay' }; // finish digging in (2 still turns)
    if (v.sense && !v.burrowed && Math.random() < .6) return { a: 'hstay' };
    if (v.burrowed && v.sense && Math.random() < .35) return { a: 'hstay' }; }
  if (!v.hmoves.length) return { a: 'hstay' };
  const val = p => { let s = 0; sq.forEach(q => { if (D(p, q) <= 1) s += mem.bel[K(q)] * (K(p) === K(q) ? 3 : 1); }); return s + Math.random() * .3; };
  const p = sortBy(v.hmoves, q => -val(q))[0]; mem.bel[K(p)] = 0;
  return { a: 'hmove', p };
}
// Bird bots in 3 players: play the normal move, then dodge a hunter they can actually see (within 2, not burrowed).
function dodge(m, at, moves, hv, reach, notice = .85) {
  if (!hv || Math.random() > notice) return m;
  const bad = q => D(q, hv) <= reach;
  const tgt = m.a === 'sit' || m.a === 'throw' ? at : m.p;
  if (!bad(tgt)) return m;
  const alt = moves.filter(x => !bad(x.p)); return alt.length ? R(alt) : m;
}
module.exports = { ostrich, vulture, redView, hunter, dodge };
