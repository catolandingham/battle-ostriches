// Battle Ostriches core rules. All tuning lives in CONFIG.
const CONFIG = {
  cols: 9, rows: 7,
  eggs: 3,
  rounds: 35,          // ostrich wins if any egg survives this many rounds
  warmth: 14,           // each egg must be sat on at least once every N rounds
  maxSit: 3,           // after N consecutive rounds on the same egg, ostrich must step off (feed)
  vultureFly: 2,       // vulture flies up to N squares (king-move distance)
  throwRange: 1,       // vulture throws at own square or within N
  vultureStart: [4, 3],
  fakeNests: 3,        // decoy scrapes the ostrich may make per game
  scrapeDepth: 2,      // footprint depth a scrape (fake or sat-on nest) adds
  sitDepth: 1,         // footprint depth added each round the ostrich sits on a real egg
  smellRange: 2,       // after landing, vulture learns if any egg is within N squares (yes/no)
  maxCarry: 2,         // consecutive turns an egg may be carried before it must be set down
  foodMin: 2, foodMax: 3, // food spawns this many squares (king distance) from the ostrich
  stones: 3,           // stones the vulture holds (and refills to)
  rocks: [[2, 1], [6, 1], [2, 5], [6, 5]], // symmetric rock squares; landing refills stones
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const key = (p) => p[0] + ',' + p[1];
const inB = (p, c = CONFIG) => p[0] >= 0 && p[1] >= 0 && p[0] < c.cols && p[1] < c.rows;

function newGame(cfg = CONFIG) {
  return { cfg, phase: 'setupEggs', round: 1, turn: 'blue', eggs: [], ostrich: null,
    carrying: null, sitEgg: null, sitCount: 0, vulture: cfg.vultureStart.slice(),
    prints: {}, marks: {}, fakes: [], smells: {}, thrown: {}, vtracks: {}, log: [], winner: null,
    carryTurns: 0, food: null, hungry: false, stones: cfg.stones };
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
  if (carryMaxed(g) && canSetDown(g)) return []; // must set down here
  const res = moves1(g, carry, true); return res.length || !carryMaxed(g) ? res : moves1(g, carry, false);
}
function moves1(g, carry, strict) {
  const res = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (!dx && !dy) continue;
    const p = [g.ostrich[0] + dx, g.ostrich[1] + dy];
    if (!inB(p, g.cfg)) continue;
    if ((carry || g.carrying !== null) && eggAt(g, p)) continue; // can carry only one egg
    if (strict && carryMaxed(g) && !stoneFree(g, p)) continue; // forced to set down on arrival
    res.push(p);
  }
  return res;
}
function canPickUp(g) { // standing on a placed egg, not carrying
  return g.phase === 'play' && g.turn === 'blue' && g.carrying === null && g.sitEgg !== null;
}
function stoneFree(g, p) { return !g.thrown[key(p)]; }
function isRock(g, p) { return g.cfg.rocks.some(r => key(r) === key(p)); }
// At the carry limit the ostrich must set down now; if its square is stoned it takes one step and sets down there automatically.
function carryMaxed(g) { return g.carrying !== null && g.carryTurns >= g.cfg.maxCarry; }
function canSetDown(g) { return g.phase === 'play' && g.turn === 'blue' && g.carrying !== null && !eggAt(g, g.ostrich) && stoneFree(g, g.ostrich); }
function ostrichStep(g, p, carry = false) {
  if (carry && !canPickUp(g)) return false;
  if (!ostrichMoves(g, carry).some(q => key(q) === key(p))) return false;
  const forced = carryMaxed(g);
  if (carry) { const e = g.eggs[g.sitEgg]; e.pos = null; g.carrying = e.id; g.carryTurns = 0; }
  g.ostrich = p.slice();
  g.prints[key(p)] = (g.prints[key(p)] || 0) + 1;
  if (g.food && key(g.food) === key(p)) { g.food = null; g.hungry = false; g.lastAte = true; } else g.lastAte = false;
  g.sitRun = 0;
  if (forced) { const e = g.eggs[g.carrying]; if (!stoneFree(g, p)) { e.alive = false; g.carrying = null; g.carryTurns = 0; g.sitEgg = null; g.sitCount = 0; endOstrich(g); return true; } e.pos = p.slice(); g.carrying = null; g.carryTurns = 0; g.sitEgg = e.id; g.sitCount = 0; endOstrich(g); return true; }
  if (g.carrying !== null) g.carryTurns++;
  const e = g.carrying === null ? eggAt(g, p) : null;
  if (e) { if (g.sitEgg !== e.id) g.sitCount = 0; g.sitEgg = e.id; } else { g.sitEgg = null; g.sitCount = 0; }
  endOstrich(g); return true;
}
function ostrichSetDown(g) {
  if (!canSetDown(g)) return false;
  const e = g.eggs[g.carrying]; e.pos = g.ostrich.slice(); g.carrying = null; g.carryTurns = 0; g.sitRun = 0;
  g.sitEgg = e.id; g.sitCount = 0; endOstrich(g); return true;
}
function canSit(g) { return g.phase === 'play' && g.turn === 'blue' && g.carrying === null && g.sitEgg !== null && g.sitCount < g.cfg.maxSit && !g.hungry; }
function ostrichSit(g) { if (!canSit(g)) return false; addPrint(g, g.ostrich, g.cfg.sitDepth); g.sitRun = (g.sitRun || 0) + 1; endOstrich(g);
  if (g.phase === 'play' && (g.sitRun >= g.cfg.maxSit || g.sitCount >= g.cfg.maxSit)) { g.sitRun = 0; g.food = spawnFood(g); g.hungry = !!g.food; } return true; }
