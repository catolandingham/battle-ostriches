// The badger's Guinness line, and every other quote, hint and banner that shares that row, stays fully visible
// on a phone. The board does not move or shrink. Words are not changed.
// WebKit at 390x643, 430x705 and 390x844, every theme.
process.env.PORT = '4023'; process.env.BO_NOSTORE = '1';
const { webkit } = require('playwright-core'); const assert = require('assert');
const server = require('./server.js');
const VIEWS = [[390, 643], [430, 705], [390, 844]];
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.addInitScript(() => {
    for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_tips_off', 'bo_walk_hunter', 'bo_muted']) localStorage.setItem(k, '1');
  });
  await page.goto('http://127.0.0.1:4023/');
  await page.evaluate(() => {
    document.getElementById('lobby').classList.add('hidden');
    const tut = document.getElementById('tut'); if (tut) tut.classList.add('hidden');
    const card = document.getElementById('rolecard'); if (card) card.classList.add('hidden');
    document.body.className = 'hunter';
    let bar = document.getElementById('h3bar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'h3bar'; document.getElementById('hud').after(bar); }
    bar.innerHTML = '<span class="bchip red">V</span><span class="bchip blue">O</span><span class="bchip hunter now">B</span>';
    let clock = document.getElementById('clock3');
    if (!clock) { clock = document.createElement('div'); clock.id = 'clock3'; clock.innerHTML = '<div class="cfill"></div><span class="ctxt">10s</span>'; bar.after(clock); }
    clock.classList.remove('hidden');
    const board = document.getElementById('board');
    board.style.gridTemplateColumns = 'repeat(9,minmax(0,1fr))';
    board.innerHTML = '';
    for (let i = 0; i < 63; i++) { const d = document.createElement('div'); d.className = 'cell' + (i % 2 ? ' alt' : ''); board.appendChild(d); }
    const actions = document.getElementById('actions');
    actions.className = 'mine';
    actions.innerHTML = '<button>Walk</button><button>Burrow</button>';
  });
  // The same element the status queue builds (public/status-queue.js). One real queue show, then the rest are that element.
  await page.evaluate(() => { STATUS_QUEUE.clear(); STATUS_QUEUE.add({ id: 'badgerline', className: 'h3pop badger', text: BadgerLines.LINES.firstBurrow, priority: 0, hold: 60000 }); });
  await page.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t, await page.evaluate(() => BadgerLines.LINES.firstBurrow));
  const queued = await page.evaluate(() => document.getElementById('badgerline').className);
  assert.ok(/h3pop/.test(queued) && /badger/.test(queued) && /status-active/.test(queued), 'the queue shows the Guinness line as #badgerline ' + queued);

  const failures = [];
  for (const [w, h] of VIEWS) {
    await page.setViewportSize({ width: w, height: h });
    for (const theme of THEMES) {
      const bad = await page.evaluate(theme => {
        document.documentElement.setAttribute('data-theme', theme);
        const board = document.getElementById('board');
        const cs = getComputedStyle(board), gap = parseFloat(cs.columnGap) || 0, pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const cell = (board.clientWidth - pad - gap * 8) / 9;
        board.style.gridAutoRows = '0';
        board.style.gridTemplateRows = 'repeat(7,' + cell + 'px)';
        const slot = document.getElementById('msgslot');
        const hint = document.getElementById('hint');
        const banner = document.getElementById('banner');
        const tip = document.getElementById('tipbar');
        function clear() {
          document.querySelectorAll('#badgerline,#announce,#snpop').forEach(e => e.remove());
          delete slot.dataset.statusActive;
          banner.textContent = ''; banner.className = 'hidden';
          tip.textContent = ''; tip.className = 'hidden';
          hint.textContent = 'Your turn.'; hint.className = '';
        }
        function box(el) { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width), Math.round(r.height)]; }
        // Same node the status queue appends.
        function line(id, className, text) {
          const old = document.getElementById(id); if (old) old.remove();
          const e = document.createElement('div');
          e.id = id; e.className = className + ' status-active'; e.textContent = text;
          e.setAttribute('role', 'status'); slot.dataset.statusActive = '1'; slot.appendChild(e);
          return e;
        }
        const clips = el => {
          el.getAnimations().forEach(a => a.finish());
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return ['not shown'];
          const range = document.createRange(); range.selectNodeContents(el);
          const rects = [...range.getClientRects()].filter(t => t.width > 0 && t.height > 0);
          if (!rects.length) return ['no text'];
          const why = [];
          const cuts = n => /hidden|clip|scroll|auto/.test(getComputedStyle(n).overflow + getComputedStyle(n).overflowY + getComputedStyle(n).overflowX);
          for (const t of rects) {
            if (t.top < -0.6 || t.bottom > innerHeight + 0.6 || t.left < -0.6 || t.right > innerWidth + 0.6) why.push('off screen');
            if (t.top < r.top - 0.6 || t.bottom > r.bottom + 0.6 || t.left < r.left - 0.6 || t.right > r.right + 0.6) why.push('outside its box');
            const br = board.getBoundingClientRect();
            if (t.bottom > br.top + 1 && t.top < br.bottom - 1 && t.right > br.left + 1 && t.left < br.right - 1) why.push('over the board');
            for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
              if (!cuts(n)) continue;
              const pr = n.getBoundingClientRect();
              if (t.top < pr.top - 0.6 || t.bottom > pr.bottom + 0.6 || t.left < pr.left - 0.6 || t.right > pr.right + 0.6) why.push('clipped by ' + (n.id || n.tagName));
            }
          }
          if (/hidden|clip/.test(s.overflow + s.overflowY) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) why.push('scroll clipped');
          return [...new Set(why)];
        };
        const L = BadgerLines.LINES;
        const quotes = Object.values(L).flatMap(v => Array.isArray(v) ? v : [v]);
        const tails = [L.walkIn, L.ambush, L.openCatch].map(t => 'The badger knocked you out. ' + t);
        const hints = [
          'Tap to move, or Burrow. A bird will see you dig in.',
          'Your turn. Tap to move. No bird near.',
          'The vulture found an egg! Move it or sit on it.',
          'Kick: push the animal next to you back 3 squares instead of walking.',
          'Throwing at the ostrich bounces back.',
          'When you miss, move 1 more square.',
          'Hungry. No way to food.',
          Roles.huntLine('4h', 'badger'),
          Roles.huntLine('3', 'badger'),
          Roles.huntLine('5', 'hyena'),
        ];
        const banners = ['Pounce!', 'An egg went cold.', 'Smashed!', 'Hungry. No way to food.', 'Ate the leaf. Hunger restored.', 'The ostrich is out.', 'Ostrich 1 is out.', 'Final 3 rounds!', 'Last round!'];
        const tips = ['Kick: push the animal next to you back 3 squares instead of walking.', 'Stand on an egg to warm it.', 'Each landing sniffs the squares around you.', 'Smashed. Nobody can land here.', 'Hover or tap a square to see what it is.'];
        const announces = [
          'The vulture hunts eggs. The hyena and badger hunt birds.',
          'You were caught! You fled 2 squares.',
          'The badger caught the ostrich!',
          'You burst out and shoved the hyena 2 squares!',
          'Ostrich 1 kicked the stone right back!',
          ...tails,
        ];
        clear();
        const base = box(board);
        const out = [];
        const check = (el, label, text) => {
          if (el.textContent !== text) out.push(label + ' words changed');
          const why = clips(el);
          const now = box(board);
          if (why.length) out.push(label + ': ' + why.join(', '));
          if (now.join(',') !== base.join(',')) out.push(label + ' moved the board ' + base.join(',') + ' -> ' + now.join(','));
        };
        for (const text of quotes) check(line('badgerline', 'h3pop badger', text), 'quote', text);
        for (const text of announces) check(line('announce', 'show', text), 'announce', text);
        clear();
        for (const text of hints) { hint.textContent = text; hint.className = ''; check(hint, 'hint', text); }
        clear();
        for (const text of banners) { banner.textContent = text; banner.className = text === 'Pounce!' ? 'pounce' : 'no'; check(banner, 'banner', text); }
        clear();
        for (const text of tips) { tip.textContent = text; tip.className = ''; check(tip, 'tip', text); }
        clear();
        // The Guinness line on the real queue element, one more time, after everything else.
        check(line('badgerline', 'h3pop badger', L.firstBurrow), 'Guinness', L.firstBurrow);
        if (document.getElementById('badgerline').textContent !== L.firstBurrow) out.push('Guinness text missing');
        return out;
      }, theme);
      for (const item of bad) failures.push(w + 'x' + h + ' ' + theme + ' ' + item);
    }
  }
  await browser.close(); server.close();
  const kinds = {};
  for (const f of failures) { const k = f.replace(/^\d+x\d+ \w+ /, ''); kinds[k] = (kinds[k] || 0) + 1; }
  assert.deepEqual(failures, [], failures.length + ' failures\n' + Object.entries(kinds).map(([k, n]) => n + '  ' + k).join('\n'));
  console.log('PASS quote clip ' + VIEWS.length + ' phones x ' + THEMES.length + ' themes');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
