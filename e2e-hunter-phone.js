// Phone 390x844 and a short keyboard viewport: hunter can see why no bird is drawn, and can tap a real step.
const { chromium } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = '3983';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '40';
process.env.BO_CLOCKMS = '60000';
const T = require('./three.js');
const server = require('./server.js');
const OUT = '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });
const phone = { viewport: { width: 390, height: 844 } };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] }), errs = [];
  const open = async () => {
    const page = await (await browser.newContext(phone)).newPage();
    page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue', '1'); localStorage.setItem('bo_walk_red', '1'); localStorage.setItem('bo_hs_off', '1'); localStorage.setItem('bo_tips_off', '1'); });
    await page.goto('http://127.0.0.1:3983/', { timeout: 20000 });
    return page;
  };
  const lay = page => page.evaluate(() => {
    const r = el => el.getBoundingClientRect();
    const hud = r(document.getElementById('hud')), board = r(document.getElementById('board')), hint = r(document.getElementById('hint'));
    const legal = [...document.querySelectorAll('.cell.legal')].map(c => { const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, top: b.top, bot: b.bottom }; });
    const shown = legal.filter(p => p.top >= board.top && p.bot <= Math.min(board.bottom, innerHeight));
    return {
      gap: Math.round(board.top - hint.bottom),
      overlap: hud.bottom > board.top + 1,
      legal: legal.length, shown: shown.length, sample: shown[0] || legal[0] || null,
      hint: document.getElementById('hint').textContent,
      tipH: document.getElementById('tipbar').getBoundingClientRect().height
    };
  });
  const H = await open();
  await H.evaluate(() => UI.open({ t: 'create', solo: 1, bots: 2 }));
  await H.waitForFunction(() => LobbyUI.get() && LobbyUI.get().solo);
  await H.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'hyena', kind: 'hyena' }));
  await H.waitForFunction(() => /YOU ARE Hyena/.test(document.body.innerText));
  await H.evaluate(() => UI.send({ t: 'lobby', a: 'start' }));
  await H.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.role === 'hunter' && S.myTurn; }, null, { timeout: 20000 });
  const fit = page => page.evaluate(() => {
    const board = document.getElementById('board');
    board.scrollLeft = 0;
    const br = board.getBoundingClientRect();
    const cells = [...board.querySelectorAll('.cell')];
    const last = cells[8].getBoundingClientRect();
    const legal = [...board.querySelectorAll('.cell.legal')];
    const hits = legal.map(c => {
      const b = c.getBoundingClientRect();
      if (b.bottom > br.bottom - 1) board.scrollTop += b.bottom - br.bottom + 2;
      const b2 = c.getBoundingClientRect();
      const x = b2.left + b2.width / 2, y = b2.top + b2.height / 2;
      const top = document.elementFromPoint(x, y);
      return { x, y, ok: !!(top && top.closest('.cell') === c), w: Math.round(b2.width), inX: b2.left >= br.left - 1 && b2.right <= br.right + 1 };
    });
    return {
      scrollX: board.scrollWidth - board.clientWidth, client: board.clientWidth, scroll: board.scrollWidth, overflowX: getComputedStyle(board).overflowX,
      scrollLeft: board.scrollLeft,
      lastInside: last.right <= br.right + 1,
      minW: Math.min(...cells.slice(0, 9).map(c => Math.round(c.getBoundingClientRect().width))),
      hits, n: hits.length,
      overlap: document.getElementById('hud').getBoundingClientRect().bottom > br.top + 1
    };
  });
  const assertFit = (label, box) => {
    assert.ok(box.overflowX === 'clip' || box.overflowX === 'hidden', label + ' board can still scroll sideways ' + box.overflowX);
    assert.ok(box.lastInside && box.hits.every(h => h.inX), label + ' a column is past the edge ' + JSON.stringify(box));
    assert.equal(box.scrollLeft, 0, label + ' scrolled sideways');
    assert.equal(box.lastInside, true, label + ' column 9 is clipped');
    assert.ok(box.minW >= 32, label + ' cell ' + box.minW);
    assert.ok(box.n >= 5, label + ' legal ' + box.n);
    assert.ok(box.hits.every(h => h.ok && h.inX), label + ' a step is not under the finger ' + JSON.stringify(box.hits));
    assert.equal(box.overlap, false, label + ' header covers the board');
  };
  const desk = await lay(H);
  assert.ok(desk.legal >= 3, 'hunter has steps ' + desk.legal);
  assert.match(desk.hint, /no bird is drawn|not pointed at/);
  assert.ok(desk.tipH < 2, 'hidden tip does not reserve a band');
  assert.ok(desk.gap < 90, 'gap under the hint is ' + desk.gap);
  assert.equal(desk.overlap, false);
  const tall = await fit(H);
  assertFit('844', tall);
  await H.screenshot({ path: OUT + '/hunter-phone-844.png' });
  await H.setViewportSize({ width: 390, height: 544 });
  await H.waitForTimeout(150);
  const short = await fit(H);
  assertFit('544', short);
  await H.screenshot({ path: OUT + '/hunter-phone-544.png' });
  await H.setViewportSize({ width: 390, height: 844 });
  const before = await H.evaluate(() => UI._S().hunter.slice());
  await H.mouse.click(tall.hits[0].x, tall.hits[0].y);
  await H.waitForFunction(p => { const h = UI._S() && UI._S().hunter; return h && (h[0] !== p[0] || h[1] !== p[1]); }, before, { timeout: 8000 });
  const roomCode = await H.evaluate(() => UI._S().code);
  const room = server.rooms.get(roomCode);
  clearTimeout(room.aiT); clearTimeout(room.clockT);
  const g = room.g;
  g.phase = 'play'; g.turn = 'hunter';
  const nbr = T.hunterMoves(g)[0];
  g.ostrich = nbr.slice();
  g.three.birds.blue.out = false; g.three.birds.blue.catches = 0; g.three.birds.blue.skip = 0;
  if (g.vulture[0] === nbr[0] && g.vulture[1] === nbr[1]) g.vulture = [0, 0];
  g.three.pounce = false; g.three.sense = T.senses(g); g.three.senseSeq++;
  server.broadcast(room);
  await H.waitForFunction(p => { const S = UI._S(); return S && S.myTurn && S.hmoves.some(q => q[0] === p[0] && q[1] === p[1]); }, nbr, { timeout: 8000 });
  await H.screenshot({ path: OUT + '/hunter-before-catch.png' });
  const hit = await H.evaluate(p => {
    const S = UI._S();
    const cell = document.querySelectorAll('#board .cell')[p[1] * S.cfg.cols + p[0]];
    const b = cell.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, ok: !!(top && top.closest('.cell') === cell) };
  }, nbr);
  assert.equal(hit.ok, true, 'the catch square is on screen');
  await H.mouse.click(hit.x, hit.y);
  await H.waitForFunction(() => UI._S().h3.birds.blue.catches === 1, null, { timeout: 8000 });
  const B = await open();
  await B.evaluate(() => UI.open({ t: 'create', solo: 1, bots: 2 }));
  await B.waitForFunction(() => LobbyUI.get() && LobbyUI.get().solo);
  await B.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'badger', kind: 'badger' }));
  await B.waitForFunction(() => /Honey Badger/.test(document.body.innerText));
  await B.evaluate(() => UI.send({ t: 'lobby', a: 'start' }));
  await B.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.myTurn && S.h3 && S.h3.kind === 'badger'; }, null, { timeout: 20000 });
  const badger = await B.evaluate(() => ({
    mine: !!document.querySelector('.pc.ph.hbadger.mine'),
    burrow: document.querySelectorAll('.pc.ph.bur').length,
    mound: document.body.innerText.includes('BURROWED')
  }));
  assert.equal(badger.mine, true, 'own badger is drawn before burrow');
  assert.equal(badger.burrow, 0);
  assert.equal(badger.mound, false);
  await B.screenshot({ path: OUT + '/badger-before-burrow.png' });
  const host = await open();
  await host.evaluate(() => UI.open({ t: 'create', friends: 1 }));
  await host.waitForSelector('#lobbyCode');
  await host.evaluate(() => UI.send({ t: 'lobby', a: 'bots', n: 1 }));
  await host.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'hyena', kind: 'hyena' }));
  const code = (await host.textContent('#lobbyCode')).trim();
  const guest = await open();
  await guest.evaluate(c => UI.open({ t: 'join', code: c }), code);
  await guest.waitForSelector('#roomLobby:not(.hidden)');
  await guest.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'blue' }));
  await host.waitForFunction(() => LobbyUI.get().humanCount === 2 && !document.getElementById('startGame').disabled);
  await host.evaluate(() => UI.send({ t: 'lobby', a: 'start' }));
  await host.waitForFunction(() => { const S = UI._S(); return S && S.role === 'hunter' && S.phase; }, null, { timeout: 15000 });
  await guest.waitForFunction(() => { const S = UI._S(); return S && S.role === 'blue' && S.phase; }, null, { timeout: 15000 });
  const huntRoom = server.rooms.get(code);
  clearTimeout(huntRoom.aiT); clearTimeout(huntRoom.clockT);
  const hg = huntRoom.g;
  hg.phase = 'play'; hg.turn = 'hunter';
  const spot = T.hunterMoves(hg)[0];
  hg.ostrich = spot.slice();
  hg.three.birds.blue.out = false; hg.three.birds.blue.catches = 0; hg.three.birds.blue.skip = 0;
  hg.three.pounce = false; hg.three.sense = T.senses(hg); hg.three.senseSeq++;
  server.broadcast(huntRoom);
  await host.waitForFunction(p => UI._S().myTurn && UI._S().hmoves.some(q => q[0] === p[0] && q[1] === p[1]), spot, { timeout: 8000 });
  const tap = await host.evaluate(p => {
    const S = UI._S();
    const cell = document.querySelectorAll('#board .cell')[p[1] * S.cfg.cols + p[0]];
    const b = cell.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    return { x, y, ok: document.elementFromPoint(x, y).closest('.cell') === cell };
  }, spot);
  assert.equal(tap.ok, true, 'hyena catch square is on the phone');
  await host.mouse.click(tap.x, tap.y);
  await guest.waitForFunction(() => UI._S().h3.birds.blue.catches === 1, null, { timeout: 8000 });
  const hurt = await guest.evaluate(() => {
    const pc = document.querySelector('.pc.po');
    const cs = pc ? getComputedStyle(pc) : null;
    return { injured: !!(pc && pc.classList.contains('injured')), outline: cs && cs.outlineStyle, hurt: !!document.querySelector('.hurtag'), out: !!document.querySelector('.bchip.blue.out') };
  });
  assert.equal(hurt.injured, true, 'first catch marks the ostrich sprite');
  assert.equal(hurt.outline, 'solid');
  assert.equal(hurt.hurt, true);
  assert.equal(hurt.out, false, 'first catch is not a knockout');
  await guest.screenshot({ path: OUT + '/ostrich-hurt-sprite.png' });
  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  server.close();
  console.log('PASS e2e-hunter-phone', JSON.stringify(desk));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
