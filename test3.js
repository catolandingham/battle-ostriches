// Unit tests for the 3-player rules (three.js). node test3.js
const B = require('./game.js'), T = require('./three.js'), AI = require('./ai.js'), assert = require('assert');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };
const K = B.key;
// eggs (2,1) (6,1) (2,5); ostrich (6,5); vulture starts (4,3); hunter starts (8,3) unless given
function setup(kind = 'hyena', h = [8, 3]) { const g = T.newGame3(kind, undefined, h);
  for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [6, 5])); return g; }
const round = (g, v, o, h) => { assert.equal(g.turn, 'red'); assert(T.vultureFly3(g, v)); if (g.turn === 'blue') assert(T.ostrichAct3(g, o ? 'step' : 'sit', o));
  if (g.turn === 'hunter') assert(h ? T.hunterMove(g, h) : T.hunterStay(g)); };
t('turn order: vulture, ostrich, hunter', () => { const g = setup(); assert.equal(g.turn, 'red'); T.vultureFly3(g, [4, 1]); assert.equal(g.turn, 'blue');
  T.ostrichAct3(g, 'step', [5, 5]); assert.equal(g.turn, 'hunter'); assert.equal(g.round, 2); assert(T.hunterMove(g, [8, 2])); assert.equal(g.turn, 'red'); });
t('sense: yes/no only when a bird is within 2', () => { const g = setup(); T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [5, 5]); assert.equal(g.three.sense, false);
  const h = setup(); T.vultureFly3(h, [6, 3]); T.ostrichAct3(h, 'step', [5, 5]); assert.equal(h.three.sense, true); });
t('birds see the hunter only within 2; never a burrowed badger', () => { const g = setup('badger'); assert(!T.hunterSeenBy(g, 'red')); T.vultureFly3(g, [6, 3]); assert(T.hunterSeenBy(g, 'red'));
  T.ostrichAct3(g, 'step', [7, 5]); assert(T.hunterSeenBy(g, 'blue')); assert(T.hunterStay(g)); assert(g.three.burrowed); assert(!T.hunterSeenBy(g, 'red')); assert(!T.hunterSeenBy(g, 'blue')); });
t('hyena pounce: sense yes -> one extra 1-square move the same turn; sense no -> none', () => { const g = setup('hyena', [8, 3]); T.vultureFly3(g, [6, 3]); T.ostrichAct3(g, 'step', [5, 5]);
  assert(g.three.sense); assert(T.hunterMove(g, [8, 2])); assert.equal(g.turn, 'hunter'); assert(g.three.pounce); assert.equal(T.hunterMoves(g).length, 5); assert(T.hunterMove(g, [7, 2])); assert.equal(g.turn, 'red');
  const h = setup('hyena', [8, 0]); T.vultureFly3(h, [4, 1]); T.ostrichAct3(h, 'step', [5, 5]); assert(!h.three.sense); T.hunterMove(h, [8, 1]); assert.equal(h.turn, 'red');
  const c = setup('hyena', [8, 3]); T.vultureFly3(c, [6, 3]); T.ostrichAct3(c, 'step', [5, 5]); T.hunterMove(c, [7, 3]); assert(T.hunterMove(c, [6, 3])); assert.equal(c.three.birds.red.catches, 1, 'pounce catches'); });
t('badger burrow: stay burrows, moving pops up and can catch on that move', () => { const g = setup('badger', [8, 3]); T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [7, 5]);
  T.hunterStay(g); assert(g.three.burrowed); T.vultureFly3(g, [4, 2]); T.ostrichAct3(g, 'step', [7, 4]); assert(!T.hunterSeenBy(g, 'blue')); g.three.birds.blue.catches = 1; assert(T.hunterMove(g, [7, 4])); assert(!g.three.burrowed); assert(T.isOut(g, 'blue'));
  const h = setup('hyena'); T.vultureFly3(h, [4, 1]); T.ostrichAct3(h, 'step', [5, 5]); T.hunterStay(h); assert(!h.three.burrowed, 'hyenas never burrow'); });
