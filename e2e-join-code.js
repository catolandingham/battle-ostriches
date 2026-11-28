// Home and friends lobby: the room code is on the screen, not inside Settings or Theme.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = '4012';
process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const OUT = require('path').join(__dirname, 'shots', 'e2e');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await webkit.launch(), errs = [];
  const page = await (await browser.newContext(devices['iPhone 13'])).newPage();
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
  await page.goto('http://127.0.0.1:4012/', { timeout: 20000 });
  await page.waitForSelector('#codeIn', { timeout: 10000 });
  const home = await page.evaluate(() => {
    const input = document.getElementById('codeIn');
    const play = document.getElementById('playFriend');
    const menu = document.getElementById('homeMenu');
    const ir = input.getBoundingClientRect();
    const pr = play.getBoundingClientRect();
    const hit = (r) => { const n = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return n && n.id; };
    return {
      joinHidden: document.getElementById('joinRow').classList.contains('hidden'),
      inSettings: menu.contains(input) || document.getElementById('homeGear').contains(input),
      menuHidden: menu.classList.contains('hidden'),
      playHit: hit(pr),
      codeHit: hit(ir),
      prompt: document.getElementById('haveCode').textContent
    };
  });
  assert.equal(home.joinHidden, false, 'code field is on the home screen');
  assert.equal(home.inSettings, false, 'code field is not inside settings');
  assert.equal(home.menuHidden, true);
  assert.equal(home.playHit, 'playFriend', 'nothing covers Start a game with friends');
  assert.equal(home.codeHit, 'codeIn', 'the code box receives the tap');
  assert.match(home.prompt, /Have a code\? Type it here to join/);
  await page.locator('#codeIn').fill('QZ', { timeout: 8000 });
  await page.setViewportSize({ width: 390, height: 320 });
  const typed = await page.evaluate(() => {
    const input = document.getElementById('codeIn');
    input.scrollIntoView({ block: 'center' });
    const lobby = document.getElementById('lobby');
    const board = document.getElementById('board');
    const ir = input.getBoundingClientRect();
    const lr = lobby.getBoundingClientRect();
    const br = board.getBoundingClientRect();
    const vvo = getComputedStyle(document.documentElement).getPropertyValue('--vvo').trim();
    const hit = document.elementFromPoint(ir.left + ir.width / 2, Math.min(ir.top + ir.height / 2, innerHeight - 2));
    return { value: input.value, lobbyTop: lr.top, lobbyH: lr.height, boardTop: br.top, vvo, vh: innerHeight, inView: ir.top >= 0 && ir.bottom <= innerHeight + 1, hit: hit && hit.id };
  });
  assert.match(typed.value, /QZ/);
  assert.ok(typed.lobbyTop >= 0, 'lobby is not shifted above the screen');
  assert.ok(!String(typed.vvo).startsWith('-'), 'viewport offset is not negative');
  assert.ok(typed.boardTop >= 0, 'the board grid is not pushed negative');
  assert.equal(typed.hit, 'codeIn', 'the code box is what the cursor hits');
  assert.equal(typed.inView, true, 'the code box stays in the short viewport');
  await page.screenshot({ path: OUT + '/lobby-code-typed.png' });
  await page.setViewportSize({ width: 390, height: 664 });
  await page.screenshot({ path: OUT + '/lobby-after-home.png' });
  await page.evaluate(() => { const m = document.getElementById('homeMenu'); m.classList.remove('hidden'); document.getElementById('homeGear').setAttribute('aria-expanded', 'true'); });
  await page.waitForSelector('#homeMenu:not(.hidden)');
  const geared = await page.evaluate(() => {
    const menu = document.getElementById('homeMenu');
    const input = document.getElementById('codeIn');
    const ir = input.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    const overlap = !(mr.right < ir.left || mr.left > ir.right || mr.bottom < ir.top || mr.top > ir.bottom);
    return { inMenu: menu.contains(input), themeInMenu: !!menu.querySelector('#themeBtn2'), overlap };
  });
  assert.equal(geared.inMenu, false);
  assert.equal(geared.themeInMenu, true, 'Theme stays in the settings menu');
  assert.equal(geared.overlap, false, 'settings menu does not cover the code box');
  await page.screenshot({ path: OUT + '/lobby-after-gear.png' });
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.evaluate(() => THEME.next());
  const themed = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    joinHidden: document.getElementById('joinRow').classList.contains('hidden'),
    inMenu: document.getElementById('homeMenu').contains(document.getElementById('codeIn'))
  }));
  assert.notEqual(themed.theme, before, 'the theme button moves to the next theme');
  assert.equal(themed.joinHidden, false, 'Theme does not hide or reveal the code box');
  assert.equal(themed.inMenu, false);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'classic'));
  await page.evaluate(() => { document.getElementById('homeMenu').classList.add('hidden'); document.getElementById('homeGear').setAttribute('aria-expanded', 'false'); });
  await page.evaluate(() => UI.open({ t: 'create', friends: 1 }));
  await page.waitForSelector('#lobbyCode');
  const room = await page.evaluate(() => {
    const code = document.getElementById('lobbyCode');
    const share = document.getElementById('shareGo');
    const menu = document.getElementById('lobbyMenu');
    const start = document.getElementById('startGame');
    const cr = code.getBoundingClientRect();
    const hit = document.elementFromPoint(cr.left + 12, cr.top + cr.height / 2);
    return {
      inMenu: menu.contains(code) || menu.contains(share),
      menuHidden: menu.classList.contains('hidden'),
      codeTop: cr.top,
      shareTop: share.getBoundingClientRect().top,
      hit: hit && (hit.id || hit.textContent.slice(0, 12)),
      noStart: !start,
      open: (document.querySelector('.openseat') || {}).textContent || '',
      vh: innerHeight
    };
  });
  assert.equal(room.inMenu, false, 'share code is not inside settings');
  assert.equal(room.menuHidden, true);
  assert.ok(room.codeTop < 220 && room.shareTop < 220, 'code and Share are at the top');
  assert.ok(room.codeTop < room.vh && room.shareTop < room.vh);
  assert.equal(room.noStart, true, 'no Start until a second player is in');
  assert.match(room.open, /Open seat/);
  assert.match(room.open, /\+ Computer/);
  await page.screenshot({ path: OUT + '/lobby-after-room.png' });
  await page.evaluate(() => UI.send({ t: 'lobby', a: 'bots', n: 1 }));
  await page.waitForFunction(() => { const start = document.getElementById('startGame'); return start && !start.disabled; });
  const started = await page.evaluate(() => ({
    text: document.getElementById('startGame').textContent,
    setup: LobbyUI.get().setup,
    label: LobbyUI.get().startLabel
  }));
  // The host has not picked an animal, so Start says which one Start will give them.
  assert.equal(started.text, "Start · you'll be the Ostrich");
  assert.equal(started.setup, '2');
  assert.equal(started.label, "Start · you'll be the Ostrich");
  const join = await (await browser.newContext(devices['iPhone 13'])).newPage();
  join.on('pageerror', e => errs.push(e.message));
  await join.addInitScript(() => localStorage.setItem('bo_tut_seen', '1'));
  const code = (await page.textContent('#lobbyCode')).trim();
  await join.goto('http://127.0.0.1:4012/');
  await join.fill('#codeIn', code);
  await join.evaluate(c => UI.open({ t: 'join', code: c }), code);
  await join.waitForSelector('#roomLobby:not(.hidden)');
  await page.waitForFunction(() => LobbyUI.get().humanCount === 2);
  await page.evaluate(() => UI.send({ t: 'lobby', a: 'bots', n: 0 }));
  await page.waitForFunction(() => LobbyUI.get().botsWanted === 0 && LobbyUI.get().canStart);
  const both = await page.evaluate(() => ({
    text: document.getElementById('startGame').textContent,
    setup: LobbyUI.get().setup,
    roles: LobbyUI.get().roles.map(r => r.id)
  }));
  assert.equal(both.text, "Start · you'll be the Ostrich");
  assert.equal(both.setup, '2');
  // Two people can also pick a hunter, so the Hyena and Badger cards sit after the two ostrich seats.
  assert.deepEqual(both.roles, ['blue', 'red', 'hyena', 'badger']);
  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  server.close();
  console.log('PASS e2e-join-code');
})().catch(e => { console.error(e); process.exit(1); });
