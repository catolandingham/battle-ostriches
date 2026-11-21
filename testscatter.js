// Hunter kicks land on a random full-distance square. The kicked hunter is not sent the path.
// The first catch knock-out tells every seat that the hunter now moves twice.
process.env.PORT = '0';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '900000';
const assert = require('assert');
const B = require('./game.js');
const T = require('./three.js');
const H = require('./hunt.js');
const TT = require('./team.js');
const S = require('./server.js');
const CT = require('./public/catchtext.js');
const SIMPLE = require('./simple.js');

const NOTE = 'Hunter now moves twice each round.';
assert.equal(T.DOUBLE_NOTE, NOTE);

function eggs(g) { for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p)); }
function play3(kind, h, o, v) {
  const g = T.newGame3(kind, undefined, h);
  eggs(g); assert.ok(T.placeOstrich3(g, o));
  g.vulture = v.slice(); g.turn = 'blue'; g.phase = 'play';
  return g;
}
function occupied3(g, q) {
  return (g.ostrich[0] >= 0 && B.key(q) === B.key(g.ostrich)) || (g.vulture[0] >= 0 && B.key(q) === B.key(g.vulture));
}

assert.equal(NOTE, T.DOUBLE_NOTE);
{
  const g = play3('hyena', [5, 3], [4, 3], [0, 6]);
  const egg = g.eggs[0]; egg.pos = [8, 4]; egg.alive = true;
  const plans = T.kickPlans3(g);
  assert.equal(plans.length, 1);
  assert.ok(T.ostrichKick3(g, [5, 3]));
  const land = g.three.h, n = g.cfg.kickPush;
  assert.equal(B.wrapDist(g.cfg, [5, 3], land), n, 'full distance');
  assert.deepEqual(land, plans[0].to, 'the preview and the kick match');
  assert.ok(!occupied3(g, land), 'not on another animal');
  assert.ok(!B.wrecked(g, land), 'not wrecked');
  assert.ok(egg.alive && B.key(egg.pos) === '8,4', 'an egg does not break');
  assert.equal(g.marks[B.key(land)], undefined, 'the landing is not wrecked by the kick');
  assert.equal(g.lastKick.moved, n);
  assert.ok(g.lastKick.scatter);
  if (!g.lastKick.reachGap) {
    assert.ok(B.wrapDist(g.cfg, land, g.ostrich) > T.hunterReach(g), 'outside catch range');
    assert.ok(!B.pointsBack(g.cfg, [5, 3], land, g.ostrich), 'the path does not point back at the ostrich');
  }
  assert.deepEqual(g.ostrich, [4, 3], 'the ostrich stays');
}

{
  const g = play3('badger', [5, 3], [4, 3], [0, 6]);
  g.three.burrowed = true;
  assert.equal(T.ostrichKick3(g, [5, 3]), false, 'a buried badger cannot be kicked');
  assert.deepEqual(g.three.h, [5, 3]);
}

{
  const g = play3('hyena', [5, 3], [4, 3], [0, 6]);
  g.marks['6,3'] = 'stone'; g.marks['6,4'] = 'hit';
  assert.ok(T.ostrichKick3(g, [5, 3]));
  assert.ok(!B.wrecked(g, g.three.h));
  assert.notDeepEqual(g.three.h, [0, 6]);
}

{
  const classic = B.newGame(); classic.phase = 'play'; classic.turn = 'blue'; classic.ostrich = [4, 3]; classic.vulture = [5, 3];
  assert.ok(B.ostrichKick(classic, [5, 3]));
  assert.deepEqual(classic.vulture, [8, 3], 'a vulture kick stays straight');
  const g = play3('hyena', [0, 6], [4, 3], [5, 3]);
  assert.ok(T.ostrichKick3(g, [5, 3]));
  assert.deepEqual(g.vulture, [8, 3], 'kicking the vulture stays straight');
  assert.deepEqual(g.three.h, [0, 6]);
}

