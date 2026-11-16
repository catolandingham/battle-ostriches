// Role cards on real phones. 3 players: each of the three phones sees its own card and only its own, a tap closes it, it does not come back,
// and How to play reopens it. Then a solo game where the player picked the badger (no "We picked" line) and a friends game where Start
// chose the ostrich (the line shows). Also: the card fits a 390 x 664 phone without scrolling in every theme. Card photos -> shots/role-cards/.
process.env.PORT = 3980; process.env.BO_H3START = '8,3'; process.env.BO_NOSTORE = '1';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs');
const server = require('./server.js'); const U = 'http://localhost:3980/', OUT = 'shots/role-cards/'; fs.mkdirSync(OUT, { recursive: true });
const R = require('./public/roles.js'), THEMES = fs.readFileSync('./public/theme.js', 'utf8');
(async () => {
  const b = await webkit.launch(), errs = [];
  // like every other phone test, but the role-card keys are NOT set: the card has to show
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
    p.on('pageerror', e => errs.push(e.message)); return p; };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const shown = (p) => p.locator('#rolecard:not(.hidden)');
  const cardText = (p) => p.evaluate(() => document.getElementById('rolecard').innerText);
  const fits = async (p, at) => {
    const m = await p.evaluate(() => { const r = document.querySelector('#rolecard .rc').getBoundingClientRect(), rc = document.querySelector('#rolecard .rc'); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, sh: rc.scrollHeight, ch: rc.clientHeight, vh: innerHeight, vw: innerWidth }; });
    assert.equal(m.vh, 664); assert.equal(m.vw, 390);
    assert.ok(m.sh <= m.ch + 1, `${at}: the card does not scroll (${m.sh} > ${m.ch})`);
    assert.ok(m.top >= 0 && m.bottom <= m.vh && m.left >= 0 && m.right <= m.vw, `${at}: the card is on the screen ${JSON.stringify(m)}`);
  };
  const A = await mk(), V = await mk(), H = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3980');
  await V.goto(link); await H.goto(link);
  await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A.click('[data-role="blue"]'); await V.click('[data-role="red"]'); await H.click('[data-role="hyena"]');
  await H.waitForFunction(() => /YOU ARE Hyena/.test(document.body.innerText));
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell'); await H.waitForSelector('#board .cell');
  // the card is up at Start, before the ostrich hides eggs and before any shot clock
  for (const p of [A, V, H]) await p.waitForSelector('#rolecard:not(.hidden)');
  assert.equal(await A.evaluate(() => UI._S().phase), 'setupEggs', 'the ostrich card is up while the eggs are still hidden');
  const [ta, tv, th] = [await cardText(A), await cardText(V), await cardText(H)];
  const want = (role, kind, mode) => R.roleCard(role, kind, mode);
  const lines = (c) => [c.title, c.goal, ...c.moves];
  const has = (t, c) => lines(c).forEach(l => assert.ok(t.includes(l), `card is missing: ${l}\n--- got ---\n${t}`));
  has(ta, want('blue', 'hyena', '3')); has(tv, want('red', 'hyena', '3')); has(th, want('hunter', 'hyena', '3'));
  assert.ok(th.includes('You win at 3 catches.'), 'the hyena card states the 3-catch goal');
  assert.ok(th.includes('you always take 2 turns in a row'), 'the hyena card states the double turn');
  // only its own: no other animal's title, and nobody was told "We picked" (all three chose)
  assert.ok(/You are the Ostrich/.test(ta) && !/You are the (Vulture|Hyena|Badger)/.test(ta), 'ostrich card is the ostrich card');
  assert.ok(/You are the Vulture/.test(tv) && !/You are the (Ostrich|Hyena|Badger)/.test(tv)); assert.ok(/You are the Hyena/.test(th) && !/You are the (Ostrich|Vulture|Badger)/.test(th));
  for (const t of [ta, tv, th]) assert.ok(!/We picked/.test(t), 'a chosen animal gets no "We picked" line');
  assert.equal(await A.locator('#rolecard .rc').count(), 1);
  for (const [p, n] of [[A, 'ostrich'], [V, 'vulture'], [H, 'hyena']]) { await fits(p, n); }
  await A.screenshot({ path: OUT + '1-ostrich.png' }); await V.screenshot({ path: OUT + '2-vulture.png' }); await H.screenshot({ path: OUT + '3-hyena.png' });

  // a tap closes it and the game keeps going
  await V.click('#rolecard'); assert.equal(await shown(V).count(), 0, 'a tap closes the card');
  assert.equal(await V.evaluate(() => localStorage.getItem('bo_card_vulture_hyena_3_p2')), '1', 'the phone remembers this card');
  await H.click('#rolecard .rok'); await A.click('#rolecard .rc');
  assert.equal(await shown(H).count() + await shown(A).count(), 0);
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); }
  await V.waitForSelector('#actions.mine', { state: 'attached' }); await cell(V, 4, 1).click();
  await A.waitForSelector('#actions.mine', { state: 'attached' }); await cell(A, 7, 5).click();
  await H.waitForSelector('#actions.mine', { state: 'attached' }); await H.waitForTimeout(500); await H.locator('#actions button').click({ force: true });
  await V.waitForSelector('#actions.mine', { state: 'attached' }); await V.waitForTimeout(600); // round 2: the vulture's second turn
  for (const p of [A, V, H]) assert.equal(await shown(p).count(), 0, 'the card does not come back on the next turn');
  // a reload mid-game does not bring it back either (the phone remembers)
  await V.reload(); await V.waitForSelector('#board .cell'); await V.waitForTimeout(500); assert.equal(await shown(V).count(), 0, 'not after a reload');

  // How to play has "Your animal" while in a game, and it reopens the same card
  await H.click('#moreBtn'); await H.click('#menuHelp'); await H.waitForSelector('#roleCardBtn:not(.hidden)'); await H.click('#roleCardBtn');
  await H.waitForSelector('#rolecard:not(.hidden)'); has(await cardText(H), want('hunter', 'hyena', '3')); assert.equal(await H.locator('#rules:not(.hidden)').count(), 0, 'How to play closed behind it');
  await H.click('#rolecard'); assert.equal(await shown(H).count(), 0);
  console.log('ok 3 phones: own card only, tap closes, once, How to play reopens');

  // 1 human badger (picked it) vs 2 computer birds: the badger card, no "We picked" line
  const P = await mk(); await P.goto(U); await P.click('#playSolo'); await P.click('[data-bots="2"]'); await P.click('#soloGo'); await P.click('[data-role="badger"]'); await P.click('#startGame');
  await P.waitForSelector('#rolecard:not(.hidden)', { timeout: 15000 });
  const tp = await cardText(P); has(tp, want('hunter', 'badger', '3')); assert.ok(/You are the Badger/.test(tp)); assert.ok(!/We picked/.test(tp), 'the player picked: no "We picked" line');
  assert.ok(!/Missed/.test(tp), 'no hyena words on the badger card'); assert.ok(tp.includes('You win at 3 catches.') && tp.includes('you always take 2 turns in a row'), 'badger card: 3 catches and the double turn'); assert.ok(!/tough ground|usually|one more still turn/i.test(tp), 'no tough-ground wording'); await fits(P, 'badger'); await P.screenshot({ path: OUT + '4-badger.png' });
  await P.click('#rolecard'); assert.equal(await shown(P).count(), 0);

  // Start chose the animal: friends room, host never picked, one computer -> the ostrich, and the card says so
  const F = await mk(); await F.goto(U); await F.click('#playFriend'); await F.waitForSelector('#botPlus');
  await F.evaluate(() => UI.send({ t: 'lobby', a: 'bots', n: 1 })); await F.waitForFunction(() => LobbyUI.get().canStart);
  assert.equal(await F.textContent('#startGame'), "Start · you'll be the Ostrich"); await F.click('#startGame'); await F.waitForSelector('#board .cell');
  await F.waitForSelector('#rolecard:not(.hidden)', { timeout: 15000 });
  const tf = await cardText(F); has(tf, want('blue', null, '2')); assert.ok(tf.includes('We picked this animal for you.'), 'Start chose it, and the card says so\n' + tf);
  await fits(F, 'picked ostrich'); await F.screenshot({ path: OUT + '7-picked-ostrich.png' });
  await F.click('#rolecard'); assert.equal(await shown(F).count(), 0);
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(F, x, y).click(); await F.waitForTimeout(150); }
  assert.equal(await shown(F).count(), 0, 'the card does not come back after the eggs are hidden');
  console.log('ok solo pick: no "We picked" line; Start-chosen animal: the line shows');

  // Hunters mode (solo, hyena + badger rivals + two computer birds): the Hyena card, with the other hunter named in the goal
  const K = await mk(); await K.goto(U); await K.click('#playSolo'); await K.click('[data-bots="3"]'); await K.click('#soloGo'); await K.click('[data-role="hyena"]'); await K.click('#startGame');
  await K.waitForSelector('#rolecard:not(.hidden)', { timeout: 15000 });
  const tk = await cardText(K); has(tk, want('hyena', null, '4h')); assert.ok(/more birds than the badger/.test(tk) && !/We picked/.test(tk)); await fits(K, 'hunters hyena');
  await K.click('#rolecard'); assert.equal(await shown(K).count(), 0);
  // 2 vs 2 (friends: Ostrich 1 on one phone, Vulture 1 on another, computers for the rest): the team cards
  const O = await mk(), W = await mk(); await O.goto(U); await O.click('#playFriend'); await O.waitForSelector('#lobbyCode:not(:empty)');
  const link4 = (await O.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3980');
  await W.goto(link4); await W.waitForSelector('#roomLobby'); await O.click('#botPlus'); await O.click('#botPlus');
  await O.waitForSelector('[data-role="ostrich"]'); await O.click('[data-role="ostrich"]'); await W.click('[data-role="vulture"]');
  await W.waitForFunction(() => { const s = LobbyUI.get(); return s && s.roles.some(r => r.id === 'vulture' && r.mine); });
  await O.click('#startGame'); await O.waitForSelector('#board .cell'); await W.waitForSelector('#board .cell');
  await O.waitForSelector('#rolecard:not(.hidden)', { timeout: 15000 }); await W.waitForSelector('#rolecard:not(.hidden)', { timeout: 15000 });
  assert.ok(/setup/.test(await O.evaluate(() => UI._S().phase)), 'the team card is up during setup');
  const [to, tw] = [await cardText(O), await cardText(W)];
  has(to, want('o1', null, '4')); has(tw, want('v1', null, '4')); assert.ok(/You are an Ostrich/.test(to) && /teammate/.test(to) && /You are a Vulture/.test(tw) && /teammate/.test(tw));
  assert.ok(!/We picked/.test(to + tw)); await fits(O, 'team ostrich'); await fits(W, 'team vulture');
  await O.screenshot({ path: OUT + '5-2v2-ostrich.png' }); await W.screenshot({ path: OUT + '6-2v2-vulture.png' });
  await O.click('#rolecard'); await W.click('#rolecard'); assert.equal(await shown(O).count() + await shown(W).count(), 0);
  console.log('ok Hunters mode and 2 vs 2 cards');

  // the card reads in every theme: dark text on the white card, the button readable, the card still on a 390 x 664 screen
  const themes = THEMES.match(/var T=\[([^\]]+)\]/)[1].split(',').map(x => x.replace(/'/g, '')); assert.equal(themes.length, 14);
  for (const t of themes) {
    await F.evaluate(x => { THEME.set(x); UI.card(); }, t); await F.waitForSelector('#rolecard:not(.hidden)');
    const c = await F.evaluate(() => {
      const L = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
      const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
      const card = document.querySelector('#rolecard .rc'), bg = getComputedStyle(card).backgroundColor, out = {};
      for (const sel of ['h2', '.rwho', '.rpicked', '.rmoves li']) { const e = card.querySelector(sel); if (e) out[sel] = ratio(getComputedStyle(e).color, bg); }
      const ok = card.querySelector('.rok'); out['.rok'] = ratio(getComputedStyle(ok).color, getComputedStyle(ok).backgroundColor); out.bg = bg;
      return out; });
    assert.equal(c.bg, 'rgb(255, 255, 255)', t + ' card background'); delete c.bg;
    for (const [sel, r] of Object.entries(c)) assert.ok(r >= 4.5, `${t}: ${sel} contrast ${r.toFixed(2)} is under 4.5`);
    await fits(F, 'theme ' + t); await F.click('#rolecard');
  }
  console.log('ok card readable and on screen in all 13 themes');

  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-roles'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
