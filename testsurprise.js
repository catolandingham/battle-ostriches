// Combined surprise-moment policy: who is affected, Look out!, motion timing, and the
// reading pause that replaced the tap. The 10s shot clock must not run during that pause.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '10000';
const assert = require('assert');
const SUR = require('./public/surprise');
const S = require('./server');
const T = require('./three');
const H = require('./hunt');
const TT = require('./team');
const B = require('./game');
const { make } = require('./tests/hunter-fixtures');

assert.equal(SUR.LOOKOUT_MS, 1000);
assert.equal(SUR.CARTOON_MS, 2000);
assert.equal(SUR.STEP_MS, 600);
assert.equal(SUR.HOLD_CAP_MS, undefined);
assert.equal(SUR.WORD_MS, 300);
assert.equal(SUR.MIN_LINE_MS, 1000);
assert.equal(SUR.LOOKOUT_LINE, 'Look out!');
assert.equal(SUR.GO_LINE, undefined);
assert.equal(SUR.wordCount('The ostrich kicked you 3 squares!'), 6);
assert.equal(SUR.holdFor('Go.'), 1000, 'short lines still get a 1s floor, not a flash');
assert.equal(SUR.holdFor('The ostrich kicked you 3 squares!'), 6 * 300);
assert.equal(SUR.holdFor('A stone hit you!'), Math.max(1000, 4 * 300));

function humans(room) {
  room.bots = [];
  for (const p of Object.values(room.players || {})) if (p) p.bot = false;
}

function shot(f) { const o = {}; for (const r of f.roles) o[r] = f.view(r); return o; }
function pol(f, prev, seat) { return SUR.policy(f.view(seat), prev[seat]); }

// --- 3p kick: only the kicked bird gets Look out! and the tap hold ---
{
  const f = make(S, '3p'), g = f.g; g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [4, 3]; g.three.h = [8, 6];
  const prev = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  const red = pol(f, prev, 'red'), blue = pol(f, prev, 'blue'), hun = pol(f, prev, 'hunter');
  assert.ok(red && red.affected && red.lookout && !red.actor, 'kicked vulture is affected');
  assert.ok(blue && blue.actor && !blue.affected && !blue.lookout, 'kicker is not blocked');
  assert.ok(!hun || (!hun.lookout && !hun.affected), 'far hunter is not the affected player');
  assert.equal(red.motionDelay, SUR.LOOKOUT_MS + SUR.CARTOON_MS);
  assert.ok(red.motionMs >= SUR.STEP_MS, 'real motion is 0.6s per square');
  assert.equal(red.readMs, SUR.holdFor(red.line));
  assert.ok(red.readMs < 8000, 'the reading pause replaced the 8s tap');
  assert.equal(red.animMs, SUR.LOOKOUT_MS + SUR.CARTOON_MS + red.motionMs);
  assert.equal(SUR.clockDelayMs(red, { isCurrent: true, seesEvent: true }), red.animMs + red.readMs);
  assert.equal(SUR.clockDelayMs(blue, { isCurrent: true, seesEvent: true }), blue.animMs + SUR.MIN_LINE_MS);
  assert.equal(SUR.clockDelayMs(red, { isBot: true, isCurrent: true, seesEvent: true }), 0, 'bots never delay the clock');
  assert.equal(SUR.clockDelayMs(null, { isCurrent: true }), 0);
}

