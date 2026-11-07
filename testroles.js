// Unit tests: the role cards (public/roles.js). Every card exists, every number on it comes from the rules, the Pounce sentence is there. node testroles.js
const assert = require('assert'), fs = require('fs'), R = require('./public/roles.js');
const B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG;
const text = (c) => [c.title, c.goal, ...c.moves, c.lose].join('\n');
const POUNCE = (n) => `When rose dots show a bird is near, you can move up to ${n} squares that turn. Land on the bird to catch it.`;

// every card a phone can be shown: [role, kind, mode]
const ALL = [
  ['blue', null, '2'], ['red', null, '2'],
  ['blue', 'hyena', '3'], ['blue', 'badger', '3'], ['red', 'hyena', '3'], ['red', 'badger', '3'], ['hunter', 'hyena', '3'], ['hunter', 'badger', '3'],
  ['blue', null, '4h'], ['red', null, '4h'], ['hyena', null, '4h'], ['badger', null, '4h'],
  ['o1', null, '4'], ['o2', null, '4'], ['v1', null, '4'], ['v2', null, '4'],
  ['o1', 'hyena', '5'], ['v1', 'badger', '5'], ['hunter', 'hyena', '5'], ['hunter', 'badger', '5'],
];

ok('rules from the modules are plain numbers and nothing else (no start squares)', () => {
  const r = R.rulesFromModules();
  assert.deepEqual(r.cfg, { eggs: C.eggs, rounds: C.rounds, warmth: C.warmth, food: C.food, stones: C.stones, fly: C.vultureFly, throwRange: C.throwRange, smell: C.smellRange, walk: C.ostrichWalk, carryWalk: C.carryWalk, kick: C.kickPush });
  assert.deepEqual(r.modes['3'], { ko: T.T3.ko, sense: T.T3.sense, pounce: T.T3.pounce });
  assert.deepEqual(r.modes['4h'], { ko: H.TH.ko, sense: H.TH.sense, pounce: H.TH.pounce });
  assert.deepEqual(r.modes['5'], { ko: TT.TM.ko, sense: TT.TM.sense, pounce: TT.TM.pounce });
  assert.ok(!/starts|clockMs/.test(JSON.stringify(r)), 'no start squares or clocks in what the server sends');
});

ok('every card exists and has a title, a Goal sentence, 2 or 3 moves, a lose line and a picture', () => {
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode), at = `${role}/${kind}/${mode}`;
    assert.ok(c, 'card for ' + at);
    assert.ok(/^You are (the|an?) (Ostrich|Vulture|Hyena|Honey Badger)$/.test(c.title), at + ' title: ' + c.title);
    assert.ok(/^Goal: .+\.$/.test(c.goal) && c.goal.split('. ').length === 1, at + ' goal is one sentence: ' + c.goal);
    assert.ok(c.moves.length >= 2 && c.moves.length <= 4, at + ' has 2 to 4 moves');
    assert.ok(/^(You|Your team) lose/.test(c.lose), at + ' lose line: ' + c.lose);
    assert.ok(['ostrich', 'vulture', 'hyena', 'badger'].includes(c.picture), at + ' picture');
    assert.ok(c.id && typeof c.id === 'string');
    assert.ok(!/[—–]/.test(text(c)), at + ' has no dashes');
    const words = text(c).split(/\s+/).length;
    assert.ok(words <= 100, at + ' stays short enough to read in a few seconds: ' + words + ' words');
  }
  assert.equal(R.roleCard('nobody', null, '2'), null);
});

ok('the six cards: ostrich, vulture, hyena, honey badger, 2 vs 2 ostrich, 2 vs 2 vulture', () => {
  const t = (r, k, m) => R.roleCard(r, k, m).title;
  assert.equal(t('blue', null, '2'), 'You are the Ostrich'); assert.equal(t('red', null, '2'), 'You are the Vulture');
  assert.equal(t('hunter', 'hyena', '3'), 'You are the Hyena'); assert.equal(t('hunter', 'badger', '3'), 'You are the Honey Badger');
  assert.equal(t('o1', null, '4'), 'You are an Ostrich'); assert.equal(t('v2', null, '4'), 'You are a Vulture');
  assert.ok(/team/i.test(R.roleCard('o1', null, '4').goal) && /team/i.test(R.roleCard('v1', null, '4').goal), 'the 2 vs 2 cards state the team goal');
  assert.equal(R.roleCard('hyena', null, '4h').picture, 'hyena'); assert.equal(R.roleCard('badger', null, '4h').picture, 'badger');
});

