// Unit tests: the role cards (public/roles.js). A card is a title and 4 short lines (the goal first), every number comes from the rules,
// and no word names a color or a look. node testroles.js
const assert = require('assert'), R = require('./public/roles.js');
const B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG;
const text = (c) => [c.title, c.goal, ...c.moves].join('\n');
const LOOKS = /\b(rose|pink|red|green|gr[ae]y|yellow|blue|orange|white|black|purple|glow(ing)?|dots?|dashed|solid|bright)\b/i;

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
  assert.deepEqual(r.cfg, { eggs: C.eggs, rounds: C.rounds, warmth: C.warmth, food: C.food, stones: C.stones, fly: C.vultureFly, throwRange: C.throwRange, smell: C.smellRange, walk: C.ostrichWalk, carryWalk: C.carryWalk, kick: C.kickPush, kickBadger: C.kickPushBadger });
  const pk = (t, g) => Object.assign({ ko: t.ko, sense: t.sense, see: t.see, walk: t.walk, pounce: t.pounce }, g ? { goal: B.HUNTER_GOAL(g) } : {});
  assert.deepEqual(r.modes['3'], pk(T.T3, '3')); assert.deepEqual(r.modes['4h'], pk(H.TH)); assert.deepEqual(r.modes['5'], pk(TT.TM, '5'));
  assert.ok(!/starts|clockMs/.test(JSON.stringify(r)), 'no start squares or clocks in what the server sends');
});

ok('every card is a title and 4 short lines: a goal, 3 moves, no lose line, no dashes, no color or look named', () => {
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode), at = `${role}/${kind}/${mode}`;
    assert.ok(c, 'card for ' + at);
    assert.ok(/^You are (the|an?) (Ostrich|Vulture|Hyena|Badger)$/.test(c.title), at + ' title: ' + c.title);
    assert.ok(/^[A-Z].+\.$/.test(c.goal), at + ' goal is a sentence: ' + c.goal);
    assert.equal(c.moves.length, 3, at + ' has the goal plus 3 lines');
    assert.equal(c.lose, '', at + ' has no lose line');
    for (const l of c.moves) assert.ok(l.split(/\s+/).length <= 9, at + ' line is short: ' + l);
    assert.ok(['ostrich', 'vulture', 'hyena', 'badger'].includes(c.picture), at + ' picture');
    assert.ok(c.id && typeof c.id === 'string');
    assert.ok(!/[—–]/.test(text(c)), at + ' has no dashes');
    assert.ok(!LOOKS.test(text(c)), at + ' names a color or a look: ' + (text(c).match(LOOKS) || [])[0]);
    const words = text(c).split(/\s+/).length;
    assert.ok(words <= 45, at + ' stays within a second or two of reading: ' + words + ' words');
  }
  assert.equal(R.roleCard('nobody', null, '2'), null);
});

ok('the cards: ostrich, vulture, hyena, badger, 2 vs 2 ostrich, 2 vs 2 vulture', () => {
  const t = (r, k, m) => R.roleCard(r, k, m).title;
  assert.equal(t('blue', null, '2'), 'You are the Ostrich'); assert.equal(t('red', null, '2'), 'You are the Vulture');
  assert.equal(t('hunter', 'hyena', '3'), 'You are the Hyena'); assert.equal(t('hunter', 'badger', '3'), 'You are the Badger');
  assert.equal(t('o1', null, '4'), 'You are an Ostrich'); assert.equal(t('v2', null, '4'), 'You are a Vulture');
  assert.ok(/team/i.test(R.roleCard('o1', null, '4').goal), 'the 2 vs 2 ostrich card states the team goal');
  assert.equal(R.roleCard('hyena', null, '4h').picture, 'hyena'); assert.equal(R.roleCard('badger', null, '4h').picture, 'badger');
});

ok('numbers on the cards equal the rules constants', () => {
  const o = R.roleCard('blue', null, '2'), v = R.roleCard('red', null, '2');
  assert.equal(o.goal, `Keep 1 egg alive for ${C.rounds} rounds.`);
  assert.deepEqual(o.moves, [`Move ${C.ostrichWalk} squares. ${C.carryWalk} with an egg.`, `Stand on each egg every ${C.warmth} rounds.`, `Eat every ${C.food} turns.`]);
  assert.equal(v.goal, `Break every egg by round ${C.rounds}.`); assert.equal(v.moves[0], `Fly ${C.vultureFly} squares. Each landing sniffs for eggs.`);
  assert.equal(R.roleCard('blue', 'hyena', '3').goal, `Keep 1 egg alive. Out after ${T.T3.ko.hyena} catches.`);
  assert.equal(R.roleCard('hunter', 'hyena', '3').moves[0], `Move ${T.T3.walk} squares.`); assert.equal(R.roleCard('hunter', 'hyena', '3').moves[2], `Missed? Move ${T.T3.pounce} more.`);
  assert.equal(R.roleCard('hyena', null, '4h').moves[0], `Move ${H.TH.walk} squares.`);
});

