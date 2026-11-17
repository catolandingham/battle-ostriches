// The longest badger saying wraps, is not clipped, and does not cover the hint,
// at 375 and 390 wide, in every theme. The hint box itself also keeps that line whole.
// The saying then stays up for its reading time (0.3s a word).
process.env.PORT = '4024'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const { webkit } = require('playwright-core');
const assert = require('assert');
const BL = require('./public/badgerlines');
const S = require('./server');
const LINE = BL.LINES.firstBurrow;
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
const WIDTHS = [375, 390];

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await page.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_tips_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter']) localStorage.setItem(k, '1'); });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:4024/');
  await page.evaluate(() => { document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden')); document.body.classList.add('three', 'hunter'); });
  await page.evaluate(() => {
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = 'repeat(9,1fr)';
    for (let i = 0; i < 63; i++) { const d = document.createElement('div'); d.className = 'cell' + (i % 2 ? ' alt' : ''); board.appendChild(d); }
    document.getElementById('hint').textContent = 'Your turn. Tap to move.';
    document.getElementById('hint').classList.remove('empty');
  });
  const show = () => page.evaluate(() => {
    const board = document.getElementById('board');
    const base = (o) => Object.assign({
      phase: 'play', round: 1, turn: 'hunter', role: 'hunter', kind: 'badger', myTurn: true, burrowed: false,
      hunter: [4, 3], joined: true, seenBirds: [],
      cfg: { cols: 9, rows: 7, rocks: [], foods: [] },
      h3: { kind: 'badger', mySeat: 'hunter', birds: { blue: { out: false, catches: 0 }, red: { out: false, catches: 0 } }, ko: 2, order: ['red', 'blue', 'hunter'], seats: {} }
    }, o);
    T3UI.after(base({ round: 1 }), base({ round: 4 }), board);
    T3UI.after(base({ burrowed: true, myTurn: false, turn: 'red' }), base({ burrowed: false, myTurn: true, turn: 'hunter' }), board);
  });
  const bubbleBox = () => page.evaluate(line => {
    const el = document.getElementById('badgerline');
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect(), hint = document.getElementById('hint').getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect();
    const overlap = r.left < hint.right - 1 && r.right > hint.left + 1 && r.top < hint.bottom - 1 && r.bottom > hint.top + 1;
    return {
      text: el.textContent, off: el.classList.contains('offboard'),
      wraps: t.height > r.height * 0.45 && t.height > 24,
      noClip: el.scrollWidth <= el.clientWidth + 2 && el.scrollHeight <= el.clientHeight + 2 && t.left >= r.left - 1 && t.right <= r.right + 1 && t.top >= r.top - 1 && t.bottom <= r.bottom + 1,
      noHint: !overlap, hold: BADGER_BUBBLE.holdMs(line), words: BADGER_BUBBLE.words(line)
    };
  }, LINE);
  const hintBox = () => page.evaluate(line => {
    const el = document.getElementById('hint');
    el.textContent = line; el.classList.remove('empty', 'hidden');
    const r = el.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect();
    return {
      text: el.textContent,
      noClip: el.scrollWidth <= el.clientWidth + 2 && el.scrollHeight <= el.clientHeight + 2 && t.left >= r.left - 2 && t.right <= r.right + 2 && t.top >= r.top - 2 && t.bottom <= r.bottom + 2,
      wraps: t.height > 22
    };
  }, LINE);

  await show();
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 700 });
    // Width is set in pixels when the saying appears. A later theme does not start the line again.
    await page.evaluate(() => {
      const el = document.getElementById('badgerline'), app = document.getElementById('app');
      if (!el || !app) return;
      const w = Math.max(140, app.clientWidth - 16);
      el.style.width = w + 'px'; el.style.maxWidth = w + 'px';
    });
    for (const theme of THEMES) {
      await page.evaluate(t => THEME.set(t), theme);
      await page.waitForFunction(line => (document.getElementById('badgerline') || {}).textContent === line, LINE);
      const b = await bubbleBox();
      assert.equal(b.text, LINE, theme + ' ' + width + ' bubble text');
      assert.equal(b.noClip, true, theme + ' ' + width + ' bubble clips ' + JSON.stringify(b));
      assert.equal(b.wraps, true, theme + ' ' + width + ' bubble does not wrap ' + JSON.stringify(b));
      assert.equal(b.noHint, true, theme + ' ' + width + ' bubble covers the hint ' + JSON.stringify(b));
      assert.equal(b.off, true, theme + ' ' + width + ' long line should sit under the hint');
      assert.equal(b.hold, b.words * 300, theme + ' reading time');
      const h = await hintBox();
      assert.equal(h.text, LINE, theme + ' ' + width + ' hint text');
      assert.equal(h.noClip, true, theme + ' ' + width + ' hint clips ' + JSON.stringify(h));
      assert.equal(h.wraps, true, theme + ' ' + width + ' hint does not wrap ' + JSON.stringify(h));
    }
  }
  // Put the hint back, show the saying once more, and let its reading time run.
  await page.evaluate(() => { document.getElementById('hint').textContent = 'Your turn. Tap to move.'; });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.evaluate(() => THEME.set('volcano'));
  await page.waitForFunction(() => !document.getElementById('badgerline'), null, { timeout: 20000 });
  const t0 = Date.now();
  await show();
  await page.waitForFunction(line => (document.getElementById('badgerline') || {}).textContent === line, LINE);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#badgerline').textContent(), LINE, 'still up after 1.5s');
  const hold = await page.evaluate(line => BADGER_BUBBLE.holdMs(line), LINE);
  const left = hold - (Date.now() - t0) + 400;
  await page.waitForTimeout(Math.max(0, left));
  assert.equal(await page.locator('#badgerline').count(), 0, 'the longest line leaves after its reading time');
  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  S.close();
  console.log('PASS longest badger line fits at 375 and 390 in every theme, and stays up to be read');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
