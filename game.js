// Battle Ostriches core rules ("Open skies" ruleset). All tuning lives in CONFIG.
// Both birds always see each other. Eggs stay hidden from the vulture until found (landed on) or smashed.
// Simple rules (simple.js) are a hidden test mode. Every branch below is skipped unless g.simple is set.
let S = { on() { return false; }, blocks() { return false; }, landKind() { return null; }, hide() { return false; }, reveal() {}, occupant() { return null; }, noteThrow() {}, sees() { return true; } };
if (typeof require === 'function') { try { S = require('./simple.js'); } catch (e) { /* browser build has no simple.js loader */ } }
const CONFIG = {
  cols: 9, rows: 7,
  eggs: 3,
  rounds: 30,          // ostrich wins if any egg survives this many rounds
  warmth: 15,          // an egg goes cold unless the ostrich stands or sits on it at least once every N rounds (a carried egg is not warmed)
  ostrichWalk: 2,      // the ostrich walks up to N squares (king-move distance; a 2-square walk needs a middle square that is not smashed)...
  carryWalk: 1,        // ...but only 1 square while it carries an egg
  kickPush: 3,         // Kick: the ostrich pushes an animal next to it this many squares straight away (wraps around the board edge; stops before a wrecked square or an animal that is up)
  kickPushBadger: 2,   // ...but the badger only this many
  vultureFly: 2,       // vulture flies up to N squares (king-move distance)
  throwRange: 1,       // vulture throws at its own square or one next to it...
  vultureStart: [4, 3],
  smellRange: 1,       // ...and on landing learns if any egg is on its square or next to it (yes/no, this turn only)
  food: 15,            // the ostrich must step onto food at least once every N of its turns, or it starves
  stones: 1,           // stones the vulture can hold; refill by landing on a rock pile
  foods: [[0, 0], [8, 6]],   // fixed food spots (never run out)
  rocks: [[4, 0], [4, 6]],   // fixed rock piles (never run out)
  hunterGoal: { '3': 'all', '5': 'first' }, // HUNTER_GOAL per one-hunter mode (3 players, 5 = 2 vs 2 + hunter). 'all': knock out every bird. 'first': the first side to meet its goal wins (3 players: the hunter needs one bird; 2 vs 2 + hunter: one ostrich and one vulture). 'catches:N' (3 players): the hunter wins at N catches in total. The words on the hunter cards and the end screen follow this setting.
  scramble: 3,         // a caught bird is set down this many squares away (king-move distance). See relocateCaught.
  pushHunters: 2,      // hunters meeting / a stone: the pushed animal goes this far
};
// HUNTER_GOAL(mode) -> { kind: 'all' | 'first' | 'catches', n }
const HUNTER_GOAL = (mode, cfg = CONFIG) => { const v = String((cfg.hunterGoal || {})[mode] || 'all'), m = /^catches:(\d+)$/.exec(v); return m ? { kind: 'catches', n: +m[1] } : { kind: v === 'first' ? 'first' : 'all', n: 0 }; };
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const key = (p) => p[0] + ',' + p[1];
const inB = (p, c = CONFIG) => p[0] >= 0 && p[1] >= 0 && p[0] < c.cols && p[1] < c.rows;
const isFood = (g, p) => g.cfg.foods.some(q => key(q) === key(p));
const isRock = (g, p) => g.cfg.rocks.some(q => key(q) === key(p));
const smashed = (g, p) => g.marks[key(p)] === 'hit';
// A wrecked square: a stone landed on it (or smashed an egg there). Nobody can land on it, and a push stops before it. Leaves and rock piles are never wrecked.
const wrecked = (g, p) => { const m = g.marks[key(p)]; return m === 'hit' || m === 'stone'; };

