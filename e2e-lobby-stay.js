// The friends room shows "Stay on this screen..." under the seat list only while a seat is open for a person.
// It must go once a friend joins or a computer fills the seat, stay on screen at phone width, and stay readable in every theme.
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = 3990; process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const U = 'http://localhost:3990/';
const THEMES = ['bw', 'classic', 'nature', 'neon', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh'];
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 375, height: 667 } }); const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off']) localStorage.setItem(k, '1'); });
    p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const line = p => p.locator('#stayLine');
  // 1. alone: the line shows under the last seat row
  const A = await mk(); await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('.openseat');
  assert.equal(await line(A).count(), 1, 'line shows with an open seat');
  assert.equal((await line(A).innerText()).trim(), 'Stay on this screen. When friends join, you\'ll see them here.');
  const geo = await A.evaluate(() => {
    const l = document.getElementById('stayLine').getBoundingClientRect(), s = document.querySelector('#roomLobby .seats').getBoundingClientRect();
    return { below: l.top >= s.bottom - 1, left: l.left, right: l.right, bottom: l.bottom, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth };
  });
  assert.ok(geo.below, 'line is under the seat list'); assert.ok(geo.left >= 0 && geo.right <= geo.vw, 'line fits at 375 wide'); assert.ok(geo.sw <= geo.vw, 'no sideways scroll');
  assert.ok(geo.bottom <= geo.vh, 'line is on screen without scrolling');
  // 2. readable in every theme: the line is drawn in the same text colour as the "You" seat row above it (the screen's own
  // body text, already checked by e2e-lobby-contrast.js), not faded, and not the old fixed grey that vanished on dark themes
  for (const th of THEMES) {
    await A.evaluate(t => { document.documentElement.dataset.theme = t; }, th);
    const v = await A.evaluate(() => {
      const el = document.getElementById('stayLine'), you = document.querySelector('#roomLobby .seats li b'); const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect(); return { color: cs.color, you: getComputedStyle(you).color, op: cs.opacity, vis: cs.visibility, w: r.width, h: r.height, right: r.right, vw: innerWidth };
    });
    assert.ok(v.w > 100 && v.h > 8 && v.right <= v.vw, th + ' line has size and fits'); assert.equal(Number(v.op), 1, th + ' not faded'); assert.equal(v.vis, 'visible');
    assert.equal(v.color, v.you, th + ' line colour matches the seat text (' + v.color + ' vs ' + v.you + ')');
  }
  await A.evaluate(() => { document.documentElement.dataset.theme = 'bw'; });
  // 3. a friend joins: the seat is filled, the line goes
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, U.slice(0, -1));
  const F = await mk(); await F.goto(link);
  await A.waitForSelector('[data-role="blue"]');
  assert.equal(await line(A).count(), 0, 'line gone on the host once a friend joined');
  assert.equal(await line(F).count(), 0, 'no line for the friend');
  // 4. a computer fills the seat: the line goes
  const C = await mk(); await C.goto(U); await C.click('#playFriend'); await C.waitForSelector('#stayLine');
  await C.click('#botPlus'); await C.waitForSelector('[data-role="blue"]');
  assert.equal(await line(C).count(), 0, 'line gone once a computer is added');
  assert.deepEqual(errs, []); console.log('e2e-lobby-stay: all passed');
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
