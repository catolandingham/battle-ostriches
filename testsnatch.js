// Brian, 2026-11-16: a vulture may fly onto a carrying ostrich, and a stone on a carrying ostrich is not kicked back.
// Both rules, in classic, 3 players, Hunters, 2 vs 2, and 5 players.
process.env.PORT = '0';
process.env.BO_NOSTORE = '1';
const assert = require('assert');
const B = require('./game');
const T = require('./three');
const H = require('./hunt');
const TT = require('./team');
const S = require('./server');
const CT = require('./public/catchtext');
const SUR = require('./public/surprise');
const CUT = require('./public/cutaways');
const R = require('./public/roles');
const K = B.key;
const has = (list, p) => (list || []).some(q => K(q) === K(p));
let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok', name); };

function eggs(g) { for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p)); }
function classicAt(o, v) {
  const g = B.newGame(); eggs(g); B.placeOstrich(g, [4, 2]);
  g.ostrich = o.slice(); g.vulture = v.slice(); g.turn = 'red'; g.phase = 'play'; return g;
}
function carry(g, id = 0) { g.carrying = id; g.eggs[id].pos = null; g.turn = 'red'; }
function threeAt(o, v, h) {
  const g = T.newGame3('hyena', undefined, h); eggs(g); assert.ok(T.placeOstrich3(g, [4, 2]));
  g.ostrich = o.slice(); g.vulture = v.slice(); g.three.h = h.slice(); g.turn = 'red'; g.phase = 'play'; return g;
}
function huntAt(o, v) {
  const g = H.newHunt(undefined, [[0, 0], [8, 6]]); eggs(g); assert.ok(H.placeOstrichH(g, [4, 2]));
  g.ostrich = o.slice(); g.vulture = v.slice(); g.hunt.hs.hyena.p = [0, 0]; g.hunt.hs.badger.p = [8, 6];
  g.turn = 'red'; g.phase = 'play'; return g;
}
function teamAt(np, o, v) {
  const g = TT.newTeam(np, np === 5 ? 'hyena' : null, undefined, [8, 6]);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TT.place(g, 'o1', p)); assert.ok(TT.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TT.place(g, 'o2', p)); assert.ok(TT.place(g, 'o2', [7, 1]));
  g.b.o1.pos = o.slice(); g.b.o2.pos = [7, 1]; g.b.v1.pos = v.slice(); g.b.v2.pos = [8, 0];
  if (g.h) { g.h.p = [8, 6]; g.h.kind = 'hyena'; }
  g.phase = 'play'; g.turn = 'v1'; return g;
}
function teamCarry(g, id = 0) { g.b.o1.carrying = id; g.eggs[id].pos = null; g.turn = 'v1'; }

ok('fly list includes a carrying ostrich and no other bird, in every engine', () => {
  const c = classicAt([4, 3], [4, 1]); assert.ok(!has(B.flyTargets(c), [4, 3])); carry(c); assert.ok(has(B.flyTargets(c), [4, 3]));
  const t = threeAt([4, 3], [4, 1], [0, 6]); assert.ok(!has(B.flyTargets(t), [4, 3])); carry(t); assert.ok(has(B.flyTargets(t), [4, 3])); assert.ok(!has(B.flyTargets(t), [0, 6]), 'a hunter that is up is still closed');
  const h = huntAt([4, 3], [4, 1]); assert.ok(!has(B.flyTargets(h), [4, 3])); carry(h); assert.ok(has(B.flyTargets(h), [4, 3]));
  for (const np of [4, 5]) {
    const g = teamAt(np, [3, 3], [3, 1]); assert.ok(!has(TT.flyTargets(g, 'v1'), [3, 3])); assert.ok(!has(TT.flyTargets(g, 'v1'), [8, 0]), 'the other vulture stays closed');
    teamCarry(g); assert.ok(has(TT.flyTargets(g, 'v1'), [3, 3])); assert.ok(!has(TT.flyTargets(g, 'v1'), [7, 1]), 'an ostrich that is not carrying stays closed');
  }
});

