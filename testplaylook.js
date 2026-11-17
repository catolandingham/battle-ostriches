// Playtest visuals, rules side: a throw keeps the last landing's "may be here" copy and does not
// refresh it, tell it again, or hand it to the computer vulture or to a hunter.
process.env.PORT = '0';
process.env.BO_NOSTORE = '1';
const assert = require('assert'), B = require('./game.js'), AI = require('./ai.js'), T = require('./three.js'), TT = require('./team.js'), S = require('./server.js');
const { make } = require('./tests/hunter-fixtures');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
function fresh() {
  const g = B.newGame();
  assert.ok(B.placeEgg(g, [6, 2])); assert.ok(B.placeEgg(g, [2, 2])); assert.ok(B.placeEgg(g, [2, 5]));
  assert.ok(B.placeOstrich(g, [0, 6]));
  g.hungerLeft = 10; g.eggs.forEach(e => { e.lastWarm = g.round; });
  return g;
}
ok('a throw keeps the last yes-landing and does not read the eggs again', () => {
  const g = fresh();
  assert.ok(B.vultureFly(g, [5, 3]));
  assert.equal(g.sniff.yes, true); assert.deepEqual(g.sniff.p, [5, 3]);
  assert.deepEqual(g.sniffKeep, { p: [5, 3], yes: true, round: g.sniff.round });
  const snap = JSON.parse(JSON.stringify(g.sniffKeep));
  assert.ok(B.ostrichStep(g, [0, 5]));
  assert.equal(g.turn, 'red'); assert.deepEqual(g.sniffKeep, snap); assert.equal(g.sniff.yes, true);
  assert.equal(B.vultureThrow(g, [5, 3]), 'miss');
  assert.equal(g.sniff, null, 'the live sense is still cleared, so the bot and the announcement do not see it');
  assert.deepEqual(g.sniffKeep, snap);
  assert.equal(AI.redView(g).sniff, null);
  assert.equal(Object.prototype.hasOwnProperty.call(AI.redView(g), 'sniffKeep'), false);
  assert.equal(B.sniffAnnounce(AI.redView(g), 'red'), '');
  g.eggs[0].pos = [0, 2];
  assert.equal(B.smellsEgg(g, [5, 3]), false, 'the egg has left the neighborhood');
  assert.deepEqual(g.sniffKeep, snap, 'the kept landing is not recomputed');
  const shown = B.outlineSniff({ phase: 'play', sniff: null, sniffKeep: g.sniffKeep, vulture: g.vulture.slice(), marks: {} });
  assert.deepEqual(shown.p, [5, 3]); assert.equal(shown.yes, true);
  const room = { g, players: { blue: {}, red: {} }, code: 'LOOK' };
  const before = JSON.parse(JSON.stringify(S.view(room, 'red').sniffKeep));
  g.eggs[0].pos = [8, 2];
  const after = S.view(room, 'red');
  assert.equal(after.sniff, null); assert.deepEqual(after.sniffKeep, before);
  assert.equal(S.view(room, 'blue').sniffKeep.yes, true, 'the ostrich already had this landing');
  assert.ok(B.ostrichStep(g, [1, 5]));
  const far = B.flyTargets(g).find(p => !B.smellsEgg(g, p) && !B.eggAt(g, p));
  assert.ok(far, 'a later landing with no egg');
  assert.ok(B.vultureFly(g, far));
  assert.equal(g.sniff.yes, false); assert.equal(g.sniffKeep, null, 'the next landing replaces the outlines');
  assert.equal(B.outlineSniff({ phase: 'play', sniff: g.sniff, sniffKeep: { p: [5, 3], yes: true, round: 1 }, vulture: g.vulture, marks: {} }), null);
});
ok('a find and a no-landing draw no neighborhood, and a stale yes does not override a live no', () => {
  const found = fresh(); assert.ok(B.vultureFly(found, [6, 2]));
  assert.equal(found.marks['6,2'], 'spotted'); assert.equal(found.sniffKeep, null);
  assert.equal(B.outlineSniff({ phase: 'play', sniff: found.sniff, vulture: found.vulture, marks: found.marks }), null);
  const no = fresh(); assert.ok(B.vultureFly(no, [4, 5]));
  assert.equal(no.sniff.yes, false); assert.equal(no.sniffKeep, null);
  assert.equal(B.outlineSniff({ phase: 'play', sniff: { p: [1, 1], yes: false, round: 1 }, sniffKeep: { p: [4, 4], yes: true, round: 1 }, vulture: [1, 1], marks: {} }), null);
});
ok('2 vs 2 keeps each vulture\'s landing across that vulture\'s throw', () => {
  const g = TT.newTeam(4);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TT.place(g, 'o1', p)); assert.ok(TT.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TT.place(g, 'o2', p)); assert.ok(TT.place(g, 'o2', [7, 1]));
  assert.equal(g.turn, 'v1'); assert.ok(TT.vultureFly(g, 'v1', [3, 2]));
  assert.equal(g.sniffs.v1.yes, true); assert.deepEqual(g.sniffKeeps.v1.p, [3, 2]);
  const snap = JSON.parse(JSON.stringify(g.sniffKeeps.v1));
  g.turn = 'v1';
  assert.equal(TT.vultureThrow(g, 'v1', [3, 2]), 'miss');
  assert.equal(g.sniffs.v1, null); assert.deepEqual(g.sniffKeeps.v1, snap);
  const room = S.createT({ team: 4, role: 'o1', bots: ['v1', 'v2', 'o2'] }, null).room; room.g = g;
  assert.deepEqual(S.viewT(room, 'v1').sniffKeep, snap); assert.equal(S.viewT(room, 'v1').sniff, null);
  assert.equal(S.viewT(room, 'o1').sniffKeep, null); assert.equal(S.viewT(room, 'v2').sniffKeep, null);
});
ok('a hunter is not sent the vulture\'s kept landing', () => {
  const f = make(S, '3p'), g = f.g;
  g.turn = 'red'; g.vulture = [4, 3]; g.stones = 1; g.ostrich = [0, 6];
  assert.ok(T.vultureFly3(g, [5, 1])); assert.equal(g.sniff.yes, true); assert.equal(g.sniffKeep.yes, true);
  g.turn = 'red'; g.stones = 1;
  assert.ok(T.vultureThrow3(g, g.vulture.slice()));
  assert.equal(g.sniff, null); assert.deepEqual(g.sniffKeep.p, [5, 1]);
  const hunter = f.view('hunter'), red = f.view('red');
  assert.equal(hunter.sniff, null); assert.equal(hunter.sniffKeep, undefined);
  assert.equal(JSON.stringify(hunter).includes('"sniffKeep"'), false);
  assert.equal(JSON.stringify(hunter).includes('[5,1]'), false);
  assert.equal(red.sniff, null); assert.deepEqual(red.sniffKeep.p, [5, 1]);
});
S.close();
console.log(n + ' playtest visual checks');
process.exit(0);