// --- wrap kick, every mode: the kicked animal is affected, a teammate is not ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const f = make(S, mode), g = f.g; g.turn = f.blue;
  if (mode === '5p') { g.b.o1.pos = [7, 3]; g.b.o2.pos = [0, 6]; g.b.v1.pos = [0, 0]; g.b.v2.pos = [4, 6]; g.h.p = [8, 3]; g.h.kind = 'hyena'; }
  else if (mode === '3p') { g.ostrich = [7, 3]; g.vulture = [0, 6]; g.three.h = [8, 3]; g.three.pounce = false; }
  else { g.ostrich = [7, 3]; g.vulture = [0, 6]; g.hunt.hs.hyena.p = [8, 3]; g.hunt.hs.badger.p = [4, 6]; g.hunt.hs.hyena.pounce = false; }
  const prev = shot(f);
  assert.ok(mode === '5p' ? TT.ostrichKick(g, 'o1', [8, 3]) : mode === '3p' ? T.ostrichKick3(g, [8, 3]) : H.ostrichKickH(g, [8, 3]), mode + ' wrap kick');
  const hyena = mode === 'Hunters' ? 'hyena' : 'hunter';
  const hit = pol(f, prev, hyena), kicker = pol(f, prev, f.blue);
  assert.ok(hit && hit.affected && hit.lookout, mode + ' wrap: kicked hunter is affected');
  assert.ok(kicker && kicker.actor && !kicker.lookout, mode + ' wrap: kicker is not held');
  if (mode === '5p') {
    const mate = pol(f, prev, 'o2');
    assert.ok(!mate || (!mate.affected && !mate.lookout), '2v2 teammate is a bystander, not the kicked bird');
  }
}

// --- catch and knock-out: only the caught bird; hidden and open use the same 1s Look out ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const f = make(S, mode), prev = shot(f);
  assert.ok(f.catchBird(), mode + ' catch');
  const bird = pol(f, prev, f.bird), hun = pol(f, prev, mode === 'Hunters' ? 'hyena' : 'hunter');
  assert.ok(bird && bird.affected && bird.lookout, mode + ' caught bird gets Look out!');
  assert.ok(hun && hun.actor && !hun.lookout, mode + ' hunter does not get Look out!');
  assert.equal(bird.motionDelay, SUR.LOOKOUT_MS + (bird.ev.cartoon ? SUR.CARTOON_MS : 0));
  if (mode === '5p') {
    const mate = pol(f, prev, 'v2');
    assert.ok(!mate || (!mate.affected && !mate.lookout), 'the other vulture is not the caught bird');
  }
}

{
  const f = make(S, '3p'), g = f.g;
  g.three.birds.red.catches = 1; // one more catch knocks the vulture out (2 hearts)
  const prev = shot(f);
  assert.ok(f.catchBird());
  const red = pol(f, prev, 'red'), hun = pol(f, prev, 'hunter');
  assert.ok(red && red.ev && red.ev.event === 'knockout' && red.affected && red.lookout, 'KO bird gets the full treatment');
  assert.equal(red.ev.squares, 0, 'a knock-out has no travel: the bird leaves the board');
  assert.equal(red.motionMs, 0, 'a knock-out does not slide');
  assert.ok(hun && hun.actor && !hun.lookout);
  const P = require('./public/push-motion');
  assert.deepEqual(P.events(f.view('red'), prev.red).filter(e => e.key === 'red' || e.key === 'vulture'), [], 'the knocked-out vulture is not given a slide');
}

// --- stone: only a hit target is affected ---
{
  const f = make(S, '3p'), g = f.g; g.turn = 'red'; g.vulture = [4, 3]; g.ostrich = [4, 5]; g.three.h = [8, 6]; g.stones = 1;
  // A mid-board throw that can legally land on the ostrich if the rules allow; fall back to planting a note.
  const prev = shot(f);
  let threw = false;
  if (typeof T.vultureThrow3 === 'function') threw = !!T.vultureThrow3(g, [4, 5]);
  if (threw && g.lastStone || g.stoneNote) {
    /* use real note if the act left one on the game; views expose stoneNote */
  }
  const after = f.view('blue');
  if (!after.stoneNote) {
    // Plant the same shape the server already sends, so policy can be tested without depending on throw geometry.
    const note = { seq: 7, by: 'red', targets: ['ostrich'], trails: [{ points: [[4, 3], [4, 4], [4, 5]] }], text: 'A stone hit the ostrich!' };
    // Views come from the live game; attach via lastViews-style fake states instead.
    const base = after;
    const hit = SUR.policy({ ...base, stoneNote: note }, { ...prev.blue, stoneNote: null });
    const thrower = SUR.policy({ ...f.view('red'), stoneNote: note }, { ...prev.red, stoneNote: null });
    assert.ok(hit && hit.affected && hit.lookout, 'stone target is affected');
    assert.ok(thrower && thrower.actor && !thrower.lookout, 'thrower is not held');
    assert.equal(hit.motionMs, 2 * SUR.STEP_MS);
  } else {
    const hit = SUR.policy(f.view('blue'), prev.blue);
    const thrower = SUR.policy(f.view('red'), prev.red);
    assert.ok(hit && hit.affected && hit.lookout);
    assert.ok(thrower && thrower.actor && !thrower.lookout);
  }
}

