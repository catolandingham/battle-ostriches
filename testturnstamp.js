// A tap is only for the turn it was made on. node testturnstamp.js
process.env.PORT = 3948; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '600000'; process.env.BO_BOTMS = '600000';
const assert = require('assert');
const B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js');
const S = require('./server.js');
const copy = o => JSON.parse(JSON.stringify(o));
const seats = names => Object.fromEntries(names.map(n => [n, {}]));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

function eggs(g) { for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p)); }
function flyOpen(g) { return B.flyTargets(g).find(p => !B.isFood(g, p) && !B.isRock(g, p)) || B.flyTargets(g)[0]; }

ok('a double Stay on the turn a badger has already knocked someone out does not spend the bonus turn', () => {
  const g = T.newGame3('badger', undefined, [5, 2]);
  eggs(g); assert.ok(T.placeOstrich3(g, [0, 6]));
  g.turn = 'hunter'; g.three.h = [5, 2]; g.three.pounce = false; g.three.extra = false; g.three.burrowed = false; g.three.sense = false;
  g.three.birds.red.out = true; g.three.birds.red.why = 'caught'; g.three.birds.red.catches = 2; g.vulture = [-99, -99];
  const room = { three: true, g, players: seats(['blue', 'red', 'hunter']), bots: [] };
  const stamp = copy(S.turnStamp(room));
  assert.equal(stamp.bonus, false);
  assert.equal(S.acceptAct(room, 'hunter', { a: 'hstay', stamp }), true);
  assert.equal(g.turn, 'hunter');
  assert.equal(g.three.extra, true, 'the first Stay starts the bonus turn');
  assert.equal(g.three.burrowed, true);
  const seq = g.three.senseSeq, at = g.three.h.slice();
  assert.equal(S.acceptAct(room, 'hunter', { a: 'hstay', stamp }), false, 'the second Stay is the same tap');
  assert.equal(g.turn, 'hunter');
  assert.equal(g.three.extra, true, 'the bonus turn is still there');
  assert.equal(g.three.burrowed, true);
  assert.equal(g.three.senseSeq, seq);
  assert.deepEqual(g.three.h, at);
  const again = S.turnStamp(room);
  assert.equal(again.bonus, true);
  assert.notEqual(again.seq, stamp.seq);
  assert.equal(S.acceptAct(room, 'hunter', { a: 'hstay', stamp: again }), true, 'the bonus turn itself can still be played');
  assert.equal(g.three.extra, false);
  assert.equal(g.turn, 'blue', 'the vulture is already out, so the ostrich is next');
});

function rejectLate(name, room, seat, moves, advance) {
  const g = room.g;
  const stamp = copy(S.turnStamp(room));
  assert.equal(g.turn, seat, name + ' is on that seat');
  assert.equal(stamp.round, g.round);
  const p = moves()[0];
  assert.ok(p, name + ' has a step');
  assert.equal(S.acceptAct(room, seat, { a: 'step', p, stamp }), true, name + ' plays the turn it stamped');
  advance();
  assert.equal(g.turn, seat, name + ' reaches that seat again');
  assert.ok(g.round > stamp.round, name + ' is a later round, saw ' + g.round);
  const pos = moves.pos();
  const p2 = moves()[0];
  assert.ok(p2, name + ' still has a step');
  assert.equal(S.acceptAct(room, seat, { a: 'step', p: p2, stamp }), false, name + ' drops the round-1 step');
  assert.deepEqual(moves.pos(), pos, name + ' did not move');
  assert.equal(S.acceptAct(room, seat, { a: 'step', p: p2, stamp: S.turnStamp(room) }), true, name + ' accepts a stamp for this turn');
}

ok('2 players: an ostrich step stamped in round 1 is dropped in round 2', () => {
  const g = B.newGame(); eggs(g); assert.ok(B.placeOstrich(g, [4, 2]));
  assert.ok(B.vultureFly(g, flyOpen(g)));
  const room = { g, players: seats(['blue', 'red']) };
  rejectLate('2p', room, 'blue', Object.assign(() => B.ostrichMoves(g), { pos: () => g.ostrich.slice() }), () => {
    assert.equal(g.turn, 'red');
    assert.ok(B.vultureFly(g, flyOpen(g)));
  });
});

ok('3 players: an ostrich step stamped in round 1 is dropped in round 2', () => {
  const g = T.newGame3('hyena', undefined, [8, 6]); eggs(g); assert.ok(T.placeOstrich3(g, [4, 2]));
  assert.ok(T.vultureFly3(g, flyOpen(g)));
  const room = { three: true, g, players: seats(['blue', 'red', 'hunter']), bots: [] };
  rejectLate('3p', room, 'blue', Object.assign(() => B.ostrichMoves(g), { pos: () => g.ostrich.slice() }), () => {
    assert.equal(g.turn, 'hunter');
    assert.ok(T.timeout(g));
    assert.equal(g.turn, 'red');
    assert.ok(T.vultureFly3(g, flyOpen(g)));
  });
});

ok('Hunters: an ostrich step stamped in round 1 is dropped in round 2', () => {
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]); eggs(g); assert.ok(H.placeOstrichH(g, [4, 2]));
  assert.ok(H.vultureFlyH(g, flyOpen(g)));
  const room = { hunt: true, g, players: seats(['blue', 'red', 'hyena', 'badger']), bots: [] };
  rejectLate('hunt', room, 'blue', Object.assign(() => B.ostrichMoves(g), { pos: () => g.ostrich.slice() }), () => {
    assert.equal(g.turn, 'hyena');
    assert.ok(H.timeout(g));
    assert.equal(g.turn, 'badger');
    assert.ok(H.timeout(g));
    assert.equal(g.turn, 'red');
    assert.ok(H.vultureFlyH(g, flyOpen(g)));
  });
});

ok('team: an ostrich step stamped in round 1 is dropped in round 2', () => {
  const g = TT.newTeam(4);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TT.place(g, 'o1', p));
  assert.ok(TT.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TT.place(g, 'o2', p));
  assert.ok(TT.place(g, 'o2', [7, 1]));
  assert.equal(g.phase, 'play');
  g.turn = 'o1';
  const room = { team: true, n: 4, g, players: seats(['v1', 'o1', 'v2', 'o2']), bots: [] };
  rejectLate('team', room, 'o1', Object.assign(() => TT.ostrichMoves(g, 'o1'), { pos: () => g.b.o1.pos.slice() }), () => {
    for (let i = 0; i < 8 && !(g.turn === 'o1' && g.round === 2); i++) assert.ok(TT.timeout(g));
  });
});

S.close();
console.log('PASS testturnstamp (' + n + ')');
process.exit(0);