ok('flying onto a carrying ostrich drops the egg, finds it, bumps 2, and the vulture lands there', () => {
  const g = classicAt([4, 3], [4, 1]); carry(g); assert.ok(B.vultureFly(g, [4, 3]));
  assert.deepEqual(g.vulture, [4, 3]); assert.deepEqual(g.ostrich, [4, 5]); assert.equal(g.carrying, null);
  assert.deepEqual(g.eggs[0].pos, [4, 3]); assert.equal(g.eggs[0].alive, true); assert.equal(g.marks['4,3'], 'spotted');
  assert.equal(g.lastBump.moved, 2); assert.equal(g.turn, 'blue');
});

ok('the bump stops before a wreck, the edge, or an animal, and a stuck ostrich is not robbed', () => {
  const w = classicAt([4, 3], [4, 1]); carry(w); w.marks['4,5'] = 'stone'; assert.ok(B.vultureFly(w, [4, 3]));
  assert.deepEqual(w.ostrich, [4, 4]); assert.equal(w.lastBump.moved, 1); assert.equal(w.marks['4,3'], 'spotted');
  const edge = classicAt([4, 6], [4, 4]); carry(edge); assert.ok(B.vultureFly(edge, [4, 6]));
  assert.deepEqual(edge.ostrich, [4, 6], 'the edge stops the bump before it starts'); assert.deepEqual(edge.vulture, [4, 5], 'the vulture steps back 1');
  assert.ok(!edge.lastBump); assert.notEqual(edge.marks['4,6'], 'spotted'); assert.deepEqual(edge.eggs[0].pos, [4, 6], 'the usual set down still happens');
  const blocked = threeAt([4, 3], [4, 1], [4, 4]); carry(blocked); assert.ok(T.vultureFly3(blocked, [4, 3]));
  assert.deepEqual(blocked.ostrich, [4, 3]); assert.deepEqual(blocked.vulture, [4, 2]); assert.ok(!blocked.lastBump);
  const stop = threeAt([4, 3], [4, 1], [4, 5]); carry(stop); assert.ok(T.vultureFly3(stop, [4, 3]));
  assert.deepEqual(stop.ostrich, [4, 4], 'stops before the hunter'); assert.deepEqual(stop.three.h, [4, 5]); assert.equal(stop.marks['4,3'], 'spotted');
});

function expectSnatch(where, fly) {
  assert.deepEqual(where(), [4, 5]); assert.equal(fly.marks['4,3'], 'spotted'); assert.equal(fly.carrying, null); assert.deepEqual(fly.eggs[0].pos, [4, 3]);
}
ok('3 players, Hunters, 2 vs 2, and 5 players all snatch the same way', () => {
  const t = threeAt([4, 3], [4, 1], [0, 6]); carry(t); assert.ok(T.vultureFly3(t, [4, 3])); expectSnatch(() => t.ostrich, t); assert.deepEqual(t.vulture, [4, 3]);
  const h = huntAt([4, 3], [4, 1]); carry(h); assert.ok(H.vultureFlyH(h, [4, 3])); expectSnatch(() => h.ostrich, h); assert.deepEqual(h.vulture, [4, 3]);
  for (const np of [4, 5]) {
    const g = teamAt(np, [3, 3], [3, 1]); teamCarry(g); assert.ok(TT.vultureFly(g, 'v1', [3, 3]));
    assert.deepEqual(g.b.v1.pos, [3, 3]); assert.deepEqual(g.b.o1.pos, [3, 5]); assert.equal(g.b.o1.carrying, null);
    assert.deepEqual(g.eggs[0].pos, [3, 3]); assert.equal(g.marks['3,3'], 'spotted'); assert.equal(g.lastBump.target, 'o1');
  }
});

