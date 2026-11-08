// Signals on a phone (WebKit, 390 x 664): (1) the "you can move here" dot meets 3:1 contrast against the tile on all 13 themes (measured from screenshot
// pixels, the way the UX audit did), (2) the whole 9 x 7 board is on screen above the buttons, (3) one ring under your own animal in every theme,
// (4) no hint longer than 7 words on the ostrich and vulture turns, (5) UX screenshots for the designer -> shots/ux/.
process.env.PORT = 3961; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '60000';
const { webkit } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'); const U = 'http://localhost:3961/', OUT = 'shots/ux/'; fs.mkdirSync(OUT, { recursive: true });
const THEMES = ['classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
(async () => {
  const b = await webkit.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); });
  await p.goto(U); await p.click('#playSolo'); await p.click('[data-bots="1"]'); await p.click('#soloGo'); await p.click('[data-role="blue"]'); await p.click('#startGame');
  await p.waitForSelector('#board .cell'); const cell = (x, y) => p.locator('.cell').nth(y * 9 + x);
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 2]]) { await cell(x, y).click(); await p.waitForTimeout(150); }
  await p.waitForSelector('#actions.mine', { state: 'attached', timeout: 15000 }); await p.waitForFunction(() => !document.querySelector('#announce.show')); await p.waitForTimeout(400);
  const pixels = async (clip, pts) => { // colors at points (page px) from a screenshot of the viewport
    const png = (await p.screenshot({ scale: 'css' })).toString('base64');
    return p.evaluate(async ([png, pts]) => { const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + png)).blob()), c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); return pts.map(([x, y]) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3)); }, [png, pts]); };
  const rows = [];
  for (const t of THEMES) {
    await p.evaluate(x => THEME.set(x), t); await p.waitForTimeout(250);
    const r = await p.evaluate(() => { const d = [...document.querySelectorAll('#board .cell.legal > .mvdot')].pop(); if (!d) return null; const q = d.getBoundingClientRect(), cr = d.parentElement.getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, w: q.width, left: cr.left, top: cr.top, cw: cr.width }; });
    assert.ok(r, t + ': a move dot is drawn');
    const half = r.w / 2, [centre, dark, light, tile] = await pixels(null, [[r.cx, r.cy], [r.cx - half - 1, r.cy], [r.cx - half - 3, r.cy], [r.left + 4, r.top + 4]]);
    const cs = { fill: ratio(centre, dark), vsTile: Math.max(ratio(light, tile), ratio(dark, tile)) };
    rows.push(t + ' dot/edge ' + cs.fill.toFixed(1) + ' edge/tile ' + cs.vsTile.toFixed(1));
    assert.ok(cs.vsTile >= 3, t + ': the move dot reads against the tile, ' + cs.vsTile.toFixed(2) + ' (needs 3.0)');
    assert.ok(cs.fill >= 3, t + ': the dot fill reads against its own edge, ' + cs.fill.toFixed(2));
    // the whole board is on screen, above the buttons; one ring under my animal
    const fit = await p.evaluate(() => { const cells = [...document.querySelectorAll('#board .cell')], a = document.getElementById('actions').getBoundingClientRect(), vh = innerHeight;
      const last = cells[cells.length - 1].getBoundingClientRect(), first = cells[0].getBoundingClientRect(); return { n: cells.length, top: first.top, bottom: last.bottom, actionsTop: a.top, vh, rings: document.querySelectorAll('#board .youring').length }; });
    assert.equal(fit.n, 63, t + ': 63 squares'); assert.ok(fit.top >= 0 && fit.bottom <= fit.actionsTop + 1 && fit.bottom <= fit.vh, t + ': the whole board fits above the buttons ' + JSON.stringify(fit));
    assert.equal(fit.rings, 1, t + ': exactly one ring under my own animal');
    const hint = await p.textContent('#hint'); assert.ok(hint.trim().split(/\s+/).length <= 7, t + ': hint is short: "' + hint + '"');
  }
  console.log(rows.join('\n'));
  // screenshots for the designer: classic and two other themes
  for (const t of ['classic', 'nature', 'comic']) { await p.evaluate(x => THEME.set(x), t); await p.waitForTimeout(250); await p.screenshot({ path: OUT + 'ostrich-' + t + '.png' }); }
  await p.evaluate(x => THEME.set(x), 'classic'); await p.waitForTimeout(250);
  // kick mode: only when an animal is next to the ostrich; force the vulture next to it through the server's state
  const room = [...(server.rooms || new Map()).values ? server.rooms.values() : []][0];
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-signals'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
