// 4-player (2v2) and 5-player (2v2 + hunter) modes. Two ostriches (o1, o2), each with its own 2-egg nest, against two
// vultures (v1, v2); in 5 players a hunter (hyena / badger) moves last. Turn order: V1, O1, V2, O2 (, hunter).
// Reuses the 2-player CONFIG and the 3-player hunter rules (sense, pounce, burrow, catches, knock-back).
const B = require('./game.js'), K = B.key, D = B.dist, S = require('./simple.js');
const TM = { eggs: 2, vStarts: [[4, 2], [4, 4]], sense: 2, see: 2, walk: 2, pounce: 1, knock: 3, clockMs: 10000, ko: { hyena: 2, badger: 2 }, hStarts: [[0, 3], [8, 3]] };
const OFF = [-99, -99], OS = ['o1', 'o2'], VS = ['v1', 'v2'], sgn = Math.sign;
const isO = s => s === 'o1' || s === 'o2', isV = s => s === 'v1' || s === 'v2';
const mate = s => ({ o1: 'o2', o2: 'o1', v1: 'v2', v2: 'v1' })[s];
function newTeam(n, kind, cfg = B.CONFIG, hstart) {
  const g = { team: true, n: n === 5 ? 5 : 4, cfg: { ...cfg, eggs: TM.eggs }, phase: 'setup', round: 1, turn: null, eggs: [], marks: {}, winner: null, winBy: null,
    order: n === 5 ? ['v1', 'o1', 'v2', 'o2', 'hunter'] : ['v1', 'o1', 'v2', 'o2'], b: {}, sniffs: {}, sniffKeeps: {}, lastAction: null, lastCold: [], seq: 0, kickSeq: 0, lastKick: null, stoneSeq: 0, lastStone: null, lastCatch: null, lost: null,
    h: n === 5 ? { kind: kind === 'badger' || kind === 'hyena' ? kind : null, p: (hstart || TM.hStarts[Math.random() * 2 | 0]).slice(), burrowed: false, dig: 0,
      sense: null, senseSeq: 0, kos: { o: 0, v: 0 }, last: null } : null };
  VS.forEach((s, i) => g.b[s] = { pos: TM.vStarts[i].slice(), stones: cfg.stones, out: false, why: null, catches: 0, skip: 0 });
  OS.forEach((s, i) => g.b[s] = { pos: null, nest: i, hunger: cfg.food, sitRun: 0, carrying: null, out: false, why: null, catches: 0, skip: 0 });
  return g;
}
const inB = (g, p) => p && p[0] >= 0 && p[1] >= 0 && p[0] < g.cfg.cols && p[1] < g.cfg.rows;
const alive = g => g.eggs.filter(e => e.alive);
const eggAt = (g, p) => g.eggs.find(e => e.alive && e.pos && K(e.pos) === K(p));
const hunterUp = (g, p) => !!(g.h && K(g.h.p) === K(p) && !g.h.burrowed);
const live = (g, s) => g.b[s] && !g.b[s].out && g.b[s].pos && g.b[s].pos[0] >= 0;
const birdsIn = g => OS.concat(VS).filter(s => live(g, s));
const myTurn = (g, s) => g.phase === 'play' && g.turn === s;
const eggPos = (g, e) => e.pos || OS.map(s => g.b[s]).find(b => b.carrying === e.id)?.pos || null;
// --- setup: each ostrich hides its own 2 eggs, then places itself ---
const nestOf = (g, s) => g.eggs.filter(e => e.nest === g.b[s].nest);
function canPlaceEgg(g, s, p) {
  return g.phase === 'setup' && isO(s) && nestOf(g, s).length < TM.eggs && inB(g, p) && !eggAt(g, p) && !TM.vStarts.some(v => K(v) === K(p))
    && !B.isRock(g, p) && !g.cfg.foods.some(f => D(f, p) <= 1) && !(g.h && K(g.h.p) === K(p));
}
function place(g, s, p) {
  if (!isO(s) || g.phase !== 'setup') return false;
  const b = g.b[s];
  if (nestOf(g, s).length < TM.eggs) { if (!canPlaceEgg(g, s, p)) return false; g.eggs.push({ id: g.eggs.length, nest: b.nest, pos: p.slice(), alive: true, lastWarm: 0 }); return true; }
  if (b.pos || !inB(g, p) || (g.h && K(g.h.p) === K(p)) || OS.some(o => g.b[o].pos && K(g.b[o].pos) === K(p)) || TM.vStarts.some(v => K(v) === K(p))) return false;
  b.pos = p.slice();
  if (OS.every(o => g.b[o].pos)) { g.phase = 'play'; g.turn = 'v1'; }
  return true;
}
const setupStep = (g, s) => g.phase !== 'setup' || !isO(s) ? null : nestOf(g, s).length < TM.eggs ? 'eggs' : !g.b[s].pos ? 'ostrich' : 'done';
// --- ostriches ---
const onEgg = (g, s) => live(g, s) && g.b[s].carrying === null && !!eggAt(g, g.b[s].pos);
const canSit = (g, s) => myTurn(g, s) && onEgg(g, s); // no limit on sitting
const canCarry = (g, s) => !g.simple && myTurn(g, s) && onEgg(g, s);
const mustLeave = () => false;
function ostrichMoves(g, s, carry = false) {
  if (!myTurn(g, s) || !isO(s) || (carry && !canCarry(g, s))) return [];
  // wrecked squares and any animal the ostrich can see are not landing squares (it may pass over them); a buried badger is hidden, so it can be walked onto
  const res = B.walkSquares(g.cfg, g.marks, g.b[s].pos, carry ? g.cfg.carryWalk : g.cfg.ostrichWalk).filter(p => g.simple ? !S.blocks(g, s, p) : !birdsIn(g).some(o => o !== s && K(g.b[o].pos) === K(p)) && !hunterUp(g, p));
  return carry ? res.filter(p => !(eggAt(g, p) || B.isRock(g, p) || B.nearLeaf(g, p))) : res; // an egg is never put on or next to a leaf
}
function feed(g, s) { // after an ostrich's move or stay: food resets hunger, else it gets hungrier and may starve (out; its partner plays on)
  const b = g.b[s];
  if (B.isFood(g, b.pos)) { b.hunger = g.cfg.food; if (g.lastAction) g.lastAction.ate = true; return; }
  if (--b.hunger <= 0) knockout(g, s, 'starved');
}
function ostrichAct(g, s, a, p) {
  const b = g.b[s]; if (!myTurn(g, s) || !isO(s)) return false;
  if (a === 'kick') return ostrichKick(g, s, p);
  const from = b.pos.slice();
  if (a === 'sit') { if (!canSit(g, s)) return false; b.sitRun++; b.sitting = true; }
  else { const carry = a === 'carry'; if (g.simple && carry) return false; if (!ostrichMoves(g, s, carry).some(q => K(q) === K(p))) return false;
    if (g.simple && S.landKind(g, s, p) === 'stay') {
      const o = S.occupant(g, p, s); if (o) S.reveal(g, o.seat);
      g.lastAction = { seat: s, type: 'step', stayed: true };
      const egg = eggAt(g, b.pos); if (egg) egg.lastWarm = g.round;
      feed(g, s); next(g); return true;
    }
    if (carry) { const e = eggAt(g, b.pos); e.pos = null; b.carrying = e.id; if (g.marks[K(b.pos)] === 'spotted') delete g.marks[K(b.pos)]; }
    b.pos = p.slice(); b.sitRun = 0; b.sitting = false; }
  g.lastAction = { seat: s, type: a === 'sit' ? 'sit' : a === 'carry' ? 'carry' : 'step' };
  const e = b.carrying !== null ? null : eggAt(g, b.pos); if (e) e.lastWarm = g.round; // either ostrich may warm any egg; a carried egg is not warmed
  feed(g, s);
  if (!b.out && a !== 'sit' && g.h && K(b.pos) === K(g.h.p)) { catchBird(g, s, () => { b.pos = from.slice(); }); g.lastCatch.walked = true; } // the ostrich stepped onto the buried badger
  next(g); return true;
}
// --- Kick (rules in game.js): an ostrich may kick a vulture or the hunter next to it, never its teammate and never a burrowed badger.
function canKick(g, s) { return myTurn(g, s) && isO(s) && g.b[s].carrying === null && live(g, s); }
function kickable(g, s) {
  const r = [];
  if (!isO(s) || !live(g, s)) return r;
  const at = g.b[s].pos;
  if (g.simple) {
    for (const v of VS) if (live(g, v) && D(g.b[v].pos, at) === 1 && S.sees(g, s, v)) r.push(g.b[v].pos.slice());
    if (g.h && D(g.h.p, at) === 1 && S.sees(g, s, 'hunter')) r.push(g.h.p.slice());
    return r;
  }
  for (const v of VS) if (live(g, v) && D(g.b[v].pos, at) === 1) r.push(g.b[v].pos.slice());
  if (g.h && !g.h.burrowed && D(g.h.p, at) === 1) r.push(g.h.p.slice());
  return r;
}
const kickTargets = (g, s) => canKick(g, s) ? kickable(g, s) : [];
function hunterScatterT(g, from, n, ostrich) {
  const open = q => !B.wrecked(g, q) && !birdsIn(g).some(o => K(g.b[o].pos) === K(q));
  return B.scatterKick(g.cfg, from, ostrich, n, open, hunterReach(g), B.scatterRnd(g, from, ostrich));
}
function kickPlans(g, s) {
  if (!canKick(g, s)) return [];
  const at0 = g.b[s].pos;
  return kickable(g, s).map(at => {
    const hunter = !!(g.h && K(g.h.p) === K(at)), v = VS.find(x => live(g, x) && K(g.b[x].pos) === K(at));
    const n = !g.simple && hunter && g.h.kind === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
    const who = hunter ? (g.h.kind || 'hyena') : 'vulture';
    if (hunter && !g.simple) { const sc = hunterScatterT(g, at, n, at0); return { at: at.slice(), to: sc.to.slice(), points: sc.points, who, key: who }; }
    const blocked = m => (g.h && K(g.h.p) === K(m) && !g.h.burrowed && !hunter) || birdsIn(g).some(o => o !== v && K(g.b[o].pos) === K(m));
    const path = B.slideN(g.cfg, at, B.awayFrom(at0, at), n, blocked, g.marks, !g.simple);
    return { at: at.slice(), to: path.to.slice(), points: path.points, who, key: hunter ? who : 'red' };
  });
}
function ostrichKick(g, s, p) {
  if (!kickTargets(g, s).some(q => K(q) === K(p))) return false;
  const b = g.b[s]; b.sitting = false; const from = p.slice(), hunter = !!(g.h && K(g.h.p) === K(from)), v = VS.find(x => live(g, x) && K(g.b[x].pos) === K(from));
  const n = !g.simple && hunter && g.h.kind === 'badger' ? g.cfg.kickPushBadger : g.cfg.kickPush;
  let to, moved, scatter = null;
  if (hunter && !g.simple) { scatter = hunterScatterT(g, from, n, b.pos); to = scatter.to; moved = scatter.moved; }
  else {
    // a pushed vulture wraps around the edge and stops before a wrecked square or any animal that is up
    const kr = B.slideN(g.cfg, from, B.awayFrom(b.pos, from), n, m => (g.h && K(g.h.p) === K(m) && !g.h.burrowed && !hunter) || birdsIn(g).some(o => o !== v && K(g.b[o].pos) === K(m)), g.marks, !g.simple);
    to = kr.to; moved = kr.moved;
  }
  if (hunter) g.h.p = to; else g.b[v].pos = to;
  const who = hunter ? (g.h.kind || 'hyena') : 'vulture';
  g.lastKick = { seq: ++g.kickSeq, who, by: s, seat: hunter ? 'hunter' : v, from, to: to.slice(), round: g.round, moved };
  if (scatter) Object.assign(g.lastKick, { scatter: true, fallback: scatter.fallback, reachGap: scatter.reachGap, points: scatter.points, wrap: scatter.wrap });
  g.lastAction = { seat: s, type: 'kick', who };
  const e = eggAt(g, b.pos); if (e) e.lastWarm = g.round; // an egg under the ostrich is warmed, as when it sits
  feed(g, s); next(g); return true;
}
function ostrichStay(g, s, why) { const b = g.b[s]; b.sitRun = 0; b.sitting = false; g.lastAction = { seat: s, type: 'stay', [why]: true }; feed(g, s); }
// --- vultures (they share what they sniff) ---
function dropAll(g) { for (const s of OS) { const b = g.b[s]; if (b.carrying === null) continue; const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = b.pos.slice(); } }
function flyTargets(g, s) {
  if (!myTurn(g, s) || !isV(s)) return [];
  const v = g.b[s].pos, m = g.b[mate(s)], r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], v);
    if (!(d >= 1 && d <= g.cfg.vultureFly && !B.wrecked(g, [x, y]))) continue;
    if (g.simple ? S.blocks(g, s, [x, y]) : hunterUp(g, [x, y]) || birdsIn(g).some(o => K(g.b[o].pos) === K([x, y]))) continue;
    r.push([x, y]); }
  return r;
}
function throwTargets(g, s) {
  if (!myTurn(g, s) || !isV(s) || g.b[s].stones < 1) return [];
  const v = g.b[s].pos, m = g.b[mate(s)], r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const k = x + ',' + y;
    if (D([x, y], v) <= g.cfg.throwRange && g.marks[k] !== 'hit' && g.marks[k] !== 'stone' && !(!m.out && K(m.pos) === K([x, y]))) r.push([x, y]); }
  return r;
}
const smells = (g, p) => alive(g).some(e => { const q = eggPos(g, e); return q && D(q, p) <= g.cfg.smellRange; });
function clearOut(g) { for (const s of OS.concat(VS)) { const b = g.b[s]; if (!b.out || !b.pos || b.pos[0] < 0) continue;
  if (isO(s) && b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e && e.alive) e.pos = b.pos.slice(); } b.pos = OFF.slice(); } }
