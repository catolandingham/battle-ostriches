// Leave from the in-game menu. 2 players, 3 players, and a team game.
// Closing a tab does not leave: the seat only goes offline.
process.env.PORT = 4022; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '600000'; process.env.BO_BOTMS = '900000';
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js');
const U = 'http://localhost:4022/';
(async () => {
  const b = await webkit.launch();
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] });
    const p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    return { p, c };
  };
  const openLeave = async p => { await p.click('#moreBtn'); await p.click('#menuLeave'); await p.waitForSelector('#leaveAsk:not(.hidden)'); };
  async function friends(n) {
    const pages = [await mk()];
    await pages[0].p.goto(U); await pages[0].p.click('#playFriend'); await pages[0].p.waitForSelector('#lobbyCode:not(:empty)');
    const link = (await pages[0].p.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4022');
    for (let i = 1; i < n; i++) { const q = await mk(); await q.p.goto(link); pages.push(q); }
    if (n >= 3) {
      await pages[0].p.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
      await pages[0].p.click('[data-role="blue"]'); await pages[1].p.click('[data-role="red"]'); await pages[2].p.click('[data-role="hyena"]');
      await pages[0].p.waitForFunction(() => LobbyUI.get() && LobbyUI.get().canStart);
    }
    await pages[0].p.click('#startGame');
    for (const q of pages) await q.p.waitForSelector('#board .cell');
    return pages;
  }

  const two = await friends(2);
  const role = await two[0].p.evaluate(() => UI._S().role);
  await openLeave(two[0].p);
  const ask = await two[0].p.textContent('#leaveAsk');
  assert.ok(/Leave this game\?/.test(ask));
  assert.ok(/This ends the game for everyone\./.test(ask));
  assert.ok(/>Leave</.test(await two[0].p.content()) || /Leave/.test(ask));
  assert.ok(/Keep playing/.test(ask));
  await two[0].p.click('#leaveNo');
  await two[0].p.waitForFunction(() => document.getElementById('leaveAsk').classList.contains('hidden'));
  assert.equal(await two[0].p.evaluate(() => UI._S().phase === 'over'), false, 'Keep playing stays in the game');
  await openLeave(two[0].p);
  await two[0].p.click('#leaveYes');
  await two[0].p.waitForSelector('#homeStep:not(.hidden)', { timeout: 8000 });
  const title = role === 'blue' ? 'The ostrich left.' : 'The vulture left.';
  await two[1].p.waitForFunction(t => document.body.innerText.includes(t), title, { timeout: 8000 });
  const other = await two[1].p.textContent('#over');
  assert.ok(other.includes(title), other);
  assert.ok(other.includes('This game is over.'));
  assert.ok(other.includes('New Game'));
  console.log('ok 2p leave');
  for (const q of two) await q.c.close();

  const drop = await friends(2);
  const phase = await drop[1].p.evaluate(() => UI._S().phase);
  await drop[0].c.close();
  await drop[1].p.waitForTimeout(400);
  const still = await drop[1].p.evaluate(() => UI._S());
  assert.notEqual(still.phase, 'over', 'closing a tab does not end the game');
  assert.notEqual(still.winBy, 'left');
  assert.equal(still.phase, phase);
  console.log('ok a closed tab stays rejoinable');
  await drop[1].c.close();

  const three = await friends(3);
  await openLeave(three[2].p);
  await three[2].p.click('#leaveYes');
  await three[0].p.waitForFunction(() => /The hyena left\./.test(document.body.innerText), null, { timeout: 8000 });
  const hy = await three[0].p.textContent('#over');
  assert.ok(hy.includes('The hyena left.'));
  assert.ok(hy.includes('This game is over.'));
  console.log('ok 3p leave');
  for (const q of three) await q.c.close();

  const team = [await mk(), await mk()];
  await team[0].p.goto(U); await team[0].p.click('#playFriend'); await team[0].p.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await team[0].p.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:4022');
  await team[1].p.goto(link);
  await team[0].p.click('#botPlus'); await team[0].p.click('#botPlus');
  await team[0].p.waitForSelector('[data-role="ostrich"]');
  await team[0].p.click('[data-role="ostrich"]'); await team[1].p.click('[data-role="vulture"]');
  await team[0].p.waitForFunction(() => LobbyUI.get() && LobbyUI.get().canStart);
  await team[0].p.click('#startGame');
  await team[0].p.waitForSelector('#board .cell'); await team[1].p.waitForSelector('#board .cell');
  const seat = await team[0].p.evaluate(() => (UI._S().h3 && UI._S().h3.mySeat) || UI._S().role);
  await openLeave(team[0].p);
  await team[0].p.click('#leaveYes');
  const want = seat === 'o1' ? 'Ostrich 1 left.' : seat === 'o2' ? 'Ostrich 2 left.' : 'The ostrich left.';
  await team[1].p.waitForFunction(t => document.body.innerText.includes(t), want, { timeout: 8000 });
  assert.ok((await team[1].p.textContent('#over')).includes('This game is over.'));
  console.log('ok team leave', want);

  const solo = await mk();
  await solo.p.goto(U); await solo.p.click('#playSolo'); await solo.p.click('[data-bots="1"]'); await solo.p.click('#soloGo');
  await solo.p.click('[data-role="blue"]'); await solo.p.click('#startGame'); await solo.p.waitForSelector('#board .cell');
  await openLeave(solo.p);
  assert.ok(/You'll go back to the start\./.test(await solo.p.textContent('#leaveAsk')));
  await solo.p.click('#leaveNo');
  console.log('ok solo confirm');

  await b.close(); server.close();
  console.log('PASS e2e-leave');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
