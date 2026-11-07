// Unit tests: big events are announced to every seat, and where they happened goes only to a seat that can see that square.
// Catch, knock-out, the hunters meeting, the honey badger coming out of its burrow, the first meeting on a page, and the start-of-game line. node testannounce.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TT = require('./team.js'),
  CT = require('./public/catchtext.js'), R = require('./public/roles.js'), S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const seatsOf = (v, list) => Object.fromEntries(list.map(s => [s, v(s)]));
const has = (v, p) => JSON.stringify(v).includes('[' + p[0] + ',' + p[1] + ']'); // does this view carry that square anywhere

// ---- fixtures (3 players eggs (2,1) (6,1) (2,5))
function three(kind, h, o, v) { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [4, 2]));
  g.ostrich = o.slice(); g.vulture = v.slice(); g.three.h = h.slice(); g.phase = 'play'; g.turn = 'hunter'; g.three.sense = false; g.three.pounce = false; return g; }
function hunters(hy, ba, o, v) { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.hunt.hs.hyena.p = hy.slice(); g.hunt.hs.badger.p = ba.slice(); g.ostrich = o.slice(); g.vulture = v.slice(); return g; }
function team(kind, pos) { const g = TT.newTeam(5, kind, undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TT.place(g, 'o1', p); TT.place(g, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TT.place(g, 'o2', p); TT.place(g, 'o2', [7, 1]);
  assert.equal(g.phase, 'play'); for (const s of Object.keys(pos)) if (s === 'h') g.h.p = pos[s].slice(); else g.b[s].pos = pos[s].slice(); g.turn = 'hunter'; g.h.pounce = false; return g; }
const room3 = kind => S.create3({ role: 'blue', bots: ['red', 'hunter'], kind }, null).room;
const roomH = () => S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null).room;
const roomT = kind => S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind }, null).room;
const S3 = ['blue', 'red', 'hunter'], SH = ['blue', 'red', 'hyena', 'badger'], ST = ['hunter', 'o1', 'o2', 'v1', 'v2'];
const lineFor = (v, seat) => { const lc = v.h3.lastCatch; return CT.catchLine(lc, v.h3.mySeat || seat, lc.by || v.h3.kind || v.kind, CT.catchesLeft(v.h3, lc)); };

// ---- the words
ok('the lines: hunters meeting (both ways) and the badger coming out of its burrow', () => {
  assert.equal(CT.rivalLine({ by: 'badger', n: 2 }), 'The honey badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.');
  assert.equal(CT.rivalLine({ by: 'hyena', n: 2 }), 'The hyena ran into the honey badger. Nobody is hurt. The hyena slid back 2 squares.');
  assert.equal(CT.popOutLine(), 'The honey badger came out of its burrow!'); });
ok('the start-of-game line names only the animals in that game, in every mode', () => {
  assert.equal(R.huntLine('2'), 'The vulture hunts eggs.');
  assert.equal(R.huntLine('4'), 'The vultures hunt eggs.');
  assert.equal(R.huntLine('3', 'hyena'), 'The vulture hunts eggs. The hyena hunts birds.');
  assert.equal(R.huntLine('3', 'badger'), 'The vulture hunts eggs. The honey badger hunts birds.');
  assert.equal(R.huntLine('4h'), 'The vulture hunts eggs. The hyena and honey badger hunt birds.');
  assert.equal(R.huntLine('4h', 'hyena'), 'The vulture hunts eggs. The hyena and honey badger hunt birds.');
  assert.equal(R.huntLine('5', 'hyena'), 'The vultures hunt eggs. The hyena hunts birds.');
  assert.equal(R.huntLine('5', 'badger'), 'The vultures hunt eggs. The honey badger hunts birds.');
  assert.equal(R.huntLine('3'), 'The vulture hunts eggs. The hyena or honey badger hunts birds.', 'How to play, before the hunter is picked');
  for (const m of ['2', '4']) assert.ok(!/hyena|badger/.test(R.huntLine(m, 'hyena')), m + ' players have no hunter'); });

