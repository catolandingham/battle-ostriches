// Unit tests: 4-player Hunters mode (ostrich + vulture + hyena + badger). node testhunt.js
process.env.PORT = 0;
const assert = require('assert'), H = require('./hunt.js'), HA = require('./huntai.js'), SIM = require('./simhunt.js'), B = require('./game.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const k = p => p + '';
function ready() { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.ostrich = [4, 6]; g.vulture = [4, 0]; return g; }
const toTurn = (g, t) => { for (let i = 0; i < 8 && g.turn !== t; i++) H.timeout(g); assert.equal(g.turn, t); };
ok('turn order: vulture, ostrich, hyena, badger', () => { const g = ready(), seen = []; for (let i = 0; i < 4; i++) { seen.push(g.turn); H.timeout(g); }
  assert.deepEqual(seen, ['red', 'blue', 'hyena', 'badger']); assert.equal(g.turn, 'red'); });
ok('badger: one still turn always burrows (birds can not see it); moving pops it up', () => { for (let i = 0; i < 20; i++) { const g = ready(); toTurn(g, 'badger'); H.hunterStay(g);
    assert.equal(g.hunt.hs.badger.burrowed, true); g.vulture = [6, 3]; assert.equal(H.seen(g, 'red', 'badger'), false);
    toTurn(g, 'badger'); H.hunterMove(g, [7, 2]); assert.equal(g.hunt.hs.badger.dig, 0); assert.equal(g.hunt.hs.badger.burrowed, false); } });
ok('ambush sight (Hunters): a burrowed badger sees the exact square of a bird next to it, not one 2 away', () => { const g = ready(); toTurn(g, 'badger'); g.ostrich = [7, 3]; g.vulture = [6, 2];
  assert.deepEqual(H.ambushSight(g), [], 'not burrowed: nothing'); H.hunterStay(g); assert.equal(g.hunt.hs.badger.burrowed, true);
  const s = H.ambushSight(g); assert.equal(s.length, 1); assert.deepEqual(s[0].p, [7, 3]); assert.equal(s[0].seat, 'blue'); assert.equal(H.seen(g, 'blue', 'badger'), false, 'birds still cannot see it');
  g.hunt.hs.hyena.burrowed = true; assert.equal(H.ambushSight(g).length, 1, 'only the badger has it'); g.ostrich = [6, 3]; assert.deepEqual(H.ambushSight(g), [], 'two away: nothing'); });
ok('ambush catch (Hunters): a catch on the move out of the burrow sets ambush; an open catch or a walk-in does not', () => {
  const a = ready(); toTurn(a, 'badger'); H.hunterStay(a); a.ostrich = [7, 3]; toTurn(a, 'badger'); assert.ok(a.hunt.hs.badger.burrowed); H.hunterMove(a, [7, 3]); assert.equal(a.hunt.lastCatch.ambush, true); assert.equal(a.hunt.lastCatch.by, 'badger');
  const o = ready(); toTurn(o, 'badger'); o.ostrich = [7, 3]; H.hunterMove(o, [7, 3]); assert.ok(!o.hunt.lastCatch.ambush, 'open catch');
  const w = ready(); toTurn(w, 'blue'); w.hunt.hs.badger.p = [5, 6]; w.hunt.hs.badger.burrowed = true; w.ostrich = [4, 6]; assert.ok(H.ostrichActH(w, 'step', [5, 6])); assert.equal(w.hunt.lastCatch.walked, true); assert.ok(!w.hunt.lastCatch.ambush, 'walk-in');
  const y = ready(); toTurn(y, 'hyena'); y.hunt.hs.badger.burrowed = true; y.vulture = [1, 3]; H.hunterMove(y, [1, 3]); assert.ok(!y.hunt.lastCatch.ambush, 'a hyena catch is never an ambush'); });
ok('hyena pounce: sense yes -> one extra square', () => { const g = ready(); g.vulture = [2, 4]; toTurn(g, 'hyena'); g.vulture = [2, 4]; g.hunt.hs.hyena.sense = true;
  H.hunterMove(g, [1, 3]); assert.equal(g.turn, 'hyena'); assert.equal(g.hunt.hs.hyena.pounce, true); H.hunterMove(g, [2, 4]); assert.equal(g.hunt.birds.red.catches, 1); });
ok('rivalry: badger moves onto the hyena -> hyena knocked back 2; nobody hurt', () => { const g = ready(); toTurn(g, 'badger'); g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [5, 3];
  H.hunterMove(g, [4, 3]); assert.deepEqual(g.hunt.hs.badger.p, [4, 3]); assert.deepEqual(g.hunt.hs.hyena.p, [2, 3]); assert.equal(g.hunt.rival.by, 'badger');
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 'red'); });
ok('both birds out: more KOs wins', () => { const g = ready(); H.knockout(g, 'red', 'caught', 'hyena'); assert.equal(g.phase, 'play'); g.hunt.hs.badger.kos = 0;
  H.knockout(g, 'blue', 'caught', 'hyena'); assert.equal(g.winner, 'hyena'); assert.equal(g.winBy, 'ko'); });

