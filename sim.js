// Bot-vs-bot balance sim using the real rules (game.js) and the real bots (ai.js); the vulture bot only gets the public view.
// Usage: node sim.js [games] [level=normal|easy] [key=value CONFIG overrides...]
const B = require('./game.js'), AI = require('./ai.js');
const n = +process.argv[2] || 2000, over = {}; let lvl = 'normal', olvl = 'normal';
for (const a of process.argv.slice(3)) { const [k, v] = a.split('='); if (k === 'level') lvl = v; else if (k === 'olevel') olvl = v; else over[k] = +v; }
const cfg = { ...B.CONFIG, ...over };
function play() {
  const g = B.newGame(cfg), mem = {}; let k = 0;
  while (g.phase !== 'over' && k++ < 600) {
    const r = g.phase === 'play' ? g.turn : 'blue';
    const m = r === 'blue' ? AI.ostrich(g, olvl) : AI.vulture(AI.redView(g), lvl, mem);
    const ok = r === 'blue' ? (g.phase === 'setupEggs' ? B.placeEgg(g, m.p) : g.phase === 'setupOstrich' ? B.placeOstrich(g, m.p) : m.a === 'sit' ? B.ostrichSit(g) : B.ostrichStep(g, m.p, m.a === 'carry'))
      : m.a === 'fly' ? B.vultureFly(g, m.p) : !!B.vultureThrow(g, m.p);
    if (!ok) throw new Error('illegal ' + r + ' ' + JSON.stringify(m));
  }
  return g;
}
let red = 0, rs = 0; const by = {};
for (let i = 0; i < n; i++) { const g = play(); if (g.winner === 'red') red++; rs += g.round; by[g.winBy] = (by[g.winBy] || 0) + 1; }
console.log(lvl, JSON.stringify(over), `vulture ${(100 * red / n).toFixed(1)}%  avg rounds ${(rs / n).toFixed(1)}  ` + Object.entries(by).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join(' '));
