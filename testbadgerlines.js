// Unit tests: the honey badger's quotes (public/badgerlines.js): the words, the event -> line mapping, the rotation, and who may see each line.
// node testbadgerlines.js
process.env.PORT = 0;
const assert = require('assert'), BL = require('./public/badgerlines.js'), CT = require('./public/catchtext.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };

ok('the words are Brian\'s, exactly', () => {
  assert.equal(BL.LINES.ambush, "Honey badger don't care.");
  assert.equal(BL.LINES.openCatch, "Nothing can stop the honey badger when it's hungry.");
  assert.equal(BL.LINES.walkIn, 'Thanks for the treat, stupid birds!');
  assert.equal(BL.LINES.popOut, "Look at it run in slow-motion, it's pretty badass.");
  assert.equal(BL.LINES.firstBurrow, 'The honey badger has been referred to by the Guinness Book of World Records as the most fearless animal in all of the animal kingdom.');
  assert.deepEqual(BL.LINES.rotate, ["Honey badger don't care.", 'Look at this nasty badass.']);
  assert.equal(BL.LINES.sight, "Nothing can stop the honey badger when it's hungry.");
  assert.equal(BL.LINES.shove, "Look! It's chasing a jackal! ... Honey badger doesn't care, it doesn't give a sh*t, it just takes what it wants.");
  assert.equal(BL.LINES.win, 'Look at this nasty badass.');
  const all = [].concat(...Object.values(BL.LINES)); assert.equal(all.filter(l => /sh\*t/.test(l)).length, 1, 'the sh*t words appear only in the shove line'); });

ok('catch lines: ambush, walk-in and open catch each get their own quote, for every viewer, only for the badger', () => {
  const lc = o => Object.assign({ bird: 'blue', ko: false, seq: 1, round: 2 }, o);
  assert.equal(BL.catchTail(lc({ ambush: true })), BL.LINES.ambush); assert.equal(BL.catchTail(lc({ walked: true })), BL.LINES.walkIn); assert.equal(BL.catchTail(lc()), BL.LINES.openCatch);
  for (const viewer of ['blue', 'red', 'hunter', 'hyena']) {
    assert.ok(CT.catchLine(lc({ ambush: true }), viewer, 'badger', 1).endsWith(" Honey badger don't care."), viewer);
    assert.ok(CT.catchLine(lc({ walked: true }), viewer, 'badger', 1).endsWith(' Thanks for the treat, stupid birds!'), viewer);
    assert.ok(CT.catchLine(lc(), viewer, 'badger', 1).endsWith(" Nothing can stop the honey badger when it's hungry."), viewer);
    for (const o of [{}, { walked: true }, { ambush: true }]) assert.ok(!/stupid birds|hungry|don't care/.test(CT.catchLine(lc(o), viewer, 'hyena', 1)), 'hyena catches get no quote'); } });

ok('rotation: later burrows and stays alternate the two lines, never the same twice in a row; the first burrow has its own line', () => {
  const p = BL.createPicker(), view = (o) => Object.assign({ role: 'hunter', phase: 'play', turn: 'hunter', myTurn: true, burrowed: false, kind: 'badger', seenBirds: [], h3: { kind: 'badger' } }, o);
  const said = [];
  let prev = view({});
  const step = (next) => { const r = BL.detect(prev, next, p); prev = next; for (const e of r) said.push(e); return r; };
  assert.deepEqual(step(view({ burrowed: true, myTurn: false, turn: 'red' })).map(e => e.event), ['firstBurrow']);
  step(view({ burrowed: true, myTurn: true, turn: 'hunter' }));
  assert.deepEqual(step(view({ burrowed: true, myTurn: false, turn: 'red' })).map(e => [e.event, e.text]), [['stay', "Honey badger don't care."]]);
  step(view({ burrowed: true, myTurn: true })); assert.equal(step(view({ burrowed: true, myTurn: false, turn: 'red' }))[0].text, 'Look at this nasty badass.');
  step(view({ burrowed: false, myTurn: false, turn: 'red' })); step(view({ burrowed: false, myTurn: true, turn: 'hunter' }));
  assert.deepEqual(step(view({ burrowed: true, myTurn: false, turn: 'red' })).map(e => [e.event, e.text]), [['burrow', "Honey badger don't care."]], 'a later burrow takes the rotation, not the first-burrow line');
  step(view({ burrowed: true, myTurn: true })); step(view({ burrowed: true, myTurn: false, turn: 'red' }));
  const rot = said.filter(e => e.event !== 'firstBurrow').map(e => e.text); assert.ok(rot.length >= 4);
  for (let i = 1; i < rot.length; i++) assert.notEqual(rot[i], rot[i - 1], 'never the same line twice in a row');
  assert.equal(said.filter(e => e.event === 'firstBurrow').length, 1, 'the first-burrow line comes once'); });

ok('ambush sight line: only when a bird newly shows next to the burrow, only on the badger\'s own view', () => {
  const p = BL.createPicker(), v = o => Object.assign({ role: 'hunter', phase: 'play', turn: 'red', myTurn: false, burrowed: true, kind: 'badger', seenBirds: [], h3: { kind: 'badger' } }, o);
  const seen = [{ seat: 'blue', type: 'o', p: [7, 3] }];
  assert.deepEqual(BL.detect(v({}), v({ seenBirds: seen }), p).map(e => [e.event, e.text]), [['sight', "Nothing can stop the honey badger when it's hungry."]]);
  assert.deepEqual(BL.detect(v({ seenBirds: seen }), v({ seenBirds: seen }), p), [], 'same bird, same square: said once');
  assert.deepEqual(BL.detect(v({}), v({ role: 'blue', seenBirds: seen }), p).filter(e => e.event === 'sight'), [], 'a bird\'s view never gets it'); });

ok('win line: when the badger wins, on every phone; never for a hyena win', () => {
  assert.equal(BL.winLine({ phase: 'over', winner: 'badger', h3: {} }), 'Look at this nasty badass.');
  assert.equal(BL.winLine({ phase: 'over', winner: 'hunter', h3: { kind: 'badger' } }), 'Look at this nasty badass.');
  assert.equal(BL.winLine({ phase: 'over', winner: 'hunter', h3: { kind: 'hyena' } }), ''); assert.equal(BL.winLine({ phase: 'over', winner: 'hyena', h3: {} }), '');
  assert.equal(BL.winLine({ phase: 'over', winner: 'blue', h3: { kind: 'badger' } }), ''); assert.equal(BL.winLine({ phase: 'play', winner: null, h3: { kind: 'badger' } }), ''); });

// ---- who sees what, on real server views ----
const lines = (prev, now, p = BL.createPicker()) => BL.detect(prev, now, p).map(e => e.event);

ok('3 players: burrowing, staying burrowed and sight reach only the badger player; a pop-out unseen is the badger\'s alone, seen it reaches the bird', () => {
  const { room } = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'badger' }, null);
  const g = room.g = T.newGame3('badger', undefined, [8, 3]); g.phase = 'play'; g.turn = 'hunter'; g.ostrich = [2, 0]; g.vulture = [0, 6];
  const seats = ['hunter', 'blue', 'red'], snap = () => Object.fromEntries(seats.map(r => [r, S.view3(room, r)]));
  let prev = snap(); T.hunterStay(g); let now = snap();
  assert.deepEqual(lines(prev.hunter, now.hunter), ['firstBurrow']);
  for (const r of ['blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r + ' learns nothing from a burrow');
  // a bird steps next to the burrow: sight for the badger only
  g.turn = 'blue'; prev = snap(); g.ostrich = [7, 3]; g.turn = 'hunter'; now = snap();
  assert.deepEqual(lines(prev.hunter, now.hunter), ['sight']); for (const r of ['blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r + ' gets no sight line');
  // the badger stays burrowed on its next turn: badger only
  prev = snap(); T.hunterStay(g); now = snap(); assert.deepEqual(lines(prev.hunter, now.hunter), ['stay']); for (const r of ['blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), []);
  // pops out with no bird in sight (birds far away): the badger's phone only
  g.ostrich = [1, 0]; g.vulture = [0, 6]; g.turn = 'hunter'; prev = snap(); assert.ok(g.three.burrowed); assert.ok(T.hunterMove(g, [7, 3])); now = snap();
  assert.deepEqual(lines(prev.hunter, now.hunter), ['popOut']); for (const r of ['blue', 'red']) { assert.equal(now[r].h3.popout, null); assert.deepEqual(lines(prev[r], now[r]), [], r + ' does not see an unseen pop-out'); }
  // pops out in sight of a bird (within 2): that bird's phone shows it too, the other bird's does not
  g.turn = 'hunter'; T.hunterStay(g); g.ostrich = [6, 3]; g.vulture = [0, 6]; g.turn = 'hunter';
  prev = snap(); assert.ok(g.three.burrowed); assert.ok(T.hunterMove(g, [8, 3])); now = snap(); const seenBy = r => T.hunterSeenBy(g, r);
  assert.ok(seenBy('blue') && !seenBy('red')); assert.deepEqual(lines(prev.blue, now.blue), ['popOut']); assert.deepEqual(lines(prev.red, now.red), []); assert.deepEqual(lines(prev.hunter, now.hunter), ['popOut']); });

ok('3 players: a hyena never produces badger lines for anyone', () => {
  const { room } = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'hyena' }, null);
  const g = room.g = T.newGame3('hyena', undefined, [8, 3]); g.phase = 'play'; g.turn = 'hunter'; g.ostrich = [2, 0]; g.vulture = [0, 6];
  const snap = () => Object.fromEntries(['hunter', 'blue', 'red'].map(r => [r, S.view3(room, r)])), prev = snap(); T.hunterStay(g); const now = snap();
  for (const r of ['hunter', 'blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r); });

ok('Hunters: the shove reaches all four phones; burrow and sight are the badger\'s alone; the hyena sees a pop-out only in sight', () => {
  const { room } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  const g = room.g; g.phase = 'play'; g.ostrich = [2, 6]; g.vulture = [0, 0]; g.hunt.hs.hyena.p = [4, 1]; g.hunt.hs.badger.p = [6, 4]; g.turn = 'badger';
  const seats = ['badger', 'hyena', 'blue', 'red'], snap = () => Object.fromEntries(seats.map(r => [r, S.viewH(room, r)]));
  let prev = snap(); H.hunterStay(g); let now = snap();
  assert.deepEqual(lines(prev.badger, now.badger), ['firstBurrow']); for (const r of ['hyena', 'blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r + ' learns nothing from a burrow');
  // sight: a bird next to the burrow
  g.turn = 'blue'; prev = snap(); g.ostrich = [7, 4]; g.turn = 'badger'; now = snap(); assert.deepEqual(lines(prev.badger, now.badger), ['sight']);
  for (const r of ['hyena', 'blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r + ' gets no sight line');
  // the shove: the badger (burrowed, hidden) moves onto the hyena
  g.ostrich = [2, 6]; g.hunt.hs.hyena.p = [5, 4]; g.turn = 'badger'; prev = snap(); assert.ok(g.hunt.hs.badger.burrowed); assert.ok(H.hunterMove(g, [5, 4])); now = snap();
  assert.equal(g.hunt.rival.by, 'badger'); for (const r of seats) assert.deepEqual(lines(prev[r], now[r]), ['shove'], r + ' sees the shove line');
  assert.equal(now.badger.h3.popout, null, 'a shove is not a pop-out'); });

ok('Hunters: a pop-out in sight of the hyena shows on the hyena\'s phone; unseen it does not', () => {
  const { room } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  const g = room.g; g.phase = 'play'; g.ostrich = [2, 6]; g.vulture = [0, 0]; g.hunt.hs.hyena.p = [8, 0]; g.hunt.hs.badger.p = [6, 4]; g.hunt.hs.badger.burrowed = true; g.turn = 'badger';
  const seats = ['badger', 'hyena', 'blue', 'red'], snap = () => Object.fromEntries(seats.map(r => [r, S.viewH(room, r)]));
  let prev = snap(); assert.ok(H.hunterMove(g, [6, 3])); let now = snap();
  assert.deepEqual(lines(prev.badger, now.badger), ['popOut']); for (const r of ['hyena', 'blue', 'red']) assert.deepEqual(lines(prev[r], now[r]), [], r + ' is out of sight');
  g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [6, 3]; g.hunt.hs.badger.burrowed = true; g.turn = 'badger'; prev = snap(); assert.ok(H.hunterMove(g, [6, 2])); now = snap();
  assert.deepEqual(lines(prev.hyena, now.hyena), ['popOut'], 'the hyena is 2 away and sees it'); assert.deepEqual(lines(prev.blue, now.blue), []); });

ok('2 vs 2 + hunter: burrow and sight reach only the badger; a pop-out is seen by a bird within 2 and no other', () => {
  const { room } = S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind: 'badger' }, null);
  const g = room.g = TT.newTeam(5, 'badger', undefined, [8, 3]); for (const p of [[2, 1], [2, 3]]) TT.place(g, 'o1', p); TT.place(g, 'o1', [1, 1]);
  for (const p of [[6, 1], [6, 3]]) TT.place(g, 'o2', p); TT.place(g, 'o2', [7, 1]); assert.equal(g.phase, 'play'); g.turn = 'hunter'; g.b.o1.pos = [0, 0]; g.b.o2.pos = [0, 6]; g.b.v1.pos = [2, 0]; g.b.v2.pos = [2, 6];
  const seats = ['hunter', 'o1', 'o2', 'v1', 'v2'], snap = () => Object.fromEntries(seats.map(r => [r, S.viewT(room, r)]));
  let prev = snap(); TT.hunterStay(g); let now = snap();
  assert.deepEqual(lines(prev.hunter, now.hunter), ['firstBurrow']); for (const r of seats.slice(1)) assert.deepEqual(lines(prev[r], now[r]), [], r);
  g.turn = 'v1'; prev = snap(); g.b.v1.pos = [7, 3]; g.turn = 'hunter'; now = snap(); assert.deepEqual(lines(prev.hunter, now.hunter), ['sight']); for (const r of seats.slice(1)) assert.deepEqual(lines(prev[r], now[r]), [], r);
  g.b.v1.pos = [2, 0]; g.b.o2.pos = [6, 3]; g.turn = 'hunter'; prev = snap(); assert.ok(g.h.burrowed); assert.ok(TT.hunterMove(g, [7, 3])); now = snap();
  assert.deepEqual(lines(prev.hunter, now.hunter), ['popOut']); assert.deepEqual(lines(prev.o2, now.o2), ['popOut']); for (const r of ['o1', 'v1', 'v2']) assert.deepEqual(lines(prev[r], now[r]), [], r); });

console.log(n + ' badger-line tests passed'); process.exit(0);
