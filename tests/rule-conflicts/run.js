// Rule-conflict probes. Each one sets up a small situation and shows two rules (or two engines) disagreeing.
// These are NOT part of `npm test` and not part of the GitHub check: they are meant to FAIL today, because each one
// proves a conflict that is on the problem list (BO-problem-list.md, section "Rules that interfere with each other").
// Usage: node tests/rule-conflicts/run.js      Exit code 1 while any conflict is still there.
// When a conflict is fixed, its probe prints "fixed" and the probe can move into the normal suite.
process.env.PORT = 0; process.env.BO_NOSTORE = '1';
const path = require('path'), R = path.join(__dirname, '..', '..');
const B = require(R + '/game.js'), T = require(R + '/three.js'), H = require(R + '/hunt.js'), TM = require(R + '/team.js');
const probes = [];
const probe = (id, title, rulebook, f) => probes.push({ id, title, rulebook, f });

// Setups ------------------------------------------------------------------------------------------------------
function three(kind = 'hyena', h = [8, 3]) { const g = T.newGame3(kind, undefined, h);
  for (const p of [[2, 1], [6, 1], [2, 5]]) if (!B.placeEgg(g, p)) throw new Error('egg setup'); if (!T.placeOstrich3(g, [2, 1])) throw new Error('ostrich setup'); return g; }

