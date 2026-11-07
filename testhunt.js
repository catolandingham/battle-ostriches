process.env.BO_TOUGH = process.env.BO_TOUGH || "1"; // exercise the 2-turn (tough ground) dig path
// Unit tests: 4-player Hunters mode (ostrich + vulture + hyena + honey badger). node testhunt.js
process.env.PORT = 0;
const assert = require('assert'), H = require('./hunt.js'), HA = require('./huntai.js'), SIM = require('./simhunt.js'), B = require('./game.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const k = p => p + '';
function ready() { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) assert.ok(HA.act(g, 'blue', HA.move(g, 'blue', {})));
  g.ostrich = [4, 6]; g.vulture = [4, 0]; return g; }
const toTurn = (g, t) => { for (let i = 0; i < 8 && g.turn !== t; i++) H.timeout(g); assert.equal(g.turn, t); };
ok('turn order: vulture, ostrich, hyena, badger', () => { const g = ready(), seen = []; for (let i = 0; i < 4; i++) { seen.push(g.turn); H.timeout(g); }
  assert.deepEqual(seen, ['red', 'blue', 'hyena', 'badger']); assert.equal(g.turn, 'red'); });
ok('hunters move 1; no speed boost after a knock-out', () => { const g = ready(); g.hunt.birds.red.out = true; g.vulture = H.OFF.slice(); toTurn(g, 'hyena');
  assert.ok(H.hunterMoves(g).every(p => B.dist(p, g.hunt.hs.hyena.p) === 1)); assert.equal(H.hunterRange(g), 1); });
ok('hyena: 2 catches knock a bird out; first catch knocks back 2 and costs a turn', () => { const g = ready(); toTurn(g, 'hyena'); g.vulture = [1, 3];
  H.hunterMove(g, [1, 3]); assert.equal(g.hunt.birds.red.catches, 1); assert.deepEqual(g.vulture, [3, 3]); assert.equal(g.hunt.birds.red.skip, 1);
  assert.equal(g.turn, 'badger'); H.timeout(g); assert.equal(g.turn, 'blue', 'vulture lost its turn'); toTurn(g, 'hyena'); g.vulture = [2, 3]; H.hunterMove(g, [2, 3]);
  assert.equal(g.hunt.birds.red.out, true); assert.equal(g.hunt.hs.hyena.kos, 1); });
ok('honey badger: 2 catches knock a bird out; first catch knocks back 2, costs a turn and hurts', () => { const g = ready(); toTurn(g, 'badger'); g.ostrich = [7, 3];
  H.hunterMove(g, [7, 3]); assert.equal(g.hunt.birds.blue.catches, 1); assert.equal(g.hunt.lastCatch.ko, false); assert.equal(g.hunt.birds.blue.out, false); assert.equal(g.hunt.hs.badger.kos, 0);
  assert.deepEqual(g.ostrich, [5, 3]); assert.equal(g.hunt.birds.blue.skip, 1); toTurn(g, 'badger'); g.ostrich = [6, 3]; H.hunterMove(g, [6, 3]);
  assert.equal(g.hunt.birds.blue.catches, 2); assert.equal(g.hunt.lastCatch.ko, true); assert.equal(g.hunt.birds.blue.out, true); assert.equal(g.hunt.hs.badger.kos, 1); assert.equal(H.TH.ko.badger, H.TH.ko.hyena); });
ok('honey badger: staying still burrows (birds can not see it)', () => { const g = ready(); toTurn(g, 'badger'); H.hunterStay(g); assert.equal(g.hunt.hs.badger.burrowed, false); assert.equal(g.hunt.hs.badger.dig, 1); toTurn(g, 'badger'); H.hunterStay(g);
  assert.equal(g.hunt.hs.badger.burrowed, true); g.vulture = [6, 3]; assert.equal(H.seen(g, 'red', 'badger'), false); });
ok('badger digs in over 2 still turns; moving resets the dig', () => { const g = ready(); toTurn(g, 'badger'); H.hunterStay(g); assert.equal(g.hunt.hs.badger.dig, 1);
  toTurn(g, 'badger'); H.hunterMove(g, [7, 2]); assert.equal(g.hunt.hs.badger.dig, 0); toTurn(g, 'badger'); H.hunterStay(g); assert.equal(g.hunt.hs.badger.burrowed, false); });
ok('hyena pounce: sense yes -> one extra square', () => { const g = ready(); g.vulture = [2, 4]; toTurn(g, 'hyena'); g.vulture = [2, 4]; g.hunt.hs.hyena.sense = true;
  H.hunterMove(g, [1, 3]); assert.equal(g.turn, 'hyena'); assert.equal(g.hunt.hs.hyena.pounce, true); H.hunterMove(g, [2, 4]); assert.equal(g.hunt.birds.red.catches, 1); });
