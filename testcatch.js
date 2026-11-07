// Unit tests: the words for a catch (public/catchtext.js) in every mode, for every viewer. node testcatch.js
process.env.PORT = 0;
const assert = require('assert'), CT = require('./public/catchtext.js'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), HA = require('./huntai.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const OC = " Nothing can stop the honey badger when it's hungry.", WI = ' Thanks for the treat, stupid birds!'; // the honey badger's tails (public/badgerlines.js)
const lc = (o) => Object.assign({ bird: 'blue', at: [1, 1], to: [3, 1], ko: false, seq: 1, round: 2 }, o);

ok('caught bird, not out: says hurt and how many more catches', () => {
  assert.equal(CT.catchLine(lc(), 'blue', 'hyena', 1), "The hyena caught you! Hurt: one more catch and you're out.");
  assert.equal(CT.catchLine(lc({ bird: 'red' }), 'red', 'badger', 1), "The honey badger caught you! Hurt: one more catch and you're out." + OC);
  assert.equal(CT.catchLine(lc(), 'blue', 'hyena', 2), "The hyena caught you! Hurt: 2 more catches and you're out.");
  assert.equal(CT.catchLine(lc(), 'blue', 'hyena', 3), "The hyena caught you! Hurt: 3 more catches and you're out."); });
ok('ambush: a catch that comes out of the burrow ends with "Honey badger don\'t care." for every viewer; a walk-in or an open catch gets another quote', () => {
  const tag = " Honey badger don't care.";
  assert.equal(CT.catchLine(lc({ ambush: true }), 'blue', 'badger', 1), "The honey badger caught you! Hurt: one more catch and you're out." + tag);
  assert.equal(CT.catchLine(lc({ ambush: true, ko: true, to: null }), 'blue', 'badger', 0), 'The honey badger knocked you out.' + tag);
  assert.equal(CT.catchLine(lc({ ambush: true, bird: 'red' }), 'hunter', 'badger', 1), 'Caught the vulture! One more catch knocks it out.' + tag);
  assert.equal(CT.catchLine(lc({ ambush: true, ko: true, to: null }), 'hunter', 'badger', 0), 'Ostrich knocked out!' + tag);
  assert.equal(CT.catchLine(lc({ ambush: true }), 'red', 'badger', 1), 'The honey badger caught the ostrich.' + tag);
  assert.equal(CT.catchLine(lc({ ambush: true, ko: true, to: null }), 'hyena', 'badger', 0), 'The honey badger knocked out the ostrich.' + tag);
  assert.equal(CT.catchLine(lc({ ambush: false }), 'red', 'badger', 1), 'The honey badger caught the ostrich.' + OC, 'no ambush flag: the open-catch line instead');
  assert.equal(CT.catchLine(lc({ walked: true }), 'blue', 'badger', 1), "You walked into the hidden honey badger! The honey badger caught you! Hurt: one more catch and you're out." + WI, 'a walk-in gets the walk-in tail, never the ambush one'); });
ok('caught bird, out: says knocked out (hyena and honey badger)', () => {
  assert.equal(CT.catchLine(lc({ ko: true, to: null }), 'blue', 'hyena', 0), 'The hyena knocked you out.');
  assert.equal(CT.catchLine(lc({ ko: true, to: null, bird: 'red' }), 'red', 'badger', 0), 'The honey badger knocked you out.' + OC); });
ok('walked in: "You walked into the hidden ..." comes first, then the same line, as one message', () => {
  assert.equal(CT.catchLine(lc({ walked: true }), 'blue', 'hyena', 1), "You walked into the hidden hyena! The hyena caught you! Hurt: one more catch and you're out.");
  assert.equal(CT.catchLine(lc({ walked: true, bird: 'red' }), 'red', 'badger', 2), "You walked into the hidden honey badger! The honey badger caught you! Hurt: 2 more catches and you're out." + WI);
  assert.equal(CT.catchLine(lc({ walked: true, ko: true, to: null }), 'blue', 'badger', 0), 'You walked into the hidden honey badger! The honey badger knocked you out.' + WI);
  assert.equal(CT.catchLine(lc({ walked: false }), 'blue', 'hyena', 1), "The hyena caught you! Hurt: one more catch and you're out.", 'walked: false reads like absent'); });
ok('the hunter who made the catch: not out yet, or knocked out', () => {
  assert.equal(CT.catchLine(lc(), 'hunter', 'hyena', 1), 'Caught the ostrich! One more catch knocks it out.');
  assert.equal(CT.catchLine(lc({ bird: 'red' }), 'hunter', 'hyena', 1), 'Caught the vulture! One more catch knocks it out.');
  assert.equal(CT.catchLine(lc(), 'hunter', 'hyena', 2), 'Caught the ostrich! 2 more catches knock it out.');
  assert.equal(CT.catchLine(lc({ ko: true, to: null }), 'hunter', 'badger', 0), 'Ostrich knocked out!' + OC);
  assert.equal(CT.catchLine(lc({ ko: true, to: null, bird: 'red' }), 'hunter', 'hyena', 0), 'Vulture knocked out!');
  assert.equal(CT.catchLine(lc({ walked: true }), 'hunter', 'hyena', 1), 'Caught the ostrich! One more catch knocks it out.', 'the hunter is not told about walking in'); });
ok('everyone else sees who was caught or knocked out', () => {
  assert.equal(CT.catchLine(lc({ bird: 'red' }), 'blue', 'hyena', 1), 'The hyena caught the vulture.');
  assert.equal(CT.catchLine(lc({ bird: 'red', ko: true, to: null }), 'blue', 'hyena', 0), 'The hyena knocked out the vulture.');
  assert.equal(CT.catchLine(lc(), 'red', 'badger', 0), 'The honey badger caught the ostrich.' + OC);
  assert.equal(CT.catchLine(lc({ ko: true, to: null }), 'red', 'badger', 0), 'The honey badger knocked out the ostrich.' + OC);
  assert.equal(CT.catchLine(lc({ walked: true, bird: 'red' }), 'blue', 'hyena', 1), 'The hyena caught the vulture.', 'a bystander is not told about walking in'); });
ok('team seats: only the caught seat is "you"; its partner and the other pair are bystanders; the hunter is the hunter', () => {
  const c = lc({ bird: 'o1', walked: true });
  assert.equal(CT.catchLine(c, 'o1', 'hyena', 1), "You walked into the hidden hyena! The hyena caught you! Hurt: one more catch and you're out.");
  assert.equal(CT.catchLine(c, 'o2', 'hyena', 1), 'The hyena caught the ostrich.');
  assert.equal(CT.catchLine(c, 'v1', 'hyena', 1), 'The hyena caught the ostrich.');
  assert.equal(CT.catchLine(c, 'hunter', 'hyena', 1), 'Caught the ostrich! One more catch knocks it out.');
  const k = lc({ bird: 'v2', ko: true, to: null });
  assert.equal(CT.catchLine(k, 'v2', 'badger', 0), 'The honey badger knocked you out.' + OC);
  assert.equal(CT.catchLine(k, 'v1', 'badger', 0), 'The honey badger knocked out the vulture.' + OC);
  assert.equal(CT.catchLine(k, 'o2', 'badger', 0), 'The honey badger knocked out the vulture.' + OC);
  assert.equal(CT.catchLine(k, 'hunter', 'badger', 0), 'Vulture knocked out!' + OC); });
ok('Hunters mode: the hunter that made the catch gets the hunter line; the other hunter is a bystander', () => {
  const c = lc({ by: 'hyena' });
  assert.equal(CT.catchLine(c, 'hyena', 'hyena', 1), 'Caught the ostrich! One more catch knocks it out.');
  assert.equal(CT.catchLine(c, 'badger', 'hyena', 1), 'The hyena caught the ostrich.');
  assert.equal(CT.catchLine(c, 'red', 'hyena', 1), 'The hyena caught the ostrich.');
  assert.equal(CT.catchLine(c, 'blue', 'hyena', 1), "The hyena caught you! Hurt: one more catch and you're out.");
  const k = lc({ by: 'badger', bird: 'red', ko: true, to: null });
  assert.equal(CT.catchLine(k, 'badger', 'badger', 0), 'Vulture knocked out!' + OC);
  assert.equal(CT.catchLine(k, 'hyena', 'badger', 0), 'The honey badger knocked out the vulture.' + OC);
  assert.equal(CT.catchLine(k, 'blue', 'badger', 0), 'The honey badger knocked out the vulture.' + OC);
  assert.equal(CT.catchLine(k, 'red', 'badger', 0), 'The honey badger knocked you out.' + OC);
  assert.equal(CT.catchLine(k, 'red', undefined, 0), 'The honey badger knocked you out.' + OC, 'kind falls back to lastCatch.by'); });
ok('"is out" banner names the bird; team seats say which', () => {
  assert.equal(CT.outLine('blue'), 'The ostrich is out.'); assert.equal(CT.outLine('red'), 'The vulture is out.');
  assert.equal(CT.outLine('o1'), 'Ostrich 1 is out.'); assert.equal(CT.outLine('o2'), 'Ostrich 2 is out.');
  assert.equal(CT.outLine('v1'), 'Vulture 1 is out.'); assert.equal(CT.outLine('v2'), 'Vulture 2 is out.'); });

// catchesLeft is read from the rules constants and the bird's catch count in the view, never typed into the words
const view3 = g => T.status3(g), viewT = g => TT.status(g), viewH = g => H.statusH(g);
ok('catchesLeft: 3-player view (hyena 2, badger 2) from T3.ko and the bird\'s catches', () => {
  const g = T.newGame3('hyena'); assert.equal(CT.catchesLeft(view3(g), lc({ bird: 'blue' })), T.T3.ko.hyena);
  g.three.birds.blue.catches = 1; assert.equal(CT.catchesLeft(view3(g), lc({ bird: 'blue' })), T.T3.ko.hyena - 1);
  assert.equal(CT.catchLine(lc(), 'blue', 'hyena', CT.catchesLeft(view3(g), lc())), "The hyena caught you! Hurt: one more catch and you're out.");
  const b = T.newGame3('badger'); b.three.birds.red.catches = 1; assert.equal(CT.catchesLeft(view3(b), lc({ bird: 'red' })), T.T3.ko.badger - 1); b.three.birds.red.catches = 2; assert.equal(CT.catchesLeft(view3(b), lc({ bird: 'red' })), 0); });
ok('catchesLeft: changing the rules constants changes the words', () => {
  const was = T.T3.ko.hyena; try { T.T3.ko.hyena = 4; const g = T.newGame3('hyena'); g.three.birds.blue.catches = 1;
    assert.equal(CT.catchLine(lc(), 'blue', 'hyena', CT.catchesLeft(view3(g), lc())), "The hyena caught you! Hurt: 3 more catches and you're out.");
    assert.equal(CT.catchLine(lc(), 'hunter', 'hyena', CT.catchesLeft(view3(g), lc())), 'Caught the ostrich! 3 more catches knock it out.'); } finally { T.T3.ko.hyena = was; }
  const wasT = TT.TM.ko.hyena; try { TT.TM.ko.hyena = 3; const g = TT.newTeam(5, 'hyena'); g.b.o1.catches = 1; assert.equal(CT.catchesLeft(viewT(g), lc({ bird: 'o1' })), 2); } finally { TT.TM.ko.hyena = wasT; }
  const wasH = H.TH.ko.badger; try { H.TH.ko.badger = 2; const g = H.newHunt(); g.hunt.birds.red.catches = 1; assert.equal(CT.catchesLeft(viewH(g), lc({ bird: 'red', by: 'badger' })), 1); } finally { H.TH.ko.badger = wasH; } });
ok('catchesLeft: Hunters view picks the knock-out count of the hunter that caught', () => {
  const g = H.newHunt(); g.hunt.birds.blue.catches = 1;
  assert.equal(CT.catchesLeft(viewH(g), lc({ by: 'hyena' })), H.TH.ko.hyena - 1); assert.equal(CT.catchesLeft(viewH(g), lc({ by: 'badger' })), H.TH.ko.badger - 1); });
ok('catchesLeft: 2 vs 2 + hunter view (team.js)', () => {
  const g = TT.newTeam(5, 'hyena'); g.b.v2.catches = 1; assert.equal(CT.catchesLeft(viewT(g), lc({ bird: 'v2' })), TT.TM.ko.hyena - 1);
  const k = TT.newTeam(5, 'badger'); k.b.v2.catches = 1; assert.equal(CT.catchesLeft(viewT(k), lc({ bird: 'v2' })), TT.TM.ko.badger - 1); k.b.v2.catches = 2; assert.equal(CT.catchesLeft(viewT(k), lc({ bird: 'v2' })), 0); });

// end to end through the rules: play a real catch, build the view the same way server.js does, read the words
const setup3 = (kind, h) => { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [6, 5])); return g; };
ok('ambush: the flag comes out of the real rules and the server view in every mode', () => {
  const g = setup3('badger', [8, 3]); T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [7, 5]); T.hunterStay(g); T.vultureFly3(g, [4, 2]); T.ostrichAct3(g, 'step', [7, 4]); assert(T.hunterMove(g, [7, 4]));
  const l = g.three.lastCatch, s = view3(g); assert.equal(l.ambush, true); assert.equal(CT.catchLine(l, 'hunter', 'badger', CT.catchesLeft(s, l)), "Caught the ostrich! One more catch knocks it out. Honey badger don't care."); });
console.log(n + ' catch-text tests passed'); process.exit(0);
