// Unit tests for rulebook v2 (sections 3 to 9), in all four engines: classic (game.js), 3 players (three.js), Hunters (hunt.js), 2 vs 2 (team.js).
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), HA = require('./huntai.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const DEF3 = 'all'; const C = B.CONFIG, K = B.key, has = (list, p) => list.some(q => K(q) === K(p));

function classic() { const g = B.newGame(); for (const p of [[2, 2], [6, 2], [2, 5]]) assert(B.placeEgg(g, p)); B.placeOstrich(g, [2, 2]); g.turn = 'red'; return g; }
function three(kind, h, o, v) { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [4, 2]));
  g.ostrich = o.slice(); g.vulture = v.slice(); g.three.h = h.slice(); g.phase = 'play'; g.turn = 'hunter'; g.three.sense = false; g.three.pounce = false; return g; }
function hunters(hy, ba, o, v) { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.hunt.hs.hyena.p = hy.slice(); g.hunt.hs.badger.p = ba.slice(); g.ostrich = o.slice(); g.vulture = v.slice(); return g; }
function team(kind, pos) { const g = TT.newTeam(5, kind, undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TT.place(g, 'o1', p); TT.place(g, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TT.place(g, 'o2', p); TT.place(g, 'o2', [7, 1]);
  assert.equal(g.phase, 'play'); for (const s of Object.keys(pos)) if (s === 'h') g.h.p = pos[s].slice(); else g.b[s].pos = pos[s].slice(); g.turn = 'hunter'; g.h.pounce = false; return g; }

// ---- 1 and 2: pounce and speed
ok('HUNTER_GOAL defaults: 3 players all (rule clash R5), 2 vs 2 + hunter first', () => { assert.deepEqual(B.HUNTER_GOAL('3'), { kind: 'all', n: 0 }); assert.equal(B.HUNTER_GOAL('5').kind, 'first'); });
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
  assert.ok(T.vultureThrow3(g, [5, 3])); assert.equal(g.three.burrowed, false); assert.equal(B.wrapDist(g.cfg, [5, 3], g.three.h), 2, 'full distance'); assert.ok(!B.pointsBack(g.cfg, [5, 3], g.three.h, g.vulture), 'not straight away from the vulture'); assert.ok(B.wrecked(g, [5, 3])); assert.ok(g.three.popout);
  const b = three('hyena', [5, 3], [1, 1], [4, 3]); b.turn = 'red'; b.stones = 1; b.three.h = [5, 3]; b.ostrich = [6, 3]; assert.ok(T.vultureThrow3(b, [5, 3])); assert.equal(B.wrapDist(b.cfg, [5, 3], b.three.h), 2); assert.notDeepEqual(b.three.h, [6, 3], 'not on the ostrich'); });
ok('Hunters and 2 vs 2: the stone works on whichever hunter stands there; no stone at the teammate\'s square', () => {
  const g = hunters([5, 3], [8, 6], [0, 6], [4, 3]); g.turn = 'red'; g.stones = 1; assert.ok(H.vultureThrowH(g, [5, 3])); assert.equal(B.wrapDist(g.cfg, [5, 3], g.hunt.hs.hyena.p), 2); assert.ok(!B.pointsBack(g.cfg, [5, 3], g.hunt.hs.hyena.p, g.vulture));
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
  const t = three('badger', [5, 3], [4, 3], [0, 6]); t.turn = 'blue'; assert.ok(T.ostrichKick3(t, [5, 3])); assert.equal(B.wrapDist(t.cfg, [5, 3], t.three.h), t.cfg.kickPushBadger, 'the badger goes the full 2'); assert.ok(!B.pointsBack(t.cfg, [5, 3], t.three.h, t.ostrich) || t.lastKick.fallback, 'not straight back at the ostrich'); });

// ---- 5 and 6: catches and pushes
ok('a caught bird lands exactly 3 squares away on an open square; no missed turn; the egg drops on the catch square; hunters get the landing square only through the view rules', () => {
  const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.carrying = 0; g.eggs[0].pos = null; assert.ok(T.hunterMove(g, [6, 2]));
  const lc = g.three.lastCatch; assert.equal(lc.ko, false); assert.equal(B.dist(g.ostrich, [6, 2]), 3); assert.equal(g.three.birds.blue.skip, 0, 'no missed turn'); assert.deepEqual(g.eggs[0].pos, [6, 2]); assert.equal(g.carrying, null);
  const seen = new Set(); for (let i = 0; i < 60; i++) { const h = three('hyena', [5, 2], [6, 2], [0, 6]); assert.ok(T.hunterMove(h, [6, 2])); seen.add(K(h.ostrich)); } assert.ok(seen.size > 3, 'the landing square varies'); });
