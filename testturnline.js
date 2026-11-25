// The turn line (public/turnline.js): a watcher's line holds about a second, your own line never waits,
// and the sitting sentence no longer takes the turn line's place. node testturnline.js
const A = require('assert'), fs = require('fs');
const TL = require('./public/turnline.js');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };
function clockHarness(hold) {
  let t = 1000, id = 0; const timers = new Map(), changes = [];
  const q = TL.create({ hold, now: () => t, schedule: (fn, ms) => { timers.set(++id, { fn, at: t + ms }); return id; }, cancel: i => timers.delete(i), onchange: (text, was) => changes.push([text, was]) });
  const advance = ms => { const end = t + ms; for (;;) { const due = [...timers].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; timers.delete(due[0]); t = Math.max(t, due[1].at); due[1].fn(); } t = end; };
  return { q, advance, changes, timers };
}

ok('which lines count as a watcher line', () => {
  for (const s of ["Badger's turn…", "Vulture's turn…", "Ostrich 1's turn…", "Hyena's turn again."]) assert(TL.isWatch(s), s);
  for (const s of ['Your turn. Tap to move.', 'Your turn again. Tap to move.', 'No stone. Go to rocks.', 'The vulture sees you sit.', '', "Wait, it's the Badger's turn."]) assert(!TL.isWatch(s), s);
});
function assert(v, m) { A.ok(v, m); }

ok('a fast turn does not flash: the first line stays a full second, then the newest line shows', () => {
  const h = clockHarness(1000);
  A.equal(h.q.show("Badger's turn…"), "Badger's turn…");
  h.advance(140);
  A.equal(h.q.show("Vulture's turn…"), "Badger's turn…", 'still the first line at 0.14 s');
  A.equal(h.q.waiting(), "Vulture's turn…");
  h.advance(850);
  A.deepEqual(h.changes, [], 'not before a second');
  h.advance(20);
  A.deepEqual(h.changes, [["Vulture's turn…", "Badger's turn…"]]);
  A.equal(h.q.current(), "Vulture's turn…");
});

ok('only the newest waiting line is kept, so the line is never more than a second behind', () => {
  const h = clockHarness(1000);
  h.q.show("Badger's turn…"); h.advance(100);
  h.q.show("Vulture's turn…"); h.advance(100);
  h.q.show("Ostrich's turn…");
  h.advance(1000);
  A.deepEqual(h.changes, [["Ostrich's turn…", "Badger's turn…"]]);
});

ok('your own turn shows at once and never waits out the previous line', () => {
  const h = clockHarness(1000);
  h.q.show("Badger's turn…"); h.advance(100);
  h.q.show("Vulture's turn…");
  A.equal(h.q.show('Your turn. Tap to move.'), 'Your turn. Tap to move.');
  A.equal(h.q.waiting(), null, 'the waiting watcher line is dropped');
  h.advance(2000);
  A.deepEqual(h.changes, [], 'and nothing fires over your line later');
  A.equal(h.q.show("Badger's turn…"), "Badger's turn…", 'after your own line the next watcher line is not held back');
});

ok('a line that has been up a second gives way at once, and a repeat of the same line changes nothing', () => {
  const h = clockHarness(1000);
  h.q.show("Badger's turn…"); h.advance(1000);
  A.equal(h.q.show("Vulture's turn…"), "Vulture's turn…");
  A.equal(h.q.show("Vulture's turn…"), "Vulture's turn…");
  h.advance(5000);
  A.deepEqual(h.changes, []);
});

ok('going back to the line already up cancels the wait', () => {
  const h = clockHarness(1000);
  h.q.show("Badger's turn…"); h.advance(100);
  h.q.show("Vulture's turn…");
  A.equal(h.q.show("Badger's turn…"), "Badger's turn…");
  A.equal(h.q.waiting(), null);
  h.advance(2000);
  A.deepEqual(h.changes, []);
});

ok('the sitting sentence is not a turn line any more', () => {
  for (const f of ['public/ui.js', 'public/three-ui.js', 'public/turnline.js']) {
    const src = fs.readFileSync(f, 'utf8');
    A.ok(!/sees you sit/.test(src), f + ' still uses the sitting sentence');
    A.ok(!/satNote/.test(src), f + ' still checks for a sitting ostrich when it writes the turn line');
  }
});

ok('the eye that marks a sitting ostrich is still drawn on its square and on the Sit button', () => {
  const src = fs.readFileSync('public/ui.js', 'utf8');
  A.ok(/className='sittag'/.test(src) && /Seen by the vulture/.test(src));
  A.ok(/btn\('t',EYE\+'Sit'/.test(src));
});

ok('a held state still reaches the turn line and the clock', () => {
  const src = fs.readFileSync('public/cutaways.js', 'utf8');
  A.ok(/api\.note\s*=\s*null/.test(src) && /queue\.push\(state\);[\s\S]{0,120}api\.note\(state\)/.test(src), 'defer tells api.note about every held state');
  const ui = fs.readFileSync('public/ui.js', 'utf8');
  A.ok(/CUTAWAYS\.note=paintHeld/.test(ui));
  const CUT = require('./public/cutaways.js');
  A.deepEqual(CUT.flushStates([{ n: 1 }, { n: 2 }, { n: 3 }]), [{ n: 3 }], 'the board still gets only the newest held state');
});

console.log('PASS ' + n + ' turn line checks');
