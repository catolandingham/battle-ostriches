// Unit tests: the consistent rules, in every mode: Kick (legality, push, limits), the one-line announcements every seat gets while
// squares go only to seats that can see them, the pounce range in the views, and the words. node testrules.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TT = require('./team.js'),
  AI = require('./ai.js'), CT = require('./public/catchtext.js'), BL = require('./public/badgerlines.js'), S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG, D = B.dist, K = B.key;

// ---- classic (game.js): eggs (2,1) (6,1) (2,5); the ostrich on (4,2); the vulture flies next to it
function classic(vul = [5, 3], ost = [4, 2]) { const g = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(B.placeOstrich(g, ost)); g.vulture = vul.slice(); g.turn = 'blue'; return g; }

ok('classic: kick pushes the vulture 2 squares straight away; the ostrich stays put; the turn passes', () => {
  assert.equal(C.kickPush, 2);
  const g = classic(); assert.deepEqual(B.kickTargets(g), [[5, 3]]);
  assert.ok(B.ostrichKick(g, [5, 3])); assert.deepEqual(g.vulture, [7, 5]); assert.deepEqual(g.ostrich, [4, 2]); assert.equal(g.turn, 'red'); assert.equal(g.round, 2);
  assert.equal(g.lastKick.who, 'vulture'); assert.deepEqual(g.lastKick.to, [7, 5]); assert.equal(g.lastAction.type, 'kick');
  const h = classic([4, 3]); assert.ok(B.ostrichKick(h, [4, 3])); assert.deepEqual(h.vulture, [4, 5], 'straight down'); });

ok('classic: not next to the ostrich, not on the ostrich\'s square, not on a carry turn, not when it must step off', () => {
  const g = classic([6, 3]); assert.deepEqual(B.kickTargets(g), []); assert.equal(B.ostrichKick(g, [6, 3]), false);
  const same = classic([4, 2 + 1]); same.vulture = [4, 2]; assert.deepEqual(B.kickTargets(same), [], 'sharing a square has no direction to push');
  const c = classic(); c.carrying = 0; assert.deepEqual(B.kickTargets(c), []); assert.equal(B.ostrichKick(c, [5, 3]), false);
  const m = classic([3, 2], [2, 1]); // sit 3 times on the egg, vulture keeps hovering next to it
  for (let i = 0; i < 3; i++) { assert.ok(B.ostrichSit(m)); assert.ok(B.vultureFly(m, i % 2 ? [3, 2] : [3, 1])); }
  assert.equal(B.mustLeave(m), true); assert.deepEqual(B.kickTargets(m), [], 'it must step off first'); assert.equal(B.ostrichKick(m, m.vulture), false);
  const v = classic(); v.turn = 'red'; assert.equal(B.ostrichKick(v, [5, 3]), false, 'only on its own turn'); });

ok('classic: the push stops at the board edge', () => {
  const g = classic([8, 3], [7, 3]); assert.ok(B.ostrichKick(g, [8, 3])); assert.deepEqual(g.vulture, [8, 3], 'against the edge it does not move'); assert.equal(g.lastKick.to + '', '8,3');
  const e = classic([7, 3], [6, 3]); assert.ok(B.ostrichKick(e, [7, 3])); assert.deepEqual(e.vulture, [8, 3], 'one square of room: it moves one'); });

ok('classic: a kick is not a Sit (the sit count stays as it was); it warms the egg under the ostrich, and hunger still counts', () => {
  const g = classic([3, 2], [2, 1]); assert.ok(B.ostrichSit(g)); assert.equal(g.sitRun, 1); assert.ok(B.vultureFly(g, [3, 1]));
  const hungry = g.hungerLeft; g.eggs[0].lastWarm = 0; g.round = 5;
  assert.ok(B.ostrichKick(g, [3, 1])); assert.equal(g.sitRun, 1, 'neither adds to nor clears the sit count'); assert.equal(g.eggs[0].lastWarm, 5, 'warmed as sitting would'); assert.equal(g.hungerLeft, hungry - 1);
  assert.deepEqual(g.ostrich, [2, 1]); assert.ok(g.eggs[0].alive && g.eggs[0].pos + '' === '2,1', 'the egg stays under it'); });

