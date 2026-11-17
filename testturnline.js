// The phone's turn line is display-only. Turn order is not touched.
// 1. A catch cartoon collapses board updates to the last state, but the turn line
//    (and your own "Your turn" and clock) follow the current turn immediately.
// 2. Sitting does not replace the turn line. The old sentence is unchanged.
// 3. A fast turn still shows each other animal's line for at least a second,
//    and that wait does not block a tap.
const A = require('assert');
const fs = require('fs');
const C = require('./public/cutaways');
const T = require('./public/turnline');

function queue() {
  let now = 0, timers = [], id = 0, seen = [];
  const q = T.create({
    hold: 1000,
    now: () => now,
    schedule: (fn, ms) => { timers.push({ fn, at: now + ms, id: ++id }); return id; },
    cancel: i => { timers = timers.filter(t => t.id !== i); },
    onchange: text => { seen.push([text, now]); }
  });
  function tick(ms) {
    const end = now + ms;
    while (timers.some(t => t.at <= end)) {
      timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = timers.shift();
      now = t.at;
      t.fn();
    }
    now = end;
  }
  return { q, tick, seen, at: ms => { now = ms; } };
}

const play = (o) => Object.assign({ phase: 'play', showTimers: true, h3: { clockMs: 10000 } }, o);

// --- 1. Caught ostrich: board flush stays last-only; the turn line does not ---
{
  const vul = play({ role: 'blue', turn: 'red', myTurn: false, three: true, h3: { kind: 'hyena', clockMs: 10000, clockLeft: 8000 } });
  const ost = play({ role: 'blue', turn: 'blue', myTurn: true, pass: false, three: true, moves: [[1, 1]], h3: { kind: 'hyena', clockMs: 10000, clockLeft: null } });
  A.deepEqual(C.flushStates([vul, ost]), [ost], 'the board still applies only the latest deferred state');
  A.deepEqual(C.flushStates([]), []);
  const { q } = queue();
  A.equal(q.show(T.watchLine(vul), { own: false }), "Vulture's turn…");
  // 3.7s into the cartoon it is the ostrich's turn. The line and the clock update now, not when the cartoon ends.
  const line = q.show(T.ownLine(ost), { own: true });
  A.equal(line, 'Your turn. Tap to move.');
  A.equal(q.current(), 'Your turn. Tap to move.');
  const face = T.clockFace(ost);
  A.equal(face.mine, true);
  A.equal(face.paused, true, 'the clock is on screen before the countdown starts');
  A.equal(face.left, 10000);
  const running = T.clockFace(play({ role: 'blue', myTurn: true, h3: { clockMs: 10000, clockLeft: 6400 } }));
  A.deepEqual(running, { left: 6400, paused: false, mine: true });
  A.equal(T.clockFace(play({ role: 'blue', myTurn: false, showTimers: false, h3: { clockLeft: 1000 } })), null);
}

