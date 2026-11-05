// Ostrich guides: start = one-time non-restrictive tip; first low food -> only moves toward a leaf; first cold egg -> only moves back to it. Once each.
// Saves JPEG iPhone screenshots to shots/hardstop/.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3998; const server = require('./server.js');
const OUT = 'shots/hardstop/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await webkit.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3998/';
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = await A.inputValue('#lobbyLink');
  await V.goto(link.replace(/^http:\/\/[^/]+/, 'http://localhost:3998')); await V.waitForSelector('#roomLobby');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  const gd = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const legal = () => A.evaluate(() => UI._legal());
  const shot = async n => { await A.waitForTimeout(300); await A.screenshot({ path: OUT + n, type: 'jpeg', quality: 88 }); };
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 5]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  const vfly = async (x, y) => { await V.waitForSelector('#actions.mine', { state: 'attached' }); await cell(V, x, y).click(); await A.waitForSelector('#actions.mine', { state: 'attached' }); await A.waitForTimeout(150); };
  await vfly(4, 2);
  assert.ok(!(await V.locator('#hint.guide').count()), 'vulture never guided');
  // 1) start: a one-time TIP only. No path/pulse toward any egg (would reveal it to an onlooker) and no move restriction.
  assert.match(await A.textContent('#hint'), /sit on eggs to keep them warm/i); let L = await legal();
  const allMoves = await A.evaluate(() => UI._S()._o ? UI._S()._o.m : UI._S().moves);
  assert.deepEqual(L.map(String).sort(), allMoves.map(String).sort(), 'start tip does not restrict moves'); assert.ok(L.length >= 3, 'free moves ' + JSON.stringify(L));
  assert.equal(await A.locator('.cell.gpath,.cell.gtarget').count(), 0, 'no path toward an egg');
  await shot('1-start-tip.jpg');
  await cell(A, 6, 4).click(); await vfly(4, 1);
  assert.ok(!(await A.locator('#hint.guide').count()) || !/sit on eggs/i.test(await A.textContent('#hint')), 'tip shows once'); assert.ok((await legal()).length >= 3, 'free play');
  await cell(A, 6, 3).click(); await vfly(4, 0);
  // 2) first low food: only moves toward the nearest leaf
  await A.evaluate(() => { UI._S().hungerLeft = 4; UI._rr(); }); assert.match(await A.textContent('#hint'), /hungry! Go eat/);
  const o = await A.evaluate(() => UI._S().ostrich), food = [[0, 0], [8, 6]].sort((a, b) => gd(a, o) - gd(b, o))[0];
  L = await legal(); assert.ok(L.length && L.every(p => gd(p, food) < gd(o, food)), 'hungry: only closer moves'); await shot('3-hungry-go-eat.jpg');
  await A.evaluate(() => localStorage.setItem('bo_g_hungry', '1')); await A.evaluate(() => { UI._S().hungerLeft = 13; UI._rr(); });
  // 3) cold egg: NOT forced. First time <=8 rounds: loud pulse + warning, escalating; afterward subtle pulse only.
  const setCold = n => A.evaluate(n => { const S = UI._S(); S.eggs.find(e => e.pos[0] === 3).coldIn = n; UI._rr(); }, n);
  await setCold(8); assert.match(await A.textContent('#hint'), /Egg cooling — 8 rounds left/);
  assert.ok(await A.locator('.cell.gloud .ic-myegg').count() === 1, 'cold egg pulses loudly');
  assert.ok((await legal()).length >= 3, 'cold egg does not restrict moves'); await shot('4-egg-cooling-early.jpg');
  await setCold(3); assert.match(await A.textContent('#hint'), /3 rounds left! Hurry back/); assert.ok(await A.locator('.cell.gloud.urgent').count() === 1); await shot('5-egg-cooling-urgent.jpg');
  await A.evaluate(() => localStorage.setItem('bo_g_cold', '1')); await setCold(6);
  assert.ok(!(await A.locator('#hint.guide').count()), 'no banner after first time');
  assert.ok(await A.locator('.cell.gcool').count() === 1 && !(await A.locator('.cell.gloud').count()), 'subtle pulse afterward'); await shot('6-egg-cooling-later-subtle.jpg');
  // 4) Skip guide opt-out: button shows with the guide prompt; tapping it ends guides + warnings for good; ? menu turns them back on
  await A.evaluate(() => { localStorage.removeItem('bo_g_hungry'); UI._S().hungerLeft = 4; UI._rr(); });
  assert.ok(await A.locator('#hint #skipGuide').isVisible(), 'Skip guide button visible'); await shot('7-skip-guide-button.jpg');
  await A.click('#skipGuide'); assert.equal(await A.evaluate(() => localStorage.getItem('bo_hs_off')), '1');
  assert.ok(!(await A.locator('#hint.guide').count()) && !(await A.locator('.cell.gpath,.cell.gtarget,.cell.gloud,.cell.gcool').count()), 'guides gone after skip');
  assert.ok((await legal()).length >= 3, 'free moves after skip'); await A.evaluate(() => { UI._S().hungerLeft = 13; UI._rr(); });
  await A.click('#helpBtn'); assert.match(await A.textContent('#guideToggle'), /OFF/); await A.click('#guideToggle');
  assert.equal(await A.evaluate(() => localStorage.getItem('bo_hs_off')), null, 'guides back on'); await A.evaluate(() => UI.closeRules());
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-hardstop'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