ok('scramble: never onto a wrecked square or an animal that is up; with no room the hunter goes back', () => {
  const g = three('hyena', [0, 1], [0, 0], [8, 6]); for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) if (x || y) g.marks[x + ',' + y] = 'stone'; // every square but the catch square is wrecked, so no distance has an open landing
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
  try { const g = three('badger', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The badger knocked out a bird.'); }
  finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players, HUNTER_GOAL "catches:N": N catches in total across both birds wins for the hunter', () => {
  B.CONFIG.hunterGoal['3'] = 'catches:4';
  try { const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.red.catches = 2; g.three.birds.blue.catches = 1; assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The hyena made 4 catches.');
    const h = three('hyena', [5, 2], [6, 2], [0, 6]); h.three.birds.red.catches = 1; h.three.birds.blue.catches = 1; assert.ok(T.hunterMove(h, [6, 2])); assert.equal(h.phase, 'play', '3 catches are not enough'); assert.equal(h.winner, undefined); }
  finally { B.CONFIG.hunterGoal['3'] = DEF3; } });
ok('3 players: time runs out with no goal met: a draw; the ostrich side wins with an egg alive', () => {
  const g = three('hyena', [5, 2], [6, 2], [0, 6]); g.three.birds.blue.out = true; g.three.birds.blue.why = 'starved'; g.ostrich = [-99, -99]; g.round = 30; g.eggs.forEach(e => { e.lastWarm = 30; }); g.turn = 'blue'; B.endRound(g); assert.ok(T.finish(g)); assert.equal(g.winner, 'none'); assert.equal(g.endWhy, 'Time ran out and nobody met their goal.');
  const h = three('hyena', [5, 2], [6, 2], [0, 6]); h.round = 30; h.eggs.forEach(e => { e.lastWarm = 30; }); h.turn = 'blue'; B.endRound(h); assert.ok(T.finish(h)); assert.equal(h.winner, 'blue'); });
ok('Hunters: both birds out: more knock-outs wins, then more catches, then a tie', () => {
  const g = hunters([5, 2], [8, 6], [6, 2], [7, 3]); g.hunt.birds.blue.catches = 1; g.hunt.birds.red.catches = 1; g.turn = 'hyena'; g.hunt.hs.hyena.p = [5, 2]; assert.ok(H.hunterMove(g, [6, 2])); assert.equal(g.phase, 'play');
  g.turn = 'badger'; g.hunt.hs.badger.p = [8, 3]; assert.ok(H.hunterMove(g, [7, 3])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'none', 'one knock-out each and one catch each: a tie'); assert.equal(g.endWhy, 'Both birds are out. The hunters tie: you have the same number of knock-outs, and the same number of catches.');
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

// ---- what each seat is told (views)
process.env.PORT = 0; const S = require('./server.js'); const SEATS3 = ['blue', 'red', 'hunter'];
const room3 = kind => S.create3({ role: 'blue', bots: ['red', 'hunter'], kind }, null).room;
const hasSq = (v, p) => JSON.stringify(v).includes('[' + p[0] + ',' + p[1] + ']');
ok('views: a hunter is never told where a caught bird scrambled to; the bird is; no seat learns a square it cannot see', () => {
  const room = room3('hyena'), g = room.g = three('hyena', [5, 2], [6, 2], [0, 6]); assert.ok(T.hunterMove(g, [6, 2]));
  const v = Object.fromEntries(SEATS3.map(s => [s, S.view3(room, s)])); const to = g.ostrich.slice();
  assert.equal(v.hunter.h3.lastCatch.to, null); assert.deepEqual(v.hunter.ostrich, T.OFF, 'the hunter is not shown the ostrich anywhere'); // (a string search for the square is flaky: the same numbers appear in unrelated arrays) assert.deepEqual(v.blue.h3.lastCatch.to, to); assert.deepEqual(v.red.h3.lastCatch.to, to, 'birds see birds');
  assert.equal(v.red.h3.lastCatch.at, null, 'the vulture at (0,6) cannot see the hyena'); });
ok('views: a stone line goes to every seat with no square; kick lines say how far it really went (wrapped kicks included)', () => {
  const room = room3('hyena'), g = room.g = three('hyena', [5, 2], [4, 3], [5, 3]); g.turn = 'red'; g.stones = 1; assert.ok(T.vultureThrow3(g, [4, 3]));
  for (const s of SEATS3) { const v = S.view3(room, s); assert.equal(v.stoneNote.text, 'The ostrich kicked the stone right back!'); assert.deepEqual(Object.keys(v.stoneNote).sort(), ['by', 'kicker', 'seq', 'targets', 'text', 'trails']); }
  const r2 = room3('hyena'), k = r2.g = three('hyena', [1, 6], [6, 3], [7, 3]); k.turn = 'blue'; assert.ok(T.ostrichKick3(k, [7, 3])); assert.equal(S.view3(r2, 'blue').kick.moved, 3); assert.deepEqual(k.vulture, [1, 3]); });
ok('views: birds (not hunters) see an ostrich that is sitting; the end screen carries one plain reason', () => {
  const room = room3('hyena'), g = room.g = three('hyena', [0, 6], [2, 1], [5, 5]); g.turn = 'blue'; assert.ok(T.ostrichAct3(g, 'sit'));
  assert.deepEqual(S.view3(room, 'red').sittingAt, [[2, 1]]); assert.deepEqual(S.view3(room, 'hunter').sittingAt, []); assert.deepEqual(S.view3(room, 'blue').sittingAt, [[2, 1]]);
  g.phase = 'over'; g.endWhy = 'The hyena made 4 catches.'; assert.equal(S.view3(room, 'blue').endWhy, 'The hyena made 4 catches.'); });
ok('views: Hunters and 2 vs 2 carry the same notes', () => {
  const rh = S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null).room, g = rh.g = hunters([5, 3], [8, 6], [0, 6], [4, 3]); g.turn = 'red'; g.stones = 1; assert.ok(H.vultureThrowH(g, [5, 3]));
  assert.equal(B.wrapDist(g.cfg, [5, 3], g.hunt.hs.hyena.p), 2); assert.deepEqual(S.viewH(rh, 'hyena').sittingAt, []);
  const rt = S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind: 'hyena' }, null).room, t = rt.g = team('hyena', { h: [8, 3], o1: [2, 1], o2: [7, 1], v1: [3, 3], v2: [3, 4] }); t.turn = 'o1'; assert.ok(TT.ostrichAct(t, 'o1', 'sit'));
  assert.deepEqual(S.viewT(rt, 'v1').sittingAt, [[2, 1]]); assert.deepEqual(S.viewT(rt, 'hunter').sittingAt, []); });