// ---- the rules record a pop-out only for a move out of a burrow with no catch and no meeting
ok('engine: a pop-out is recorded when a burrowed badger moves without a catch, in 3 players, Hunters and 2 vs 2 + hunter', () => {
  const g = three('badger', [5, 2], [0, 0], [0, 6]); g.three.burrowed = true; g.three.dig = 2; assert.ok(T.hunterMove(g, [6, 2]));
  assert.deepEqual(Object.keys(g.three.popout).sort(), ['round', 'seq']); assert.equal(g.three.popout.seq, 1);
  const c = three('badger', [5, 2], [6, 2], [0, 6]); c.three.burrowed = true; c.three.dig = 2; assert.ok(T.hunterMove(c, [6, 2])); assert.equal(c.three.popout, null, 'a catch from the burrow is a catch, not a pop-out');
  const s = three('badger', [5, 2], [0, 0], [0, 6]); assert.ok(T.hunterMove(s, [6, 2])); assert.equal(s.three.popout, null, 'moving while not burrowed is not a pop-out');
  const h = hunters([3, 0], [7, 5], [1, 0], [0, 6]); h.turn = 'badger'; h.hunt.hs.badger.burrowed = true; assert.ok(H.hunterMove(h, [8, 5]));
  assert.equal(h.hunt.popout.seq, 1); assert.equal(h.hunt.rival, null);
  const m = hunters([4, 3], [5, 3], [0, 0], [0, 6]); m.turn = 'badger'; m.hunt.hs.badger.burrowed = true; assert.ok(H.hunterMove(m, [4, 3]));
  assert.equal(m.hunt.popout, null, 'a meeting is announced as a meeting'); assert.equal(m.hunt.rival.by, 'badger');
  const t = team('badger', { h: [5, 5], o1: [0, 0], o2: [0, 6], v1: [1, 6], v2: [0, 5] }); t.h.burrowed = true; t.h.dig = 2; assert.ok(TT.hunterMove(t, [6, 5])); assert.equal(t.popout.seq, 1); });

// ---- the badger coming out: every seat is told, the place only to a seat that can see the badger
ok('3 players: the pop-out goes to every seat; the badger\'s square only to a seat that can see it', () => {
  const room = room3('badger'), g = room.g = three('badger', [5, 2], [4, 3], [0, 6]); g.three.burrowed = true; g.three.dig = 2; assert.ok(T.hunterMove(g, [6, 2]));
  const v = seatsOf(s => S.view3(room, s), S3);
  for (const s of S3) { assert.equal(v[s].h3.popout.seq, 1, s + ' is told'); assert.equal(Object.keys(v[s].h3.popout).sort().join(), 'round,seen,seq'); }
  assert.equal(v.hunter.h3.popout.seen, true); assert.equal(v.blue.h3.popout.seen, true, 'the ostrich at (4,3) is 2 squares from (6,2)'); assert.deepEqual(v.blue.h3.hunter, [6, 2]);
  assert.equal(v.red.h3.popout.seen, false, 'the vulture at (0,6) is far away'); assert.equal(v.red.h3.hunter, null); assert.equal(has(v.red, [6, 2]), false, 'no square of the badger in the far bird\'s view'); });
ok('Hunters: the pop-out goes to every seat; the badger\'s square only to a seat that can see it', () => {
  const room = roomH(), g = room.g = hunters([3, 0], [7, 5], [1, 0], [0, 6]); g.turn = 'badger'; g.hunt.hs.badger.burrowed = true; assert.ok(H.hunterMove(g, [8, 5]));
  const v = seatsOf(s => S.viewH(room, s), SH);
  for (const s of SH) { assert.equal(v[s].h3.popout.seq, 1, s + ' is told'); assert.equal(Object.keys(v[s].h3.popout).sort().join(), 'round,seen,seq'); }
  assert.equal(v.badger.h3.popout.seen, true); for (const s of ['blue', 'red', 'hyena']) assert.equal(v[s].h3.popout.seen, false, s + ' cannot see the badger');
  assert.equal(has(v.red, [8, 5]), false); assert.equal(has(v.hyena, [8, 5]), false); assert.equal(v.hyena.h3.hunters.some(x => x.kind === 'badger'), false);
  g.ostrich = [7, 3]; const near = S.viewH(room, 'blue'); assert.equal(near.h3.popout.seen, true, 'the ostrich at (7,3) is 2 from (8,5)'); assert.ok(near.h3.hunters.some(x => x.kind === 'badger')); });
