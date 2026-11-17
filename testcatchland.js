// A caught bird lands on a random open square at king distance exactly 3.
// Seeds drive Math.random so the same catches land on the same squares every run.
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), S = require('./server.js'), P = require('./public/push-motion.js');
const K = B.key;
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function withRandom(rnd, fn) {
  const prev = Math.random; Math.random = rnd;
  try { return fn(); } finally { Math.random = prev; }
}
const onRay = (from, to) => { const dx = Math.abs(to[0] - from[0]), dy = Math.abs(to[1] - from[1]); return dx === 0 || dy === 0 || dx === dy; };
function play3(h, o, v) {
  const g = T.newGame3('hyena', undefined, h);
  g.phase = 'play'; g.turn = 'hunter'; g.three.h = h.slice(); g.ostrich = o.slice(); g.vulture = v.slice();
  g.three.pounce = false; g.three.sense = false; g.three.burrowed = false;
  return g;
}
function open3(g, q) {
  return q[0] >= 0 && q[1] >= 0 && q[0] < g.cfg.cols && q[1] < g.cfg.rows && !B.wrecked(g, q)
    && !(g.vulture[0] >= 0 && K(g.vulture) === K(q)) && K(g.three.h) !== K(q);
}

// Column-major scan, rnd 0 picks the first open square at the chosen distance. No wrap.
{
  const cfg = B.CONFIG, any = () => true;
  assert.deepEqual(B.relocateCaught(cfg, [4, 3], any, 3, () => 0), [1, 0]);
  assert.equal(B.dist(B.relocateCaught(cfg, [4, 3], q => B.dist(q, [4, 3]) !== 3, 3, () => 0), [4, 3]), 4, 'nearest distance above 3');
  assert.deepEqual(B.relocateCaught(cfg, [0, 0], q => { const d = B.dist(q, [0, 0]); return d !== 3 && d !== 4; }, 3, () => 0), [0, 5], 'skip an empty 4 and use 5, not 2');
  assert.equal(B.dist(B.relocateCaught(cfg, [4, 3], q => B.dist(q, [4, 3]) < 3, 3, () => 0), [4, 3]), 2, 'nearest distance below 3 when nothing above is open');
  assert.equal(B.relocateCaught(cfg, [4, 3], () => false, 3, () => 0), null);
  assert.deepEqual(B.relocateCaught(cfg, [8, 3], any, 3, () => 0), [5, 0], 'the right edge does not wrap');
}

// 64 seeded catches from one square: distance 3, open, not one fixed square, and not a recatch.
{
  const seen = new Set(); let offRay = 0;
  const blocked = [7, 3], other = [4, 6];
  for (let seed = 1; seed <= 64; seed++) {
    const g = play3([4, 2], [4, 3], other);
    g.marks[blocked[0] + ',' + blocked[1]] = 'stone';
    withRandom(mulberry32(seed), () => { assert.ok(T.hunterMove(g, [4, 3]), 'seed ' + seed); });
    const land = g.ostrich.slice();
    assert.equal(B.dist(land, [4, 3]), 3, 'seed ' + seed + ' landed ' + land);
    assert.ok(open3(g, land), 'landing is open ' + land);
    assert.notDeepEqual(land, blocked, 'not the wrecked square');
    assert.notDeepEqual(land, other, 'not the other bird');
    if (!onRay([4, 3], land)) offRay++;
    seen.add(K(land));
    g.turn = 'hunter'; g.three.pounce = false; g.three.sense = false;
    assert.ok(B.dist(g.three.h, land) > T.T3.walk, 'outside one walk');
    assert.ok(!T.hunterMoves(g).some(p => K(p) === K(land)), 'the next walk does not include the bird');
    assert.equal(T.hunterMove(g, land), false, 'that single move does not catch');
    assert.deepEqual(g.ostrich, land, 'the bird stayed put');
    assert.deepEqual(g.three.h, [4, 3], 'the refused move left the hunter on the catch square');
  }
  assert.ok(seen.size >= 8, 'landings varied, not one fixed square: ' + [...seen].join(' '));
  assert.ok(offRay >= 1, 'a landing off the 8 straight lines');
}

// The right edge stays on the board. A wrap of 3 east from x=8 would land on x=2.
for (let seed = 1; seed <= 24; seed++) {
  const g = play3([7, 3], [8, 3], [0, 0]);
  withRandom(mulberry32(1000 + seed), () => { assert.ok(T.hunterMove(g, [8, 3])); });
  assert.equal(B.dist(g.ostrich, [8, 3]), 3, 'edge seed ' + seed);
  assert.ok(g.ostrich[0] >= 5 && g.ostrich[0] < g.cfg.cols, 'no wrap ' + g.ostrich);
}