// --- smash: only the egg's owner, even though every seat is told ---
{
  const ownerS = { role: 'blue', phase: 'play', h3: {}, smashNote: { seq: 3, by: 'red', owner: 'blue' } };
  const prev = { role: 'blue', phase: 'play', h3: {}, smashNote: null };
  const owner = SUR.policy(ownerS, prev);
  const vulture = SUR.policy({ role: 'red', phase: 'play', h3: {}, smashNote: ownerS.smashNote }, { role: 'red', phase: 'play', h3: {}, smashNote: null });
  const hunter = SUR.policy({ role: 'hunter', phase: 'play', kind: 'hyena', h3: { mySeat: 'hunter', kind: 'hyena' }, smashNote: ownerS.smashNote }, { role: 'hunter', phase: 'play', kind: 'hyena', h3: { mySeat: 'hunter', kind: 'hyena' }, smashNote: null });
  assert.ok(owner && owner.affected && owner.lookout, 'egg owner is affected');
  assert.ok(vulture && vulture.actor && !vulture.lookout, 'smasher is not held');
  assert.ok(hunter && hunter.bystander && !hunter.lookout, 'hunter is told, but is a bystander');
  const o2 = SUR.policy({ role: 'blue', team: true, phase: 'play', h3: { team: true, mySeat: 'o2' }, smashNote: { seq: 3, by: 'v1', owner: 'o1' } }, { role: 'blue', team: true, phase: 'play', h3: { team: true, mySeat: 'o2' }, smashNote: null });
  assert.ok(!o2 || (!o2.affected && !o2.lookout), 'the other ostrich is not the egg owner');
}

// --- burst / shove ---
{
  const hyena = SUR.policy({ role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hyena', kind: 'hyena', burst: { seq: 1, n: 2, to: [5, 3], trail: [[3, 3], [4, 3], [5, 3]] } } }, { role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hyena', kind: 'hyena' } });
  const badger = SUR.policy({ role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger', burst: { seq: 1, n: 2, to: [5, 3], trail: [[3, 3], [4, 3], [5, 3]] } } }, { role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger' } });
  assert.ok(hyena && hyena.affected && hyena.lookout);
  assert.ok(badger && badger.actor && !badger.lookout);
  const shoved = SUR.policy({ role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger', rival: { seq: 2, by: 'hyena', to: [6, 3], trail: [[4, 3], [5, 3], [6, 3]] } } }, { role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger' } });
  assert.ok(shoved && shoved.affected && shoved.lookout && shoved.ev.event === 'shove');
}

// --- Look out is skipped for dug-in / pop-out / sniff-like moments (no event in HIT_EVENTS) ---
{
  const dug = SUR.policy({ role: 'blue', phase: 'play', h3: { dug: { seq: 1 } } }, { role: 'blue', phase: 'play', h3: {} });
  const pop = SUR.policy({ role: 'blue', phase: 'play', h3: { popout: { seq: 1, seen: true } } }, { role: 'blue', phase: 'play', h3: {} });
  assert.equal(dug, null, 'dug-in is not a surprise hit');
  assert.equal(pop, null, 'pop-out is not a surprise hit');
}