ok('change every constant: every number on every card follows, and no other number appears', () => {
  const X = { cfg: { eggs: 7, rounds: 41, warmth: 19, food: 11, stones: 5, fly: 6, throwRange: 4, smell: 8, walk: 9, carryWalk: 10, kick: 30, kickBadger: 31 },
    modes: { '3': { ko: { hyena: 12, badger: 13 }, sense: 14, see: 32, walk: 33, pounce: 26, goal: { kind: 'catches', n: 34 } }, '4h': { ko: { hyena: 15, badger: 16 }, sense: 17, see: 35, walk: 36, pounce: 27 }, '4': { ko: { hyena: 18, badger: 21 }, sense: 22, see: 37, walk: 38, pounce: 28 }, '5': { ko: { hyena: 23, badger: 24 }, sense: 25, see: 39, walk: 40, pounce: 29, goal: { kind: 'first', n: 0 } } } };
  const allowed = new Set(); (function walk(o) { for (const v of Object.values(o)) typeof v === 'object' ? walk(v) : allowed.add(String(v)); })(X);
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode, X), at = `${role}/${kind}/${mode}`;
    for (const d of text(c).match(/\d+/g) || []) assert.ok(allowed.has(d) || d === '1', `${at}: the number ${d} is not from the rules: ${text(c)}`); // "1 egg" and "1 team egg" are a count, not a rule
  }
  const o = R.roleCard('blue', null, '2', X); assert.equal(o.moves[0], 'Move 9 squares. 10 with an egg.'); assert.equal(o.goal, 'Keep 1 egg alive for 41 rounds.'); assert.equal(o.moves[1], 'Stand on each egg every 19 rounds.'); assert.equal(o.moves[2], 'Eat every 11 turns.');
  const v = R.roleCard('red', null, '2', X); assert.equal(v.moves[0], 'Fly 6 squares. Each landing sniffs for eggs.');
  assert.equal(R.roleCard('hunter', 'hyena', '3', X).moves[0], 'Move 33 squares.'); assert.equal(R.roleCard('hunter', 'hyena', '3', X).goal, 'Make 34 catches.'); assert.equal(R.roleCard('hunter', 'hyena', '3', X).moves[2], 'Missed? Move 26 more.');
  assert.equal(R.roleCard('blue', 'hyena', '3', X).goal, 'Keep 1 egg alive. Out after 12 catches.'); assert.equal(R.roleCard('blue', 'badger', '3', X).goal, 'Keep 1 egg alive. Out after 13 catches.');
  assert.equal(R.roleCard('hunter', 'hyena', '5', X).goal, 'Knock out an ostrich and a vulture.');
});

ok('the hyena card says Pounce plainly and the badger card says Burrow, never the other', () => {
  for (const [role, kind, mode] of [['hunter', 'hyena', '3'], ['hyena', null, '4h'], ['hunter', 'hyena', '5']]) {
    const c = R.roleCard(role, kind, mode); assert.ok(/^Missed\? Move \d+ more\.$/.test(c.moves[2]), mode + ' hyena: ' + c.moves.join(' | ')); assert.ok(!/hide|underground/i.test(text(c)));
  }
  for (const [role, kind, mode] of [['hunter', 'badger', '3'], ['badger', null, '4h'], ['hunter', 'badger', '5']]) {
    const c = R.roleCard(role, kind, mode); assert.equal(c.moves[2], 'Stay still to hide underground.'); assert.ok(!/Missed|more\./.test(text(c)));
  }
});

ok('the start-of-game line names only the animals in the game', () => {
  assert.equal(R.huntLine('2'), 'The vulture hunts eggs.');
  assert.equal(R.huntLine('3', 'hyena'), 'The vulture hunts eggs. The hyena hunts birds.');
  assert.equal(R.huntLine('3', 'badger'), 'The vulture hunts eggs. The badger hunts birds.');
  assert.equal(R.huntLine('4h'), 'The vulture hunts eggs. The hyena and badger hunt birds.');
  assert.equal(R.huntLine('4'), 'The vultures hunt eggs.');
  assert.equal(R.huntLine('5', 'badger'), 'The vultures hunt eggs. The badger hunts birds.');
  assert.ok(!/hyena|badger/.test(R.huntLine('2') + R.huntLine('4')));
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

ok('hunter cards state the goal from HUNTER_GOAL, per mode', () => {
  const g = (r, k, m, goal) => R.roleCard(r, k, m, Object.assign(R.rulesFromModules(), { modes: Object.assign({}, R.rulesFromModules().modes, goal ? { [m]: Object.assign({}, R.rulesFromModules().modes[m], { goal }) } : {}) })).goal;
  assert.equal(g('hunter', 'hyena', '3'), 'Make 3 catches.');
  assert.equal(g('hunter', 'hyena', '3', { kind: 'all', n: 0 }), 'Knock out both birds.'); assert.equal(g('hunter', 'badger', '3', { kind: 'first', n: 0 }), 'Knock out one bird.'); assert.equal(g('hunter', 'badger', '3', { kind: 'catches', n: 4 }), 'Make 4 catches.');
  assert.equal(g('hunter', 'hyena', '5'), 'Knock out an ostrich and a vulture.'); assert.equal(g('hunter', 'hyena', '5', { kind: 'all', n: 0 }), 'Knock out every bird.');
  assert.equal(R.roleCard('hyena', null, '4h').goal, 'Knock out more birds than the badger.');
});

console.log(`PASS testroles (${n} groups)`); process.exit(0);
