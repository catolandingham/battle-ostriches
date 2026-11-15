// Rule clash 2 (Brian, 2026-11-15): "warm the egg when the ostrich's time runs out while it is standing on it".
// A shot-clock timeout still warms an egg under the ostrich (not one it carries). A lost turn (knocked back) does not. node testtimeoutwarm.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T3 = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TM = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const until = (g, to, t) => { for (let i = 0; i < 12 && g.turn !== t; i++) to(g); assert.equal(g.turn, t); };
ok('3 players: time runs out on an egg, the egg is warmed', () => {
  const g = T3.newGame3('hyena', undefined, [8, 3]); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T3.placeOstrich3(g, [6, 5]));
  until(g, T3.timeout, 'red'); T3.timeout(g); assert.equal(g.turn, 'blue'); g.round = 9; g.ostrich = [2, 5]; const e = B.eggAt(g, [2, 5]); e.lastWarm = 1;
  T3.timeout(g); assert.equal(e.lastWarm, 9); assert.equal(g.sitting, false, 'not counted as a sit'); });
ok('3 players: time runs out off an egg, nothing is warmed', () => {
  const g = T3.newGame3('hyena', undefined, [8, 3]); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T3.placeOstrich3(g, [6, 5]));
  until(g, T3.timeout, 'red'); T3.timeout(g); g.round = 9; g.eggs.forEach(e => e.lastWarm = 1); T3.timeout(g); assert(g.eggs.every(e => e.lastWarm === 1)); });
ok('Hunters mode: time runs out on an egg, the egg is warmed', () => {
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  until(g, H.timeout, 'blue'); const e = g.eggs.find(x => x.alive && x.pos); g.ostrich = e.pos.slice(); g.round = 9; e.lastWarm = 1;
  H.timeout(g); assert.equal(e.lastWarm, 9); });
ok('4 and 5 players: time runs out on an egg, the egg is warmed', () => { for (const np of [4, 5]) {
  const g = TM.newTeam(np, 'hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TM.place(g, 'o1', p)); assert.ok(TM.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TM.place(g, 'o2', p)); assert.ok(TM.place(g, 'o2', [7, 1]));
  until(g, TM.timeout, 'o1'); g.b.o1.pos = [2, 3]; g.round = 9; const e = g.eggs.find(x => x.alive && x.pos && x.pos[0] === 2 && x.pos[1] === 3); e.lastWarm = 1;
  TM.timeout(g); assert.equal(e.lastWarm, 9, np + ' players'); } });
console.log(n + ' timeout-warm tests passed');
