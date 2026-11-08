// Unit tests: the next-step cue (public/nextstep.js). It appears only when that step really is next, it is one thing at a time,
// and it is computed from the player's own view only, so it can never point at hidden information. node teststep.js
const assert = require('assert'), NS = require('./public/nextstep.js'), B = require('./game.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG, key = p => p[0] + ',' + p[1];
const vul = (o = {}) => Object.assign({ role: 'red', phase: 'play', myTurn: true, cfg: C, vulture: [4, 3], stones: 1, marks: {}, fly: [[3, 2], [4, 2], [5, 2], [3, 3], [5, 3], [3, 4], [4, 4], [5, 4], [2, 3], [6, 3], [4, 1], [4, 5]], throw: [[4, 3], [3, 2], [4, 2], [5, 2], [3, 3], [5, 3], [3, 4], [4, 4], [5, 4]] }, o);
const ost = (o = {}) => Object.assign({ role: 'blue', phase: 'play', myTurn: true, cfg: C, ostrich: [4, 3], hungerLeft: 12, eggs: [{ pos: [1, 1], alive: true, coldIn: 14 }, { pos: [6, 2], alive: true, coldIn: 9 }], moves: [] }, o);

ok('vulture with a stone and a found egg in throw range: the egg square is the target and the Throw button pulses', () => {
  const r = NS.compute(vul({ marks: { '5,3': 'spotted' } }));
  assert.equal(r.kind, 'throw'); assert.deepEqual(r.targets, ['5,3']); assert.equal(r.button, 'throw');
});
ok('vulture standing on its found egg: its own square is the target', () => {
  const r = NS.compute(vul({ marks: { '4,3': 'spotted' } })); assert.deepEqual(r.targets, ['4,3']); assert.equal(r.button, 'throw');
});
ok('vulture with a stone and a found egg out of range: moves toward it are bolder, nothing else', () => {
  const r = NS.compute(vul({ marks: { '8,3': 'spotted' } })); assert.equal(r.kind, 'to-egg'); assert.equal(r.button, null);
  assert.deepEqual(r.toward, ['6,3']); assert.deepEqual(r.targets, ['8,3']);
});
ok('vulture with a stone and no found egg: no cue (it must not point at a guess)', () => {
  const r = NS.compute(vul()); assert.equal(r.kind, null); assert.deepEqual(r.targets, []); assert.deepEqual(r.toward, []); assert.equal(r.button, null);
  // a sniff result is a maybe, not a find
  assert.equal(NS.compute(vul({ sniff: { p: [4, 3], yes: true, round: 1 } })).kind, null);
});
ok('vulture with no stone: both rock piles pulse and the moves toward the nearest one are bolder', () => {
  const r = NS.compute(vul({ stones: 0, vulture: [4, 3], fly: [[4, 2], [4, 4], [3, 3], [5, 3]] }));
  assert.equal(r.kind, 'rocks'); assert.deepEqual(r.targets.sort(), C.rocks.map(key).sort());
  assert.ok(r.toward.length >= 1 && r.toward.every(k => k.split(',').map(Number)[1] !== 3 || true));
  // the bolder moves really are the ones closest to the nearest rock pile
  const near = C.rocks.slice().sort((a, b) => Math.max(Math.abs(a[0] - 4), Math.abs(a[1] - 3)) - Math.max(Math.abs(b[0] - 4), Math.abs(b[1] - 3)))[0];
  const d = k => { const p = k.split(',').map(Number); return Math.max(Math.abs(p[0] - near[0]), Math.abs(p[1] - near[1])); };
  const all = [[4, 2], [4, 4], [3, 3], [5, 3]].map(key), best = Math.min(...all.map(d));
  assert.deepEqual(r.toward.slice().sort(), all.filter(k => d(k) === best).sort());
});
ok('the cue is silent when it is not your turn, in setup, in the end screen and in the watcher view', () => {
  for (const o of [{ myTurn: false }, { phase: 'setupEggs' }, { phase: 'over' }, { god: true }]) { const r = NS.compute(vul(Object.assign({ stones: 0 }, o))); assert.equal(r.kind, null); assert.deepEqual(r.targets, []); }
});
ok('the vulture cue never names a hidden egg or the ostrich: it only ever uses found squares, rocks and its own legal squares', () => {
  const hidden = { eggs: [{ pos: [5, 3], alive: true }], ostrich: [6, 3], h3: { hunter: [2, 2] } }; // fields a vulture view never carries; if they leaked, they must not matter
  for (let t = 0; t < 40; t++) {
    const v = vul(Object.assign({ stones: t % 2, marks: t % 3 === 0 ? { '5,3': 'spotted' } : {} }, hidden)), r = NS.compute(v);
    const allowed = new Set([...Object.keys(v.marks), ...C.rocks.map(key)]);
    for (const k of r.targets) assert.ok(allowed.has(k), 'target ' + k + ' is not a found egg or a rock pile');
    const legal = new Set(v.fly.map(key)); for (const k of r.toward) assert.ok(legal.has(k), 'toward ' + k + ' is not a legal fly square');
    if (!Object.keys(v.marks).length && v.stones >= 1) assert.deepEqual(r.targets, []);
  }
});
ok('ostrich: nothing pulses while every egg and its hunger are comfortable', () => {
  const r = NS.compute(ost()); assert.equal(r.kind, null); assert.deepEqual(r.targets, []);
});
ok('ostrich: the lowest egg pulses once it is low, and an egg under the ostrich does not', () => {
  let r = NS.compute(ost({ eggs: [{ pos: [1, 1], alive: true, coldIn: 4 }, { pos: [6, 2], alive: true, coldIn: 2 }] }));
  assert.equal(r.kind, 'egg'); assert.deepEqual(r.targets, ['6,2']);
  r = NS.compute(ost({ ostrich: [6, 2], eggs: [{ pos: [1, 1], alive: true, coldIn: 4 }, { pos: [6, 2], alive: true, coldIn: 2 }] }));
  assert.deepEqual(r.targets, ['1,1']); // standing on the lowest one: it is being warmed, the next one is next
  r = NS.compute(ost({ eggs: [{ pos: [1, 1], alive: true, coldIn: 4 }, { pos: null, alive: true, coldIn: 1, carried: true }] }));
  assert.deepEqual(r.targets, ['1,1']); // a carried egg has no square
  r = NS.compute(ost({ eggs: [{ pos: [1, 1], alive: false, coldIn: 0 }, { pos: [6, 2], alive: true, coldIn: 8 }] })); assert.equal(r.kind, null);
});
ok('ostrich: the leaf pulses when hunger is low, and the more urgent of egg and leaf wins (one cue at a time)', () => {
  let r = NS.compute(ost({ hungerLeft: 2 })); assert.equal(r.kind, 'leaf'); assert.equal(r.targets.length, 1); assert.ok(C.foods.map(key).includes(r.targets[0]));
  r = NS.compute(ost({ hungerLeft: 3, eggs: [{ pos: [1, 1], alive: true, coldIn: 2 }] })); assert.equal(r.kind, 'egg');
  r = NS.compute(ost({ hungerLeft: 1, eggs: [{ pos: [1, 1], alive: true, coldIn: 4 }] })); assert.equal(r.kind, 'leaf');
  assert.equal(NS.compute(ost({ hungerLeft: 1, ostrich: C.foods[0] })).kind, null); // already on the leaf
});
ok('ostrich cue never uses the vulture: nothing in it depends on where the vulture is', () => {
  const a = NS.compute(ost({ eggs: [{ pos: [1, 1], alive: true, coldIn: 3 }], vulture: [1, 1] })), b = NS.compute(ost({ eggs: [{ pos: [1, 1], alive: true, coldIn: 3 }], vulture: [8, 6] }));
  assert.deepEqual(a, b);
});
ok('badger buried with a bird next to it: a ring on that bird; the hyena with a bird near: the area it may be in pulses', () => {
  let r = NS.compute({ role: 'hunter', phase: 'play', myTurn: true, cfg: C, burrowed: true, seenBirds: [{ p: [3, 3], type: 'o' }], h3: { senseRange: 2 }, hunter: [4, 3], hmoves: [] });
  assert.equal(r.kind, 'ambush'); assert.deepEqual(r.targets, ['3,3']);
  r = NS.compute({ role: 'hunter', phase: 'play', myTurn: true, cfg: C, burrowed: false, sense: true, h3: { senseRange: 2 }, hunter: [4, 3], hmoves: [] }); assert.equal(r.kind, 'area'); assert.deepEqual(r.targets, []);
  r = NS.compute({ role: 'hunter', phase: 'play', myTurn: true, cfg: C, sense: false, h3: { senseRange: 2 }, hunter: [4, 3], hmoves: [] }); assert.equal(r.kind, null); // nothing sensed: no cue
  r = NS.compute({ role: 'hunter', phase: 'play', myTurn: true, cfg: C, burrowed: false, seenBirds: [{ p: [3, 3], type: 'o' }], hunter: [4, 3] }); assert.equal(r.kind, null); // not buried: the ambush ring is for a buried badger only
});
console.log(`PASS teststep (${n} groups)`); process.exit(0);
