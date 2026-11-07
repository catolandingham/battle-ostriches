// bot-vs-bot sims for 4 players (2v2) and 5 players (2v2 + hunter). Usage: node simteam.js [games] [4|5] [hyena|badger]
const T = require('./team.js'), TA = require('./teamai.js'), AI = require('./ai.js');
function hunterView(g) { return { cfg: g.cfg, round: g.round, hunter: g.h.p, kind: g.h.kind, sense: g.h.sense, senseSeq: g.h.senseSeq, senseRange: T.TM.sense,
  pounce: g.h.pounce, burrowed: g.h.burrowed, dig: g.h.dig, hmoves: T.hunterMoves(g), seenBirds: T.ambushSight(g), marks: Object.fromEntries(Object.entries(g.marks).filter(([, m]) => m !== 'spotted')) }; }
function play(n, kind, level = 'normal') {
  const g = T.newTeam(n, kind), mem = {};
  for (let i = 0; i < 20 && g.phase === 'setup'; i++) for (const s of T.OS) { const st = T.setupStep(g, s); if (st !== 'done') { const m = TA.setup(g, s); if (!T.place(g, s, m.p)) throw new Error('bad setup ' + JSON.stringify(m)); } }
  let seq = 0;
  for (let i = 0; i < 2000 && g.phase === 'play'; i++) {
    const s = g.turn, mm = mem[s] || (mem[s] = {}), hv = g.h && T.hunterSeenBy(g, s) ? g.h.p : null, reach = T.hunterRange(g) + (g.h && g.h.kind === 'hyena' ? 1 : 0);
    let ok;
    if (s === 'hunter') { if (g.lastCatch && mm.seenCatch !== g.lastCatch.seq) { mm.seenCatch = g.lastCatch.seq; mm.reset = true; mm.lastCatch = g.h.p.slice(); }
      const m = AI.hunter(hunterView(g), mm); ok = m.a === 'hmove' ? T.hunterMove(g, m.p) : T.hunterStay(g); }
    else if (T.isO(s)) { const m = TA.ostrich(g, s, level, hv, reach); ok = T.ostrichAct(g, s, m.a, m.p); }
    else { const m = TA.vulture(g, s, level, mm, hv, reach); ok = m.a === 'fly' ? T.vultureFly(g, s, m.p) : !!T.vultureThrow(g, s, m.p); }
    if (!ok) { seq++; T.timeout(g); }
  }
  if (g.phase !== 'over') throw new Error('did not finish');
  return { w: g.winner, by: g.winBy, r: g.round, bad: seq, starved: Object.values(g.b).filter(b => b.why === 'starved').length };
}
module.exports = { play, hunterView };
if (require.main === module) {
  const N = +process.argv[2] || 500, n = +process.argv[3] || 4, kind = process.argv[4] || 'hyena', c = {}, by = {}; let bad = 0, st = 0, r = 0;
  for (let i = 0; i < N; i++) { const x = play(n, kind); c[x.w] = (c[x.w] || 0) + 1; by[x.by] = (by[x.by] || 0) + 1; bad += x.bad; st += x.starved; r += x.r; }
  const P = v => (100 * v / N).toFixed(0) + '%';
  console.log(`${n}p${n === 5 ? ' ' + kind : ''}: ` + Object.entries(c).map(([k, v]) => k + ' ' + P(v)).join(' / '), '| by', JSON.stringify(by), '| rounds', (r / N).toFixed(1), 'starved/game', (st / N).toFixed(2), 'illegal bot moves', bad);
}