ok('2 vs 2 + hunter: the pop-out goes to every seat; the badger\'s square only to a seat that can see it', () => {
  const room = roomT('badger'), g = room.g = team('badger', { h: [5, 5], o1: [0, 0], o2: [0, 6], v1: [1, 6], v2: [7, 4] }); g.h.burrowed = true; g.h.dig = 2; assert.ok(TT.hunterMove(g, [6, 5]));
  const v = seatsOf(s => S.viewT(room, s), ST);
  for (const s of ST) { assert.equal(v[s].h3.popout.seq, 1, s + ' is told'); assert.equal(Object.keys(v[s].h3.popout).sort().join(), 'round,seen,seq'); }
  assert.equal(v.hunter.h3.popout.seen, true); assert.equal(v.v2.h3.popout.seen, true, 'v2 at (7,4) is 1 square from (6,5)');
  for (const s of ['o1', 'o2', 'v1']) { assert.equal(v[s].h3.popout.seen, false, s + ' cannot see the badger'); assert.equal(v[s].h3.hunter, null); assert.equal(has(v[s], [6, 5]), false, s); } });

// ---- the hunters meeting: every seat is told; the hyena's square only to a seat that can see the hyena
ok('Hunters: the meeting goes to every seat, in the words of whoever started it, and the square only to seats that can see the hyena', () => {
  for (const [by, hy, ba, mover, target] of [['badger', [4, 3], [5, 3], 'badger', [4, 3]], ['hyena', [3, 3], [4, 3], 'hyena', [4, 3]]]) {
    const room = roomH(), g = room.g = hunters(hy, ba, [0, 0], [0, 6]); g.turn = mover; assert.ok(H.hunterMove(g, target)); assert.equal(g.hunt.rival.by, by);
    const to = g.hunt.hs.hyena.p.slice(), v = seatsOf(s => S.viewH(room, s), SH);
    for (const s of SH) { assert.equal(v[s].h3.rival.by, by, s + ' is told'); assert.equal(v[s].h3.rival.seq, 1); assert.equal(v[s].h3.rival.n, 2);
      assert.equal(CT.rivalLine(v[s].h3.rival), by === 'badger' ? 'The honey badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.' : 'The hyena ran into the honey badger. Nobody is hurt. The hyena slid back 2 squares.'); }
    assert.deepEqual(v.hyena.h3.rival.to, to); assert.deepEqual(v.badger.h3.rival.to, to);
    // birds who cannot see either hunter get the line, not the location
    assert.equal(v.blue.h3.rival.to, null); assert.equal(v.red.h3.rival.to, null); assert.equal(v.blue.h3.hunters.length, 0, 'the ostrich sees neither hunter'); assert.equal(v.red.h3.hunters.length, 0);
    assert.equal(has(v.red, to), false, 'nothing about the hyena\'s square in the far vulture\'s view');
    // a bird that can see the hyena gets the square
    g.ostrich = [1, 2]; const near = S.viewH(room, 'blue'); assert.deepEqual(near.h3.rival.to, to, 'the ostrich at (1,2) is 1 square from the hyena'); assert.ok(near.h3.hunters.some(x => x.kind === 'hyena')); } });

