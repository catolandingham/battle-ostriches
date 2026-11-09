// Badger player's own board: the graphic is on screen before burrow and while burrowed.
// Repro: Play with friends, three computers, sit as Badger (4-player Hunters). Separately,
// Play a game yourself, two computers, Hunter, then Badger (3-player). State position is not enough.
process.env.PORT = '3977';
process.env.BO_CLOCKMS = '120000';
process.env.BO_BOTMS = '60000';
process.env.BO_H4START = '4,3,5,3';
process.env.BO_H3START = '4,3';
const { webkit } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js');
const THEMES = ['classic', 'nature', 'neon', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh'];

function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(rgb) {
  const m = String(rgb).match(/\d+/g);
  if (!m || m.length < 3) return null;
  return 0.2126 * lin(+m[0]) + 0.7152 * lin(+m[1]) + 0.0722 * lin(+m[2]);
}
function contrast(a, b) {
  const L1 = lum(a), L2 = lum(b);
  if (L1 == null || L2 == null) return 0;
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

(async () => {
  const browser = await webkit.launch(), errs = [];
  const open = async () => {
    const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off', 'bo_muted']) localStorage.setItem(k, '1');
      window.AudioContext = undefined; window.webkitAudioContext = undefined;
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  async function graphic(p, sel) {
    return p.evaluate(async (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { missing: true };
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cell = el.closest('.cell');
      const bg = getComputedStyle(cell).backgroundColor;
      const path = el.querySelector('svg path'), art = el.querySelector('img.aimg'); // the locked animal drawings are images with black lines
      const fill = art ? 'rgb(0, 0, 0)' : path ? (document.documentElement.getAttribute('data-theme') === 'bw' ? getComputedStyle(path).stroke : getComputedStyle(path).fill) : ''; // the black-and-white theme draws the body as a line
      const hits = [];
      for (const [dx, dy] of [[0.5, 0.35], [0.3, 0.55], [0.7, 0.6], [0.5, 0.75]]) {
        const x = r.left + r.width * dx, y = r.top + r.height * dy;
        const hit = document.elementFromPoint(x, y);
        const top = hit ? ((hit.id ? '#' + hit.id + ' ' : '') + (hit.className && String(hit.className).slice(0, 60) || hit.tagName)) : '';
        const ring = hit && hit.closest && hit.closest('#aring, .ring-tap');
        const cover = !!(hit && !el.contains(hit) && (ring || (hit !== cell && !cell.contains(hit))));
        hits.push({ top, cover });
      }
      let ink = null;
      try {
        let url;
        if (art) url = art.src;
        else { const svg = el.querySelector('svg').cloneNode(true);
        if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const xml = new XMLSerializer().serializeToString(svg);
        url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' })); }
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const c = document.createElement('canvas'); c.width = 40; c.height = 40;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.fillStyle = '#6b4a1f'; g.fillRect(0, 0, 40, 40);
        const base = g.getImageData(0, 0, 40, 40).data;
        g.drawImage(img, 0, 0, 40, 40);
        const data = g.getImageData(0, 0, 40, 40).data;
        if (!art) URL.revokeObjectURL(url);
        const rel = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        let strong = 0, seen = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === base[i] && data[i + 1] === base[i + 1] && data[i + 2] === base[i + 2]) continue;
          seen++;
          const L1 = 0.2126 * rel(data[i]) + 0.7152 * rel(data[i + 1]) + 0.0722 * rel(data[i + 2]);
          const L0 = 0.2126 * rel(base[i]) + 0.7152 * rel(base[i + 1]) + 0.0722 * rel(base[i + 2]);
          const hi = Math.max(L1, L0), lo = Math.min(L1, L0);
          if ((hi + 0.05) / (lo + 0.05) >= 3) strong++;
        }
        ink = { seen, strong, frac: seen ? strong / 1600 : 0 };
      } catch (e) { ink = { error: String(e) }; }
      return {
        cls: el.className, w: r.width, h: r.height, x: r.x, y: r.y,
        visibility: st.visibility, opacity: +st.opacity, fill, bg, hits, ink,
        theme: document.documentElement.getAttribute('data-theme')
      };
    }, sel);
  }
  function assertOwn(info, label) {
    assert.ok(!info.missing, label + ' graphic missing from the board');
    assert.ok(info.w >= 20 && info.h >= 20, label + ' graphic has no size ' + info.w + 'x' + info.h);
    assert.equal(info.visibility, 'visible', label + ' graphic is not visible (' + info.theme + ')');
    assert.ok(info.opacity >= 0.9, label + ' graphic is faded');
    const covers = (info.hits || []).filter(h => h.cover);
    assert.equal(covers.length, 0, label + ' graphic is covered by ' + covers.map(h => h.top).join(','));
    assert.ok(info.ink && !info.ink.error, label + ' graphic could not be painted ' + (info.ink && info.ink.error));
    assert.ok(info.ink.frac >= 0.18, label + ' graphic does not cover the cell (strong pixels ' + Math.round(info.ink.frac * 100) + '%, ink ' + info.ink.seen + ')');
    const c = contrast(info.fill, info.theme === 'bw' ? 'rgb(255, 255, 255)' : 'rgb(107, 74, 31)');
    assert.ok(c >= 3, label + ' body does not stand off the hunter cell (' + c.toFixed(2) + ':1, fill ' + info.fill + ')');
  }

  // The mound fades in over 0.8 s when the badger burrows. Wait for that to finish, then measure.
  const settled = (page, sel) => page.waitForFunction(s => { const e = document.querySelector(s); return !!e && e.getAnimations().length === 0 && parseFloat(getComputedStyle(e).opacity) >= 0.9; }, sel, { timeout: 5000 });
  const A = await open();
  await A.goto('http://127.0.0.1:3977/');
  await A.click('#playFriend');
  await A.waitForSelector('#roomLobby:not(.hidden)');
  for (let i = 0; i < 3; i++) { const plus = A.locator('#botPlus'); if (await plus.isEnabled()) await plus.click(); }
  await A.click('[data-role="badger"]');
  await A.click('#startGame');
  await A.waitForSelector('.pc.ph.hbadger.mine', { timeout: 15000 });
  await A.waitForFunction(() => UI._S() && UI._S().phase === 'play');
  const room = [...server.rooms.values()].find(r => r.hunt);
  if (room.aiT) clearTimeout(room.aiT);
  room.aiT = setTimeout(() => {}, 600000);
  const role = await A.evaluate(() => ({ role: UI._S().role, kind: UI._S().kind, burrowed: !!UI._S().burrowed }));
  assert.equal(role.role, 'hunter'); assert.equal(role.kind, 'badger'); assert.equal(role.burrowed, false);
  assertOwn(await graphic(A, '.pc.ph.hbadger.mine'), '4h unburrowed');
  for (const theme of THEMES) {
    await A.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    const mine = await graphic(A, '.pc.ph.hbadger.mine');
    const hy = await graphic(A, '.pc.ph.hhyena');
    assert.equal(mine.visibility, 'visible', '4h own badger hidden on ' + theme + ' ' + JSON.stringify({ missing: mine.missing, cls: mine.cls, w: mine.w, vis: mine.visibility }));
    assert.ok(mine.w >= 20 && mine.h >= 20, '4h own badger has no box on ' + theme);
    assert.equal(hy.visibility, 'visible', '4h hyena hidden on ' + theme);
    assert.ok(!/107,\s*90,\s*68/.test(mine.fill), 'nature recolor washed the badger on ' + theme);
  }
  await A.evaluate(() => document.documentElement.setAttribute('data-theme', 'classic'));
  room.g.hunt.hs.badger.burrowed = true; room.g.hunt.hs.badger.dig = 2;
  server.broadcast(room);
  await A.waitForSelector('.pc.ph.hbadger.bur.mine'); await settled(A, '.pc.ph.hbadger.bur.mine');
  const bur = await graphic(A, '.pc.ph.hbadger.bur.mine');
  assert.equal(await A.evaluate(() => UI._S().burrowed), true);
  assertOwn(bur, '4h burrowed');
  assert.match(bur.cls, /\bbur\b/);
  for (const theme of ['nature', 'neon', 'toybox', 'storm']) {
    await A.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    const mine = await graphic(A, '.pc.ph.hbadger.bur.mine');
    assert.equal(mine.visibility, 'visible', '4h burrow hidden on ' + theme);
    assert.ok(mine.w >= 20, '4h burrow has no box on ' + theme);
  }

  const B = await open();
  await B.goto('http://127.0.0.1:3977/');
  await B.click('#playSolo');
  await B.click('[data-bots="2"]');
  await B.click('#soloGo');
  await B.waitForSelector('#roomLobby:not(.hidden)');
  await B.click('[data-role="badger"]');
  await B.click('#startGame');
  await B.waitForSelector('.pc.ph.hbadger.mine', { timeout: 15000 });
  await B.waitForFunction(() => UI._S() && UI._S().phase === 'play');
  const room3 = [...server.rooms.values()].find(r => r.three && !r.hunt);
  if (room3.aiT) clearTimeout(room3.aiT);
  room3.aiT = setTimeout(() => {}, 600000);
  assert.equal(await B.evaluate(() => UI._S().burrowed), false);
  assertOwn(await graphic(B, '.pc.ph.hbadger.mine'), '3p unburrowed');
  room3.g.three.burrowed = true; room3.g.three.dig = 2; room3.g.three.kind = 'badger';
  server.broadcast(room3);
  await B.waitForSelector('.pc.ph.hbadger.bur.mine'); await settled(B, '.pc.ph.hbadger.bur.mine');
  assertOwn(await graphic(B, '.pc.ph.hbadger.bur.mine'), '3p burrowed');

  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close(); server.close();
  console.log('PASS e2e-badger-see');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
