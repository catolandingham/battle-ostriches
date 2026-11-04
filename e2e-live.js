// LIVE smoke on real WebKit iPhone 13 against a deployed site (default https://ostriches.onrender.com). Usage: node e2e-live.js [url]
// Covers: share-code-first lobby, sound context 'running' after a tap, a real 2-player game with vulture fly/bounce/smash
// (board must not jump on fly/miss/bounce; smash shake <=3px), no room code in the in-game header, and a 3-player game start. JPEGs -> shots/live/.
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const U = (process.argv[2] || 'https://ostriches.onrender.com').replace(/\/?$/, '/'), OUT = 'shots/live/'; fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 82 });
const gd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const passed = []; const ok = (c, m) => { assert.ok(c, m); passed.push(m); console.log('  ok', m); };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  // watch the board's on-screen top for ms while fn runs; returns max deviation in px
  const watch = async (P, fn, ms = 1600) => { await P.evaluate(() => { window.__log=[];const snap=()=>[...document.getElementById('board').parentElement.children].map(e=>e.id+':'+e.className+':'+Math.round(e.getBoundingClientRect().height)).join(' | ');window.__log.push(snap());window.__snap=snap; const b = document.getElementById('board'), y0 = b.getBoundingClientRect().top; window.__dev = 0;
      const t0 = performance.now(); const f = () => { {const dv=Math.abs(b.getBoundingClientRect().top - y0);if(dv>window.__dev+5)window.__log.push(dv+' '+window.__snap());window.__dev = Math.max(window.__dev, dv);} if (performance.now() - t0 < 2500) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await fn(); await P.waitForTimeout(ms); const lg=await P.evaluate(()=>window.__log); if(lg.length>1)console.log(lg.slice(0,3).join('\n')); return P.evaluate(() => window.__dev); };
  const A = await mk(), V = await mk();
  // --- lobby: Classic default, share first
  await A.goto(U); await shot(A, '1-lobby'); ok(await A.evaluate(() => SFX.muted) === false, 'sound not muted by default');
  await A.click('#playFriend'); await A.click('#twoPhones'); await A.waitForSelector('#shareCode:not(:empty)', { timeout: 30000 });
  ok(!(await A.isVisible('#roleBlue')), 'share code shown before any role pick');
  await A.waitForSelector('#seatPick button[data-seat="red"]'); ok(true, 'side picker under the code');
  await A.waitForTimeout(300); ok(await A.evaluate(() => SFX.state) === 'running', "AudioContext 'running' after a tap");
  await shot(A, '2-share-first');
  const code = (await A.textContent('#shareCode')).trim(), link = await A.inputValue('#shareLink');
  await V.goto(link); await V.waitForSelector('#board .cell'); await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  // ostrich hides 3 eggs then places itself (all from the real legal list)
  for (let i = 0; i < 4; i++) { const L = await A.evaluate(() => UI._legal()); const p = L[(i * 7 + 3) % L.length]; await cell(A, p[0], p[1]).click(); await A.waitForTimeout(250); }
  await V.waitForSelector('#actions.mine', { timeout: 15000 }); await V.waitForTimeout(600);
  for (const P of [A, V]) ok(!(await P.textContent('#hud')).includes(code) && !(await P.isVisible('#wait')), 'no room code in in-game header (' + (P === A ? 'ostrich' : 'vulture') + ')');
  const eggs = await A.evaluate(() => UI._S().eggs.map(e => e.pos)); let flyDev = 0, missDev = 0, bounced = false, smashed = false, smashDev = 0, fly = 0;
  for (let t = 0; t < 40 && !smashed; t++) {
    await V.waitForSelector('#actions.mine', { timeout: 20000 }); await V.waitForTimeout(700);
    const S = await V.evaluate(() => { const S = UI._S(); return { v: S.vulture, o: S.ostrichSeen || null, st: S.stones, phase: S.phase, th: S.throw || [] }; });
    if (S.phase !== 'play') break;
    const live = await A.evaluate(() => UI._S().eggs.filter(e => e.alive && !e.carried).map(e => e.pos)), o = await A.evaluate(() => UI._S().ostrich);
    const near = live.find(e => gd(e, S.v) <= 1 && S.th.some(q => q[0] === e[0] && q[1] === e[1]));
    const tgt = S.st > 0 && !bounced && gd(o, S.v) <= 1 && S.th.some(q => q[0] === o[0] && q[1] === o[1]) ? o : S.st > 0 ? near : null;
    if (tgt) { const isEgg = live.some(e => e[0] === tgt[0] && e[1] === tgt[1]);
      await V.evaluate(() => UI.setMode('throw')); const d = await watch(V, () => cell(V, tgt[0], tgt[1]).click(), 2200);
      if (isEgg) { smashed = true; smashDev = d; await shot(V, '4-smash-vulture'); await shot(A, '4-smash-ostrich'); } else { bounced = true; missDev = Math.max(missDev, d); await shot(V, '3-bounce'); }
    } else {
      const goal = S.st > 0 ? (live[0] || eggs[0]) : [[4, 0], [4, 6]].sort((a, b) => gd(a, S.v) - gd(b, S.v))[0];
      const L = await V.evaluate(() => UI._legal()); const p = L.sort((a, b) => gd(a, goal) - gd(b, goal))[0];
      flyDev = Math.max(flyDev, await watch(V, () => cell(V, p[0], p[1]).click(), 1300)); fly++; if (fly === 1) await shot(V, '3-vulture-after-fly');
    }
    // ostrich: step toward the vulture (to set up a bounce), else sit/anything legal
    const myTurn = await A.waitForSelector('#actions.mine', { timeout: 20000 }).then(() => true).catch(() => false); if (!myTurn) continue; await A.waitForTimeout(400);
    if ((await A.evaluate(() => UI._S().phase)) !== 'play') break;
    const vv = await A.evaluate(() => UI._S().vulture); const L = await A.evaluate(() => UI._legal());
    if (L.length) { const p = vv && !bounced ? L.sort((a, b) => gd(a, vv) - gd(b, vv))[0] : L[0]; await cell(A, p[0], p[1]).click(); } else await A.click('#actions button:has-text("Sit")').catch(() => {});
  }
  ok(fly > 0 && flyDev <= 1, `vulture fly: board never moved (max ${flyDev.toFixed(1)}px over ${fly} flies)`);
  if (bounced) ok(missDev <= 1, `bounce: no shake/jump (max ${missDev.toFixed(1)}px)`); else console.log('  (no bounce chance this game)');
  ok(smashed, 'egg smashed in a real game'); ok(smashDev <= 3.5, `smash shake is subtle (max ${smashDev.toFixed(1)}px)`);
  // --- 3 players by link
  const A3 = await mk(), V3 = await mk(), H3 = await mk();
  await A3.goto(U); await A3.click('#moreP'); await A3.click('#pc3'); await shot(A3, '5-more-players'); await A3.click('#playFriend'); await A3.waitForSelector('#threeStep:not(.hidden)');
  await A3.click('#threeStep [data-r="blue"]').catch(() => {}); await A3.click('#t3go'); await A3.waitForSelector('#shareCode:not(:empty)', { timeout: 30000 });
  const l3 = await A3.inputValue('#shareLink'); await V3.goto(l3); await V3.waitForSelector('#board .cell'); await H3.goto(l3);
  await H3.waitForSelector('#kindPick:not(.hidden)'); await H3.click('#pick-hyena'); await H3.waitForSelector('#kindPick', { state: 'hidden' });
  for (let i = 0; i < 4; i++) { const L = await A3.evaluate(() => UI._legal()); const p = L[(i * 5 + 2) % L.length]; await cell(A3, p[0], p[1]).click(); await A3.waitForTimeout(250); }
  await V3.waitForSelector('#actions.mine', { state: 'attached', timeout: 15000 }); ok(await V3.locator('#clock3:not(.hidden)').count() > 0, '3p: shot clock on vulture turn');
  const L3 = await V3.evaluate(() => UI._legal()); const d3 = await watch(V3, () => cell(V3, L3[0][0], L3[0][1]).click(), 1300);
  ok(d3 <= 1, `3p vulture fly: no layout jump (${d3.toFixed(1)}px)`);
  await A3.waitForSelector('#actions.mine', { state: 'attached', timeout: 15000 }); ok(true, '3p: turn passes vulture -> ostrich');
  await shot(V3, '6-3p-vulture'); await shot(H3, '6-3p-hunter');
  console.log('page errors', errs); ok(errs.length === 0, 'no page errors');
  console.log('LIVE PASSED', passed.length, 'checks'); await b.close(); process.exit(0);
})().catch(e => { console.error('LIVE FAIL', e.message); console.log('passed so far:', passed); process.exit(1); });
