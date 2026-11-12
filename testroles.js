// Unit tests: the role cards (public/roles.js). Approved wording, numbers from the rules, no color or look named. node testroles.js
const assert = require('assert'), R = require('./public/roles.js');
const B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG;
const text = (c) => [c.title, ...(c.lines || [c.goal, ...c.moves])].join('\n');
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
  const pk = (t, g) => Object.assign({ ko: t.ko, sense: t.sense, see: t.see, walk: t.walk, pounce: t.pounce }, t.double != null ? { double: t.double } : {}, g ? { goal: B.HUNTER_GOAL(g) } : {});
  assert.deepEqual(r.modes['3'], pk(T.T3, '3')); assert.deepEqual(r.modes['4h'], pk(H.TH)); assert.deepEqual(r.modes['5'], pk(TT.TM, '5'));
  assert.equal(r.modes['3'].double, 2);
  assert.ok(!/starts|clockMs/.test(JSON.stringify(r)), 'no start squares or clocks in what the server sends');
});

ok('every card is a titled reminder: sentences, no dashes, no color or look named', () => {
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode), at = `${role}/${kind}/${mode}`;
    assert.ok(c, 'card for ' + at);
    assert.ok(/^You are (the|an?) (Ostrich|Vulture|Hyena|Badger)\.$/.test(c.title), at + ' title: ' + c.title);
    assert.ok(c.lines && c.lines.length >= 2, at + ' has lines');
    assert.equal(c.lose, '', at + ' has no lose line');
    for (const l of c.lines) assert.ok(/^[A-Z0-9].*[.]$/.test(l), at + ' line is a sentence: ' + l);
    assert.ok(['ostrich', 'vulture', 'hyena', 'badger'].includes(c.picture), at + ' picture');
    assert.ok(c.id && typeof c.id === 'string');
    assert.ok(['Classic', '3 players', '2 vs 2', 'Hunters', '2 vs 2 + hunter'].includes(c.mode), at + ' mode title: ' + c.mode);
    assert.ok(!/[—–]/.test(text(c)), at + ' has no dashes');
    assert.ok(!LOOKS.test(text(c)), at + ' names a color or a look: ' + (text(c).match(LOOKS) || [])[0]);
  }
  assert.equal(R.roleCard('nobody', null, '2'), null);
});

ok('the cards: ostrich, vulture, hyena, badger, 2 vs 2 ostrich, 2 vs 2 vulture', () => {
  const t = (r, k, m) => R.roleCard(r, k, m).title;
  assert.equal(t('blue', null, '2'), 'You are the Ostrich.'); assert.equal(t('red', null, '2'), 'You are the Vulture.');
  assert.equal(t('hunter', 'hyena', '3'), 'You are the Hyena.'); assert.equal(t('hunter', 'badger', '3'), 'You are the Badger.');
  assert.equal(t('o1', null, '4'), 'You are an Ostrich.'); assert.equal(t('v2', null, '4'), 'You are a Vulture.');
  assert.ok(/teammate/i.test(text(R.roleCard('o1', null, '4'))), 'the 2 vs 2 ostrich card names the teammate');
  assert.equal(R.roleCard('hyena', null, '4h').picture, 'hyena'); assert.equal(R.roleCard('badger', null, '4h').picture, 'badger');
});