{
  const g = play3('hyena', [5, 3], [4, 3], [0, 6]);
  g.three.birds.red.why = 'caught'; g.three.birds.red.out = true; g.vulture = T.OFF.slice();
  assert.equal(T.hunterReach(g), 2, 'after a knock-out the longer turn is still 2');
  assert.ok(T.ostrichKick3(g, [5, 3]));
  assert.equal(g.lastKick.reachGap, false, 'a walk of 2 still leaves a safe square');
  assert.equal(B.wrapDist(g.cfg, [5, 3], g.three.h), 3, 'still the full distance');
  assert.ok(B.wrapDist(g.cfg, g.three.h, g.ostrich) > T.hunterReach(g), 'outside the longer turn');
  assert.ok(!occupied3(g, g.three.h));
}

{
  const g = play3('badger', [5, 3], [4, 3], [0, 6]);
  g.three.birds.red.why = 'caught'; g.three.birds.red.out = true;
  assert.equal(T.hunterReach(g), 2);
  assert.ok(T.ostrichKick3(g, [5, 3]));
  assert.equal(g.lastKick.reachGap, false, 'a badger kick of 2 still has a square the badger cannot reach');
  assert.equal(B.wrapDist(g.cfg, [5, 3], g.three.h), 2);
  assert.ok(B.wrapDist(g.cfg, g.three.h, g.ostrich) > 2);
}

{
  const g = play3('hyena', [4, 3], [4, 2], [0, 0]);
  SIMPLE.arm(g);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  assert.deepEqual(g.three.h, [4, 6], 'simple rules still stop at the edge');
  assert.ok(!g.lastKick.scatter);
}

{
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
  const g = room.g = play3('hyena', [5, 3], [4, 3], [0, 6]);
  room.bots = [];
  for (const s of ['blue', 'red', 'hunter']) room.players[s] = { ws: null, token: s };
  assert.ok(T.ostrichKick3(g, [5, 3]));
  const blue = S.view3(room, 'blue'), hunter = S.view3(room, 'hunter'), red = S.view3(room, 'red');
  assert.deepEqual(blue.kick.to, g.three.h);
  assert.deepEqual(blue.kick.trail, g.lastKick.points);
  assert.deepEqual(hunter.kick.to, g.three.h, 'the kicked hunter sees the landing');
  assert.deepEqual(hunter.kick.trail, g.lastKick.points, 'the path is the hunter squares, not a line back to the ostrich');
  assert.deepEqual(hunter.ostrich, T.OFF, 'the ostrich square stays hidden');
  assert.deepEqual(red.kick.to, g.three.h);
  assert.deepEqual(red.kick.trail, g.lastKick.points);
}

{
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const g = play3('hyena', [5, 3], [4, 3], [0, 6]);
    g.kickRnd = () => (i * 17 % 100) / 100;
    assert.ok(T.ostrichKick3(g, [5, 3]));
    seen.add(B.key(g.three.h));
    assert.equal(B.wrapDist(g.cfg, [5, 3], g.three.h), 3);
  }
  assert.ok(seen.size > 1, 'different rolls land on different squares');
}

{
  const g = H.newHunt();
  eggs(g); assert.ok(B.placeOstrich(g, [4, 3]));
  g.phase = 'play'; g.turn = 'blue'; g.vulture = [0, 6];
  g.hunt.hs.hyena.p = [5, 3]; g.hunt.hs.badger.p = [8, 0];
  assert.ok(H.ostrichKickH(g, [5, 3]));
  assert.equal(B.wrapDist(g.cfg, [5, 3], g.hunt.hs.hyena.p), 3);
  assert.notDeepEqual(g.hunt.hs.hyena.p, [8, 0]);
  assert.ok(!B.wrecked(g, g.hunt.hs.hyena.p));
}

