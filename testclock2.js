// Classic 2-player shot clock: the vulture passes, the ostrich stays, the round advances.
const assert = require('assert'), B = require('./game.js');
const g = B.newGame();
for (const p of [[2, 2], [6, 2], [2, 5]]) assert.ok(B.placeEgg(g, p));
assert.ok(B.placeOstrich(g, [2, 2]));
g.turn = 'red';
assert.ok(B.timeout(g), 'vulture clock');
assert.equal(g.turn, 'blue');
assert.equal(g.lastAction.type, 'pass');
const round = g.round;
assert.ok(B.timeout(g), 'ostrich clock');
assert.equal(g.turn, 'red');
assert.equal(g.round, round + 1);
console.log('ok classic shot clock');
