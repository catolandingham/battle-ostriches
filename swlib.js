// Bug-sweep helpers: a local server, phone-sized WebKit pages, solo games for every mode and role, and a page recorder that logs every
// player-facing line (what it said, which element, how long it stayed up).
const { webkit, devices } = require('playwright-core');
const fs = require('fs');
const PORT = +process.env.SWPORT || 3971;
process.env.PORT = PORT; process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const U = 'http://127.0.0.1:' + PORT + '/';
const PHONE = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } };
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b), [x, y] = l1 > l2 ? [l1, l2] : [l2, l1]; return (x + 0.05) / (y + 0.05); };
// installed in every page: records lines
const RECORDER = () => {
  window.__lines = []; const seen = new Map();
  const SEL = ['#msgslot > *', '#hint', '#banner', '#announce', '#snpop', '#tipbar', '#wait-slot > *', '#badgerline', '.h3pop', '#marktip', '#surprise-go', '#cutaway .cap, #cutaway .line, #cutaway', '#rolecard .rmoves', '.status-active'];
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.hidden'); };
  setInterval(() => {
    const now = performance.now(), cur = new Set();
    for (const s of SEL) for (const el of document.querySelectorAll(s)) {
      const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); if (!t || !vis(el)) continue;
      const k = s + '|' + (el.id || el.className) + '|' + t; cur.add(k);
      if (!seen.has(k)) { const rec = { sel: s, cls: String(el.className || ''), id: el.id, text: t, t0: now, t1: now, live: true }; seen.set(k, rec); window.__lines.push(rec); }
      else { const rec = seen.get(k); rec.t1 = now; rec.live = true; }
    }
    for (const [k, rec] of seen) if (!cur.has(k)) { rec.live = false; seen.delete(k); }
  }, 40);
};
async function launch() { return webkit.launch(); }
async function phone(b, opts = {}) {
  const c = await b.newContext({ ...PHONE }); const p = await c.newPage(); p.errs = [];
  await p.addInitScript(o => { localStorage.setItem('bo_bw_default', '1'); for (const k of ['bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off', 'bo_hs_off']) if (!o.keep || !o.keep.includes(k)) localStorage.setItem(k, '1'); window.AudioContext = undefined; window.webkitAudioContext = undefined; }, { keep: opts.keep || [] });
  if (opts.record !== false) await p.addInitScript(RECORDER);
  p.on('pageerror', e => p.errs.push(e.message));
  return p;
}
// solo game: bots = 1 classic, 2 3p, 3 hunters, 4 5p ; role = data-role id; hkind for 5p
async function solo(b, bots, role, opts = {}) {
  const p = await phone(b, opts); await p.goto(U + (opts.theme ? '?theme=' + opts.theme : ''));
  await p.click('#playSolo'); await p.click(`[data-bots="${bots}"]`); await p.click('#soloGo');
  await p.waitForSelector(`[data-role="${role}"]`); await p.click(`[data-role="${role}"]`);
  if (opts.hkind) await p.click(`[data-hkind="${opts.hkind}"]`);
  if (opts.beforeStart) await opts.beforeStart(p);
  await p.click('#startGame'); await p.waitForSelector('#board .cell', { timeout: 15000 });
  return p;
}
const cell = (p, x, y) => p.locator('#board .cell').nth(y * 9 + x);
// contrast scan of everything visible
async function scan(p, textMin = 4.5, iconMin = 3) {
  return p.evaluate(([min, imin]) => {
    const out = [];
    const parse = c => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
    const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b), x = Math.max(l1, l2), y = Math.min(l1, l2); return (x + 0.05) / (y + 0.05); };
    const bgOf = el => { // composite ancestors' backgrounds
      const chain = []; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (cs.backgroundImage !== 'none') chain.push({ img: true }); if (c && c[3] > 0) { chain.push({ c }); if (c[3] >= 1) break; } }
      let base = [255, 255, 255]; let hasImg = false;
      for (let i = chain.length - 1; i >= 0; i--) { const q = chain[i]; if (q.img) { hasImg = true; continue; } const a = q.c[3]; base = [0, 1, 2].map(j => q.c[j] * a + base[j] * (1 - a)); }
      return { rgb: base, img: hasImg };
    };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.hidden,[hidden]')) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      let op = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) op *= +getComputedStyle(n).opacity; if (op < .05) continue;
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (own) {
        const fill = parse(cs.webkitTextFillColor) || parse(cs.color), bg = bgOf(el);
        if (fill && !bg.img) { const mixed = [0, 1, 2].map(j => fill[j] * op * fill[3] + bg.rgb[j] * (1 - op * fill[3])); const eff = ratio(mixed, bg.rgb); if (eff < min) out.push({ kind: 'text', text: own.slice(0, 50), sel: sig(el), color: cs.webkitTextFillColor, bg: 'rgb(' + bg.rgb.map(Math.round) + ')', ratio: +eff.toFixed(2), op: +op.toFixed(2), r: [r.x, r.y, r.width, r.height].map(Math.round) }); }
      }
      if (el.tagName === 'svg' && !el.closest('svg:not(:scope)') ) {
        const shapes = [...el.querySelectorAll('path,circle,rect,ellipse,line,polyline,polygon')].filter(s => { const q = getComputedStyle(s); return q.display !== 'none' && q.visibility !== 'hidden'; });
        if (shapes.length) {
          const bg = bgOf(el); let best = 0;
          for (const s of shapes) { const q = getComputedStyle(s); const f = q.fill !== 'none' ? parse(q.fill) : null, st = q.stroke !== 'none' ? parse(q.stroke) : null; for (const c of [f, st]) if (c && c[3] > .3) best = Math.max(best, ratio(c, bg.rgb)); }
          if (best < imin && best > 0) out.push({ kind: 'icon', sel: sig(el), ratio: +best.toFixed(2), bg: 'rgb(' + bg.rgb.map(Math.round) + ')', r: [r.x, r.y, r.width, r.height].map(Math.round) });
          if (best === 0) { const any = shapes.some(s => { const q = getComputedStyle(s); return q.fill !== 'none' || q.stroke !== 'none'; }); if (!any) out.push({ kind: 'icon-empty', sel: sig(el), r: [r.x, r.y, r.width, r.height].map(Math.round) }); }
        }
      }
    }
    function sig(el) { const p = []; for (let n = el, i = 0; n && n.tagName !== 'BODY' && i < 4; n = n.parentElement, i++) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/).join('.') : '')); return p.join(' > '); }
    return out;
  }, [textMin, iconMin]);
}
module.exports = { server, U, PORT, launch, phone, solo, cell, scan, ratio, lum, fs };
// everything a player can read right now, tagged with where it is
module.exports.texts = p => p.evaluate(() => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.hidden,[hidden]'); };
  const root = document.querySelector('#lobby:not(.hidden)') ? '#lobby' : '#app';
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).filter(Boolean).join(' ');
    if (own) out.push({ where: (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')), text: own });
    for (const a of ['title', 'aria-label']) { const v = el.getAttribute(a); if (v) out.push({ where: a + ':' + (el.id ? '#' + el.id : el.tagName.toLowerCase()), text: v }); }
  }
  for (const c of document.querySelectorAll('#board .cell')) if (c.dataset.tip) out.push({ where: 'cell-tip', text: c.dataset.tip, cell: [...c.parentNode.children].indexOf(c) });
  return out;
});
// plays through the ostrich's setup, closes role cards and "Tap to go on.", and returns when it is this phone's turn to move
module.exports.untilMyTurn = async (p, ms = 90000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await p.waitForTimeout(200);
    const st = await p.evaluate(() => { const S = UI._S(); return { play: S && S.phase === 'play', my: !!(S && S.myTurn), setup: S && S.phase !== 'play' && S.phase !== 'over', go: !!document.getElementById('surprise-go'), rc: !!document.querySelector('#rolecard:not(.hidden)'), busy: window.CUTAWAYS && CUTAWAYS.busy() }; });
    if (st.rc) { await p.click('#rolecard .rok'); continue; }
    if (st.go) { await p.click('#surprise-go button'); continue; }
    if (st.setup) { const lg = await p.evaluate(() => UI._legal()); if (lg.length) { const [x, y] = lg[Math.floor(Math.random() * lg.length)]; await p.locator('#board .cell').nth(y * 9 + x).click({ force: true }); } continue; }
    if (st.play && st.my && !st.busy) { await p.waitForTimeout(300); return; }
  }
  throw new Error('never got a turn');
};