// Food: empty, unstoned, not a rock, foodMin..foodMax away, and the round trip (2*d) must fit the coldest egg's remaining warmth.
function spawnFood(g) {
  const o = g.ostrich, minWarm = Math.min(...aliveEggs(g).map(e => coldIn(g, e)));
  const ok = (p, lo, hi) => { const d = dist(p, o); return d >= lo && d <= hi && !eggAt(g, p) && !fakeAt(g, p) && stoneFree(g, p) && !isRock(g, p) && key(p) !== key(g.vulture); };
  const all = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) all.push([x, y]);
  for (let hi = g.cfg.foodMax; hi >= 1; hi--) {
    const lo = Math.min(g.cfg.foodMin, hi);
    const c = all.filter(p => ok(p, lo, hi) && (2 * dist(p, o) < minWarm || hi === 1));
    if (c.length) return c[Math.floor(Math.random() * c.length)];
  }
  return null; // nowhere legal: no hunger this time
}
function addPrint(g, p, n) { g.prints[key(p)] = (g.prints[key(p)] || 0) + n; }
function fakeAt(g, p) { return g.fakes.some(f => key(f) === key(p)); }
function canScrape(g) { return g.phase === 'play' && g.turn === 'blue' && g.fakes.length < g.cfg.fakeNests && !eggAt(g, g.ostrich) && !fakeAt(g, g.ostrich) && g.carrying === null; }
function ostrichScrape(g) { if (!canScrape(g)) return false; g.fakes.push(g.ostrich.slice()); addPrint(g, g.ostrich, g.cfg.scrapeDepth); endOstrich(g); return true; }
function smellsEgg(g, p) { return aliveEggs(g).some(e => { const q = e.pos || (g.carrying === e.id ? g.ostrich : null); return q && dist(q, p) <= g.cfg.smellRange; }); }
function mustLeave(g) { return g.sitEgg !== null && g.sitCount >= g.cfg.maxSit; }
function endOstrich(g) {
  if (g.sitEgg !== null) { g.sitCount++; g.eggs[g.sitEgg].lastWarm = g.round; }
  endRound(g);
}
// Feeding rule: after maxSit consecutive sits the ostrich gets hungry: food spawns and it can't sit until it steps on the food.
function canCarryNow(g) { return canPickUp(g) && !mustLeave(g); }
function canThrow(g) { return g.phase === 'play' && g.turn === 'red' && g.stones > 0; }

