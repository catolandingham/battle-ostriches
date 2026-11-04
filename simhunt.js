// bot-vs-bot sim for the 4-player Hunters mode. Usage: node simhunt.js [games]
const H = require('./hunt.js'), HA = require('./huntai.js');
function play() {
  const g = H.newHunt(), mem = {}; let bad = 0, riv = 0, rs = 0;
  for (let i = 0; i < 20 && g.phase !== 'play'; i++) if (!HA.act(g, 'blue', HA.move(g, 'blue', {}))) throw new Error('bad setup');
  for (let i = 0; i < 3000 && g.phase === 'play'; i++) { const r = g.turn; if (!HA.act(g, r, HA.move(g, r, mem[r] || (mem[r] = {})))) { bad++; H.timeout(g); }
    if (g.hunt.rival && g.hunt.rival.seq !== rs) { rs = g.hunt.rival.seq; riv++; } }
  if (g.phase !== 'over') throw new Error('did not finish');
  return { w: g.winner, by: g.winBy, bad, riv, r: g.round };
}
module.exports = { play };
if (require.main === module) { const N = +process.argv[2] || 2000, c = {}, by = {}; let bad = 0, riv = 0, r = 0;
  for (let i = 0; i < N; i++) { const x = play(); c[x.w] = (c[x.w] || 0) + 1; by[x.by] = (by[x.by] || 0) + 1; bad += x.bad; riv += x.riv; r += x.r; }
  const P = v => (100 * (v || 0) / N).toFixed(0) + '%';
  console.log(`hunters: ostrich ${P(c.blue)} / vulture ${P(c.red)} / hyena ${P(c.hyena)} / badger ${P(c.badger)} / none ${P(c.none)} | by ${JSON.stringify(by)} | rivalry/game ${(riv / N).toFixed(2)} rounds ${(r / N).toFixed(1)} illegal ${bad}`); }