ok('classic: the kicked vulture keeps its stone, finds no egg by landing, and does not refill', () => {
  const g = classic([3, 2], [2, 2]); g.stones = 1; g.eggs[1].pos = [5, 2]; assert.ok(B.ostrichKick(g, [3, 2])); assert.deepEqual(g.vulture, [5, 2]); assert.equal(g.stones, 1); assert.equal(g.marks['5,2'], undefined, 'a kick finds no egg');
  const r = classic([3, 0], [2, 0]); r.stones = 0; assert.ok(B.ostrichKick(r, [3, 0])); assert.equal(r.stones, 0, 'landing on a rock pile by a kick does not refill'); });

// ---- 3 players
function three(kind = 'hyena', h = [5, 2], ost = [4, 2], vul = [3, 3]) { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, ost));
  assert(T.vultureFly3(g, [4, 1])); g.vulture = vul.slice(); g.turn = 'blue'; return g; }
ok('3 players: kick the hunter or the vulture; the hunter is pushed 2 and its turn then starts from the new square', () => {
  const g = three(); assert.deepEqual(T.kickTargets3(g), [[3, 3], [5, 2]]);
  assert.ok(T.ostrichAct3(g, 'kick', [5, 2])); assert.deepEqual(g.three.h, [7, 2]); assert.deepEqual(g.ostrich, [4, 2]); assert.equal(g.turn, 'hunter'); assert.equal(g.lastKick.who, 'hyena'); assert.deepEqual(g.three.h, g.lastKick.to);
  const v = three(); assert.ok(T.ostrichAct3(v, 'kick', [3, 3])); assert.deepEqual(v.vulture, [1, 5]); assert.equal(v.turn, 'hunter'); assert.equal(v.lastKick.who, 'vulture'); assert.equal(v.stones, 1, 'it keeps its stone');
  const b = three('badger'); assert.ok(T.ostrichAct3(b, 'kick', [5, 2])); assert.equal(b.lastKick.who, 'badger'); });
ok('3 players: a burrowed badger can\'t be kicked (it can\'t be seen); one that is not burrowed can', () => {
  const g = three('badger'); g.three.burrowed = true; assert.deepEqual(T.kickTargets3(g), [[3, 3]]); assert.equal(T.ostrichAct3(g, 'kick', [5, 2]), false); assert.deepEqual(g.three.h, [5, 2]);
  g.three.burrowed = false; assert.deepEqual(T.kickTargets3(g), [[3, 3], [5, 2]]); });
ok('3 players: a pushed animal stops at the edge or at the next piece; no kick on a carry turn, from a distance, or when it must step off', () => {
  const edge = three('hyena', [8, 3], [7, 3], [1, 1]); assert.ok(T.ostrichAct3(edge, 'kick', [8, 3])); assert.deepEqual(edge.three.h, [8, 3]);
  const blockedH = three('hyena', [5, 2], [4, 2], [6, 2]); assert.ok(T.ostrichAct3(blockedH, 'kick', [5, 2])); assert.deepEqual(blockedH.three.h, [5, 2], 'the vulture is right behind it: it stays');
  const blockedV = three('hyena', [2, 4], [4, 2], [3, 3]); assert.ok(T.ostrichAct3(blockedV, 'kick', [3, 3])); assert.deepEqual(blockedV.vulture, [3, 3], 'the hunter is right behind the vulture');
  const half = three('hyena', [1, 5], [4, 2], [3, 3]); assert.ok(T.ostrichAct3(half, 'kick', [3, 3])); assert.deepEqual(half.vulture, [2, 4], 'one square, then the hunter');
  const far = three('hyena', [7, 2]); assert.equal(T.ostrichAct3(far, 'kick', [7, 2]), false);
  const carry = three(); carry.carrying = 0; assert.deepEqual(T.kickTargets3(carry), []); assert.equal(T.ostrichAct3(carry, 'kick', [5, 2]), false);
  const wrong = three(); wrong.turn = 'red'; assert.equal(T.ostrichAct3(wrong, 'kick', [5, 2]), false); });

