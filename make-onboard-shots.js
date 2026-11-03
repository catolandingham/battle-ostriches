// Captures the onboarding: 3 intro cards + live coach marks for both roles + a just-in-time tip. -> shots/onboarding/
const { webkit, devices } = require('playwright-core');
process.env.PORT = 3996; const server = require('./server.js');
(async () => {
  const b = await webkit.launch(); const U = 'http://localhost:3996/', O = 'shots/onboarding/';
  const mk = async (seed) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(s => { for (const k of s) localStorage.setItem(k, '1'); }, seed); return p; };
  const tips = ['hit','feather','spotted','smell','fake','carry','setdown','fakebtn','vtracks','rocks'].map(t => 'bo_tip_' + t);
  const I = await mk([]); await I.goto(U); await I.waitForSelector('#tut:not(.hidden)');
  for (let k = 1; k <= 3; k++) { await I.waitForTimeout(150); await I.screenshot({ path: O + `intro-${k}.png` }); if (k < 3) await I.click('#tutNext'); }
  const A = await mk(['bo_tut_seen', ...tips]), V = await mk(['bo_tut_seen', ...tips]);
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const coach = (p, re) => p.waitForFunction(r => new RegExp(r).test(document.getElementById('coach').textContent) && !document.getElementById('coach').classList.contains('hidden'), re);
  const myTurn = p => p.waitForFunction(() => document.querySelector('#actions.mine'));
  const shot = async (p, n) => { await p.waitForTimeout(250); await p.screenshot({ path: O + n + '.png' }); };
  await A.goto(U); await A.click('#playFriend'); await A.click('#roleBlue'); await A.waitForSelector('#shareCode:not(:empty)');
  await V.goto(await A.inputValue('#shareLink')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[0, 0], [8, 6], [4, 5], [0, 0]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  await coach(V, 'Fly'); await shot(V, 'vulture-1-fly'); await cell(V, 3, 3).click();
  await coach(A, 'step'); await shot(A, 'ostrich-1-step'); await cell(A, 1, 1).click();
  await coach(V, 'Throw'); await shot(V, 'vulture-2-throw'); await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, 3, 4).click();
  await V.waitForTimeout(400); console.log('toast:', await V.evaluate(() => { const t = document.getElementById('toast'); return t ? t.className + '|' + t.textContent : 'none'; }), await V.textContent('#hint')); await shot(V, 'tip-miss');
  await myTurn(A); await cell(A, 0, 0).click();
  await myTurn(V); await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, 2, 2).click();
  await coach(A, 'Sit'); await shot(A, 'ostrich-2-sit'); await A.click('#actions button:has-text("Sit")', { force: true });
  await myTurn(V); await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, 4, 4).click();
  await myTurn(A); await A.click('#actions button:has-text("Sit")', { force: true });
  await coach(V, 'rock'); await shot(V, 'vulture-3-rock'); await cell(V, 2, 1).click();
  await myTurn(A); await A.waitForTimeout(300);
  await A.waitForTimeout(500); console.log('A dbg', await A.evaluate(() => document.getElementById('coach').className + '|' + document.getElementById('coach').textContent + '|' + localStorage.getItem('bo_cs_blue')), await A.textContent('#hint'), await A.locator('.food').count());
  await coach(A, 'eat'); await shot(A, 'ostrich-3-eat');
  console.log('onboarding shots ok'); await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
