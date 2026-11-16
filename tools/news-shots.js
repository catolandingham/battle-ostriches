// Phone screenshots of news colours. 390 x 664. Black and white, then Classic.
// Each pair is the old look, then the look this phone gets now.
// Run from the repo root: node tools/news-shots.js
process.env.PORT = process.env.PORT || '3077';
process.env.BO_NOSTORE = '1';
process.env.BO_CLOCKMS = '600000';
process.env.BO_BOTMS = '600000';
const fs = require('fs'), path = require('path');
const { webkit } = require('playwright-core');
const server = require('../server.js');
const OUT = process.env.NEWS_SHOTS || '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });
const U = 'http://127.0.0.1:' + process.env.PORT + '/';

(async () => {
  const browser = await webkit.launch();
  const mk = async () => {
    const c = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1');
      ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9'));
    });
    p.on('pageerror', e => console.log('pageerror', e.message));
    return p;
  };
  const O = await mk(), V = await mk();
  const cell = (p, x, y) => p.locator('#board .cell').nth(y * 9 + x);
  await O.goto(U + '?theme=bw');
  await O.click('#playFriend');
  await O.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await O.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://127.0.0.1:' + process.env.PORT);
  await V.goto(link + (link.includes('?') ? '&' : '?') + 'theme=bw');
  await V.waitForSelector('#roomLobby');
  await O.click('#startGame');
  await O.waitForSelector('#board .cell');
  await V.waitForSelector('#board .cell');
  await O.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 2]]) { await cell(O, x, y).click(); await O.waitForTimeout(80); }
  await V.waitForSelector('#actions.mine', { state: 'attached' });
  const paint = ({ text, cls, id }) => {
    if (window.STATUS_QUEUE) STATUS_QUEUE.clear();
    STATUS_QUEUE.add({ id: id || 'announce', className: cls, text, priority: 200, hold: 120000, preempt: true });
  };
  const colour = () => {
    const e = document.querySelector('#msgslot > .status-active') || document.getElementById('announce');
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { text: e.textContent, cls: e.className, bg: s.backgroundColor, fg: s.color, vis: s.visibility, top: Math.round(r.top), h: Math.round(r.height) };
  };
  const notes = [];
  for (const theme of ['bw', 'classic']) {
    for (const p of [O, V]) await p.evaluate(t => THEME.set(t), theme);
    await O.waitForTimeout(200);
    // Ostrich: a found egg used to be the good-news green (class yes). It is bad for this phone.
    const found = 'Vulture found your egg!';
    await O.evaluate(paint, { text: found, cls: 'yes', id: 'snpop' });
    await O.waitForFunction(t => { const e = document.querySelector('#msgslot > .status-active'); return e && e.textContent === t && getComputedStyle(e).visibility === 'visible'; }, found);
    notes.push({ theme, who: 'ostrich', when: 'before', ...(await O.evaluate(colour)) });
    await O.screenshot({ path: path.join(OUT, theme + '-ostrich-found-before.png') });
    await O.evaluate((text) => {
      const cls = T3UI.newsLook(text, UI._S());
      STATUS_QUEUE.clear();
      STATUS_QUEUE.add({ id: 'announce', className: 'show ' + cls, text, priority: 200, hold: 120000, preempt: true });
    }, found);
    await O.waitForTimeout(80);
    notes.push({ theme, who: 'ostrich', when: 'after', ...(await O.evaluate(colour)) });
    await O.screenshot({ path: path.join(OUT, theme + '-ostrich-found-after.png') });
    // Vulture: "You smashed an egg!" used to be red because the sentence says "you". It is good for this phone.
    const smashed = 'You smashed an egg!';
    await V.evaluate(paint, { text: smashed, cls: 'show bad' });
    await V.waitForFunction(t => { const e = document.querySelector('#msgslot > .status-active'); return e && e.textContent === t && getComputedStyle(e).visibility === 'visible'; }, smashed);
    notes.push({ theme, who: 'vulture', when: 'before', ...(await V.evaluate(colour)) });
    await V.screenshot({ path: path.join(OUT, theme + '-vulture-smash-before.png') });
    await V.evaluate((text) => {
      const cls = T3UI.newsLook(text, UI._S());
      STATUS_QUEUE.clear();
      STATUS_QUEUE.add({ id: 'announce', className: 'show ' + cls, text, priority: 200, hold: 120000, preempt: true });
    }, smashed);
    await V.waitForTimeout(80);
    notes.push({ theme, who: 'vulture', when: 'after', ...(await V.evaluate(colour)) });
    await V.screenshot({ path: path.join(OUT, theme + '-vulture-smash-after.png') });
  }
  fs.writeFileSync(path.join(OUT, 'news-colours.json'), JSON.stringify(notes, null, 2));
  console.log(JSON.stringify(notes, null, 2));
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