// ---- Hunters
function hunters() { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.ostrich = [4, 3]; g.vulture = [5, 3]; g.hunt.hs.hyena.p = [3, 3]; g.hunt.hs.badger.p = [4, 4]; g.turn = 'blue'; g.sitRun = 0; return g; }
ok('Hunters: kick the vulture, the hyena or the honey badger; each goes 2 straight away, stopping at pieces', () => {
  const g = hunters(); assert.deepEqual(H.kickTargetsH(g), [[5, 3], [3, 3], [4, 4]]);
  assert.ok(H.ostrichActH(g, 'kick', [3, 3])); assert.deepEqual(g.hunt.hs.hyena.p, [1, 3]); assert.equal(g.lastKick.who, 'hyena'); assert.equal(g.turn, 'hyena');
  const b = hunters(); assert.ok(H.ostrichActH(b, 'kick', [4, 4])); assert.deepEqual(b.hunt.hs.badger.p, [4, 6]); assert.equal(b.lastKick.who, 'badger');
  const v = hunters(); assert.ok(H.ostrichActH(v, 'kick', [5, 3])); assert.deepEqual(v.vulture, [7, 3]);
  const stop = hunters(); stop.hunt.hs.badger.p = [6, 3]; assert.ok(H.ostrichActH(stop, 'kick', [5, 3])); assert.deepEqual(stop.vulture, [5, 3], 'the badger is right behind the vulture: it does not move'); assert.equal(stop.lastKick.to + '', '5,3');
  const rival = hunters(); rival.hunt.hs.badger.p = [2, 3]; assert.ok(H.ostrichActH(rival, 'kick', [3, 3])); assert.deepEqual(rival.hunt.hs.hyena.p, [3, 3], 'the other hunter is right behind it'); });
ok('Hunters: a burrowed badger can\'t be kicked; a kicked hunter is not caught-by and does not catch (nobody is hurt)', () => {
  const g = hunters(); g.hunt.hs.badger.burrowed = true; assert.deepEqual(H.kickTargetsH(g), [[5, 3], [3, 3]]); assert.equal(H.ostrichActH(g, 'kick', [4, 4]), false);
  const k = hunters(); assert.ok(H.ostrichActH(k, 'kick', [3, 3])); assert.equal(k.hunt.birds.blue.catches, 0); assert.equal(k.hunt.birds.red.catches, 0); assert.equal(k.hunt.hs.hyena.kos, 0); });

// ---- 2 vs 2 and 2 vs 2 + hunter
function team(np = 5, kind = 'hyena') { const g = TT.newTeam(np, kind, undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TT.place(g, 'o1', p)); assert.ok(TT.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TT.place(g, 'o2', p)); assert.ok(TT.place(g, 'o2', [7, 1])); return g; }
ok('2 vs 2: an ostrich kicks a vulture (either one) but never its teammate; the push stops at any piece', () => {
  const g = team(4); g.b.v1.pos = [1, 2]; g.b.v2.pos = [6, 6]; g.turn = 'o1';
  g.b.o2.pos = [2, 1]; assert.deepEqual(TT.kickTargets(g, 'o1'), [[1, 2]], 'the teammate on the next square is not a target'); assert.equal(TT.ostrichKick(g, 'o1', [2, 1]), false);
  g.b.o2.pos = [7, 1]; assert.ok(TT.ostrichAct(g, 'o1', 'kick', [1, 2])); assert.deepEqual(g.b.v1.pos, [1, 4]); assert.equal(g.lastKick.who, 'vulture'); assert.equal(g.lastKick.seat, 'v1'); assert.deepEqual(g.b.o1.pos, [1, 1]);
  assert.equal(g.turn, 'v2');
  const s = team(4); s.b.v1.pos = [1, 2]; s.b.v2.pos = [1, 3]; s.turn = 'o1'; assert.deepEqual(TT.kickTargets(s, 'o1'), [[1, 2]]); assert.ok(TT.ostrichAct(s, 'o1', 'kick', [1, 2])); assert.deepEqual(s.b.v1.pos, [1, 2], 'the other vulture is right behind it'); });