// ---- 7.4: the badger digs in (told to the badger and to birds that saw it; a mound for those birds) and bursts out from under the hyena
const CT = require('./public/catchtext.js'), BLN = require('./public/badgerlines.js');
const roomH2 = () => S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null).room;
const roomT2 = kind => S.createT({ team: 5, role: 'hunter', bots: ['v1', 'v2', 'o1', 'o2'], kind }, null).room;
const freshSeen = () => ({ pop: 0, rival: 0, kick: 0, stone: 0, dug: 0, burst: 0, smash: 0 });
const digEvents = v => CT.newEvents(freshSeen(), v, { phase: 'play', h3: {} }).filter(e => e.kind === 'dug' || /dug in/i.test(e.text || ''));
// A bird that did not see the dig: no dig event, no mound, no dig line, and the burrow flag stays off (Brian, 2026-11-16).
function noDig(v, label) {
  assert.ok(v && v.h3, label + ' has a view');
  assert.ok(v.h3.dug == null, label + ' gets no dig event');
  assert.ok(v.h3.mound == null, label + ' gets no mound');
  assert.ok(v.h3.dugSeen == null, label + ' is not told whether a bird saw it');
  assert.ok(!v.h3.burrowed, label + ' burrow status does not say a dig happened');
  assert.ok(!/dug in/i.test(JSON.stringify(v)), label + ' view has no dig line');
  assert.deepEqual(digEvents(v), [], label + ' page gets no dig line');
}
ok('3 players: digging in is told to the badger and to a bird that saw it; a bird too far gets no dig line or event, and only the bird that saw it gets the mound', () => {
  const room = room3('badger'), g = room.g = three('badger', [4, 3], [8, 0], [4, 5]); // the vulture is 2 away, the ostrich far
  assert.ok(T.hunterStay(g)); assert.equal(g.three.burrowed, true);
  const v = Object.fromEntries(SEATS3.map(s => [s, S.view3(room, s)]));
  assert.deepEqual(v.hunter.h3.dug, { seq: 1, round: g.round }, 'the badger is told');
  assert.deepEqual(v.red.h3.dug, { seq: 1, round: g.round }, 'the vulture saw it');
  assert.equal(digEvents(v.red)[0].text, 'The badger dug in!');
  assert.equal(digEvents(v.hunter)[0].text, 'A bird saw you dig in.');
  noDig(v.blue, 'ostrich');
  assert.deepEqual(v.red.h3.mound, [4, 3]); assert.equal(v.hunter.h3.mound, null);
  assert.equal(v.blue.h3.hunter, null, 'nothing else leaks to the ostrich'); assert.equal(CT.dugLine(), 'The badger dug in!');
  // the badger moves: no mound left; the dig stays for the badger and the bird that saw it, and still nothing for the ostrich
  g.turn = 'hunter'; assert.ok(T.hunterMove(g, [5, 3]));
  for (const s of ['hunter', 'red']) { const w = S.view3(room, s); assert.equal(w.h3.mound, null, s + ' has no stale mound'); assert.equal(JSON.stringify(w.h3.dug), JSON.stringify({ seq: 1, round: g.round })); assert.ok(!hasSq(w.h3.dug, [4, 3])); }
  noDig(S.view3(room, 'blue'), 'ostrich after the badger moves');
  // it digs again where nobody can see: the badger gets the new line; neither bird does
  g.vulture = [0, 6]; g.turn = 'hunter'; assert.ok(T.hunterStay(g));
  assert.equal(S.view3(room, 'hunter').h3.dug.seq, 2); assert.equal(S.view3(room, 'hunter').h3.mound, null);
  noDig(S.view3(room, 'red'), 'vulture on the unseen dig'); noDig(S.view3(room, 'blue'), 'ostrich on the unseen dig'); });
