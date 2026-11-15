// Rule clash 3 (Brian, 2026-11-15): "Badger runs out of time: it loses its turn without digging in".
// A shot-clock timeout no longer buries the badger or tells anyone "The badger dug in!". Tapping Burrow still digs in. node testbadgertimeout.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T3 = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TM = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const until = (g, to, t) => { for (let i = 0; i < 12 && g.turn !== t; i++) to(g); assert.equal(g.turn, t); };
const g3 = () => { const g = T3.newGame3('badger', undefined, [8, 3]); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T3.placeOstrich3(g, [6, 5])); until(g, T3.timeout, 'hunter'); return g; };
ok('3 players: time runs out, the badger stays up and nobody is told it dug in', () => {
  const g = g3(); assert.ok(T3.timeout(g)); assert.equal(g.three.burrowed, false); assert.equal(g.three.dug, undefined); assert.notEqual(g.turn, 'hunter'); });
ok('3 players: tapping Burrow still digs in; a buried badger that runs out of time stays buried without a second "dug in"', () => {
  const g = g3(); assert.ok(T3.hunterStay(g)); assert.equal(g.three.burrowed, true); assert.equal(g.three.dug.seq, 1);
  until(g, T3.timeout, 'hunter'); T3.timeout(g); assert.equal(g.three.burrowed, true); assert.equal(g.three.dug.seq, 1); });
ok('Hunters: time runs out on the badger, no dig', () => {
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  until(g, H.timeout, 'badger'); assert.ok(H.timeout(g)); assert.equal(g.hunt.hs.badger.burrowed, false); assert.equal(g.hunt.dug, undefined); });
ok('5 players: time runs out on the badger, no dig', () => { for (const np of [5]) {
  const g = TM.newTeam(np, 'badger', undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TM.place(g, 'o1', p)); assert.ok(TM.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TM.place(g, 'o2', p)); assert.ok(TM.place(g, 'o2', [7, 1]));
  until(g, TM.timeout, 'hunter'); assert.ok(TM.timeout(g)); assert.equal(g.h.burrowed, false, np + ' players'); assert.equal(g.dug, undefined); } });
console.log(n + ' badger-timeout tests passed');
