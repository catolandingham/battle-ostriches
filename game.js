// Battle Ostriches core rules ("Balanced" ruleset). All tuning lives in CONFIG.
const CONFIG = {
  cols: 9, rows: 7,
  eggs: 3,
  rounds: 30,          // ostrich wins if any egg survives this many rounds
  warmth: 20,          // an egg goes cold unless the ostrich is on it (or carrying it) at least once every N rounds
  maxSit: 3,           // max consecutive Sit turns; then the ostrich must step off for at least one turn
  vultureFly: 2,       // vulture flies up to N squares (king-move distance)
  throwRange: 1,       // vulture throws at its own square or within N (stones are unlimited)
  vultureStart: [4, 3],
  sitDepth: 1,         // footprint depth added each Sit
  smellRange: 2,       // on landing, the vulture learns if any egg is within N squares (yes/no)
};
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const key = (p) => p[0] + ',' + p[1];
const inB = (p, c = CONFIG) => p[0] >= 0 && p[1] >= 0 && p[0] < c.cols && p[1] < c.rows;

function newGame(cfg = CONFIG) {
  return { cfg, phase: 'setupEggs', round: 1, turn: 'blue', eggs: [], ostrich: null,
    carrying: null, sitRun: 0, vulture: cfg.vultureStart.slice(),
    prints: {}, marks: {}, smells: {}, vtracks: {}, winner: null, lastAction: null, lastCold: [] };
}
function eggAt(g, p) { return g.eggs.find(e => e.alive && e.pos && key(e.pos) === key(p)); }
function aliveEggs(g) { return g.eggs.filter(e => e.alive); }
const myTurn = (g, r) => g.phase === 'play' && g.turn === r;

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
    if (!inB(p, g.cfg)) continue;
    if (carry && eggAt(g, p)) continue; // can't carry onto another egg
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
    if (g.marks[key(g.ostrich)] === 'spotted') delete g.marks[key(g.ostrich)]; } // the egg moved: spotted mark clears
  const from = g.ostrich; g.ostrich = p.slice(); g.sitRun = 0;
  g.prints[key(p)] = (g.prints[key(p)] || 0) + 1;
  (g.printT = g.printT || {})[key(p)] = g.round; (g.printDir = g.printDir || {})[key(p)] = [p[0] - from[0], p[1] - from[1]];
  g.lastAction = { type: carry ? 'carry' : 'step' }; g.lastOAct = 'move';
  endOstrich(g); return true;
}
function ostrichSit(g) {
  if (!canSit(g)) return false;
  g.prints[key(g.ostrich)] = (g.prints[key(g.ostrich)] || 0) + g.cfg.sitDepth; (g.printT = g.printT || {})[key(g.ostrich)] = g.round;
  g.sitRun++; g.lastAction = { type: 'sit' }; g.lastOAct = 'stay'; endOstrich(g); return true;
}
function smellsEgg(g, p) { return aliveEggs(g).some(e => { const q = e.pos || (g.carrying === e.id ? g.ostrich : null); return q && dist(q, p) <= g.cfg.smellRange; }); }
function endOstrich(g) {
  const e = g.carrying !== null ? g.eggs[g.carrying] : eggAt(g, g.ostrich);
  if (e) e.lastWarm = g.round;
  endRound(g);
}

// --- vulture ---
function flyTargets(g) {
  if (!myTurn(g, 'red')) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) {
    const d = dist([x, y], g.vulture); if (d >= 1 && d <= g.cfg.vultureFly) r.push([x, y]); }
  return r;
}
function throwTargets(g) {
  if (!myTurn(g, 'red')) return [];
  const r = []; for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++)
    if (dist([x, y], g.vulture) <= g.cfg.throwRange) r.push([x, y]);
  return r;
}
function vultureFly(g, p) {
  if (!flyTargets(g).some(q => key(q) === key(p))) return false;
  const from = g.vulture.slice();
  g.vulture = p.slice(); g.lastAction = { type: 'fly', from };
  g.vtracks[key(p)] = (g.vtracks[key(p)] || 0) + 1;
  const e = eggAt(g, p);
  if (e && key(p) !== key(g.ostrich)) { g.marks[key(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  const sm = smellsEgg(g, p); g.smells[key(p)] = sm; g.smellN = (g.smellN || 0) + 1; (g.smellT = g.smellT || {})[key(p)] = g.smellN; g.lastAction.smell = sm;
  g.turn = 'blue'; dropCarried(g); return true;
}
function vultureThrow(g, p) {
  if (!throwTargets(g).some(q => key(q) === key(p))) return false;
  const e = eggAt(g, p), guarded = g.ostrich && key(p) === key(g.ostrich); let result;
  if (guarded && g.carrying !== null) { g.eggs[g.carrying].alive = false; g.carrying = null; result = 'hit'; } // a carried egg is exposed
  else if (guarded && e) result = 'feather';
  else if (e) { e.alive = false; result = 'hit'; }
  else result = 'miss';
  if (g.marks[key(p)] !== 'hit') g.marks[key(p)] = result;
  g.lastAction = { type: 'throw', from: g.vulture.slice(), p: p.slice(), result }; g.lastThrow = p.slice();
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; } else { g.turn = 'blue'; dropCarried(g); }
  return result;
}
function endRound(g) {
  g.lastCold = [];
  for (const e of aliveEggs(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id);
    if (g.carrying === e.id) g.carrying = null;
  }
  if (!aliveEggs(g).length) { g.winner = 'red'; g.phase = 'over'; return; }
  if (g.round >= g.cfg.rounds) { g.winner = 'blue'; g.phase = 'over'; return; }
  g.round++; g.turn = 'red';
}
// Noise reduction: what either side's view shows. Footprints: last 3 rounds. Smells / vulture landings: last 3 landings.
// Stone marks: only the most recent throw. Spotted marks stay until the egg moves.
function visible(g) {
  const pick = (o, ok) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => ok(k)));
  const pt = g.printT || {}, st = g.smellT || {}, top = Object.values(st).sort((a, b) => b - a).slice(0, 3), minS = top.length ? top[top.length - 1] : Infinity;
  const pOk = k => (pt[k] || 0) >= g.round - 2, sOk = k => (st[k] || 0) >= minS, lt = g.lastThrow ? key(g.lastThrow) : null;
  return { prints: pick(g.prints, pOk), printT: pick(pt, pOk), printDir: pick(g.printDir, pOk), smells: pick(g.smells, sOk), smellT: pick(st, sOk),
    vtracks: pick(g.vtracks, sOk), marks: pick(g.marks, k => g.marks[k] === 'spotted' || k === lt) };
}
function coldIn(g, e) { return g.cfg.warmth - (g.round - e.lastWarm); } // rounds left before going cold

const API = { CONFIG, newGame, placeEgg, placeOstrich, ostrichMoves, ostrichStep, ostrichSit, canSit, canCarry, mustLeave, onEgg, dropCarried,
  smellsEgg, flyTargets, throwTargets, vultureFly, vultureThrow, eggAt, aliveEggs, coldIn, key, dist, visible };
if (typeof module !== 'undefined') module.exports = API; else window.BO = API;