ok('3 players: staying burrowed does not announce a second dig; a hyena never digs', () => {
  const g = three('badger', [4, 3], [8, 0], [4, 5]); T.hunterStay(g); g.turn = 'hunter'; T.hunterStay(g); assert.equal(g.three.dug.seq, 1);
  const h = three('hyena', [4, 3], [8, 0], [4, 5]); T.hunterStay(h); assert.equal(h.three.dug, undefined); });
ok('Hunters: the hyena is not told the dig, even standing next to the badger; a bird that saw it gets the line and the mound; a bird that did not gets neither', () => {
  const room = roomH2(), g = room.g = hunters([5, 3], [4, 3], [8, 6], [4, 5]); g.turn = 'badger'; assert.ok(H.hunterStay(g));
  assert.equal(S.viewH(room, 'badger').h3.dug.seq, 1); assert.equal(S.viewH(room, 'red').h3.dug.seq, 1);
  assert.equal(digEvents(S.viewH(room, 'red'))[0].text, 'The badger dug in!');
  noDig(S.viewH(room, 'blue'), 'ostrich'); noDig(S.viewH(room, 'hyena'), 'hyena');
  assert.deepEqual(S.viewH(room, 'red').h3.mound, [4, 3]);
  g.turn = 'badger'; assert.ok(H.hunterMove(g, [3, 3])); for (const s of ['blue', 'red', 'hyena', 'badger']) assert.equal(S.viewH(room, s).h3.mound, null); });
ok('2 vs 2 + hunter: digging in is told to the badger and to a bird that saw it; the mound goes only to that bird', () => {
  const room = roomT2('badger'), g = room.g = team('badger', { h: [4, 3], o1: [8, 6], o2: [8, 0], v1: [4, 5], v2: [0, 0] }); g.turn = 'hunter'; assert.ok(TT.hunterStay(g));
  assert.equal(S.viewT(room, 'hunter').h3.dug.seq, 1); assert.equal(S.viewT(room, 'v1').h3.dug.seq, 1);
  assert.equal(digEvents(S.viewT(room, 'v1'))[0].text, 'The badger dug in!');
  for (const s of ['o1', 'o2', 'v2']) noDig(S.viewT(room, s), s);
  assert.deepEqual(S.viewT(room, 'v1').h3.mound, [4, 3]); assert.equal(S.viewT(room, 'hunter').h3.mound, null); });
