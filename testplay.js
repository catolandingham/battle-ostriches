// Action ring choices, god-view visibility, and the default-on turn timer. node testplay.js
process.env.PORT = process.env.PORT || '3971';
const assert = require('assert');
const B = require('./game.js'), T = require('./three.js'), HU = require('./hunt.js'), TT = require('./team.js');
const R = require('./public/ring.js');
const S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const ids = a => a.map(x => x.id);

ok('ring: Step and Fly can be selected, and the squares still do the move', () => {
  assert.deepEqual(ids(R.legalActions(null)), []);
  assert.deepEqual(ids(R.legalActions({ phase: 'play', myTurn: false, role: 'blue', onEgg: true, can: { sit: true, carry: true } })), []);
  assert.deepEqual(ids(R.legalActions({ phase: 'setupEggs', myTurn: true, role: 'blue' })), []);
  assert.deepEqual(ids(R.legalActions({ phase: 'play', myTurn: true, god: true, role: 'blue', onEgg: true, can: { sit: true, carry: true } })), []);
  const step = R.legalActions({ phase: 'play', myTurn: true, role: 'blue', onEgg: false, moves: [[1, 1]], cfg: { maxSit: 3 }, can: { sit: false, carry: false } });
  assert.deepEqual(ids(step), ['step']);
  assert.equal(step[0].label, 'Step');
  const back = R.legalActions({ phase: 'play', myTurn: true, role: 'blue', onEgg: true, moves: [[1, 1]], cfg: { maxSit: 3 }, can: { sit: true, carry: true } }, 'carry');
  assert.deepEqual(ids(back), ['step', 'carry', 'sit']);
  const on = R.legalActions({ phase: 'play', myTurn: true, role: 'blue', onEgg: true, moves: [[1, 1]], cfg: { maxSit: 3 }, sitRun: 3, mustLeave: true, can: { sit: false, carry: true } });
  assert.deepEqual(ids(on), ['step', 'carry']);
  assert.ok(on.every(a => a.enabled));
  assert.match(R.omittedNotes({ phase: 'play', myTurn: true, role: 'blue', mustLeave: true })[0], /step off/i);
  const vul = R.legalActions({ phase: 'play', myTurn: true, role: 'red', stones: 0, cfg: { vultureFly: 2, stones: 1 }, fly: [[1, 1]] });
  assert.deepEqual(ids(vul), ['fly']);
  assert.match(R.omittedNotes({ phase: 'play', myTurn: true, role: 'red', stones: 0 })[0], /rock pile/i);
  const full = R.legalActions({ phase: 'play', myTurn: true, role: 'red', stones: 1, cfg: { vultureFly: 2, stones: 1 } });
  assert.deepEqual(ids(full), ['fly', 'throw']);
  const aimed = R.legalActions({ phase: 'play', myTurn: true, role: 'red', stones: 1, cfg: { vultureFly: 2, stones: 1 } }, 'throw');
  assert.deepEqual(ids(aimed), ['fly', 'throw']);
  const pounce = R.legalActions({ phase: 'play', myTurn: true, role: 'hunter', pounce: true, h3: { kind: 'hyena' } });
  assert.deepEqual(ids(pounce), ['hstay']); assert.match(pounce[0].detail, /catch/i);
  const dig = R.legalActions({ phase: 'play', myTurn: true, role: 'hunter', h3: { kind: 'badger' }, dig: 1 });
  assert.equal(dig[0].label, 'Finish'); assert.match(dig[0].detail, /tough ground/i);
  for (const item of back.concat(on, full, aimed, pounce, dig)) assert.equal(item.enabled, true);
  assert.equal(R.showSniffPop(true, false, false), false);
  assert.equal(R.showSniffPop(true, true, false), true);
  assert.equal(R.showSniffPop(true, false, true), true);
  assert.equal(R.showSniffPop(false, false, false), true);
});

