// Bots for the 4-player Hunters mode (ostrich + vulture + hyena + honey badger). Each bot sees only what its seat may see.
const B = require('./game.js'), AI = require('./ai.js'), H = require('./hunt.js');
function hunterView(g, h) { const x = g.hunt.hs[h];
  return { cfg: g.cfg, round: g.round, hunter: x.p, kind: h, sense: g.turn === h ? x.sense : null, senseSeq: x.senseSeq, senseRange: H.TH.sense, pounce: x.pounce,
    burrowed: x.burrowed, dig: x.dig, hmoves: H.hunterMoves(g, h), seenBirds: h === 'badger' ? H.ambushSight(g) : [], marks: Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m !== 'spotted')) }; }
// nearest hunter this bird can see, and how far it could reach next turn (hyena: 1 + pounce)
function threat(g, b) { const at = H.pos(g, b);
  const vis = H.HUNTERS.filter(h => H.seen(g, b, h)).sort((x, y) => B.dist(g.hunt.hs[x].p, at) - B.dist(g.hunt.hs[y].p, at))[0];
  return vis ? { hv: g.hunt.hs[vis].p, reach: H.TH.walk + (vis === 'hyena' ? H.TH.pounce : 0) } : { hv: null, reach: H.TH.walk }; }
function move(g, r, mem, level = 'normal') {
  if (H.isH(r)) { const t = g.hunt; if (t.lastCatch && t.lastCatch.by === r && mem.seenCatch !== t.lastCatch.seq) { mem.seenCatch = t.lastCatch.seq; mem.reset = true; mem.lastCatch = t.hs[r].p.slice(); }
    return AI.hunter(hunterView(g, r), mem); }
  if (r === 'blue') {
    if (g.phase !== 'play') { let m = AI.ostrich(g, level); if (g.phase === 'setupOstrich' && H.hunterAt(g, m.p)) m = { a: 'place', p: g.eggs[1].pos.slice() }; return m; }
    const { hv, reach } = threat(g, 'blue'), m = AI.ostrich(g, level);
    const alts = (B.canCarry(g) ? B.ostrichMoves(g, true).map(p => ({ a: 'carry', p })) : []).concat(B.ostrichMoves(g).map(p => ({ a: 'step', p })));
    return AI.ostrichReact(m, { at: g.ostrich, hunger: g.hungerLeft, cfg: g.cfg, legal: alts, hv, reach, kicks: H.kickTargetsH(g), guard: B.onEgg(g) }); }
  const { hv, reach } = threat(g, 'red'), v = AI.redView(g), m = AI.vulture(v, level, mem);
  return AI.dodge(m, g.vulture, v.fly.map(p => ({ a: 'fly', p })), hv, reach);
}
function act(g, r, m) {
  if (r === 'blue' && g.phase === 'setupEggs') return B.placeEgg(g, m.p);
  if (r === 'blue' && g.phase === 'setupOstrich') return H.placeOstrichH(g, m.p);
  if (g.phase !== 'play' || g.turn !== r) return false;
  if (r === 'blue') return m.a === 'sit' || m.a === 'step' || m.a === 'carry' || m.a === 'kick' ? H.ostrichActH(g, m.a, m.p) : false;
  if (r === 'red') return m.a === 'fly' ? H.vultureFlyH(g, m.p) : m.a === 'throw' ? !!H.vultureThrowH(g, m.p) : false;
  return m.a === 'hmove' ? H.hunterMove(g, m.p) : m.a === 'hstay' ? H.hunterStay(g) : m.a === 'hburst' ? H.hunterBurst(g) : false;
}
module.exports = { hunterView, move, act, threat };
