// Team throw tap: the teammate's square, inside throw reach, is not "Too far."
// node testthrowtap.js
process.env.PORT = '0'; process.env.BO_NOSTORE = '1';
const assert = require('assert'), S = require('./server'), TT = require('./team'), { miss } = require('./public/throwtap');

function team(n) {
  const bots = n === 5 ? ['v2', 'o1', 'o2', 'hunter'] : ['v2', 'o1', 'o2'];
  const { room } = S.createT({ team: n, role: 'v1', bots, kind: n === 5 ? 'hyena' : null }, null);
  const g = room.g = TT.newTeam(n, n === 5 ? 'hyena' : null);
  g.phase = 'play'; g.turn = 'v1';
  g.b.v1.pos = [3, 3]; g.b.v2.pos = [3, 4]; g.b.o1.pos = [0, 0]; g.b.o2.pos = [8, 6];
  if (g.h) g.h.p = [8, 3];
  g.b.v1.stones = 1;
  return { room, g };
}
for (const n of [4, 5]) {
  const { room, g } = team(n);
  const v = S.viewT(room, 'v1');
  assert.equal(v.h3.team, true, n + ' is a team game');
  assert.ok(!v.throw.some(p => p[0] === 3 && p[1] === 4), n + ' teammate square stays off the throw list');
  assert.ok(v.throw.some(p => p[0] === 3 && p[1] === 3), n + ' own square is still in reach');
  assert.equal(miss(v, [3, 4]), 'Your teammate is there.', n + ' player');
  assert.equal(miss(v, [3, 5]), 'Too far.', n + ' a square past the teammate is out of reach');
  assert.equal(miss(v, [8, 6]), 'Too far.', n + ' a far square stays Too far');
  g.b.v1.stones = 0;
  const empty = S.viewT(room, 'v1');
  assert.equal(empty.stones, 0);
  assert.equal(miss(empty, [3, 4]), 'No stone. Go to rocks.', n + ' no stone wins over the teammate');
  g.marks['4,3'] = 'stone'; g.b.v1.stones = 1;
  const wrecked = S.viewT(room, 'v1');
  assert.ok(!wrecked.throw.some(p => p[0] === 4 && p[1] === 3), 'a wrecked neighbor is not a throw');
  assert.equal(miss(wrecked, [4, 3]), 'Too far.', n + ' a wrecked square is not the teammate hint');
}

// 3 players and Hunters have no teammate vulture. The old hint stays.
{
  const { room } = S.create3({ role: 'red', bots: ['blue', 'hunter'], kind: 'hyena' }, null);
  const T = require('./three'), B = require('./game');
  const g = room.g = T.newGame3('hyena', undefined, [8, 3]);
  g.phase = 'play'; g.turn = 'red'; g.vulture = [3, 3]; g.ostrich = [0, 0]; g.stones = 1;
  for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, p);
  const v = S.view3(room, 'red');
  assert.ok(!v.h3.team);
  assert.equal(miss(v, [3, 4]), 'Too far.');
  v.stones = 0; assert.equal(miss(v, [3, 4]), 'No stone. Go to rocks.');
}
{
  const { room } = S.createH({ role: 'red', bots: ['blue', 'hyena', 'badger'] }, null);
  const H = require('./hunt'), B = require('./game');
  const g = room.g = H.newHunt(undefined, [[8, 3], [0, 6]]);
  g.phase = 'play'; g.turn = 'red'; g.vulture = [3, 3]; g.ostrich = [0, 0]; g.stones = 1;
  for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, p);
  const v = S.viewH(room, 'red');
  assert.ok(!v.h3.team);
  assert.equal(miss(v, [4, 3]), 'Too far.');
}

S.close();
console.log('PASS throw tap: teammate in reach, too far, and no stone');
process.exit(0);