// Fallback through the catch itself, then a full block sends the hunter back.
{
  const g = play3([3, 3], [4, 3], [0, 0]);
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) if (B.dist([x, y], [4, 3]) === 3) g.marks[x + ',' + y] = 'stone';
  assert.ok(T.hunterMove(g, [4, 3]));
  assert.equal(B.dist(g.ostrich, [4, 3]), 4, 'nearest open distance above 3');
  assert.ok(!B.wrecked(g, g.ostrich));
  assert.deepEqual(g.three.h, [4, 3]);
}
{
  const g = play3([3, 3], [4, 3], [0, 6]);
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) if (B.dist([x, y], [4, 3]) >= 3) g.marks[x + ',' + y] = 'stone';
  assert.ok(T.hunterMove(g, [4, 3]));
  assert.equal(B.dist(g.ostrich, [4, 3]), 2, 'nearest open distance below 3');
  assert.ok(!B.wrecked(g, g.ostrich));
}
{
  const g = play3([3, 3], [4, 3], [0, 0]);
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) if (x !== 4 || y !== 3) g.marks[x + ',' + y] = 'stone';
  const before = g.three.h.slice();
  assert.ok(T.hunterMove(g, [4, 3]));
  assert.deepEqual(g.ostrich, [4, 3], 'nowhere to land');
  assert.deepEqual(g.three.h, before, 'the hunter goes back');
}

// The hunter's phone still does not learn the landing square. The bird's slide follows it.
{
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
  const g = room.g = play3([4, 2], [4, 3], [0, 0]);
  const before = Object.fromEntries(['blue', 'hunter'].map(r => [r, S.view3(room, r)]));
  withRandom(mulberry32(7), () => { assert.ok(T.hunterMove(g, [4, 3])); });
  const hv = S.view3(room, 'hunter'), bv = S.view3(room, 'blue');
  assert.equal(hv.h3.lastCatch.to, null, 'hunter is not told the landing');
  assert.deepEqual(hv.ostrich, T.OFF);
  assert.deepEqual(bv.h3.lastCatch.to, g.ostrich);
  assert.deepEqual(P.events(hv, before.hunter), [], 'hunter sees no scramble slide');
  const ev = P.events(bv, before.blue).find(e => e.key === 'blue');
  assert.ok(ev, 'the caught bird gets a slide');
  assert.deepEqual(ev.points[0], [4, 3]);
  assert.deepEqual(ev.points[ev.points.length - 1], g.ostrich);
  assert.equal(ev.points.length, 4, 'three king steps');
}

// Hunters mode and 2 vs 2 + hunter use the same landing.
{
  const seenH = new Set();
  for (let seed = 1; seed <= 16; seed++) {
    const g = H.newHunt(undefined, [[4, 2], [0, 0]]);
    g.phase = 'play'; g.turn = 'hyena'; g.ostrich = [4, 3]; g.vulture = [8, 6];
    g.hunt.hs.hyena.p = [4, 2]; g.hunt.hs.hyena.pounce = false; g.hunt.hs.badger.p = [0, 0];
    withRandom(mulberry32(2000 + seed), () => { assert.ok(H.hunterMove(g, [4, 3])); });
    assert.equal(B.dist(g.ostrich, [4, 3]), 3);
    assert.ok(!B.wrecked(g, g.ostrich) && K(g.ostrich) !== K(g.vulture) && K(g.ostrich) !== K(g.hunt.hs.hyena.p) && K(g.ostrich) !== K(g.hunt.hs.badger.p));
    g.turn = 'hyena'; g.hunt.hs.hyena.pounce = false;
    assert.equal(H.hunterMove(g, g.ostrich), false);
    seenH.add(K(g.ostrich));
  }
  assert.ok(seenH.size >= 3, 'Hunters landings varied: ' + seenH.size);
  const seenT = new Set();
  for (let seed = 1; seed <= 16; seed++) {
    const g = TT.newTeam(5, 'hyena', undefined, [4, 2]);
    g.phase = 'play'; g.turn = 'hunter'; g.h.p = [4, 2]; g.h.pounce = false; g.h.kind = 'hyena';
    g.b.o1.pos = [4, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [8, 0];
    withRandom(mulberry32(3000 + seed), () => { assert.ok(TT.hunterMove(g, [4, 3])); });
    assert.equal(B.dist(g.b.o1.pos, [4, 3]), 3);
    assert.ok(K(g.b.o1.pos) !== K(g.h.p) && K(g.b.o1.pos) !== K(g.b.o2.pos) && K(g.b.o1.pos) !== K(g.b.v1.pos) && K(g.b.o1.pos) !== K(g.b.v2.pos));
    g.turn = 'hunter'; g.h.pounce = false;
    assert.equal(TT.hunterMove(g, g.b.o1.pos), false);
    seenT.add(K(g.b.o1.pos));
  }
  assert.ok(seenT.size >= 3, '5-player landings varied: ' + seenT.size);
}

S.close();
console.log('PASS catch landing: distance 3, open, varied, no immediate recatch');
process.exit(0);
