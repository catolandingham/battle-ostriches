// 5-player phones: every theme draws every bird this seat can see, number tag included.
// Also checks a kick and a catch still show a bird drawing on both phones.
process.env.PORT = '4033';
process.env.BO_BOTMS = '900000';
process.env.BO_CLOCKMS = '900000';
process.env.BO_NOSTORE = '1';
const { webkit } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js');
const U = 'http://localhost:4033/';
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];

(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
    const p = await c.newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1');
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  const A = await mk(), V = await mk();
  await A.goto(U);
  await A.click('#playFriend');
  await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4033');
  await V.goto(link);
  await V.waitForSelector('#roomLobby');
  for (let i = 0; i < 3; i++) { await A.click('#botPlus'); await A.waitForTimeout(120); }
  await A.waitForSelector('[data-role="o1"]');
  await A.click('[data-role="o1"]');
  await V.click('[data-role="v1"]');
  await V.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'v1' && r.mine); });
  await A.click('#startGame');
  await A.waitForSelector('#board .cell', { timeout: 15000 });
  await V.waitForSelector('#board .cell', { timeout: 15000 });
  const room = [...server.rooms.values()].find(r => r.team && r.n === 5);
  assert.ok(room, '5-player room');
  room.aiT = 1;
  const g = room.g;
  const lay = () => {
    g.eggs = [
      { id: 0, nest: 0, pos: [0, 3], alive: true, lastWarm: 0 },
      { id: 1, nest: 0, pos: [3, 0], alive: true, lastWarm: 0 },
      { id: 2, nest: 1, pos: [8, 2], alive: true, lastWarm: 0 },
      { id: 3, nest: 1, pos: [5, 0], alive: true, lastWarm: 0 },
    ];
    g.b.o1.pos = [2, 2]; g.b.o1.out = false; g.b.o1.carrying = null;
    g.b.o2.pos = [6, 1]; g.b.o2.out = false; g.b.o2.carrying = null;
    g.b.v1.pos = [2, 5]; g.b.v1.out = false;
    g.b.v2.pos = [6, 4]; g.b.v2.out = false;
    g.phase = 'play'; g.turn = 'o1';
    g.h.kind = 'badger'; g.h.burrowed = true; g.h.p = [8, 6];
    room.aiT = 1;
    server.broadcast(room);
  };
  lay();
  const birdsReady = () => pageWait(A) && pageWait(V);
  function pageWait(page) {
    return page.waitForFunction(() => {
      const S = UI._S();
      return S && S.phase === 'play' && document.querySelectorAll('#board .pc.po, #board .pc.pv').length >= 4;
    });
  }
  await birdsReady();
  const audit = (theme) => {
    const plain = theme === 'bw' || theme === 'classic';
    const problems = [];
    const birds = [...document.querySelectorAll('#board .pc.po, #board .pc.pv')];
    if (birds.length < 4) problems.push('birds ' + birds.length);
    if (document.querySelector('#board .pc.ph')) problems.push('hunter drawn');
    const sprites = [...document.querySelectorAll('#fx .spr')].filter(s => getComputedStyle(s).visibility !== 'hidden');
    if (plain && sprites.length) problems.push('plain theme painted overlays ' + sprites.length);
    if (!plain && sprites.length !== birds.length) problems.push('sprites ' + sprites.length + ' birds ' + birds.length);
    for (const pc of birds) {
      const r = pc.getBoundingClientRect();
      const hidden = getComputedStyle(pc).visibility === 'hidden';
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const spr = sprites.find(s => {
        const sr = s.getBoundingClientRect();
        return sr.width > 4 && cx >= sr.left && cx <= sr.right && cy >= sr.top && cy <= sr.bottom;
      });
      if (plain) {
        if (hidden) problems.push('plain piece hidden ' + pc.className);
        const img = pc.querySelector('img.aimg, svg');
        if (!img || (img.tagName === 'IMG' && (!img.complete || img.naturalWidth < 1))) problems.push('plain drawing ' + pc.className);
      } else {
        if (!hidden) problems.push('themed piece not hidden ' + pc.className);
        if (!spr) { problems.push('no overlay ' + pc.className); continue; }
        const img = spr.querySelector('img.aimg, svg');
        if (!img || (img.tagName === 'IMG' && (!img.complete || img.naturalWidth < 1))) problems.push('overlay drawing ' + pc.className);
        const ir = img.getBoundingClientRect();
        if (ir.width < 8 || ir.height < 8) problems.push('overlay too small ' + pc.className);
      }
      const num = (spr && spr.querySelector('b.snum')) || [...pc.parentElement.querySelectorAll(':scope>b.snum')].find(n => getComputedStyle(n).visibility !== 'hidden');
      if (!num || !num.textContent.trim() || getComputedStyle(num).visibility === 'hidden') problems.push('number ' + pc.className);
      if (pc.classList.contains('mate') && !plain && (!spr || !spr.classList.contains('mate'))) problems.push('teammate look ' + (spr && spr.className));
      if (pc.classList.contains('opp') && !plain && (!spr || !spr.classList.contains('opp'))) problems.push('opponent look ' + (spr && spr.className));
    }
    if (document.querySelectorAll('#board .pc.other.mate').length !== 1) problems.push('mate piece count');
    return { problems, seat: (UI._S().h3 || {}).mySeat, sprites: sprites.map(s => s.className) };
  };
  for (const theme of THEMES) {
    for (const [page, who] of [[A, 'ostrich'], [V, 'vulture']]) {
      await page.evaluate(t => THEME.set(t), theme);
      await page.waitForFunction(t => document.documentElement.getAttribute('data-theme') === t && document.querySelectorAll('#board .pc.po, #board .pc.pv').length >= 4, theme);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const got = await page.evaluate(audit, theme);
      assert.deepEqual(got.problems, [], who + ' ' + theme + ' ' + JSON.stringify(got));
    }
  }
  console.log('ok drawings, 14 themes, both phones');
  // A carrying ostrich's number is a small rounded square at the bottom left, clear of the egg in the beak. Other numbers stay put.
  g.b.o1.carrying = g.eggs[0].id; g.eggs[0].pos = null; room.aiT = 1; server.broadcast(room);
  const carryBadge = () => {
    const problems = [];
    const shown = el => {
      if (!el) return false;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    };
    const pc = document.querySelector('#board .pc.po.carrying');
    if (!pc) return ['no carrying piece'];
    const cell = pc.closest('.cell'), cr = cell.getBoundingClientRect();
    const imgs = [...document.querySelectorAll('img.aimg-ostrich-carry')].filter(shown);
    if (imgs.length !== 1) problems.push('carry images ' + imgs.length);
    const over = el => { const r = el.getBoundingClientRect(); return r.left < cr.right && r.right > cr.left && r.top < cr.bottom && r.bottom > cr.top; };
    const badges = [...document.querySelectorAll('b.snum')].filter(el => shown(el) && over(el));
    if (badges.length !== 1) problems.push('badges ' + badges.length + ' ' + badges.map(b => b.className).join('|'));
    const badge = badges[0];
    if (badge && imgs[0]) {
      const br = badge.getBoundingClientRect(), ir = imgs[0].getBoundingClientRect();
      const rad = parseFloat(getComputedStyle(badge).borderTopLeftRadius) || 0;
      if (!(rad > 0 && rad * 2 < br.width - 1)) problems.push('shape radius ' + rad + ' width ' + Math.round(br.width));
      if (br.width > 14 || br.height > 14) problems.push('too big ' + Math.round(br.width));
      if (br.left > cr.left + cr.width * 0.42) problems.push('not at the left');
      if (br.top < cr.top + cr.height * 0.4) problems.push('not at the bottom');
      const egg = { l: ir.left + ir.width * 0.36, r: ir.left + ir.width * 0.78, t: ir.top + ir.height * 0.42, b: ir.top + ir.height * 0.82 };
      if (br.right > egg.l && br.left < egg.r && br.bottom > egg.t && br.top < egg.b) problems.push('badge covers the egg');
    }
    const other = document.querySelector('#board .pc.po:not(.carrying)');
    if (other) {
      const oc = other.closest('.cell').getBoundingClientRect();
      const ob = [...document.querySelectorAll('b.snum')].filter(shown).find(b => { const r = b.getBoundingClientRect(); return r.left < oc.right && r.right > oc.left && r.top < oc.bottom && r.bottom > oc.top; });
      if (!ob) problems.push('other number missing');
      else if (ob.classList.contains('carrytag') || ob.getBoundingClientRect().left < oc.left + oc.width * 0.45) problems.push('other number moved ' + ob.className);
    }
    return problems;
  };
  for (const theme of THEMES) {
    for (const [page, who] of [[V, 'vulture'], [A, 'ostrich']]) {
      await page.evaluate(t => THEME.set(t), theme);
      await page.waitForFunction(() => !!document.querySelector('#board .pc.po.carrying'));
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const got = await page.evaluate(carryBadge);
      assert.deepEqual(got, [], who + ' carry badge ' + theme + ' ' + JSON.stringify(got));
    }
  }
  console.log('ok carry badge, 14 themes, both phones');
  g.b.o1.carrying = null; g.eggs[0].pos = [0, 3]; room.aiT = 1; server.broadcast(room);
  // Kick: Ostrich 1 pushes Vulture 1. Both phones must show a bird drawing in the cartoon or the slide.
  g.b.o1.pos = [2, 2]; g.b.v1.pos = [3, 2]; g.b.o2.pos = [7, 1]; g.b.v2.pos = [7, 5];
  g.turn = 'o1'; g.b.o1.carrying = null; g.phase = 'play';
  room.aiT = 1; server.broadcast(room);
  await A.evaluate(() => THEME.set('nature'));
  await V.evaluate(() => THEME.set('comic'));
  await A.waitForSelector('#actions button:has-text("Kick")', { timeout: 8000 });
  await A.locator('#actions button:has-text("Kick")').click();
  await A.waitForFunction(() => document.getElementById('hint').textContent === 'Tap where they go.');
  const ghost = await A.evaluate(() => {
    const img = document.querySelector('.kick-ghost img.aimg, .kick-ghost svg');
    if (!img) return null;
    const r = img.getBoundingClientRect(), cs = getComputedStyle(img);
    return { w: r.width, h: r.height, vis: cs.visibility, op: cs.opacity };
  });
  assert.ok(ghost && ghost.w > 8 && ghost.h > 8 && ghost.vis !== 'hidden' && +ghost.op > 0, 'kick preview drawing ' + JSON.stringify(ghost));
  await A.locator('#board .cell').nth(2 * 9 + 6).click();
  const drawingUp = () => {
    const el = document.querySelector('.push-motion .push-actor img.aimg, .push-motion .push-actor svg, #cutaway .cutaway-piece img, #cutaway canvas.cutaway-art');
    if (!el) return false;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 8 && r.height > 8 && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
  };
  await A.waitForFunction(drawingUp, null, { timeout: 12000 });
  await V.waitForFunction(drawingUp, null, { timeout: 12000 });
  console.log('ok kick cartoon, both phones');
  const idle = page => page.waitForFunction(() => !document.querySelector('#cutaway,.push-motion,.partial-motion,#surprise-go') && !document.documentElement.classList.contains('cutaway-up') && !document.documentElement.classList.contains('surprise-slide'), null, { timeout: 20000 });
  await idle(A); await idle(V);
  // Catch: the hunter lands on Ostrich 2, inside both phones' sight. The cartoon and the bird slide still draw.
  g.turn = 'hunter'; g.h.kind = 'hyena'; g.h.burrowed = false; g.h.pounce = false; g.h.p = [4, 1];
  g.b.o1.pos = [3, 3]; g.b.v1.pos = [5, 3]; g.b.o2.pos = [4, 3]; g.b.o2.out = false; g.b.v2.pos = [8, 5];
  g.phase = 'play';
  room.aiT = 1;
  assert.ok(server.actT(room, 'hunter', { a: 'hmove', p: [4, 3] }), 'hunter catch');
  room.aiT = 1; server.broadcast(room);
  await A.waitForFunction(drawingUp, null, { timeout: 15000 });
  await V.waitForFunction(drawingUp, null, { timeout: 15000 });
  console.log('ok catch cartoon, both phones');
  console.log('errors', errs);
  assert.deepEqual(errs, []);
  await b.close(); server.close();
  console.log('PASS e2e-team-themes');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
