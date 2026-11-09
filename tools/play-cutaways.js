// Plays each cartoon on a phone-sized WebKit page and saves frames.
// Usage: node tools/play-cutaways.js <outdir>
process.env.PORT = process.env.PORT || '4195';
process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '900000';
const path = require('path'), fs = require('fs');
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(__dirname, '..', 'node_modules', '.pw-browsers');
const { webkit } = require('playwright-core');
const server = require('../server'), T = require('../three'), H = require('../hunt');
const OUT = process.argv[2] || '/tmp/cutaway-play';
fs.mkdirSync(OUT, { recursive: true });
const U = 'http://localhost:' + process.env.PORT + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_muted']) localStorage.setItem(k, '1'); });
  await page.goto(U);
  await page.evaluate(() => UI.open({ t: 'create', three: true, role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }));
  await page.waitForSelector('#board .cell');
  const room = () => [...server.rooms.values()].find(r => r.three);
  // hide the eggs and stand the ostrich through the real rules, then show that board
  const B = require('../game');
  for (const p of [[2, 1], [6, 1], [2, 5]]) { if (!B.placeEgg(room().g, p)) throw new Error('egg ' + p); server.broadcast(room()); await sleep(40); }
  if (!T.placeOstrich3(room().g, [4, 4])) throw new Error('start square'); server.broadcast(room()); await sleep(80);
  const settle = async () => { await page.waitForFunction(() => !document.querySelector('#cutaway,#boardhold,.push-motion'), null, { timeout: 6000 }); await sleep(80); };
  await settle();
  async function frames(name, times) {
    const t0 = Date.now(), dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    for (const t of times) { const w = t - (Date.now() - t0); if (w > 0) await sleep(w); await page.screenshot({ path: path.join(dir, String(t).padStart(4, '0') + '.png') }); }
    const id = await page.evaluate(() => { const c = document.getElementById('cutaway'); return c && c.dataset.scene; }).catch(() => null);
    console.log(name, 'scene-at-end', id);
  }
  const g = () => room().g;
  // 1. plain kick
  g().turn = 'blue'; g().ostrich = [3, 3]; g().vulture = [8, 6]; g().three.h = [4, 3]; g().three.pounce = false; g().three.kind = 'hyena'; server.broadcast(room()); await settle();
  if (!server.act3(room(), 'blue', { a: 'kick', p: [4, 3] })) throw new Error('kick failed'); server.broadcast(room());
  await page.waitForSelector('#cutaway');
  console.log('kick', await page.getAttribute('#cutaway', 'data-scene'));
  await frames('kick', [120, 400, 800, 1200, 1600, 1900]);
  await settle();
  // 2. wrap kick, to the right off the edge
  g().turn = 'blue'; g().ostrich = [7, 3]; g().vulture = [0, 6]; g().three.h = [8, 3]; g().lastKick = null; server.broadcast(room()); await settle();
  if (!server.act3(room(), 'blue', { a: 'kick', p: [8, 3] })) throw new Error('wrap kick failed ' + JSON.stringify(g().three.h)); server.broadcast(room());
  await page.waitForSelector('#cutaway');
  console.log('wrap', await page.getAttribute('#cutaway', 'data-scene'), 'landed', g().three.h);
  await frames('kick-wrap', [120, 400, 700, 1000, 1300, 1650, 1900]);
  await settle();
  // 3. catch
  g().turn = 'hunter'; g().three.h = [3, 3]; g().three.pounce = false; g().ostrich = [4, 3]; g().vulture = [8, 6]; g().three.birds.blue.catches = 0; server.broadcast(room()); await settle();
  if (!server.act3(room(), 'hunter', { a: 'hmove', p: [4, 3] })) throw new Error('catch failed'); server.broadcast(room());
  await page.waitForSelector('#cutaway');
  console.log('catch', await page.getAttribute('#cutaway', 'data-scene'));
  await frames('catch', [120, 400, 900, 1400, 1700, 1950]);
  await settle();
  // 4. knockout (one heart already gone)
  g().turn = 'hunter'; g().three.birds.blue.catches = 1; g().three.birds.blue.out = false; g().phase = 'play'; g().three.h = [5, 3]; g().ostrich = [6, 3]; g().vulture = [0, 0]; g().three.pounce = false; server.broadcast(room()); await settle();
  if (!server.act3(room(), 'hunter', { a: 'hmove', p: [6, 3] })) throw new Error('ko failed'); server.broadcast(room());
  await page.waitForSelector('#cutaway');
  console.log('ko', await page.getAttribute('#cutaway', 'data-scene'), 'out', g().three.birds.blue.out);
  await frames('knockout', [120, 500, 1000, 1400, 1700, 1950]);
  await settle();
  // 5. stone
  g().phase = 'play'; g().turn = 'red'; g().vulture = [3, 3]; g().ostrich = [3, 5]; g().three.h = [4, 3]; g().stones = 1; g().three.birds.blue.out = false; server.broadcast(room()); await settle();
  if (!T.vultureThrow3(g(), [4, 3])) throw new Error('stone failed'); server.broadcast(room());
  await page.waitForSelector('#cutaway');
  console.log('stone', await page.getAttribute('#cutaway', 'data-scene'));
  await frames('stone', [120, 400, 900, 1400, 1700, 1950]);
  await settle();
  // carry icon, three themes
  g().turn = 'blue'; g().ostrich = [4, 4]; g().carrying = 0; g().eggs[0].pos = null; g().eggs[0].alive = true; server.broadcast(room()); await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'carry-bw.png') });
  const cell = await page.locator('#board .cell').nth(4 * 9 + 4).screenshot({ path: path.join(OUT, 'carry-cell-bw.png') });
  for (const theme of ['classic', 'neon']) {
    await page.evaluate(t => THEME.set(t), theme); await sleep(200);
    await page.locator('#board .cell').nth(4 * 9 + 4).screenshot({ path: path.join(OUT, 'carry-cell-' + theme + '.png') });
  }
  await page.evaluate(() => THEME.set('bw'));
  // 6. burst needs both hunters. A fresh Hunters room, this phone is the ostrich.
  await page.evaluate(() => UI.open({ t: 'create', hunt: true, role: 'blue', bots: ['red', 'hyena', 'badger'] }));
  await page.waitForSelector('#board .cell');
  const hunt = () => [...server.rooms.values()].find(r => r.hunt);
  const B2 = require('../game');
  for (const p of [[2, 1], [6, 1], [2, 5]]) { if (!B2.placeEgg(hunt().g, p)) throw new Error('hunt egg ' + p); server.broadcast(hunt()); await sleep(30); }
  if (!H.placeOstrichH(hunt().g, [4, 4])) throw new Error('hunt start'); server.broadcast(hunt()); await sleep(80);
  await page.waitForFunction(() => UI._S() && UI._S().phase === 'play', null, { timeout: 15000 }).catch(() => {});
  // computers may still be placing; force a play state
  const hg = hunt().g;
  hg.phase = 'play'; hg.turn = 'badger'; hg.ostrich = [4, 5]; hg.vulture = [0, 0];
  hg.hunt.hs.badger.p = [4, 3]; hg.hunt.hs.badger.burrowed = true; hg.hunt.hs.badger.pounce = false;
  hg.hunt.hs.hyena.p = [4, 3]; hg.hunt.hs.hyena.came = { to: [4, 3], dir: [1, 0] };
  server.broadcast(hunt()); await settle();
  if (!H.hunterBurst(hg)) throw new Error('burst failed'); server.broadcast(hunt());
  await page.waitForSelector('#cutaway', { timeout: 4000 });
  console.log('burst', await page.getAttribute('#cutaway', 'data-scene'));
  await frames('burst', [120, 400, 800, 1200, 1600, 1900]);
  console.log('errors', errors);
  await context.close();
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
