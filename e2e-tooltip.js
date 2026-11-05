// Mark tooltips: WebKit iPhone 13 (tap non-legal mark -> tip, long-press -> tip, tap legal -> still moves) + desktop hover.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = 3996; const server = require('./server.js');
fs.mkdirSync('shots/tooltip/', { recursive: true });
const init = () => { localStorage.setItem('bo_tut_seen','1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_tips_off','1'); };
async function game(ctx, name) {
  const P = await ctx.newPage(), errs = [];
  P.on('pageerror', e => errs.push(e.message)); P.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await P.addInitScript(init); await P.goto('http://localhost:3996/');
  await P.click('#playSolo'); await P.click('[data-bots="1"]'); await P.click('#soloGo'); await P.click('[data-role="red"]'); await P.click('#startGame'); await P.waitForSelector('#actions.mine', { timeout: 15000 });
  assert.equal(await P.locator('#keyBtn').count(), 0, 'map key button removed'); assert.ok(await P.isVisible('#helpBtn') || await P.locator('#helpBtn').count(), '? rules kept');
  // fly a few turns so footprints appear
  let markCell = null;
  for (let i = 0; i < 8 && !markCell; i++) {
    const r0 = await P.evaluate(() => UI._S().round), L = await P.evaluate(() => UI._legal());
    const [x, y] = L[(i * 3) % L.length]; await P.locator('.cell').nth(y * 9 + x).tap?.call ? 0 : 0;
    if (ctx._mobile) await P.locator('.cell').nth(y * 9 + x).tap(); else await P.locator('.cell').nth(y * 9 + x).click();
    await P.waitForFunction(r => { const S = UI._S(); return S.round > r && S.myTurn; }, r0, { timeout: 15000 });
    markCell = await P.evaluate(() => { const lg = new Set(UI._legal().map(p => p + '')), cs = [...document.querySelectorAll('#board .cell')];
      const i = cs.findIndex((c, i) => /^Food/.test(c.dataset.tip || '') && !lg.has([i % 9, Math.floor(i / 9)] + '')); return i < 0 ? null : i; });
  }
  assert.ok(markCell !== null, 'got a food mark on a non-legal square');
  const c = P.locator('.cell').nth(markCell);
  return { P, errs, c, markCell };
}
(async () => {
  const b = await webkit.launch();
  // phone
  const pc = await b.newContext({ ...devices['iPhone 13'] }); pc._mobile = true;
  let { P, errs, c, markCell } = await game(pc, 'phone');
  const r0 = await P.evaluate(() => UI._S().round);
  await c.tap(); await P.waitForSelector('#marktip:not(.hidden)');
  const txt = await P.textContent('#marktip'); console.log('phone tap tip:', txt); assert.match(txt, /Food/);
  await P.screenshot({ path: 'shots/tooltip/phone-tap.jpg', type: 'jpeg', quality: 85 });
  assert.equal(await P.evaluate(() => UI._S().round), r0, 'tap on non-legal mark did not move');
  // long-press on a cell with a tip via touch events
  const box = await c.boundingBox();
  const cdp = await P.evaluate(() => 0); await P.evaluate(() => document.getElementById('marktip').classList.add('hidden'));
  await P.evaluate(({ i }) => { const el = document.querySelectorAll('#board .cell')[i], r = el.getBoundingClientRect(), t = { clientX: r.x + 5, clientY: r.y + 5 }, ev = new Event('touchstart', { bubbles: true });
    Object.defineProperty(ev, 'touches', { value: [t] }); el.dispatchEvent(ev); }, { i: markCell });
  await P.waitForTimeout(600); assert.ok(await P.isVisible('#marktip'), 'long-press shows tip');
  // legal tap still moves
  await P.waitForTimeout(800);
  const L = await P.evaluate(() => UI._legal()); const [x, y] = L[0];
  await P.locator('.cell').nth(y * 9 + x).tap();
  await P.waitForFunction(r => UI._S().round > r || !UI._S().myTurn, r0, { timeout: 5000 });
  console.log('phone legal tap moved OK'); assert.deepEqual(errs, [], 'phone errors: ' + errs);
  // desktop
  const dc = await b.newContext({ viewport: { width: 1280, height: 860 } });
  ({ P, errs, c } = await game(dc, 'desk'));
  await c.hover(); await P.waitForSelector('#marktip:not(.hidden)'); console.log('desktop hover tip:', await P.textContent('#marktip'));
  await P.screenshot({ path: 'shots/tooltip/desktop-hover.jpg', type: 'jpeg', quality: 85 });
  const r1 = await P.evaluate(() => UI._S().round), L2 = await P.evaluate(() => UI._legal());
  await P.locator('.cell').nth(L2[0][1] * 9 + L2[0][0]).click();
  await P.waitForFunction(r => UI._S().round > r || !UI._S().myTurn, r1, { timeout: 5000 });
  console.log('desktop legal click moved OK'); assert.deepEqual(errs, [], 'desktop errors: ' + errs);
  await b.close(); console.log('e2e-tooltip OK'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
