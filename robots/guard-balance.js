// Pins the balance numbers and the badger's speed. Fails if either drifts.
// Does not play a game and does not change any number.
const assert = require('assert');
const B = require('../game.js');
const T = require('../three.js');
const H = require('../hunt.js');
const TM = require('../team.js');

const EXPECT = {
  cols: 9, rows: 7, eggs: 3, rounds: 30, warmth: 15,
  ostrichWalk: 2, carryWalk: 1, kickPush: 3, kickPushBadger: 2,
  vultureFly: 2, throwRange: 1, smellRange: 1, food: 15, stones: 1,
  scramble: 2, pushHunters: 2,
};
for (const [k, v] of Object.entries(EXPECT)) assert.equal(B.CONFIG[k], v, 'CONFIG.' + k);
assert.deepEqual(B.CONFIG.foods, [[0, 0], [8, 6]], 'leaf squares');
assert.deepEqual(B.CONFIG.rocks, [[4, 0], [4, 6]], 'rock piles');
assert.deepEqual(B.CONFIG.vultureStart, [4, 3], 'vulture start');
// Live code. A 2026-11-07 decision says 3 catches. That conflict is in docs/RULES-CHECKLIST.md. Do not "fix" it here.
assert.equal(B.CONFIG.hunterGoal['3'], 'catches:3', '3-player hunter goal');
assert.equal(B.CONFIG.hunterGoal['5'], 'first', '5-player hunter goal');
assert.equal(T.T3.walk, 2);
assert.equal(H.TH.walk, 2);
assert.equal(TM.TM.walk, 2);
assert.equal(T.T3.pounce, 1);
assert.equal(T.T3.double, 2, 'double turn stays 2; it is not a speed change');
assert.equal(T.T3.clockMs, 10000, 'shot clock');
assert.equal(T.T3.ko.badger, 2);
assert.equal(H.TH.ko.badger, 2);
assert.equal(TM.TM.ko.badger, 2);
for (const bag of [B.CONFIG, T.T3, H.TH, TM.TM]) {
  assert.equal(bag.speedBoost, undefined, 'no speed-boost field');
  assert.equal(bag.badgerBoost, undefined, 'no badger-boost field');
}

function badgerRange(birdOut) {
  const g = T.newGame3('badger', undefined, [0, 3]);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p));
  assert.ok(T.placeOstrich3(g, [4, 2]));
  g.phase = 'play';
  g.turn = 'hunter';
  g.three.sense = false;
  g.three.pounce = false;
  g.three.extra = false;
  g.three.h = [4, 3];
  g.ostrich = [1, 1];
  g.vulture = [8, 6];
  if (birdOut) g.three.birds.blue.out = true;
  const moves = T.hunterMoves(g);
  assert.ok(moves.length > 0, 'badger has a move');
  const far = moves.reduce((m, p) => Math.max(m, B.dist(g.three.h, p)), 0);
  return far;
}

assert.equal(badgerRange(false), 2, 'badger walks 2');
assert.equal(badgerRange(true), 2, 'knocking a bird out does not boost the badger');
console.log('ok balance and badger speed unchanged');