ok('rivalry: badger moves onto the hyena -> hyena knocked back 2; nobody hurt', () => { const g = ready(); toTurn(g, 'badger'); g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [5, 3];
  H.hunterMove(g, [4, 3]); assert.deepEqual(g.hunt.hs.badger.p, [4, 3]); assert.deepEqual(g.hunt.hs.hyena.p, [2, 3]); assert.equal(g.hunt.rival.by, 'badger');
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 'red'); });
ok('rivalry: hyena moves onto the badger -> hyena bounces back 2 (badger stays, unburrowed)', () => { const g = ready(); toTurn(g, 'hyena'); g.hunt.hs.hyena.p = [3, 3]; g.hunt.hs.badger.p = [4, 3];
  g.hunt.hs.badger.burrowed = true; H.hunterMove(g, [4, 3]); assert.deepEqual(g.hunt.hs.badger.p, [4, 3]); assert.deepEqual(g.hunt.hs.hyena.p, [2, 3]);
  assert.equal(g.hunt.hs.badger.burrowed, false); assert.equal(g.turn, 'badger', 'no pounce after a bounce'); });
ok('a bird stepping onto a hunter is caught by that hunter', () => { const g = ready(); toTurn(g, 'red'); g.vulture = [2, 3]; g.hunt.hs.badger.p = [3, 3]; g.hunt.birds.red.catches = 1; // already hurt once, so this second catch knocks it out
  H.vultureFlyH(g, [3, 3]); assert.equal(g.hunt.birds.red.out, true); assert.equal(g.hunt.hs.badger.kos, 1); });
ok('lastCatch.walked: true when a bird stepped onto a hunter, absent when a hunter landed on the bird', () => {
  const v = ready(); toTurn(v, 'red'); v.vulture = [2, 3]; v.hunt.hs.hyena.p = [3, 3]; H.vultureFlyH(v, [3, 3]); assert.equal(v.hunt.lastCatch.bird, 'red'); assert.equal(v.hunt.lastCatch.by, 'hyena'); assert.strictEqual(v.hunt.lastCatch.walked, true);
  const o = ready(); toTurn(o, 'blue'); o.ostrich = [4, 6]; o.hunt.hs.badger.p = [5, 6]; o.hunt.birds.blue.catches = 1; assert.ok(H.ostrichActH(o, 'step', [5, 6])); assert.equal(o.hunt.lastCatch.bird, 'blue'); assert.equal(o.hunt.lastCatch.by, 'badger'); assert.strictEqual(o.hunt.lastCatch.ko, true); assert.strictEqual(o.hunt.lastCatch.walked, true);
  const h = ready(); toTurn(h, 'hyena'); h.vulture = [1, 3]; H.hunterMove(h, [1, 3]); assert.equal(h.hunt.lastCatch.bird, 'red'); assert(!h.hunt.lastCatch.walked, 'hyena landed on the vulture');
  const b = ready(); toTurn(b, 'badger'); b.ostrich = [7, 3]; b.hunt.birds.blue.catches = 1; H.hunterMove(b, [7, 3]); assert.equal(b.hunt.lastCatch.ko, true); assert(!b.hunt.lastCatch.walked, 'badger landed on the ostrich'); });
ok('both birds out: more KOs wins', () => { const g = ready(); H.knockout(g, 'red', 'caught', 'hyena'); assert.equal(g.phase, 'play'); g.hunt.hs.badger.kos = 0;
  H.knockout(g, 'blue', 'caught', 'hyena'); assert.equal(g.winner, 'hyena'); assert.equal(g.winBy, 'ko'); });
ok('KO tie goes to whoever got the last KO', () => { const g = ready(); H.knockout(g, 'red', 'caught', 'hyena'); H.knockout(g, 'blue', 'caught', 'badger'); assert.equal(g.winner, 'badger');
  const g2 = ready(); H.knockout(g2, 'blue', 'caught', 'badger'); H.knockout(g2, 'red', 'caught', 'hyena'); assert.equal(g2.winner, 'hyena'); });
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
ok('bot sim: every game ends, no illegal bot moves, all four seats can win', () => { const c = {}; let bad = 0;
  for (let i = 0; i < 400; i++) { const x = SIM.play(); c[x.w] = (c[x.w] || 0) + 1; bad += x.bad; }
  assert.equal(bad, 0); for (const w of ['blue', 'red', 'hyena', 'badger']) assert.ok(c[w] > 30, w + ' wins ' + c[w]); });
console.log(n + ' hunters tests passed');