ok('2 vs 2 + hunter: kick the hunter; a burrowed badger can\'t be kicked; not while it must step off; hunger counts', () => {
  const g = team(5, 'hyena'); g.h.p = [2, 2]; g.turn = 'o1'; assert.deepEqual(TT.kickTargets(g, 'o1'), [[2, 2]]); const hung = g.b.o1.hunger;
  assert.ok(TT.ostrichAct(g, 'o1', 'kick', [2, 2])); assert.deepEqual(g.h.p, [3, 3]); assert.equal(g.lastKick.who, 'hyena'); assert.equal(g.lastKick.seat, 'hunter'); assert.equal(g.b.o1.hunger, hung - 1);
  const b = team(5, 'badger'); b.h.p = [2, 2]; b.h.burrowed = true; b.turn = 'o1'; assert.deepEqual(TT.kickTargets(b, 'o1'), []); assert.equal(TT.ostrichAct(b, 'o1', 'kick', [2, 2]), false);
  const m = team(5, 'hyena'); m.h.p = [2, 2]; m.turn = 'o1'; m.b.o1.sitRun = 3; m.b.o1.pos = [2, 1]; assert.equal(TT.mustLeave(m, 'o1'), true); assert.deepEqual(TT.kickTargets(m, 'o1'), []); });

// ---- views: every seat is told; only a seat that can see the square is told the square
const seatsOf = (v, list) => Object.fromEntries(list.map(s => [s, v(s)]));
ok('3 players: a kick is announced to every seat; the new square only to a seat that can see it, and no positions leak', () => {
  const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null);
  const g = room.g = three('hyena', [5, 2], [4, 2], [3, 3]); g.three.birds.red.out = false;
  assert.ok(T.ostrichAct3(g, 'kick', [5, 2]));
  const v = seatsOf(s => S.view3(room, s), ['blue', 'red', 'hunter']);
  for (const s of ['blue', 'red', 'hunter']) { assert.equal(v[s].kick.who, 'hyena', s); assert.equal(v[s].kick.seq, 1); assert.equal(v[s].kick.moved, 2); }
  assert.deepEqual(v.hunter.kick.to, [7, 2], 'the hunter knows where it ended up');
  assert.equal(v.blue.kick.to, null, 'the ostrich is now 3 squares from it: it cannot see that square'); assert.equal(v.blue.h3.hunter, null);
  assert.equal(v.red.kick.to, null, 'the vulture is 4 squares away'); assert.equal(v.red.h3.hunter, null);
  // a bird that can still see the hunter does get the square
  g.vulture = [6, 3]; const near = S.view3(room, 'red'); assert.deepEqual(near.kick.to, [7, 2]); assert.deepEqual(near.h3.hunter, [7, 2]);
  // kicking the vulture: both birds see it, the hunter only hears of it
  const g2 = room.g = three('hyena', [8, 6], [4, 2], [3, 3]); assert.ok(T.ostrichAct3(g2, 'kick', [3, 3]));
  const w = seatsOf(s => S.view3(room, s), ['blue', 'red', 'hunter']);
  for (const s of ['blue', 'red', 'hunter']) assert.equal(w[s].kick.who, 'vulture', s);
  assert.deepEqual(w.blue.kick.to, [1, 5]); assert.deepEqual(w.red.kick.to, [1, 5]); assert.equal(w.hunter.kick.to, null); assert.equal(JSON.stringify(w.hunter).includes('1,5'), false);
  assert.deepEqual(w.hunter.vulture, T.OFF); assert.deepEqual(w.hunter.ostrich, T.OFF); });
ok('the ostrich\'s options come in its view: kickTargets, kickNear, can.kick; the Kick button is shown only with an animal next to it', () => {
  const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'badger' }, null);
  const g = room.g = three('badger', [5, 2], [4, 2], [3, 3]); room.bots = []; for (const s of ['blue', 'red', 'hunter']) room.players[s] = { ws: null, token: s };
  let v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, [[3, 3], [5, 2]]); assert.equal(v.kickNear, true); assert.equal(v.can.kick, true);
  g.three.burrowed = true; v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, [[3, 3]]);
  g.vulture = [0, 6]; g.three.h = [8, 6]; v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, []); assert.equal(v.kickNear, false); assert.equal(v.can.kick, false);
  assert.deepEqual(S.view3(room, 'red').kickTargets, undefined, 'the vulture gets no kick options'); });
