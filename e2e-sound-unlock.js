// Sound stays off until the speaker button. WebKit uses an iPhone. Chromium uses a Pixel.
// A Play tap, pointerdown, and touchstart must not create the engine. The sound button does, inside that tap.
const { webkit, chromium, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = '3978';
process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const U = 'http://127.0.0.1:3978/';
const ART = '/opt/cursor/artifacts';

const watch = () => {
  window.__made = [];
  window.__gains = [];
  let current = '';
  for (const t of ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown']) {
    document.addEventListener(t, e => { current = e.type; }, true);
  }
  const wrap = AC => {
    function W(...args) {
      const ctx = new AC(...args);
      window.__made.push(current || 'none');
      window.__ctx = ctx;
      const gain = AC.prototype.createGain;
      ctx.createGain = function () {
        const g = gain.apply(this, arguments);
        const connect = g.connect.bind(g);
        g.connect = function (dest) {
          if (dest === ctx.destination) window.__master = g;
          return connect(dest);
        };
        window.__gains.push(g);
        return g;
      };
      return ctx;
    }
    W.prototype = AC.prototype;
    return W;
  };
  if (window.AudioContext) window.AudioContext = wrap(window.AudioContext);
  if (window.webkitAudioContext && window.webkitAudioContext !== window.AudioContext) window.webkitAudioContext = wrap(window.webkitAudioContext);
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const osc = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function () {
      window.__osc = (window.__osc || 0) + 1;
      return osc.apply(this, arguments);
    };
  }
};

const shot = async (page, name) => { try { fs.mkdirSync(ART, { recursive: true }); await page.locator('#lobby').screenshot({ path: ART + '/' + name }); } catch (e) {} };

