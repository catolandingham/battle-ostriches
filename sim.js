// Bot-vs-bot balance sim using the real rules in game.js. Usage: node sim.js [games] [key=value overrides...]
const B = require('./game.js');
const K = B.key, D = B.dist, R = (a) => a[Math.random() * a.length | 0];
function ostrichBot(g) {
  const C = g.cfg, alive = B.aliveEggs(g), v = g.vulture, here = B.eggAt(g, g.ostrich);
  const threat = (p) => D(p, v) <= C.vultureFly + C.throwRange;
  if (here && B.onEgg(g)) {
    const spotted = g.marks[K(g.ostrich)] === 'spotted';
    const others = alive.filter(o => o !== here && o.pos);
    const urgent = others.some(o => B.coldIn(g, o) - D(o.pos, g.ostrich) <= 1);
    if ((spotted || (B.mustLeave(g) && threat(g.ostrich))) && B.canCarry(g) && !urgent) {
      const mv = B.ostrichMoves(g, true).sort((a, b) => D(b, v) - D(a, v)); if (mv.length && Math.random() < .8) return B.ostrichStep(g, mv[0], true); }
    if (!urgent && B.canSit(g) && D(v, g.ostrich) <= 2) return B.ostrichSit(g); // guard
    if (!urgent && B.canSit(g) && Math.random() < .35) return B.ostrichSit(g);
  }
  // go to egg with least slack, avoid the vulture a bit
  const tgt = alive.filter(e => e.pos && K(e.pos) !== K(g.ostrich)).sort((a, b) => (B.coldIn(g, a) - D(a.pos, g.ostrich) * .5) - (B.coldIn(g, b) - D(b.pos, g.ostrich) * .5))[0];
  const mv = B.ostrichMoves(g);
  if (tgt) { mv.sort((a, b) => D(a, tgt.pos) - D(b, tgt.pos) + (Math.random() - .5) * .9 - (D(a, v) - D(b, v)) * .2); return B.ostrichStep(g, mv[0]); }
  return B.ostrichStep(g, R(mv));
}
function vultureBot(g, mem) {
  const C = g.cfg, v = g.vulture, sq = [];
  for (let x = 0; x < C.cols; x++) for (let y = 0; y < C.rows; y++) sq.push([x, y]);
  const sm = Object.entries(g.smells).map(([k, y]) => [k.split(',').map(Number), y]);
  const score = (p) => { const k = K(p); let s = (g.prints[k] || 0) * 1.0;
    if (g.marks[k] === 'spotted') s += 20; if (g.marks[k] === 'miss') s -= 3; if (g.marks[k] === 'hit') s -= 50; if (g.marks[k] === 'feather') s += FEA;
    const no = sm.some(([q, y]) => !y && D(q, p) <= C.smellRange), yes = sm.filter(([q, y]) => y && D(q, p) <= C.smellRange).length;
    if (no) s *= NO; s += yes * YES;
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
  while (g.eggs.length < cfg.eggs) { const p = [Math.random() * cfg.cols | 0, Math.random() * cfg.rows | 0];
    if (D(p, cfg.vultureStart) < 2) continue; if (g.eggs.some(e => D(e.pos, p) < 2 || D(e.pos, p) > SPREAD)) continue; B.placeEgg(g, p); }
  B.placeOstrich(g, g.eggs[0].pos);
  const mem = { throwBar: BAR }; let guard = 0;
  while (g.phase === 'play' && guard++ < 500) { if (g.turn === 'red') vultureBot(g, mem); else ostrichBot(g); }
  return { w: g.winner, r: g.round, eggs: B.aliveEggs(g).length, hits: Object.values(g.marks).filter(m => m === 'hit').length };
}
const n = +process.argv[2] || 2000, over = {};
let SPREAD = 3, BAR = 2, FEA = 8, YES = 0.3, NO = 0.2;
for (const a of process.argv.slice(3)) { const [k, v] = a.split('='); if (k === 'spread') SPREAD = +v; else if (k === 'bar') BAR = +v; else if (k === 'fea') FEA = +v; else if (k === 'yes') YES = +v; else if (k === 'no') NO = +v; else over[k] = +v; }
const cfg = { ...B.CONFIG, ...over }; let red = 0, rs = 0, close = 0, hits = 0, r25 = 0;
for (let i = 0; i < n; i++) { const o = play(cfg); if (o.w === 'red') { red++; if (o.r >= 25) close++; } else if (o.eggs === 1) close++; rs += o.r; hits += o.hits; if (o.r >= 25) r25++; }
console.log(JSON.stringify(over), `vulture ${(100 * red / n).toFixed(1)}%  avg rounds ${(rs / n).toFixed(1)}  ≥25 rounds ${(100 * r25 / n).toFixed(0)}%  close ${(100 * close / n).toFixed(1)}%  smashed/game ${(hits / n).toFixed(2)}`);