// --- vulture ---
function flyTargets(g) {
  if (g.phase !== 'play' || g.turn !== 'red') return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) {
    const d = dist([x, y], g.vulture); if (d >= 1 && d <= g.cfg.vultureFly) r.push([x, y]); }
  return r;
}
function throwTargets(g) {
  if (!canThrow(g)) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++)
    if (dist([x, y], g.vulture) <= g.cfg.throwRange) r.push([x, y]);
  return r;
}
function vultureFly(g, p) {
  if (!flyTargets(g).some(q => key(q) === key(p))) return false;
  g.vulture = p.slice(); g.lastAction = { type: 'fly' };
  g.vtracks[key(p)] = (g.vtracks[key(p)] || 0) + 1;
  if (isRock(g, p) && g.stones < g.cfg.stones) { g.stones = g.cfg.stones; g.lastAction.refill = true; }
  // Landing on an unguarded, uncarried egg spots it. The mark stays even if the egg later moves (stale).
  const e = eggAt(g, p);
  if (e && key(p) !== key(g.ostrich)) { g.marks[key(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  else if (!e && fakeAt(g, p)) { g.marks[key(p)] = 'fake'; g.lastAction.fake = p.slice(); }
  else if (!e && g.marks[key(p)] === 'spotted') delete g.marks[key(p)]; // the egg it saw is gone: just vanishes
  const sm = smellsEgg(g, p); g.smells[key(p)] = sm; g.lastAction.smell = sm; g.turn = 'blue'; return true;
}
function vultureThrow(g, p) {
  if (!throwTargets(g).some(q => key(q) === key(p))) return false;
  const e = eggAt(g, p); let result;
  const guarded = key(p) === key(g.ostrich);
  g.stones--;
  if (guarded && g.carrying !== null) { const c = g.eggs[g.carrying]; c.alive = false; g.carrying = null; g.carryTurns = 0; result = 'hit'; } // carried egg is exposed
  else if (guarded && e) result = 'feather';
  else if (e) { e.alive = false; result = 'hit'; if (g.sitEgg === e.id) { g.sitEgg = null; g.sitCount = 0; } }
  else if (fakeAt(g, p)) result = 'fake';
  else result = 'miss';
  g.thrown[key(p)] = (g.thrown[key(p)] || 0) + 1;
  g.marks[key(p)] = result; g.lastAction = { type: 'throw', p: p.slice(), result };
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; } else g.turn = 'blue';
  return result;
}
function endRound(g) {
  // warmth check
  g.lastCold = [];
  for (const e of aliveEggs(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id);
    if (g.carrying === e.id) { g.carrying = null; g.carryTurns = 0; }
    if (g.sitEgg === e.id) { g.sitEgg = null; g.sitCount = 0; }
  }
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; return; }
  if (g.round >= g.cfg.rounds) { g.winner = 'blue'; g.phase = 'over'; return; }
  g.round++; g.turn = 'red';
}
function coldIn(g, e) { return g.cfg.warmth - (g.round - e.lastWarm); } // rounds left before going cold

const API = { CONFIG, newGame, placeEgg, placeOstrich, ostrichMoves, ostrichStep, ostrichSetDown, canPickUp, canSit, ostrichSit, canScrape, canThrow, isRock, carryMaxed, spawnFood, ostrichScrape, fakeAt, smellsEgg, stoneFree,
  canCarryNow, canSetDown, mustLeave, flyTargets, throwTargets, vultureFly, vultureThrow, eggAt, aliveEggs, coldIn, key, dist };
if (typeof module !== 'undefined') module.exports = API; else window.BO = API;