t('starved ostrich counts as out; vulture alone must still smash/outlast the eggs', () => { const g = setup('hyena', [0, 3]); g.hungerLeft = 1; T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [5, 5]);
  assert(T.isOut(g, 'blue')); assert.equal(g.three.birds.blue.why, 'starved'); assert.equal(g.phase, 'play'); assert.equal(g.turn, 'hunter'); assert(T.isOut(g, 'blue')); T.hunterStay(g);
  assert.equal(g.turn, 'red'); T.vultureFly3(g, [4, 3]); assert.equal(g.turn, 'hunter', 'out ostrich is skipped'); });
t('time runs out: no winner if the lone bird missed its goal; ostrich wins if it survives', () => { const g = setup('hyena', [0, 3]); g.round = 30; g.eggs.forEach(e => e.lastWarm = 29); g.hungerLeft = 1; T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [5, 5]);
  assert.equal(g.phase, 'over'); assert.equal(g.winner, 'none');
  const h = setup('hyena', [0, 3]); h.round = 30; h.eggs.forEach(e => e.lastWarm = 29); T.vultureFly3(h, [4, 1]); T.ostrichAct3(h, 'step', [5, 5]); assert.equal(h.winner, 'blue'); });
t('shot clock timeout ends each turn (pass / stay put)', () => { const g = setup('badger'); assert(T.timeout(g)); assert.equal(g.turn, 'blue'); assert.equal(g.sniff, null);
  const hl = g.hungerLeft; assert(T.timeout(g)); assert.equal(g.turn, 'hunter'); assert.deepEqual(g.ostrich, [6, 5]); assert.equal(g.hungerLeft, hl - 1);
  assert(T.timeout(g)); assert.equal(g.turn, 'red'); assert(g.three.burrowed, 'one still turn always burrows'); assert.equal(g.three.dig, 2); });
t('server views: hunter sees no bird or egg positions; birds see the hunter only within 2', () => {
  process.env.PORT = 3989; const S = require('./server.js'); const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null);
  room.g = setup('hyena', [8, 3]); const hv = S.view3(room, 'hunter'), js = JSON.stringify(hv);
  assert.deepEqual(hv.vulture, T.OFF); assert.deepEqual(hv.ostrich, T.OFF); assert(!('eggs' in hv)); assert(!js.includes('[6,5]') && !js.includes('[2,1]'));
  assert.equal(S.view3(room, 'red').h3.hunter, null); assert.deepEqual(S.view3(room, 'blue').h3.hunter, [8, 3]); T.vultureFly3(room.g, [6, 3]); assert.deepEqual(S.view3(room, 'red').h3.hunter, [8, 3]);
  room.g.three.burrowed = true; assert.equal(S.view3(room, 'red').h3.hunter, null); assert.equal(S.view3(room, 'red').h3.burrowed, false); assert.equal(S.view3(room, 'hunter').h3.burrowed, true); S.close(); });
t('hunter bot only plays legal moves; bot games finish', () => { const play = require('./sim3.js'); for (let i = 0; i < 40; i++) for (const k of ['hyena', 'badger']) { const g = play(k, { timeout: i % 2 ? .05 : 0 }); assert.equal(g.phase, 'over'); assert(['blue', 'red', 'hunter', 'none'].includes(g.winner)); } });
t('ambush sight (3p): a burrowed badger sees the exact square of a bird next to it, not one 2 away; birds learn nothing', () => {
  const g = setup('badger', [6, 4]); g.vulture = [4, 3]; // the ostrich at (6,5) is 1 away, the vulture 2 away
  assert.deepEqual(T.ambushSight(g), [], 'not burrowed: nothing');
  g.three.burrowed = true;
  const s = T.ambushSight(g); assert.equal(s.length, 1); assert.deepEqual(s[0].p, [6, 5]); assert.equal(s[0].seat, 'blue'); assert.equal(s[0].type, 'o');
  g.vulture = [5, 3]; assert.deepEqual(T.ambushSight(g).map(q => q.seat).sort(), ['blue', 'red'], 'both next to it');
  g.three.birds.blue.out = true; g.ostrich = T.OFF.slice(); assert.deepEqual(T.ambushSight(g).map(q => q.seat), ['red'], 'a bird that is out is not shown');
  g.vulture = [4, 3]; assert.deepEqual(T.ambushSight(g), [], 'only 2 away: nothing');
  g.vulture = [5, 3]; g.three.kind = 'hyena'; assert.deepEqual(T.ambushSight(g), [], 'a hyena never gets it');
  g.three.kind = 'badger'; g.three.burrowed = false; assert.deepEqual(T.ambushSight(g), [], 'out of the burrow: as today');
  g.three.burrowed = true; assert.ok(!T.hunterSeenBy(g, 'red'), 'birds still cannot see a burrowed badger'); });