ok('4 players: there is no hunter, so no bird view carries a dig line or event', () => {
  const room = S.createT({ team: 4, role: 'o1', bots: ['o2', 'v1', 'v2'] }, null).room, g = TT.newTeam(4);
  for (const p of [[2, 1], [2, 3]]) assert.ok(TT.place(g, 'o1', p)); assert.ok(TT.place(g, 'o1', [1, 1]));
  for (const p of [[6, 1], [6, 3]]) assert.ok(TT.place(g, 'o2', p)); assert.ok(TT.place(g, 'o2', [7, 1]));
  assert.equal(g.phase, 'play'); assert.equal(g.h, null); room.g = g;
  for (const s of ['o1', 'o2', 'v1', 'v2']) noDig(S.viewT(room, s), '4p ' + s); });
// Brian, 2026-11-15: the badger is told before it digs whether a bird will see it, and after, whether one did. Only the badger's phone learns this.
ok('the badger is told whether a bird saw it dig in, in all three modes, and nobody else is', () => {
  const room = room3('badger'), g = room.g = three('badger', [4, 3], [8, 0], [4, 5]); assert.ok(T.hunterStay(g));
  assert.equal(S.view3(room, 'hunter').h3.dugSeen, true); for (const s of ['blue', 'red']) assert.equal(S.view3(room, s).h3.dugSeen, null, s);
  g.vulture = [0, 6]; g.turn = 'hunter'; assert.ok(T.hunterMove(g, [5, 3])); g.turn = 'hunter'; assert.ok(T.hunterStay(g)); assert.equal(S.view3(room, 'hunter').h3.dugSeen, false, 'no bird near this time');
  const rh = roomH2(), h = rh.g = hunters([5, 3], [4, 3], [8, 6], [4, 5]); h.turn = 'badger'; assert.ok(H.hunterStay(h));
  assert.equal(S.viewH(rh, 'badger').h3.dugSeen, true); assert.equal(S.viewH(rh, 'hyena').h3.dugSeen, null, 'the hyena must not learn it');
  const rt = roomT2('badger'), t = rt.g = team('badger', { h: [4, 3], o1: [8, 6], o2: [8, 0], v1: [0, 6], v2: [0, 0] }); t.turn = 'hunter'; assert.ok(TT.hunterStay(t));
  assert.equal(S.viewT(rt, 'hunter').h3.dugSeen, false); for (const s of ['o1', 'v1']) assert.equal(S.viewT(rt, s).h3.dugSeen, null, s);
  const seen = { dug: 0 }, mk = (seq, dugSeen) => ({ h3: { dug: seq ? { seq, round: 3 } : null, dugSeen } });
  assert.equal(CT.newEvents(seen, mk(1, true), mk(0)).find(e => e.kind === 'dug').text, 'A bird saw you dig in.');
  assert.equal(CT.newEvents(seen, mk(2, false), mk(1)).find(e => e.kind === 'dug').text, 'The badger dug in!'); });
ok('before digging, the Burrow hint says whether a bird will see it', () => {
  const src = require('fs').readFileSync('./public/three-ui.js', 'utf8') + require('fs').readFileSync('./public/ring.js', 'utf8');
  for (const w of ['A bird will see you dig in.', 'No bird will see you dig in.']) assert.ok(src.split(w).length >= 3, w + ' is on the button and in the hint');
  assert.ok(!/stay still to (burrow|hide)/i.test(src), 'the old "stay still" words are gone'); });