function expectHit(g, ostrich) {
  assert.equal(g.lastAction.result, 'hit'); assert.equal(g.lastAction.kickedBack, false);
  assert.equal(g.eggs[0].alive, false); assert.deepEqual(g.eggs[0].pos, ostrich); assert.equal(g.marks[K(ostrich)], 'hit');
  assert.equal(g.lastStone.text, "The vulture's stone hit the ostrich.");
}
ok('a stone on a carrying ostrich breaks the egg and pushes; a stone on any other ostrich is still kicked back', () => {
  const g = classicAt([4, 3], [4, 2]); carry(g); g.stones = 1; assert.equal(B.vultureThrow(g, [4, 3]), 'hit');
  expectHit(g, [4, 3]); assert.deepEqual(g.ostrich, [4, 5]); assert.equal(g.carrying, null); assert.deepEqual(g.vulture, [4, 2]);
  const back = classicAt([4, 3], [4, 2]); back.stones = 1; assert.equal(B.vultureThrow(back, [4, 3]), 'bounce');
  assert.equal(back.lastStone.text, 'The ostrich kicked the stone right back!'); assert.equal(back.eggs[0].alive, true);
  const t = threeAt([4, 3], [4, 2], [0, 6]); carry(t); t.stones = 1; assert.ok(T.vultureThrow3(t, [4, 3])); expectHit(t, [4, 3]); assert.deepEqual(t.ostrich, [4, 5]);
  const hn = huntAt([4, 3], [4, 2]); carry(hn); hn.stones = 1; assert.ok(H.vultureThrowH(hn, [4, 3])); expectHit(hn, [4, 3]); assert.deepEqual(hn.ostrich, [4, 5]);
  for (const np of [4, 5]) {
    const tm = teamAt(np, [3, 2], [3, 1]); teamCarry(tm); tm.b.v1.stones = 1; assert.equal(TT.vultureThrow(tm, 'v1', [3, 2]), 'hit');
    assert.equal(tm.eggs[0].alive, false); assert.equal(tm.marks['3,2'], 'hit'); assert.deepEqual(tm.b.o1.pos, [3, 4]); assert.equal(tm.b.o1.carrying, null);
    assert.equal(tm.lastAction.kickedBack, false); assert.equal(tm.lastStone.targets[0], 'ostrich'); assert.equal(tm.lastStone.trails[0].key, 'o1');
    const plain = teamAt(np, [3, 2], [3, 1]); plain.b.v1.stones = 1; assert.equal(TT.vultureThrow(plain, 'v1', [3, 2]), 'bounce');
  }
});

ok('the found egg is on the teammate vulture view, and the fly square is offered only while carrying', () => {
  const room = S.createT({ team: 4, role: 'o1', bots: ['v1', 'v2', 'o2'] }, null).room;
  room.g = teamAt(4, [3, 3], [3, 1]); teamCarry(room.g);
  const before = S.viewT(room, 'v1'); assert.ok(has(before.fly, [3, 3])); assert.equal(before.marks['3,3'], undefined);
  assert.ok(TT.vultureFly(room.g, 'v1', [3, 3]));
  const v1 = S.viewT(room, 'v1'), v2 = S.viewT(room, 'v2'), o1 = S.viewT(room, 'o1');
  assert.equal(v1.marks['3,3'], 'spotted'); assert.equal(v2.marks['3,3'], 'spotted', 'teammates share found eggs');
  assert.equal(o1.bumpNote.to[0], 3); assert.equal(v2.bumpNote.by, 'v1');
  const hunter = S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind: 'hyena' }, null).room;
  hunter.g = teamAt(5, [3, 3], [3, 1]); teamCarry(hunter.g); assert.ok(TT.vultureFly(hunter.g, 'v1', [3, 3]));
  const hv = S.viewT(hunter, 'hunter'); assert.equal(hv.bumpNote.seq, 1); assert.equal(hv.bumpNote.to, null, 'a hunter is not shown the bird squares');
});