function vultureFly(g, s, p) { clearOut(g);
  if (!flyTargets(g, s).some(q => K(q) === K(p))) return false;
  if (g.simple && S.landKind(g, s, p) === 'stay') {
    const o = S.occupant(g, p, s); if (o) S.reveal(g, o.seat);
    g.sniffs[s] = null; g.lastAction = { seat: s, type: 'fly', from: g.b[s].pos.slice(), stayed: true };
    next(g); return true;
  }
  const b = g.b[s], from = b.pos.slice(), snap = B.eggSnap(g, p); b.pos = p.slice();
  g.lastAction = { seat: s, type: 'fly', from };
  const e = eggAt(g, p), open = !!(e && !OS.some(o => live(g, o) && K(g.b[o].pos) === K(p)));
  // Simple rules still find the egg. The last-round break is the normal game only.
  if (!g.simple && open && B.isLastRound(g)) B.breakEgg(g, e, p, s, OS[e.nest] || null); // last round: break it (Brian, 2026-11-16). The nest ostrich owns the announcement.
  else if (open) { g.marks[K(p)] = 'spotted'; g.lastAction.spotted = p.slice(); }
  if (B.isRock(g, p)) { g.lastAction.refill = b.stones < g.cfg.stones; b.stones = g.cfg.stones; }
  if (g.simple) { g.lastAction.smell = false; g.sniffs[s] = null; g.sniffKeeps[s] = null; }
  else {
    g.lastAction.smell = smells(g, p); g.sniffs[s] = { p: p.slice(), yes: g.lastAction.smell, round: g.round };
    const foundHere = open && !g.lastAction.smashed;
    g.sniffKeeps[s] = (!foundHere && g.lastAction.smell) ? { p: p.slice(), yes: true, round: g.round } : null;
  }
  dropAll(g);
  if (open && g.lastAction.smashed && !alive(g).length) checkEnd(g); // every egg broken: the vultures have won, before a catch on this same landing
  if (g.phase !== 'over' && g.h && K(p) === K(g.h.p)) { catchBird(g, s, () => { b.pos = from.slice(); if (B.undoBreak(g, p, snap)) { g.lastAction.smell = smells(g, p); g.sniffs[s] = { p: p.slice(), yes: g.lastAction.smell, round: g.round }; g.sniffKeeps[s] = g.lastAction.smell ? { p: p.slice(), yes: true, round: g.round } : null; } }); g.lastCatch.walked = true; } // the vulture flew onto the buried badger
  if (g.phase !== 'over') next(g); return true;
}
// The stone resolver's view of this mode: either ostrich kicks it back, the hunter is pushed 2 away from the vulture and a buried badger comes up.
const stoneW = (g, s) => { const b = g.b[s]; return { thrower: () => b.pos.slice(), setThrower: q => { b.pos = q.slice(); },
  ostrichSeatAt: p => OS.find(o=>live(g,o)&&K(g.b[o].pos)===K(p)),
  ostrichAt: p => OS.some(o => live(g, o) && K(g.b[o].pos) === K(p)), eggAt: p => eggAt(g, p),
  pushAt: (p, dir, n) => { if (!g.h || K(g.h.p) !== K(p)) return []; const from = g.h.p.slice(), wasBur = g.h.burrowed; g.h.burrowed = false; g.h.dig = 0; if (wasBur) g.popout = { seq: g.popSeq = (g.popSeq || 0) + 1, round: g.round };
    g.h.p = B.slide(g.cfg, from, dir, n, m => birdsIn(g).some(o => K(g.b[o].pos) === K(m)), g.marks); return [{ kind: g.h.kind, from, to: g.h.p.slice() }]; },
  open: q => !B.wrecked(g, q) && !birdsIn(g).some(o => K(g.b[o].pos) === K(q)) && !hunterUp(g, q), ostrichPos: () => { const o = OS.find(x => live(g, x)); return o ? g.b[o].pos : null; } }; };
