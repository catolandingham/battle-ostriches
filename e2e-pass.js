// Pass & play on ONE WebKit iPhone 13: full game, handoff cover between turns, and no egg positions in the vulture's DOM.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3997; const server = require('./server.js');
const OUT = 'shots/pass/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await webkit.launch(), errs = [];
  const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
  await P.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
  P.on('pageerror', e => errs.push(e.message));
  const cell = (x, y) => P.locator('.cell').nth(y * 9 + x);
  await P.goto('http://localhost:3997/');
  assert.ok(await P.isVisible('#playFriend') && await P.isVisible('#playSolo'), 'two primary choices');
  assert.ok(await P.isVisible('#playPass'), 'pass stays available');
  assert.equal(await P.locator('#playPass.big').count(), 0, 'pass is not a third primary button');
  await P.screenshot({ path: OUT + 'home.jpg', type: 'jpeg', quality: 85 });
  const pb = await P.locator('#playPass').boundingBox(); assert.ok(pb.y + pb.height < 844, 'fits screen');
  await P.click('#playPass'); assert.ok(await P.isVisible('#passGo'));
  await P.screenshot({ path: OUT + 'friend-choice.jpg', type: 'jpeg', quality: 85 });
  await P.click('#passGo');
  await P.waitForSelector('#handoff.blue'); assert.match(await P.textContent('#hGo'), /I'm the Ostrich/);
  await P.click('#hGo');
  const eggs = [[3, 4], [6, 4], [2, 1]];
  for (const [x, y] of [...eggs, [7, 1]]) { await cell(x, y).click(); await P.waitForTimeout(80); }
  const vultureTurn = async (shot) => {
    await P.waitForSelector('#handoff.red'); assert.match(await P.textContent('#hTitle'), /Pass to the Vulture 🦅/);
    assert.equal(await P.locator('#board .ic-myegg').count(), 0, 'cover: nothing behind');
    const bg = await P.evaluate(() => getComputedStyle(document.getElementById('handoff')).backgroundImage); assert.ok(/gradient/.test(bg), 'opaque cover');
    if (shot) await P.screenshot({ path: OUT + 'handoff-vulture.jpg', type: 'jpeg', quality: 85 });
    await P.click('#hGo'); await P.waitForSelector('#actions.mine', { state: 'attached' });
    assert.equal(await P.evaluate(() => document.body.className), 'red');
    assert.equal(await P.locator('#board .ic-myegg').count(), 0, 'no egg positions leak to vulture');
    assert.equal(await P.locator('.wnum').count(), 0, 'no egg timers leak');
  };
  const ostrichTurn = async (shot) => {
    await P.waitForSelector('#handoff.blue'); assert.match(await P.textContent('#hGo'), /I'm the Ostrich/);
    assert.equal(await P.locator('#board .ic-myegg').count(), 0, 'cover: nothing behind');
    if (shot) await P.screenshot({ path: OUT + 'handoff-ostrich.jpg', type: 'jpeg', quality: 85 });
    await P.click('#hGo'); await P.waitForSelector('#actions.mine', { state: 'attached' });
    assert.equal(await P.locator('#banner.yes, #banner.no').count(), 0, 'sniff banner is vulture-only');
  };
  await vultureTurn(true);
  await P.click('#actions button:has-text("Throw")', { force: true }); await cell(3, 4).click(); // smash
  await P.waitForTimeout(500); await P.screenshot({ path: OUT + 'vulture-smash.jpg', type: 'jpeg', quality: 85 });
  await ostrichTurn(true);
  assert.equal(await P.textContent('#eggsLeft'), '2'); assert.equal(await P.locator('.cell.hit').count(), 1);
  await P.screenshot({ path: OUT + 'ostrich-view.jpg', type: 'jpeg', quality: 85 });
  // play out: ostrich alternates step on/off, vulture flies around; game must end
  let rounds = 0;
  while (!(await P.locator('#over:not(.hidden)').count()) && rounds < 60) {
    rounds++;
    await P.click('#actions button:has-text("Step")', { force: true }).catch(() => {}); await P.locator('.cell.legal').first().click();
    await P.waitForFunction(() => !document.getElementById('handoff').classList.contains('hidden') || !document.getElementById('over').classList.contains('hidden'));
    if (await P.locator('#over:not(.hidden)').count()) break;
    await vultureTurn(false);
    await P.locator('.cell.legal').nth(rounds % 3).click();
    await P.waitForFunction(() => !document.getElementById('handoff').classList.contains('hidden') || !document.getElementById('over').classList.contains('hidden'));
    if (await P.locator('#over:not(.hidden)').count()) break;
    await ostrichTurn(false);
  }
  await P.waitForSelector('#over:not(.hidden)'); assert.match(await P.textContent('#over'), /(Ostrich|Vulture) wins!/);
  await P.screenshot({ path: OUT + 'over.jpg', type: 'jpeg', quality: 85 });
  console.log('rounds', rounds, 'errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-pass'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