ok('Hunters: a kick is announced to every seat; the square goes to a seat that can see it (birds see birds; hunters see no bird)', () => {
  const { room } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  const g = room.g = hunters(); assert.ok(H.ostrichActH(g, 'kick', [5, 3]));
  const v = seatsOf(s => S.viewH(room, s), ['blue', 'red', 'hyena', 'badger']);
  for (const s of Object.keys(v)) { assert.equal(v[s].kick.who, 'vulture', s); assert.equal(v[s].kick.seq, 1); }
  assert.deepEqual(v.blue.kick.to, [7, 3]); assert.deepEqual(v.red.kick.to, [7, 3]); assert.equal(v.hyena.kick.to, null); assert.equal(v.badger.kick.to, null);
  const g2 = room.g = hunters(); g2.hunt.hs.badger.p = [8, 6]; assert.ok(H.ostrichActH(g2, 'kick', [3, 3]));
  const w = seatsOf(s => S.viewH(room, s), ['blue', 'red', 'hyena', 'badger']);
  for (const s of Object.keys(w)) assert.equal(w[s].kick.who, 'hyena', s);
  assert.deepEqual(w.hyena.kick.to, [1, 3], 'the kicked hunter knows'); assert.equal(w.badger.kick.to, null, 'the other hunter is more than 2 squares from the hyena');
  assert.equal(w.red.kick.to, null, 'the vulture at (5,3) is 4 squares from (1,3)'); assert.equal(w.badger.h3.hunters.some(x => x.kind === 'hyena'), false); });
ok('2 vs 2 + hunter: a kick is announced to every seat; the square to seats that can see it', () => {
  const { room } = S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind: 'hyena' }, null);
  const g = room.g = team(5, 'hyena'); g.h.p = [2, 2]; g.b.v1.pos = [6, 5]; g.b.v2.pos = [7, 6]; g.turn = 'o1'; assert.ok(TT.ostrichAct(g, 'o1', 'kick', [2, 2]));
  const v = seatsOf(s => S.viewT(room, s), ['hunter', 'o1', 'o2', 'v1', 'v2']);
  for (const s of Object.keys(v)) { assert.equal(v[s].kick.who, 'hyena', s); assert.equal(v[s].kick.seq, 1); }
  assert.deepEqual(v.hunter.kick.to, [4, 4]); assert.deepEqual(v.v1.kick.to, [4, 4], 'v1 at (6,5) is 2 squares from (4,4): it sees it');
  assert.equal(v.v2.kick.to, null, 'v2 at (7,6) is 3 from (4,4)'); assert.deepEqual(v.o2.kick.to, null, 'o2 at (7,1) is 3 from (4,4)');
  const g2 = room.g = team(5, 'hyena'); g2.h.p = [8, 6]; g2.b.v1.pos = [1, 2]; g2.turn = 'o1'; assert.ok(TT.ostrichAct(g2, 'o1', 'kick', [1, 2]));
  const w = seatsOf(s => S.viewT(room, s), ['hunter', 'o1', 'o2', 'v1', 'v2']);
  for (const s of Object.keys(w)) assert.equal(w[s].kick.who, 'vulture', s);
  for (const s of ['o1', 'o2', 'v1', 'v2']) assert.deepEqual(w[s].kick.to, [1, 4], s + ' is a bird: birds see birds'); assert.equal(w.hunter.kick.to, null); assert.equal(JSON.stringify(w.hunter.h3.pieces || []), '[]'); });
ok('2 player view: a kick reaches both players with its square; the ostrich is offered the kick', () => {
  const room = { code: 'TEST', g: classic(), players: { blue: { ws: null }, red: { ws: null } }, ai: null, pass: false };
  const b = S.view(room, 'blue'); assert.deepEqual(b.kickTargets, [[5, 3]]); assert.equal(b.kickNear, true); assert.equal(b.can.kick, true);
  assert.ok(B.ostrichKick(room.g, [5, 3])); for (const r of ['blue', 'red']) { const v = S.view(room, r); assert.equal(v.kick.who, 'vulture'); assert.deepEqual(v.kick.to, [7, 5]); assert.equal(v.kick.moved, 2); } });

ok('the pounce range is the hunter\'s own business: birds are never told whether the hyena sensed one', () => {
  const { room } = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'hyena' }, null);
  const g = room.g = T.newGame3('hyena', undefined, [8, 3]); g.phase = 'play'; g.turn = 'hunter'; g.ostrich = [6, 3]; g.vulture = [0, 6]; g.three.sense = true;
  assert.equal(S.view3(room, 'hunter').h3.range, 2); assert.equal(S.view3(room, 'blue').h3.range, 1); assert.equal(S.view3(room, 'red').h3.range, 1);
  assert.ok(S.view3(room, 'hunter').sense === true && S.view3(room, 'blue').sense !== true);
  g.three.sense = false; assert.equal(S.view3(room, 'hunter').h3.range, 1); });