ok('the bump is a surprise for the ostrich, with a cartoon, a reading pause, and no tap', () => {
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
  room.g = threeAt([4, 3], [4, 1], [0, 6]); carry(room.g);
  const prev = { blue: S.view3(room, 'blue'), red: S.view3(room, 'red'), hunter: S.view3(room, 'hunter') };
  assert.ok(has(prev.red.fly, [4, 3]));
  assert.ok(T.vultureFly3(room.g, [4, 3]));
  const blue = S.view3(room, 'blue'), red = S.view3(room, 'red'), hunter = S.view3(room, 'hunter');
  const hit = SUR.policy(blue, prev.blue), actor = SUR.policy(red, prev.red), watch = SUR.policy(hunter, prev.hunter);
  assert.ok(hit.affected && hit.lookout && !hit.actor);
  assert.equal(hit.lookoutLine, 'Look out!');
  assert.equal(hit.line, 'The vulture bumped you off your egg!');
  assert.equal(hit.readMs, SUR.holdFor(hit.line));
  assert.ok(hit.readMs >= 1000);
  assert.equal(hit.motionDelay, SUR.LOOKOUT_MS + SUR.CARTOON_MS);
  assert.equal(SUR.GO_LINE, undefined);
  assert.ok(actor.actor && !actor.lookout && !actor.affected);
  assert.equal(actor.line, '');
  assert.equal(CUT.sceneFor(blue, prev.blue).id, 'kick-vulture');
  assert.equal(CUT.sceneFor(red, prev.red).id, 'kick-vulture');
  assert.equal(CUT.sceneFor(hunter, prev.hunter), null);
  assert.ok(!watch || !watch.lookout);
  assert.equal(CT.viewerEvent({ kind: 'bump' }, red), 'You bumped the ostrich and found the egg!');
  assert.equal(CT.viewerEvent({ kind: 'bump' }, hunter), 'The vulture bumped the ostrich!');
  const mate = { role: 'red', h3: { team: true, mySeat: 'v2' }, bumpNote: blue.bumpNote };
  mate.bumpNote = Object.assign({}, blue.bumpNote, { by: 'v1', target: 'o1' });
  assert.equal(CT.viewerEvent({ kind: 'bump' }, { role: 'blue', h3: { team: true, mySeat: 'o1' }, bumpNote: mate.bumpNote }), 'Vulture 1 bumped you off your egg!');
  assert.equal(CT.viewerEvent({ kind: 'bump' }, { role: 'red', h3: { team: true, mySeat: 'v1' }, bumpNote: mate.bumpNote }), 'You bumped Ostrich 1 and found the egg!');
  assert.equal(CT.viewerEvent({ kind: 'bump' }, { role: 'red', h3: { team: true, mySeat: 'v2' }, bumpNote: mate.bumpNote }), 'Vulture 1 bumped Ostrich 1 and found the egg!');
  assert.equal(CT.viewerEvent({ kind: 'bump' }, { role: 'hunter', h3: { team: true, mySeat: 'hunter', kind: 'hyena' }, kind: 'hyena', bumpNote: mate.bumpNote }), 'Vulture 1 bumped Ostrich 1!');
  assert.equal(SUR.clockDelayMs(hit, { isCurrent: true, seesEvent: true }), hit.animMs + hit.readMs);
});

ok('role cards name the landing, and only the bird cards change id', () => {
  for (const mode of ['2', '3', '4', '4h', '5']) {
    const kind = mode === '4h' ? null : 'hyena';
    const o = R.roleCard(mode === '4' || mode === '5' ? 'o1' : 'blue', kind, mode);
    const v = R.roleCard(mode === '4' || mode === '5' ? 'v1' : 'red', kind, mode);
    assert.ok(o.lines.includes('A vulture may land on you only while you carry. The egg drops and is found.'), mode);
    assert.ok(v.lines.includes('You may land on an ostrich that is carrying. The egg drops and you find it.'), mode);
    assert.ok(o.id.endsWith('_c') && v.id.endsWith('_c'), mode);
  }
  assert.equal(R.cardId('hunter', 'hyena', '3'), 'hyena__3_r5');
});

S.close();
console.log('PASS testsnatch (' + n + ' groups)');
