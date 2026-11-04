// 3-player bot-vs-bot sim on the real rules (three.js) and real bots (ai.js). Each bot gets only its own side's view.
// Usage: node sim3.js [games] [hyena|badger]
const B = require('./game.js'), AI = require('./ai.js'), T = require('./three.js');
function hview(g) { const t = g.three; return { cfg: g.cfg, round: g.round, marks: B.visible(g).marks, hunter: t.h, kind: t.kind, sense: t.sense, senseSeq: t.senseSeq,
  senseRange: T.T3.sense, pounce: t.pounce, burrowed: t.burrowed, dig: t.dig || 0, hmoves: T.hunterMoves(g) }; }
function play(kind, opt = {}) {
  const g = T.newGame3(kind), mem = { red: {}, hunter: {} }; let k = 0, seen = 0;
  while (g.phase !== 'play') { const m = AI.ostrich(g); g.phase === 'setupEggs' ? B.placeEgg(g, m.p) : (T.placeOstrich3(g, m.p) || T.placeOstrich3(g, g.eggs[1].pos)); }
  while (g.phase === 'play' && k++ < 400) {
    const r = g.turn, hv = T.hunterSeenBy(g, r) ? g.three.h : null, reach = T.hunterRange(g) + (kind === 'hyena' ? 1 : 0);
    if (opt.timeout && Math.random() < opt.timeout) { T.timeout(g); continue; }
    let ok;
    if (r === 'hunter') { if (g.three.lastCatch && seen !== g.three.lastCatch.seq) { seen = g.three.lastCatch.seq; mem.hunter.reset = true; mem.hunter.lastCatch = g.three.h.slice(); }
      const m = AI.hunter(hview(g), mem.hunter); ok = m.a === 'hmove' ? T.hunterMove(g, m.p) : T.hunterStay(g); }
    else if (r === 'red') { const v = AI.redView(g), m = AI.dodge(AI.vulture(v, 'normal', mem.red), g.vulture, v.fly.map(p => ({ a: 'fly', p })), hv, reach);
      ok = m.a === 'fly' ? T.vultureFly3(g, m.p) : T.vultureThrow3(g, m.p); }
    else { let m = AI.ostrich(g); const fd = Math.min(...g.cfg.foods.map(f => B.dist(f, g.ostrich)));
      if (g.hungerLeft - fd > 1) m = AI.dodge(m, g.ostrich, (B.canCarry(g) ? B.ostrichMoves(g, true).map(p => ({ a: 'carry', p })) : []).concat(B.ostrichMoves(g).map(p => ({ a: 'step', p }))), hv, reach);
      ok = T.ostrichAct3(g, m.a, m.p); }
    if (!ok) throw new Error('illegal ' + r);
  }
  return g;
}
module.exports = play;
if (require.main === module) {
  const n = +process.argv[2] || 1000, kinds = process.argv[3] ? [process.argv[3]] : ['hyena', 'badger'];
  for (const kind of kinds) { const w = {}; let c = 0, rd = 0;
    for (let i = 0; i < n; i++) { const g = play(kind); w[g.winner] = (w[g.winner] || 0) + 1; c += g.three.birds.red.catches + g.three.birds.blue.catches; rd += g.round; }
    console.log(kind.padEnd(7), Object.entries(w).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join('  '), '| catches/game', (c / n).toFixed(2), 'rounds', (rd / n).toFixed(1)); }
}