// --- hidden info: a seat that is not told about the event gets no policy and no clock delay ---
{
  const hiddenPrev = { role: 'red', phase: 'play', h3: {} };
  const hiddenNow = { role: 'red', phase: 'play', h3: {} }; // server redacted the catch
  assert.equal(SUR.policy(hiddenNow, hiddenPrev), null);
  assert.equal(SUR.clockDelayMs(null, { isCurrent: true, seesEvent: false }), 0);
}

// --- server clock: the affected current player's 10s does not start until tap or cap ---
{
  const f = make(S, '3p'), g = f.g;
  humans(f.room);
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [4, 3]; g.three.h = [8, 6];
  f.room.lastViews = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  // After a kick the turn leaves the ostrich; if it is now the vulture (the one who was hit), the hold must cover the cap.
  S.broadcast(f.room);
  const turn = g.turn;
  const p = SUR.policy(f.view(turn), f.room.lastViews && null);
  // lastViews was updated at the end of broadcast; recompute with the pre-kick snapshot we kept.
}
{
  const f = make(S, '3p'), g = f.g;
  humans(f.room);
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [4, 3]; g.three.h = [8, 6];
  const prev = shot(f);
  f.room.lastViews = prev;
  assert.ok(T.ostrichKick3(g, [4, 3]));
  const turn = g.turn;
  const delay = S.clockDelayFor(f.room, S.view3, turn);
  const polNow = SUR.policy(f.view(turn), prev[turn]);
  if (polNow && polNow.affected) {
    assert.equal(delay, polNow.animMs + polNow.readMs, 'affected current player: animation + reading pause');
    assert.ok(polNow.readMs < 8000 && delay < polNow.animMs + 8000, 'no 8s tap cap on the clock');
  } else if (polNow && polNow.ev) {
    assert.equal(delay, polNow.animMs + SUR.MIN_LINE_MS, 'current viewer who was not hit: animation + 1s line floor');
  } else {
    assert.equal(delay, 0, 'a current player who cannot see the event gets no delay');
  }
  S.broadcast(f.room);
  if (delay > 0) {
    assert.ok(f.room.clockHoldKey, 'clock is held, not ticking');
    assert.equal(f.room.deadline, null);
    assert.equal((f.view(turn).h3||{}).clockLeft, null, 'clockLeft stays null during the hold');
    if (polNow && polNow.affected) {
      assert.equal(S.surpriseDone(f.room, 'blue'), false, 'the kicker cannot start the next player\'s clock');
    }
    assert.equal(S.surpriseDone(f.room, turn), true, 'the current player can start the clock early');
    assert.equal(f.room.clockHoldKey, null);
    assert.ok(f.room.deadline, '10s clock starts on surprise-done');
    const left=(f.view(turn).h3||{}).clockLeft; assert.ok(left!=null && left>8000, 'full 10s remains after the hold: '+left);
  } else {
    assert.ok(f.room.deadline, 'no visible event: clock starts at once');
  }
  // A bot in the same seat would not have been delayed.
  assert.equal(SUR.clockDelayMs(polNow, { isBot: true, isCurrent: true, seesEvent: !!polNow }), 0);
}

function stop(room) { clearTimeout(room.clockT); clearTimeout(room.aiT); }

