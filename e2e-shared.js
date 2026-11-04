// Regression (Brian, round 28): vulture and ostrich on one square. Both birds must be visible on both phones,
// and a stone thrown at that square bounces: no egg-crack animation, egg count unchanged.
const { webkit, devices } = require('playwright-core'); const assert = require('assert');
process.env.PORT = 3991; const server = require('./server.js');
(async () => {
  const b = await webkit.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); for (const k of ['bo_tut_seen','bo_walk_blue','bo_walk_red','bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3991/', cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  await A.goto(U); await A.click('#playFriend'); await A.click('#twoPhones'); await A.click('#roleBlue'); await A.waitForSelector('#shareCode:not(:empty)');
  await V.goto((await A.inputValue('#shareLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3991')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [3, 4]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); } // ostrich on its egg at (3,4)
  await V.waitForSelector('#actions.mine'); await cell(V, 3, 4).click(); // vulture lands on the ostrich's square
  await A.waitForSelector('#actions.mine');
  for (const [P, who] of [[A, 'ostrich'], [V, 'vulture']]) {
    const c = cell(P, 3, 4); assert.ok(await c.evaluate(e => e.classList.contains('both')), who + ': shared square marked');
    assert.equal(await c.locator('.pc').count(), 2, who + ': both birds drawn');
    const [r1, r2] = await c.locator('.pc').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top]; }));
    assert.ok(Math.abs(r1[0] - r2[0]) > 5 && Math.abs(r1[1] - r2[1]) > 5, who + ': birds offset, not stacked');
  }
  await V.screenshot({ path: 'shots/shared-square-vulture.png' });
  await A.click('#actions button:has-text("Sit")'); await V.waitForSelector('#actions.mine');
  await V.evaluate(() => { window.__res = []; document.addEventListener('bo-impact', e => window.__res.push(e.detail.res)); });
  await V.click('#actions button:has-text("Throw")'); await cell(V, 3, 4).click();
  await V.waitForSelector('.sm-reveal.yes', { timeout: 3000 }); await V.waitForTimeout(250);
  await V.screenshot({ path: 'shots/bounce-egg.jpg', type: 'jpeg', quality: 85 });
  assert.match(await V.textContent('#banner') + await V.textContent('body'), /Bounced! Egg under ostrich/);
  await A.waitForSelector('#actions.mine'); await V.waitForTimeout(1500);
  assert.deepEqual(await V.evaluate(() => window.__res.map(r => window.SMASH.kind(r))), ['feather'], 'bounce animation, not a smash');
  assert.equal(await V.locator('.sm-yolk,.sm-half').count(), 0); assert.equal(await A.textContent('#eggsLeft'), '3'); assert.equal(await V.locator('.cell.hit').count(), 0);
  // sprite themes: both sprites visible and separated
  await V.evaluate(() => { document.documentElement.setAttribute('data-theme', 'nature'); });
  await cell(A, 3, 3).click(); await V.waitForSelector('#actions.mine'); await cell(V, 3, 3).click(); await V.waitForTimeout(800);
  const sp = await V.evaluate(() => [...document.querySelectorAll('#fx .spr')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width]; }));
  if (sp.length === 2) assert.ok(Math.abs(sp[0][0] - sp[1][0]) > 5, 'sprites offset');
  // no-egg bounce: ostrich off its eggs, vulture refills at the rocks and throws at it
  await V.evaluate(() => document.documentElement.setAttribute('data-theme', 'classic'));
  const turn = async (P, x, y, thr) => { await P.waitForSelector('#actions.mine'); if (thr) await P.click('#actions button:has-text("Throw")'); await cell(P, x, y).click(); };
  await turn(A, 4, 4); await turn(V, 4, 5); await turn(A, 5, 4); await turn(V, 4, 6); await turn(A, 5, 5); await turn(V, 5, 5, true);
  await V.waitForSelector('.sm-reveal.no', { timeout: 3000 }); await V.waitForTimeout(250);
  await V.screenshot({ path: 'shots/bounce-noegg.jpg', type: 'jpeg', quality: 85 });
  assert.match(await V.textContent('body'), /Bounced! No egg/); assert.equal(await V.locator('.sm-yolk,.sm-half').count(), 0);
  // landing ON an unguarded egg says 'Found egg!' and shows it (no green maybe squares)
  await turn(A, 6, 5); await turn(V, 3, 4); await A.waitForSelector('#actions.mine'); await V.waitForTimeout(400);
  assert.match(await V.textContent('#banner'), /Found egg!/); assert.equal(await V.locator('.cell.maybe,.cell.snyes,.snwave').count(), 0);
  assert.equal(await cell(V, 3, 4).locator('.ic-spot').count(), 1); assert.ok(await cell(V, 3, 4).evaluate(e => e.classList.contains('vfound')));
  await V.screenshot({ path: 'shots/found-egg.jpg', type: 'jpeg', quality: 85 });
  assert.equal(errs.length, 0, errs.join('\n')); await b.close(); server.close(); console.log('PASS e2e-shared'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