// 1. Round 30: does the hunter get its turn? ----------------------------------------------------------------
probe('R1', 'Last round: the 3-player and Hunters games end before the hunter moves; the 5-player game lets the hunter move',
  'Rulebook 2: "One round = every animal takes one turn" and 9.4: an egg alive after round 30 wins.', () => {
  const out = [];
  const g = three(); g.round = 30; g.turn = 'blue'; g.eggs.forEach(e => e.lastWarm = 29); T.ostrichAct3(g, 'sit');
  out.push(`3 players: after the ostrich's turn in round 30 the game is ${g.phase}, winner ${g.winner}, whose turn it was: ${g.turn} (hunter never moved: ${g.turn !== 'hunter'})`);
  const h = H.newHunt(undefined, [[0, 3], [8, 3]]); for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(h, p); H.placeOstrichH(h, [2, 1]);
  h.round = 30; h.turn = 'blue'; h.eggs.forEach(e => e.lastWarm = 29); H.ostrichActH(h, 'sit');
  out.push(`Hunters: same situation: game is ${h.phase}, winner ${h.winner}, turn ${h.turn}`);
  const t = TM.newTeam(5, 'hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TM.place(t, 'o1', p); TM.place(t, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TM.place(t, 'o2', p); TM.place(t, 'o2', [7, 1]);
  t.round = 30; t.eggs.forEach(e => e.lastWarm = 29); t.turn = 'o2'; TM.timeout(t);
  out.push(`5 players: after the last ostrich's turn in round 30 the turn passes to: ${t.turn} (the hunter still moves)`);
  const conflict = g.phase === 'over' && h.phase === 'over' && t.phase === 'play' && t.turn === 'hunter';
  return { conflict, out };
});

// 2. Shot clock vs warmth ---------------------------------------------------------------------------------------
probe('R2', 'Standing on an egg while the shot clock runs out does not warm it, but pressing Sit does',
  'Rulebook 7.1: each egg goes cold "unless the ostrich stands or sits on it at least once every 15 rounds".', () => {
  const out = [], run = how => { const g = three(); g.eggs.forEach((e, i) => { e.lastWarm = 0; }); // ostrich stands on egg 0 from the start
    for (let r = 1; r <= 16; r++) { // 16 rounds: eggs go cold after 15 without warmth
      g.turn = 'blue'; if (how === 'sit') T.ostrichAct3(g, 'sit'); else T.timeout(g);
      if (g.phase !== 'play') break; g.turn = 'hunter'; T.hunterStay(g); }
    return { alive: g.eggs[0].alive, lastWarm: g.eggs[0].lastWarm, round: g.round, phase: g.phase, over: g.phase === 'over' ? g.winBy : null }; };
  const sit = run('sit'), clock = run('clock');
  out.push('After 16 rounds. Ostrich presses Sit every turn: egg under it lastWarm=' + sit.lastWarm + ', alive=' + sit.alive);
  out.push('Ostrich is on the same egg but the clock runs out every turn: egg lastWarm=' + clock.lastWarm + ', alive=' + clock.alive + ' (game over by: ' + clock.over + ')');
  return { conflict: sit.alive && !clock.alive, out };
});

// 3. Shot clock vs Burrow ---------------------------------------------------------------------------------------
probe('R3', 'When the badger player runs out of time, the badger digs in (and everyone is told)',
  'Rulebook 7.4: burrow means "staying still for one turn"; a clock timeout is meant to end the turn, not to choose Burrow.', () => {
  const g = three('badger', [8, 3]); g.turn = 'hunter'; const before = g.three.burrowed; T.timeout(g);
  const out = [`badger burrowed before: ${before}; after the clock ran out: ${g.three.burrowed}; "dug in" announcement recorded: ${!!g.three.dug}`];
  return { conflict: !before && g.three.burrowed && !!g.three.dug, out };
});

// 4. End screen says both birds are out when one is alive --------------------------------------------------------
probe('R4', 'If the vulture is knocked out and then the eggs go cold, the end screen says "Both birds are out" while the ostrich is still playing',
  'Rulebook 9.1/9.3: only a knocked-out bird is out; eggs going cold ends the ostrich side, but the ostrich is not knocked out.', () => {
  const g = three(); const t = g.three; t.birds.red.out = true; t.birds.red.why = 'caught'; g.vulture = T.OFF.slice(); t.birds.red.catches = 2;
  g.eggs.forEach(e => { e.alive = false; }); g.phase = 'play'; B.endRound(g); T.finish(g);
  const ostrichOnBoard = g.ostrich[0] >= 0;
  const out = [`game over: ${g.phase === 'over'}, winner: ${g.winner}, reason shown: "${g.endWhy}", ostrich still on the board: ${ostrichOnBoard}`];
  return { conflict: g.phase === 'over' && /Both birds are out/.test(g.endWhy || '') && ostrichOnBoard, out };
});

// 5. "4 catches" is the same thing as "both birds knocked out" ----------------------------------------------------
probe('R5', 'The 3-player hunter goal "4 catches" can only happen when both birds are already knocked out (2 catches each)',
  'Role card: "You win at 4 catches." Notes (OPEN-ITEMS, PR #24 line): "3 catches win 3-player mode."', () => {
  const g = three(); const t = g.three; const HG = B.HUNTER_GOAL('3', g.cfg);
  // after one bird is knocked out (2 catches) and the other has 1 catch: total 3, game still on
  t.birds.red.catches = 2; t.birds.red.out = true; t.birds.red.why = 'caught'; g.vulture = T.OFF.slice(); t.birds.blue.catches = 1; g.phase = 'play'; T.finish(g);
  const at3 = g.phase;
  const out = [`goal in code: ${HG.kind} ${HG.n}; with 2 + 1 = 3 catches the game is: ${at3}; the most one bird can take is ${T.T3.ko.hyena} catches, so 4 total means both birds are out`];
  return { conflict: HG.kind === 'catches' && HG.n === 4 && at3 === 'play' && 2 * T.T3.ko.hyena === 4, out };
});

// 6. Boxed in ------------------------------------------------------------------------------------------------------
probe('R6', 'An ostrich in a corner with every square around it wrecked has no legal action (it can only wait for the clock, and cannot reach food)',
  'Rulebook 3.3: staying is allowed only for an ostrich sitting on an egg; there is no rule for a boxed-in ostrich.', () => {
  const g = B.newGame(); g.eggs = [{ id: 0, pos: [8, 0], alive: true, lastWarm: 0 }]; g.phase = 'play'; g.turn = 'blue'; g.ostrich = [0, 6]; g.vulture = [4, 3];
  for (const p of B.walkSquares(g.cfg, {}, g.ostrich, 2)) g.marks[B.key(p)] = 'stone';
  const moves = B.ostrichMoves(g).length, sit = B.canSit(g), kick = B.kickTargets(g).length;
  const out = [`wrecked squares around (0,6): ${Object.keys(g.marks).length}; legal steps: ${moves}; can sit: ${sit}; can kick: ${kick}`];
  return { conflict: moves === 0 && !sit && kick === 0, out };
});

// Run ----------------------------------------------------------------------------------------------------------------
let still = 0;
for (const p of probes) { let r; try { r = p.f(); } catch (e) { r = { conflict: null, out: ['probe error: ' + e.message] }; }
  console.log(`\n${p.id}  ${r.conflict === null ? 'ERROR' : r.conflict ? 'CONFLICT REPRODUCED' : 'fixed'}  ${p.title}\n    rulebook: ${p.rulebook}`); r.out.forEach(l => console.log('    ' + l)); if (r.conflict !== false) still++; }
console.log(`\n${still} of ${probes.length} conflicts still present.`); process.exit(still ? 1 : 0);