async function check(browser, device, label, pictures) {
  const ctx = await browser.newContext({ ...devices[device] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
  await page.addInitScript(watch);
  await page.goto(U, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SFX);
  assert.equal(await page.evaluate(() => SFX.muted), true, label + ' starts off');
  assert.equal(await page.evaluate(() => SFX.state), 'none', label + ' has no engine');
  assert.equal(await page.evaluate(() => localStorage.getItem('bo_muted')), null, label + ' a new phone has no saved choice');
  await page.evaluate(() => SFX.play('turn'));
  assert.deepEqual(await page.evaluate(() => window.__made), [], label + ' a robot-style play does not start the engine');
  const off = await page.evaluate(() => {
    const b = document.getElementById('soundBtn');
    return { label: b.getAttribute('aria-label'), slash: /M16 9l5 6/.test(b.innerHTML), waves: /M15\.5 8\.5/.test(b.innerHTML) };
  });
  assert.equal(off.label, 'Sound off', label + ' title button says Sound off');
  assert.ok(off.slash && !off.waves, label + ' the off glyph has a slash');
  if (pictures) await shot(page, 'sound-title-off.png');
  const play = page.locator('#playSolo');
  await play.dispatchEvent('pointerdown');
  await play.dispatchEvent('touchstart');
  await play.dispatchEvent('touchend');
  await play.dispatchEvent('click');
  assert.deepEqual(await page.evaluate(() => window.__made), [], label + ' Play does not create the engine');
  assert.equal(await page.evaluate(() => SFX.state), 'none', label + ' still off after Play');
  await page.locator('#soloBack').click();
  await page.waitForSelector('#homeStep:not(.hidden)');
  await page.locator('#soundBtn').dispatchEvent('touchend');
  assert.deepEqual(await page.evaluate(() => window.__made.slice()), ['touchend'], label + ' the sound button creates the engine on touchend');
  assert.equal(await page.evaluate(() => SFX.state), 'running', label + ' engine is running inside that tap');
  const clip = await page.evaluate(() => {
    const a = document.querySelector('audio');
    return { inDOM: !!(a && a.parentNode), loop: !!(a && a.loop), paused: !!(a && a.paused) };
  });
  assert.deepEqual(clip, { inDOM: true, loop: true, paused: false }, label + ' silent clip ' + JSON.stringify(clip));
  const before = await page.evaluate(() => window.__osc || 0);
  await page.evaluate(() => SFX.play('turn'));
  assert.ok(await page.evaluate(() => window.__osc) > before, label + ' a tone plays while running');
  const on = await page.evaluate(() => {
    const b = document.getElementById('soundBtn');
    return { label: b.getAttribute('aria-label'), slash: /M16 9l5 6/.test(b.innerHTML), waves: /M15\.5 8\.5/.test(b.innerHTML) };
  });
  assert.equal(on.label, 'Sound on', label + ' title button says Sound on');
  assert.ok(on.waves && !on.slash, label + ' the on glyph has no slash');
  if (pictures) await shot(page, 'sound-title-on.png');
  assert.equal(await page.evaluate(() => localStorage.getItem('bo_muted')), '0', label + ' on is saved');
  await page.locator('#soundBtn').dispatchEvent('touchend');
  assert.equal(await page.evaluate(() => SFX.muted), true, label + ' the second tap turns sound off');
  assert.equal(await page.evaluate(() => document.querySelector('audio').paused), true, label + ' mute pauses the clip');
  await page.waitForFunction(() => window.__master && window.__master.gain.value === 0);
  assert.equal(await page.evaluate(() => window.__master.gain.value), 0, label + ' mute sets the volume to 0');
  assert.equal(await page.evaluate(() => localStorage.getItem('bo_muted')), '1', label + ' off is saved');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SFX);
  assert.equal(await page.evaluate(() => SFX.muted), true, label + ' off persists across reload');
  assert.equal(await page.evaluate(() => SFX.state), 'none', label + ' reload does not start the engine');
  await ctx.close();

  const ctxOn = await browser.newContext({ ...devices[device] });
  await ctxOn.addInitScript(() => { localStorage.setItem('bo_muted', '0'); localStorage.setItem('bo_tut_seen', '1'); });
  const onPage = await ctxOn.newPage();
  onPage.on('pageerror', e => errs.push(String(e)));
  await onPage.addInitScript(watch);
  await onPage.goto(U, { waitUntil: 'domcontentloaded' });
  await onPage.waitForFunction(() => window.SFX);
  assert.equal(await onPage.evaluate(() => SFX.muted), false, label + ' a saved on stays on');
  assert.equal(await onPage.evaluate(() => SFX.state), 'none', label + ' a saved on does not autoplay');
  await onPage.locator('#playSolo').dispatchEvent('click');
  assert.equal(await onPage.evaluate(() => SFX.state), 'running', label + ' the next click resumes a saved on');
  await onPage.evaluate(() => window.__ctx.suspend());
  await onPage.waitForFunction(() => SFX.state === 'suspended');
  await onPage.waitForTimeout(250);
  assert.equal(await onPage.evaluate(() => SFX.state), 'suspended', label + ' a suspended engine does not resume by itself');
  await onPage.locator('#playFriend').dispatchEvent('click');
  await onPage.waitForFunction(() => SFX.state === 'running');
  assert.equal(await onPage.evaluate(() => SFX.state), 'running', label + ' the next click resumes it');
  await ctxOn.close();

  const host = await browser.newContext({ ...devices[device] });
  await host.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
  const A = await host.newPage();
  A.on('pageerror', e => errs.push(String(e)));
  await A.goto(U);
  await A.click('#playFriend');
  await A.waitForSelector('#lobbySound');
  const roomOff = await A.evaluate(() => document.getElementById('lobbySound').getAttribute('aria-label'));
  assert.equal(roomOff, 'Sound off', label + ' the room screen starts off');
  if (pictures) await shot(A, 'sound-room-off.png');
  await A.locator('#lobbySound').click();
  await A.waitForFunction(() => SFX.state === 'running');
  assert.equal(await A.evaluate(() => document.getElementById('lobbySound').getAttribute('aria-label')), 'Sound on', label + ' the room button turns sound on');
  if (pictures) await shot(A, 'sound-room-on.png');
  const link = await A.inputValue('#lobbyLink');
  const guest = await browser.newContext({ ...devices[device] });
  await guest.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
  const V = await guest.newPage();
  await V.goto(link);
  await V.waitForSelector('#lobbySound');
  assert.equal(await V.evaluate(() => SFX.state), 'none', label + ' a shared link stays silent until its own button');
  await host.close();
  await guest.close();
  assert.equal(errs.length, 0, label + ' ' + errs.join('\n'));
  console.log('ok', label);
}

(async () => {
  const wk = await webkit.launch();
  await check(wk, 'iPhone 13', 'webkit iphone', true);
  await wk.close();
  const cr = await chromium.launch();
  await check(cr, 'Pixel 7', 'chromium android', false);
  await cr.close();
  server.close();
  console.log('PASS e2e-sound-unlock');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