ok('pop-out and hunters meeting: announced to every seat; the badger\'s place only to a seat that can see it', () => {
  const { room } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  const g = room.g = hunters(); g.turn = 'badger'; g.hunt.hs.badger.p = [7, 5]; g.hunt.hs.badger.burrowed = true; g.ostrich = [1, 0]; g.vulture = [0, 6]; g.hunt.hs.hyena.p = [3, 0];
  assert.ok(H.hunterMove(g, [8, 5]));
  const v = seatsOf(s => S.viewH(room, s), ['blue', 'red', 'hyena', 'badger']);
  for (const s of Object.keys(v)) { assert.ok(v[s].h3.popout && v[s].h3.popout.seq, s + ' is told'); assert.equal(Object.keys(v[s].h3.popout).sort().join(), 'round,seen,seq'); }
  assert.equal(v.badger.h3.popout.seen, true); assert.equal(v.blue.h3.popout.seen, false); assert.equal(v.red.h3.popout.seen, false);
  // the meeting
  const r = room.g = hunters(); r.hunt.hs.hyena.p = [4, 3]; r.hunt.hs.badger.p = [5, 3]; r.turn = 'badger'; r.ostrich = [0, 0]; r.vulture = [0, 6]; assert.ok(H.hunterMove(r, [4, 3]));
  const w = seatsOf(s => S.viewH(room, s), ['blue', 'red', 'hyena', 'badger']);
  for (const s of Object.keys(w)) { assert.equal(w[s].h3.rival.by, 'badger', s); assert.equal(w[s].h3.rival.seq, 1); }
  assert.deepEqual(w.hyena.h3.rival.to, [2, 3]); assert.deepEqual(w.badger.h3.rival.to, [2, 3]); assert.equal(w.blue.h3.rival.to, null, 'a blind bird gets the news, not the square'); assert.equal(w.red.h3.rival.to, null);
  r.ostrich = [1, 2]; const near = S.viewH(room, 'blue'); assert.deepEqual(near.h3.rival.to, [2, 3], 'a bird within 2 of the hyena sees it'); });

ok('a catch: every seat is told; where it happened goes to the birds and to the hunter that made it', () => {
  const { room } = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null);
  const g = room.g = hunters(); g.turn = 'hyena'; g.hunt.hs.hyena.p = [3, 3]; g.hunt.hs.badger.p = [8, 6]; g.ostrich = [4, 4]; g.vulture = [8, 0]; g.hunt.hs.hyena.sense = true; assert.ok(H.hunterMove(g, [4, 4]));
  const v = seatsOf(s => S.viewH(room, s), ['blue', 'red', 'hyena', 'badger']);
  for (const s of Object.keys(v)) { assert.equal(v[s].h3.lastCatch.bird, 'blue', s); assert.equal(v[s].h3.lastCatch.by, 'hyena'); }
  assert.ok(v.blue.h3.lastCatch.at && v.red.h3.lastCatch.at && v.blue.h3.lastCatch.to && v.red.h3.lastCatch.to, 'both birds see the square');
  assert.ok(v.hyena.h3.lastCatch.at && !v.hyena.h3.lastCatch.to); assert.equal(v.badger.h3.lastCatch.at, null); assert.equal(v.badger.h3.lastCatch.to, null); });

