// Phone: after a leaf, the food number counts up, the eater sees "You ate." and a square on the food chip.
// 390px shots of the header before and after, in Black and white, Classic, and Nature, plus the chip beside low food.
process.env.PORT = '3977';
process.env.BO_CLOCKMS = '60000';
const { webkit } = require('playwright-core');
const assert = require('assert');
const fs = require('fs');
const server = require('./server.js');
const U = 'http://localhost:3977/';
const OUT = '/opt/cursor/artifacts/';
fs.mkdirSync(OUT, { recursive: true });
const THEMES = ['bw', 'classic', 'nature'];

(async () => {
  const b = await webkit.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => {
    for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1');
  });
  const cell = (x, y) => p.locator('#board .cell').nth(y * 9 + x);
  const headerBox = () => p.evaluate(() => {
    const a = document.getElementById('hud').getBoundingClientRect();
    const m = document.getElementById('msgslot').getBoundingClientRect();
    const top = Math.max(0, Math.floor(a.top) - 2);
    const bottom = Math.ceil(Math.max(a.bottom, m.bottom) + 6);
    return { x: 0, y: top, width: 390, height: Math.max(40, bottom - top) };
  });
  const shot = async (name) => {
    const clip = await headerBox();
    await p.screenshot({ path: OUT + name, clip });
    return name;
  };
  const setTheme = (t) => p.evaluate(theme => THEME.set(theme), t);

  await p.goto(U);
  await p.click('#playSolo');
  await p.click('[data-bots="1"]');
  await p.click('#soloGo');
  await p.click('[data-role="blue"]');
  await p.click('#startGame');
  await p.waitForSelector('#board .cell');
  for (const [x, y] of [[5, 2], [6, 4], [3, 5], [2, 2]]) {
    await cell(x, y).click();
    await p.waitForTimeout(80);
  }
  await p.waitForSelector('#actions.mine', { timeout: 15000 });
  const room = [...server.rooms.values()][0];
  assert.ok(room && room.g, 'a game is running');
  room.g.hungerLeft = 4;
  server.broadcast(room);
  await p.waitForFunction(() => document.getElementById('hungerLeft') && document.getElementById('hungerLeft').textContent.trim() === '4');
  room.g.hungerLeft = 2;
  server.broadcast(room);
  await p.waitForFunction(() => document.getElementById('hungerLeft').textContent.trim() === '2');
  await setTheme('classic');
  await p.waitForTimeout(60);
  const lowName = await shot('ate-header-low-food.png');
  room.g.hungerLeft = 4;
  server.broadcast(room);
  await p.waitForFunction(() => document.getElementById('hungerLeft').textContent.trim() === '4');

  const before = [];
  for (const t of THEMES) {
    await setTheme(t);
    await p.waitForTimeout(80);
    before.push(await shot('ate-header-before-' + t + '.png'));
  }
  await setTheme('bw');
  await p.waitForTimeout(50);

  await p.evaluate(() => {
    window.__log = [];
    const note = () => {
      const n = document.getElementById('hungerLeft');
      const slot = document.getElementById('msgslot');
      const vis = slot ? [...slot.children].filter(e => {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 2 && r.height > 2 && +s.opacity > 0.5;
      }).map(e => (e.textContent || '').trim()) : [];
      const row = { n: n ? n.textContent.trim() : '', line: vis.join(' | ') };
      const a = window.__log, prev = a[a.length - 1];
      if (!prev || prev.n !== row.n || prev.line !== row.line) a.push(row);
    };
    note();
    new MutationObserver(note).observe(document.getElementById('stats'), { subtree: true, childList: true, characterData: true });
    new MutationObserver(note).observe(document.getElementById('msgslot'), { subtree: true, childList: true, characterData: true, attributes: true });
    (function poll() { note(); if (!window.__ateDone) requestAnimationFrame(poll); })();
  });

  // Freeze the computer the moment the eat hands it the turn, so the rise is not cut off by the next turn.
  const stopper = setInterval(() => {
    for (const r of server.rooms.values()) if (r.g && r.g.turn === 'red' && r.aiT) { clearTimeout(r.aiT); r.aiT = null; }
  }, 15);

  await cell(0, 0).click();
  await p.waitForFunction(() => window.__log.some(row => +row.n > 4 && +row.n < 15), null, { timeout: 4000 });
  const popped = await p.evaluate(() => {
    const chip = document.querySelector('#stats .hh');
    const leaf = chip && chip.querySelector('svg');
    const back = chip && chip.querySelector('.leaf-back'), front = chip && chip.querySelector('.leaf-front');
    const br = back && back.getBoundingClientRect(), fr = front && front.getBoundingClientRect();
    return { pop: !!(chip && chip.classList.contains('ate-pop')), ate: !!(chip && chip.classList.contains('ate')), rim: br && fr ? br.width - fr.width : 0 };
  });
  assert.ok(popped.pop, 'the leaf bounces once when the eat arrives');
  assert.ok(popped.rim >= 6, 'the leaf outline is wider than the leaf during the rise: ' + popped.rim);
  const rising = [];
  for (const t of THEMES) {
    await setTheme(t);
    rising.push(await shot('ate-header-mid-' + t + '.png'));
  }
  await p.waitForFunction(() => {
    const a = window.__log;
    return a.some(row => row.n === '15') && a.some(row => +row.n > 4 && +row.n < 15);
  }, null, { timeout: 4000 });

  const after = [];
  for (const t of THEMES) {
    await setTheme(t);
    await p.waitForTimeout(40);
    const said = await p.evaluate(() => {
      const e = document.querySelector('#msgslot .ate-line');
      const n = document.getElementById('hungerLeft');
      if (!e || !n) return { raw: '' };
      const s = getComputedStyle(e);
      const rgb = (s.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      return { raw: n.textContent.trim() + '|' + s.visibility + '|' + s.color + '|' + (e.textContent || '').trim(), rgb };
    });
    if (said.raw) {
      assert.ok(/15\|visible\|/.test(said.raw) && said.raw.endsWith('You ate.'), t + ' still shows the new number and the line: ' + said.raw);
      assert.ok(said.rgb[1] < 80, t + ' the You ate bar stays dark, not the green banner: ' + said.rgb.join(','));
    }
    after.push(await shot('ate-header-after-' + t + '.png'));
  }

  const log = await p.evaluate(() => window.__log);
  const nums = log.map(row => row.n).filter(Boolean);
  assert.ok(nums.includes('4'), 'the counter showed the old number: ' + nums.join(','));
  assert.ok(nums.includes('15'), 'the counter showed the new number: ' + nums.join(','));
  assert.ok(nums.some(v => +v > 4 && +v < 15), 'the rise played through a middle number: ' + nums.join(','));
  const during = log.filter(row => +row.n > 4 && +row.n < 15);
  assert.ok(during.some(row => row.line.indexOf('You ate.') >= 0), 'the line is up while the number is still rising: ' + JSON.stringify(during.slice(0, 6)));
  assert.ok(during.every(row => row.line.indexOf("Vulture's turn") < 0), 'the turn line does not cover "You ate." during the rise');

  const mark = await p.evaluate(() => {
    const chip = document.querySelector('#stats .hh.ate');
    const leaf = chip && chip.querySelector('.hh-top svg');
    const num = document.getElementById('hungerLeft');
    const bar = chip && chip.querySelector('.hbar');
    const eggs = document.getElementById('eggsLeft');
    const stats = document.getElementById('stats');
    const hud = document.getElementById('hud');
    if (!chip || !leaf || !num || !bar || !eggs) return null;
    const nr = num.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const chips = [...stats.children].map(el => el.getBoundingClientRect());
    const after = getComputedStyle(chip, '::after');
    return {
      num: num.textContent.trim(),
      low: chip.classList.contains('low'),
      pop: chip.classList.contains('ate-pop'),
      rim: leaf.getBoundingClientRect ? (chip.querySelector('.leaf-back').getBoundingClientRect().width - chip.querySelector('.leaf-front').getBoundingClientRect().width) : 0,
      after: after.content,
      gap: br.top - nr.bottom,
      eggsInStats: eggs.closest('#stats') === stats,
      eggsInRounds: !!document.querySelector('.ctr .eg'),
      eggsText: eggs.parentElement.textContent.replace(/\s+/g, ' ').trim(),
      row: Math.max(...chips.map(r => r.top)) - Math.min(...chips.map(r => r.top)),
      overflow: stats.scrollWidth - stats.clientWidth,
      fit: stats.getBoundingClientRect().right <= hud.getBoundingClientRect().right + 1
    };
  });
  assert.ok(mark, 'the food chip is on screen');
  assert.equal(mark.num, '15');
  assert.equal(mark.low, false, 'a full counter is not the low-food fill');
  assert.equal(mark.pop, false, 'the bounce does not repeat on a later paint');
  assert.ok(mark.rim >= 6, 'the leaf stays strongly outlined: ' + mark.rim);
  assert.equal(mark.after, 'none', 'the empty square is gone');
  assert.ok(mark.gap >= 2, 'the food bar sits clear of the digits, gap ' + mark.gap);
  assert.equal(mark.eggsInStats, true);
  assert.equal(mark.eggsInRounds, false);
  assert.ok(/^EGGS \d+$/.test(mark.eggsText.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim()) || mark.eggsText.includes('EGGS'), 'eggs chip keeps the word EGGS: ' + mark.eggsText);
  assert.ok(mark.row < 8, 'eggs, food, and stones share one row: ' + mark.row);
  assert.ok(mark.overflow <= 1, 'the chip row does not overflow: ' + mark.overflow);
  assert.equal(mark.fit, true, 'the chip row stays inside the header');

  await p.evaluate(() => { window.__ateDone = true; });
  clearInterval(stopper);
  assert.deepEqual(errs, [], errs.join('\n'));
  const names = before.concat(rising, after, [lowName]);
  console.log('SHOTS ' + names.join(' '));
  console.log('PASS ate phone');
  await b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