t('ambush catch (3p): a catch on the move out of the burrow sets ambush; an open catch or a walk-in does not', () => {
  const a = setup('badger', [8, 3]); T.vultureFly3(a, [4, 1]); T.ostrichAct3(a, 'step', [7, 5]); assert(T.hunterStay(a)); assert(a.three.burrowed); T.vultureFly3(a, [4, 2]); T.ostrichAct3(a, 'step', [7, 4]);
  assert.deepEqual(T.ambushSight(a).map(q => q.p), [[7, 4]]); assert(T.hunterMove(a, [7, 4])); assert.equal(a.three.lastCatch.ambush, true); assert.equal(a.three.birds.blue.catches, 1);
  const o = setup('badger', [8, 3]); T.vultureFly3(o, [4, 1]); T.ostrichAct3(o, 'step', [7, 4]); assert(T.hunterMove(o, [7, 4])); assert.ok(!o.three.lastCatch.ambush, 'open catch');
  const w = setup('badger', [7, 4]); w.three.burrowed = true; T.vultureFly3(w, [4, 1]); assert(T.ostrichAct3(w, 'step', [7, 4])); assert.equal(w.three.lastCatch.walked, true); assert.ok(!w.three.lastCatch.ambush, 'walk-in'); });
t('a bird sees the hunter enter 2 squares and not after the hunter leaves', () => {
  const g = setup('hyena', [8, 3]);
  assert(!T.hunterSeenBy(g, 'red'));
  T.vultureFly3(g, [6, 3]);
  assert(T.hunterSeenBy(g, 'red'));
  T.ostrichAct3(g, 'step', [5, 5]);
  assert(T.hunterMove(g, [8, 4]));
  assert(g.three.pounce);
  assert(T.hunterMove(g, [8, 5]));
  assert(T.hunterSeenBy(g, 'red'));
  T.vultureFly3(g, [6, 2]);
  T.ostrichAct3(g, 'step', [5, 4]);
  assert(T.hunterMove(g, [8, 6]));
  assert(!T.hunterSeenBy(g, 'red'));
});
t('badger is not burrowed before it stays still', () => {
  const g = setup('badger', [8, 3]);
  T.vultureFly3(g, [4, 1]);
  T.ostrichAct3(g, 'step', [7, 5]);
  assert.equal(g.turn, 'hunter');
  assert.equal(g.three.burrowed, false);
  assert.equal(g.three.dig, 0);
});
t('2-player games carry no 3-player state', () => { const g = B.newGame(); assert(!('three' in g)); });

