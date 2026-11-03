// Server-side computer opponent. Each bot sees ONLY its own side's information (the same view the client gets):
// the vulture bot never reads egg positions; it works from footprints, marks and its smell history.
const B = require('./game.js');
const K = B.key, D = B.dist, R = a => a[Math.random() * a.length | 0];
const LVL = { easy: { noise: 3, throwBar: 8, sitP: .2, fea: 2, yes: 0, no: 1 }, normal: { noise: .3, throwBar: 2, sitP: .35, fea: 8, yes: .3, no: .2 } };
// --- ostrich: its own eggs and the (public) vulture position are fair game ---
function ostrich(g, lvl = 'normal') {
  const L = LVL[lvl] || LVL.normal, C = g.cfg;
  if (g.phase === 'setupEggs') { for (let i = 0; i < 400; i++) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0];
      if (D(p, C.vultureStart) < 2 || g.eggs.some(e => D(e.pos, p) < 2 || D(e.pos, p) > 3)) continue; return { a: 'place', p }; }
    for (;;) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0]; if (!B.eggAt(g, p) && K(p) !== K(g.vulture)) return { a: 'place', p }; } }
  if (g.phase === 'setupOstrich') return { a: 'place', p: g.eggs[0].pos.slice() };
  const alive = B.aliveEggs(g), v = g.vulture, here = B.eggAt(g, g.ostrich), threat = p => D(p, v) <= C.vultureFly + C.throwRange;
  if (here && B.onEgg(g)) {
    const spotted = g.marks[K(g.ostrich)] === 'spotted', others = alive.filter(o => o !== here && o.pos);
    const urgent = others.some(o => B.coldIn(g, o) - D(o.pos, g.ostrich) <= 1);
    if ((spotted || (B.mustLeave(g) && threat(g.ostrich))) && B.canCarry(g) && !urgent) {
      const mv = B.ostrichMoves(g, true).sort((a, b) => D(b, v) - D(a, v)); if (mv.length && Math.random() < .8) return { a: 'carry', p: mv[0] }; }
    if (!urgent && B.canSit(g) && D(v, g.ostrich) <= 2) return { a: 'sit' };
    if (!urgent && B.canSit(g) && Math.random() < L.sitP) return { a: 'sit' };
  }
  const tgt = alive.filter(e => e.pos && K(e.pos) !== K(g.ostrich)).sort((a, b) => (B.coldIn(g, a) - D(a.pos, g.ostrich) * .5) - (B.coldIn(g, b) - D(b.pos, g.ostrich) * .5))[0];
  const mv = B.ostrichMoves(g);
  if (tgt) { mv.sort((a, b) => D(a, tgt.pos) - D(b, tgt.pos) + (Math.random() - .5) * .9 - (D(a, v) - D(b, v)) * .2); return { a: 'step', p: mv[0] }; }
  return { a: 'step', p: R(mv) };
}
// --- vulture: takes the red client view (prints, marks, smells, vulture, fly, throw) — no egg data ---
function vulture(v, lvl = 'normal') {
  const L = LVL[lvl] || LVL.normal, C = v.cfg, me = v.vulture, sq = [];
  for (let x = 0; x < C.cols; x++) for (let y = 0; y < C.rows; y++) sq.push([x, y]);
  const sm = Object.entries(v.smells || {}).map(([k, y]) => [k.split(',').map(Number), y]);
  const score = p => { const k = K(p); let s = (v.prints[k] || 0);
    const m = v.marks[k]; if (m === 'spotted') s += 20; if (m === 'miss') s -= 3; if (m === 'hit') s -= 50; if (m === 'feather') s += L.fea;
    if (sm.some(([q, y]) => !y && D(q, p) <= C.smellRange)) s *= L.no; s += sm.filter(([q, y]) => y && D(q, p) <= C.smellRange).length * L.yes;
    return s + Math.random() * L.noise; };
  const th = v.throw.map(p => [p, score(p)]).sort((a, b) => b[1] - a[1])[0];
  if (th && th[1] >= L.throwBar) return { a: 'throw', p: th[0] };
  const best = sq.map(p => [p, score(p) + sq.filter(q => D(p, q) <= 1).reduce((a, q) => a + score(q) * .3, 0)]).sort((a, b) => b[1] - a[1])[0][0];
  if (D(me, best) === 0 && th) return { a: 'throw', p: th[0] };
  const fl = v.fly.slice().sort((a, b) => D(a, best) - D(b, best) + (Math.random() - .5) * .5);
  return { a: 'fly', p: fl[0] };
}
module.exports = { ostrich, vulture };