function vultureThrow(g, s, p) { clearOut(g);
  if (!throwTargets(g, s).some(q => K(q) === K(p))) return false;
  const b = g.b[s]; b.stones--; g.sniffs[s] = null;
  const from = b.pos.slice(), r = B.resolveThrow(g, stoneW(g, s), p);
  if (g.simple) S.noteThrow(g, r);
  g.lastAction = { seat: s, type: 'throw', from, p: p.slice(), result: r.result, line: r.line, kickedBack: r.kickedBack, hop: r.hop, used: r.used };
  if (r.result === 'bounce') g.lastAction.egg = !!(eggAt(g, p) || OS.some(o => live(g, o) && K(g.b[o].pos) === K(p) && g.b[o].carrying !== null));
  if (r.result === 'hit') g.lastSmash = {seq:g.smashSeq=(g.smashSeq||0)+1,by:s,owner:OS[(g.eggs.find(e=>e.id===r.smashed)||{}).nest]||null};
  if (r.line) g.lastStone = { seq: ++g.stoneSeq, text: r.line, by: s, targets: r.pushed.map(x => x.kind), kicker:r.kicker||null, trails: r.pushed.map(x=>({key:x.kind,from:x.from,to:x.to})), round: g.round };
  dropAll(g); next(g); return r.result;
}
// --- hunter (5 players) ---
const koAt = g => TM.ko[(g.h && g.h.kind) || 'hyena'];
const kos = g => g.h ? g.h.kos.o + g.h.kos.v : 0;
const senses = g => birdsIn(g).some(s => D(g.b[s].pos, g.h.p) <= TM.sense);
// ambush sight: a burrowed badger sees the exact square of any living bird next to it (1 square). Nobody else learns anything.
const ambushSight = g => !g.h || g.h.kind !== 'badger' || !g.h.burrowed ? [] : birdsIn(g).filter(s => D(g.b[s].pos, g.h.p) === 1).map(s => ({ seat: s, type: isO(s) ? 'o' : 'v', p: g.b[s].pos.slice() }));
const hunterSeenBy = (g, s) => g.simple ? !!(g.h && (isO(s) || isV(s)) && live(g, s) && S.sees(g, s, 'hunter')) : !!(g.h && (isO(s) || isV(s)) && live(g, s) && !g.h.burrowed && D(g.b[s].pos, g.h.p) <= TM.see);
const hunterRange = g => !g.h ? 0 : g.simple || !g.h.pounce ? TM.walk : TM.pounce;
const hunterReach = g => !g.h ? 0 : g.simple ? TM.walk : TM.walk + (g.h.kind === 'hyena' ? TM.pounce : 0); // the farthest it can reach on any turn
function hunterMoves(g) {
  if (!myTurn(g, 'hunter')) return [];
  const h = g.h.p, n = hunterRange(g), r = [];
  for (let x = 0; x < g.cfg.cols; x++) for (let y = 0; y < g.cfg.rows; y++) { const d = D([x, y], h); if (d >= 1 && d <= n && !B.wrecked(g, [x, y])) r.push([x, y]); }
  return r;
}
function startHunter(g) { const h = g.h; h.pounce = false; h.sense = senses(g); h.senseSeq++; }
function hunterMove(g, p) {
  if (!hunterMoves(g).some(q => K(q) === K(p))) return false;
  const h = g.h, from = h.p.slice(), wasP = h.pounce, wasBur = h.burrowed; h.p = p.slice(); h.burrowed = false; h.dig = 0; let caught = false;
  for (const s of birdsIn(g)) if (g.phase === 'play' && K(g.b[s].pos) === K(p)) { catchBird(g, s, () => { h.p = from.slice(); }); caught = true; }
  if (caught && wasBur && g.lastCatch) g.lastCatch.ambush = true; // the badger jumped out of its burrow onto the bird
  g.popout = !caught && wasBur ? { seq: g.popSeq = (g.popSeq || 0) + 1, round: g.round } : null; // popped out of the burrow without a catch (shown only to who can see the badger)
  h.last = { type: 'move', from, to: p.slice(), caught, pounce: wasP };
  if (g.phase === 'over') return true;
  if (!g.simple && !caught && !wasP && h.kind === 'hyena' && h.sense) { h.pounce = true; h.firstAt = from.slice(); h.sense = senses(g); h.senseSeq++; return true; } // Pounce
  h.pounce = false; next(g); return true;
}
function hunterStay(g, timedOut) { // timedOut: the shot clock ran out, so a badger that is not yet buried just loses its turn (Brian, 2026-11-15)
  if (!myTurn(g, 'hunter')) return false;
  g.popout = null; const h = g.h;
  if (!g.simple && !h.pounce && h.kind === 'badger' && !(timedOut && !h.burrowed)) { // one still turn always burrows, on any square
    if (!h.burrowed) { g.dug = { seq: g.digSeq = (g.digSeq || 0) + 1, round: g.round }; g.mound = { at: h.p.slice(), seenBy: birdsIn(g).filter(s => hunterSeenBy(g, s)) }; } // the birds that could see it dig see the spot
    h.dig = 2; h.burrowed = true; }
  h.last = { type: h.pounce ? 'skip' : 'stay' }; h.pounce = false; next(g); return true;
}
// --- catches, knock-outs, game end ---
function knockout(g, s, why) {
  const b = g.b[s]; b.out = true; b.why = why; b.skip = 0;
  if (b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = b.pos.slice(); }
  b.pos = OFF.slice();
  if (why === 'caught' && g.h) g.h.kos[isO(s) ? 'o' : 'v']++;
  checkEnd(g);
}
// A caught bird lands on a random open square exactly TM.knock (3) king-moves away. No missed turn. If it cannot move at all, whoever moved goes back (back()).
function catchBird(g, s, back) {
  if (g.simple) S.reveal(g, s);
  const b = g.b[s], at = b.pos.slice(); b.catches++;
  if (b.carrying != null) { const e = g.eggs[b.carrying]; b.carrying = null; if (e.alive) e.pos = at.slice(); } // a carried egg drops where it was caught
  if (b.catches >= koAt(g)) { g.lastCatch = { bird: s, at, to: null, ko: true, seq: ++g.seq, round: g.round }; knockout(g, s, 'caught'); return; }
  const q = B.relocateCaught(g.cfg, at, m => !B.wrecked(g, m) && !birdsIn(g).some(o => o !== s && K(g.b[o].pos) === K(m)) && !hunterUp(g, m) && !(g.h && K(g.h.p) === K(m)), TM.knock);
  b.sitting = false; if (q) b.pos = q; else if (back) back();
  if (g.h && g.h.burrowed && K(g.h.p) === K(at)) { g.h.burrowed = false; g.h.dig = 0; }
  g.lastCatch = { bird: s, at, to: b.pos.slice(), ko: false, seq: ++g.seq, round: g.round };
}
// Endings (rules 9): a side is out when all its birds are knocked out or it can no longer meet its goal; a side that meets its goal wins; the last side in wins; time with no goal met is a draw.
// HUNTER_GOAL ('all' | 'first', game.js): the hunter needs every bird, or (first) one ostrich and one vulture.
function end(g, w, by, why) { if (g.phase === 'over') return; g.phase = 'over'; g.winner = w; g.winBy = by; g.endWhy = why; }
function checkEnd(g, timeUp) {
  if (g.phase === 'over') return true;
  const vIn = VS.some(s => !g.b[s].out), eggs = alive(g).length, oIn = OS.some(s => !g.b[s].out) && eggs > 0, nm = g.h && g.h.kind === 'badger' ? 'badger' : 'hyena';
  const allOut = OS.concat(VS).every(s => g.b[s].out), firstGoal = g.h && g.h.kos.o >= 1 && g.h.kos.v >= 1, kos = g.h ? g.h.kos.o + g.h.kos.v : 0;
  const simpleWin = !!(g.simple && g.h && kos >= 2);
  if (g.h && (allOut || simpleWin || (!g.simple && B.HUNTER_GOAL('5', g.cfg).kind === 'first' && firstGoal))) end(g, 'hunter', 'ko', simpleWin ? `The ${nm} knocked out 2 birds.` : allOut ? `The ${nm} knocked out every bird.` : `The ${nm} knocked out an ostrich and a vulture.`);
  else if (eggs === 0 && vIn) { const broke = g.lastAction && (g.lastAction.type === 'throw' || g.lastAction.smashed); end(g, 'red', broke ? 'smashed' : 'cold', broke ? 'The vultures smashed every egg.' : 'The last egg went cold, so the vultures win.'); }
  else if (timeUp && oIn) end(g, 'blue', 'survived', `An egg was still alive after round ${g.cfg.rounds}, so the ostriches win.`);
  else if (!vIn && !oIn) g.h ? end(g, 'hunter', 'last', `Both teams are out of the game, so the ${nm} wins.`) : end(g, 'none', 'all-out', 'Both teams are out of the game.');
  else if (!oIn && !g.h) end(g, 'red', 'ostriches-out', 'Both ostriches are out, so the vultures win.');
  else if (timeUp) end(g, 'none', 'time', 'Time ran out and nobody met their goal.');
  return g.phase === 'over';
}
function endRound(g) {
  g.lastCold = [];
  for (const e of alive(g)) if (g.round - e.lastWarm >= g.cfg.warmth) {
    e.alive = false; g.lastCold.push(e.id); const c = OS.find(s => g.b[s].carrying === e.id); if (c) g.b[c].carrying = null;
    if (e.pos && g.marks[K(e.pos)] === 'spotted') delete g.marks[K(e.pos)]; }
  if (checkEnd(g, g.round >= g.cfg.rounds)) return;
  g.round++;
}
// whose turn: skip seats that are out; a caught bird loses its next turn (an ostrich still gets hungry)
function next(g) {
  if (checkEnd(g)) return;
  let i = g.order.indexOf(g.turn);
  for (let n = 0; n < 20; n++) {
    i++; if (i >= g.order.length) { endRound(g); if (g.phase === 'over') return; i = 0; }
    const s = g.order[i];
    if (s === 'hunter') { g.turn = 'hunter'; startHunter(g); return; }
    const b = g.b[s]; if (b.out) continue;
    if (b.skip) { b.skip--; g.lost = { bird: s, round: g.round };
      if (isO(s)) { ostrichStay(g, s, 'lost'); if (checkEnd(g)) return; } else { g.sniffs[s] = null; dropAll(g); }
      continue; }
    g.turn = s; return;
  }
}
function timeout(g) { // shot clock ran out: vulture passes, ostrich stays put (an egg under it is warmed, still hungry), hunter stays put
  if (g.phase !== 'play') return false; const s = g.turn;
  if (s === 'hunter') return hunterStay(g, true);
  if (isV(s)) { g.sniffs[s] = null; g.lastAction = { seat: s, type: 'pass', timeout: true }; dropAll(g); }
  else { const b = g.b[s], e = b.carrying === null && b.pos ? eggAt(g, b.pos) : null; if (e) e.lastWarm = g.round; ostrichStay(g, s, 'timeout'); } // time ran out on an egg: it is still warmed (Brian, 2026-11-15)
  next(g); return true;
}
// public status every seat may see: no positions
function hideSeat(g, s) {
  if (!g.simple || !myTurn(g, s) || !S.hide(g, s)) return false;
  if (s === 'hunter') { g.h.last = { type: 'hide' }; next(g); return true; }
  if (isV(s)) { g.sniffs[s] = null; g.lastAction = { seat: s, type: 'hide' }; dropAll(g); next(g); return true; }
  g.lastAction = { seat: s, type: 'hide' };
  const e = g.b[s].carrying == null ? eggAt(g, g.b[s].pos) : null; if (e) e.lastWarm = g.round;
  feed(g, s); next(g); return true;
}
function status(g) {
  return { n: g.n, order: g.order, kind: g.h ? g.h.kind : null, ko: koAt(g), hkos: g.h ? { ...g.h.kos } : null,
    birds: Object.fromEntries(OS.concat(VS).map(s => [s, { out: g.b[s].out, why: g.b[s].why, catches: g.b[s].catches, skip: g.b[s].skip }])) };
}
module.exports = { TM, OFF, OS, VS, isO, isV, mate, newTeam, place, canPlaceEgg, setupStep, nestOf, ostrichMoves, ostrichAct, canKick, kickable, kickTargets, kickPlans, ostrichKick, canSit, canCarry, mustLeave, onEgg, hideSeat,
  flyTargets, throwTargets, vultureFly, vultureThrow, hunterMoves, hunterMove, hunterStay, hunterRange, hunterReach, hunterSeenBy, ambushSight, senses, timeout, status, alive, eggAt,
  eggPos, live, catchBird, knockout, next, checkEnd, endRound };