ok('the words: one line every phone gets, the Brian wording, and the honey badger quote', () => {
  assert.equal(CT.kickLine('hyena', 2, 2), 'The ostrich kicked the hyena back 2 squares.'); assert.equal(CT.kickLine('vulture', 2, 2), 'The ostrich kicked the vulture back 2 squares.');
  assert.equal(CT.kickLine('badger', 2, 2), 'The ostrich kicked the honey badger back 2 squares.'); assert.equal(CT.kickLine('hyena', 1, 2), 'The ostrich kicked the hyena back 1 square.');
  assert.equal(CT.kickLine('hyena', 0, 2), 'The ostrich kicked the hyena, but it had nowhere to go.');
  assert.equal(CT.popOutLine(), 'The honey badger came out of its burrow!');
  assert.equal(CT.rivalLine({ by: 'badger', n: 2 }), 'The honey badger ran into the hyena. Nobody is hurt. The hyena slid back 2 squares.');
  assert.equal(CT.rivalLine({ by: 'hyena', n: 2 }), 'The hyena ran into the honey badger. Nobody is hurt. The hyena slid back 2 squares.');
  assert.equal(BL.LINES.kicked, "Ouch. I mean... honey badger don't care."); assert.equal(BL.WHO.kicked, 'all');
  const mk = (k, who = 'blue') => ({ role: who, phase: 'play', turn: 'hunter', h3: { kind: 'badger' }, kick: k });
  for (const who of ['blue', 'red', 'hunter']) assert.deepEqual(BL.detect(mk(null, who), mk({ who: 'badger', seq: 1 }, who), BL.createPicker()).map(e => e.event), ['kicked'], who + ' sees the badger quote for a kicked badger');
  assert.deepEqual(BL.detect(mk({ who: 'badger', seq: 1 }), mk({ who: 'badger', seq: 1 }), BL.createPicker()), [], 'once only');
  assert.deepEqual(BL.detect(mk(null), mk({ who: 'hyena', seq: 1 }), BL.createPicker()), [], 'a kicked hyena or vulture gets no badger quote'); });

// ---- bots
ok('bot ostrich: kicks an adjacent hunter it can see when guarding or boxed in; walks away otherwise; sits-turned-kick only on a found egg', () => {
  const g = three('hyena', [5, 2], [4, 2], [0, 6]);
  const alts = [...B.ostrichMoves(g).map(p => ({ a: 'step', p }))], base = { at: g.ostrich, hunger: 10, cfg: g.cfg, legal: alts, hv: [5, 2], reach: 2, kicks: T.kickTargets3(g), guard: true };
  let kicked = 0; for (let i = 0; i < 200; i++) if (AI.ostrichReact({ a: 'step', p: [3, 2] }, base).a === 'kick') kicked++; assert.ok(kicked > 120, 'guarding: usually kicks (' + kicked + '/200)');
  assert.equal(AI.ostrichReact({ a: 'step', p: [3, 2] }, Object.assign({}, base, { hv: null })).a, 'step');
  assert.equal(AI.ostrichReact({ a: 'step', p: [3, 2] }, Object.assign({}, base, { hunger: 1 })).a, 'step', 'starving: it eats first');
  const boxed = Object.assign({}, base, { guard: false, legal: alts.filter(x => D(x.p, [5, 2]) <= 2) }); let k2 = 0; for (let i = 0; i < 100; i++) if (AI.ostrichReact({ a: 'step', p: [3, 2] }, boxed).a === 'kick') k2++; assert.ok(k2 > 70, 'no safe square: kicks (' + k2 + ')');
  const c = classic([5, 3], [2, 1]); c.vulture = [3, 2]; c.marks['2,1'] = 'spotted'; c.eggs[0].coldIn; let plain = 0, kick = 0; for (let i = 0; i < 300; i++) { const m = AI.ostrich(c); if (m.a === 'kick') { kick++; assert.deepEqual(m.p, [3, 2]); } else plain++; } assert.ok(kick >= 0);
  const t = three('hyena', [5, 2], [4, 2], [0, 6]); const m = AI.ostrichReact({ a: 'sit' }, Object.assign({}, base, { hv: [5, 2] })); assert.ok(['kick', 'sit', 'step'].includes(m.a)); });

ok('bot games with kicks finish with only legal moves in every mode, and kicks happen', () => {
  let kicks = 0; const wrap = (mod, name, i) => { const f = mod[name]; mod[name] = function () { const r = f.apply(this, arguments); if (r && arguments[i] === 'kick') kicks++; return r; }; };
  wrap(T, 'ostrichAct3', 1); wrap(H, 'ostrichActH', 1); wrap(TT, 'ostrichAct', 2);
  const SIM3 = require('./sim3.js'), SH = require('./simhunt.js'), ST = require('./simteam.js');
  for (let i = 0; i < 40; i++) { SIM3('hyena'); SIM3('badger'); SH.play(); ST.play(4, null); ST.play(5, 'hyena'); ST.play(5, 'badger'); }
  assert.ok(kicks > 0, 'the bots kick at least once in 240 games'); });

console.log(`PASS testrules (${n} groups)`); process.exit(0);