// The hit player's own clock waits for their hold even when someone else moves first.
{
  const f = make(S, '3p'), g = f.g;
  humans(f.room);
  f.room.bots = ['red']; f.room.players.red.bot = true;
  g.turn = 'hunter'; g.three.h = [3, 3]; g.three.pounce = false; g.three.sense = false;
  g.ostrich = [4, 3]; g.vulture = [8, 6];
  S.broadcast(f.room);
  assert.ok(T.hunterMove(g, [4, 3]), 'hyena catches the ostrich');
  assert.notEqual(g.turn, 'blue', 'the vulture moves before the caught ostrich');
  S.broadcast(f.room);
  assert.ok(f.room.holdUntil && f.room.holdUntil.blue > Date.now() + 1000, 'the ostrich hold is remembered');
  assert.ok(f.room.holdUntil.blue < Date.now() + 8000, 'the ostrich hold is the reading pause, not an 8s tap');
  assert.ok(!f.room.holdUntil.red, 'a bot in between takes no hold');
  assert.equal(g.turn, 'red');
  assert.ok(T.timeout(g));
  S.broadcast(f.room);
  assert.equal(g.turn, 'blue');
  assert.ok(f.room.clockHoldKey, 'the ostrich clock does not run during their hold');
  assert.equal(f.room.deadline, null);
  assert.equal(S.surpriseDone(f.room, 'blue'), true, 'tapping ends the hold and starts the 10s');
  assert.ok(!f.room.holdUntil.blue);
  assert.ok(f.room.deadline > Date.now() + 8000);
  stop(f.room);
}
{
  const f = make(S, '3p'), g = f.g;
  humans(f.room);
  g.three.birds.blue.out = true; g.three.birds.blue.why = 'caught'; g.three.birds.blue.catches = 2; g.ostrich = [-99, -99];
  g.turn = 'hunter'; g.three.h = [3, 3]; g.three.pounce = false; g.three.sense = false;
  g.vulture = [4, 3];
  S.broadcast(f.room);
  assert.ok(T.hunterMove(g, [4, 3]), 'hyena catches the vulture');
  assert.equal(g.three.extra, undefined); assert.equal(g.turn, 'red', 'the catch ends the hunter turn');
  S.broadcast(f.room);
  assert.ok(f.room.holdUntil && f.room.holdUntil.red > Date.now() + 1000, 'the vulture hold is waiting');
  assert.ok(f.room.holdUntil.red < Date.now() + 8000, 'the vulture hold is not an 8s tap');
  assert.ok(f.room.clockHoldKey && !f.room.deadline, 'the vulture clock waits out the hold');
  stop(f.room);
}
for (const mode of ['Hunters', '5p']) {
  const f = make(S, mode), g = f.g;
  humans(f.room);
  S.broadcast(f.room);
  if (mode === 'Hunters') {
    g.turn = 'hyena'; g.hunt.hs.hyena.p = [6, 5]; g.hunt.hs.hyena.pounce = false; g.hunt.hs.hyena.sense = false;
    g.ostrich = [7, 5]; g.vulture = [0, 0]; g.hunt.hs.badger.p = [0, 6];
    assert.ok(H.hunterMove(g, [7, 5]), 'hyena catches the ostrich');
    assert.notEqual(g.turn, 'blue');
    S.broadcast(f.room);
    assert.ok(f.room.holdUntil && f.room.holdUntil.blue > Date.now(), mode + ' remembers the ostrich hold');
    let guard = 0;
    while (g.turn !== 'blue' && g.phase === 'play' && guard++ < 6) assert.ok(H.timeout(g));
    S.broadcast(f.room);
    assert.equal(g.turn, 'blue');
    assert.ok(f.room.clockHoldKey && !f.room.deadline, mode + ' ostrich clock waits for the hold');
  } else {
    g.turn = 'hunter'; g.h.p = [6, 5]; g.h.pounce = false; g.h.sense = false;
    g.b.o1.pos = [7, 5]; g.b.v1.pos = [0, 0]; g.b.o2.pos = [0, 6]; g.b.v2.pos = [8, 0];
    assert.ok(TT.hunterMove(g, [7, 5]), 'hunter catches ostrich 1');
    assert.notEqual(g.turn, 'o1');
    S.broadcast(f.room);
    assert.ok(f.room.holdUntil && f.room.holdUntil.o1 > Date.now(), '5p remembers ostrich 1 hold');
    let guard = 0;
    while (g.turn !== 'o1' && g.phase === 'play' && guard++ < 6) assert.ok(TT.timeout(g));
    S.broadcast(f.room);
    assert.equal(g.turn, 'o1');
    assert.ok(f.room.clockHoldKey && !f.room.deadline, '5p ostrich clock waits for the hold');
  }
  stop(f.room);
}
{
  const f = make(S, '3p'), g = f.g;
  humans(f.room);
  g.turn = 'hunter'; g.three.h = [3, 3]; g.three.pounce = false; g.three.sense = false;
  g.ostrich = [4, 3]; g.vulture = [8, 6];
  S.broadcast(f.room);
  assert.ok(T.hunterMove(g, [4, 3]));
  S.broadcast(f.room);
  assert.equal(S.surpriseDone(f.room, 'blue'), false, 'the ostrich is not the one moving yet');
  assert.ok(!f.room.holdUntil.blue, 'their tap clears the saved hold');
  assert.ok(T.timeout(g));
  S.broadcast(f.room);
  assert.equal(g.turn, 'blue');
  assert.ok(!f.room.clockHoldKey && f.room.deadline, 'after the tap, the clock is already running');
  stop(f.room);
}

