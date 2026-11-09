// Captures a few of the newly approved cartoons on the real phone board.
process.env.PORT = '4211'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '900000';
const path = require('path'), fs = require('fs');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, '..', 'node_modules', '.pw-browsers');
const { webkit } = require('playwright-core');
const server = require('../server'), T = require('../three'), H = require('../hunt'), B = require('../game');
const OUT = process.argv[2] || '/tmp/cutaway-new';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await webkit.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_muted']) localStorage.setItem(k, '1'); });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://localhost:4211/');
  await p.evaluate(() => UI.open({ t: 'create', three: true, role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }));
  await p.waitForSelector('#board .cell');
  const room = () => [...server.rooms.values()].find(r => r.three);
  for (const pos of [[2, 1], [6, 1], [2, 5]]) { if (!B.placeEgg(room().g, pos)) throw new Error('egg'); server.broadcast(room()); }
  if (!T.placeOstrich3(room().g, [4, 4])) throw new Error('place'); server.broadcast(room());
  const settle = () => p.waitForFunction(() => !document.querySelector('#cutaway,#boardhold,.push-motion'), null, { timeout: 6000 });
  await settle();
  async function shot(name, times) {
    const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    for (const t of times) { const w = t - (Date.now() - t0); if (w > 0) await sleep(w); await p.screenshot({ path: path.join(dir, String(t).padStart(4, '0') + '.png') }); }
    console.log(name, await p.getAttribute('#cutaway', 'data-scene').catch(() => 'gone'));
  }
  const g = () => room().g;
  g().turn = 'blue'; g().ostrich = [3, 3]; g().vulture = [4, 3]; g().three.h = [8, 6]; g().lastKick = null; server.broadcast(room()); await settle();
  if (!server.act3(room(), 'blue', { a: 'kick', p: [4, 3] })) throw new Error('kick vulture'); server.broadcast(room());
  await p.waitForSelector('#cutaway');
  await shot('kick-vulture', [200, 600, 1200, 1900]);
  await settle();
  g().three.kind = 'badger'; g().turn = 'hunter'; g().three.h = [3, 3]; g().three.burrowed = false; g().three.pounce = false;
  g().ostrich = [4, 3]; g().vulture = [8, 6]; g().three.birds.blue.catches = 0; g().three.birds.blue.out = false; g().phase = 'play';
  server.broadcast(room()); await settle();
  if (!server.act3(room(), 'hunter', { a: 'hmove', p: [4, 3] })) throw new Error('badger catch'); server.broadcast(room());
  await p.waitForSelector('#cutaway');
  await shot('catch-badger', [200, 800, 1600, 1950]);
  await settle();
  g().phase = 'play'; g().turn = 'blue'; g().ostrich = [4, 4]; g().carrying = 0; if (g().eggs[0]) g().eggs[0].pos = null; server.broadcast(room()); await sleep(500);
  console.log('carry src', await p.evaluate(() => { const img = document.querySelector('#board .pc.po.carrying img'); return img && img.getAttribute('src'); }));
  await p.screenshot({ path: path.join(OUT, 'carry-board.png') });
  await p.locator('#board .pc.po.carrying').screenshot({ path: path.join(OUT, 'carry-icon.png') });
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