ok('compass names the grid, including diagonals, with north toward the top', () => {
  assert.equal(R.bearing(0, -1).name, 'north'); assert.equal(R.bearing(0, -2).key, 'N');
  assert.equal(R.bearing(0, 1).name, 'south'); assert.equal(R.bearing(1, 0).name, 'east');
  assert.equal(R.bearing(-1, 0).name, 'west');
  assert.equal(R.bearing(-2, -2).name, 'northwest'); assert.equal(R.bearing(-2, -2).key, 'NW');
  assert.equal(R.bearing(2, -1).name, 'northeast'); assert.equal(R.bearing(2, -1).key, 'NE');
  assert.equal(R.bearing(1, 1).name, 'southeast'); assert.equal(R.bearing(-1, 1).name, 'southwest');
  assert.equal(R.bearing(0, 0).name, 'here');
  assert.equal(R.arrowGlyph(0, -1), '↑'); assert.equal(R.arrowGlyph(1, 1), '↘');
  assert.equal(R.nearestVisibleBird([4, 3], [{ name: 'ostrich', p: [-99, -99] }, { name: 'vulture', p: [8, 6] }], 2), null);
  const near = R.nearestVisibleBird([4, 3], [{ name: 'ostrich', p: [4, 4] }, { name: 'vulture', p: [6, 3] }], 2);
  assert.equal(near.name, 'ostrich'); assert.equal(near.arrow, '↓'); assert.equal(near.d, 1);
});

ok('turn timer defaults on and can be turned off without changing the stored rule', () => {
  assert.equal(R.timersShown(null, null), true);
  assert.equal(R.timersShown({}, undefined), true);
  assert.equal(R.timersShown({ showTimers: true }, null), true);
  assert.equal(R.timersShown({ showTimers: false }, null), false);
  assert.equal(R.timersShown({ showTimers: false }, '1'), true);
  assert.equal(R.timersShown({ showTimers: true }, '0'), false);
  const room = { code: 'ZZZZ', g: B.newGame(), players: { blue: {}, red: null } };
  assert.equal(S.view(room, 'blue').showTimers, true);
  assert.equal(S.timersOn(room), true);
  room.settings = { showTimers: false };
  assert.equal(S.view(room, 'blue').showTimers, false);
});

function setup3(kind = 'hyena', h = [8, 3]) {
  const g = T.newGame3(kind, undefined, h);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p));
  assert(T.placeOstrich3(g, [6, 5])); return g;
}

ok('3p: eliminated bird gets a read-only god view; living seats do not', () => {
  const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null);
  room.g = setup3('hyena', [0, 3]);
  assert.equal(S.view3(room, 'blue').showTimers, true);
  assert.equal(S.view3(room, 'blue').god, undefined);
  assert.equal(S.view3(room, 'red').h3.hunter, null);
  const hidden = S.view3(room, 'hunter'), hiddenJs = JSON.stringify(hidden);
  assert.deepEqual(hidden.ostrich, T.OFF); assert.deepEqual(hidden.vulture, T.OFF);
  assert.ok(!('eggs' in hidden)); assert.ok(!hiddenJs.includes('[6,5]') && !hiddenJs.includes('[2,1]'));
  room.g.hungerLeft = 1;
  assert(T.vultureFly3(room.g, [4, 1]));
  assert(T.ostrichAct3(room.g, 'step', [5, 5]));
  assert(T.isOut(room.g, 'blue')); assert.equal(room.g.phase, 'play');
  room.g.three.burrowed = true; room.g.three.h = [0, 3];
  const dead = S.view3(room, 'blue');
  assert.equal(dead.god, true); assert.equal(dead.myTurn, false);
  assert.deepEqual(dead.moves, []); assert.deepEqual(dead.carryMoves, []);
  assert.deepEqual(dead.can, { sit: false, carry: false });
  assert.deepEqual(dead.h3.hunter, [0, 3]); assert.equal(dead.h3.burrowed, true);
  assert.ok(dead.eggs.some(e => e.pos[0] === 2 && e.pos[1] === 1));
  assert.equal(S.act3(room, 'blue', { a: 'step', p: [5, 4] }), false);
  const red = S.view3(room, 'red');
  assert.ok(!red.god); assert.equal(red.h3.hunter, null); assert.ok(!red.eggs);
  const hunter = S.view3(room, 'hunter');
  assert.ok(!hunter.god); assert.ok(!('eggs' in hunter));
  assert.deepEqual(hunter.vulture, T.OFF); assert.deepEqual(hunter.ostrich, T.OFF);
  room.settings = { showTimers: false };
  assert.equal(S.view3(room, 'hunter').showTimers, false);
});

