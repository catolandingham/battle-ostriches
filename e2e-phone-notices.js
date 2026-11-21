process.env.PORT = '3991';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '900000';
process.env.BO_CLOCKMS = '900000';
const { webkit, chromium } = require('playwright-core');
const assert = require('assert');
require('./server.js');
const U = 'http://127.0.0.1:3991/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(browser, name, viewport) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(U);
  await p.tap('#playSolo');
  await p.tap('[data-bots="1"]');
  await p.tap('#soloGo');
  await p.waitForSelector('[data-role="blue"]');
  await p.tap('[data-role="blue"]');
  await p.tap('#startGame');
  await p.waitForSelector('#tut h2', { timeout: 15000 });
  const titles = [];
  for (let i = 0; i < 3; i++) {
    titles.push(await p.locator('#tutT').innerText());
    await p.tap('#tutNext');
    await sleep(200);
  }
  assert.equal(titles.length, 3, name + ' three cards');
  assert.ok(/ostrich/i.test(titles[0]), name + ' first card names the animal: ' + titles.join(' | '));
  await p.waitForSelector('#board .cell', { timeout: 15000 });
  const card = p.locator('#rolecard .rok');
  if (await card.count()) await card.tap();
  const round = (await p.locator('#hud .ctr').innerText()).replace(/\s+/g, ' ');
  assert.ok(/^Round \d+$/.test(round), name + ' round visible: ' + round);
  const box = await p.locator('#hud .ctr').boundingBox();
  assert.ok(box && box.width > 20 && box.height > 8, name + ' round is on screen');
  await p.tap('#moreBtn');
  await p.tap('#menuRules');
  await p.waitForSelector('#rolecard h2, #rolecard .rwho');
  const rules = await p.locator('#rolecard').innerText();
  assert.ok(rules.includes('Rules for this game'), name + ' rules title: ' + rules.slice(0, 180));
  assert.ok(/egg/i.test(rules), name + ' rules mention eggs');
  assert.equal(await p.locator('text=Replay tips').count(), 0, name + ' no Replay tips button');
  const eggs = await p.locator('#eggsLeft').innerText();
  assert.ok(/^\d+\/\d+$/.test(eggs), name + ' egg chip is a count: ' + eggs);
  const sound = await p.locator('#muteBtn').getAttribute('aria-label');
  assert.ok(/off/i.test(sound || ''), name + ' sound starts off: ' + sound);
  assert.equal(errs.length, 0, name + ' page errors ' + errs.join('; '));
  console.log('ok', name, titles.join(' / '), round);
  await c.close();
}
async function three(browser, name, viewport) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await c.newPage();
  await p.addInitScript(() => { localStorage.setItem('bo_card_off', '1'); localStorage.setItem('bo_tips_off', '1'); });
  await p.goto(U);
  await p.tap('#playSolo');
  await p.tap('[data-bots="2"]');
  await p.tap('#soloGo');
  await p.waitForSelector('[data-role="blue"]');
  await p.tap('[data-role="blue"]');
  await p.tap('#startGame');
  await p.waitForSelector('#board .cell', { timeout: 20000 });
  const tut = p.locator('#tutNext');
  if (await tut.count() && await tut.isVisible()) { for (let i = 0; i < 3; i++) { if (!(await tut.isVisible())) break; await tut.tap(); await sleep(150); } }
  const before = (await p.locator('#hud .ctr').innerText()).replace(/\s+/g, ' ');
  assert.ok(/^Round \d+$/.test(before), name + ' round before timer: ' + before);
  await p.tap('#timerToggle');
  await sleep(250);
  const after = (await p.locator('#hud .ctr').innerText()).replace(/\s+/g, ' ');
  assert.ok(/^Round \d+$/.test(after), name + ' round with the timer changed: ' + after);
  const clock = await p.locator('#clock3').boundingBox();
  const roundBox = await p.locator('#hud .ctr').boundingBox();
  assert.ok(roundBox && roundBox.width > 20, name + ' round stays on screen');
  console.log('ok', name, before, 'clock', clock ? 'shown' : 'hidden');
  await c.close();
}

(async () => {
  const w = await webkit.launch();
  await run(w, 'iPhone WebKit', { width: 390, height: 664 });
  await three(w, 'iPhone 3-player', { width: 390, height: 664 });
  await run(w, 'Pixel-size WebKit', { width: 412, height: 915 });
  await w.close();
  if (process.env.CHROME) {
    const c = await chromium.launch({ executablePath: process.env.CHROME });
    await run(c, 'Pixel Chromium', { width: 412, height: 915 });
    await three(c, 'Pixel 3-player Chromium', { width: 412, height: 915 });
    await c.close();
  }
  console.log('PASS phone notices');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
