// Rule clash 4 (Brian, 2026-11-15): "the end screen should say the vulture is out and the eggs went cold".
// When the vulture is knocked out and then the last egg goes cold, the ostrich is still playing, so the end line must not say both birds are out. node testendreason.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
for (const kind of ['hyena', 'badger']) ok('3 players (' + kind + '): vulture out, eggs cold', () => {
  const g = T.newGame3(kind, undefined, [8, 3]); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [6, 5]));
  const t = g.three; t.birds.red.out = true; t.birds.red.why = 'caught'; t.birds.red.catches = 2; g.vulture = T.OFF.slice();
  g.eggs.forEach(e => { e.alive = false; }); g.phase = 'play'; B.endRound(g); T.finish(g);
  assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, `The vulture is out and the eggs went cold, so the ${kind} wins.`); });
ok('Hunters: vulture out, eggs cold', () => {
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  const t = g.hunt; t.birds.red.out = true; t.birds.red.why = 'caught'; g.vulture = H.OFF.slice(); g.eggs.forEach(e => { e.alive = false; }); g.phase = 'play'; B.endRound(g); H.finish(g);
  assert.equal(g.phase, 'over'); assert.match(g.endWhy, /^The vulture is out and the eggs went cold\. The (hyena|badger) wins|^The vulture is out and the eggs went cold\. The hunters tie/); assert.ok(!/Both birds/.test(g.endWhy)); });
console.log(n + ' end-reason tests passed');
