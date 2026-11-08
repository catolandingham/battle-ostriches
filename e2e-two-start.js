// Two humans, zero computers: real sockets from the lobby through the first game screen.
const { webkit } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = '3985';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '200';
const server = require('./server.js');
const OUT = require('path').join(__dirname, 'shots', 'e2e');
fs.mkdirSync(OUT, { recursive: true });
const desk = { viewport: { width: 1280, height: 800 } };
(async () => {
  const browser = await webkit.launch(), errs = [];
  const open = async () => {
    const page = await (await browser.newContext(desk)).newPage();
    page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue', '1'); localStorage.setItem('bo_walk_red', '1'); localStorage.setItem('bo_hs_off', '1'); });
    await page.goto('http://127.0.0.1:3985/', { timeout: 20000 });
    return page;
  };
  const host = await open();
  await host.evaluate(() => UI.open({ t: 'create', friends: 1 }));
  await host.waitForSelector('#lobbyCode', { timeout: 10000 });
  await host.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'blue' }));
  await host.waitForFunction(() => /YOU ARE Ostrich/.test(LobbyUI.get().youAre || ''));
  const code = (await host.textContent('#lobbyCode')).trim();
  const guest = await open();
  await guest.evaluate(c => UI.open({ t: 'join', code: c }), code);
  await guest.waitForSelector('#roomLobby:not(.hidden)', { timeout: 10000 });
  await guest.evaluate(() => UI.send({ t: 'lobby', a: 'role', role: 'red' }));
  await host.waitForFunction(() => LobbyUI.get().humanCount === 2 && LobbyUI.get().botsWanted === 0 && !document.getElementById('startGame').disabled);
  assert.equal(await host.textContent('#startGame'), 'Start · 2 people');
  await host.evaluate(() => UI.send({ t: 'lobby', a: 'start' }));
  await host.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'setupEggs' && S.role === 'blue'; }, null, { timeout: 10000 });
  await guest.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'setupEggs' && S.role === 'red'; }, null, { timeout: 10000 });
  const snap = async page => page.evaluate(() => {
    const S = UI._S();
    const lobby = document.getElementById('roomLobby');
    return {
      phase: S && S.phase, role: S && S.role, cells: document.querySelectorAll('#board .cell').length,
      lobbyHidden: !lobby || lobby.classList.contains('hidden'),
      reconnect: /Reconnecting/.test(document.body.innerText),
      bots: window.LobbyUI && LobbyUI.get() ? LobbyUI.get().botsWanted : 0
    };
  });
  const hs = await snap(host), gs = await snap(guest);
  assert.equal(hs.phase, 'setupEggs'); assert.equal(hs.role, 'blue'); assert.equal(hs.cells, 63); assert.equal(hs.lobbyHidden, true); assert.equal(hs.reconnect, false);
  assert.equal(gs.phase, 'setupEggs'); assert.equal(gs.role, 'red'); assert.equal(gs.cells, 63); assert.equal(gs.lobbyHidden, true); assert.equal(gs.reconnect, false);
  await host.screenshot({ path: OUT + '/two-human-host.png' });
  await guest.screenshot({ path: OUT + '/two-human-guest.png' });
  assert.equal(errs.length, 0, errs.join('\n'));
  await browser.close();
  server.close();
  console.log('PASS e2e-two-start', JSON.stringify({ host: hs, guest: gs }));
})().catch(e => { console.error(e); process.exit(1); });
