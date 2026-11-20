// Hidden "Simple rules" test mode. Off unless a game was created with the lobby URL flag.
// Nothing here runs for a normal game: every helper no-ops when g.simple is not set.
const HIDES = 2;
const HIDE_ROUNDS = 2; // the round you hide, and the next one
const OFF = [-99, -99];
const key = p => p[0] + ',' + p[1];

function on(g) { return !!(g && g.simple); }
function arm(g) {
  if (!g) return g;
  g.simple = true;
  if (!g.camo) g.camo = {};
  return g;
}
function ensure(g, seat) {
  if (!g.camo) g.camo = {};
  if (!g.camo[seat]) g.camo[seat] = { left: HIDES, until: 0 };
  return g.camo[seat];
}
function hidden(g, seat) {
  if (!on(g) || !seat) return false;
  const c = g.camo && g.camo[seat];
  return !!(c && c.until >= g.round);
}
function left(g, seat) {
  if (!on(g) || !seat) return 0;
  return ensure(g, seat).left;
}
// Ostriches share a team. Vultures share a team. Each hunter stands alone.
function teamOf(seat) {
  if (seat === 'blue' || seat === 'o1' || seat === 'o2') return 'ostrich';
  if (seat === 'red' || seat === 'v1' || seat === 'v2') return 'vulture';
  return seat;
}
function sameTeam(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = teamOf(a), tb = teamOf(b);
  return ta === tb && (ta === 'ostrich' || ta === 'vulture');
}
function sees(g, viewer, seat) {
  if (!hidden(g, seat)) return true;
  return sameTeam(viewer, seat);
}
function hide(g, seat) {
  if (!on(g) || !seat) return false;
  const c = ensure(g, seat);
  if (c.left < 1 || hidden(g, seat)) return false;
  c.left -= 1;
  c.until = g.round + (HIDE_ROUNDS - 1);
  return true;
}
function reveal(g, seat) {
  const c = g.camo && g.camo[seat];
  if (c) c.until = 0;
}
function isHunter(seat) { return seat === 'hunter' || seat === 'hyena' || seat === 'badger'; }
function isBird(seat) { return seat === 'blue' || seat === 'red' || seat === 'o1' || seat === 'o2' || seat === 'v1' || seat === 'v2'; }
function alivePos(p, out) { return !out && p && p[0] >= 0 ? p : null; }
function roster(g) {
  const list = [];
  const add = (seat, p, out) => { const q = alivePos(p, out); if (q) list.push({ seat, p: q }); };
  if (g.team && g.b) {
    for (const s of ['o1', 'o2', 'v1', 'v2']) if (g.b[s]) add(s, g.b[s].pos, g.b[s].out);
    if (g.h) add('hunter', g.h.p, false);
    return list;
  }
  if (g.hunt) {
    add('blue', g.ostrich, g.hunt.birds.blue.out);
    add('red', g.vulture, g.hunt.birds.red.out);
    add('hyena', g.hunt.hs.hyena.p, false);
    add('badger', g.hunt.hs.badger.p, false);
    return list;
  }
  if (g.three) {
    add('blue', g.ostrich, g.three.birds.blue.out);
    add('red', g.vulture, g.three.birds.red.out);
    add('hunter', g.three.h, false);
    return list;
  }
  add('blue', g.ostrich, false);
  add('red', g.vulture, false);
  return list;
}
function occupant(g, p, except) {
  if (!p) return null;
  const id = key(p);
  return roster(g).find(a => a.seat !== except && key(a.p) === id) || null;
}
// A square a mover can see an animal on is not a landing square.
function blocks(g, mover, p) {
  if (!on(g)) return false;
  const o = occupant(g, p, mover);
  return !!(o && sees(g, mover, o.seat));
}
// Hidden opponent on this square: a hunter still catches a bird. Anyone else stays put.
function landKind(g, mover, p) {
  if (!on(g)) return null;
  const o = occupant(g, p, mover);
  if (!o || sees(g, mover, o.seat)) return null;
  if (isHunter(mover) && isBird(o.seat)) return 'catch';
  return 'stay';
}
function noteThrow(g, r) {
  if (!on(g) || !r) return;
  if (r.kickedBack && r.kicker) reveal(g, r.kicker);
  for (const x of r.pushed || []) {
    const seat = x.kind === 'hyena' || x.kind === 'badger' ? (g.hunt ? x.kind : 'hunter') : x.kind;
    reveal(g, seat);
  }
}
function copyMarks(v, g) {
  if (!v.marks || !g.marks) return;
  const marks = Object.assign({}, v.marks);
  for (const [k, m] of Object.entries(g.marks)) if (m === 'spotted') marks[k] = 'spotted';
  v.marks = marks;
}
// Adjust one already-built view. A normal game never calls this.
function expose(g, seat, v) {
  if (!on(g) || !v) return v;
  v.simple = true;
  v.hideLeft = left(g, seat);
  v.sniff = null;
  v.sniffKeep = null;
  v.pounce = false;
  v.sense = null;
  v.seenBirds = [];
  if (v.can) v.can.carry = false;
  if (v.carryMoves) v.carryMoves = [];
  if (v.h3) { v.h3.mateSniff = null; v.h3.extra = false; }
  copyMarks(v, g);
  if (g.phase !== 'play') return v;
  v.veil = {};
  for (const a of roster(g)) if (hidden(g, a.seat) && sees(g, seat, a.seat)) v.veil[a.seat] = 1;
  if (v.veil[seat]) {
    if (teamOf(seat) === 'ostrich') v.veil.blue = 1;
    if (teamOf(seat) === 'vulture') v.veil.red = 1;
  }
  const hideAt = (field, who, real) => {
    if (!sees(g, seat, who)) v[field] = OFF.slice();
    else if (real && isHunter(seat)) v[field] = real.slice();
  };
  if (g.team && g.b && v.h3) {
    const mineO = teamOf(seat) === 'ostrich', mineV = teamOf(seat) === 'vulture';
    const pieces = [];
    for (const s of ['o1', 'o2', 'v1', 'v2']) {
      if (s === seat) continue;
      const b = g.b[s];
      if (!b || b.out || !b.pos || b.pos[0] < 0 || !sees(g, seat, s)) continue;
      pieces.push({ seat: s, type: teamOf(s) === 'ostrich' ? 'o' : 'v', p: b.pos.slice(), mate: (teamOf(s) === 'ostrich' && mineO) || (teamOf(s) === 'vulture' && mineV), carrying: false, camo: !!hidden(g, s) });
    }
    v.h3.pieces = pieces;
    if (g.h) {
      if (sees(g, seat, 'hunter')) { v.h3.hunter = g.h.p.slice(); v.h3.burrowed = !!hidden(g, 'hunter'); }
      else { v.h3.hunter = null; v.h3.burrowed = false; }
    }
    if (seat === 'hunter') v.burrowed = !!hidden(g, 'hunter');
    return v;
  }
  if (g.hunt) {
    hideAt('ostrich', 'blue', g.ostrich);
    hideAt('vulture', 'red', g.vulture);
    if (v.h3 && v.h3.hunters) {
      v.h3.hunters = v.h3.hunters.filter(h => sees(g, seat, h.kind));
      v.h3.hunters.forEach(h => { if (hidden(g, h.kind)) h.burrowed = true; });
    }
    if (isHunter(seat)) v.burrowed = !!hidden(g, seat);
    return v;
  }
  if (g.three) {
    hideAt('ostrich', 'blue', g.ostrich);
    hideAt('vulture', 'red', g.vulture);
    if (v.h3) {
      if (sees(g, seat, 'hunter')) { v.h3.hunter = g.three.h.slice(); v.h3.burrowed = !!hidden(g, 'hunter'); }
      else { v.h3.hunter = null; v.h3.burrowed = false; }
    }
    if (seat === 'hunter') v.burrowed = !!hidden(g, 'hunter');
    return v;
  }
  if (!sees(g, seat, 'blue')) v.ostrich = null;
  if (!sees(g, seat, 'red')) v.vulture = null;
  return v;
}

module.exports = { HIDES, HIDE_ROUNDS, on, arm, hidden, left, sees, sameTeam, hide, reveal, blocks, landKind, occupant, roster, noteThrow, expose };
