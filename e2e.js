// Two headless WebKit iPhones play the open-skies rules against the local server, including a stone smash.
// Saves screenshots to shots/balanced/.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs'), { execSync } = require('child_process');
process.env.PORT = 3999; const server = require('./server.js');
const OUT = 'shots/balanced/'; fs.mkdirSync(OUT + 'frames', { recursive: true });
(async () => {
  const b = await webkit.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3999/';
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  await A.goto(U); await A.click('#playFriend'); await A.click('#twoPhones'); await A.click('#roleBlue'); await A.waitForSelector('#shareCode:not(:empty)');
  const link = await A.inputValue('#shareLink');
  await V.goto(link.replace(/^http:\/\/[^/]+/, 'http://localhost:3999')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  // eggs (3,4) (6,2) (2,1); ostrich starts at (7,2). Eggs can't go next to food: (1,1) is refused.
  await cell(A, 1, 1).click(); await A.waitForTimeout(150); assert.equal(await A.locator('.ic-myegg').count(), 0, 'no egg next to food');
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 2]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  await V.waitForSelector('#actions.mine');
  assert.equal(await V.locator('.ic-myegg,.ic-spot').count(), 0, 'vulture sees no eggs');
  assert.equal(await V.locator('.ic-food').count(), 2); assert.equal(await V.locator('.ic-rock').count(), 2);
  assert.ok(await V.locator('#board .pc').count() === 2, 'both birds visible');
  assert.equal(await V.textContent('#stonesLeft'), '1/1');
  assert.ok(await V.locator('.cell.legal').count() > 8, 'white rings');
  // fly next to the hidden egg -> yes/no sniff banner
  await cell(V, 4, 4).click(); await V.waitForTimeout(300);
  assert.equal(await V.textContent('#banner'), 'Egg nearby!');
  await A.waitForSelector('#actions.mine'); assert.ok(await A.locator('.wnum').count() === 3, 'warmth numbers'); assert.ok(!(await A.textContent('body')).includes('\u{1F525}'), 'no fire emoji');
  assert.equal(await A.textContent('#hungerLeft'), String(12));
  await A.screenshot({ path: OUT + '1-ostrich.png' });
  await cell(A, 6, 2).click(); // step onto egg
  await V.waitForSelector('#actions.mine'); await V.click('#actions button:has-text("Throw")');
  assert.ok(await V.locator('.cell.target').count() >= 1, 'red targets');
  await V.screenshot({ path: OUT + '2-vulture-throw-mode.png' });
  await cell(V, 3, 4).click();
  await A.waitForSelector('#actions.mine'); await A.waitForTimeout(900);
  assert.ok(await A.locator('.cell.hit').count() === 1 && await V.locator('.cell.hit').count() === 1, 'hit mark on both');
  assert.equal(await A.textContent('#eggsLeft'), '2'); assert.equal(await V.textContent('#stonesLeft'), '0/1');
  // ostrich: sit 3x then must step off
  for (let k = 0; k < 3; k++) { await A.click('#actions button:has-text("Sit")'); await V.waitForSelector('#actions.mine');
    assert.ok(await V.locator('#actions button:has-text("Throw")').isDisabled(), 'no stone = no throw');
    await cell(V, k % 2 ? 4 : 4, k % 2 ? 4 : 3).click(); await A.waitForSelector('#actions.mine'); }
  assert.ok(await A.locator('#actions button:has-text("Sit")').isDisabled(), 'sit cap'); await A.screenshot({ path: OUT + '3-ostrich-sit-cap.png' });
  await A.click('#actions button:has-text("Carry")'); await cell(A, 7, 3).click();
  await V.waitForSelector('#actions.mine'); await cell(V, 4, 5).click(); await A.waitForSelector('#actions.mine');
  assert.ok(await A.locator('.ic-myegg').count() === 2, 'carried egg set down');
  await A.reload(); await A.waitForFunction(() => document.querySelectorAll('.ic-myegg').length === 2);
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close();
  console.log('PASS e2e'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
