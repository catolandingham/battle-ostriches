// Bot-vs-bot balance sim using the real rules in game.js. Usage: node sim.js [games] [key=value overrides...]
const B = require('./game.js');
const K = B.key, D = B.dist, R = (a) => a[Math.random() * a.length | 0];
function ostrichBot(g) {
  const C = g.cfg, alive = B.aliveEggs(g), v = g.vulture;
  const vThreat = (p) => D(p, v) <= C.vultureFly + C.throwRange;
  // spotted egg under me or adjacent: carry it away / sit
  if (g.carrying !== null) {
    if (B.canSetDown(g) && !vThreat(g.ostrich)) return B.ostrichSetDown(g);
    const mv = B.ostrichMoves(g).filter(q => B.stoneFree(g, q)).sort((a, b) => D(b, v) - D(a, v));
    return B.ostrichStep(g, (mv[0] || R(B.ostrichMoves(g))));
  }
  if (g.sitEgg !== null) {
    const e = g.eggs[g.sitEgg], spotted = g.marks[K(g.ostrich)] === 'spotted';
    if (spotted && B.canCarryNow(g)) { const mv = B.ostrichMoves(g, true).sort((a, b) => D(b, v) - D(a, v)); if (mv.length) return B.ostrichStep(g, mv[0], true); }
    const others = alive.filter(o => o !== e && o.pos);
    const urgent = others.some(o => B.coldIn(g, o) - D(o.pos, g.ostrich) <= 2);
    if (!urgent && B.canSit(g) && D(v, g.ostrich) <= 2) return B.ostrichSit(g); // guard
    if (!urgent && B.canSit(g) && Math.random() < .3) return B.ostrichSit(g);
  }
  // fake nest sometimes when on empty square away from eggs
  if (B.canScrape(g) && g.round > 2 && Math.random() < .25 && !alive.some(e => e.pos && D(e.pos, g.ostrich) <= 1)) return B.ostrichScrape(g);
  // go to egg with least slack (coldIn - distance), prefer safe
  const tgt = alive.filter(e => e.pos && K(e.pos) !== K(g.ostrich)).sort((a, b) => (B.coldIn(g, a) - D(a.pos, g.ostrich) * .5) - (B.coldIn(g, b) - D(b.pos, g.ostrich) * .5))[0];
  const mv = B.ostrichMoves(g);
  if (tgt) { mv.sort((a, b) => D(a, tgt.pos) - D(b, tgt.pos) + (Math.random() - .5) * .9 - (D(a, v) - D(b, v)) * .2); return B.ostrichStep(g, mv[0]); }
  return B.ostrichStep(g, R(mv));
}
function vultureBot(g, mem) {
  const C = g.cfg, v = g.vulture, sq = [];
  for (let x = 0; x < C.cols; x++) for (let y = 0; y < C.rows; y++) sq.push([x, y]);
  // score squares: footprints, smell, spotted, not known fake/miss recently
  const score = (p) => { const k = K(p); let s = (g.prints[k] || 0) * 1.0;
    if (g.marks[k] === 'spotted') s += 20; if (g.marks[k] === 'fake') s -= 50; if (g.marks[k] === 'miss') s -= 1.5; if (g.marks[k] === 'hit') s -= 50;
    for (const [sk, yes] of Object.entries(g.smells)) { const q = sk.split(',').map(Number); if (D(q, p) <= C.smellRange) s += yes ? 1.5 : -3; }
    return s + Math.random() * .3; };
  const th = B.throwTargets(g).map(p => [p, score(p)]).sort((a, b) => b[1] - a[1])[0];
  if (th && th[1] >= mem.throwBar) return B.vultureThrow(g, th[0]);
  const best = sq.map(p => [p, score(p) + sq.filter(q => D(p, q) <= 1).reduce((a, q) => a + score(q) * .3, 0)]).sort((a, b) => b[1] - a[1])[0][0];
  const fl = B.flyTargets(g).sort((a, b) => D(a, best) - D(b, best) + (Math.random() - .5) * .5);
  if (D(v, best) === 0 && th) return B.vultureThrow(g, th[0]);
  return B.vultureFly(g, fl[0]);
}
function play(cfg) {
  const g = B.newGame(cfg);
  // ostrich spreads eggs: random layout with eggs 2-4 apart, starts on one
  while (g.eggs.length < cfg.eggs) { const p = [Math.random() * cfg.cols | 0, Math.random() * cfg.rows | 0];
    if (D(p, cfg.vultureStart) < 2) continue; if (g.eggs.some(e => D(e.pos, p) < 2 || D(e.pos, p) > SPREAD)) continue; B.placeEgg(g, p); }
  B.placeOstrich(g, g.eggs[0].pos);
  const mem = { throwBar: 3 }; let guard = 0;
  while (g.phase === 'play' && guard++ < 500) { if (g.turn === 'red') vultureBot(g, mem); else ostrichBot(g); }
  return { w: g.winner, r: g.round, eggs: B.aliveEggs(g).length, hits: Object.values(g.marks).filter(m => m === 'hit').length };
}
const n = +process.argv[2] || 2000, over = {};
let SPREAD = 3;
for (const a of process.argv.slice(3)) { const [k, v] = a.split('='); if (k === 'spread') SPREAD = +v; else over[k] = +v; }
const cfg = { ...B.CONFIG, ...over }; let red = 0, rs = 0, close = 0, hits = 0;
for (let i = 0; i < n; i++) { const o = play(cfg); if (o.w === 'red') { red++; if (o.r >= cfg.rounds * .75) close++; } else if (o.eggs === 1) close++; rs += o.r; hits += o.hits; }
console.log(JSON.stringify(over), `vulture ${(100 * red / n).toFixed(1)}%  avg rounds ${(rs / n).toFixed(1)}  close ${(100 * close / n).toFixed(1)}%  eggs smashed/game ${(hits / n).toFixed(2)} (rest lost to cold)`);
