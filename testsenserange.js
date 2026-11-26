// Unit tests: sense stripes (public/senserange.js). Which squares are striped for each piece, using only that player's own view and the game's own numbers.
// Stripes show distance only and never appear for a piece with no sense in that mode. node testsenserange.js
const assert = require('assert'), Z = require('./public/senserange.js'), B = require('./game.js'), T = require('./three.js'), TM = require('./team.js'), HU = require('./hunt.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG, key = p => p[0] + ',' + p[1];
const sq = (S, mode) => new Set(Z.squares(S.cfg, Z.zone(S, mode)));
const disk = (c, r) => { const o = new Set(); for (let y = 0; y < C.rows; y++) for (let x = 0; x < C.cols; x++) if (Math.max(Math.abs(x - c[0]), Math.abs(y - c[1])) <= r) o.add(x + ',' + y); return o; };
const same = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());
const base = { phase: 'play', myTurn: true, cfg: C };
const vul = (o = {}) => Object.assign({}, base, { role: 'red', vulture: [4, 3] }, o);
const ost = (o = {}) => Object.assign({}, base, { role: 'blue', ostrich: [5, 3] }, o);
const hun = (r, o = {}) => Object.assign({}, base, { role: 'hunter', hunter: [4, 3], h3: { senseRange: r } }, o);

ok('the stripe distances are the game\'s own numbers', () => {
  assert.equal(Z.SEE, T.T3.see); assert.equal(Z.SEE, TM.TM.see); assert.equal(Z.SEE, HU.TH.see);
  assert.equal(C.smellRange, 1); assert.equal(C.vultureFly, 2); assert.equal(T.T3.sense, 2); assert.equal(T.T3.boost, 3);
});
ok('vulture: smell 1 inside fly 2 -> the 3x3 around the vulture is striped; every striped square is one it can fly to (or its own)', () => {
  const S = vul(); const s = sq(S);
  same(s, disk([4, 3], C.smellRange)); assert.equal(s.size, 9);
  for (const k of s) { const [x, y] = k.split(',').map(Number); assert.ok(Math.max(Math.abs(x - 4), Math.abs(y - 3)) <= C.vultureFly); }
});
ok('vulture: no stripes while aiming a throw, or when it is not its turn', () => {
  assert.equal(Z.zone(vul(), 'throw'), null); assert.equal(Z.zone(vul({ myTurn: false }), 'fly'), null);
});
ok('vulture: stripes follow the piece (new square, new stripes) and are clipped at the board edge', () => {
  same(sq(vul({ vulture: [8, 6] })), disk([8, 6], 1)); assert.equal(sq(vul({ vulture: [8, 6] })).size, 4);
  assert.ok(sq(vul({ vulture: [4, 3] })).has('4,3') && !sq(vul({ vulture: [4, 3] })).has('6,3'));
});
ok('2-player ostrich has no sense, so no stripes', () => { assert.equal(Z.zone(ost(), 'walk'), null); });
ok('ostrich carrying an egg in a hunter game: walk 1 inside see 2 -> the 5x5 is striped, the 3x3 walk squares are inside it', () => {
  const S = ost({ h3: { senseRange: 2 } }), s = sq(S, 'carry');
  same(s, disk([5, 3], 2)); assert.equal(s.size, 25);
  const walk = disk([5, 3], C.carryWalk); for (const k of walk) assert.ok(s.has(k));
  assert.equal([...s].filter(k => !walk.has(k)).length, 16); // the ring you can see but not reach
});
ok('ostrich in a hunter game, no kick-aiming stripes', () => { assert.equal(Z.zone(ost({ h3: { senseRange: 2 } }), 'kick'), null); });
ok('hunter, walk 2 = sense 2: the striped squares are exactly the squares it can walk to plus its own', () => {
  const S = hun(T.T3.sense), s = sq(S); same(s, disk([4, 3], T.T3.walk));
});
ok('hunter after the first knock-out: move 3, sense 2 -> stripes cover the inner 5x5 of the 7x7 it can reach', () => {
  const s = sq(hun(T.T3.sense)), move = disk([4, 3], T.T3.boost);
  assert.equal(s.size, 25); for (const k of s) assert.ok(move.has(k)); assert.ok(move.size > s.size);
});
ok('a buried hunter only senses the squares next to it', () => { same(sq(hun(2, { burrowed: true })), disk([4, 3], 1)); });
ok('a hunter with no range in the view, a god view, simple rules, or a piece off the board: no stripes', () => {
  assert.equal(Z.zone(hun(0)), null); assert.equal(Z.zone(vul({ god: true })), null); assert.equal(Z.zone(vul({ simple: true })), null);
  assert.equal(Z.zone(vul({ vulture: [-99, -99] })), null); assert.equal(Z.zone(vul({ phase: 'setup' })), null); assert.equal(Z.zone(null), null);
});
ok('stripes use no hidden information: the zone depends only on position, range and turn', () => {
  const a = vul({ eggs: [{ pos: [4, 4], alive: true }], marks: { '4,4': 'spotted' } }), b = vul({ eggs: [], marks: {} });
  same(sq(a), sq(b));
});
console.log(n + ' passed');