{
  const g = TT.newTeam(5, 'badger');
  g.phase = 'play'; g.turn = 'o1';
  g.b.o1.pos = [4, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [0, 6];
  g.h.kind = 'badger'; g.h.p = [5, 3]; g.h.burrowed = false;
  assert.ok(TT.ostrichKick(g, 'o1', [5, 3]));
  assert.equal(B.wrapDist(g.cfg, [5, 3], g.h.p), 2, 'a 5-player badger goes 2');
  assert.notDeepEqual(g.h.p, g.b.o1.pos);
  assert.notDeepEqual(g.h.p, g.b.v1.pos);
}

function ko(kind) {
  const g = play3(kind, [5, 2], [6, 2], [0, 6]);
  g.turn = 'hunter'; g.three.birds.blue.catches = 1; g.three.pounce = false; g.three.sense = false;
  assert.ok(T.hunterMove(g, [6, 2]));
  return g;
}
{
  const g = ko('hyena');
  assert.equal(g.phase, 'play');
  assert.equal(g.turn, 'red', 'the vulture moves before the extra 1-square turn');
  assert.ok(!g.three.extra);
  assert.deepEqual(g.three.doubleNote, { seq: 1, round: g.round });
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
  room.g = g; room.bots = [];
  for (const s of ['blue', 'red', 'hunter']) room.players[s] = { ws: null, token: s };
  for (const s of ['blue', 'red', 'hunter']) {
    const v = S.view3(room, s);
    assert.equal(v.h3.doubleNote.text, NOTE, s);
    assert.equal(v.h3.doubleNote.seq, 1);
  }
  const seen = { kick: 0, double: 0 };
  const prev = { phase: 'play', h3: {} };
  const now = { phase: 'play', h3: { doubleNote: { seq: 1, text: NOTE } }, kick: null };
  const first = CT.newEvents(seen, now, prev);
  assert.equal(first.length, 1);
  assert.equal(first[0].text, NOTE);
  assert.equal(CT.viewerEvent(first[0], now), NOTE);
  assert.equal(CT.newEvents(seen, now, prev).length, 0, 'the line is said once');
}

{
  const g = ko('badger');
  assert.equal(g.three.doubleNote.text || T.DOUBLE_NOTE, NOTE);
  assert.ok(g.three.doubleNote);
  g.turn = 'hunter'; g.three.extra = false; g.three.pounce = false;
  g.vulture = [5, 3]; g.three.h = [5, 2]; g.three.birds.red.catches = 1;
  assert.ok(T.hunterMove(g, [5, 3]));
  assert.equal(g.three.doubleNote.seq, 1, 'a later knock-out does not say it again');
}

{
  const g = play3('hyena', [0, 3], [4, 4], [2, 1]);
  g.hungerLeft = 1; g.turn = 'blue';
  assert.ok(T.ostrichAct3(g, 'step', [4, 5]));
  assert.equal(g.three.birds.blue.why, 'starved');
  assert.equal(g.three.doubleNote, undefined, 'starving is not a catch knock-out');
}

{
  const g = play3('hyena', [5, 2], [6, 2], [0, 6]);
  SIMPLE.arm(g);
  g.turn = 'hunter'; g.three.birds.blue.catches = 1;
  assert.ok(T.hunterMove(g, [6, 2]));
  assert.equal(g.three.doubleNote, undefined, 'simple rules have no double turn');
}

{
  const g = play3('hyena', [5, 2], [6, 2], [8, 6]);
  g.turn = 'hunter'; g.three.birds.red.out = true; g.three.birds.red.why = 'starved'; g.vulture = T.OFF.slice();
  g.three.birds.blue.catches = 1;
  assert.ok(T.hunterMove(g, [6, 2]));
  assert.equal(g.phase, 'over');
  assert.equal(g.three.doubleNote, undefined, 'a knock-out that ends the game has no extra turn to announce');
}

function stoneOk(cfg, from, land, vul) {
  assert.equal(B.wrapDist(cfg, from, land), 2, 'a stone lands the full 2');
  assert.ok(!B.pointsBack(cfg, from, land, vul), 'not on the straight-away line');
  assert.ok(B.wrapDist(cfg, land, vul) > 1, 'not next to the vulture');
}

{
  const g = play3('badger', [5, 3], [1, 1], [4, 3]);
  g.three.burrowed = true; g.turn = 'red'; g.stones = 1;
  const egg = g.eggs[0]; egg.pos = [7, 4]; egg.alive = true;
  g.marks['6,5'] = 'stone';
  assert.ok(T.vultureThrow3(g, [5, 3]));
  const land = g.three.h;
  assert.equal(g.three.burrowed, false, 'a buried badger comes up');
  assert.equal(B.wrapDist(g.cfg, [5, 3], land), 2);
  assert.ok(!B.pointsBack(g.cfg, [5, 3], land, g.vulture));
  assert.ok(B.wrapDist(g.cfg, land, g.vulture) > T.hunterReach(g), 'a badger lands outside catch range when it can');
  assert.ok(!occupied3(g, land));
  assert.ok(!B.wrecked(g, land));
  assert.notDeepEqual(land, [6, 5]);
  assert.equal(egg.alive, true, 'an egg on the landing stays whole');
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'badger' }, null).room;
  room.g = g; room.bots = [];
  for (const s of ['blue', 'red', 'hunter']) room.players[s] = { ws: null, token: s };
  const hunter = S.view3(room, 'hunter'), vul = S.view3(room, 'red');
  assert.deepEqual(hunter.stoneNote.trails[0].points, vul.stoneNote.trails[0].points, 'every phone sees the stone shove');
  assert.deepEqual(hunter.ostrich, T.OFF);
  assert.deepEqual(vul.stoneNote.trails[0].points[0], [5, 3]);
  assert.deepEqual(vul.stoneNote.trails[0].points[vul.stoneNote.trails[0].points.length - 1], land);
}

