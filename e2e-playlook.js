// Playtest visuals on a 390-wide phone: no circle-plus on throwable squares, no leftover ring on a
// kicked vulture's landing square (Classic and Black and white), and the last landing's egg outlines
// stay after the throw until the next landing.
process.env.PORT = '3973';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '900000';
process.env.BO_CLOCKMS = '900000';
const { webkit } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js'), B = require('./game.js');
const U = 'http://localhost:3973/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const room2 = () => [...server.rooms.values()].filter(r => r.g && !r.three && !r.hunt && !r.team).pop();
let n = 0; const ok = m => { n++; console.log('ok', m); };

(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  const quiet = async p => {
    const go = p.locator('#surprise-go button');
    for (let i = 0; i < 40; i++) {
      if (await go.count()) { await go.click(); await sleep(150); }
      const busy = await p.evaluate(() => !!(document.getElementById('cutaway') || document.getElementById('boardhold') || document.documentElement.classList.contains('cutaway-up') || (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy())));
      if (!busy) return;
      await sleep(200);
    }
  };
  const readRing = p => p.evaluate(() => {
    const land = [...document.querySelectorAll('#board .cell')].find(c => c.classList.contains('h3kb'));
    if (!land) return null;
    const a = getComputedStyle(land, '::after'), b = getComputedStyle(land, '::before');
    return { content: a.content, before: b.content, border: a.borderTopWidth, display: a.display, theme: document.documentElement.dataset.theme, bird: !!land.querySelector('.pc.pv') };
  });

  // 1. Throwable squares are lit and have no circle-plus. The found-egg crosshair stays when Throw is not selected.
  const V = await mk();
  await V.goto(U); await V.click('#playSolo'); await V.click('[data-bots="1"]'); await V.click('#soloGo');
  await V.click('[data-role="red"]'); await V.click('#startGame'); await V.waitForSelector('#board .cell');
  await V.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn; }, null, { timeout: 30000 });
  const rv = room2(); rv.aiT = 1; clearTimeout(rv.aiT); rv.aiT = 1;
  const g = rv.g;
  g.phase = 'play'; g.turn = 'red'; g.round = 2; g.stones = 1; g.hungerLeft = 10; g.winner = null; g.winBy = null;
  g.vulture = [4, 3]; g.ostrich = [0, 6]; g.carrying = null; g.marks = {}; g.sniff = null; g.sniffKeep = null; g.lastAction = { type: 'stay' };
  server.broadcast(rv);
  await V.waitForFunction(() => { const s = UI._S(); return s && s.myTurn && s.vulture && s.vulture[0] === 4; });
  for (const theme of ['classic', 'bw']) {
    await V.evaluate(t => THEME.set(t), theme); await sleep(150);
    await V.evaluate(() => UI.setMode('throw'));
    await V.waitForFunction(() => document.querySelectorAll('#board .cell.target').length >= 5);
    const aim = await V.evaluate(() => ({
      targets: document.querySelectorAll('#board .cell.target').length,
      aims: document.querySelectorAll('#board .cell.target > i.aim, #board .cell.legal > i.aim').length,
      lit: [...document.querySelectorAll('#board .cell.target')].every(c => c.classList.contains('legal'))
    }));
    assert.ok(aim.targets >= 5, theme + ' lit throw squares ' + JSON.stringify(aim));
    assert.equal(aim.aims, 0, theme + ' throwable squares have no circle-plus');
    assert.equal(aim.lit, true, theme + ' throwable squares stay lit');
  }
  ok('throwable squares are lit in Classic and Black and white, with no circle-plus');
  const egg = g.eggs.find(e => e.alive && e.pos && !(e.pos[0] === 0 && e.pos[1] === 6));
  const nb = [egg.pos[0] + (egg.pos[0] < 8 ? 1 : -1), egg.pos[1]];
  g.vulture = nb.slice(); g.marks = {}; g.marks[B.key(egg.pos)] = 'spotted'; g.stones = 1; g.turn = 'red'; g.sniff = { p: nb.slice(), yes: true, round: g.round }; g.sniffKeep = null;
  server.broadcast(rv);
  await V.waitForFunction(k => { const s = UI._S(); return s && s.marks && s.marks[k] === 'spotted'; }, B.key(egg.pos));
  await V.evaluate(() => UI.setMode('fly')); await sleep(200);
  const cue = await V.evaluate(() => document.querySelectorAll('#board .cell.aimcue > i.aim.cue').length);
  assert.equal(cue, 1, 'the found-egg crosshair is still there when Throw is not selected');
  await V.evaluate(() => UI.setMode('throw')); await sleep(150);
  assert.equal(await V.evaluate(() => document.querySelectorAll('#board i.aim').length), 0, 'selecting Throw does not put the circle-plus back, including on the found egg');
  ok('the found-egg crosshair is unchanged, and Throw does not add it to every square');

  // 3. Outlines from the landing survive the throw, stay put when the egg moves, and go on the next landing.
  g.eggs = [[6, 2], [2, 2], [2, 5]].map((p, id) => ({ id, pos: p.slice(), alive: true, lastWarm: g.round }));
  g.marks = {}; g.ostrich = [0, 6]; g.vulture = [4, 3]; g.turn = 'red'; g.stones = 1; g.carrying = null; g.hungerLeft = 10; g.phase = 'play'; g.sniff = null; g.sniffKeep = null;
  assert.ok(B.vultureFly(g, [5, 3])); assert.equal(g.sniff.yes, true);
  server.broadcast(rv); await sleep(400);
  const outlines = () => V.evaluate(() => [...document.querySelectorAll('#board .cell')].map((c, i) => c.querySelector('.cmark.cm-egg:not(.is)') ? i : -1).filter(i => i >= 0).sort((a, c) => a - c));
  const first = await outlines();
  assert.ok(first.length >= 5, 'the landing draws egg outlines ' + JSON.stringify(first));
  assert.ok(B.ostrichStep(g, [0, 5]));
  assert.equal(B.vultureThrow(g, [5, 3]), 'miss');
  server.broadcast(rv); await sleep(400);
  const afterThrow = await outlines();
  assert.deepEqual(afterThrow, first, 'the throw keeps the same outlines');
  assert.equal(await V.evaluate(() => UI._S().sniff), null);
  assert.equal(await V.evaluate(() => UI._S().sniffKeep && UI._S().sniffKeep.yes), true);
  g.eggs[0].pos = [0, 2];
  server.broadcast(rv); await sleep(300);
  assert.equal(B.smellsEgg(g, [5, 3]), false);
  assert.deepEqual(await outlines(), first, 'moving the hidden egg does not change the outlines');
  assert.ok(B.ostrichStep(g, [1, 5]));
  const far = B.flyTargets(g).find(p => !B.smellsEgg(g, p) && !B.eggAt(g, p));
  assert.ok(B.vultureFly(g, far));
  server.broadcast(rv); await sleep(300);
  assert.deepEqual(await outlines(), [], 'the next landing replaces those outlines');
  ok('egg outlines stay through the throw and until the next landing, with no new reading');

  // 2. Kick landing ring is gone in Classic and in Black and white. Catch uses the same .h3kb mark.
  const O = await mk();
  await O.goto(U); await O.click('#playSolo'); await O.click('[data-bots="1"]'); await O.click('#soloGo');
  await O.click('[data-role="blue"]'); await O.click('#startGame'); await O.waitForSelector('#board .cell');
  await O.waitForFunction(() => UI._S() && UI._S().phase === 'setupEggs', null, { timeout: 15000 });
  const ro = room2(); ro.aiT = 1; clearTimeout(ro.aiT); ro.aiT = 1;
  const og = ro.g;
  og.eggs = [[2, 2], [6, 2], [2, 5]].map((p, id) => ({ id, pos: p, alive: true, lastWarm: 2 }));
  og.phase = 'play'; og.turn = 'blue'; og.round = 2; og.ostrich = [3, 3]; og.vulture = [4, 3];
  og.carrying = null; og.sitRun = 0; og.hungerLeft = 10; og.stones = 1; og.marks = {}; og.sniff = null; og.sniffKeep = null;
  og.lastKick = null; og.kickSeq = 0; og.lastAction = { type: 'stay' }; og.winner = null;
  server.broadcast(ro);
  await O.waitForFunction(() => { const s = UI._S(); return s && s.myTurn && s.ostrich && s.ostrich[0] === 3; });
  await O.evaluate(() => THEME.set('classic')); await sleep(200);
  assert.ok(B.ostrichKick(og, [4, 3])); assert.deepEqual(og.vulture, [7, 3]);
  server.broadcast(ro);
  await O.waitForFunction(() => document.querySelector('#board .cell.h3kb .pc.pv'), null, { timeout: 15000 });
  const classic = await readRing(O);
  assert.ok(classic && classic.bird, 'the kicked vulture is on the marked landing square');
  assert.equal(classic.content, 'none', 'Classic draws no ring on the landing square ' + JSON.stringify(classic));
  assert.equal(classic.before, 'none');
  await O.evaluate(() => document.documentElement.setAttribute('data-theme', 'bw')); await sleep(100);
  const bw = await readRing(O);
  assert.equal(bw.theme, 'bw');
  assert.equal(bw.content, 'none', 'Black and white draws no ring either ' + JSON.stringify(bw));
  assert.equal(bw.before, 'none');
  await quiet(O);
  ok('a kicked vulture\'s landing square has no leftover ring in Classic or Black and white');

  console.log('errors', errs); assert.deepEqual(errs, []);
  await b.close(); server.close();
  console.log(n + ' phone checks');
  console.log('PASS e2e-playlook');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
