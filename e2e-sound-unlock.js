// Phones must not start the sound engine on touchstart or pointerdown. Only touchend or click may create it.
// WebKit uses an iPhone profile. Chromium uses an Android profile. A local server, then exit.
const { webkit, chromium, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = '3978';
process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const U = 'http://127.0.0.1:3978/';

const watch = () => {
  window.__made = [];
  let current = '';
  for (const t of ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown']) {
    document.addEventListener(t, e => { current = e.type; }, true);
  }
  const wrap = AC => {
    function W(...args) {
      window.__made.push(current || 'none');
      return new AC(...args);
    }
    W.prototype = AC.prototype;
    return W;
  };
  if (window.AudioContext) window.AudioContext = wrap(window.AudioContext);
  if (window.webkitAudioContext && window.webkitAudioContext !== window.AudioContext) window.webkitAudioContext = wrap(window.webkitAudioContext);
};

async function check(browser, device, label) {
  const ctx = await browser.newContext({ ...devices[device] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(watch);
  await page.goto(U, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SFX);
  assert.equal(await page.evaluate(() => SFX.muted), false, label + ' starts unmuted');
  assert.equal(await page.evaluate(() => SFX.state), 'none', label + ' has no engine before a tap');
  const btn = page.locator('#playSolo');
  await btn.dispatchEvent('pointerdown');
  await btn.dispatchEvent('touchstart');
  assert.deepEqual(await page.evaluate(() => window.__made), [], label + ' pointerdown and touchstart must not create the engine');
  assert.equal(await page.evaluate(() => SFX.state), 'none', label + ' still has no engine');
  await btn.dispatchEvent('touchend');
  const made = await page.evaluate(() => window.__made.slice());
  assert.deepEqual(made, ['touchend'], label + ' creates the engine on touchend, got ' + JSON.stringify(made));
  assert.notEqual(await page.evaluate(() => SFX.state), 'none', label + ' engine exists after touchend');
  const clip = await page.evaluate(() => {
    const a = document.querySelector('audio');
    return a ? { inDOM: !!a.parentNode, inline: a.hasAttribute('playsinline'), loop: a.loop, paused: a.paused } : null;
  });
  assert.ok(clip && clip.inDOM && clip.inline && clip.loop && !clip.paused, label + ' silent clip keeps looping on the page ' + JSON.stringify(clip));
  await page.evaluate(() => SFX.toggle());
  assert.equal(await page.evaluate(() => document.querySelector('audio').paused), true, label + ' mute pauses the silent clip');
  assert.equal(await page.evaluate(() => localStorage.getItem('bo_muted')), '1', label + ' mute stays on this phone');
  await page.evaluate(() => SFX.toggle());
  await ctx.close();

  const ctx2 = await browser.newContext({ ...devices[device] });
  const page2 = await ctx2.newPage();
  page2.on('pageerror', e => errs.push(String(e)));
  await page2.addInitScript(watch);
  await page2.goto(U, { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => window.SFX);
  await page2.locator('#playSolo').dispatchEvent('click');
  const clicked = await page2.evaluate(() => window.__made.slice());
  assert.deepEqual(clicked, ['click'], label + ' creates the engine on click, got ' + JSON.stringify(clicked));
  assert.equal(errs.length, 0, label + ' ' + errs.join('\n'));
  await ctx2.close();
  console.log('ok', label);
}

(async () => {
  const wk = await webkit.launch();
  await check(wk, 'iPhone 13', 'webkit iphone');
  await wk.close();
  const cr = await chromium.launch();
  await check(cr, 'Pixel 7', 'chromium android');
  await cr.close();
  server.close();
  console.log('PASS e2e-sound-unlock');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