{
  const g = play3('hyena', [5, 3], [8, 6], [4, 3]);
  g.turn = 'red'; g.stones = 1;
  assert.ok(T.vultureThrow3(g, [5, 3]));
  stoneOk(g.cfg, [5, 3], g.three.h, g.vulture);
  assert.ok(B.wrapDist(g.cfg, g.three.h, g.vulture) <= T.hunterReach(g), 'a hyena next to the vulture has no square outside reach 3');
}

{
  const g = H.newHunt();
  g.vulture = [4, 3]; g.ostrich = [8, 6]; g.hunt.hs.hyena.p = [5, 3]; g.hunt.hs.badger.p = [0, 0];
  g.turn = 'red'; g.stones = 1; g.phase = 'play';
  assert.ok(H.vultureThrowH(g, [5, 3]));
  stoneOk(g.cfg, [5, 3], g.hunt.hs.hyena.p, g.vulture);
  assert.notDeepEqual(g.hunt.hs.hyena.p, g.hunt.hs.badger.p);
  assert.notDeepEqual(g.hunt.hs.hyena.p, g.ostrich);
  assert.notDeepEqual(g.hunt.hs.hyena.p, g.vulture);
}

{
  const g = TT.newTeam(5, 'hyena', undefined, [5, 3]);
  g.turn = 'v1'; g.phase = 'play'; g.b.v1.pos = [4, 3]; g.b.v1.stones = 1; g.h.p = [5, 3];
  g.b.o1.pos = [0, 0]; g.b.o2.pos = [8, 6]; g.b.v2.pos = [0, 6];
  assert.ok(TT.vultureThrow(g, 'v1', [5, 3]));
  stoneOk(g.cfg, [5, 3], g.h.p, [4, 3]);
  for (const s of ['o1', 'o2', 'v1', 'v2']) assert.notDeepEqual(g.h.p, g.b[s].pos);
}

{
  const g = play3('hyena', [5, 3], [1, 1], [4, 3]);
  SIMPLE.arm(g); g.turn = 'red'; g.stones = 1;
  assert.ok(T.vultureThrow3(g, [5, 3]));
  assert.deepEqual(g.three.h, [7, 3], 'simple rules still slide straight');
}

console.log('PASS scatter kick and the double-turn notice');
process.exit(0);
