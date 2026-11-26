// The stone kick-back cartoons (Brian's picks, 2026-11-25): the vulture throws at the ostrich and she sends it back.
// Each outcome picks its own cartoon on every phone: open ground -> bounce-kick, the vulture on a leaf -> bounce-leaf, on a rock
// pile -> bounce-rock, and the ostrich on a leaf, not carrying -> bounce-trampoline with its own line (Brian approved the words).
// When she had an egg in her beak, a bird's phone gets the -egg cartoon and a hunter's phone never does (a hunter sees no birds).
// A hunter never gets the trampoline or its line either: there are only two leaves, so it would say where she is.
// The game rules are not changed: the same squares and results.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert'), S = require('./server'), C = require('./public/cutaways'), SUR = require('./public/surprise'), ART = require('./public/cutaway-scenes');
const { make } = require('./tests/hunter-fixtures'), T = require('./three'), H = require('./hunt'), TT = require('./team'), B = require('./game');
const KICK = 'The ostrich kicked the stone right back!', LEAF_LINE = 'The ostrich bounced it back off her leaf!';
// v: the vulture, o: the ostrich. bounce/line: what the game records; bird/hunter: the cartoon each phone gets (+ '-egg' for a bird when carrying)
const SPOTS = {
  kick: { v: [5, 3], o: [4, 3], bounce: () => 'kick', line: () => KICK, bird: c => 'bounce-kick' + (c ? '-egg' : ''), hunter: 'bounce-kick' },
  leaf: { v: [0, 0], o: [1, 1], bounce: () => 'leaf', line: () => 'The stone bounced off the leaf.', bird: c => 'bounce-leaf' + (c ? '-egg' : ''), hunter: 'bounce-leaf' },
  rock: { v: [4, 0], o: [4, 1], bounce: () => 'rock', line: () => 'The vulture batted it away with a rock.', bird: c => 'bounce-rock' + (c ? '-egg' : ''), hunter: 'bounce-rock' },
  // the ostrich on a leaf: not carrying, the trampoline; carrying, the plain egg kick-back and the usual line
  trampoline: { v: [1, 1], o: [0, 0], bounce: c => c ? 'kick' : 'trampoline', line: c => c ? KICK : LEAF_LINE, bird: c => c ? 'bounce-kick-egg' : 'bounce-trampoline', hunter: 'bounce-kick' },
  // both on leaves (a test board with leaves at 4,3 and 5,3): the vulture's leaf is the result, so leaf A wins
  bothLeaves: { v: [5, 3], o: [4, 3], foods: [[4, 3], [5, 3]], bounce: () => 'leaf', line: () => 'The stone bounced off the leaf.', bird: c => 'bounce-leaf' + (c ? '-egg' : ''), hunter: 'bounce-leaf' } };
