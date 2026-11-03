// Two headless iPhone sessions play a few turns against the local server.
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = 3999; const server = require('./server.js');
(async () => {
  const b = await webkit.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => ['seen','blue','red'].forEach(k => localStorage.setItem('bo_tut_' + k, '1')) || ['blue','red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9'))); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3999/';
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const shot = (p, n) => p.screenshot({ path: 'shots/' + n + '.png' });
  await A.goto(U); await shot(A, '1-lobby');
  await A.click('#mkBlue'); await A.waitForSelector('#shareCode:not(:empty)');
  const link = await A.inputValue('#shareLink'); console.log('share link', link);
  await shot(A, '2-waiting');
  await V.goto(link.replace(/^http:\/\/[^/]+/, 'http://localhost:3999')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[0, 0], [8, 6], [0, 6], [0, 0]]) { await cell(A, x, y).click(); await A.waitForTimeout(80); }
  await V.waitForFunction(() => document.querySelectorAll('#actions button').length === 2);
  // Vulture must not see eggs or ostrich
  assert.equal(await V.locator('.egg').count(), 0, 'vulture sees no eggs');
  await shot(V, '3-vulture-turn');
  await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, 4, 3).click(); // miss
  await A.waitForFunction(() => document.querySelectorAll('#actions button').length >= 2);
  assert.ok(await A.locator('.cell.miss').count() > 0, 'miss mark shown');
  await A.click('#actions button:has-text("Carry")', { force: true }); await cell(A, 1, 1).click();
  await V.waitForSelector('#actions.mine');
  assert.ok(await V.locator('.num').count() >= 1, 'vulture sees footprints');
  await cell(V, 3, 2).click(); // fly
  await A.waitForFunction(() => /Set down/.test(document.getElementById('actions').textContent));
  await A.click('#actions button:has-text("Set down")', { force: true }); await A.waitForTimeout(300); console.log('A:', await A.textContent('#hint'), '|', await A.textContent('#log'), '| V:', await V.textContent('#hint'));
  await V.waitForSelector('#actions.mine');
  await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, 2, 1).click();
  await A.waitForFunction(() => /Step/.test(document.getElementById('actions').textContent) && document.getElementById('roundsLeft').textContent === '33');
  await shot(A, '4-ostrich-turn'); await shot(V, '5-vulture-wait');
  // illegal move from wrong player is ignored
  const before = await V.textContent('#roundsLeft'); await cell(V, 0, 0).click(); await V.waitForTimeout(200);
  assert.equal(await V.textContent('#roundsLeft'), before);
  // reconnect: reload ostrich page keeps seat
  await A.reload(); await A.waitForFunction(() => document.querySelectorAll('.egg').length === 3);
  console.log('rounds left', await A.textContent('#roundsLeft'), 'errors', errs);
  assert.equal(errs.length, 0); await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
