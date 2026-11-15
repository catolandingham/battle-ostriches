// Unit test: in round 30 the hunter still takes its last move before the ostrich can win, in every mode (Brian, 2026-11-15). node testlastround.js
process.env.PORT = 0; process.env.BO_NOSTORE = '1';
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TM = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };

ok('3 players: after the ostrich in round 30 it is the hunter\'s turn, then the ostrich wins', () => {
  const g = T.newGame3('hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [2, 1]));
  g.round = 30; g.turn = 'blue'; g.eggs.forEach(e => e.lastWarm = 29); T.ostrichAct3(g, 'sit');
  assert.equal(g.phase, 'play', 'the game is not over yet'); assert.equal(g.turn, 'hunter', 'the hunter moves');
  T.hunterStay(g);
  assert.equal(g.phase, 'over'); assert.equal(g.winner, 'blue'); assert.equal(g.winBy, 'survived'); assert.equal(g.round, 30);
  assert(/after round 30/.test(g.endWhy), g.endWhy);
});

ok('Hunters mode: both hunters move in round 30, then the ostrich wins', () => {
  const h = H.newHunt(undefined, [[0, 3], [8, 3]]); for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(h, p); H.placeOstrichH(h, [2, 1]);
  h.round = 30; h.turn = 'blue'; h.eggs.forEach(e => e.lastWarm = 29); H.ostrichActH(h, 'sit');
  assert.equal(h.phase, 'play'); assert.equal(h.turn, 'hyena');
  H.hunterStay(h); assert.equal(h.phase, 'play'); assert.equal(h.turn, 'badger');
  H.hunterStay(h); assert.equal(h.phase, 'over'); assert.equal(h.winner, 'blue'); assert.equal(h.winBy, 'survived');
});

ok('5 players: unchanged, the hunter still moves after the last ostrich in round 30', () => {
  const t = TM.newTeam(5, 'hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TM.place(t, 'o1', p); TM.place(t, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TM.place(t, 'o2', p); TM.place(t, 'o2', [7, 1]);
  t.round = 30; t.eggs.forEach(e => e.lastWarm = 29); t.turn = 'o2'; TM.timeout(t);
  assert.equal(t.phase, 'play'); assert.equal(t.turn, 'hunter');
});

ok('3 players, round 29: nothing changes before the last round', () => {
  const g = T.newGame3('hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [2, 1]));
  g.round = 29; g.turn = 'blue'; T.ostrichAct3(g, 'sit'); assert.equal(g.turn, 'hunter'); T.hunterStay(g);
  assert.equal(g.phase, 'play'); assert.equal(g.round, 30); assert.equal(g.turn, 'red'); assert(!g.three.lastRound);
});
console.log('PASS testlastround', n);