const isHunter = r => r === 'hunter' || r === 'hyena' || r === 'badger';
let checked = 0;
function setup(mode, spot, carry) {
  const f = mode === '2p' ? two() : make(S, mode), g = f.g, s = SPOTS[spot];
  if (s.foods) g.cfg = { ...g.cfg, foods: s.foods };
  if (mode === '5p') {
    g.turn = 'v1'; g.b.v1.pos = s.v.slice(); g.b.o1.pos = s.o.slice(); g.b.o2.pos = [7, 5]; g.b.v2.pos = [0, 6]; g.h.p = [8, 3];
    if (carry) { g.eggs[0].pos = null; g.b.o1.carrying = 0; }
  } else {
    g.turn = 'red'; g.vulture = s.v.slice(); g.ostrich = s.o.slice(); g.stones = 1;
    if (mode === '3p') g.three.h = [8, 3]; if (mode === 'Hunters') { g.hunt.hs.hyena.p = [8, 3]; g.hunt.hs.badger.p = [8, 0]; }
    if (carry) { g.eggs[0].pos = null; g.carrying = 0; }
  }
  return f;
}
function two() {
  const room = { code: 'BNC2', g: B.newGame(), players: {} }, g = room.g;
  for (const p of [[2, 2], [6, 2], [2, 5]]) assert.ok(B.placeEgg(g, p));
  assert.ok(B.placeOstrich(g, [2, 2])); g.phase = 'play';
  return { room, g, roles: ['blue', 'red'], view: r => S.view(room, r) };
}
function throwAt(mode, g, p) { return mode === '5p' ? TT.vultureThrow(g, 'v1', p) : mode === '3p' ? T.vultureThrow3(g, p) : mode === 'Hunters' ? H.vultureThrowH(g, p) : B.vultureThrow(g, p); }
for (const mode of ['2p', '3p', 'Hunters', '5p']) for (const spot of Object.keys(SPOTS)) for (const carry of [false, true]) {
  const f = setup(mode, spot, carry), g = f.g, sp = SPOTS[spot], tag = `${mode} ${spot}${carry ? ' carrying' : ''}`;
  const before = {}; for (const r of f.roles) before[r] = f.view(r);
  assert.equal(throwAt(mode, g, sp.o), 'bounce', tag + ': the stone is sent back');
  assert.equal(g.lastStone.text, sp.line(carry), tag + ': the line');
  assert.equal(g.lastStone.bounce, sp.bounce(carry), tag + ': the game records which bounce it was');
  assert.equal(g.lastStone.carrying, carry, tag + ': the game records whether she had the egg in her beak');
  if (spot === 'trampoline' || spot === 'kick') { const k = mode === '5p' ? g.b.v1.pos : g.vulture; assert.ok(B.wrecked(g, sp.v) && (k[0] !== sp.v[0] || k[1] !== sp.v[1]), tag + ': same result as any kick-back: the square is wrecked and the vulture moves'); }
  for (const r of f.roles) {
    const v = f.view(r), scene = C.sceneFor(v, before[r]);
    const want = isHunter(r) ? sp.hunter : sp.bird(carry);
    assert.ok(scene, tag + ': ' + r + ' gets a cartoon'); assert.equal(scene.id, want, tag + ': ' + r + ' gets ' + want);
    if (isHunter(r)) {
      assert.equal(v.stoneNote.carrying, false, tag + ': a hunter is never told she carries');
      assert.notEqual(v.stoneNote.bounce, 'trampoline', tag + ': a hunter is never told she stands on a leaf');
      assert.ok(!JSON.stringify(v).includes(LEAF_LINE), tag + ': the leaf line is nowhere in a hunter view');
      if (spot === 'trampoline') assert.equal(v.stoneNote.text, KICK, tag + ': a hunter gets the usual line');
    } else assert.equal(v.stoneNote.text, sp.line(carry), tag + ': a bird gets the line');
    const pol = SUR.policy(v, before[r]);
    assert.ok(pol && pol.ev.cartoon && pol.motionDelay === SUR.CARTOON_MS && !pol.lookout && !pol.affected, tag + ': ' + r + ' holds the board for the cartoon, with no Look out!');
    assert.equal(C.sceneFor(v, v), null, tag + ': the same throw does not play twice');
    checked++;
  }
  // after the game ends every view is a full reveal, but a hunter still never gets the egg
  g.phase = 'over';
  for (const r of f.roles.filter(isHunter)) { const v = f.view(r); assert.ok(v.stoneNote.carrying === false && v.stoneNote.bounce !== 'trampoline', tag + ': a hunter is not told after the game ends either'); }
}
// a plain stone that misses, or one that hits an egg, plays no bounce cartoon
{
  const f = setup('3p', 'kick', false), g = f.g, before = {}; for (const r of f.roles) before[r] = f.view(r);
  assert.ok(T.vultureThrow3(g, [5, 4]));
  for (const r of f.roles) { const s = C.sceneFor(f.view(r), before[r]); assert.ok(!s || !/^bounce/.test(s.id), 'a missed stone is not a bounce'); }
  assert.equal(g.lastStone ? g.lastStone.bounce : null, null);
}
// the six cartoons fit the 2 s the board is held for a cartoon
for (const id of ['bounce-kick', 'bounce-kick-egg', 'bounce-trampoline', 'bounce-leaf', 'bounce-leaf-egg', 'bounce-rock', 'bounce-rock-egg']) {
  const sc = ART.scenes[id]; assert.ok(sc, id + ' has drawings');
  assert.ok(sc.steps.length >= 30 && sc.steps.length * 50 <= SUR.CARTOON_MS, id + ' fits in ' + SUR.CARTOON_MS + ' ms');
  assert.equal(sc.steps.length, ART.scenes[id.replace(/-egg$/, '').replace('trampoline', 'kick')].steps.length, id + ' runs the same length as the cartoon a hunter or a plain ostrich gets, so the length is no tell');
}
S.close();
console.log('PASS stone kick-back cartoons: ' + checked + ' views; open ground, trampoline, leaf and rock pile each pick their cartoon; a hunter never gets the egg version or the trampoline');
process.exit(0);