// ---- the first meeting on a page shows (the audit's bug), and later ones, once each
ok('the first hunters meeting on a page is announced; a page opened mid-game says nothing about an old one; a new game starts over', () => {
  const mk = (rv, ph = 'play') => ({ phase: ph, h3: { rival: rv || null } }), seen = { pop: 0, rival: 0 };
  assert.deepEqual(CT.newEvents(seen, mk(null), {}), []);
  const first = CT.newEvents(seen, mk({ by: 'badger', seq: 3, n: 2, to: null }), mk(null));
  assert.equal(first.length, 1, 'the first meeting this page sees'); assert.equal(first[0].text, 'The honey badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.'); assert.equal(first[0].square, null, 'a blind bird: line, no square');
  assert.deepEqual(CT.newEvents(seen, mk({ by: 'badger', seq: 3, n: 2, to: null }), mk(null)), [], 'the same meeting is not announced twice');
  const second = CT.newEvents(seen, mk({ by: 'hyena', seq: 5, n: 2, to: [2, 3] }), mk(null)); assert.equal(second.length, 1); assert.deepEqual(second[0].square, [2, 3]); assert.match(second[0].text, /^The hyena ran into/);
  const mid = { pop: 0, rival: 0 }; assert.deepEqual(CT.newEvents(mid, mk({ by: 'badger', seq: 2, n: 2 }), null), [], 'opened mid-game: no replay'); assert.equal(mid.rival, 2);
  CT.newEvents(seen, mk(null, 'setupEggs'), mk(null)); assert.equal(seen.rival, 0, 'a new game resets the counters');
  assert.equal(CT.newEvents(seen, mk({ by: 'badger', seq: 1, n: 2 }), mk(null)).length, 1, 'meeting number 1 of the next game shows even though the last game ended on a higher number');
  const pops = { pop: 0, rival: 0 }, ps = (seq, seenIt) => ({ phase: 'play', h3: { popout: { seq, round: 4, seen: seenIt } } });
  const pe = CT.newEvents(pops, ps(1, false), ps(0, false)); assert.equal(pe.length, 1); assert.equal(pe[0].text, 'The honey badger came out of its burrow!'); assert.equal(pe[0].seen, false);
  assert.deepEqual(CT.newEvents(pops, ps(1, false), ps(1, false)), []); });

// ---- catches and knock-outs: every seat is told; the square goes to who can see it
ok('3 players: a catch reaches every seat with its line; the hunter\'s square only to a bird that can see the hunter', () => {
  const room = room3('hyena'), g = room.g = three('hyena', [5, 2], [6, 2], [0, 6]); assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.three.lastCatch.ko, false);
  const v = seatsOf(s => S.view3(room, s), S3);
  for (const s of S3) { assert.equal(v[s].h3.lastCatch.bird, 'blue', s); assert.match(lineFor(v[s], s), /hyena|ostrich/, s); }
  assert.equal(lineFor(v.blue, 'blue'), "The hyena caught you! Hurt: one more catch and you're out."); assert.equal(lineFor(v.red, 'red'), 'The hyena caught the ostrich.'); assert.equal(lineFor(v.hunter, 'hunter'), 'Caught the ostrich! One more catch knocks it out.');
  assert.deepEqual(v.blue.h3.lastCatch.at, [6, 2]); assert.deepEqual(v.hunter.h3.lastCatch.at, [6, 2]); assert.equal(v.red.h3.lastCatch.at, null, 'the vulture at (0,6) cannot see the hyena'); assert.equal(has(v.red, [6, 2]), false);
  assert.deepEqual(v.red.h3.lastCatch.to, g.ostrich, 'birds see birds'); assert.equal(v.hunter.h3.lastCatch.to, null, 'the hunter sees no bird');
  g.vulture = [7, 4]; assert.deepEqual(S.view3(room, 'red').h3.lastCatch.at, [6, 2], 'a vulture 2 squares from the hyena sees it'); });
ok('3 players: a knock-out reaches every seat with its line', () => {
  const room = room3('badger'), g = room.g = three('badger', [5, 2], [6, 2], [0, 6]); assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.three.lastCatch.ko, true);
  const v = seatsOf(s => S.view3(room, s), S3);
  for (const s of S3) assert.equal(v[s].h3.lastCatch.ko, true, s);
  assert.equal(lineFor(v.blue, 'blue'), 'The honey badger knocked you out.'); assert.equal(lineFor(v.red, 'red'), 'The honey badger knocked out the ostrich.'); assert.equal(lineFor(v.hunter, 'hunter'), 'Ostrich knocked out!');
  assert.equal(v.red.h3.lastCatch.at, null); assert.equal(has(v.red, [6, 2]), false); });
