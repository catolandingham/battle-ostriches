// One tap on a kick landing, including a wrap around the board edge.
const assert = require('assert');
const B = require('./game.js');
const T = require('./three.js');

function play(extra) {
  const g = B.newGame();
  g.phase = 'play'; g.turn = 'blue'; g.carrying = null;
  Object.assign(g, extra);
  return g;
}
function resolve(plans, tap) {
  return (plans || []).find(p => p.to[0] === tap[0] && p.to[1] === tap[1]);
}

assert.deepEqual(B.slideN(B.CONFIG, [4, 6], [0, 1], 3, null, {}, true).points, [[4, 6], [4, 0], [4, 1], [4, 2]], 'a south kick wraps off the last row and back in at the top');

{
  const g = play({ ostrich: [4, 5], vulture: [4, 6] });
  const plans = B.kickPlans(g);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].at, [4, 6], 'the kick action still names the animal where it is');
  assert.deepEqual(plans[0].to, [4, 2], 'the tap is the wrapped landing');
  assert.deepEqual(plans[0].points, [[4, 6], [4, 0], [4, 1], [4, 2]]);
  const chosen = resolve(plans, [4, 2]);
  assert.ok(chosen, 'the wrapped landing is a tap');
  assert.ok(B.ostrichKick(g, chosen.at));
  assert.deepEqual(g.vulture, [4, 2], 'that tap kicks the vulture onto the wrapped landing');
  assert.deepEqual(g.ostrich, [4, 5]);
}

{
  const g = play({ ostrich: [2, 3], vulture: [3, 3] });
  const plans = B.kickPlans(g);
  assert.deepEqual(plans[0].to, [6, 3], 'three squares straight away, no wrap');
  assert.deepEqual(plans[0].points, [[3, 3], [4, 3], [5, 3], [6, 3]]);
  assert.ok(B.ostrichKick(g, resolve(plans, plans[0].to).at));
  assert.deepEqual(g.vulture, [6, 3]);
}

{
  const g = play({ ostrich: [4, 3], vulture: [5, 3], marks: { '7,3': 'hit' } });
  const plans = B.kickPlans(g);
  assert.deepEqual(plans[0].to, [6, 3], 'a wrecked square cuts the kick short, and that earlier square is the tap');
  assert.deepEqual(plans[0].points, [[5, 3], [6, 3]]);
  assert.ok(B.ostrichKick(g, resolve(plans, [6, 3]).at));
  assert.deepEqual(g.vulture, [6, 3]);
}

{
  const g = T.newGame3('badger');
  g.phase = 'play'; g.turn = 'blue'; g.carrying = null;
  g.ostrich = [2, 3]; g.vulture = [8, 6]; g.three.h = [3, 3]; g.three.burrowed = false;
  const plans = T.kickPlans3(g);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].key, 'badger');
  assert.deepEqual(plans[0].at, [3, 3]);
  assert.equal(B.wrapDist(g.cfg, plans[0].at, plans[0].to), g.cfg.kickPushBadger, 'the badger landing is the full 2');
  assert.ok(T.ostrichKick3(g, plans[0].at));
  assert.deepEqual(g.three.h, plans[0].to, 'the tap and the kick use the same square');
}

console.log('PASS kick landing: one tap on the landing, including a wrap');
process.exit(0);
