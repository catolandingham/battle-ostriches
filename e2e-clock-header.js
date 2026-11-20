// The classic shot clock sits on its own row. EGGS must not run into the animal box.
const { webkit } = require('playwright-core');
const assert = require('assert');
process.env.PORT = '3964';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '200';
process.env.BO_CLOCKMS = '10000';
const server = require('./server.js');
(async () => {
  const b = await webkit.launch();
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => {
    for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1');
  });
  await p.goto('http://127.0.0.1:3964/');
  await p.evaluate(() => { const t = document.getElementById('tut'); if (t) t.classList.add('hidden'); });
  await p.click('#playSolo');
  await p.click('[data-bots="1"]');
  await p.click('#soloGo');
  await p.click('#lobbyGear');
  await p.click('#clockToggle');
  await p.waitForFunction(() => LobbyUI.get() && LobbyUI.get().clock === true);
  await p.click('[data-role="red"]');
  await p.click('#startGame');
  await p.waitForFunction(() => {
    const s = UI._S();
    const c = document.getElementById('clock3');
    return s && s.phase === 'play' && c && !c.classList.contains('hidden');
  }, null, { timeout: 20000 });
  const box = await p.evaluate(() => {
    const r = e => e.getBoundingClientRect();
    const eggs = document.querySelector('#stats .he');
    const tag = document.getElementById('turnTag');
    const clock = document.getElementById('clock3');
    const hud = document.getElementById('hud');
    const er = r(eggs), tr = r(tag), cr = r(clock), hr = r(hud);
    const hit = (a, b) => a.right > b.left + 1 && a.left < b.right - 1 && a.bottom > b.top + 1 && a.top < b.bottom - 1;
    return {
      overlapTag: hit(er, tr),
      overlapClock: hit(er, cr),
      eggsRight: Math.round(er.right), tagLeft: Math.round(tr.left),
      clockTop: Math.round(cr.top), eggsBottom: Math.round(er.bottom),
      inside: er.left >= hr.left - 1 && er.right <= hr.right + 1,
      text: eggs.textContent.replace(/\s+/g, ' ').trim()
    };
  });
  assert.equal(box.overlapTag, false, 'EGGS runs into the animal box ' + JSON.stringify(box));
  assert.equal(box.overlapClock, false, 'EGGS runs into the shot clock ' + JSON.stringify(box));
  assert.equal(box.inside, true, 'EGGS sits inside the header ' + JSON.stringify(box));
  assert.ok(box.clockTop >= box.eggsBottom - 1, 'the clock is on its own row under the chips ' + JSON.stringify(box));
  assert.ok(/EGGS/.test(box.text), box.text);
  assert.equal(errs.length, 0, errs.join('\n'));
  await p.screenshot({ path: 'shots/clock-header.png' });
  console.log('PASS e2e-clock-header', JSON.stringify(box));
  await b.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
