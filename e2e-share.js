// Share-first: "Two phones" shows the code + link first, then you pick your side under it; during play the header has no room code.
// Also checks iPhone sound: after a tap the WebAudio context is 'running' and the mute default is off. Screenshots in shots/share/.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3994; const server = require('./server.js');
const OUT = 'shots/share/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3994/';
  await A.goto(U); assert.equal(await A.evaluate(() => SFX.muted), false, 'sound on by default');
  await A.click('#playFriend'); await A.click('#twoPhones');
  await A.waitForSelector('#shareCode:not(:empty)'); assert.ok(!(await A.isVisible('#roleBlue')), 'no role step before sharing');
  await A.waitForSelector('#seatPick button[data-seat="red"]'); await A.waitForTimeout(400);
  assert.equal(await A.evaluate(() => SFX.state), 'running', 'AudioContext running after a tap');
  await A.screenshot({ path: OUT + '1-share-first.jpg', type: 'jpeg', quality: 85 });
  await A.click('#seatPick button[data-seat="red"]'); await A.waitForFunction(() => document.body.className.includes('red'));
  await A.screenshot({ path: OUT + '2-picked-vulture.jpg', type: 'jpeg', quality: 85 });
  const link = await A.inputValue('#shareLink'); const code = (await A.textContent('#shareCode')).trim();
  await V.goto(link); await V.waitForFunction(() => document.body.className.includes('blue'));
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'), null, { timeout: 8000 });
  await A.waitForTimeout(800);
  for (const P of [A, V]) { const hud = await P.textContent('#hud'); assert.ok(!hud.includes(code), 'room code in in-game header: ' + hud);
    assert.ok(!(await P.isVisible('#seatPick')), 'seat picker gone during play'); }
  await A.screenshot({ path: OUT + '3-ingame-no-code.jpg', type: 'jpeg', quality: 85 });
  // vulture on a found egg: egg + vulture both drawn INSIDE that one cell, in every theme (was offset onto the gridline crossing)
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 5]]) { await V.locator('.cell').nth(y * 9 + x).click(); await V.waitForTimeout(150); }
  await A.waitForSelector('#actions.mine'); await V.waitForTimeout(300);
  for (const th of ['classic', 'arcade', 'comic', 'golden', 'nature', 'neon', 'notes', 'paper', 'pharaoh', 'storm', 'tactical', 'toybox', 'volcano']) {
    for (const [P, who] of [[A, 'vulture'], [V, 'ostrich']]) {
      const r = await P.evaluate(th => { if (th === 'classic') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = th;
        const S = UI._S(); S.vulture = [3, 4]; S.marks['3,4'] = 'spotted'; UI._rr();
        const c = document.querySelectorAll('.cell')[4 * 9 + 3], cb = c.getBoundingClientRect(), ic = c.querySelector('.ic-spot,.ic-myegg'), pv = c.querySelector('.pc.pv');
        if (!ic || !pv) return { miss: true, cls: c.className };
        const ins = e => { const b = e.getBoundingClientRect(); return b.left >= cb.left - 1 && b.top >= cb.top - 1 && b.right <= cb.right + 1 && b.bottom <= cb.bottom + 1; };
        return { egg: ins(ic), vul: ins(pv), cls: c.className }; }, th);
      assert.ok(!r.miss && r.egg && r.vul, `${th}/${who}: egg and vulture inside the cell ${JSON.stringify(r)}`);
      if (th === 'classic' || th === 'neon') await P.screenshot({ path: OUT + `4-vulture-on-egg-${who}-${th}.jpg`, type: 'jpeg', quality: 85 });
    } }
  console.log('e2e-share PASSED'); await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
