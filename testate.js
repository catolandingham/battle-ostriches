// Eating a leaf: the private line and badge, and the food counter counting up.
// node testate.js
process.env.PORT = '0';
const assert = require('assert');
const B = require('./game.js');
const AI = require('./ai.js');
const ATE = require('./public/ate.js');
const T = require('./team.js');
const S = require('./server.js');

let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok', name); };
const blue = (o = {}) => Object.assign({ role: 'blue', phase: 'play', myTurn: true, turn: 'blue', hungerLeft: 4, lastAction: null }, o);
const clock = () => {
  let now = 0, seq = 1, timers = [];
  return {
    now: () => now,
    schedule(fn, ms) { const id = seq++; timers.push({ id, fn, at: now + ms }); return id; },
    cancel(id) { timers = timers.filter(t => t.id !== id); },
    advance(ms) {
      now += ms;
      const due = timers.filter(t => t.at <= now).sort((a, b) => a.at - b.at || a.id - b.id);
      timers = timers.filter(t => t.at > now);
      due.forEach(t => t.fn());
    },
    pending: () => timers.length
  };
};

ok('the line is exactly "You ate."', () => {
  assert.equal(ATE.LINE, 'You ate.');
});

ok('a rise lists every number from the old one to the new one', () => {
  assert.deepEqual(ATE.steps(4, 15), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  assert.deepEqual(ATE.steps(14, 15), [14, 15]);
  assert.deepEqual(ATE.steps(15, 15), []);
  assert.deepEqual(ATE.steps(15, 4), []);
});

ok('the counter counts up and a later paint cannot skip to the end', () => {
  const t = clock(), el = { textContent: '' }, seen = [];
  const p = ATE.createPlayer({
    element: () => el, schedule: t.schedule, cancel: t.cancel, stepMs: 90, minMs: 700,
    onShow(n) { seen.push(n); }
  });
  const started = p.play(4, 15);
  assert.equal(started.played, true);
  assert.equal(el.textContent, '4', 'starts on the old number');
  assert.equal(started.gap, 90);
  el.textContent = '15';
  p.hold();
  assert.equal(el.textContent, '4', 'a paint during the rise puts the old number back');
  t.advance(90);
  assert.equal(el.textContent, '5');
  el.textContent = '15';
  p.hold();
  assert.equal(el.textContent, '5', 'another event in the same moment does not skip the rise');
  const again = p.play(4, 15);
  assert.equal(again.steps[0], 5);
  assert.equal(again.steps[again.steps.length - 1], 15);
  assert.equal(el.textContent, '5');
  for (let i = 0; i < 20 && p.rising(); i++) t.advance(90);
  assert.equal(p.rising(), false);
  assert.equal(el.textContent, '15', 'ends on the new number');
  assert.ok(seen.includes(4) && seen.includes(9) && seen.includes(15));
  assert.ok(seen.indexOf(15) > seen.indexOf(9) && seen.indexOf(9) > seen.indexOf(4));
});

ok('a one-step rise still shows the old number before the new one', () => {
  const t = clock(), el = { textContent: '' };
  const p = ATE.createPlayer({ element: () => el, schedule: t.schedule, cancel: t.cancel, stepMs: 90, minMs: 700 });
  const started = p.play(14, 15);
  assert.equal(el.textContent, '14');
  assert.ok(started.gap >= 700);
  t.advance(started.gap - 1);
  assert.equal(el.textContent, '14');
  t.advance(1);
  assert.equal(el.textContent, '15');
});

ok('only the bird that ate is told, including an eat at full food', () => {
  const before = blue();
  const ate = blue({ myTurn: false, turn: 'red', hungerLeft: 15, lastAction: { type: 'step', ate: true } });
  assert.equal(ATE.justAte(before, ate), true);
  assert.equal(ATE.badgeOn(false, before, ate), true);
  const fullBefore = blue({ hungerLeft: 15, myTurn: true });
  const full = blue({ myTurn: false, turn: 'red', hungerLeft: 15, lastAction: { type: 'step', ate: true } });
  assert.equal(ATE.justAte(fullBefore, full), true, 'full food still ate a leaf');
  assert.deepEqual(ATE.steps(15, 15), []);
  const vulture = { role: 'red', phase: 'play', myTurn: true, turn: 'red', hungerLeft: 15, lastAction: { type: 'step', ate: true } };
  assert.equal(ATE.justAte(before, vulture), false);
  assert.equal(ATE.badgeOn(true, before, vulture), false);
  const mate = { role: 'blue', phase: 'play', myTurn: false, h3: { team: true, mySeat: 'o2' }, hungerLeft: 9, lastAction: { type: 'step', ate: true, seat: 'o1' } };
  const me = { role: 'blue', phase: 'play', myTurn: false, h3: { team: true, mySeat: 'o1' }, hungerLeft: 15, lastAction: { type: 'step', ate: true, seat: 'o1' } };
  assert.equal(ATE.justAte(blue({ h3: { team: true, mySeat: 'o1' } }), me), true);
  assert.equal(ATE.justAte(blue({ h3: { team: true, mySeat: 'o2' } }), mate), false);
  const hunter = { role: 'hunter', phase: 'play', myTurn: false, hungerLeft: 15, lastAction: null };
  assert.equal(ATE.justAte(before, hunter), false);
});

ok('the badge stays until that bird\'s next turn', () => {
  const before = blue();
  const ate = blue({ myTurn: false, turn: 'red', hungerLeft: 15, lastAction: { type: 'step', ate: true } });
  assert.equal(ATE.badgeOn(false, before, ate), true);
  const later = blue({ myTurn: false, turn: 'red', hungerLeft: 15, lastAction: { type: 'fly' } });
  assert.equal(ATE.badgeOn(true, ate, later), true, 'still up while the other side moves');
  assert.equal(ATE.badgeOn(true, later, later), true, 'a redraw of the same turn keeps it');
  const mine = blue({ myTurn: true, turn: 'blue', hungerLeft: 14, lastAction: { type: 'fly' } });
  assert.equal(ATE.badgeOn(true, later, mine), false, 'gone when this bird\'s next turn starts');
});

ok('the other side is not sent the ate flag, and a real eat still refills', () => {
  const g = B.newGame();
  assert.ok(B.placeEgg(g, [2, 2])); assert.ok(B.placeEgg(g, [6, 2])); assert.ok(B.placeEgg(g, [2, 5]));
  B.placeOstrich(g, [2, 2]); assert.ok(B.vultureFly(g, [4, 2]));
  g.hungerLeft = 4;
  assert.ok(B.ostrichStep(g, [0, 0]));
  assert.equal(g.hungerLeft, 15);
  assert.equal(g.lastAction.ate, true);
  assert.equal(AI.redView(g).lastAction.ate, undefined);
  assert.equal(AI.redView(g).hungerLeft, 15, 'the public number still updates');
  const pub = AI.redView(g), me = { role: 'blue', phase: 'play', myTurn: false, turn: 'red', hungerLeft: g.hungerLeft, lastAction: g.lastAction };
  const prev = { role: 'blue', phase: 'play', myTurn: true, turn: 'blue', hungerLeft: 4, lastAction: null };
  assert.equal(ATE.justAte(prev, me), true);
  assert.equal(ATE.justAte(prev, Object.assign({}, pub, { role: 'red', myTurn: true })), false);
  const full = B.newGame();
  assert.ok(B.placeEgg(full, [2, 2])); assert.ok(B.placeEgg(full, [6, 2])); assert.ok(B.placeEgg(full, [2, 5]));
  B.placeOstrich(full, [1, 1]); assert.ok(B.vultureFly(full, [4, 2]));
  assert.equal(full.hungerLeft, 15);
  assert.ok(B.ostrichStep(full, [0, 0]));
  assert.equal(full.hungerLeft, 15);
  assert.equal(full.lastAction.ate, true);
  assert.equal(ATE.justAte(
    { role: 'blue', phase: 'play', myTurn: true, hungerLeft: 15, lastAction: { type: 'fly' } },
    { role: 'blue', phase: 'play', myTurn: false, hungerLeft: 15, lastAction: full.lastAction }
  ), true);
});

ok('a teammate and the other side are not told that this ostrich ate', () => {
  const g = T.newTeam(4);
  assert.ok(T.place(g, 'o1', [2, 1])); assert.ok(T.place(g, 'o1', [2, 3])); assert.ok(T.place(g, 'o1', [1, 1]));
  assert.ok(T.place(g, 'o2', [6, 1])); assert.ok(T.place(g, 'o2', [6, 3])); assert.ok(T.place(g, 'o2', [7, 1]));
  assert.equal(g.phase, 'play');
  while (g.turn !== 'o1') T.timeout(g);
  g.b.o1.hunger = 3;
  assert.ok(T.ostrichAct(g, 'o1', 'step', [0, 0]));
  assert.equal(g.b.o1.hunger, 15);
  assert.equal(g.lastAction.ate, true);
  assert.equal(g.lastAction.seat, 'o1');
  const room = {
    code: 'ATE1', team: true, g, bots: [], settings: {}, touched: Date.now(),
    players: { o1: { ws: null }, o2: { ws: null }, v1: { ws: null }, v2: { ws: null } }
  };
  const mine = S.viewT(room, 'o1'), mate = S.viewT(room, 'o2'), other = S.viewT(room, 'v1');
  assert.equal(mine.lastAction.ate, true);
  assert.equal(mine.hungerLeft, 15);
  assert.ok(!mate.lastAction.ate, 'the other ostrich is not told');
  assert.ok(!other.lastAction.ate, 'a vulture is not told');
  assert.equal(ATE.justAte(
    { role: 'blue', phase: 'play', myTurn: true, h3: { team: true, mySeat: 'o1' }, hungerLeft: 3, lastAction: null },
    { role: 'blue', phase: 'play', myTurn: false, h3: mine.h3, hungerLeft: mine.hungerLeft, lastAction: mine.lastAction }
  ), true);
  assert.equal(ATE.justAte(
    { role: 'blue', phase: 'play', myTurn: false, h3: { team: true, mySeat: 'o2' }, hungerLeft: mate.hungerLeft, lastAction: null },
    { role: 'blue', phase: 'play', myTurn: false, h3: mate.h3, hungerLeft: mate.hungerLeft, lastAction: mate.lastAction }
  ), false);
});

console.log(n + ' ate checks passed');
process.exit(0);