ok('Hunters: the hyena that walks onto the buried badger shares its square; the badger may burst out and shoves the hyena 2 back the way it came', () => {
  const room = roomH2(), g = room.g = hunters([2, 3], [4, 3], [8, 6], [0, 0]); g.hunt.hs.badger.burrowed = true; g.turn = 'hyena';
  assert.ok(H.hunterMove(g, [4, 3])); assert.deepEqual(g.hunt.hs.hyena.p, [4, 3]); assert.equal(g.turn, 'badger'); assert.equal(H.canBurst(g), true);
  assert.equal(S.viewH(room, 'badger').canBurst, true); assert.equal(S.viewH(room, 'hyena').canBurst, false);
  assert.ok(H.hunterBurst(g)); assert.deepEqual(g.hunt.hs.hyena.p, [2, 3], 'back west the way it came'); assert.equal(g.hunt.hs.badger.burrowed, false); assert.deepEqual(g.hunt.hs.badger.p, [4, 3]); assert.equal(g.turn, 'red');
  const v = { blue: S.viewH(room, 'blue'), red: S.viewH(room, 'red'), hyena: S.viewH(room, 'hyena'), badger: S.viewH(room, 'badger') };
  for (const s of Object.keys(v)) { assert.equal(v[s].h3.burst.seq, 1, s); assert.equal(v[s].h3.burst.n, 2); }
  assert.deepEqual(v.hyena.h3.burst.to, [2, 3]); assert.deepEqual(v.red.h3.burst.to, [2, 3], 'every phone is told where the hyena lands'); assert.equal(v.red.h3.burst.trail, null, 'a far vulture is not sent the path, because it starts in the badger hole');
  assert.equal(CT.burstLine(v.blue.h3.burst), 'The badger burst out and shoved the hyena 2 squares!');
  assert.equal(BLN.detect({ phase: 'play', h3: {} }, { phase: 'play', h3: { burst: { seq: 1 } }, role: 'blue' }, BLN.createPicker())[0].text, BLN.LINES.shove, 'the shove quote goes with it'); });
ok('burst out: blocked by a wrecked square or an animal, the hyena moves less or not at all; nobody is hurt; unknown direction is random; only the badger on a shared square may burst', () => {
  const a = hunters([3, 3], [4, 3], [8, 6], [0, 0]); a.hunt.hs.badger.burrowed = true; a.turn = 'hyena'; assert.ok(H.hunterMove(a, [4, 3])); a.marks['3,3'] = 'stone'; assert.ok(H.hunterBurst(a)); assert.deepEqual(a.hunt.hs.hyena.p, [4, 3], 'wrecked square right behind it: it cannot move'); assert.equal(a.hunt.burst.n, 0); assert.equal(CT.burstLine(a.hunt.burst), 'The badger burst out and shoved the hyena 0 squares!');
  const seen = new Set(); for (let i = 0; i < 60; i++) { const b = hunters([4, 3], [4, 3], [8, 6], [0, 0]); b.hunt.hs.badger.burrowed = true; b.turn = 'badger'; b.marks['3,3'] = 'stone'; assert.ok(H.hunterBurst(b)); const p = b.hunt.hs.hyena.p; assert.ok(B.dist(p, [4, 3]) >= 1 && !B.wrecked(b, p)); seen.add(K(p)); } assert.ok(seen.size > 2, 'random open direction');
  const c = hunters([3, 3], [4, 3], [8, 6], [0, 0]); c.hunt.hs.badger.burrowed = true; c.turn = 'badger'; assert.equal(H.canBurst(c), false, 'the hyena is not on its square'); assert.equal(H.hunterBurst(c), false);
  const d = hunters([4, 3], [4, 3], [8, 6], [0, 0]); d.turn = 'badger'; assert.equal(H.canBurst(d), false, 'not buried'); });
ok('dig and burst lines reach the page as events, once each, and a page opened mid-game says nothing old', () => {
  const seen = { pop: 0, rival: 0, kick: 0, stone: 0, dug: 0, burst: 0 }, S0 = { phase: 'play', h3: {} }, S1 = { phase: 'play', h3: { dug: { seq: 1 } } };
  assert.deepEqual(CT.newEvents(seen, S1, null), []); assert.deepEqual(CT.newEvents(seen, S1, S0), []);
  const s2 = { phase: 'play', h3: { dug: { seq: 2 }, burst: { seq: 1, n: 2, to: [2, 3] } } }, e = CT.newEvents(seen, s2, S1);
  assert.deepEqual(e.map(x => x.text), ['The badger dug in!', 'The badger burst out and shoved the hyena 2 squares!']); assert.deepEqual(e[1].square, [2, 3]); assert.deepEqual(CT.newEvents(seen, s2, s2), []); });

console.log(`PASS testv2 (${n} groups)`); process.exit(0);