function atHunter(g, h, o, v) {
  g.phase = 'play'; g.turn = 'hunter'; g.three.h = h.slice(); g.ostrich = o.slice(); g.vulture = v.slice();
  g.three.pounce = false; g.three.sense = false; g.three.extra = false;
}
t('3 catches do not win; 4 catches do', () => {
  const g = setup('hyena', [5, 2]); atHunter(g, [5, 2], [6, 2], [0, 6]);
  g.three.birds.red.catches = 1; g.three.birds.blue.catches = 1;
  assert(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'play', '3 catches are not a win');
  assert.equal(g.three.birds.blue.catches, 2); assert.equal(g.three.birds.blue.out, true);
  assert.equal(g.turn, 'hunter'); assert.equal(g.three.extra, true, 'the knock-out starts the extra turn');
  g.vulture = [5, 3]; g.three.h = [5, 2]; g.three.pounce = false;
  assert(T.hunterMove(g, [5, 3]));
  assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter');
  // With 2 catches per bird, 4 catches also knocks out both birds, so finish prefers that reason.
  assert.ok(/made 4 catches|knocked out both birds/.test(g.endWhy), g.endWhy);
  assert.equal(g.three.extra, true); // the game ended on the extra turn; endHunter did not run
});
t('a starved bird does not give the hunter a double turn', () => {
  const g = setup('hyena', [0, 3]); g.hungerLeft = 1; T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [5, 5]);
  assert.equal(g.three.birds.blue.why, 'starved'); assert.equal(g.turn, 'hunter');
  assert(T.hunterStay(g)); assert.equal(g.turn, 'red'); assert.equal(!!g.three.extra, false);
});
t('after the first credited knock-out the hunter always takes 2 full turns, with a fresh sense and pounce reset', () => {
  const g = setup('hyena', [5, 2]); atHunter(g, [5, 2], [6, 2], [0, 6]);
  g.three.birds.blue.catches = 1; g.three.sense = true; const seq = g.three.senseSeq;
  assert(T.hunterMove(g, [6, 2]));
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 'hunter'); assert.equal(g.three.extra, true);
  assert.equal(g.three.pounce, false, 'pounce resets on the second turn');
  assert.ok(g.three.senseSeq > seq, 'sense is taken again');
  assert.equal(T.status3(g).extra, true);
  const seq2 = g.three.senseSeq; assert(T.hunterStay(g));
  assert.equal(g.three.extra, false); assert.equal(g.turn, 'red');
  // the next hunter visit is also a double, even if this visit does not catch
  assert(T.vultureFly3(g, [1, 6]));
  assert.equal(g.turn, 'hunter', 'the out ostrich is skipped'); assert.equal(g.three.extra, false);
  assert(T.hunterStay(g));
  assert.equal(g.turn, 'hunter'); assert.equal(g.three.extra, true); assert.equal(g.three.pounce, false);
  assert.ok(g.three.senseSeq >= seq2);
  assert(T.hunterStay(g)); assert.equal(g.turn, 'red'); assert.equal(g.three.extra, false);
});
t('a knock-out on the pounce finishes this turn, then the extra turn starts', () => {
  const g = setup('hyena', [5, 2]); atHunter(g, [5, 2], [6, 2], [4, 4]);
  g.three.birds.blue.catches = 1; g.three.sense = true;
  assert(T.hunterMove(g, [5, 3])); assert.equal(g.three.pounce, true); assert.equal(g.three.extra, false); assert.equal(g.turn, 'hunter');
  assert(T.hunterMove(g, [6, 2]));
  assert.equal(g.three.birds.blue.out, true); assert.equal(g.turn, 'hunter'); assert.equal(g.three.extra, true); assert.equal(g.three.pounce, false);
});
t('a game-ending catch does not start an extra turn', () => {
  const g = setup('hyena', [5, 2]); atHunter(g, [5, 2], [6, 2], [0, 6]);
  g.three.birds.red.catches = 2; g.three.birds.blue.catches = 1;
  assert(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter');
  assert.equal(g.turn, 'hunter'); // endHunter did not run, so extra stays off
  assert.equal(!!g.three.extra, false);
});
t('the second hunter turn gets a new 10s clock', () => {
  const S = require('./server.js');
  const { room } = S.create3({ role: 'hunter', bots: ['red', 'blue'], kind: 'hyena' }, null);
  room.clock = undefined; room.settings = { showTimers: true };
  room.g = setup('hyena', [5, 2]); atHunter(room.g, [5, 2], [6, 2], [0, 6]);
  room.g.three.birds.blue.catches = 1;
  S.broadcast(room);
  const key1 = room.clockKey, d1 = room.deadline;
  assert.ok(key1 && key1.endsWith(':1'), 'first hunter visit keys the clock as turn 1: ' + key1);
  assert.ok(d1 && d1 > Date.now());
  assert(T.hunterMove(room.g, [6, 2]));
  S.broadcast(room);
  assert.equal(room.g.three.extra, true);
  assert.ok(room.clockKey && room.clockKey.endsWith(':2'), 'the extra turn keys a new clock: ' + room.clockKey);
  assert.ok(room.deadline && room.deadline >= d1, 'the extra turn starts a fresh deadline');
  assert.equal(S.view3(room, 'hunter').h3.extra, true);
  assert.equal(S.view3(room, 'red').h3.extra, true);
  clearTimeout(room.clockT); clearTimeout(room.aiT);
});
console.log(n + ' 3-player tests passed'); process.exit(0);
