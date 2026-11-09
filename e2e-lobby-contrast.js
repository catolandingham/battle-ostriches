// Lobby label contrast: role cards, setup choices, and computer-count chips stay readable
// in every theme, including selected, taken, and disabled. WebKit iPhone.
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
process.env.PORT = 3988;
process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const THEMES = ['classic', 'nature', 'neon', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh'];
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b), [x, y] = l1 > l2 ? [l1, l2] : [l2, l1]; return (x + 0.05) / (y + 0.05); };
const parse = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); if (!m) throw new Error('color ' + c); return [m[1] / 255, m[2] / 255, m[3] / 255]; };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
    p.on('pageerror', e => errs.push(e.message)); return p;
  };
  const paint = (p, th) => p.evaluate(theme => { if (theme === 'classic') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }, th);
  const sample = (p, sel) => p.evaluate(selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    let node = el, bg = cs.backgroundColor;
    while (node && (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) { node = node.parentElement; bg = node ? getComputedStyle(node).backgroundColor : bg; }
    const r = el.getBoundingClientRect();
    return { text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(), color: cs.color, bg, opacity: cs.opacity, w: r.width, h: r.height };
  }, sel);
  const check = async (p, sel, theme, needle) => {
    const s = await sample(p, sel);
    assert.ok(s && s.w > 2 && s.h > 2, `${theme} ${sel} is not on screen`);
    assert.ok(s.text.toLowerCase().includes(needle), `${theme} ${sel} text "${s.text}" missing ${needle}`);
    const n = ratio(parse(s.color), parse(s.bg));
    assert.ok(n >= 4.5, `${theme} ${sel} contrast ${n.toFixed(2)} (${s.color} on ${s.bg}) "${s.text}"`);
    assert.equal(Number(s.opacity), 1, `${theme} ${sel} opacity fades the label`);
  };
  const A = await mk();
  await A.goto('http://127.0.0.1:3988/');
  await A.click('#playSolo');
  await A.waitForSelector('#botPick [data-bots="1"]');
  for (const th of THEMES) {
    await paint(A, th);
    await check(A, '#botPick [data-bots="1"]', th, '1');
    await check(A, '#botPick [data-bots="2"].on', th, '2');
  }
  await A.click('#soloBack');
  await A.click('#playFriend');
  await A.waitForSelector('#lobbyCode:not(:empty)');
  await A.waitForSelector('.openseat');
  const V = await mk();
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://127.0.0.1:3988');
  await V.goto(link);
  await V.click('[data-role="red"]');
  await A.waitForFunction(() => document.querySelector('[data-role="red"]:disabled'));
  await A.click('[data-role="blue"]');
  await A.waitForSelector('[data-role="blue"].mine');
  for (const th of THEMES) {
    await paint(A, th);
    await check(A, '[data-role="blue"].mine b', th, 'ostrich');
    await check(A, '[data-role="blue"].mine small', th, 'you');
    await check(A, '[data-role="red"]:disabled b', th, 'vulture');
    await check(A, '[data-role="red"]:disabled small', th, 'player');
  }
  await A.click('#botPlus'); await A.click('#botPlus');
  await A.waitForSelector('[data-role="hyena"] b');
  for (const th of THEMES) {
    await paint(A, th);
    await check(A, '[data-role="ostrich"] b', th, 'ostrich');
    await check(A, '[data-role="vulture"] b', th, 'vulture');
    await check(A, '[data-role="hyena"] b', th, 'hyena');
    await check(A, '[data-role="hyena"] small', th, 'pounce');
    await check(A, '[data-role="badger"] b', th, 'badger');
    await check(A, '[data-role="badger"] small', th, 'burrow');
    await check(A, '#botMinus', th, '−');
    await check(A, '#botPlus', th, '+');
    await check(A, '#botCount', th, '2');
  }
  await A.click('[data-role="hyena"]');
  await A.waitForSelector('[data-role="hyena"].mine');
  for (const th of THEMES) {
    await paint(A, th);
    await check(A, '[data-role="hyena"].mine b', th, 'hyena');
    await check(A, '[data-role="hyena"].mine small', th, 'you');
    await check(A, '[data-role="ostrich"] b', th, 'ostrich');
    await check(A, '[data-role="badger"] small', th, 'burrow');
  }
  console.log('errors', errs);
  assert.deepEqual(errs, []);
  await b.close(); server.close();
  console.log('PASS e2e-lobby-contrast', THEMES.length, 'themes');
  process.exit(0);
})().catch(e => { console.error(e); try { server.close(); } catch {} process.exit(1); });