ok('3p: a living ostrich can still act', () => {
  const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null);
  room.g = setup3('hyena', [8, 3]);
  assert(T.vultureFly3(room.g, [4, 1]));
  assert.equal(room.g.turn, 'blue');
  assert.equal(S.act3(room, 'blue', { a: 'step', p: [5, 5] }), true);
  assert.equal(room.g.turn, 'hunter');
});

ok('5p: eliminated ostrich sees the burrowed hunter and the eggs; the living vulture does not', () => {
  const { room } = S.createT({ team: 5, role: 'o1', bots: ['v1', 'v2', 'o2', 'hunter'], kind: 'hyena' }, null);
  const g = room.g; g.phase = 'play'; g.turn = 'v1';
  g.b.o1.pos = [0, 0]; g.b.o2.pos = [2, 2]; g.b.v1.pos = [4, 2]; g.b.v2.pos = [4, 4];
  g.eggs.push({ id: 0, nest: 0, pos: [3, 3], alive: true, lastWarm: 0 });
  g.h.kind = 'hyena'; g.h.p = [8, 6]; g.h.burrowed = true;
  const before = S.viewT(room, 'o1');
  assert.ok(!before.god); assert.equal(before.h3.hunter, null); assert.equal(before.showTimers, true);
  g.b.o1.out = true; g.b.o1.why = 'caught'; g.b.o1.pos = TT.OFF.slice();
  const dead = S.viewT(room, 'o1');
  assert.equal(dead.god, true); assert.equal(dead.myTurn, false); assert.deepEqual(dead.moves, []);
  assert.deepEqual(dead.h3.hunter, [8, 6]); assert.equal(dead.h3.burrowed, true);
  assert.ok(dead.eggs.some(e => e.pos && e.pos[0] === 3 && e.pos[1] === 3));
  assert.equal(S.actT(room, 'o1', { a: 'step', p: [1, 0] }), false);
  const v = S.viewT(room, 'v1');
  assert.ok(!v.god); assert.equal(v.h3.hunter, null); assert.ok(!v.eggs);
  const hunter = S.viewT(room, 'hunter');
  assert.ok(!hunter.god); assert.deepEqual(hunter.ostrich, TT.OFF); assert.ok(!hunter.eggs);
});

ok('4h: eliminated vulture sees both hunters and the eggs; the living hyena does not', () => {
  const { room } = S.createH({ role: 'red', bots: ['blue', 'hyena', 'badger'] }, null);
  const g = room.g; g.phase = 'play'; g.turn = 'hyena';
  g.ostrich = [6, 5]; g.vulture = [4, 1];
  g.eggs = [{ id: 0, pos: [2, 1], alive: true, lastWarm: 0 }];
  g.hunt.hs.hyena.p = [0, 3]; g.hunt.hs.badger.p = [8, 6]; g.hunt.hs.badger.burrowed = true;
  const live = S.viewH(room, 'red');
  assert.ok(!live.god); assert.equal(live.showTimers, true);
  assert.deepEqual((live.h3.hunters || []).map(h => h.kind), []);
  g.hunt.birds.red.out = true; g.vulture = HU.OFF.slice();
  const dead = S.viewH(room, 'red');
  assert.equal(dead.god, true); assert.equal(dead.myTurn, false); assert.deepEqual(dead.fly, []); assert.deepEqual(dead.throw, []);
  assert.deepEqual(dead.h3.hunters.map(h => h.kind).sort(), ['badger', 'hyena']);
  assert.equal(dead.h3.hunters.find(h => h.kind === 'badger').burrowed, true);
  assert.ok(dead.eggs.some(e => e.pos[0] === 2 && e.pos[1] === 1));
  assert.equal(S.actH(room, 'red', { a: 'fly', p: [4, 2] }), false);
  const hy = S.viewH(room, 'hyena'), js = JSON.stringify(hy);
  assert.ok(!hy.god); assert.ok(!('eggs' in hy)); assert.deepEqual(hy.ostrich, HU.OFF);
  assert.ok(!js.includes('[6,5]')); assert.ok(!js.includes('[2,1]'));
});

