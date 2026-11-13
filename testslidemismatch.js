// Regression: a hyena shove must land the animation on the server square, and a
// move the badger makes during the surprise hold must slide from that landing
// instead of snapping to a different square.
process.env.PORT = '0';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '900000';
const assert = require('assert');
const B = require('./game');
const H = require('./hunt');
const S = require('./server');
const P = require('./public/push-motion');
const C = require('./public/cutaways');
const { make } = require('./tests/hunter-fixtures');

const cfg = B.CONFIG;
const blocked = () => false;
const last = pts => pts[pts.length - 1];
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

// ---- path() must end on the same square as the server slide, every type ----
function check(label, from, to, wrap, n) {
  const pts = P.path(cfg, from, to, wrap, n);
  assert.ok(pts.length > 1, label + ' has a path from ' + from + ' to ' + to);
  assert.deepEqual(last(pts), to, label + ' path must end on the server landing');
  assert.deepEqual(pts[0], from, label + ' path starts on the server start');
}

// Kick (wraps). Official slideN with wrap=true, distance 3 (2 for a badger).
for (const dir of B.DIRS8) {
  const from = [4, 3];
  const kr = B.slideN(cfg, from, dir, cfg.kickPush, blocked, {}, true);
  if (kr.moved) check('kick wrap ' + dir, from, kr.to, true, kr.moved || 3);
  const edge = [8, 0];
  const ke = B.slideN(cfg, edge, dir, cfg.kickPush, blocked, {}, true);
  if (ke.moved) check('kick wrap from edge ' + dir, edge, ke.to, true, ke.moved || 3);
}

// Shove / stone / burst: slide without wrap, 2 squares, stops at the edge or a wreck.
for (const dir of B.DIRS8) {
  for (const from of [[4, 3], [0, 0], [8, 6], [8, 3], [1, 1]]) {
    const to = B.slide(cfg, from, dir, cfg.pushHunters, blocked, {}, false);
    if (!same(to, from)) check('shove/stone ' + from + ' ' + dir, from, to, false, 2);
  }
}

// A wrecked square cuts the shove short; the path still ends on that earlier landing.
{
  const marks = { '5,3': 'hit' };
  const to = B.slide(cfg, [3, 3], [1, 0], 2, blocked, marks, false);
  assert.deepEqual(to, [4, 3], 'shove stops before a wrecked square');
  check('shove cut short by wreck', [3, 3], to, false, 2);
}

// Catch scramble: a full 2-square line, no wrap.
{
  const to = B.scrambleTo(cfg, [3, 3], () => true, 2, () => 0);
  check('scramble', [3, 3], to, false, 2);
}

// ---- Real Hunters shove: trail, official square, and a follow-up walk ----
const f = make(S, 'Hunters');
const g = f.g;
g.turn = 'hyena';
g.hunt.hs.hyena.p = [3, 3];
g.hunt.hs.hyena.burrowed = false;
g.hunt.hs.hyena.pounce = false;
g.hunt.hs.badger.p = [4, 3];
g.hunt.hs.badger.burrowed = false;
const prev = f.view('hyena');
assert.ok(H.hunterMove(g, [4, 3]), 'hyena walks onto the badger (a shove)');
assert.deepEqual(g.hunt.hs.hyena.p, [4, 3], 'hyena stays on the meeting square');
assert.deepEqual(g.hunt.hs.badger.p, [6, 3], 'badger is pushed 2 east');
assert.equal(g.hunt.rival.by, 'hyena');
assert.deepEqual(g.hunt.rival.at, [4, 3]);
assert.deepEqual(g.hunt.rival.to, [6, 3]);
assert.equal(g.turn, 'badger', 'the shoved badger is next, immediately');

const after = f.view('hyena');
const trail = after.h3.rival.trail;
assert.ok(Array.isArray(trail) && trail.length > 1, 'hyena gets a shove trail');
assert.deepEqual(last(trail.filter(p => p && p[0] >= 0)), [6, 3], 'trail ends on the official landing');
assert.deepEqual(after.h3.rival.to, [6, 3]);
assert.deepEqual(after.hunter, [4, 3]);
const ev = P.events(after, prev);
assert.ok(ev.some(e => e.key === 'badger'), 'hyena sees the badger slide');
assert.deepEqual(last(ev.find(e => e.key === 'badger').points), [6, 3], 'animated shove ends on the server square');

// No trail/stamp mismatch for the other seats that can see the landing.
for (const seat of f.roles) {
  const v = f.view(seat);
  if (!v.h3.rival || !v.h3.rival.to) continue;
  const pts = (v.h3.rival.trail || []).filter(p => p && p[0] >= 0);
  if (pts.length) assert.deepEqual(last(pts), v.h3.rival.to, seat + ' trail ends at rival.to');
  assert.deepEqual(v.h3.rival.to, g.hunt.rival.to, seat + ' rival.to is the official landing');
}

// The badger then walks (what a bot can do during the hyena's cartoon+slide).
g.hunt.hs.badger.pounce = false;
assert.ok(H.hunterMove(g, [6, 5]), 'badger walks after being shoved');
assert.deepEqual(g.hunt.hs.badger.p, [6, 5]);
const walked = f.view('hyena');

// Without the flush flag this is an ordinary walk: no surprise motion, so the
// old client would redraw the badger at [6,5] the moment the hold ended.
const silent = P.events(walked, after);
assert.deepEqual(silent.filter(e => e.key === 'badger'), [], 'a later walk is not a surprise event');

// When the hold flushes that walk, the client must slide from the shove landing.
const saved = globalThis.CUTAWAYS;
globalThis.CUTAWAYS = { flushing: true };
try {
  const follow = P.events(walked, after);
  const bad = follow.find(e => e.key === 'badger');
  assert.ok(bad, 'flushing the hold animates the badger\'s later walk');
  assert.deepEqual(bad.points[0], [6, 3], 'follow-up starts at the shove landing');
  assert.deepEqual(last(bad.points), [6, 5], 'follow-up ends on the badger\'s new square');
} finally {
  if (saved) globalThis.CUTAWAYS = saved; else delete globalThis.CUTAWAYS;
}

// Only the latest deferred state is applied when the hold ends.
assert.deepEqual(C.flushStates([prev, after, walked]), [walked], 'flush keeps only the latest deferred state');
assert.deepEqual(C.flushStates([]), [], 'empty flush queue');

// A (2,1) walk still gets a two-point lerp when it is not a straight push.
{
  const fromState = { ...after, h3: { ...after.h3, hunters: after.h3.hunters.map(h => h.kind === 'badger' ? { ...h, p: [4, 3] } : h) } };
  // after shove landing [6,3]; knight-like walk to [8,4]
  const toState = { ...walked, h3: { ...walked.h3, hunters: walked.h3.hunters.map(h => h.kind === 'badger' ? { ...h, p: [8, 4] } : h) } };
  // positions() reads h3.hunters
  globalThis.CUTAWAYS = { flushing: true };
  try {
    const follow = P.events(toState, { ...after, h3: { ...after.h3, hunters: [{ kind: 'hyena', p: [4, 3] }, { kind: 'badger', p: [6, 3] }] } });
    const bad = follow.find(e => e.key === 'badger');
    assert.ok(bad, 'a non-straight follow-up walk still animates');
    assert.deepEqual(bad.points[0], [6, 3]);
    assert.deepEqual(last(bad.points), [8, 4]);
  } finally {
    delete globalThis.CUTAWAYS;
  }
}

S.close();
console.log('PASS slide mismatch: trail matches landing in every slide type; hold flush animates the later walk');
process.exit(0);
