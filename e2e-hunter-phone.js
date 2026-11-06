// Phone 390x844 and a short keyboard viewport: hunter can see why no bird is drawn, and can tap a real step.
const { chromium } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = '3983';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '40';
process.env.BO_CLOCKMS = '60000';
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
  const desk = await lay(H);
  assert.ok(desk.legal >= 3, 'hunter has steps ' + desk.legal);
  assert.match(desk.hint, /no bird is drawn|not pointed at/);
  assert.ok(desk.tipH < 2, 'hidden tip does not reserve a band');
  assert.ok(desk.gap < 90, 'gap under the hint is ' + desk.gap);
  assert.equal(desk.overlap, false);
  assert.ok(desk.shown >= 1, 'a step is on the phone screen');
  await H.screenshot({ path: OUT + '/hunter-phone-turn.png' });
  await H.setViewportSize({ width: 390, height: 524 });
  await H.waitForTimeout(150);
  const before = await H.evaluate(() => UI._S().hunter.slice());
  const spot = await H.evaluate(() => {
    const board = document.getElementById('board');
    const cell = document.querySelector('.cell.legal');
    cell.scrollIntoView({ block: 'center', inline: 'center' });
    const b = cell.getBoundingClientRect(), br = board.getBoundingClientRect(), hud = document.getElementById('hud').getBoundingClientRect();
    const x = b.left + b.width / 2, y = Math.min(b.top + b.height / 2, br.bottom - 4);
    const top = document.elementFromPoint(x, y);
    return { x, y, cell: !!(top && top.closest('.cell.legal')), overlap: hud.bottom > br.top + 1 };
  });
  assert.equal(spot.cell, true, 'keyboard-height viewport still hits a step');
  assert.equal(spot.overlap, false);
  await H.mouse.click(spot.x, spot.y);
  await H.waitForFunction(p => { const h = UI._S() && UI._S().hunter; return h && (h[0] !== p[0] || h[1] !== p[1]); }, before, { timeout: 8000 });
  await H.screenshot({ path: OUT + '/hunter-phone-step.png' });
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
  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  server.close();
  console.log('PASS e2e-hunter-phone', JSON.stringify(desk));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