ok('hunter near is a one-shot on entering sight, not while burrowed', () => {
  assert.deepEqual(R.hunterAlerts([], ['hyena']), ['hyena']);
  assert.deepEqual(R.hunterAlerts(['hyena'], ['hyena']), []);
  assert.deepEqual(R.hunterAlerts(['hyena'], []), []);
  assert.deepEqual(R.hunterAlerts([], ['badger']), ['badger']);
  assert.equal(R.hunterNearLabel('hyena'), 'HYENA NEAR');
  assert.equal(R.hunterNearLabel('badger'), 'HONEY BADGER NEAR');
  assert.ok(!/\d|north|east|south|west/i.test(R.hunterNearLabel('hyena') + R.hunterNearLabel('badger')));
  const bird = (extra) => Object.assign({ phase: 'play', role: 'blue', h3: { kind: 'hyena', hunter: null, burrowed: false, birds: { blue: { out: false } } } }, extra);
  assert.deepEqual(R.seenHunterKinds(bird()), []);
  assert.deepEqual(R.seenHunterKinds(bird({ h3: { kind: 'hyena', hunter: [2, 2], burrowed: false, birds: { blue: { out: false } } } })), ['hyena']);
  assert.deepEqual(R.seenHunterKinds(bird({ h3: { kind: 'badger', hunter: [2, 2], burrowed: true, birds: { blue: { out: false } } } })), []);
  assert.deepEqual(R.seenHunterKinds(bird({ god: true, h3: { kind: 'hyena', hunter: [2, 2], birds: { blue: { out: true } } } })), []);
  assert.deepEqual(R.seenHunterKinds({ phase: 'play', role: 'hunter', h3: { kind: 'badger', hunter: [2, 2], burrowed: true, birds: {} } }), []);
  const both = { phase: 'play', role: 'blue', h3: { hunt: true, hunters: [{ kind: 'hyena', p: [1, 1], me: false, burrowed: false }, { kind: 'badger', p: [8, 3], me: false, burrowed: true }], birds: { blue: { out: false } } } };
  assert.deepEqual(R.seenHunterKinds(both), ['hyena']);
});

ok('burrowed or digging badger still receives its own position', () => {
  const { room } = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'badger' }, null);
  room.g = T.newGame3('badger', undefined, [8, 3]);
  room.g.three.burrowed = false; room.g.three.dig = 1;
  let v = S.view3(room, 'hunter');
  assert.deepEqual(v.hunter, [8, 3]); assert.equal(v.dig, 1);
  room.g.three.burrowed = true; room.g.three.dig = 2;
  v = S.view3(room, 'hunter');
  assert.deepEqual(v.hunter, [8, 3]); assert.equal(v.burrowed, true); assert.deepEqual(v.h3.hunter, [8, 3]);
  const { room: h } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  h.g.phase = 'play'; h.g.hunt.hs.badger.p = [8, 3]; h.g.hunt.hs.badger.burrowed = true; h.g.hunt.hs.badger.dig = 2;
  const bv = S.viewH(h, 'badger');
  const me = bv.h3.hunters.find(x => x.kind === 'badger');
  assert.ok(me && me.me && me.burrowed); assert.deepEqual(me.p, [8, 3]); assert.deepEqual(bv.hunter, [8, 3]);
});

