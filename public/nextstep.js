// The next step of each animal's loop, as squares to mark on the board (never words).
// It reads only what this player's own view already holds, so it can never point at hidden information:
//   vulture: its stone count, the squares it has found (public marks), the squares it can fly to or throw at, the rock piles
//   ostrich: its own eggs and hunger, the leaves
//   hunter:  its own sense result and the birds a buried badger sees
// compute() returns { kind, targets, toward, button }:
//   targets: square keys ("x,y") that pulse (the thing to act on)
//   toward:  legal move squares to draw a little bolder (the way to go)
//   button:  the action button that pulses ('throw')
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NextStep = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const key = p => p[0] + ',' + p[1];
  const D = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const LOW_EGG = 5, LOW_FOOD = 3;
  const nearest = (from, list) => list.reduce((b, p) => !b || D(p, from) < D(b, from) ? p : b, null);
  // legal squares that bring you closest to a goal (only those that get you nearer than you are now)
  function toward(from, legal, goal) {
    if (!goal || !legal || !legal.length) return [];
    const now = D(from, goal), best = Math.min(...legal.map(p => D(p, goal)));
    return best < now ? legal.filter(p => D(p, goal) === best).map(key) : [];
  }
  function compute(S) {
    const out = { kind: null, targets: [], toward: [], button: null };
    if (!S || S.phase !== 'play' || !S.myTurn || S.god) return out;
    const C = S.cfg || {};
    if (S.role === 'red') {
      if (!S.vulture || S.vulture[0] < 0) return out;
      const stones = S.stones | 0;
      const found = Object.keys(S.marks || {}).filter(k => S.marks[k] === 'spotted').map(k => k.split(',').map(Number));
      if (stones >= 1) {
        const inRange = new Set((S.throw || []).map(key)), here = found.filter(p => inRange.has(key(p)));
        if (here.length) { out.kind = 'throw'; out.targets = here.map(key); out.button = 'throw'; return out; }
        const near = nearest(S.vulture, found);
        if (near) { out.kind = 'to-egg'; out.targets = [key(near)]; out.toward = toward(S.vulture, S.fly || [], near); }
        return out;
      }
      const rocks = C.rocks || [];
      if (!rocks.length) return out;
      out.kind = 'rocks'; out.targets = rocks.map(key);
      out.toward = toward(S.vulture, S.fly || [], nearest(S.vulture, rocks));
      return out;
    }
    if (S.role === 'blue') {
      if (!S.ostrich || S.ostrich[0] < 0) return out;
      const me = key(S.ostrich);
      const eggs = (S.eggs || []).filter(e => e && e.alive && !e.carried && e.pos && key(e.pos) !== me).sort((a, b) => a.coldIn - b.coldIn);
      const egg = eggs.length && eggs[0].coldIn <= LOW_EGG ? eggs[0] : null;
      const leaves = C.foods || [], onLeaf = leaves.some(f => key(f) === me);
      const leaf = !onLeaf && leaves.length && S.hungerLeft <= LOW_FOOD ? nearest(S.ostrich, leaves) : null;
      if (egg && (!leaf || egg.coldIn <= S.hungerLeft)) { out.kind = 'egg'; out.targets = [key(egg.pos)]; }
      else if (leaf) { out.kind = 'leaf'; out.targets = [key(leaf)]; }
      return out;
    }
    if (S.role === 'hunter') {
      if (S.burrowed && S.seenBirds && S.seenBirds.length) { out.kind = 'ambush'; out.targets = S.seenBirds.filter(q => q.p).map(q => key(q.p)); return out; }
      const h = S.h3 || {}, range = h.senseRange;
      if (S.sense && S.hunter && range != null) {
        out.kind = 'area'; // a bird is near: the outlined area is what to step into (it pulses; on the Pounce's second reading the filled overlap does)
      }
      return out;
    }
    return out;
  }
  return { compute, toward, LOW_EGG, LOW_FOOD, key };
});