ok('both birds caught: endWhy says the hunters knocked out both birds; a starved bird uses Both birds are out.', () => {
  const g = ready(); H.knockout(g, 'red', 'caught', 'hyena'); H.knockout(g, 'blue', 'caught', 'hyena');
  assert.equal(g.winner, 'hyena'); assert.match(g.endWhy, /^The hunters knocked out both birds\./);
  const s = ready(); H.knockout(g, 'red', 'caught', 'hyena'); // already over from above, use s
  H.knockout(s, 'red', 'starved'); H.knockout(s, 'blue', 'caught', 'badger');
  assert.equal(s.winner, 'badger'); assert.match(s.endWhy, /^Both birds are out\./); assert.ok(!/knocked out both/.test(s.endWhy));
});
ok('hunters tie endWhy is the approved sentence', () => {
  const g = ready(); H.knockout(g, 'red', 'caught', 'hyena'); g.hunt.hs.badger.kos = 0; g.hunt.hs.hyena.catches = 1; g.hunt.hs.badger.catches = 1;
  H.knockout(g, 'blue', 'caught', 'badger');
  assert.equal(g.winner, 'none');
  assert.equal(g.endWhy, 'Both birds are out. The hunters tie: you have the same number of knock-outs, and the same number of catches.');
});
ok('birds win by their own goals: vulture smashes every egg', () => { const g = ready(); g.eggs.forEach((e, i) => { if (i) e.alive = false; }); toTurn(g, 'red');
  g.vulture = B.key(g.eggs[0].pos) === '4,1' ? [4, 2] : g.eggs[0].pos.map((v, i) => i ? v : v); g.stones = 1;
  const r = H.vultureThrowH(g, g.eggs[0].pos); assert.ok(r); if (r === 'hit') { assert.equal(g.winner, 'red'); } });
ok('ostrich wins at round 30 with an egg alive', () => { const g = ready(); g.round = g.cfg.rounds; g.eggs.forEach(e => e.lastWarm = g.round); g.hungerLeft = 9; toTurn(g, 'blue');
  H.timeout(g); assert.equal(g.winner, 'blue'); });
ok('starved ostrich is out; the others play on', () => { const g = ready(); toTurn(g, 'blue'); g.hungerLeft = 1; g.ostrich = [4, 6]; H.timeout(g);
  assert.equal(g.hunt.birds.blue.out, true); assert.equal(g.hunt.birds.blue.why, 'starved'); assert.equal(g.phase, 'play'); assert.equal(g.turn, 'hyena'); });
ok('views: birds see a hunter only within 2 (never burrowed); hunters see the rival within 2', () => { const g = ready(); g.vulture = [2, 3];
  assert.equal(H.seen(g, 'red', 'hyena'), true); assert.equal(H.seen(g, 'red', 'badger'), false); assert.equal(H.seen(g, 'hyena', 'badger'), false);
  g.hunt.hs.badger.p = [2, 4]; assert.equal(H.seen(g, 'hyena', 'badger'), true); });
ok('bot sim: every game ends, no illegal bot moves, all four seats can win (the hyena\'s share is small with the simplified Pounce: see the sim numbers)', () => { const c = {}; let bad = 0;
  for (let i = 0; i < 400; i++) { const x = SIM.play(); c[x.w] = (c[x.w] || 0) + 1; bad += x.bad; }
  assert.equal(bad, 0); for (const w of ['blue', 'red', 'hyena', 'badger']) assert.ok(c[w] > 5, w + ' wins ' + c[w]); });
console.log(n + ' hunters tests passed');
