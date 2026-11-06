// Battle Ostriches core rules ("Open skies" ruleset). All tuning lives in CONFIG.
// Both birds always see each other. Eggs stay hidden from the vulture until found (landed on) or smashed.
const CONFIG = {
  cols: 9, rows: 7,
  eggs: 3,
  rounds: 30,          // ostrich wins if any egg survives this many rounds
  warmth: 24,          // an egg goes cold unless the ostrich is on it (or carrying it) at least once every N rounds
  maxSit: 3,           // max consecutive Sit turns; then the ostrich must step off for at least one turn
  vultureFly: 2,       // vulture flies up to N squares (king-move distance)
  throwRange: 1,       // vulture throws at its own square or one next to it...
  vultureStart: [4, 3],
  smellRange: 1,       // ...and on landing learns if any egg is on its square or next to it (yes/no, this turn only)
  food: 13,            // the ostrich must step onto food at least once every N of its turns, or it starves
  stones: 1,           // stones the vulture can hold; refill by landing on a rock pile
  foods: [[0, 0], [8, 6]],   // fixed food spots (never run out)
  rocks: [[4, 0], [4, 6]],   // fixed rock piles (never run out)
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const key = (p) => p[0] + ',' + p[1];
const inB = (p, c = CONFIG) => p[0] >= 0 && p[1] >= 0 && p[0] < c.cols && p[1] < c.rows;
const isFood = (g, p) => g.cfg.foods.some(q => key(q) === key(p));
const isRock = (g, p) => g.cfg.rocks.some(q => key(q) === key(p));
const smashed = (g, p) => g.marks[key(p)] === 'hit';

function newGame(cfg = CONFIG) {
  return { cfg, phase: 'setupEggs', round: 1, turn: 'blue', eggs: [], ostrich: null,
    carrying: null, sitRun: 0, vulture: cfg.vultureStart.slice(), hungerLeft: cfg.food, stones: cfg.stones,
    marks: {}, sniff: null, winner: null, winBy: null, lastAction: null, lastCold: [] };
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
function ostrichMoves(g, carry = false) {
  if (!myTurn(g, 'blue')) return [];
  if (carry && !canCarry(g)) return [];
  const res = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    if (!dx && !dy) continue;
    const p = [g.ostrich[0] + dx, g.ostrich[1] + dy];
    if (!inB(p, g.cfg) || smashed(g, p)) continue;  // smashed squares are blocked
    if (carry && (eggAt(g, p) || isFood(g, p) || isRock(g, p) || g.marks[key(p)] === 'stone')) continue; // the ostrich won't carry an egg onto a stone-marked square (afraid) // can't carry onto another egg, food or rocks
    res.push(p);
  }
  return res;
}
function canSit(g) { return myTurn(g, 'blue') && onEgg(g) && g.sitRun < g.cfg.maxSit; }
function canCarry(g) { return myTurn(g, 'blue') && onEgg(g); }
function mustLeave(g) { return myTurn(g, 'blue') && onEgg(g) && g.sitRun >= g.cfg.maxSit; }
function ostrichStep(g, p, carry = false) {
  if (!ostrichMoves(g, carry).some(q => key(q) === key(p))) return false;
  if (carry) { const e = eggAt(g, g.ostrich); e.pos = null; g.carrying = e.id;
    if (g.marks[key(g.ostrich)] === 'spotted') delete g.marks[key(g.ostrich)]; } // the egg moved: found mark clears
  g.ostrich = p.slice(); g.sitRun = 0;
  g.lastAction = { type: carry ? 'carry' : 'step' };
  endOstrich(g); return true;
}
function ostrichSit(g) {
  if (!canSit(g)) return false;
  g.sitRun++; g.lastAction = { type: 'sit' }; endOstrich(g); return true;
}
function smellsEgg(g, p) { return aliveEggs(g).some(e => { const q = e.pos || (g.carrying === e.id ? g.ostrich : null); return q && dist(q, p) <= g.cfg.smellRange; }); }
function endOstrich(g) {
  const e = g.carrying !== null ? g.eggs[g.carrying] : eggAt(g, g.ostrich);
  if (e) e.lastWarm = g.round;
  if (isFood(g, g.ostrich)) { g.hungerLeft = g.cfg.food; g.lastAction.ate = true; }
  else if (--g.hungerLeft <= 0) { g.winner = 'red'; g.winBy = 'starved'; g.phase = 'over'; return; }
  endRound(g);
}

// --- vulture ---
function flyTargets(g) {
  if (!myTurn(g, 'red')) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) {
    const d = dist([x, y], g.vulture); if (d >= 1 && d <= g.cfg.vultureFly) r.push([x, y]); }
  return r;
}
// Needs a stone. Any square in range; a stone at the ostrich's own square just bounces off (wasted turn).
function throwTargets(g) {
  if (!myTurn(g, 'red') || g.stones < 1) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++)
    if (dist([x, y], g.vulture) <= g.cfg.throwRange && !smashed(g, [x, y]) && g.marks[key([x, y])] !== 'stone') r.push([x, y]);
  return r;
}
function vultureFly(g, p) {
  if (!flyTargets(g).some(q => key(q) === key(p))) return false;
  const from = g.vulture.slice();
  g.vulture = p.slice(); g.lastAction = { type: 'fly', from };
  const e = eggAt(g, p);
  if (e && !ostrichGuards(g, p)) { g.marks[key(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  if (isRock(g, p)) { g.lastAction.refill = g.stones < g.cfg.stones; g.stones = g.cfg.stones; }
  g.lastAction.smell = smellsEgg(g, p);
  g.sniff = { p: p.slice(), yes: g.lastAction.smell }; // shown until the vulture's next move
  g.turn = 'blue'; dropCarried(g); return true;
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
function vultureThrow(g, p) {
  if (!throwTargets(g).some(q => key(q) === key(p))) return false;
  g.stones--; g.sniff = null;
  const e = eggAt(g, p); let result;
  if (ostrichGuards(g, p)) result = 'bounce'; // a living ostrich protects the egg under it or in its beak
  else if (e) { e.alive = false; result = 'hit'; g.marks[key(p)] = 'hit'; } else { result = 'miss'; g.marks[key(p)] = 'stone'; } // a missed stone stays on the square for the rest of the game
  g.lastAction = { type: 'throw', from: g.vulture.slice(), p: p.slice(), result };
  if (result === 'bounce') g.lastAction.egg = !!(e || g.carrying !== null); // a bounce reveals whether the ostrich was guarding an egg (under it or in its beak) g.lastThrow = p.slice();
  if (!aliveEggs(g).length) { g.winner = 'red'; g.winBy = 'smashed'; g.phase = 'over'; } else { g.turn = 'blue'; dropCarried(g); }
  return result;
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

const API = { CONFIG, newGame, canPlaceEgg, placeEgg, placeOstrich, ostrichMoves, ostrichStep, ostrichSit, canSit, canCarry, mustLeave, onEgg, dropCarried,
  endRound, smellsEgg, flyTargets, throwTargets, vultureFly, vultureThrow, eggAt, aliveEggs, coldIn, key, dist, visible, isFood, isRock, parkEliminated, ostrichGuards };
if (typeof module !== 'undefined') module.exports = API; else window.BO = API;
