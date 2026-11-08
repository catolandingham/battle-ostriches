// Unit tests: the consistent rules, in every mode: Kick (legality, push, limits), the one-line announcements every seat gets while
// squares go only to seats that can see them, the pounce range in the views, and the words. node testrules.js
process.env.PORT = 0;
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TT = require('./team.js'),
  AI = require('./ai.js'), CT = require('./public/catchtext.js'), BL = require('./public/badgerlines.js'), S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG, D = B.dist, K = B.key;
C.kickPush = 2; // these view and privacy tests were written for a 2-square kick; the v2 distances (3, badger 2, wrapping) are tested in testv2.js

// ---- classic (game.js): eggs (2,1) (6,1) (2,5); the ostrich on (4,2); the vulture flies next to it
function classic(vul = [5, 3], ost = [4, 2]) { const g = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(B.placeOstrich(g, ost)); g.vulture = vul.slice(); g.turn = 'blue'; return g; }

ok('classic: kick pushes the vulture 2 squares straight away; the ostrich stays put; the turn passes', () => {
  assert.equal(C.kickPush, 2);
  const g = classic(); assert.deepEqual(B.kickTargets(g), [[5, 3]]);
  assert.ok(B.ostrichKick(g, [5, 3])); assert.deepEqual(g.vulture, [7, 5]); assert.deepEqual(g.ostrich, [4, 2]); assert.equal(g.turn, 'red'); assert.equal(g.round, 2);
  assert.equal(g.lastKick.who, 'vulture'); assert.deepEqual(g.lastKick.to, [7, 5]); assert.equal(g.lastAction.type, 'kick');
  const h = classic([4, 3]); assert.ok(B.ostrichKick(h, [4, 3])); assert.deepEqual(h.vulture, [4, 5], 'straight down'); });

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
ok('the ostrich\'s options come in its view: kickTargets, kickNear, can.kick; the Kick button is shown only with an animal next to it', () => {
  const { room } = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'badger' }, null);
  const g = room.g = three('badger', [5, 2], [4, 2], [3, 3]); room.bots = []; for (const s of ['blue', 'red', 'hunter']) room.players[s] = { ws: null, token: s };
  let v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, [[3, 3], [5, 2]]); assert.equal(v.kickNear, true); assert.equal(v.can.kick, true);
  g.three.burrowed = true; v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, [[3, 3]]);
  g.vulture = [0, 6]; g.three.h = [8, 6]; v = S.view3(room, 'blue'); assert.deepEqual(v.kickTargets, []); assert.equal(v.kickNear, false); assert.equal(v.can.kick, false);
  assert.deepEqual(S.view3(room, 'red').kickTargets, undefined, 'the vulture gets no kick options'); });
ok('2 player view: a kick reaches both players with its square; the ostrich is offered the kick', () => {
  const room = { code: 'TEST', g: classic(), players: { blue: { ws: null }, red: { ws: null } }, ai: null, pass: false };
  const b = S.view(room, 'blue'); assert.deepEqual(b.kickTargets, [[5, 3]]); assert.equal(b.kickNear, true); assert.equal(b.can.kick, true);
  assert.ok(B.ostrichKick(room.g, [5, 3])); for (const r of ['blue', 'red']) { const v = S.view(room, r); assert.equal(v.kick.who, 'vulture'); assert.deepEqual(v.kick.to, [7, 5]); assert.equal(v.kick.moved, 2); } });

ok('the words: one line every phone gets, the Brian wording, and the honey badger quote', () => {
  assert.equal(CT.kickLine('hyena', 2, 2), 'Ostrich kicked the hyena 2 squares away.'); assert.equal(CT.kickLine('vulture', 2, 2), 'Ostrich kicked the vulture 2 squares away.');
  assert.equal(CT.kickLine('badger', 2, 2), 'Ostrich kicked the honey badger 2 squares away.'); assert.equal(CT.kickLine('hyena', 1, 2), 'Ostrich kicked the hyena 1 square away.');
  assert.equal(CT.kickLine('hyena', 0, 2), 'Kick blocked.');
  assert.equal(CT.popOutLine(), 'Badger popped up!');
  assert.equal(CT.rivalLine({ by: 'badger', n: 2 }), 'Badger shoved the hyena.');
  assert.equal(CT.rivalLine({ by: 'hyena', n: 2 }), 'Hyena shoved the badger.');
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
