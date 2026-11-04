// Bots for 4/5 players. Each bot sees only what its seat may see; it reuses the 2-player bots through a 2-player-shaped
// picture of the board (its own bird, the nearest opponent, all team eggs for ostriches / only public marks for vultures).
const B = require('./game.js'), AI = require('./ai.js'), T = require('./team.js'), K = B.key, D = B.dist;
const R = a => a[Math.random() * a.length | 0];
function setup(g, s) {
  const st = T.setupStep(g, s), C = g.cfg, mine = T.nestOf(g, s);
  if (st === 'eggs') { const other = g.eggs.filter(e => e.nest !== g.b[s].nest);
    for (let i = 0; i < 600; i++) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0];
      if (!T.canPlaceEgg(g, s, p) || T.TM.vStarts.some(v => D(v, p) < 2) || mine.some(e => D(e.pos, p) < 2 || D(e.pos, p) > 3) || other.some(e => D(e.pos, p) < 3)) continue;
      return { a: 'place', p }; }
    for (;;) { const p = [Math.random() * C.cols | 0, Math.random() * C.rows | 0]; if (T.canPlaceEgg(g, s, p)) return { a: 'place', p }; } }
  const opts = mine.map(e => e.pos).concat(mine.flatMap(e => [[e.pos[0] + 1, e.pos[1]], [e.pos[0] - 1, e.pos[1]]]));
  return { a: 'place', p: opts.find(p => T.place({ ...g, b: JSON.parse(JSON.stringify(g.b)), eggs: g.eggs.slice() }, s, p)) || opts[0] };
}
function oView(g, s) {
  const b = g.b[s], vs = T.VS.filter(v => T.live(g, v)).map(v => g.b[v].pos);
  return { cfg: g.cfg, phase: 'play', turn: 'blue', round: g.round, ostrich: b.pos.slice(), carrying: null, sitRun: b.sitRun, hungerLeft: b.hunger, stones: 1, sniff: null,
    vulture: vs.length ? vs.sort((x, y) => D(x, b.pos) - D(y, b.pos))[0] : [-50, -50], marks: g.marks,
    eggs: g.eggs.map(e => ({ id: e.id, pos: e.pos || T.eggPos(g, e), alive: e.alive, lastWarm: e.lastWarm })) };
}
function ostrich(g, s, level, hv, reach) {
  const legal = T.ostrichMoves(g, s).map(p => ({ a: 'step', p })).concat(T.canCarry(g, s) ? T.ostrichMoves(g, s, true).map(p => ({ a: 'carry', p })) : []);
  const ok = m => m && (m.a === 'sit' ? T.canSit(g, s) : legal.some(x => x.a === m.a && K(x.p) === K(m.p)));
  let m; try { m = AI.ostrich(oView(g, s), level); } catch { m = null; }
  if (!ok(m)) m = T.canSit(g, s) && !T.mustLeave(g, s) && Math.random() < .3 ? { a: 'sit' } : R(legal.filter(x => x.a === 'step')) || R(legal) || { a: 'sit' };
  const fd = Math.min(...g.cfg.foods.map(f => D(f, g.b[s].pos)));
  return g.b[s].hunger - fd <= 1 ? m : AI.dodge(m, g.b[s].pos, legal, hv, reach);
}
function vView(g, s) {
  const b = g.b[s], tgt = [s === 'v1' ? 'o1' : 'o2', s === 'v1' ? 'o2' : 'o1'].find(o => T.live(g, o));
  return { cfg: g.cfg, round: g.round, phase: 'play', turn: 'red', vulture: b.pos, ostrich: tgt ? g.b[tgt].pos : [-50, -50],
    marks: Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m === 'spotted' || m === 'hit' || m === 'stone')), lastAction: null,
    sniff: g.sniffs[s] || null, stones: b.stones, fly: T.flyTargets(g, s), throw: T.throwTargets(g, s) };
}
function vulture(g, s, level, mem, hv, reach) {
  const v = vView(g, s), m0 = mem.smells ? mem.smells.length : 0;
  const ms = g.sniffs[T.mate(s)]; // shared sniffs: the partner's last result goes into this bot's memory too
  if (ms && mem.mateKey !== ms.round + K(ms.p)) { mem.mateKey = ms.round + K(ms.p); (mem.smells = mem.smells || []).push([ms.p.slice(), ms.yes]); if (mem.smells.length > 6) mem.smells.shift(); }
  let m = AI.vulture(v, level, mem); void m0;
  if (!m || !(m.a === 'fly' ? v.fly : v.throw).some(q => K(q) === K(m.p))) m = { a: 'fly', p: R(v.fly) };
  return AI.dodge(m, g.b[s].pos, v.fly.map(p => ({ a: 'fly', p })), hv, reach);
}
module.exports = { setup, ostrich, vulture, oView, vView };
