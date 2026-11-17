// The badger's sayings play in their own bubble: each one shows during the turn it was queued on,
// including a repeat of the same words, and a saying whose turn has passed is dropped.
// node testbadgerbubble.js
const assert = require('assert'), BL = require('./public/badgerlines'), { create, holdMs, words } = require('./public/badger-bubble');
const lines = Object.values(BL.LINES).flat();
const longest = lines.reduce((a, b) => words(b) > words(a) ? b : a);
assert.equal(longest, BL.LINES.firstBurrow, 'the Guinness line is the longest saying');
assert.equal(words(longest), 24);
assert.equal(holdMs("Badger doesn't care."), 1000, 'a short saying is about 1s');
assert.equal(holdMs(longest), 24 * 300, 'the longest line stays up 0.3s a word, long enough to read');
assert.ok(holdMs(longest) > holdMs("Badger doesn't care."));

let now = 0, timers = [], id = 0, shown = [], hidden = [];
function tick(ms) {
  const end = now + ms;
  while (timers.some(t => t.at <= end)) { timers.sort((a, b) => a.at - b.at || a.id - b.id); const t = timers.shift(); now = t.at; t.fn(); }
  now = end;
}
function harness() {
  shown = []; hidden = [];
  return create({
    show: item => shown.push(item.text),
    hide: item => hidden.push(item.text),
    schedule: (fn, ms) => { timers.push({ fn, at: now + ms, id: ++id }); return id; },
    cancel: i => { timers = timers.filter(t => t.id !== i); }
  });
}
const turn = (name, extra) => ({ round: 3, turn: name, h3: extra ? { extra: true } : {} });

// The badger's own phone, one turn: a stay and a new sight, both queued together, both shown before the turn changes.
{
  const b = harness();
  const phone = { role: 'hunter', phase: 'play', turn: 'hunter', myTurn: true, burrowed: true, kind: 'badger', seenBirds: [], h3: { kind: 'badger' } };
  const seen = [{ seat: 'blue', type: 'o', p: [4, 3] }];
  const next = Object.assign({}, phone, { myTurn: false, turn: 'red', seenBirds: seen });
  const queued = BL.detect(phone, next, BL.createPicker());
  assert.deepEqual(queued.map(e => e.event), ['stay', 'sight'], 'two sayings queue on the badger phone this turn');
  b.note(next);
  for (const e of queued) assert.equal(b.add(e.text, next), true);
  tick(0);
  assert.equal(shown[0], queued[0].text, 'the first saying shows at once');
  tick(holdMs(queued[0].text));
  assert.equal(shown[1], queued[1].text, 'the second saying shows in the same turn');
  tick(holdMs(queued[1].text));
  assert.deepEqual(shown, queued.map(e => e.text));
  assert.equal(b.state().active, null);
  assert.equal(b.state().pending.length, 0);
}

// The same words can show twice. The status queue used to drop the second copy.
{
  const b = harness();
  const s = turn('red');
  b.note(s);
  assert.equal(b.add("Badger doesn't care.", s), true);
  tick(0);
  tick(1000);
  assert.equal(b.add("Badger doesn't care.", s), true);
  tick(0);
  assert.deepEqual(shown, ["Badger doesn't care.", "Badger doesn't care."]);
}

// A saying still waiting when the turn changes is not shown. One already up is taken down.
{
  const b = harness();
  const s = turn('hunter');
  b.note(s);
  b.add('Look at this nasty badass.', s);
  b.add(longest, s);
  tick(0);
  assert.equal(b.state().active.text, 'Look at this nasty badass.');
  b.note(turn('red'));
  assert.equal(b.state().active, null, 'the saying on screen is dropped when its turn passes');
  assert.equal(b.state().pending.length, 0);
  tick(20000);
  assert.deepEqual(shown, ['Look at this nasty badass.'], 'the Guinness line never appears after the turn');
  assert.equal(b.add(longest, s), false, 'a late add for the old turn is refused');
}

// An extra move is its own turn key, so a saying from the first step does not spill into it.
{
  const b = harness();
  b.note(turn('hunter'));
  b.add("Badger doesn't care.", turn('hunter'));
  tick(0);
  b.note(turn('hunter', true));
  assert.equal(b.state().active, null);
  tick(5000);
  assert.deepEqual(shown, ["Badger doesn't care."]);
}

console.log('PASS badger bubble: each queued saying shows within its turn, repeats are kept, a passed turn is dropped');
process.exit(0);
