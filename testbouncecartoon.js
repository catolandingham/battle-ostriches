// The stone kick-back cartoons (Brian's picks, 2026-11-25): the vulture throws at the ostrich and she kicks it back.
// Each of the three outcomes picks its own cartoon on every phone: open ground -> bounce-kick, the vulture on a leaf ->
// bounce-leaf, on a rock pile -> bounce-rock. When she had an egg in her beak, a bird's phone gets the -egg cartoon and a
// hunter's phone never does (a hunter sees no birds). The game rules are not changed: the same lines and the same squares.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert'), S = require('./server'), C = require('./public/cutaways'), SUR = require('./public/surprise'), ART = require('./public/cutaway-scenes');
const { make } = require('./tests/hunter-fixtures'), T = require('./three'), H = require('./hunt'), TT = require('./team'), B = require('./game');
const SPOTS = { kick: { v: [5, 3], o: [4, 3], line: 'The ostrich kicked the stone right back!' },
  leaf: { v: [0, 0], o: [1, 1], line: 'The stone bounced off the leaf.' },
  rock: { v: [4, 0], o: [4, 1], line: 'The vulture batted it away with a rock.' } };
const isHunter = r => r === 'hunter' || r === 'hyena' || r === 'badger';
let checked = 0;
function setup(mode, spot, carry) {
  const f = mode === '2p' ? two() : make(S, mode), g = f.g, s = SPOTS[spot];
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
for (const mode of ['2p', '3p', 'Hunters', '5p']) for (const spot of ['kick', 'leaf', 'rock']) for (const carry of [false, true]) {
  const f = setup(mode, spot, carry), g = f.g, tag = `${mode} ${spot}${carry ? ' carrying' : ''}`;
  const before = {}; for (const r of f.roles) before[r] = f.view(r);
  assert.equal(throwAt(mode, g, SPOTS[spot].o), 'bounce', tag + ': the stone is kicked back');
  assert.equal(g.lastStone.text, SPOTS[spot].line, tag + ': the line is unchanged');
  assert.equal(g.lastStone.bounce, spot, tag + ': the game records which bounce it was');
  assert.equal(g.lastStone.carrying, carry, tag + ': the game records whether she had the egg in her beak');
  for (const r of f.roles) {
    const v = f.view(r), scene = C.sceneFor(v, before[r]);
    const want = 'bounce-' + spot + (carry && !isHunter(r) ? '-egg' : '');
    assert.ok(scene, tag + ': ' + r + ' gets a cartoon'); assert.equal(scene.id, want, tag + ': ' + r + ' gets ' + want);
    if (isHunter(r)) assert.equal(v.stoneNote.carrying, false, tag + ': a hunter is never told she carries');
    const pol = SUR.policy(v, before[r]);
    assert.ok(pol && pol.ev.cartoon && pol.motionDelay === SUR.CARTOON_MS && !pol.lookout && !pol.affected, tag + ': ' + r + ' holds the board for the cartoon, with no Look out!');
    assert.equal(C.sceneFor(v, v), null, tag + ': the same throw does not play twice');
    checked++;
  }
  // after the game ends every view is a full reveal, but a hunter still never gets the egg
  g.phase = 'over';
  for (const r of f.roles.filter(isHunter)) assert.equal(f.view(r).stoneNote.carrying, false, tag + ': a hunter is not told after the game ends either');
}
// a plain stone that misses, or one that hits an egg, plays no bounce cartoon
{
  const f = setup('3p', 'kick', false), g = f.g, before = {}; for (const r of f.roles) before[r] = f.view(r);
  assert.ok(T.vultureThrow3(g, [5, 4]));
  for (const r of f.roles) { const s = C.sceneFor(f.view(r), before[r]); assert.ok(!s || !/^bounce/.test(s.id), 'a missed stone is not a bounce'); }
  assert.equal(g.lastStone ? g.lastStone.bounce : null, null);
}
// the six cartoons fit the 2 s the board is held for a cartoon
for (const id of ['bounce-kick', 'bounce-kick-egg', 'bounce-leaf', 'bounce-leaf-egg', 'bounce-rock', 'bounce-rock-egg']) {
  const sc = ART.scenes[id]; assert.ok(sc, id + ' has drawings');
  assert.ok(sc.steps.length >= 30 && sc.steps.length * 50 <= SUR.CARTOON_MS, id + ' fits in ' + SUR.CARTOON_MS + ' ms');
  assert.equal(sc.steps.length, ART.scenes[id.replace(/-egg$/, '')].steps.length, id + ' runs the same length with and without the egg, so the length is no tell');
}
S.close();
console.log('PASS stone kick-back cartoons: ' + checked + ' views; open ground, leaf and rock pile each pick their cartoon; a hunter never gets the egg version');
process.exit(0);
