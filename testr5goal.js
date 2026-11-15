// Rule clash R5 (Brian, 2026-11-15): "It should be that you win when knocking out both birds."
// In a 3-player game the hunter wins only when both birds are out, never at a catch count, and every 3-player card says so.
const assert = require('assert'), B = require('./game.js'), T = require('./three.js'), R = require('./public/roles.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
function game(hunter) { const g = T.newGame3({ hunter }); g.phase = 'play'; g.round = 5; g.eggs = [{ id: 0, pos: [8, 0], alive: true, lastWarm: 5 }]; g.ostrich = [6, 2]; g.vulture = [0, 6]; g.three.h = [5, 2]; g.turn = 'hunter'; return g; }

ok('the 3-player goal is both birds', () => assert.deepEqual(B.HUNTER_GOAL('3'), { kind: 'all', n: 0 }));
ok('3 catches, one bird out: the game goes on', () => {
  const g = game('hyena'); const b = g.three.birds; b.red.catches = 2; b.red.out = true; b.red.why = 'caught'; g.vulture = T.OFF.slice(); b.blue.catches = 1;
  T.finish(g); assert.equal(g.phase, 'play');
});
ok('catches with no bird out do not end it', () => {
  const g = game('badger'); const b = g.three.birds; b.red.catches = 1; b.blue.catches = 1; T.finish(g); assert.equal(g.phase, 'play');
});
ok('knocking out the second bird wins, with the both-birds line', () => {
  const g = game('hyena'); const b = g.three.birds; b.red.catches = 2; b.red.out = true; b.red.why = 'caught'; g.vulture = T.OFF.slice(); b.blue.catches = 1; g.three.pounce = false;
  assert.ok(T.hunterMove(g, [6, 2])); assert.equal(g.phase, 'over'); assert.equal(g.winner, 'hunter'); assert.equal(g.endWhy, 'The hyena knocked out both birds.');
});
ok('every 3-player card states the both-birds goal and no catch count', () => {
  for (const [role, kind] of [['blue', 'hyena'], ['red', 'hyena'], ['blue', 'badger'], ['red', 'badger'], ['hunter', 'hyena'], ['hunter', 'badger']]) {
    const c = R.roleCard(role, kind, '3'), all = c.lines.join(' ');
    assert.ok(/(You win|The hunter wins) when both birds are out\./.test(all), role + ' ' + kind + ': ' + all);
    assert.ok(!/win(s)? at \d+ catches/.test(all), role + ' ' + kind + ' still names a catch count');
    assert.ok(/_r5$/.test(c.id), 'phones that saw the old card see this one once: ' + c.id);
  }
});
console.log(n + ' R5 goal checks passed');