ok('approved wording, with numbers from the rules constants', () => {
  const o = R.roleCard('blue', null, '2'), v = R.roleCard('red', null, '2');
  assert.deepEqual(o.lines, [
    `Keep at least 1 egg alive for ${C.rounds} rounds.`,
    'You lose if every egg is broken or goes cold, or if you don\'t eat in time.',
  ]);
  assert.deepEqual(v.lines, [
    'You win if every egg is broken or goes cold.',
    'You also win if the ostrich doesn\'t eat in time.',
    `You lose if an egg lasts ${C.rounds} rounds.`,
  ]);
  const o3 = R.roleCard('blue', 'hyena', '3'), h3 = R.roleCard('hunter', 'hyena', '3');
  assert.deepEqual(o3.lines, [
    `Keep at least 1 egg alive for ${C.rounds} rounds.`,
    `If a hunter gets to your square, they catch you. ${T.T3.ko.hyena} catches knock you out.`,
    'You lose if every egg is broken or goes cold, or if you don\'t eat in time.',
    `The hunter wins at ${B.HUNTER_GOAL('3').n} catches.`,
    `When the hunter knocks a bird out, they always take ${T.T3.double} turns in a row. The hyena can pounce only on the first.`,
  ]);
  assert.deepEqual(h3.lines, [
    `You win at ${B.HUNTER_GOAL('3').n} catches.`,
    `${T.T3.ko.hyena} catches knock a bird out.`,
    'When you smell a bird and miss, you smell again and may move 1 more square.',
    `When you knock a bird out, you always take ${T.T3.double} turns in a row. You can pounce only on the first.`,
    `You lose if an egg lasts ${C.rounds} rounds, or every egg is broken.`,
  ]);
  const badger3 = R.roleCard('hunter', 'badger', '3');
  assert.ok(!badger3.lines.some(l => /pounce/i.test(l)), 'the badger card does not mention pounce');
  assert.ok(badger3.lines.includes(`After you knock a bird out, you always take ${T.T3.double} turns in a row.`));
  assert.ok(R.roleCard('hyena', null, '4h').lines.includes('When you smell a bird and miss, you smell again and may move 1 more square.'));
  assert.ok(!R.roleCard('badger', null, '4h').lines.some(l => /pounce|smell a bird/i.test(l)));
  assert.ok(R.roleCard('hunter', 'hyena', '5').lines.includes('When you smell a bird and miss, you smell again and may move 1 more square.'));
  assert.ok(!R.roleCard('hunter', 'badger', '5').lines.some(l => /pounce|smell a bird/i.test(l)));
  const hh = R.roleCard('hyena', null, '4h');
  assert.equal(hh.lines[0], 'Hunters win when both birds are out. You win if you knocked out more birds than the badger.');
  assert.equal(hh.lines[1], 'When you smell a bird and miss, you smell again and may move 1 more square.');
  assert.equal(hh.lines[2], `${H.TH.ko.hyena} catches knock a bird out. If you have the same number of knock-outs, whoever got more catches wins. Same catches? You tie.`);
  assert.equal(R.roleCard('badger', null, '4h').lines[0], 'Hunters win when both birds are out. You win if you knocked out more birds than the hyena.');
});

ok('change every constant: every number on every card follows, and no other number appears', () => {
  const X = { cfg: { eggs: 7, rounds: 41, warmth: 19, food: 11, stones: 5, fly: 6, throwRange: 4, smell: 8, walk: 9, carryWalk: 10, kick: 30, kickBadger: 31 },
    modes: { '3': { ko: { hyena: 12, badger: 13 }, sense: 14, see: 32, walk: 33, pounce: 26, double: 8, goal: { kind: 'catches', n: 34 } }, '4h': { ko: { hyena: 15, badger: 16 }, sense: 17, see: 35, walk: 36, pounce: 27 }, '4': { ko: { hyena: 18, badger: 21 }, sense: 22, see: 37, walk: 38, pounce: 28 }, '5': { ko: { hyena: 23, badger: 24 }, sense: 25, see: 39, walk: 40, pounce: 29, goal: { kind: 'first', n: 0 } } } };
  const allowed = new Set(); (function walk(o) { for (const v of Object.values(o)) typeof v === 'object' ? walk(v) : allowed.add(String(v)); })(X);
  for (const [role, kind, mode] of ALL) {
    const c = R.roleCard(role, kind, mode, X), at = `${role}/${kind}/${mode}`;
    for (const d of text(c).match(/\d+/g) || []) assert.ok(allowed.has(d) || d === '1', `${at}: the number ${d} is not from the rules: ${text(c)}`);
  }
  const o = R.roleCard('blue', null, '2', X); assert.equal(o.goal, 'Keep at least 1 egg alive for 41 rounds.');
  const v = R.roleCard('red', null, '2', X); assert.equal(v.lines[2], 'You lose if an egg lasts 41 rounds.');
  assert.equal(R.roleCard('hunter', 'hyena', '3', X).goal, 'You win at 34 catches.');
  assert.ok(R.roleCard('hunter', 'hyena', '3', X).lines.includes('When you knock a bird out, you always take 8 turns in a row. You can pounce only on the first.'));
  assert.ok(R.roleCard('hunter', 'hyena', '3', X).lines.some(l => l.includes('26 more squares')));
  assert.ok(R.roleCard('hunter', 'badger', '3', X).lines.includes('After you knock a bird out, you always take 8 turns in a row.'));
  assert.ok(R.roleCard('blue', 'hyena', '3', X).lines[1].includes('12 catches knock you out.'));
  assert.ok(R.roleCard('blue', 'badger', '3', X).lines[1].includes('13 catches knock you out.'));
  assert.equal(R.roleCard('hunter', 'hyena', '5', X).goal, 'You win by knocking out 1 ostrich and 1 vulture.');
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
  assert.equal(id('blue', 'hyena', '3'), 'ostrich_hyena_3_p2'); assert.equal(id('blue', 'badger', '3'), 'ostrich_badger_3_p2');
  assert.equal(id('o1', null, '4'), id('o2', null, '4'), 'both 2 vs 2 ostriches share a card');
  assert.equal(id('hunter', 'hyena', '3'), 'hyena__3_p2'); assert.equal(id('hunter', 'badger', '3'), 'badger__3'); assert.equal(id('badger', null, '4h'), 'badger__4h');
  assert.equal(id('hyena', null, '4h'), 'hyena__4h_p2'); assert.equal(id('hunter', 'hyena', '5'), 'hyena__5_p2');
  const ids = ALL.map(([r, k, m]) => R.roleCard(r, k, m).id); assert.ok(new Set(ids).size >= 14);
  assert.equal(R.roleCard('red', 'badger', '3').id, id('red', 'badger', '3'));
});