// A restart must not restore a hold with no timer, and must not keep every seat's view.
{
  const ST = require('./store');
  const packed = JSON.parse(ST.pack({
    code: 'ABCD', clockHoldKey: '3:blue:1', clockMsPending: 10000, deadline: 123,
    lastViews: { blue: { eggs: [{ pos: [1, 1] }] } }, holdUntil: { blue: 9 }, clockKey: 'x', g: { phase: 'play' }
  }));
  assert.equal(packed.clockHoldKey, undefined);
  assert.equal(packed.deadline, undefined);
  assert.equal(packed.lastViews, undefined);
  assert.equal(packed.holdUntil, undefined);
  assert.equal(packed.clockKey, undefined);
  assert.equal(packed.g.phase, 'play');
  const saved = { clockHoldKey: '3:red:1', deadline: 5, lastViews: { red: 1 }, holdUntil: { red: 1 }, clockT: 1, g: { phase: 'play' } };
  S.scrubSaved(saved);
  assert.equal(saved.clockHoldKey, undefined);
  assert.equal(saved.deadline, undefined);
  assert.equal(saved.lastViews, undefined);
  assert.equal(saved.holdUntil, undefined);
  assert.equal(saved.g.phase, 'play');
  const f = make(S, '3p');
  humans(f.room);
  f.room.clockHoldKey = '1:blue:1'; f.room.deadline = null; f.room.clockKey = null;
  S.scrubSaved(f.room);
  S.broadcast(f.room);
  if (f.g.phase === 'play') assert.ok(!f.room.clockHoldKey || f.room.deadline || f.room.clockT, 'a scrubbed room can arm a clock');
  stop(f.room);
}

