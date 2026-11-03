// Battle Ostriches core rules. All tuning lives in CONFIG.
const CONFIG = {
  cols: 9, rows: 7,
  eggs: 3,
  rounds: 40,          // ostrich wins if any egg survives this many rounds
  warmth: 6,           // each egg must be sat on at least once every N rounds
  maxSit: 3,           // after N consecutive rounds on the same egg, ostrich must step off (feed)
  vultureFly: 2,       // vulture flies up to N squares (king-move distance)
  throwRange: 1,       // vulture throws at own square or within N
  vultureStart: [4, 3],
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const key = (p) => p[0] + ',' + p[1];
const inB = (p, c = CONFIG) => p[0] >= 0 && p[1] >= 0 && p[0] < c.cols && p[1] < c.rows;

function newGame(cfg = CONFIG) {
  return { cfg, phase: 'setupEggs', round: 1, turn: 'blue', eggs: [], ostrich: null,
    carrying: null, sitEgg: null, sitCount: 0, vulture: cfg.vultureStart.slice(),
    prints: {}, marks: {}, log: [], winner: null };
}
function eggAt(g, p) { return g.eggs.find(e => e.alive && e.pos && key(e.pos) === key(p)); }
function aliveEggs(g) { return g.eggs.filter(e => e.alive); }

// --- setup ---
function placeEgg(g, p) {
  if (g.phase !== 'setupEggs' || !inB(p, g.cfg) || eggAt(g, p) || key(p) === key(g.vulture)) return false;
  g.eggs.push({ id: g.eggs.length, pos: p.slice(), alive: true, lastWarm: 0 });
  if (g.eggs.length === g.cfg.eggs) g.phase = 'setupOstrich';
  return true;
}
function placeOstrich(g, p) {
  if (g.phase !== 'setupOstrich' || !inB(p, g.cfg)) return false;
  g.ostrich = p.slice(); g.prints[key(p)] = 1;
  const e = eggAt(g, p); if (e) { g.sitEgg = e.id; g.sitCount = 0; }
  g.phase = 'play'; g.turn = 'red'; // vulture opens round 1 (ostrich already placed)
  return true;
}

// --- ostrich ---
function ostrichMoves(g, carry = false) {
  if (g.phase !== 'play' || g.turn !== 'blue') return [];
  const res = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (!dx && !dy) continue;
    const p = [g.ostrich[0] + dx, g.ostrich[1] + dy];
    if (!inB(p, g.cfg)) continue;
    if ((carry || g.carrying !== null) && eggAt(g, p)) continue; // can carry only one egg
    res.push(p);
  }
  return res;
}
function canPickUp(g) { // standing on a placed egg, not carrying
  return g.phase === 'play' && g.turn === 'blue' && g.carrying === null && g.sitEgg !== null;
}
function canSetDown(g) { return g.phase === 'play' && g.turn === 'blue' && g.carrying !== null && !eggAt(g, g.ostrich); }
function ostrichStep(g, p, carry = false) {
  if (carry && !canPickUp(g)) return false;
  if (!ostrichMoves(g, carry).some(q => key(q) === key(p))) return false;
  if (carry) { const e = g.eggs[g.sitEgg]; e.pos = null; g.carrying = e.id; }
  g.ostrich = p.slice();
  g.prints[key(p)] = (g.prints[key(p)] || 0) + 1;
  const e = g.carrying === null ? eggAt(g, p) : null;
  if (e) { if (g.sitEgg !== e.id) g.sitCount = 0; g.sitEgg = e.id; } else { g.sitEgg = null; g.sitCount = 0; }
  endOstrich(g); return true;
}
function ostrichSetDown(g) {
  if (!canSetDown(g)) return false;
  const e = g.eggs[g.carrying]; e.pos = g.ostrich.slice(); g.carrying = null;
  g.sitEgg = e.id; g.sitCount = 0; endOstrich(g); return true;
}
function canSit(g) { return g.phase === 'play' && g.turn === 'blue' && g.carrying === null && g.sitEgg !== null && g.sitCount < g.cfg.maxSit; }
function ostrichSit(g) { if (!canSit(g)) return false; endOstrich(g); return true; }
function mustLeave(g) { return g.sitEgg !== null && g.sitCount >= g.cfg.maxSit; }
function endOstrich(g) {
  if (g.sitEgg !== null) { g.sitCount++; g.eggs[g.sitEgg].lastWarm = g.round; }
  endRound(g);
}
// The ostrich must step every turn (or set down); if sitting the max, it can't stay — stepping is always required anyway.
// Feeding rule: after maxSit consecutive rounds sitting on an egg, the ostrich may not carry it away either.
function canCarryNow(g) { return canPickUp(g) && !mustLeave(g); }

// --- vulture ---
function flyTargets(g) {
  if (g.phase !== 'play' || g.turn !== 'red') return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) {
    const d = dist([x, y], g.vulture); if (d >= 1 && d <= g.cfg.vultureFly) r.push([x, y]); }
  return r;
}
function throwTargets(g) {
  if (g.phase !== 'play' || g.turn !== 'red') return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++)
    if (dist([x, y], g.vulture) <= g.cfg.throwRange) r.push([x, y]);
  return r;
}
function vultureFly(g, p) {
  if (!flyTargets(g).some(q => key(q) === key(p))) return false;
  g.vulture = p.slice(); g.lastAction = { type: 'fly' };
  // Landing on an unguarded, uncarried egg spots it. The mark stays even if the egg later moves (stale).
  const e = eggAt(g, p);
  if (e && key(p) !== key(g.ostrich)) { g.marks[key(p)] = 'spotted'; g.lastAction.spotted = p.slice(); } g.turn = 'blue'; return true;
}
function vultureThrow(g, p) {
  if (!throwTargets(g).some(q => key(q) === key(p))) return false;
  const e = eggAt(g, p); let result;
  const guarded = key(p) === key(g.ostrich);
  if (guarded && (e || g.carrying !== null)) result = 'feather';
  else if (e) { e.alive = false; result = 'hit'; if (g.sitEgg === e.id) { g.sitEgg = null; g.sitCount = 0; } }
  else result = 'miss';
  g.marks[key(p)] = result; g.lastAction = { type: 'throw', p: p.slice(), result };
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; } else g.turn = 'blue';
  return result;
}
function endRound(g) {
  // warmth check
  g.lastCold = [];
  for (const e of aliveEggs(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id);
    if (g.carrying === e.id) g.carrying = null;
    if (g.sitEgg === e.id) { g.sitEgg = null; g.sitCount = 0; }
  }
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; return; }
  if (g.round >= g.cfg.rounds) { g.winner = 'blue'; g.phase = 'over'; return; }
  g.round++; g.turn = 'red';
}
function coldIn(g, e) { return g.cfg.warmth - (g.round - e.lastWarm); } // rounds left before going cold

const API = { CONFIG, newGame, placeEgg, placeOstrich, ostrichMoves, ostrichStep, ostrichSetDown, canPickUp, canSit, ostrichSit,
  canCarryNow, canSetDown, mustLeave, flyTargets, throwTargets, vultureFly, vultureThrow, eggAt, aliveEggs, coldIn, key, dist };
if (typeof module !== 'undefined') module.exports = API; else window.BO = API;
