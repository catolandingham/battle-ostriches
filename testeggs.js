// How to play names the eggs each ostrich hides. One test per mode.
// Classic, 3 players and Hunters: CONFIG.eggs. 2 vs 2 and 5 players: TM.eggs (each ostrich).
// The sentence stays the same; only that number changes. Role cards keep "at least 1 egg" (the goal, not the nest).
const assert = require('assert'), fs = require('fs');
const R = require('./public/roles.js'), B = require('./game.js'), TT = require('./team.js'), LB = require('./lobby.js');
let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok', name); };
const C = B.CONFIG;
const GOAL = 'Keep one of your <span class="c-eggs"></span> eggs alive for <span class="c-rounds"></span> rounds. Both birds always see each other; your eggs stay hidden.';
const HTML = fs.readFileSync('public/index.html', 'utf8');
const UI = fs.readFileSync('public/ui.js', 'utf8');
const T3UI = fs.readFileSync('public/three-ui.js', 'utf8');
const NEST = /(\d+)-egg\b|your (\d+) eggs\b/g;

function lobby(count, claims) {
  const room = { humans: [], botsWanted: 0, solo: false, setupChoice: null, recovery: null, clock: false, level: 'normal', hunterKind: null, code: 'ZZZZ', note: '' };
  for (let i = 0; i < count; i++) room.humans.push({ id: 'h' + i, name: 'Player ' + (i + 1), host: i === 0, role: null, kind: null, token: 't' + i, ws: null });
  LB.reconcile(room);
  (claims || []).forEach((role, i) => { const res = LB.claim(room, 'h' + i, role); assert.equal(res.ok, true, role + ' ' + (res.error || '')); });
  return LB.view(room, 'h0');
}
function nestNumbers(text) {
  const out = [];
  for (const m of String(text).matchAll(NEST)) out.push(+(m[1] || m[2]));
  return out;
}
function modeBlock(mode) {
  const m = HTML.match(new RegExp(`<div class="mrules hidden" data-m="${mode}">([\\s\\S]*?)</div>`));
  assert.ok(m, 'How to play has a section for ' + mode);
  return m[1].replace(/<[^>]+>/g, ' ');
}
function check(mode, eggs, people, claims, seat) {
  assert.equal(R.eggsFor(mode), eggs);
  const line = R.howEggLine(mode);
  assert.equal(line, `Keep one of your ${eggs} eggs alive for ${C.rounds} rounds. Both birds always see each other; your eggs stay hidden.`);
  assert.equal(line.replace(String(eggs), 'N'), R.howEggLine('2').replace(String(C.eggs), 'N'), 'only the egg number differs from Classic');
  assert.ok(HTML.includes(GOAL), 'the How to play sentence is unchanged apart from the number');
  for (const found of nestNumbers(modeBlock(mode))) assert.equal(found, eggs, mode + ' How to play names ' + found);
  assert.equal(R.roleCard(seat, mode === '3' || mode === '5' ? 'hyena' : null, mode).lines[0], `Keep at least 1 egg alive for ${C.rounds} rounds.`);
  for (const card of [['blue', null], ['red', null], ['o1', null], ['v1', null], ['hunter', 'hyena'], ['hunter', 'badger'], ['hyena', null], ['badger', null]]) {
    const c = R.roleCard(card[0], card[1], mode);
    if (!c) continue;
    assert.deepEqual(nestNumbers(c.lines.join(' ')), [], mode + ' card states a nest size: ' + c.lines.join(' | '));
  }
  assert.deepEqual(nestNumbers(R.huntLine(mode, 'hyena') + R.huntLine(mode, 'badger')), [], 'the start reminder states an egg count');
  const view = lobby(people, claims);
  assert.equal(view.setup, mode, 'lobby setup');
  assert.equal(R.eggsFor(mode, view.rules), eggs, 'lobby rules');
  const late = LB.benchView({ code: 'ZZZZ', setupId: mode, clock: true, g: { phase: 'play', n: mode === '5' ? 5 : 4 }, team: mode === '4' || mode === '5', hunt: mode === '4h', three: mode === '3', n: mode === '5' ? 5 : undefined, players: {} }, { id: 'late', name: 'Late', late: true });
  assert.equal(late.setup, mode, 'a friend waiting on the running game');
  assert.equal(R.eggsFor(mode, late.rules), eggs);
  assert.ok(/function paintEggs\(m\)\{[\s\S]*?Roles\.eggsFor/.test(UI), 'the phone fills the egg number from the mode');
  assert.ok(/knownMode\(\)\|\|'2'/.test(UI) && /paintEggs\(m\)/.test(UI), 'How to play paints the number for the mode on screen');
  assert.ok(/function rulesMode\(m\)\{[\s\S]*?UI\.paintEggs\(m\)/.test(T3UI), 'switching mode updates the egg number');
}

ok('Classic (2 players): How to play says each ostrich has 3 eggs', () => check('2', C.eggs, 2, [], 'blue'));
ok('3 players: How to play says each ostrich has 3 eggs', () => check('3', C.eggs, 3, [], 'blue'));
ok('2 vs 2: How to play says each ostrich has 2 eggs', () => check('4', TT.TM.eggs, 4, [], 'o1'));
ok('Hunters: How to play says each ostrich has 3 eggs', () => check('4h', C.eggs, 4, ['hyena', 'badger', 'ostrich', 'vulture'], 'blue'));
ok('5 players: How to play says each ostrich has 2 eggs', () => check('5', TT.TM.eggs, 5, [], 'o1'));

ok('the 2-egg nest lines already match team modes', () => {
  const block = modeBlock('4');
  assert.ok(/Each hides its own 2-egg nest/.test(block));
  assert.equal(nestNumbers(block)[0], TT.TM.eggs);
  const note = T3UI.match(/each has its own (\d+)-egg nest/);
  assert.ok(note, 'the team reminder names the nest');
  assert.equal(+note[1], TT.TM.eggs);
  assert.ok(/mode==='4'\|\|mode==='5'/.test(T3UI), 'that reminder is the 2 vs 2 and 5-player note');
});

console.log(`PASS testeggs (${n} groups)`);
process.exit(0);