// A hunter standing on p that is up (not buried): in 3 players g.three, in Hunters g.hunt. Birds see these (they are always within 2), so a bird may not land on one.
function hunterUpAt(g, p) {
  if (g.three && g.three.h && key(g.three.h) === key(p) && !(g.three.kind === 'badger' && g.three.burrowed)) return g.three.kind || 'hyena';
  if (g.hunt) for (const h of ['hyena', 'badger']) { const x = g.hunt.hs[h]; if (key(x.p) === key(p) && !x.burrowed) return h; }
  return null;
}
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// An 8-direction push that does not wrap (a badger bursting out when the hyena's arrival direction is unknown).
// Among the 8 straight lines where the landing square is in bounds and open for the full n squares; else any such line of length 1; else null.
// A caught bird does not use this. See relocateCaught.
function scrambleTo(cfg, from, open, n = 2, rnd = Math.random) {
  for (let len = n; len >= 1; len--) {
    const c = DIRS8.map(d => [from[0] + d[0] * len, from[1] + d[1] * len]).filter(q => inB(q, cfg) && open(q));
    if (c.length) return c[Math.floor(rnd() * c.length)];
  }
  return null;
}
// A caught bird is set down on a random open square at king-move distance exactly n (Chebyshev: the same
// distance walking and the 2-square sense use). The board does not wrap. Only squares inside the rectangle
// are candidates, which is the same bound scrambleTo already used. The catch square itself is never a landing.
// If no square at exactly n is open, use the nearest distance above n that has an open square, then the nearest
// distance below n. Returns null when no other square is open; the caller undoes the move that caught the bird.
function relocateCaught(cfg, from, open, n = 3, rnd = Math.random) {
  const buckets = [];
  let maxD = 0;
  for (let x = 0; x < cfg.cols; x++) for (let y = 0; y < cfg.rows; y++) {
    const q = [x, y], d = dist(q, from);
    if (d < 1 || !open(q)) continue;
    (buckets[d] || (buckets[d] = [])).push(q);
    if (d > maxD) maxD = d;
  }
  const choose = d => { const c = buckets[d]; return c && c.length ? c[Math.floor(rnd() * c.length)].slice() : null; };
  const exact = choose(n);
  if (exact) return exact;
  for (let d = n + 1; d <= maxD; d++) { const q = choose(d); if (q) return q; }
  for (let d = n - 1; d >= 1; d--) { const q = choose(d); if (q) return q; }
  return null;
}
function newGame(cfg = CONFIG) {
  return { cfg, phase: 'setupEggs', round: 1, turn: 'blue', eggs: [], ostrich: null,
    carrying: null, sitRun: 0, vulture: cfg.vultureStart.slice(), hungerLeft: cfg.food, stones: cfg.stones,
    marks: {}, sniff: null, sniffKeep: null, winner: null, winBy: null, lastAction: null, lastCold: [], kickSeq: 0, lastKick: null, stoneSeq: 0, lastStone: null };
}
function eggAt(g, p) { return g.eggs.find(e => e.alive && e.pos && key(e.pos) === key(p)); }
function aliveEggs(g) { return g.eggs.filter(e => e.alive); }
const myTurn = (g, r) => g.phase === 'play' && g.turn === r;

// --- setup --- eggs can't go on or next to food, or on a rock pile, or under the vulture
function canPlaceEgg(g, p) {
  return g.phase === 'setupEggs' && inB(p, g.cfg) && !eggAt(g, p) && key(p) !== key(g.vulture) && !isRock(g, p) && !g.cfg.foods.some(f => dist(f, p) <= 1);
}
function placeEgg(g, p) {
  if (!canPlaceEgg(g, p)) return false;
  g.eggs.push({ id: g.eggs.length, pos: p.slice(), alive: true, lastWarm: 0 });
  if (g.eggs.length === g.cfg.eggs) g.phase = 'setupOstrich';
  return true;
}
function placeOstrich(g, p) {
  if (g.phase !== 'setupOstrich' || !inB(p, g.cfg)) return false;
  g.ostrich = p.slice();
  g.phase = 'play'; g.turn = 'red'; // vulture opens round 1
  return true;
}