// A 3-square kick of the hyena: reading pause is 0.3s a word, total about 6.6s.
// The same pause replaces the tap on every other surprise that used to wait for it.
{
  const f = make(S, '3p'), g = f.g;
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [0, 6]; g.three.h = [4, 3]; g.three.kind = 'hyena';
  const prev = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  const hit = pol(f, prev, 'hunter');
  assert.equal(hit.line, 'The ostrich kicked you 3 squares!');
  assert.equal(hit.readMs, 1800);
  assert.ok(hit.motionMs > 0, 'the kicked hunter sees the slide');
  assert.equal(hit.animMs, SUR.LOOKOUT_MS + SUR.CARTOON_MS + hit.motionMs);
  const kickerPol = pol(f, prev, 'blue');
  assert.equal(kickerPol.motionMs, 3 * SUR.STEP_MS, 'the kicker still slides the full kick');
  assert.equal(hit.animMs + hit.readMs, SUR.LOOKOUT_MS + SUR.CARTOON_MS + hit.motionMs + 1800);
  assert.equal(SUR.clockDelayMs(hit, { isCurrent: true, seesEvent: true }), hit.animMs + hit.readMs);
  assert.equal(hit.lineHold, SUR.CARTOON_MS + hit.motionMs + hit.readMs);
}
const P = require('./public/push-motion');
{
  const f = make(S, '3p'), g = f.g;
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [7, 5]; g.three.h = [4, 3]; g.three.kind = 'hyena';
  const prev = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]), 'kick the hyena');
  assert.equal(B.wrapDist(g.cfg, [4, 3], g.three.h), 3, 'hyena lands the full 3');
  const watch = f.view('red'), kickr = f.view('blue'), hit = f.view('hunter');
  assert.deepEqual(hit.kick.trail, g.lastKick.points, 'the kicked hunter is sent the hunter squares');
  assert.deepEqual(hit.kick.to, g.three.h);
  assert.deepEqual(watch.kick.to, g.three.h, 'every phone sees the landing');
  assert.deepEqual(watch.kick.trail, g.lastKick.points, 'every phone sees the shove');
  const wp = SUR.policy(watch, prev.red);
  if (T.hunterSeenBy(g, 'red')) {
    assert.ok(wp.bystander && wp.watchSlide && !wp.skipSlide && !wp.skipNear, 'a watcher who can still see the hunter plays the slide');
    assert.equal(wp.motionDelay, 0, 'the watcher slide does not wait for the cartoon');
    assert.ok(wp.motionMs > 0);
    const ev = P.events(watch, prev.red).filter(e => e.key === 'hyena' || e.key === watch.kick.key);
    assert.equal(ev.length, 1, 'one slide, taken from the redacted trail');
    assert.deepEqual(ev[0].points, watch.kick.trail);
  } else assert.ok(wp.watchSlide && !wp.skipSlide, 'a far watcher still plays the shove');
  const kp = SUR.policy(kickr, prev.blue), hp = SUR.policy(hit, prev.hunter);
  assert.equal(kp.motionDelay, SUR.CARTOON_MS, 'the kicker still waits for the cartoon');
  assert.equal(hp.motionDelay, SUR.LOOKOUT_MS + SUR.CARTOON_MS, 'the kicked hunter still gets Look out! and the cartoon');
  assert.ok(!kp.skipSlide && !hp.skipSlide);
}
{
  const f = make(S, '3p'), g = f.g;
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [0, 0]; g.three.h = [4, 3]; g.three.kind = 'hyena';
  const prev = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  const watch = f.view('red');
  assert.deepEqual(watch.kick.to, g.three.h, 'a far watcher is told the landing');
  assert.deepEqual(watch.kick.trail, g.lastKick.points);
  const wp = SUR.policy(watch, prev.red);
  assert.ok(wp.watchSlide && !wp.skipSlide, 'a far watcher plays the shove');
  assert.equal(wp.motionDelay, 0);
  assert.ok(wp.motionMs > 0);
  assert.equal(P.events(watch, prev.red).filter(e => e.key === 'hyena' || e.key === watch.kick.key).length, 1, 'the far phone gets a slide');
  assert.ok(watch.kick.trail.every(p => p[0] !== g.ostrich[0] || p[1] !== g.ostrich[1]), 'the path does not name the ostrich square');
}
{
  const f = make(S, '3p'), g = f.g;
  g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [4, 5]; g.three.h = [4, 3]; g.three.kind = 'hyena';
  const prev = shot(f);
  assert.ok(T.ostrichKick3(g, [4, 3]));
  const watch = f.view('red');
  assert.deepEqual(watch.kick.trail, g.lastKick.points, 'the shove is sent whole');
  const wp = SUR.policy(watch, prev.red);
  assert.ok(!wp.skipSlide, 'the watcher plays the shove');
  assert.equal(P.events(watch, prev.red).filter(e => e.key === 'hyena' || e.key === watch.kick.key).length, 1);
}