ok('numbers on the cards equal the rules constants', () => {
  const o = R.roleCard('blue', null, '2'), v = R.roleCard('red', null, '2');
  assert.ok(o.goal.includes(`${C.eggs} eggs`) && o.goal.includes(`${C.rounds} rounds`), o.goal);
  assert.ok(o.moves.join('\n').includes(`within ${C.warmth} rounds`) && o.moves.join('\n').includes(`every ${C.food} turns`));
  assert.ok(v.goal.includes(`round ${C.rounds} ends`) && v.lose.includes(`round ${C.rounds}`));
  assert.ok(v.moves[0].includes(`up to ${C.vultureFly} squares`) && v.moves[0].includes(`within ${C.smellRange} square`));
  assert.ok(v.moves[1].includes(`${C.stones} stone`) && v.moves[2].includes(`within ${C.throwRange} of you`));
  const hy = R.roleCard('hunter', 'hyena', '3'), ba = R.roleCard('hunter', 'badger', '3');
  assert.ok(hy.moves.join('\n').includes(`A bird is out after ${T.T3.ko.hyena} catches.`), hy.moves.join('|'));
  assert.ok(ba.moves.join('\n').includes(`A bird is out after ${T.T3.ko.badger} catches.`), ba.moves.join('|'));
  assert.ok(hy.moves[0].includes(`within ${T.T3.sense} squares`) && hy.goal.includes(`round ${C.rounds}`));
  // Hunters mode reads its own constants
  assert.ok(R.roleCard('hyena', null, '4h').moves.join('\n').includes(`after ${H.TH.ko.hyena} catches`));
  assert.ok(R.roleCard('badger', null, '4h').moves.join('\n').includes(`after ${H.TH.ko.badger} catches.`));
  assert.ok(R.roleCard('o1', null, '4').goal.includes(`${C.rounds} rounds`) && R.roleCard('o1', null, '4').moves[2].includes(`within ${C.warmth} rounds`));
  // a bird is told how many catches end it
  assert.ok(R.roleCard('blue', 'hyena', '3').lose.includes(`hyena catches you ${T.T3.ko.hyena} times`));
  assert.ok(R.roleCard('red', 'badger', '3').lose.includes(`honey badger catches you ${T.T3.ko.badger} times`));
  const b4 = R.roleCard('blue', null, '4h').lose; assert.ok(b4.includes(`hyena catches you ${H.TH.ko.hyena} times`) && b4.includes(`honey badger catches you ${H.TH.ko.badger} times`), b4);
});

ok('change every constant: every number on every card follows, and no other number appears', () => {
  // odd values that cannot be mistaken for a typed 1, 2 or 3
  const X = { cfg: { eggs: 7, rounds: 41, warmth: 19, food: 11, stones: 5, fly: 6, throwRange: 4, smell: 8, walk: 9, carryWalk: 10, kick: 30 },
    modes: { '3': { ko: { hyena: 12, badger: 13 }, sense: 14, pounce: 26 }, '4h': { ko: { hyena: 15, badger: 16 }, sense: 17, pounce: 27 }, '4': { ko: { hyena: 18, badger: 21 }, sense: 22, pounce: 28 }, '5': { ko: { hyena: 23, badger: 24 }, sense: 25, pounce: 29 } } };
  const allowed = new Set(); (function walk(o) { for (const v of Object.values(o)) typeof v === 'object' ? walk(v) : allowed.add(String(v)); })(X);
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode, X), at = `${role}/${kind}/${mode}`;
    // the only numbers that are not rules are the hunters' one-square moves ("Move 1 square")
    const bare = text(c).replace(/Move 1 square/g, 'Move one-square');
    for (const d of bare.match(/\d+/g) || []) assert.ok(allowed.has(d), `${at}: the number ${d} is not from the rules: ${bare}`);
  }
  const o = R.roleCard('blue', null, '2', X); assert.ok(o.moves[0].includes('Walk up to 9 squares (10 if you carry an egg)'), o.moves[0]); assert.ok(o.goal.includes('7 eggs') && o.goal.includes('41 rounds') && o.moves[2].includes('19 rounds') && o.moves[3].includes('11 turns') && o.moves[1].includes('back 30 squares'), text(o));
  const v = R.roleCard('red', null, '2', X); assert.ok(v.moves[0].includes('6 squares') && v.moves[0].includes('8 squares') && v.moves[1].includes('5 stones') && v.moves[2].includes('within 4 of you'), text(v));
  assert.ok(R.roleCard('hunter', 'hyena', '3', X).moves.join(' ').includes('after 12 catches') && R.roleCard('hunter', 'badger', '3', X).moves.join(' ').includes('after 13 catches'));
  assert.ok(R.roleCard('hunter', 'hyena', '3', X).moves[0].includes('within 14 squares'));
  assert.ok(R.roleCard('hyena', null, '4h', X).moves.join(' ').includes('after 15 catches') && R.roleCard('badger', null, '4h', X).moves.join(' ').includes('after 16 catches'));
  assert.ok(R.roleCard('hunter', 'hyena', '5', X).moves.join(' ').includes('after 23 catches'));
  assert.ok(R.roleCard('o1', null, '4', X).goal.includes('41 rounds') && R.roleCard('o1', null, '4', X).moves[3].includes('11 turns'));
  assert.ok(R.roleCard('blue', 'hyena', '3', X).lose.includes('hyena catches you 12 times'));
});

