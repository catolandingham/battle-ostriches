// Text drawn over the board must stay on top of every board icon, in both looks. WebKit iPhone 13, Hunters game, the player is the badger.
// The badger's speech bubble (the real saying path) is placed over squares holding a stone, a wreck, a rock pile, a leaf and an egg.
// For each icon the bubble covers, the test finds the middle of the overlap and asserts the bubble (its text) is the top element there, that the bubble is filled (nothing shows through the letters),
// that it does not touch the YOU tag, and that it stays on the phone screen. Run it in the black-and-white look and the classic look.
process.env.PORT = 3996; process.env.BO_H4START = '2,3,4,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '8000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'); const U = 'http://localhost:3996/', OUT = 'shots/overlaps/'; fs.mkdirSync(OUT, { recursive: true });
const LINE = "Badger doesn't care.";
(async () => {
  const b = await webkit.launch(), errs = [];
  const fails = [], check = (ok, msg) => { if (!ok) fails.push(msg); };
  for (const look of ['bw', 'classic']) {
    const c = await b.newContext({ ...devices['iPhone 13'] }), A = await c.newPage();
    await A.addInitScript(t => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); localStorage.setItem('bo_theme', t); localStorage.setItem('bo_bw_default', '1'); }, look);
    A.on('pageerror', e => errs.push(e.message));
    await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
    for (let i = 0; i < 3; i++) await A.click('#botPlus');
    await A.waitForSelector('[data-role="badger"]'); await A.click('[data-role="badger"]'); await A.click('#startGame');
    await A.waitForSelector('#board .cell'); assert.equal(await A.getAttribute('html', 'data-theme'), look);
    await A.waitForFunction(() => !!window.BADGER_SAY && UI._S() && UI._S().phase === 'play' && UI._S().myTurn && !document.querySelector('#msgslot .status-active'), null, { timeout: 20000 });
    await A.evaluate(t => { window.BADGER_SAY(t); window.BADGER_BUBBLE_RESUME(); }, LINE);
    await A.waitForSelector('#badgerline.badger-bubble', { timeout: 5000 });
    const flagCheck = () => A.evaluate(() => { const bub = document.getElementById('badgerline'), br = bub.getBoundingClientRect(), f = [...document.querySelectorAll('.youflag')].map(f => f.getBoundingClientRect()).filter(q => q.width); return { flags: f.length, hit: f.some(q => q.left < br.right && q.right > br.left && q.top < br.bottom && q.bottom > br.top) }; });
    await A.screenshot({ path: OUT + look + '-1-bubble-and-you-tag.jpg', type: 'jpeg', quality: 80 });
    const fc0 = await flagCheck(); check(fc0.flags >= 1, look + ': the YOU tag is on the board'); check(!fc0.hit, look + ': the bubble covers the YOU tag');
    // Put one of each icon under the bubble, using the game's own drawing (marks, rock and leaf piles, a found egg), then redraw. The bubble stays where it is.
    const placed = await A.evaluate(() => {
      const S = UI._S(), C = S.cfg, bub = document.getElementById('badgerline'), br = bub.getBoundingClientRect(), board = document.getElementById('board');
      const cells = [...board.children].map((el, i) => ({ el, i, x: i % C.cols, y: Math.floor(i / C.cols), r: el.getBoundingClientRect() }));
      const under = cells.filter(c => c.r.left < br.right - 8 && c.r.right > br.left + 8 && c.r.top < br.bottom - 4 && c.r.bottom > br.top + 4 && !(S.hunter && 0));
      const row = under.filter(c => c.y === under[0].y).sort((a, b) => a.x - b.x);
      const kinds = ['stone', 'wreck', 'rock pile', 'leaf', 'egg'], out = {};
      S.cfg.rocks = S.cfg.rocks.slice(); S.cfg.foods = S.cfg.foods.slice(); S.eggs = []; S.god = true;
      row.forEach((c, n) => { const k = kinds[n % kinds.length], key = c.x + ',' + c.y; out[key] = k;
        if (k === 'stone') S.marks[key] = 'hit'; else if (k === 'wreck') S.marks[key] = 'stone'; else if (k === 'rock pile') S.cfg.rocks.push([c.x, c.y]); else if (k === 'leaf') S.cfg.foods.push([c.x, c.y]); else S.eggs.push({ alive: true, pos: [c.x, c.y], coldIn: 3 }); });
      const was = bub.style.cssText; UI._rr(); return { out, was, now: (document.getElementById('badgerline') || {}).style && document.getElementById('badgerline').style.cssText };
    });
    // A square the player can step to is drawn at z-index 2, which hides how its icons stack. The squares a speech bubble lands on are often not reachable (a bubble over the top row, say), so draw these as plain squares.
    await A.evaluate(() => { for (const c of document.querySelectorAll('#board .cell')) c.classList.remove('legal', 'target', 'toward'); });
    await A.waitForTimeout(300);
    const res = await A.evaluate(() => {
      const bub = document.getElementById('badgerline'); if (!bub) return { gone: true };
      const st = document.createElement('style'); st.textContent = '#stage *{pointer-events:auto!important}'; document.head.appendChild(st); // elementFromPoint skips elements that ignore the pointer, and every board mark does
      const br = bub.getBoundingClientRect(), cs = getComputedStyle(bub), W = innerWidth, H = innerHeight;
      const top = (x, y) => { const t = document.elementFromPoint(x, y); return t === bub || bub.contains(t); };
      const hits = [], bad = [];
      for (const ic of document.querySelectorAll('#board .cell *')) {
        const r = ic.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
        const l = Math.max(r.left, br.left + 2), t = Math.max(r.top, br.top + 2), rr = Math.min(r.right, br.right - 2), bb = Math.min(r.bottom, br.bottom - 2);
        if (rr - l < 3 || bb - t < 3) continue;
        const z = getComputedStyle(ic); if (z.visibility === 'hidden' || z.display === 'none') continue;
        const x = (l + rr) / 2, y = (t + bb) / 2, name = (ic.className && ic.className.baseVal !== undefined ? ic.className.baseVal : ic.className) || ic.tagName;
        hits.push(name); if (!top(x, y)) bad.push(name + ' @' + Math.round(x) + ',' + Math.round(y) + ' top=' + ((document.elementFromPoint(x, y) || {}).className || '').toString().slice(0, 40));
      }
      const mid = top(br.left + br.width / 2, br.top + br.height / 2);
      const flags = [...document.querySelectorAll('.youflag')].map(f => f.getBoundingClientRect()), yf = flags.some(q => q.width && q.left < br.right && q.right > br.left && q.top < br.bottom && q.bottom > br.top);
      const alpha = (cs.backgroundColor.match(/rgba?\(([^)]+)\)/)[1].split(',')[3] || '1').trim();
      return { text: bub.textContent, mid, bad, n: hits.length, alpha: +alpha, onYouFlag: yf, inside: br.left >= 0 && br.right <= W && br.top >= 0 && br.bottom <= H, z: cs.zIndex, box: [br.left, br.top, br.width, br.height] };
    });
    console.log(look, JSON.stringify(placed.out), JSON.stringify(res));
    await A.screenshot({ path: OUT + look + '-2-bubble-over-icons.jpg', type: 'jpeg', quality: 80 });
    if (res.gone) throw new Error(look + ': the bubble is gone'); check(res.text === LINE, look + ': the bubble says the line');
    check(Object.keys(placed.out).length >= 4, look + ': the bubble covers at least four squares, got ' + JSON.stringify(placed.out));
    for (const kind of ['stone', 'wreck', 'leaf', 'egg']) check(Object.values(placed.out).includes(kind), look + ': no ' + kind + ' under the bubble');
    check(res.n >= 4, look + ': board marks under the bubble');
    check(res.mid, look + ': the bubble text is the top element at its centre');
    check(!res.bad.length, look + ': board marks drawn over the bubble: ' + res.bad.slice(0, 4).join(' | '));
    check(res.alpha >= 0.95, look + ': the bubble is filled, alpha ' + res.alpha);
    check(res.inside, look + ': the bubble is inside the screen');
    await c.close();
  }
  if (fails.length) throw new Error(fails.join('\n'));
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-overlaps'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
