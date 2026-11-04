// Mid-game WebKit iPhone screenshots of every theme, both roles -> shots/themes/
const { webkit, devices } = require('playwright-core'); const fs = require('fs');
process.env.PORT = 3997; require('./server.js'); fs.mkdirSync('shots/themes', { recursive: true });
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); ['bo_tut_seen','bo_tut_blue','bo_tut_red'].forEach(k => localStorage.setItem(k, '1')); }); return p; };
  const A = await mk(), V = await mk(), U = 'http://localhost:3997/';
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const myTurn = (p, t) => p.waitForFunction(t => document.getElementById('actions').textContent.includes(t), t);
  const red = async (a, x, y) => { await myTurn(V, 'Throw'); await V.click(`#actions button:has-text("${a}")`); await cell(V, x, y).click(); };
  const T = ['classic', 'nature', 'neon'];
  for (const t of T) { await A.goto(U + '?theme=' + t); await A.waitForTimeout(150); await A.screenshot({ path: `shots/themes/${t}-title.png` }); }
  await A.goto(U); await A.evaluate(() => THEME.set('classic'));
  await A.click('#themeBtn2'); if (await A.evaluate(() => THEME.get()) !== 'nature') throw 'toggle failed';
  await A.click('#playFriend'); await A.click('#twoPhones'); await A.waitForSelector('#shareCode:not(:empty)');
  await V.goto(await A.inputValue('#shareLink')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  await cell(A, 0, 0).click(); await A.waitForTimeout(100); await cell(A, 8, 6).click(); await A.waitForTimeout(100);
  await cell(A, 4, 5).click(); await A.waitForTimeout(100); await cell(A, 0, 0).click();
  await red('Throw', 4, 4); await myTurn(A, 'Step'); await A.click('#actions button:has-text("Sit")');
  await red('Fly', 3, 3); await myTurn(A, 'Step'); await cell(A, 1, 1).click();
  await red('Throw', 2, 2); await myTurn(A, 'Step'); await cell(A, 0, 0).click();
  await myTurn(V, 'Throw'); await V.waitForTimeout(200);
  for (const t of T) { for (const p of [A, V]) await p.evaluate(x => THEME.set(x), t); await A.waitForTimeout(200);
    await A.screenshot({ path: `shots/themes/${t}-ostrich.png` }); await V.screenshot({ path: `shots/themes/${t}-vulture.png` }); }
  console.log('theme shots ok'); await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