ok('the hyena card says Pounce plainly, in every mode with a hyena; the honey badger card does not', () => {
  for (const [role, kind, mode] of [['hunter', 'hyena', '3'], ['hyena', null, '4h'], ['hunter', 'hyena', '5']]) {
    const c = R.roleCard(role, kind, mode);
    assert.ok(c.moves.some((m) => m === 'Pounce: ' + POUNCE(R.rulesFromModules().modes[mode].pounce)), mode + ' hyena: ' + c.moves.join(' | ')); assert.ok(c.moves.some((m) => m === 'Pounce: ' + POUNCE(2)), 'up to 2 squares');
  }
  for (const [role, kind, mode] of [['hunter', 'badger', '3'], ['badger', null, '4h'], ['hunter', 'badger', '5']]) {
    const c = R.roleCard(role, kind, mode);
    assert.ok(!text(c).includes('Pounce') && /Burrow/.test(text(c)) && /Land on a bird to catch it/.test(text(c)), mode + ' badger'); assert.ok(text(c).includes('you see any bird next to you'), mode + ' badger card says what a burrowed badger sees'); assert.ok(!R.roleCard('hyena', null, '4h').moves.join(' ').includes('next to you'), 'the hyena card is unchanged');
  }
});

ok('every ostrich card has its Walk and Kick lines, naming only the animals in the game', () => {
  const kl = (r, k, m) => R.roleCard(r, k, m).moves.find((x) => x.startsWith('Kick: '));
  assert.equal(kl('blue', null, '2'), `Kick: push a vulture next to you back ${C.kickPush} squares. Not while carrying an egg.`);
  assert.equal(kl('blue', 'hyena', '3'), `Kick: push a vulture or hyena next to you back ${C.kickPush} squares. Not while carrying an egg.`);
  assert.ok(kl('blue', 'badger', '3').includes('a vulture or honey badger next'));
  assert.ok(kl('blue', null, '4h').includes('a vulture, hyena or honey badger next'));
  assert.ok(kl('o1', null, '4').includes('a vulture next') && !/hyena|badger|hunter/.test(kl('o1', null, '4')), '2 vs 2 has no hunter to name');
  assert.ok(kl('o2', 'badger', '5').includes('a vulture or honey badger next'));
  for (const [r, k, m] of ALL.filter(([r]) => ['blue', 'o1', 'o2'].includes(r))) assert.ok(R.roleCard(r, k, m).moves[0].startsWith(`Walk up to ${C.ostrichWalk} squares (${C.carryWalk} if you carry an egg), or sit on an egg`), r + m);
});

ok('the start-of-game line names only the animals in the game', () => {
  assert.equal(R.huntLine('2'), 'The vulture hunts eggs.');
  assert.equal(R.huntLine('3', 'hyena'), 'The vulture hunts eggs. The hyena hunts birds.');
  assert.equal(R.huntLine('3', 'badger'), 'The vulture hunts eggs. The honey badger hunts birds.');
  assert.equal(R.huntLine('4h'), 'The vulture hunts eggs. The hyena and honey badger hunt birds.');
  assert.equal(R.huntLine('4'), 'The vultures hunt eggs.');
  assert.equal(R.huntLine('5', 'badger'), 'The vultures hunt eggs. The honey badger hunts birds.');
  assert.ok(!/hyena|badger/.test(R.huntLine('2') + R.huntLine('4')));
});

ok('a hunter card never sounds like the other hunter: hyena has no burrow, honey badger has no pounce', () => {
  assert.ok(!/burrow/i.test(text(R.roleCard('hunter', 'hyena', '3'))));
  assert.ok(!/pounce/i.test(text(R.roleCard('hunter', 'badger', '3'))));
  assert.ok(R.roleCard('hunter', 'hyena', '3', { cfg: R.rulesFromModules().cfg, modes: { '3': { ko: { hyena: 2, badger: 2 }, sense: 2, pounce: 29 } } }).moves.some((m) => m.includes('up to 29 squares that turn')), 'the pounce distance on the card comes from the rules');
});

ok('card ids: one per animal, hunter and mode (a bird card only changes with the hunter in 3 players)', () => {
  const id = R.cardId;
  assert.equal(id('blue', null, '2'), 'ostrich__2'); assert.equal(id('blue', 'hyena', '2'), 'ostrich__2');
  assert.equal(id('blue', 'hyena', '3'), 'ostrich_hyena_3'); assert.equal(id('blue', 'badger', '3'), 'ostrich_badger_3');
  assert.equal(id('o1', null, '4'), id('o2', null, '4'), 'both 2 vs 2 ostriches share a card');
  assert.equal(id('hunter', 'badger', '3'), 'badger__3'); assert.equal(id('badger', null, '4h'), 'badger__4h');
  const ids = ALL.map(([r, k, m]) => R.roleCard(r, k, m).id); assert.ok(new Set(ids).size >= 14);
  assert.equal(R.roleCard('red', 'badger', '3').id, id('red', 'badger', '3'));
});

ok('the picked line and the intro line', () => {
  assert.equal(R.PICKED, 'We picked this animal for you.');
  const tut = fs.readFileSync('./public/tutorial.js', 'utf8');
  assert.ok(tut.includes("d:'A hide-and-seek game for 2 to 5 players.'") && !/duel|two phones/.test(tut));
});

console.log(`PASS testroles (${n} groups)`);