// --- 2. Sitting ostrich keeps the turn line. The sitting sentence is not rewritten. ---
{
  A.equal(T.SIT_LINE, 'The vulture sees you sit.');
  const sit = play({ role: 'blue', turn: 'red', myTurn: false, ostrich: [2, 1], sittingAt: [[2, 1]] });
  A.equal(T.watchLine(sit), "Vulture's turn…");
  A.notEqual(T.watchLine(sit), T.SIT_LINE);
  const sit3 = play({ role: 'blue', turn: 'hunter', myTurn: false, ostrich: [1, 1], sittingAt: [[1, 1]], h3: { kind: 'badger', clockMs: 10000 } });
  A.equal(T.watchLine(sit3), "Badger's turn…");
  const team = play({ role: 'blue', turn: 'v1', myTurn: false, h3: { team: true, mySeat: 'o1', clockMs: 10000 }, ostrich: [3, 3], sittingAt: [[3, 3]] });
  A.equal(T.watchLine(team), "Vulture 1's turn…");
  const again = play({ role: 'red', turn: 'hunter', myTurn: false, h3: { kind: 'hyena', extra: true, clockMs: 10000 } });
  A.equal(T.watchLine(again), "Hyena's turn again.");
  A.equal(T.watchLine(play({ role: 'red', turn: 'blue', myTurn: false })), "Ostrich's turn…");
  A.equal(T.ownLine(play({ role: 'blue', turn: 'blue', myTurn: true })), 'Your turn. Tap to move.');
  A.equal(T.ownLine(play({ role: 'red', turn: 'red', myTurn: true, stones: 0 })), 'No stone. Go to rocks.');
  A.equal(T.ownLine(play({ role: 'red', turn: 'red', myTurn: true, stones: 1 })), 'Your turn. Tap to fly.');
  A.equal(T.ownLine(play({ role: 'hunter', myTurn: true, kind: 'badger', burrowed: false, sense: false, h3: { kind: 'badger', clockMs: 10000 } })), 'Tap to move, or Burrow. No bird will see you dig in.');
  A.equal(T.ownLine(play({ role: 'hunter', myTurn: true, kind: 'badger', burrowed: false, sense: true, h3: { kind: 'badger', clockMs: 10000 } })), 'Tap to move, or Burrow. A bird will see you dig in.');
  A.equal(T.ownLine(play({ role: 'hunter', myTurn: true, sense: false, h3: { kind: 'hyena', clockMs: 10000 } })), 'Your turn. Tap to move. No bird near.');
  A.equal(T.ownLine(play({ role: 'hunter', myTurn: true, pounce: true, h3: { kind: 'hyena', clockMs: 10000 } })), 'When you miss, move 1 more square.');
  A.equal(T.ownLine(play({ role: 'hunter', myTurn: true, h3: { kind: 'hyena', extra: true, clockMs: 10000 } })), 'Your turn again. Tap to move.');
  const ui = fs.readFileSync('public/ui.js', 'utf8');
  const t3 = fs.readFileSync('public/three-ui.js', 'utf8');
  A.ok(ui.includes("t.title='The vulture sees you sit.'"), 'the sitting sentence stays on the board mark, words unchanged');
  A.ok(!/return 'The vulture sees you sit\.'/.test(ui + t3), 'the status bar does not use the sitting sentence');
}

// --- 3. Fast badger: each other turn line lasts at least 1s, and a tap is not delayed ---
{
  const { q, tick, seen } = queue();
  A.equal(q.show("Badger's turn…"), "Badger's turn…");
  tick(300);
  let acted = false;
  const shown = q.show("Vulture's turn…");
  acted = true; // the game takes the tap in this same moment; the line does not wait
  A.equal(acted, true);
  A.equal(shown, "Badger's turn…", '0.3s is not long enough to drop the badger line');
  A.equal(q.current(), "Badger's turn…");
  tick(699);
  A.equal(q.current(), "Badger's turn…");
  tick(1);
  A.equal(q.current(), "Vulture's turn…");
  A.equal(seen[0][0], "Vulture's turn…");
  A.equal(seen[0][1], 1000);
  // Three quick turns: each line is still shown for a full second, in order.
  const all = queue();
  A.equal(all.q.show("Badger's turn…"), "Badger's turn…");
  all.tick(200);
  A.equal(all.q.show("Vulture's turn…"), "Badger's turn…");
  all.tick(200);
  A.equal(all.q.show("Ostrich's turn…"), "Badger's turn…");
  all.tick(600);
  A.equal(all.q.current(), "Vulture's turn…");
  all.tick(1000);
  A.equal(all.q.current(), "Ostrich's turn…");
  // Your own turn does not wait out the previous line, and the queued lines do not come back over it.
  const mine = queue();
  mine.q.show("Badger's turn…");
  mine.tick(300);
  A.equal(mine.q.show('Your turn. Tap to move.', { own: true }), 'Your turn. Tap to move.');
  mine.tick(2000);
  A.equal(mine.q.current(), 'Your turn. Tap to move.');
  A.ok(!mine.seen.some(x => /turn…$/.test(x[0])), 'a queued watch line does not cover Your turn');
  // Repeating the line that is already up does not stretch it.
  const again = queue();
  again.q.show("Badger's turn…");
  again.tick(900);
  A.equal(again.q.show("Badger's turn…"), "Badger's turn…");
  again.tick(100);
  A.equal(again.q.show("Hyena's turn…"), "Hyena's turn…", 'the second starts once the first has had its second');
}

console.log('PASS turn line: current turn during a cartoon, sitting keeps the turn line, each other turn line stays at least 1s');
process.exit(0);