// --- ostrich ---
// A carried egg is held for exactly one vulture turn, then set down automatically where the ostrich stands.
function dropCarried(g) {
  if (g.carrying === null) return;
  const e = g.eggs[g.carrying]; g.carrying = null;
  if (e.alive) e.pos = g.ostrich.slice();
}
function onEgg(g) { return !!(g.ostrich && g.carrying === null && eggAt(g, g.ostrich)); }
// Every square within `range` king-moves of p that a walker can land on: in bounds and not wrecked. It may pass over anything (animals, eggs,
// wrecked squares); callers add their own landing rules (visible animals).
function walkSquares(cfg, marks, p, range) {
  const out = [];
  for (let x = Math.max(0, p[0] - range); x <= Math.min(cfg.cols - 1, p[0] + range); x++) for (let y = Math.max(0, p[1] - range); y <= Math.min(cfg.rows - 1, p[1] + range); y++) {
    const id = x + ',' + y; if ((x === p[0] && y === p[1]) || (marks && (marks[id] === 'hit' || marks[id] === 'stone'))) continue;
    out.push([x, y]);
  }
  return out;
}
// on or next to a leaf
const nearLeaf = (g, p) => g.cfg.foods.some(f => dist(f, p) <= 1);
function ostrichMoves(g, carry = false) {
  if (!myTurn(g, 'blue')) return [];
  if (carry && !canCarry(g)) return [];
  const res = walkSquares(g.cfg, g.marks, g.ostrich, carry ? g.cfg.carryWalk : g.cfg.ostrichWalk)
    .filter(p => g.simple ? !S.blocks(g, 'blue', p) : !(g.vulture && onBoard(g.vulture) && key(p) === key(g.vulture)) && !hunterUpAt(g, p)); // wrecked squares and the vulture (a bird it sees) are not landing squares
  // the ostrich can never put an egg on or next to a leaf, onto a rock pile, or onto another egg
  return carry ? res.filter(p => !(eggAt(g, p) || isRock(g, p) || nearLeaf(g, p))) : res;
}
// --- Kick --- on its own turn, instead of moving, the ostrich may kick an animal it can see on a square next to it: the animal is pushed
// cfg.kickPush squares straight away from the ostrich. The ostrich stays on its square (on an egg, it still warms it), it never kicks while
// it carries an egg, and it cannot kick when it must step off its egg. A kick is not a Sit: it neither adds to nor clears the sit count.
const sgn = Math.sign;
// Slide up to n squares from `from` in direction dir (a push, rules 5). It stops before a wrecked square (when marks is given), before the board edge,
// and before any square where blocked(square) is true (an animal that is up). With wrap, a push that reaches the edge continues from the opposite edge
// (each axis on its own for a diagonal) and always travels its full distance unless a wrecked square or an animal stops it.
function slide(cfg, from, dir, n, blocked, marks, wrap) { return slideN(cfg, from, dir, n, blocked, marks, wrap).to; }
function slideN(cfg, from, dir, n, blocked, marks, wrap) {
  let q = from.slice(), moved = 0;
  const points = [from.slice()];
  for (let i = 0; i < n; i++) {
    let m = [q[0] + dir[0], q[1] + dir[1]];
    if (wrap) m = [(m[0] + cfg.cols) % cfg.cols, (m[1] + cfg.rows) % cfg.rows]; else if (!inB(m, cfg)) break;
    if (key(m) === key(from) || (blocked && blocked(m)) || (marks && (marks[key(m)] === 'hit' || marks[key(m)] === 'stone'))) break;
    q = m; moved++; points.push(q.slice());
  }
  return { to: q, moved, points };
}
const awayFrom = (from, p) => [sgn(p[0] - from[0]), sgn(p[1] - from[1])];
// Shortest signed step from a to b on a wrapping board. A step longer than half the board is the long way around.
function wrapOff(d, span) { if (d > span / 2) return d - span; if (d < -span / 2) return d + span; return d; }
function wrapDelta(cfg, a, b) { return [wrapOff(b[0] - a[0], cfg.cols), wrapOff(b[1] - a[1], cfg.rows)]; }
function wrapDist(cfg, a, b) { const d = wrapDelta(cfg, a, b); return Math.max(Math.abs(d[0]), Math.abs(d[1])); }
// True when the landing sits on the straight-away ray. Reversing that ray points at the ostrich.
function pointsBack(cfg, from, to, ostrich) {
  const away = awayFrom(ostrich, from), d = wrapDelta(cfg, from, to);
  if (away[0] && away[1]) return Math.sign(d[0]) === away[0] && Math.sign(d[1]) === away[1] && Math.abs(d[0]) === Math.abs(d[1]);
  if (away[0]) return d[1] === 0 && Math.sign(d[0]) === away[0];
  if (away[1]) return d[0] === 0 && Math.sign(d[1]) === away[1];
  return false;
}
// King steps along the short wrap from `from` to `to`. Each step is one square, so a real edge crossing is the only jump.
function wrapPath(cfg, from, to) {
  const d = wrapDelta(cfg, from, to), steps = Math.max(Math.abs(d[0]), Math.abs(d[1])), points = [from.slice()];
  if (!steps) return points;
  let x = from[0], y = from[1], rx = Math.abs(d[0]), ry = Math.abs(d[1]);
  const sx = sgn(d[0]), sy = sgn(d[1]);
  for (let i = 0; i < steps; i++) {
    if (rx > 0) { x += sx; rx--; }
    if (ry > 0) { y += sy; ry--; }
    points.push([(x % cfg.cols + cfg.cols) % cfg.cols, (y % cfg.rows + cfg.rows) % cfg.rows]);
  }
  return points;
}
function pathWraps(cfg, points) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (Math.abs(b[0] - a[0]) > cfg.cols / 2 || Math.abs(b[1] - a[1]) > cfg.rows / 2) return true;
  }
  return false;
}
function ringAt(cfg, from, n) {
  const out = [];
  for (let x = 0; x < cfg.cols; x++) for (let y = 0; y < cfg.rows; y++) if (wrapDist(cfg, from, [x, y]) === n) out.push([x, y]);
  return out;
}
// Same pick for the preview and the kick, until the board changes. Tests may set g.kickRnd.
// A stone uses the same picker as a kick, with its own seed so a throw and a kick from the same squares do not copy each other.
function stoneRnd(g, from, vul) {
  if (g && typeof g.kickRnd === 'function') return g.kickRnd;
  return scatterRnd({ round: g && g.round, kickSeq: (((g && g.kickSeq) | 0) * 3 + ((g && g.stoneSeq) | 0) + 11) }, from, vul);
}
function scatterRnd(g, from, ostrich) {
  if (g && typeof g.kickRnd === 'function') return g.kickRnd;
  let s = (((g && g.round) | 0) * 131 + from[0] * 97 + from[1] * 13 + ((g && g.kickSeq) | 0) * 17 + (ostrich ? ostrich[0] * 3 + ostrich[1] * 5 : 0)) >>> 0;
  if (!s) s = 1;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// A kicked hunter, on a wrapping board, lands on a random square at exact distance n.
// open(q) is true when the square is not an animal and not wrecked. Eggs are open: a kick does not break them.
// reach is how far that hunter can catch. The straight-away ray is refused, because reversing it points at the ostrich.
// When nothing is outside reach, fall back to full distance, not on an animal,
// and not next to the ostrich even around the edge. Non-wrapping edges are not handled here.
function scatterKick(cfg, from, ostrich, n, open, reach, rnd) {
  const all = ringAt(cfg, from, n).filter(q => open(q));
  const outside = all.filter(q => wrapDist(cfg, q, ostrich) > reach);
  const reachGap = !outside.length;
  let pool = outside.filter(q => !pointsBack(cfg, from, q, ostrich));
  let fallback = false;
  if (!pool.length) {
    fallback = true;
    const loose = all.filter(q => wrapDist(cfg, q, ostrich) > 1);
    pool = loose.filter(q => !pointsBack(cfg, from, q, ostrich));
    if (!pool.length) pool = loose;
    if (!pool.length) pool = all.slice();
  }
  if (!pool.length) return { to: from.slice(), moved: 0, points: [from.slice()], fallback: true, reachGap, wrap: false };
  const i = Math.min(pool.length - 1, Math.floor(rnd() * pool.length));
  const to = pool[i].slice(), points = wrapPath(cfg, from, to);
  return { to, moved: n, points, fallback, reachGap, wrap: pathWraps(cfg, points) };
}
function canKick(g) { return myTurn(g, 'blue') && g.carrying === null; }
// Animals next to the ostrich that it can see (classic: the vulture, always in sight), and the squares it may kick now.
function kickable(g) {
  if (!(g.ostrich && g.ostrich[0] >= 0 && g.vulture && g.vulture[0] >= 0 && dist(g.vulture, g.ostrich) === 1)) return [];
  if (g.simple && !S.sees(g, 'blue', 'red')) return [];
  return [g.vulture.slice()];
}
function kickTargets(g) { return canKick(g) ? kickable(g) : []; }
// One plan per animal the ostrich can kick. `at` is the animal now (what a kick action sends). `to` is the landing the player taps.
function kickPlans(g) {
  if (!canKick(g)) return [];
  return kickable(g).map(at => {
    const path = slideN(g.cfg, at, awayFrom(g.ostrich, at), g.cfg.kickPush, null, g.marks, !g.simple);
    return { at: at.slice(), to: path.to.slice(), points: path.points, who: 'vulture', key: 'red' };
  });
}
// Records the kick, then the ostrich's turn ends like a stay that still warms an egg under it and still counts for hunger.
function kickDone(g, who, from, to, n) {
  g.sitting = false;
  g.lastKick = { seq: ++g.kickSeq, who, from: from.slice(), to: to.slice(), round: g.round, moved: n };
  g.lastAction = { type: 'kick', who, from: from.slice(), to: to.slice() };
  endOstrich(g);
}
function ostrichKick(g, p) {
  if (!kickTargets(g).some(q => key(q) === key(p))) return false;
  const from = g.vulture.slice(), r = slideN(g.cfg, from, awayFrom(g.ostrich, from), g.cfg.kickPush, null, g.marks, !g.simple), to = r.to;
  g.vulture = to; kickDone(g, 'vulture', from, to, r.moved); return true;
}
function canSit(g) { return myTurn(g, 'blue') && onEgg(g); } // no limit on sitting
function canCarry(g) { if (g.simple) return false; return myTurn(g, 'blue') && onEgg(g); }
function mustLeave(g) { return false; } // kept so old callers still work: there is no sit limit
function ostrichStep(g, p, carry = false) {
  if (g.simple && carry) return false;
  if (!ostrichMoves(g, carry).some(q => key(q) === key(p))) return false;
  if (g.simple && S.landKind(g, 'blue', p) === 'stay') {
    const o = S.occupant(g, p, 'blue'); if (o) S.reveal(g, o.seat);
    g.sitting = false; g.lastAction = { type: 'step', stayed: true }; endOstrich(g); return true;
  }
  if (carry) { const e = eggAt(g, g.ostrich); e.pos = null; g.carrying = e.id;
    if (g.marks[key(g.ostrich)] === 'spotted') delete g.marks[key(g.ostrich)]; // the egg moved: found mark clears
    g.carryNote = { seq: (g.carrySeq = (g.carrySeq || 0) + 1), round: g.round, seat: 'blue', text: 'Egg will drop here next turn.' }; }
  g.ostrich = p.slice(); g.sitRun = 0; g.sitting = false;
  g.lastAction = { type: carry ? 'carry' : 'step' };
  endOstrich(g); return true;
}
function ostrichSit(g) {
  if (!canSit(g)) return false;
  g.sitRun++; g.sitting = true; g.lastAction = { type: 'sit' }; endOstrich(g); return true;
}
function smellsEgg(g, p) { return aliveEggs(g).some(e => { const q = e.pos || (g.carrying === e.id ? g.ostrich : null); return q && dist(q, p) <= g.cfg.smellRange; }); }
function endOstrich(g) {
  const e = g.carrying !== null ? null : eggAt(g, g.ostrich); // a carried egg is not warmed
  if (e) e.lastWarm = g.round;
  if (isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.winner = 'red'; g.winBy = 'starved'; g.phase = 'over'; return; }
  endRound(g);
}

// --- vulture ---
function flyTargets(g) {
  if (!myTurn(g, 'red')) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) {
    const d = dist([x, y], g.vulture); if (!(d >= 1 && d <= g.cfg.vultureFly && !wrecked(g, [x, y]))) continue;
    if (g.simple ? S.blocks(g, 'red', [x, y]) : hunterUpAt(g, [x, y]) || (onBoard(g.ostrich) && key([x, y]) === key(g.ostrich))) continue;
    r.push([x, y]); }
  return r;
}
// Needs a stone. Its own square or a square next to it, not a wrecked one.
function throwTargets(g) {
  if (!myTurn(g, 'red') || g.stones < 1) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++)
    if (dist([x, y], g.vulture) <= g.cfg.throwRange && !wrecked(g, [x, y])) r.push([x, y]);
  return r;
}
// The round the ostrich is trying to survive. A vulture who finds an egg now has no later turn to throw.
function isLastRound(g) { return !!(g && g.cfg && g.round >= g.cfg.rounds); }
// Picture of one egg before a landing, so a move that is taken back can put it back.
function eggSnap(g, p) {
  const e = eggAt(g, p); if (!e) return null;
  const k = key(p);
  return { id: e.id, mark: Object.prototype.hasOwnProperty.call(g.marks, k) ? g.marks[k] : null, smash: g.lastSmash || null, seq: g.smashSeq || 0 };
}
// Landing on an egg finds it. A stone is what breaks an egg (Brian delegated, 2026-11-21).
// The egg is gone, the square is wrecked, and lastSmash carries the usual announcement. No stone is used.
// Any earlier round only finds it. Returns 'smash', 'find', or null.
function breakEgg(g, e, p, by, owner) {
  e.alive = false;
  if (!isFood(g, p) && !isRock(g, p)) g.marks[key(p)] = 'hit';
  g.lastSmash = { seq: g.smashSeq = (g.smashSeq || 0) + 1, by: by || 'red', owner: owner || 'blue' };
  if (g.lastAction) g.lastAction.smashed = p.slice();
  if (!g.team && !aliveEggs(g).length) { g.winner = 'red'; g.winBy = 'smashed'; g.phase = 'over'; }
}
// A landing that was taken back did not break the egg. Puts the egg and the square back. No effect if this landing did not break one.
function undoBreak(g, p, snap) {
  if (!snap || !g.lastAction || !g.lastAction.smashed) return false;
  const e = g.eggs.find(x => x.id === snap.id); if (e) e.alive = true;
  const k = key(p); if (snap.mark == null) delete g.marks[k]; else g.marks[k] = snap.mark;
  g.lastSmash = snap.smash; g.smashSeq = snap.seq; delete g.lastAction.smashed;
  g.lastAction.smell = smellsEgg(g, p);
  g.sniff = { p: p.slice(), yes: g.lastAction.smell, round: g.round };
  g.sniffKeep = g.lastAction.smell ? { p: p.slice(), yes: true, round: g.round } : null;
  return true;
}
function vultureFly(g, p) {
  if (!flyTargets(g).some(q => key(q) === key(p))) return false;
  if (g.simple && S.landKind(g, 'red', p) === 'stay') {
    const o = S.occupant(g, p, 'red'); if (o) S.reveal(g, o.seat);
    g.lastAction = { type: 'fly', from: g.vulture.slice(), stayed: true }; g.sniff = null; g.sniffKeep = null;
    g.turn = 'blue'; dropCarried(g); return true;
  }
  const from = g.vulture.slice();
  g.vulture = p.slice(); g.lastAction = { type: 'fly', from };
  const e = eggAt(g, p), open = !!(e && !ostrichGuards(g, p));
  // Simple rules still find the egg. The last-round break is the normal game only.
  if (open) { g.marks[key(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  if (isRock(g, p)) { g.lastAction.refill = g.stones < g.cfg.stones; g.stones = g.cfg.stones; }
  if (g.simple) { g.lastAction.smell = false; g.sniff = null; g.sniffKeep = null; }
  else {
    g.lastAction.smell = smellsEgg(g, p); // after a break, the dead egg does not count as nearby
    // Snapshot for the "may be here" squares until the next landing. round stamps the sense
    // so a later turn can keep the memory without announcing it again as a current fact.
    g.sniff = { p: p.slice(), yes: g.lastAction.smell, round: g.round };
    // A find is the egg on this square, not a neighborhood. A throw must not refresh this copy.
    // A last-round break is not a find: other eggs nearby still leave the usual outlines.
    const found = open && !g.lastAction.smashed;
    g.sniffKeep = found || !g.lastAction.smell ? null : { p: p.slice(), yes: true, round: g.round };
  }
  if (g.phase !== 'over') g.turn = 'blue';
  dropCarried(g); return true;
}
const onBoard = p => !!(p && p[0] >= 0 && p[1] >= 0);
function parkEliminated(g) { // an OUT bird is off the board, even if a position was left on an egg
  const off = [-99, -99];
  const drop = () => { if (g.carrying !== null) { const e = g.eggs[g.carrying]; g.carrying = null; if (e && e.alive && onBoard(g.ostrich)) e.pos = g.ostrich.slice(); } };
  if (g.three && g.three.birds) {
    if (g.three.birds.blue.out && onBoard(g.ostrich)) { drop(); g.ostrich = off.slice(); }
    if (g.three.birds.red.out && onBoard(g.vulture)) g.vulture = off.slice();
  }
  if (g.hunt && g.hunt.birds) {
    if (g.hunt.birds.blue.out && onBoard(g.ostrich)) { drop(); g.ostrich = off.slice(); }
    if (g.hunt.birds.red.out && onBoard(g.vulture)) g.vulture = off.slice();
  }
}
function ostrichGuards(g, p) { parkEliminated(g); return onBoard(g.ostrich) && key(p) === key(g.ostrich); }
// --- Stones (rules 6) --- one resolver for every mode. W is an adapter that knows who stands where in that mode:
//   W.thrower() -> the throwing vulture's square; W.setThrower(q); W.ostrichAt(p) -> bool (an ostrich in the game, or its egg in its beak);
//   W.eggAt(p) -> a hidden egg on p (not under an ostrich); W.pushAt(p, dir, n) -> pushes every hunter on p (a buried badger comes up) and returns what moved;
//   W.open(q) -> a square the vulture may be set down on (in bounds, not wrecked, no animal that is up); W.ostrichPos() -> for the hop tie-break.
// Everything on the square happens at once. Returns { result, line, kickedBack, hop, pushed, used }.
function resolveThrow(g, W, target) {
  const out = { result: 'miss', line: null, kickedBack: false, hop: null, pushed: [], used: false, smashed: null };
  let p = target.slice(), kicked = false;
  for (let guard = 0; guard < 3; guard++) {
    const t = W.thrower();
    if (W.ostrichAt(p)) {
      if (kicked) { out.used = true; out.result = 'bounce'; return out; } // a stone is never kicked back twice
      out.kicker = W.ostrichSeatAt ? W.ostrichSeatAt(p) : 'blue'; out.kickedBack = true; out.result = 'bounce'; kicked = true; out.line = 'The ostrich kicked the stone right back!';
      out.bounce = isFood(g, t) ? 'leaf' : isRock(g, t) ? 'rock' : 'kick'; // which cartoon plays (public/cutaways.js); not a rule
      if (isFood(g, t) || isRock(g, t)) { // the vulture stands where a stone cannot land: it bounces off and goes one square on, straight past the vulture
        out.line = isFood(g, t) ? 'The stone bounced off the leaf.' : 'The vulture batted it away with a rock.';
        const n = [t[0] + sgn(t[0] - p[0]), t[1] + sgn(t[1] - p[1])];
        if (!inB(n, g.cfg) || isFood(g, n) || isRock(g, n)) { out.used = true; return out; }
        p = n; continue;
      }
      p = t.slice(); continue;
    }
    // the stone lands on p as a normal stone
    const e = W.eggAt(p), special = isFood(g, p) || isRock(g, p);
    if (special && !kicked) out.line = isFood(g, p) ? 'The stone landed softly in the leaves.' : 'The stone clattered back onto the rock pile.';
    if (e) { e.alive = false; out.smashed = e.id; out.result = 'hit'; }
    const dir = [sgn(p[0] - t[0]), sgn(p[1] - t[1])];
    if (dir[0] || dir[1]) out.pushed = W.pushAt(p, dir, 2); // a hunter on the square is moved the full 2; a buried badger comes up. Wrapping games pick a random square.
    if (out.pushed.length) out.line = "The vulture's stone hit the " + out.pushed.map(x => x.kind).join(' and the ') + '.';
    if (!special) g.marks[key(p)] = e ? 'hit' : 'stone';
    else if (!out.kickedBack && !e) out.result = 'soft';
    if (!special && key(p) === key(t)) { // the stone landed on the vulture's own square: it is set down on the nearest open square (ties: farthest from the ostrich)
      const op = W.ostrichPos(); let best = null, bd = 99, bf = -1;
      for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const q = [x, y]; if (key(q) === key(t) || !W.open(q)) continue;
        const d = dist(q, t), far = op && op[0] >= 0 ? dist(q, op) : 0; if (d < bd || (d === bd && far > bf)) { best = q; bd = d; bf = far; } }
      if (best) { W.setThrower(best); out.hop = best.slice(); }
    }
    return out;
  }
  return out;
}
// the classic (2 player) adapter
const classicW = g => ({ thrower: () => g.vulture.slice(), setThrower: q => { g.vulture = q.slice(); },
  ostrichAt: p => onBoard(g.ostrich) && key(p) === key(g.ostrich), eggAt: p => eggAt(g, p), pushAt: () => [],
  open: q => inB(q, g.cfg) && !wrecked(g, q) && !(onBoard(g.ostrich) && key(q) === key(g.ostrich)), ostrichPos: () => g.ostrich });
function vultureThrow(g, p, mkW) {
  if (!throwTargets(g).some(q => key(q) === key(p))) return false;
  g.stones--; g.sniff = null; parkEliminated(g);
  const from = g.vulture.slice(), r = resolveThrow(g, (mkW || classicW)(g), p);
  if (g.simple) S.noteThrow(g, r);
  g.lastAction = { type: 'throw', from, p: p.slice(), result: r.result, line: r.line, kickedBack: r.kickedBack, hop: r.hop, used: r.used };
  if (r.result === 'bounce') g.lastAction.egg = !!(g.carrying !== null || eggAt(g, p)); // a kicked stone does not say what the ostrich guards
  if (r.result === 'hit') g.lastSmash = {seq:g.smashSeq=(g.smashSeq||0)+1,by:'red',owner:'blue'};
  if (r.line) g.lastStone = { seq: ++g.stoneSeq, text: r.line, by: 'red', targets: r.pushed.map(x => x.kind), kicker:r.kicker||null, trails: r.pushed.map(x=>({key:x.kind,from:x.from,to:x.to,points:x.points||null,scatter:!!x.scatter})), round: g.round,
    bounce: r.bounce || null, carrying: !!(r.kickedBack && g.carrying !== null) }; // carrying: the kicker had an egg in its beak (server.js never sends it to a hunter)
  if (!aliveEggs(g).length) { g.winner = 'red'; g.winBy = 'smashed'; g.phase = 'over'; } else { g.turn = 'blue'; dropCarried(g); }
  return r.result;
}
// Shot clock ran out in a classic 2-player game. Same result as the bigger games: the vulture passes, the ostrich stays put.
function markTime(g) { if (!g || g.phase !== 'play') return; g.timeNote = { seq: (g.timeSeq = (g.timeSeq || 0) + 1), seat: g.turn, round: g.round }; }
function timeout(g) {
  if (!g || g.phase !== 'play' || g.three || g.hunt || g.team) return false;
  markTime(g);
  if (g.turn === 'red') {
    g.sniff = null;
    g.lastAction = { type: 'pass', timeout: true };
    g.turn = 'blue';
    dropCarried(g);
    return true;
  }
  if (g.turn !== 'blue') return false;
  g.sitRun = 0; g.sitting = false; g.lastAction = { type: 'stay', timeout: true };
  if (isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.winner = 'red'; g.winBy = 'starved'; g.phase = 'over'; return true; }
  endRound(g);
  return true;
}
// Simple rules: hide in place. It spends the turn. An ostrich still warms an egg it is standing on.
function hideTurn(g, seat) {
  if (!g.simple || !myTurn(g, seat) || !S.hide(g, seat)) return false;
  if (seat === 'blue') { g.lastAction = { type: 'hide' }; endOstrich(g); return true; }
  g.sniff = null; g.sniffKeep = null; g.lastAction = { type: 'hide' }; g.turn = 'blue'; dropCarried(g); return true;
}
function endRound(g) {
  g.lastCold = [];
  for (const e of aliveEggs(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id);
    if (g.carrying === e.id) g.carrying = null;
    if (e.pos && g.marks[key(e.pos)] === 'spotted') delete g.marks[key(e.pos)];
  }
  if (!aliveEggs(g).length) { g.winner = 'red'; g.winBy = 'cold'; g.phase = 'over'; return; }
  if (g.round >= g.cfg.rounds) { g.winner = 'blue'; g.winBy = 'survived'; g.phase = 'over'; return; }
  g.round++; g.turn = 'red';
}
// What the vulture may see: found eggs ('spotted') and smashed squares ('hit'). Nothing else persists.
function visible(g) { return { marks: Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m === 'spotted' || m === 'hit' || m === 'stone')) }; }
function coldIn(g, e) { return g.cfg.warmth - (g.round - e.lastWarm); } // rounds left before going cold
// Shortest ostrich walk to a visible leaf, counted in moves (each move is up to cfg.ostrichWalk squares). Smashed squares are blocked. Landing on the leaf is the eat; it is included in len, not an extra turn.
function foodRoute(cfg, pos, marks) {
  if (!cfg || !pos || pos[0] < 0 || pos[1] < 0) return null;
  const foods = new Set((cfg.foods || []).map(key));
  if (foods.has(key(pos))) return { len: 0, next: null, food: pos.slice() };
  const seen = new Set([key(pos)]), q = [[pos.slice(), 0, null]], walk = cfg.ostrichWalk || 1;
  while (q.length) {
    const [p, d, first] = q.shift();
    for (const n of walkSquares(cfg, marks, p, walk)) {
      const id = key(n);
      if (seen.has(id)) continue;
      seen.add(id);
      const step = first || n.slice();
      if (foods.has(id)) return { len: d + 1, next: step.slice(), food: n.slice() };
      q.push([n, d + 1, step]);
    }
  }
  return null;
}

