// The sense cloud keeps the real bird inside it, and does not mark a square the rules do not allow.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert');
const H = require('./public/sense-hint');
const cfg = { cols: 9, rows: 7, ostrichWalk: 2, vultureFly: 2 };
const has = (pts, p) => pts.some(q => q[0] === p[0] && q[1] === p[1]);
function view(o) {
  return Object.assign({
    phase: 'play', sense: true, myTurn: true, pounce: false, hunter: [5, 3], senseSeq: 1,
    cfg, h3: { senseRange: 2, birds: { blue: { out: false }, red: { out: true } } }
  }, o);
}

// A fresh yes is the whole area within 2, and not the hunter's own square. Sense does not wrap.
{
  const d = H.disk(cfg, [5, 3], 2);
  assert.equal(d.length, 24);
  assert.ok(!has(d, [5, 3]));
  assert.ok(has(d, [7, 3]));
  assert.ok(!has(d, [8, 3]), '3 away is outside the sense');
  assert.ok(!has(d, [0, 3]), 'the far edge is not "within 2" — sense does not wrap');
}

// One bird. It was inside the first cloud, walked 2, and is inside the second. The cloud shrinks, and the bird stays in it.
{
  const first = H.update(null, view({ hunter: [1, 3], senseSeq: 1 }));
  assert.ok(has(first.squares, [2, 3]), 'the bird at [2,3] is inside the first cloud');
  const bird = [4, 3];
  const second = H.update(first.memory, view({ hunter: [5, 3], senseSeq: 2 }));
  assert.ok(second.squares.length < first.squares.length, 'the second cloud is smaller than a fresh area');
  assert.ok(has(second.squares, bird), 'the bird that walked 2 is still inside');
  assert.ok(second.squares.every(p => H.cheb(p, [5, 3]) <= 2 && !(p[0] === 5 && p[1] === 3)));
  assert.ok(!has(second.squares, [7, 3]), 'a square the bird could not reach from the first cloud is left out');
  const again = H.update(second.memory, view({ hunter: [5, 3], senseSeq: 2 }));
  assert.deepEqual(again.squares, second.squares, 'redrawing the same sense does not throw the narrowing away');
}

// Pounce: the bird has not moved. Only squares inside both readings, and the bird is one of them.
{
  const first = H.update(null, view({ hunter: [2, 3], senseSeq: 1 }));
  const pounce = H.update(first.memory, view({ hunter: [4, 3], senseSeq: 2, pounce: true, firstAt: [2, 3] }));
  assert.ok(has(pounce.squares, [3, 3]));
  assert.ok(pounce.squares.every(p => H.cheb(p, [2, 3]) <= 2 && H.cheb(p, [4, 3]) <= 2));
  assert.ok(!has(pounce.squares, [6, 3]), 'pounce does not keep a square outside the first reading');
}

// Two birds. The older yes may have been the other bird, so the new cloud stays the whole area.
// Both real squares that are within 2 stay inside. A square outside 2 is not marked.
{
  const birds = { blue: { out: false }, red: { out: false } };
  const first = H.update(null, view({ hunter: [1, 3], senseSeq: 1, h3: { senseRange: 2, birds } }));
  const second = H.update(first.memory, view({ hunter: [7, 3], senseSeq: 2, h3: { senseRange: 2, birds } }));
  const full = H.disk(cfg, [7, 3], 2);
  assert.equal(second.squares.length, full.length, 'two birds: the cloud is not cut down');
  assert.ok(has(second.squares, [6, 3]), 'the vulture, only near the new spot, is still inside');
  assert.ok(!has(second.squares, [0, 3]));
}

// A no does not draw a cloud, and it does not keep a stale yes for the next reading.
{
  const first = H.update(null, view({ hunter: [1, 3], senseSeq: 1 }));
  const no = H.update(first.memory, view({ hunter: [8, 6], senseSeq: 2, sense: false }));
  assert.deepEqual(no.squares, []);
  const later = H.update(no.memory, view({ hunter: [4, 3], senseSeq: 3, sense: true }));
  assert.equal(later.squares.length, H.disk(cfg, [4, 3], 2).length, 'after a no, the next yes is a fresh area');
}

console.log('PASS sense hint: the real bird stays inside, and the cloud never marks a square outside the sense');
process.exit(0);