ok('an eliminated bird leaves the egg and no longer blocks a smash', () => {
  const stuck = T.newGame3('badger', undefined, [0, 3]);
  for (const p of [[6, 1], [2, 1], [2, 5]]) assert(B.placeEgg(stuck, p));
  assert(T.placeOstrich3(stuck, [6, 1]));
  stuck.three.birds.blue.out = true; stuck.turn = 'red'; stuck.vulture = [6, 2]; stuck.stones = 1;
  assert.equal(T.vultureThrow3(stuck, [6, 1]), 'hit');
  assert.ok(stuck.ostrich[0] < 0); assert.equal(stuck.eggs[0].alive, false);
  const ko = T.newGame3('badger', undefined, [6, 2]);
  for (const p of [[6, 1], [2, 1], [2, 5]]) assert(B.placeEgg(ko, p));
  assert(T.placeOstrich3(ko, [6, 1]));
  assert(T.vultureFly3(ko, [4, 1])); assert(T.ostrichAct3(ko, 'sit')); assert(T.hunterMove(ko, [6, 1]));
  assert.equal(ko.three.birds.blue.out, true); assert.ok(ko.ostrich[0] < 0); assert.equal(ko.turn, 'red');
  ko.vulture = [5, 1]; ko.stones = 1; assert.equal(T.vultureThrow3(ko, [6, 1]), 'hit');
  const live = T.newGame3('hyena', undefined, [0, 3]);
  for (const p of [[6, 1], [2, 1], [2, 5]]) assert(B.placeEgg(live, p));
  assert(T.placeOstrich3(live, [6, 1]));
  live.vulture = [6, 2]; live.stones = 1; assert.equal(B.vultureThrow(live, [6, 1]), 'bounce'); assert.equal(live.eggs[0].alive, true);
  const starved = T.newGame3('hyena', undefined, [0, 3]);
  for (const p of [[6, 1], [2, 1], [2, 5]]) assert(B.placeEgg(starved, p));
  assert(T.placeOstrich3(starved, [6, 1])); starved.hungerLeft = 1;
  assert(T.vultureFly3(starved, [4, 1])); assert(T.ostrichAct3(starved, 'sit'));
  assert.equal(starved.three.birds.blue.why, 'starved'); assert.ok(starved.ostrich[0] < 0);
  for (let i = 0; i < 4 && starved.turn !== 'red'; i++) T.timeout(starved);
  starved.vulture = [5, 1]; starved.stones = 1; assert.equal(starved.turn, 'red');
  assert.equal(T.vultureThrow3(starved, [6, 1]), 'hit');
  const team = TT.newTeam(4);
  team.phase = 'play'; team.turn = 'v1';
  team.b.o1.pos = [6, 1]; team.b.o1.out = true; team.b.o2.pos = [1, 1];
  team.b.v1.pos = [6, 2]; team.b.v1.stones = 1; team.b.v2.pos = [4, 4];
  team.eggs.push({ id: 0, nest: 0, pos: [6, 1], alive: true, lastWarm: 0 });
  assert.equal(TT.vultureThrow(team, 'v1', [6, 1]), 'hit'); assert.ok(team.b.o1.pos[0] < 0);
});

ok('lobby clock off hides the timer and is not turned back on here', () => {
  assert.equal(R.timersShown({ showTimers: true, clockStopped: true }, '1'), false);
  const room = { code: 'ZZZZ', g: B.newGame(), players: { blue: {}, red: null }, clock: false };
  const v = S.view(room, 'blue');
  assert.equal(v.showTimers, false); assert.equal(v.clockStopped, true);
});

console.log(n + ' gameplay UI tests passed');
S.close();
process.exit(0);
