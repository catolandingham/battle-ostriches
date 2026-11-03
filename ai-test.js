// AI vs AI using the server's red view only for the vulture (no egg data). node ai-test.js
const B = require('./game.js'), AI = require('./ai.js'), assert = require('assert');
const redView = g => { const v = B.visible(g); return { cfg: g.cfg, vulture: g.vulture, round: g.round, prints: v.prints, marks: v.marks, smells: v.smells, fly: B.flyTargets(g), throw: B.throwTargets(g) }; };
const ap = (g, r, m) => r === 'blue' ? (g.phase === 'setupEggs' ? B.placeEgg(g, m.p) : g.phase === 'setupOstrich' ? B.placeOstrich(g, m.p) : m.a === 'sit' ? B.ostrichSit(g) : B.ostrichStep(g, m.p, m.a === 'carry'))
  : m.a === 'fly' ? B.vultureFly(g, m.p) : !!B.vultureThrow(g, m.p);
for (const lvl of ['easy', 'normal']) { let red = 0; const n = 400;
  for (let i = 0; i < n; i++) { const g = B.newGame(); let k = 0;
    while (g.phase !== 'over' && k++ < 500) { const r = g.phase === 'play' ? g.turn : 'blue'; assert(ap(g, r, r === 'blue' ? AI.ostrich(g, lvl) : AI.vulture(redView(g), lvl)), 'legal'); }
    assert.equal(g.phase, 'over'); if (g.winner === 'red') red++; }
  console.log(lvl, 'vulture win', (100 * red / n).toFixed(0) + '%'); }
console.log('ok ai');