ok('Hunters: a catch reaches all four seats; the square only to the bird caught, the hunter that made it, and birds that see that hunter', () => {
  const room = roomH(), g = room.g = hunters([3, 3], [8, 6], [4, 4], [8, 0]); g.turn = 'hyena'; assert.ok(H.hunterMove(g, [4, 4]));
  const v = seatsOf(s => S.viewH(room, s), SH);
  for (const s of SH) { assert.equal(v[s].h3.lastCatch.bird, 'blue', s); assert.equal(v[s].h3.lastCatch.by, 'hyena'); assert.match(lineFor(v[s], s), /hyena|ostrich/); }
  assert.equal(lineFor(v.blue, 'blue'), "The hyena caught you! Hurt: one more catch and you're out."); assert.equal(lineFor(v.badger, 'badger'), 'The hyena caught the ostrich.'); assert.equal(lineFor(v.red, 'red'), 'The hyena caught the ostrich.');
  assert.deepEqual(v.blue.h3.lastCatch.at, [4, 4]); assert.deepEqual(v.hyena.h3.lastCatch.at, [4, 4]); assert.equal(v.badger.h3.lastCatch.at, null, 'the other hunter sees no bird'); assert.equal(v.badger.h3.lastCatch.to, null);
  assert.equal(v.red.h3.lastCatch.at, null, 'the vulture at (8,0) is 4 squares from the hyena'); assert.ok(v.red.h3.lastCatch.to, 'birds see birds'); assert.equal(has(v.red, [4, 4]), false);
  g.vulture = [5, 2]; assert.deepEqual(S.viewH(room, "red").h3.lastCatch.at, [4, 4], 'a vulture 2 squares from the hyena sees it'); });
ok('Hunters: a knock-out reaches all four seats', () => {
  const room = roomH(), g = room.g = hunters([3, 3], [3, 4], [4, 4], [8, 0]); g.turn = 'badger'; assert.ok(H.hunterMove(g, [4, 4])); assert.equal(g.hunt.lastCatch.ko, true);
  const v = seatsOf(s => S.viewH(room, s), SH);
  for (const s of SH) assert.equal(v[s].h3.lastCatch.ko, true, s);
  assert.equal(lineFor(v.blue, 'blue'), 'The honey badger knocked you out.'); assert.equal(lineFor(v.badger, 'badger'), 'Ostrich knocked out!'); assert.equal(lineFor(v.hyena, 'hyena'), 'The honey badger knocked out the ostrich.'); assert.equal(lineFor(v.red, 'red'), 'The honey badger knocked out the ostrich.'); });
ok('2 vs 2 + hunter: a catch and a knock-out reach every seat; the square only to who can see the hunter', () => {
  const pos = { h: [3, 2], o1: [4, 2], o2: [7, 1], v1: [0, 6], v2: [4, 4] };
  const room = roomT('hyena'), g = room.g = team('hyena', pos); assert.ok(TT.hunterMove(g, [4, 2])); assert.equal(g.lastCatch.ko, false);
  const v = seatsOf(s => S.viewT(room, s), ST);
  for (const s of ST) { assert.equal(v[s].h3.lastCatch.bird, 'o1', s); assert.match(lineFor(v[s], s), /hyena|ostrich/, s); }
  assert.equal(lineFor(v.o1, 'o1'), "The hyena caught you! Hurt: one more catch and you're out."); assert.equal(lineFor(v.o2, 'o2'), 'The hyena caught the ostrich.'); assert.equal(lineFor(v.v1, 'v1'), 'The hyena caught the ostrich.'); assert.equal(lineFor(v.hunter, 'hunter'), 'Caught the ostrich! One more catch knocks it out.');
  assert.deepEqual(v.o1.h3.lastCatch.at, [4, 2]); assert.deepEqual(v.hunter.h3.lastCatch.at, [4, 2]); assert.deepEqual(v.v2.h3.lastCatch.at, [4, 2], 'v2 at (4,4) is 2 squares from the hyena');
  for (const s of ['o2', 'v1']) { assert.equal(v[s].h3.lastCatch.at, null, s + ' cannot see the hyena'); assert.equal(has(v[s], [4, 2]), false, s); }
  const rk = roomT('badger'), k = rk.g = team('badger', pos); assert.ok(TT.hunterMove(k, [4, 2])); assert.equal(k.lastCatch.ko, true);
  const w = seatsOf(s => S.viewT(rk, s), ST);
  for (const s of ST) assert.equal(w[s].h3.lastCatch.ko, true, s);
  assert.equal(lineFor(w.o1, 'o1'), 'The honey badger knocked you out.'); assert.equal(lineFor(w.o2, 'o2'), 'The honey badger knocked out the ostrich.'); assert.equal(lineFor(w.hunter, 'hunter'), 'Ostrich knocked out!'); });

console.log(`PASS testannounce (${n} groups)`); process.exit(0);