// The yes/no is true only for the round it was sensed. After that the ostrich has moved and eggs
// may have been carried off or gone cold; announcing it again would describe a previous round.
function sniffFresh(v) {
  const sn = v && v.sniff;
  if (!v || v.phase !== 'play' || !sn) return false;
  if (sn.round != null) return sn.round === v.round;
  return v.turn === 'blue' && !!(v.lastAction && v.lastAction.type === 'fly');
}
// What the vulture may be told out loud. "Found egg!" tracks the visible found mark (cleared when
// the egg leaves). Nearby / not-nearby is this sense only. Other roles get no sniff announcement.
function sniffAnnounce(v, role) {
  if (!v || v.phase !== 'play') return '';
  if ((role || v.role) !== 'red') return '';
  const sn = v.sniff;
  if (!sn || !v.vulture) return '';
  if (v.marks && v.marks[key(v.vulture)] === 'spotted' && key(sn.p) === key(v.vulture)) return 'Found egg!';
  if (!sniffFresh(v)) return '';
  return sn.yes ? 'Egg nearby!' : 'No egg nearby';
}
// Dashed egg outlines for the last landing. A throw clears `sniff` (so the announcement and the
// computer vulture stay as they were) and the board keeps this older copy until the next landing.
// It is never recomputed from where the eggs are now. A find draws the egg, not a neighborhood.
function outlineSniff(v) {
  if (!v || v.phase !== 'play') return null;
  const sn = v.sniff || v.sniffKeep || null;
  if (!sn || !sn.yes || !sn.p) return null;
  const vul = v.vulture;
  if (vul && vul[0] >= 0 && v.marks && v.marks[key(vul)] === 'spotted' && key(sn.p) === key(vul)) return null;
  return sn;
}

const API = { slideN, CONFIG, HUNTER_GOAL, hunterUpAt, scrambleTo, relocateCaught, DIRS8, resolveThrow, wrecked, nearLeaf, myTurn, slide, awayFrom, wrapDist, wrapDelta, wrapPath, pointsBack, scatterKick, scatterRnd, stoneRnd, markTime, canKick, kickable, kickTargets, kickPlans, kickDone, ostrichKick, newGame, canPlaceEgg, placeEgg, placeOstrich, ostrichMoves, ostrichStep, ostrichSit, canSit, canCarry, mustLeave, onEgg, dropCarried, hideTurn,
  endRound, timeout, walkSquares, smellsEgg, flyTargets, throwTargets, vultureFly, vultureThrow, eggAt, aliveEggs, coldIn, sniffFresh, sniffAnnounce, outlineSniff, key, dist, visible, isFood, isRock, parkEliminated, ostrichGuards, foodRoute, isLastRound, breakEgg, eggSnap, undoBreak };
if (typeof module !== 'undefined') module.exports = API; else window.BO = API;
