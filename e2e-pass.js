// Pass & play on ONE WebKit iPhone 13: full game, handoff cover between turns, and no egg positions in the vulture's DOM.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 4010; const server = require('./server.js');
const OUT = 'shots/pass/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await webkit.launch(), errs = [];
  const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
  await P.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); localStorage.setItem('bo_card_off', '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
  P.on('pageerror', e => errs.push(e.message));
  const cell = (x, y) => P.locator('.cell').nth(y * 9 + x);
  await P.goto('http://localhost:4010/');
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
    await P.waitForSelector('#handoff.red'); assert.match(await P.textContent('#hTitle'), /Pass to the Vulture/);
    assert.equal(await P.locator('#board .ic-myegg').count(), 0, 'cover: nothing behind');
    const bg = await P.evaluate(() => { const s = getComputedStyle(document.getElementById('handoff')); return { img: s.backgroundImage, col: s.backgroundColor }; }); assert.ok(/gradient/.test(bg.img) || /^rgb\(/.test(bg.col), 'opaque cover ' + JSON.stringify(bg));
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
    // The banner's yes/no styling is also used for public events the ostrich may see (Smash, An egg went cold, Ate the leaf),
    // so check what the banner says, not its colour class.
    const bnText = await P.textContent('#banner');
    assert.ok(!/egg nearby|found egg/i.test(bnText), 'sniff banner is vulture-only: ostrich banner says "' + bnText + '"');
  };
  await P.waitForFunction(()=>UI._locked()&&document.getElementById('handoff').classList.contains('hidden'));
  server.broadcast([...server.rooms.values()].find(r=>r.pass)); // duplicate while the cover timer is pending must not cancel handoff
  await vultureTurn(true);
  await P.click('#actions button:has-text("Throw")', { force: true }); await cell(3, 4).click(); if (await P.evaluate(() => !!document.querySelector('#board .cell.confirm'))) await cell(3, 4).click(); // smash (the only stone at an unfound egg asks once more)
  await P.waitForTimeout(500); await P.screenshot({ path: OUT + 'vulture-smash.jpg', type: 'jpeg', quality: 85 });
  await ostrichTurn(true);
  assert.equal(await P.textContent('#eggsLeft'), '2'); assert.equal(await P.locator('.cell.hit').count(), 1);
  await P.screenshot({ path: OUT + 'ostrich-view.jpg', type: 'jpeg', quality: 85 });
  // Since 2026-11-11 the ostrich is shown the smash on its own turn and has to tap "Tap to go on." before it can move (taps on the board are ignored until then).
  // The button comes after the cartoon and goes by itself after 8 s, so wait for it or for the end of the cartoon, and tap it if it is there.
  await P.waitForFunction(() => !!document.querySelector('#surprise-go button') || !(window.CUTAWAYS && CUTAWAYS.busy()), null, { timeout: 20000 });
  if (await P.locator('#surprise-go button').count()) await P.click('#surprise-go button', { timeout: 3000 }).catch(() => {});
  await P.waitForFunction(() => !(window.CUTAWAYS && CUTAWAYS.busy()), null, { timeout: 12000 });
  // play out: ostrich alternates step on/off, vulture flies around; game must end
  let rounds = 0;
  while (!(await P.locator('#over:not(.hidden)').count()) && rounds < 60) {
    rounds++;
    await P.click('#actions button:has-text("Walk")', { force: true }).catch(() => {}); await P.locator('.cell.legal').first().click();
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