ok('hunter cards follow the goal number in 3 players; other modes use the approved lines', () => {
  const withGoal = (m, goal) => Object.assign(R.rulesFromModules(), { modes: Object.assign({}, R.rulesFromModules().modes, { [m]: Object.assign({}, R.rulesFromModules().modes[m], { goal }) } ) });
  assert.equal(R.roleCard('hunter', 'hyena', '3').goal, 'You win at 4 catches.');
  assert.equal(R.roleCard('hunter', 'hyena', '3', withGoal('3', { kind: 'catches', n: 7 })).goal, 'You win at 7 catches.');
  assert.equal(R.roleCard('hunter', 'hyena', '5').goal, 'You win by knocking out 1 ostrich and 1 vulture.');
  assert.equal(R.roleCard('hyena', null, '4h').goal, 'Hunters win when both birds are out. You win if you knocked out more birds than the badger.');
});

ok('no visible label repeats its own prefix', () => {
  const fs = require('fs');
  const files = ['public/three-ui.js', 'public/ui.js', 'public/lobby-ui.js', 'public/index.html', 'public/roles.js', 'lobby.js'];
  const re = /([A-Za-z][A-Za-z' ]{0,24}): \1:/;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const m = src.match(re);
    assert.ok(!m, f + ' repeats a prefix: ' + (m && m[0]));
  }
  const ui = fs.readFileSync('public/three-ui.js', 'utf8');
  const fn = ui.match(/const kindLine=k=>([^;\n]+)/);
  assert.ok(fn && /pwTxt/.test(fn[1]) && !/\bpw\b\s*\+/.test(fn[1]), 'kindLine shows the sentence once: ' + (fn && fn[1]));
  const KIND = { hyena: { pw: 'Pounce', pwTxt: 'When you miss, move 1 more.' }, badger: { pw: 'Burrow', pwTxt: 'Burrow: stay still to hide.' } };
  for (const k of Object.keys(KIND)) assert.ok(!KIND[k].pwTxt.startsWith(KIND[k].pw + ': ' + KIND[k].pw), KIND[k].pwTxt);
  assert.equal(KIND.badger.pwTxt, 'Burrow: stay still to hide.');
});

ok('the pounce extra move button says Stay and still sends hstay', () => {
  const fs = require('fs');
  const ui = fs.readFileSync('public/three-ui.js', 'utf8');
  const ring = fs.readFileSync('public/ring.js', 'utf8');
  assert.ok(/Skip this extra move[\s\S]{0,120}>Stay</.test(ui), 'the pounce button says Stay');
  assert.ok(!/>Stop</.test(ui), 'Stop is not a button on that screen');
  assert.ok(/if \(S\.pounce\) return \[\{ id: 'hstay', label: 'Stay', detail: 'Skip the extra move\.'/.test(ring));
});

console.log(`PASS testroles (${n} groups)`); process.exit(0);
