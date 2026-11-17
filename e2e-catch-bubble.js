// Phone-width checks: every far seat still gets the catch cartoon, the badger's saying
// sits in its own bubble without covering a piece, and a team throw at a teammate
// says "Your teammate is there."
// WebKit, 390 x 664.
process.env.PORT = '4022'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '60000';
const { webkit } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
const S = require('./server'), T = require('./three'), TT = require('./team'), B = require('./game');
const U = 'http://localhost:4022/', OUT = 'shots/catch-bubble/';
fs.mkdirSync(OUT, { recursive: true });
const shot = (p, n) => p.screenshot({ path: OUT + n + '.png' });

(async () => {
  const browser = await webkit.launch(), errs = [];
  const page = async () => {
    const p = await browser.newPage({ viewport: { width: 390, height: 664 } });
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1');
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  async function join(p, code, token) {
    await p.addInitScript((pack) => {
      localStorage.setItem('bo_me', JSON.stringify({ code: pack.code, token: pack.token, role: pack.role }));
      localStorage.setItem('bo_seat_' + pack.code, pack.token);
    }, { code, token, role: '' });
    await p.goto(U + '?room=' + code);
    try { await p.waitForSelector('#board .cell', { timeout: 15000 }); }
    catch (e) {
      const dump = await p.evaluate(() => ({ href: location.href, me: localStorage.getItem('bo_me'), seat: Object.keys(localStorage).filter(k => k.startsWith('bo_seat')), lobby: (document.getElementById('lobbyErr') || {}).textContent, log: (document.getElementById('log') || {}).textContent, phase: window.UI && UI._S() && UI._S().phase, html: document.body.innerText.slice(0, 500) }));
      console.log('JOIN DUMP', JSON.stringify(dump, null, 2));
      console.log('PAGE ERRORS', errs);
      throw e;
    }
  }

  // 5 players. This phone is Ostrich 2, too far to see the hyena. The cartoon still plays.
  {
    const made = S.createT({ team: 5, role: 'o2', bots: ['o1', 'v1', 'v2', 'hunter'], kind: 'hyena' }, null);
    const g = made.room.g = TT.newTeam(5, 'hyena');
    g.phase = 'play'; g.round = 2; g.turn = 'hunter';
    g.b.o1.pos = [4, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [0, 6];
    g.h.p = [3, 3]; g.h.kind = 'hyena'; g.h.pounce = false;
    g.eggs.push({ id: 0, nest: 0, pos: [2, 1], alive: true, lastWarm: 0 }, { id: 1, nest: 1, pos: [6, 1], alive: true, lastWarm: 0 });
    const p = await page();
    await join(p, made.room.code, made.token);
    await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.h3 && !s.h3.lastCatch; });
    assert.ok(TT.hunterMove(g, [4, 3]));
    S.broadcast(made.room);
    await p.waitForSelector('#cutaway', { timeout: 8000 });
    await p.waitForFunction(() => {
      const c = document.querySelector('#cutaway canvas'); if (!c) return false;
      const ctx = c.getContext('2d'), w = c.width, h = c.height;
      for (let i = 0; i < 24; i++) { const d = ctx.getImageData((i * 53) % w, (i * 37) % h, 1, 1).data; if (d[3] && (d[0] < 250 || d[1] < 250 || d[2] < 250)) return true; }
      return false;
    }, null, { timeout: 8000 });
    const info = await p.evaluate(() => {
      const cut = document.getElementById('cutaway'), s = UI._S();
      return { scene: cut.dataset.scene, path: !!cut.querySelector('.cutaway-path'), words: (cut.innerText || '').trim(), at: s.h3.lastCatch.at, to: s.h3.lastCatch.to, burrowed: s.h3.burrowed, hunter: s.h3.hunter, piece: !!document.querySelector('#board .pc.ph'), w: window.innerWidth };
    });
    assert.equal(info.w, 390);
    assert.equal(info.scene, 'catch', 'far ostrich still gets the catch cartoon');
    assert.equal(info.path, false, 'the cartoon draws no board path');
    assert.equal(info.words, '', 'the cartoon has no words and no square');
    assert.equal(info.at, null, 'this phone was not sent the catch square');
    assert.equal(info.hunter, null, 'the hunter stays hidden');
    assert.equal(info.burrowed, false);
    assert.equal(info.piece, false, 'no hunter piece on the board');
    await shot(p, 'catch-cartoon-390');
    await p.close();
  }

  // Badger phone: a short saying in the bubble, clear of every piece.
  {
    const made = S.create3({ role: 'hunter', bots: ['blue', 'red'], kind: 'badger' }, null);
    const g = made.room.g = T.newGame3('badger', undefined, [4, 3]);
    for (const q of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, q);
    T.placeOstrich3(g, [1, 1]);
    g.phase = 'play'; g.round = 2; g.turn = 'hunter'; g.vulture = [7, 5];
    g.three.h = [4, 3]; g.three.burrowed = true; g.three.pounce = false; g.three.kind = 'badger';
    const p = await page();
    await join(p, made.room.code, made.token);
    await p.waitForFunction(() => { const s = UI._S(); return s && s.myTurn && s.burrowed; });
    assert.ok(T.hunterStay(g));
    S.broadcast(made.room);
    try { await p.waitForFunction(t => (document.getElementById('badgerline') || {}).textContent === t, "Badger doesn't care.", { timeout: 8000 }); }
    catch (e) {
      const dump = await p.evaluate(() => { const s = UI._S() || {}; return { line: (document.getElementById('badgerline') || {}).textContent || null, burrowed: s.burrowed, myTurn: s.myTurn, turn: s.turn, role: s.role, kind: s.kind, h3kind: s.h3 && s.h3.kind, phase: s.phase, hint: (document.getElementById('hint') || {}).textContent }; });
      console.log('BUBBLE DUMP', JSON.stringify(dump)); console.log('PAGE ERRORS', errs); throw e;
    }
    const box = await p.evaluate(() => {
      const el = document.getElementById('badgerline'), br = el.getBoundingClientRect();
      const pieces = [...document.querySelectorAll('#board .pc')].map(n => n.getBoundingClientRect());
      const slot = document.getElementById('msgslot').getBoundingClientRect();
      const cell = document.querySelector('#board .pc.ph').closest('.cell').getBoundingClientRect();
      const hit = r => br.left < r.right - 0.5 && br.right > r.left + 0.5 && br.top < r.bottom - 0.5 && br.bottom > r.top + 0.5;
      const dx = Math.abs((br.left + br.right) / 2 - (cell.left + cell.right) / 2);
      const above = br.bottom <= cell.top + 4 && cell.top - br.bottom < 28;
      const below = br.top >= cell.bottom - 4 && br.top - cell.bottom < 28;
      const beside = br.top < cell.bottom && br.bottom > cell.top && (Math.abs(br.right - cell.left) < 28 || Math.abs(br.left - cell.right) < 28);
      return { off: el.classList.contains('offboard'), text: el.textContent, overlap: pieces.filter(hit).length, coversStatus: hit(slot), near: dx < 180 && (above || below || beside), w: window.innerWidth, status: document.getElementById('hint').textContent };
    });
    assert.equal(box.w, 390);
    assert.equal(box.off, false, 'the saying sits on the board, next to the badger');
    assert.equal(box.overlap, 0, 'the bubble does not cover a piece');
    assert.equal(box.coversStatus, false, 'the bubble does not cover the status line');
    assert.equal(box.near, true, 'the bubble is next to the badger square');
    assert.ok(!/Badger doesn't care/.test(box.status), 'the saying is not the status line');
    await shot(p, 'badger-bubble-390');
    await p.close();
  }

  // 2 vs 2: Throw mode, tap the teammate who is one square away.
  {
    const made = S.createT({ team: 4, role: 'v1', bots: ['v2', 'o1', 'o2'] }, null);
    const g = made.room.g = TT.newTeam(4, null);
    g.phase = 'play'; g.round = 2; g.turn = 'v1';
    g.b.v1.pos = [3, 3]; g.b.v2.pos = [3, 4]; g.b.o1.pos = [0, 0]; g.b.o2.pos = [8, 6];
    g.b.v1.stones = 1;
    const p = await page();
    await join(p, made.room.code, made.token);
    await p.waitForFunction(() => { const s = UI._S(); return s && s.myTurn && s.phase === 'play' && (s.throw || []).length; });
    await p.locator('#actions button', { hasText: 'Throw' }).click();
    await p.locator('#board .cell').nth(4 * 9 + 3).click();
    await p.waitForFunction(t => document.getElementById('hint').textContent === t, 'Your teammate is there.');
    await shot(p, 'teammate-throw-390');
    await p.locator('#board .cell').nth(0).click();
    await p.waitForFunction(t => document.getElementById('hint').textContent === t, 'Too far.');
    g.b.v1.stones = 0;
    S.broadcast(made.room);
    await p.waitForFunction(() => UI._S().stones === 0);
    await p.locator('#board .cell').nth(4 * 9 + 3).click();
    await p.waitForFunction(t => document.getElementById('hint').textContent === t, 'No stone. Go to rocks.');
    await p.close();
  }

  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  S.close();
  console.log('PASS catch cartoon, badger bubble, teammate throw at 390');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
