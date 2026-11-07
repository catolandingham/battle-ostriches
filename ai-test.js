// AI vs AI: the vulture bot gets only the public view (AI.redView - no egg data). node ai-test.js
const B = require('./game.js'), AI = require('./ai.js'), assert = require('assert');
const ap = (g, r, m) => r === 'blue' ? (g.phase === 'setupEggs' ? B.placeEgg(g, m.p) : g.phase === 'setupOstrich' ? B.placeOstrich(g, m.p) : m.a === 'sit' ? B.ostrichSit(g) : m.a === 'kick' ? B.ostrichKick(g, m.p) : B.ostrichStep(g, m.p, m.a === 'carry'))
  : m.a === 'fly' ? B.vultureFly(g, m.p) : !!B.vultureThrow(g, m.p);
const g0 = B.newGame(); B.placeEgg(g0, [2, 2]); assert(!('eggs' in AI.redView(g0)) && !JSON.stringify(AI.redView(g0)).includes('[2,2]'), 'red view hides eggs');
for (const lvl of ['easy', 'normal']) { let red = 0; const n = 400;
  for (let i = 0; i < n; i++) { const g = B.newGame(), mem = {}; let k = 0;
    while (g.phase !== 'over' && k++ < 600) { const r = g.phase === 'play' ? g.turn : 'blue'; assert(ap(g, r, r === 'blue' ? AI.ostrich(g, 'normal') : AI.vulture(AI.redView(g), lvl, mem)), 'legal'); }
    assert.equal(g.phase, 'over'); if (g.winner === 'red') red++; }
  console.log(lvl, 'vulture win', (100 * red / n).toFixed(0) + '%'); }
console.log('ok ai');
