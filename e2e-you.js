// "YOU" tag on your own piece (Nov 4 playtest: "I don't see where I am"), on WebKit iPhone 13s.
// Covers: exactly one visible tag per phone for ostrich, vulture, hyena and badger (3-player and Hunters games), all 13 themes
// (inside its square, readable, takes no taps), a one-time 0.6 s pulse when a turn starts, no tag on an eliminated bird,
// and pass & play (the tag follows whoever holds the phone). JPEGs -> shots/you/.
process.env.PORT = 3965; process.env.BO_H3START = '8,3'; process.env.BO_H4START = '2,3,4,3'; process.env.BO_BOTMS = '200'; process.env.BO_CLOCKMS = '60000'; process.env.BO_TOUGH = '0';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'), T3 = require('./three.js'); const U = 'http://localhost:3965/', OUT = 'shots/you/'; fs.mkdirSync(OUT, { recursive: true });
const shot = async (p, n) => { await p.evaluate(() => { const t = document.querySelector('.youtag'); if (t) t.scrollIntoView({ block: 'center' }); }); return p.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 85 }); };
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
const PIECE = { ostrich: '.pc.po', vulture: '.pc.pv', hyena: '.pc.ph.mine', badger: '.pc.ph.mine' };
(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9'));
      // log every time a pulse element is added to or removed from the page
      window.__you = { adds: [], rems: [] };
      new MutationObserver(ms => { for (const m of ms) { m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('youpulse')) window.__you.adds.push(performance.now()); }); m.removedNodes.forEach(n => { if (n.classList && n.classList.contains('youpulse')) window.__you.rems.push(performance.now()); }); } }).observe(document, { childList: true, subtree: true }); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const pulses = p => p.evaluate(() => ({ adds: window.__you.adds.length, first: window.__you.adds[0] || 0, lastRem: Math.max(0, ...window.__you.rems), live: document.querySelectorAll('.youpulse').length }));
  // one visible YOU tag, inside the square that holds this phone's own piece, readable, and not tappable
  const reveal = p => p.evaluate(() => { const t = document.querySelector('.youtag'); if (t) t.scrollIntoView({ block: 'center' }); });
  const check = async (p, role, where) => {
    await reveal(p);
    const r = await p.evaluate(sel => {
      const all = [...document.querySelectorAll('.youtag')], vis = all.filter(t => { const s = getComputedStyle(t), q = t.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.9 && q.width > 4 && q.height > 4; });
      if (vis.length !== 1) return { n: vis.length, all: all.length };
      const t = vis[0], q = t.getBoundingClientRect(), s = getComputedStyle(t);
      // the tag hangs above the square that holds my piece: find that square (the one right under the tag's middle)
      const c = [...document.querySelectorAll('#board .cell')].find(x => { const r = x.getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - (q.left + q.right) / 2) < 3 && Math.abs(r.top - q.bottom) <= 4; });
      if (!c) return { n: 1, noSquare: true }; const cr = c.getBoundingClientRect();
      const rgb = x => (x.match(/[\d.]+/g) || []).slice(0, 3).map(Number), lum = a => { const [R, G, B] = a.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
      const l1 = lum(rgb(s.color)), l2 = lum(rgb(s.backgroundColor)), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const mid = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return { n: 1, text: t.textContent, piece: !!c.querySelector(sel), inside: q.bottom <= cr.top + 3 && q.top < cr.top, ratio, pe: s.pointerEvents, font: parseFloat(s.fontSize), through: mid !== t, board: !!c.closest('#board') };
    }, PIECE[role]);
    const w = role + ' ' + where;
    assert.equal(r.n, 1, w + ': exactly one visible YOU tag, saw ' + JSON.stringify(r)); assert.equal(r.text, 'YOU', w); assert.ok(r.piece, w + ': tag sits on the square with my ' + role);
    assert.ok(r.inside, w + ': the tag hangs above its square, not on it'); assert.ok(r.ratio >= 4.5, w + ': contrast ' + r.ratio.toFixed(1)); assert.equal(r.pe, 'none', w); assert.ok(r.through, w + ': taps go through the tag'); assert.ok(r.font >= 8.5, w + ': font ' + r.font);
  };
  const setTheme = async (p, t) => { await p.evaluate(x => THEME.set(x), t); };
  const allThemes = async (phones, label) => {
    for (const t of THEMES) { for (const [p] of phones) await setTheme(p, t); await phones[0][0].waitForTimeout(150);
      for (const [p, role] of phones) { await check(p, role, label + ' theme ' + t); if (t === 'neon' || t === 'nature') await p.locator('#board').screenshot({ path: OUT + `theme-${t}-${role}.jpg`, type: 'jpeg', quality: 80 }); } }
    for (const [p] of phones) await setTheme(p, 'classic'); await phones[0][0].waitForTimeout(150); };
  // a tap on a legal square right beside my own still moves me (the tag does not steal it)
  const tapNeighbour = async p => {
    await reveal(p);
    const pt = await p.evaluate(() => { const cells = [...document.querySelectorAll('#board .cell')], me = document.querySelector('#board .youring').closest('.cell'), mi = cells.indexOf(me), tg = document.querySelector('.youtag').getBoundingClientRect();
      for (const c of cells) { const i = cells.indexOf(c); if (!c.classList.contains('legal') || Math.max(Math.abs(i % 9 - mi % 9), Math.abs(Math.floor(i / 9) - Math.floor(mi / 9))) !== 1) continue;
        const q = c.getBoundingClientRect(); return { x: Math.min(q.right - 3, Math.max(q.left + 3, tg.left + tg.width / 2)), y: Math.min(q.bottom - 3, Math.max(q.top + 3, tg.top + tg.height / 2)), i }; } return null; });
    assert.ok(pt, 'a legal square next to me'); await p.touchscreen.tap(pt.x, pt.y); return pt.i; };

  // ================= 3 players: ostrich (A), vulture (V), hyena (H) =================
  const A = await mk(), V = await mk(), H = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3965');
  await V.goto(link); await H.goto(link);
  await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A.click('[data-role="blue"]'); await V.click('[data-role="red"]'); await H.click('[data-role="hyena"]'); await H.waitForFunction(() => /YOU ARE Hyena/.test(document.body.innerText));
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell'); await H.waitForSelector('#board .cell');
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  await V.waitForSelector('#actions.mine', { state: 'attached' }); await V.waitForTimeout(250);
  // vulture's turn has just started
  for (const [p, role] of [[A, 'ostrich'], [V, 'vulture'], [H, 'hyena']]) await check(p, role, '3-player');
  let pv = await pulses(V); assert.ok(pv.adds >= 1, 'vulture: pulse at turn start'); assert.equal((await pulses(A)).adds, 0, 'ostrich: no pulse on the vulture\'s turn'); assert.equal((await pulses(H)).adds, 0, 'hunter: no pulse on the vulture\'s turn');
  await V.waitForTimeout(900); pv = await pulses(V); assert.equal(pv.live, 0, 'vulture: pulse is gone within a second'); assert.ok(pv.lastRem - pv.first <= 1000, 'pulse lasted ' + (pv.lastRem - pv.first));
  for (let i = 0; i < 3; i++) await V.evaluate(() => UI._rr()); await V.waitForTimeout(100); assert.equal((await pulses(V)).adds, pv.adds, 'vulture: re-rendering the same turn does not pulse again');
  await shot(A, 'ostrich'); await shot(V, 'vulture'); await shot(H, 'hyena');
  await allThemes([[A, 'ostrich'], [V, 'vulture'], [H, 'hyena']], '3-player');
  assert.equal((await pulses(V)).adds, pv.adds, 'vulture: switching themes mid-turn does not pulse again');
  const room3 = [...server.rooms.values()].find(r => r.three);
  const vTo = await tapNeighbour(V); await A.waitForSelector('#actions.mine', { state: 'attached' }); await A.waitForTimeout(250);
  assert.equal(room3.g.vulture[1] * 9 + room3.g.vulture[0], vTo, 'a tap on the square beside the vulture tag moved the vulture');
  assert.equal((await pulses(A)).adds >= 1, true, 'ostrich: pulse at the start of its turn'); await A.waitForTimeout(900); const pa = await pulses(A); assert.equal(pa.live, 0); assert.ok(pa.lastRem - pa.first <= 1000);
  await check(A, 'ostrich', 'ostrich turn');
  const aTo = await tapNeighbour(A); await H.waitForSelector('#actions.mine', { state: 'attached' }); await H.waitForTimeout(250);
  assert.equal(room3.g.ostrich[1] * 9 + room3.g.ostrich[0], aTo, 'a tap beside the ostrich tag moved the ostrich');
  assert.ok((await pulses(H)).adds >= 1, 'hunter: pulse at the start of its turn'); await H.waitForTimeout(900); const ph = await pulses(H); assert.equal(ph.live, 0); assert.ok(ph.lastRem - ph.first <= 1000);
  await check(H, 'hyena', 'hyena turn'); await check(A, 'ostrich', 'after move'); await check(V, 'vulture', 'after move');
  // eliminated bird: off the board, so no tag; the others keep theirs
  T3.knockout(room3.g, 'red', 'caught'); server.broadcast(room3); await V.waitForFunction(() => UI._S().h3.birds.red.out && UI._S().god); // out bird gets the approved full-board spectator view
  assert.equal(await V.locator('.youtag').count(), 0, 'eliminated vulture: no YOU tag'); await check(A, 'ostrich', 'vulture out'); await check(H, 'hyena', 'vulture out');
  await Promise.all([A.context().close(), V.context().close(), H.context().close()]);

  // ================= Hunters: badger (A) and hyena (Y) with two computer birds =================
  const A4 = await mk(); await A4.goto(U); await A4.click('#playFriend'); await A4.waitForSelector('#lobbyCode:not(:empty)');
  const link4 = (await A4.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3965');
  const Y = await mk(); await Y.goto(link4); await Y.waitForSelector('#roomLobby');
  await A4.click('#botPlus'); await A4.click('#botPlus'); await A4.waitForSelector('[data-role="badger"]'); await A4.click('[data-role="badger"]'); await Y.click('[data-role="hyena"]');
  await Y.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'hyena' && r.mine); });
  await A4.click('#startGame'); await Y.waitForSelector('#board .cell'); await Y.waitForSelector('#actions.mine', { state: 'attached', timeout: 20000 }); await Y.waitForTimeout(250);
  await check(Y, 'hyena', 'hunters'); await check(A4, 'badger', 'hunters');
  assert.ok((await pulses(Y)).adds >= 1, 'hyena: pulse at turn start'); assert.equal((await pulses(A4)).adds, 0, 'badger: no pulse before its turn');
  await allThemes([[Y, 'hyena'], [A4, 'badger']], 'hunters');
  await Y.locator('#actions button').first().click({ force: true }); // hyena stays put
  await A4.waitForSelector('#actions.mine', { state: 'attached', timeout: 20000 }); await A4.waitForTimeout(250);
  assert.ok((await pulses(A4)).adds >= 1, 'badger: pulse at turn start'); await A4.waitForTimeout(900); const pb = await pulses(A4); assert.equal(pb.live, 0); assert.ok(pb.lastRem - pb.first <= 1000);
  await A4.locator('#actions button').first().click({ force: true }); // burrow
  await A4.waitForSelector('.pc.ph.bur', { state: 'attached', timeout: 8000 });
  await A4.waitForFunction(() => { const t = document.querySelector('.youtag'); if (!t) return false; const s = getComputedStyle(t), q = t.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.9 && q.width > 4 && q.height > 4; }, null, { timeout: 8000 });
  await check(A4, 'badger', 'burrowed'); await shot(A4, 'badger'); await allThemes([[A4, 'badger']], 'burrowed');
  await A4.context().close(); await Y.context().close();

  // ================= Pass & play: the tag follows whoever holds the phone =================
  const P = await mk(); await P.goto(U); await P.click('#playPass'); await P.click('#passGo');
  await P.waitForSelector('#handoff.blue'); await P.click('#hGo');
  for (const [x, y] of [[3, 4], [6, 4], [2, 1], [7, 1]]) { await cell(P, x, y).click(); await P.waitForTimeout(80); }
  await P.waitForSelector('#handoff.red'); await P.click('#hGo'); await P.waitForSelector('#actions.mine', { state: 'attached' }); await P.waitForTimeout(250);
  await check(P, 'vulture', 'pass vulture'); assert.ok((await pulses(P)).adds >= 1, 'pass: pulse when the vulture takes the phone');
  await P.locator('.cell.legal').first().click(); await P.waitForSelector('#handoff.blue', { timeout: 6000 }); await P.click('#hGo'); await P.waitForSelector('#actions.mine', { state: 'attached' }); await P.waitForTimeout(250);
  await check(P, 'ostrich', 'pass ostrich'); assert.equal(await P.locator('.cell:has(.youtag) .pc.pv').count(), 0, 'pass: the ostrich phone does not tag the vulture');

  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-you'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
