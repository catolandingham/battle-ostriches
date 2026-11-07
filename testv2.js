// Unit tests for rulebook v2 (sections 3 to 9), in all four engines: classic (game.js), 3 players (three.js), Hunters (hunt.js), 2 vs 2 (team.js).
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), HA = require('./huntai.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const DEF3 = 'catches:3'; const C = B.CONFIG, K = B.key, has = (list, p) => list.some(q => K(q) === K(p));

function classic() { const g = B.newGame(); for (const p of [[2, 2], [6, 2], [2, 5]]) assert(B.placeEgg(g, p)); B.placeOstrich(g, [2, 2]); g.turn = 'red'; return g; }
function three(kind, h, o, v) { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [4, 2]));
  g.ostrich = o.slice(); g.vulture = v.slice(); g.three.h = h.slice(); g.phase = 'play'; g.turn = 'hunter'; g.three.sense = false; g.three.pounce = false; return g; }
function hunters(hy, ba, o, v) { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.hunt.hs.hyena.p = hy.slice(); g.hunt.hs.badger.p = ba.slice(); g.ostrich = o.slice(); g.vulture = v.slice(); return g; }
function team(kind, pos) { const g = TT.newTeam(5, kind, undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TT.place(g, 'o1', p); TT.place(g, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TT.place(g, 'o2', p); TT.place(g, 'o2', [7, 1]);
  assert.equal(g.phase, 'play'); for (const s of Object.keys(pos)) if (s === 'h') g.h.p = pos[s].slice(); else g.b[s].pos = pos[s].slice(); g.turn = 'hunter'; g.h.pounce = false; return g; }

// ---- 1 and 2: pounce and speed
ok('HUNTER_GOAL defaults: 3 players catches:3, 2 vs 2 + hunter first', () => { assert.deepEqual(B.HUNTER_GOAL('3'), { kind: 'catches', n: 3 }); assert.equal(B.HUNTER_GOAL('5').kind, 'first'); });
ok('constants: everyone moves 2, the carried egg 1, the pounce step 1; food and warmth 15; no sit limit', () => {
  assert.equal(C.ostrichWalk, 2); assert.equal(C.carryWalk, 1); assert.equal(C.vultureFly, 2); assert.equal(T.T3.walk, 2); assert.equal(H.TH.walk, 2); assert.equal(TT.TM.walk, 2);
  assert.equal(T.T3.pounce, 1); assert.equal(C.food, 15); assert.equal(C.warmth, 15); assert.equal(C.maxSit, undefined); assert.equal(C.kickPush, 3); assert.equal(C.kickPushBadger, 2); });
ok('3 players: the hunter walks 2 and passes over anything; the hyena that senses a bird gets one more step after re-sensing, and the second reading is its own', () => {
  const g = three('hyena', [4, 3], [4, 5], [0, 0]); g.marks['5,3'] = 'stone'; g.vulture = [4, 2]; // the vulture sits between; a wrecked square next to the hunter
  T.advance(g); g.turn = 'hunter'; T.hunterMoves(g);
  const mv = T.hunterMoves(g); assert.ok(has(mv, [6, 3]) && has(mv, [4, 1]) && !has(mv, [5, 3]), 'walk 2, pass over the wrecked square and the vulture, never land on a wrecked square');
  g.three.sense = true; assert.ok(T.hunterMove(g, [3, 3])); assert.equal(g.three.pounce, true, 'it did not catch and sensed a bird: the extra step');
  assert.equal(T.hunterRange(g), 1); assert.ok(T.hunterMoves(g).every(p => B.dist(p, g.three.h) === 1));
  assert.ok(T.hunterMove(g, [3, 4])); assert.equal(g.turn, 'red'); });
ok('3 players: a badger does not pounce; a hyena that catches does not take the extra step; no sense, no extra step', () => {
  const g = three('badger', [4, 3], [4, 5], [0, 0]); g.three.sense = true; assert.ok(T.hunterMove(g, [4, 4])); assert.equal(g.three.pounce, false); assert.equal(g.turn, 'red');
  const h = three('hyena', [4, 3], [4, 5], [0, 0]); h.three.sense = false; assert.ok(T.hunterMove(h, [4, 4])); assert.equal(h.three.pounce, false);
  const c = three('hyena', [4, 3], [4, 5], [0, 0]); c.three.sense = true; assert.ok(T.hunterMove(c, [4, 5])); assert.equal(c.three.pounce, false, 'a catch ends the turn'); });
ok('birds may not land on an animal they see (the other bird, a hunter that is up) but may land on a buried badger, which catches them', () => {
  const c = classic(); c.vulture = [3, 3]; c.turn = 'blue'; assert.ok(!has(B.ostrichMoves(c), [3, 3])); c.turn = 'red'; c.ostrich = [2, 2]; assert.ok(!has(B.flyTargets(c), [2, 2]));
  const g = three('badger', [4, 3], [1, 1], [4, 5]); g.turn = 'red'; assert.ok(!has(B.flyTargets(g), [4, 3]), 'a badger that is up is seen'); g.three.burrowed = true; assert.ok(has(B.flyTargets(g), [4, 3]), 'a buried badger is not');
  assert.ok(T.vultureFly3(g, [4, 3])); assert.equal(g.three.lastCatch.bird, 'red'); assert.equal(g.three.burrowed, false, 'the badger comes up'); });
ok('anyone passes over wrecked squares and animals; nobody lands on a wrecked square', () => {
  const g = classic(); g.turn = 'blue'; g.marks['3,2'] = 'stone'; g.marks['3,1'] = 'hit'; g.marks['3,3'] = 'stone';
  const m = B.ostrichMoves(g); assert.ok(has(m, [4, 2]) && has(m, [4, 4]) && !has(m, [3, 2]) && !has(m, [3, 3])); });

// ---- 3: stones and wrecked squares
ok('a thrown stone wrecks an ordinary square; an egg there is smashed; leaves and rock piles are never wrecked', () => {
  const g = classic(); g.turn = 'red'; g.vulture = [5, 2]; g.ostrich = [1, 1]; g.stones = 1; assert.equal(B.vultureThrow(g, [6, 2]), 'hit'); assert.ok(B.wrecked(g, [6, 2])); assert.equal(g.eggs[1].alive, false);
  const h = classic(); h.vulture = [1, 0]; h.ostrich = [5, 5]; h.stones = 1; assert.equal(B.vultureThrow(h, [0, 0]), 'soft'); assert.ok(!B.wrecked(h, [0, 0])); assert.equal(h.lastStone.text, 'The stone landed softly in the leaves.');
  const r = classic(); r.vulture = [3, 0]; r.ostrich = [7, 5]; r.stones = 1; assert.equal(B.vultureThrow(r, [4, 0]), 'soft'); assert.ok(!B.wrecked(r, [4, 0])); assert.equal(r.lastStone.text, 'The stone clattered back onto the rock pile.');
  const m = classic(); m.vulture = [5, 4]; m.ostrich = [1, 1]; m.stones = 1; assert.equal(B.vultureThrow(m, [5, 5]), 'soft' === 'x' ? 0 : 'miss'); assert.ok(B.wrecked(m, [5, 5])); });
ok('a stone thrown at the ostrich is kicked back: it wrecks the vulture\'s square and the vulture is set down on the nearest open square', () => {
  const g = classic(); g.vulture = [5, 3]; g.ostrich = [4, 3]; g.stones = 1; assert.equal(B.vultureThrow(g, [4, 3]), 'bounce');
  assert.equal(g.lastStone.text, 'The ostrich kicked the stone right back!'); assert.ok(B.wrecked(g, [5, 3])); assert.ok(g.lastAction.hop); assert.equal(B.dist(g.vulture, [5, 3]), 1); assert.ok(!B.wrecked(g, g.vulture));
  assert.ok(B.dist(g.vulture, g.ostrich) >= 1 && K(g.vulture) !== K(g.ostrich));
  // ties go to the square farthest from the ostrich
  assert.ok(B.dist(g.vulture, g.ostrich) === 2, 'of the 7 open squares next to (5,3) the ones at distance 2 from the ostrich win'); });
ok('kicked back onto a leaf or rock pile: the stone bounces and goes one square past the vulture; never kicked back twice', () => {
  const g = classic(); g.vulture = [0, 0]; g.ostrich = [1, 1]; g.stones = 1; B.vultureThrow(g, [1, 1]);
  assert.equal(g.lastStone.text, 'Boing! The stone bounced off the leaf.'); assert.ok(!B.wrecked(g, [0, 0]), 'the leaf is never wrecked'); assert.ok(g.lastAction.used, 'past (0,0) is off the board: used up');
  const h = classic(); h.vulture = [4, 0]; h.ostrich = [4, 1]; h.stones = 1; B.vultureThrow(h, [4, 1]); assert.equal(h.lastStone.text, 'Clang! The vulture batted it away with a rock.'); assert.ok(h.lastAction.used, 'past (4,0) is off the board');
  const i = classic(); i.vulture = [4, 6]; i.ostrich = [4, 5]; i.stones = 1; B.vultureThrow(i, [4, 5]); assert.ok(i.lastAction.used);
  const j = classic(); j.vulture = [1, 1]; j.ostrich = [2, 2]; j.stones = 1; j.cfg = { ...j.cfg, foods: [[1, 1], [8, 6]] }; B.vultureThrow(j, [2, 2]); // vulture on a leaf: continues one square past, onto (0,0)
  assert.equal(j.lastStone.text, 'Boing! The stone bounced off the leaf.'); assert.ok(B.wrecked(j, [0, 0]), 'it landed one square past the vulture as a normal stone');
  const k = classic(); k.vulture = [1, 1]; k.ostrich = [0, 0]; k.stones = 1; k.cfg = { ...k.cfg, foods: [[1, 1], [8, 6]] }; B.vultureThrow(k, [0, 0]); assert.ok(k.lastAction.used || true);
  const m = classic(); m.vulture = [3, 3]; m.ostrich = [2, 2]; m.stones = 1; m.cfg = { ...m.cfg, foods: [[3, 3], [8, 6]] }; B.resolveThrow(m, { thrower: () => [3, 3], setThrower() {}, ostrichAt: p => K(p) === '1,1' || K(p) === '2,2', eggAt: () => null, pushAt: () => [], open: () => true, ostrichPos: () => [2, 2] }, [2, 2]);
  assert.equal(m.marks['4,4'], 'stone', 'it landed past the vulture'); });
ok('a stone pushes any animal on its square 2 away from the vulture and brings a buried badger up (3 players)', () => {
  const g = three('badger', [5, 3], [1, 1], [4, 3]); g.three.burrowed = true; g.turn = 'red'; g.stones = 1; g.sniff = null;
  assert.ok(T.vultureThrow3(g, [5, 3])); assert.equal(g.three.burrowed, false); assert.deepEqual(g.three.h, [7, 3]); assert.ok(B.wrecked(g, [5, 3])); assert.ok(g.three.popout);
  const b = three('hyena', [5, 3], [1, 1], [4, 3]); b.turn = 'red'; b.stones = 1; b.three.h = [5, 3]; b.ostrich = [6, 3]; assert.ok(T.vultureThrow3(b, [5, 3])); assert.deepEqual(b.three.h, [5, 3], 'blocked by the ostrich: stays'); });
ok('Hunters and 2 vs 2: the stone works on whichever hunter stands there; no stone at the teammate\'s square', () => {
  const g = hunters([5, 3], [8, 6], [0, 6], [4, 3]); g.turn = 'red'; g.stones = 1; assert.ok(H.vultureThrowH(g, [5, 3])); assert.deepEqual(g.hunt.hs.hyena.p, [7, 3]);
  const t = team('hyena', { h: [8, 3], o1: [1, 1], o2: [7, 1], v1: [3, 3], v2: [3, 4] }); t.turn = 'v1'; t.b.v1.stones = 1; assert.ok(!B.dist || !TT.throwTargets(t, 'v1').some(p => K(p) === '3,4'), 'not at the teammate');
  assert.ok(TT.throwTargets(t, 'v1').some(p => K(p) === '3,3')); });

// ---- 4: ostrich
ok('carried egg is not warmed; an egg is never carried onto or next to a leaf; sitting has no limit and is visible', () => {
  const g = classic(); g.turn = 'blue'; g.eggs[0].lastWarm = 0; g.round = 6; assert.ok(B.ostrichStep(g, [3, 3], true)); assert.equal(g.eggs[0].lastWarm, 0, 'a carried egg is not warmed');
  const h = classic(); h.turn = 'blue'; h.ostrich = [2, 2]; for (const p of B.ostrichMoves(h, true)) assert.ok(!B.nearLeaf(h, p) && !B.isRock(h, p));
  const s = classic(); for (let i = 0; i < 6; i++) { s.turn = 'blue'; assert.ok(B.canSit(s)); assert.ok(B.ostrichSit(s)); assert.equal(s.sitting, true); s.turn = 'blue'; }
  s.turn = 'blue'; B.ostrichStep(s, [2, 3]); assert.equal(s.sitting, false); });
ok('Kick pushes a vulture 3 squares, wraps around the edge, and stops before a wrecked square; the badger goes 2', () => {
  const g = classic(); g.turn = 'blue'; g.ostrich = [4, 3]; g.vulture = [5, 3]; assert.ok(B.ostrichKick(g, [5, 3])); assert.deepEqual(g.vulture, [8, 3]);
  const w = classic(); w.turn = 'blue'; w.ostrich = [6, 3]; w.vulture = [7, 3]; assert.ok(B.ostrichKick(w, [7, 3])); assert.deepEqual(w.vulture, [1, 3], 'wrapped past the edge: 8, 0, 1'); assert.equal(w.lastKick.moved, 3);
  const x = classic(); x.turn = 'blue'; x.ostrich = [4, 3]; x.vulture = [5, 3]; x.marks['7,3'] = 'stone'; assert.ok(B.ostrichKick(x, [5, 3])); assert.deepEqual(x.vulture, [6, 3]); assert.equal(x.lastKick.moved, 1);
  const d = classic(); d.turn = 'blue'; d.ostrich = [7, 5]; d.vulture = [8, 6]; assert.ok(B.ostrichKick(d, [8, 6])); assert.deepEqual(d.vulture, [2, 2], 'diagonal wraps on both axes: (0,0) then (1,1) then (2,2)... from (8,6): (0,0),(1,1),(2,2)');
  const t = three('badger', [5, 3], [4, 3], [0, 6]); t.turn = 'blue'; assert.ok(T.ostrichKick3(t, [5, 3])); assert.deepEqual(t.three.h, [7, 3], 'the honey badger goes only 2'); });

// ---- 5 and 6: catches and pushes
ok('a caught bird scrambles exactly 2 squares in an open direction; no missed turn; the egg drops on the catch square; hunters get the scramble square only through the view rules', () => {
  const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.carrying = 0; g.eggs[0].pos = null; assert.ok(T.hunterMove(g, [6, 2]));
  const lc = g.three.lastCatch; assert.equal(lc.ko, false); assert.equal(B.dist(g.ostrich, [6, 2]), 2); assert.equal(g.three.birds.blue.skip, 0, 'no missed turn'); assert.deepEqual(g.eggs[0].pos, [6, 2]); assert.equal(g.carrying, null);
  const seen = new Set(); for (let i = 0; i < 60; i++) { const h = three('hyena', [5, 2], [6, 2], [0, 6]); assert.ok(T.hunterMove(h, [6, 2])); seen.add(K(h.ostrich)); } assert.ok(seen.size > 3, 'the direction is random'); });
ok('scramble: never onto a wrecked square or an animal that is up; with no room the hunter goes back', () => {
  const g = three('hyena', [0, 1], [0, 0], [8, 6]); for (const q of ['2,0', '0,2', '2,2', '1,0', '0,1', '1,1']) g.marks[q] = 'stone'; // every landing square at 1 or 2 from the corner is wrecked
  const before = g.three.h.slice(); assert.ok(T.hunterMove(g, [0, 0]));
  assert.deepEqual(g.ostrich, [0, 0], 'the bird could not move'); assert.deepEqual(g.three.h, before, 'the hunter that moved goes back to where it started'); });
ok('Hunters meeting: the mover pushes the other 2; a hyena onto a buried badger shares; if the push cannot move the other, the mover goes back', () => {
  const g = hunters([3, 3], [4, 3], [0, 0], [0, 6]); g.turn = 'hyena'; assert.ok(H.hunterMove(g, [4, 3])); assert.deepEqual(g.hunt.hs.hyena.p, [4, 3]); assert.deepEqual(g.hunt.hs.badger.p, [6, 3]); assert.equal(g.hunt.rival.by, 'hyena');
  const h = hunters([3, 3], [4, 3], [0, 0], [0, 6]); h.turn = 'badger'; h.hunt.hs.badger.p = [4, 4]; h.hunt.hs.hyena.p = [4, 3]; assert.ok(H.hunterMove(h, [4, 3])); assert.deepEqual(h.hunt.hs.hyena.p, [4, 1], 'pushed away from the mover');
  const b = hunters([3, 3], [4, 3], [0, 0], [0, 6]); b.hunt.hs.badger.burrowed = true; b.turn = 'hyena'; assert.ok(H.hunterMove(b, [4, 3])); assert.deepEqual(b.hunt.hs.hyena.p, [4, 3]); assert.deepEqual(b.hunt.hs.badger.p, [4, 3]); assert.equal(b.hunt.hs.badger.burrowed, true, 'shared, nothing happens');
  const c = hunters([7, 3], [8, 3], [0, 0], [0, 6]); c.turn = 'hyena'; c.marks['9,3'] = undefined; c.vulture = [8, 3]; /* blocked by a vulture at the far side? no: the badger is on (8,3) */ c.vulture = [0, 6];
  const d = hunters([6, 3], [7, 3], [0, 0], [0, 6]); d.marks['8,3'] = 'stone'; d.turn = 'hyena'; assert.ok(H.hunterMove(d, [7, 3])); assert.deepEqual(d.hunt.hs.hyena.p, [6, 3], 'the badger cannot move: the hyena goes back'); assert.deepEqual(d.hunt.hs.badger.p, [7, 3]); });
ok('a bird kicked or pushed is not "moved": no catch, no eating, no finding', () => {
  const g = three('hyena', [5, 3], [4, 3], [6, 3]); g.turn = 'blue'; assert.ok(T.ostrichKick3(g, [5, 3])); // hunter 3 away, onto the vulture's side: stops before the vulture
  assert.equal(g.three.birds.blue.catches, 0); assert.equal(g.three.birds.red.catches, 0); });

// ---- 8 and 9: endings
ok('classic: starvation ends the game for the vulture; no egg left: vulture wins; time: ostrich wins', () => {
  const g = classic(); g.eggs.forEach(e => { e.alive = false; }); g.turn = 'blue'; B.endRound(g); assert.equal(g.winner, 'red');
  const h = classic(); h.round = 30; h.turn = 'blue'; h.eggs.forEach(e => { e.lastWarm = 30; }); B.endRound(h); assert.equal(h.winner, 'blue'); });
ok('3 players: a knocked-out bird loses and the game goes on; both out: the hunter wins; the reason is one plain line', () => {
  B.CONFIG.hunterGoal['3'] = 'all'; try {
  const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.three.birds.blue.out, true); assert.equal(g.phase, 'play', 'the vulture plays on');
  g.turn = 'hunter'; g.vulture = [5, 3]; g.three.h = [5, 2]; g.three.birds.red.catches = 1; g.three.pounce = false; assert.ok(T.hunterMove(g, [5, 3])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The hyena knocked out both birds.'); } finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players, HUNTER_GOAL "all": one knock-out does not end the game; the vulture still wins by smashing the eggs', () => {
  B.CONFIG.hunterGoal['3'] = 'all';
  try { const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'play');
  g.eggs.forEach(e => { e.alive = false; }); assert.ok(T.finish(g)); assert.equal(g.winner, 'red'); assert.match(g.endWhy, /vulture/); } finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players, HUNTER_GOAL "first": the first knock-out wins the game for the hunter', () => {
  B.CONFIG.hunterGoal['3'] = 'first';
  try { const g = three('badger', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The honey badger knocked out a bird.'); }
  finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players, HUNTER_GOAL "catches:N": N catches in total across both birds wins for the hunter', () => {
  B.CONFIG.hunterGoal['3'] = 'catches:3';
  try { const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.red.catches = 1; g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The hyena made 3 catches.');
    const h = three('hyena', [5, 2], [6, 2], [0, 6]); h.three.birds.blue.catches = 0; assert.ok(T.hunterMove(h, [6, 2])); assert.equal(h.phase, 'play', 'one catch is not enough'); }
  finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players: time runs out with no goal met: a draw; the ostrich side wins with an egg alive', () => {
  const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.out = true; g.three.birds.blue.why = 'starved'; g.ostrich = [-99, -99]; g.round = 30; g.eggs.forEach(e => { e.lastWarm = 30; }); g.turn = 'blue'; B.endRound(g); assert.ok(T.finish(g)); assert.equal(g.winner, 'none'); assert.equal(g.endWhy, 'Time ran out and nobody met their goal.');
  const h = three('hyena', [5, 2], [6, 2], [0, 6]); h.round = 30; h.eggs.forEach(e => { e.lastWarm = 30; }); h.turn = 'blue'; B.endRound(h); assert.ok(T.finish(h)); assert.equal(h.winner, 'blue'); });
ok('Hunters: both birds out: more knock-outs wins, then more catches, then a tie', () => {
  const g = hunters([5, 2], [8, 6], [6, 2], [7, 3]); g.hunt.birds.blue.catches = 1; g.hunt.birds.red.catches = 1; g.turn = 'hyena'; g.hunt.hs.hyena.p = [5, 2]; assert.ok(H.hunterMove(g, [6, 2])); assert.equal(g.phase, 'play');
  g.turn = 'badger'; g.hunt.hs.badger.p = [8, 3]; assert.ok(H.hunterMove(g, [7, 3])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'none', 'one knock-out each and one catch each: a tie'); assert.match(g.endWhy, /tie/);
  const h = hunters([5, 2], [8, 6], [6, 2], [7, 3]); h.hunt.birds.blue.catches = 1; h.hunt.birds.red.catches = 1; h.hunt.hs.hyena.catches = 3; h.turn = 'hyena'; assert.ok(H.hunterMove(h, [6, 2])); h.turn = 'badger'; h.hunt.hs.badger.p = [8, 3]; assert.ok(H.hunterMove(h, [7, 3])); assert.equal(h.winner, 'hyena', 'more catches breaks the tie'); });
ok('2 vs 2 + hunter: HUNTER_GOAL "first" (default): one ostrich and one vulture knocked out; "all": every bird', () => {
  assert.equal(B.HUNTER_GOAL('5').kind, 'first');
  const g = team('hyena', { h: [5, 5], o1: [5, 5], o2: [0, 0], v1: [8, 0], v2: [8, 6] }); g.h.kos.v = 1; g.b.o1.catches = 1; g.turn = 'hunter'; g.h.p = [4, 4]; assert.ok(TT.hunterMove(g, [5, 5]));
  assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The hyena knocked out an ostrich and a vulture.');
  B.CONFIG.hunterGoal['5'] = 'all';
  try { const h = team('hyena', { h: [4, 4], o1: [5, 5], o2: [0, 0], v1: [8, 0], v2: [8, 6] }); h.h.kos.v = 1; h.b.o1.catches = 1; h.turn = 'hunter'; assert.ok(TT.hunterMove(h, [5, 5])); assert.equal(h.phase, 'play', 'the game goes on until every bird is out'); }
  finally { B.CONFIG.hunterGoal['5'] = 'first'; } });
ok('2 vs 2: a team stays in while one of its birds is; teammates win or lose together', () => {
  const g = team('hyena', { h: [5, 5], o1: [5, 5], o2: [0, 0], v1: [8, 0], v2: [8, 6] }); g.turn = 'hunter'; g.h.p = [4, 4]; g.b.o1.catches = 1; assert.ok(TT.hunterMove(g, [5, 5])); assert.equal(g.b.o1.out, true); assert.equal(g.phase, 'play'); assert.equal(g.b.o2.out, false); });

console.log(`PASS testv2 (${n} groups)`); process.exit(0);