// Every surprise that used to wait for a tap now uses the reading pause instead.
{
  const kick = SUR.policy(
    { role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hunter', kind: 'hyena' }, kick: { seq: 1, who: 'hyena', by: 'blue', target: 'hyena', moved: 3, to: [7, 3] } },
    { role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hunter', kind: 'hyena' }, kick: null });
  assert.equal(kick.line, 'The ostrich kicked you 3 squares!');
  assert.equal(kick.readMs, 1800);
  const caught = SUR.policy(
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue', lastCatch: { seq: 2, bird: 'blue', by: 'hyena', at: [3, 3], to: [3, 6], ko: false } } },
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue' } });
  assert.equal(caught.line, 'You were caught! You fled 3 squares.');
  assert.equal(caught.readMs, SUR.holdFor('You were caught! You fled 3 squares.'));
  assert.equal(caught.motionMs, 3 * SUR.STEP_MS);
  assert.equal(SUR.clockDelayMs(caught, { isCurrent: true, seesEvent: true }), caught.animMs + caught.readMs);
  const ko = SUR.policy(
    { role: 'red', phase: 'play', h3: { mySeat: 'red', kind: 'hyena', ko: 2, birds: { red: { catches: 2 } }, lastCatch: { seq: 3, bird: 'red', by: 'hyena', ko: true, at: [4, 3] } } },
    { role: 'red', phase: 'play', h3: { mySeat: 'red' } });
  assert.equal(ko.line, 'The hyena knocked you out.');
  assert.equal(ko.readMs, SUR.holdFor(ko.line));
  const stone = SUR.policy(
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue' }, stoneNote: { seq: 4, by: 'red', targets: ['ostrich'], text: 'A stone hit the ostrich!' } },
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue' }, stoneNote: null });
  assert.ok(stone.affected && stone.line, 'a stone still has a result line');
  assert.equal(stone.readMs, SUR.holdFor(stone.line));
  assert.ok(/stone/i.test(stone.line));
  const smash = SUR.policy(
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue' }, smashNote: { seq: 5, by: 'red', owner: 'blue' } },
    { role: 'blue', phase: 'play', h3: { mySeat: 'blue' }, smashNote: null });
  assert.equal(smash.line, 'The vulture smashed your egg!');
  assert.equal(smash.readMs, SUR.holdFor(smash.line));
  const burst = SUR.policy(
    { role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hyena', kind: 'hyena', burst: { seq: 6, n: 2, to: [5, 3], trail: [[3, 3], [4, 3], [5, 3]] } } },
    { role: 'hunter', kind: 'hyena', phase: 'play', h3: { mySeat: 'hyena', kind: 'hyena' } });
  assert.equal(burst.line, 'The badger burst out and shoved you 2 squares!');
  assert.equal(burst.readMs, SUR.holdFor(burst.line));
  const shove = SUR.policy(
    { role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger', rival: { seq: 7, by: 'hyena', to: [6, 3], trail: [[4, 3], [5, 3], [6, 3]] } } },
    { role: 'hunter', kind: 'badger', phase: 'play', h3: { mySeat: 'badger', kind: 'badger' } });
  assert.equal(shove.line, 'The hyena shoved you!');
  assert.equal(shove.readMs, SUR.holdFor(shove.line));
  for (const p of [kick, caught, ko, stone, smash, burst, shove]) {
    assert.ok(p.affected && p.readMs >= 1000 && p.readMs < 8000, p.ev.event + ' uses a reading pause');
    assert.equal(SUR.clockDelayMs(p, { isCurrent: true, seesEvent: true }), p.animMs + p.readMs);
  }
}

S.close();
console.log('PASS surprise: who is affected, Look out, reading pause, watcher slide, clock hold, hidden redaction, wrap/team');
process.exit(0);
