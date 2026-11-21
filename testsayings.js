// Sayings and play notices are one short sentence: 12 words or fewer.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert');
const BL = require('./public/badgerlines');
const CT = require('./public/catchtext');
const B = require('./game');
const MAX = 12;
const words = s => (String(s).trim().match(/\S+/g) || []).length;
function oneSentence(s) {
  const t = String(s).trim();
  const ends = t.match(/[.!?]/g) || [];
  return ends.length === 1 && /[.!?]$/.test(t);
}
function check(label, s) {
  assert.ok(oneSentence(s), label + ' is one sentence: ' + s);
  assert.ok(words(s) <= MAX, label + ' is ' + words(s) + ' words (limit ' + MAX + '): ' + s);
}
for (const [name, value] of Object.entries(BL.LINES)) {
  for (const line of [].concat(value)) check('saying ' + name, line);
}
const lc = (o) => Object.assign({ bird: 'blue', ko: true, seq: 1, round: 2, by: 'badger' }, o);
for (const viewer of ['blue', 'red', 'hunter']) check('catch ' + viewer, CT.catchLine(lc(), viewer, 'badger', 0));
check('catch fled', CT.catchLine({ bird: 'blue', ko: false, at: [1, 1], to: [3, 1] }, 'blue', 'badger', 1));
check('kick', CT.kickLine('hyena', 3, 3));
check('burst', CT.burstLine({ n: 2 }));
check('shove', CT.rivalLine({ by: 'badger' }));
check('dug', CT.dugLine());
check('pop', CT.popOutLine());
check('out', CT.outLine('blue'));
// Stone notices, played out of the real throw lines.
const classic = () => { const g = B.newGame(); g.phase = 'play'; g.turn = 'red'; g.stones = 1; return g; };
{
  const g = classic(); g.vulture = [1, 1]; g.ostrich = [2, 2]; B.vultureThrow(g, [2, 2]);
  check('stone bounce', g.lastStone.text);
}
{
  const g = classic(); g.vulture = [4, 0]; g.ostrich = [4, 1]; B.vultureThrow(g, [4, 1]);
  check('stone rock', g.lastStone.text);
}
{
  const g = classic(); g.vulture = [1, 0]; g.ostrich = [5, 5]; B.vultureThrow(g, [0, 0]);
  check('stone leaf', g.lastStone.text);
}
console.log('PASS sayings and notices: one sentence, ' + MAX + ' words or fewer');
process.exit(0);
