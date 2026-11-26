// News colors on real phones (WebKit iPhone 13): the same event is green, red or navy depending on the player holding the phone.
// 1) Two humans in a friends game. The vulture smells an egg (ostrich: red, vulture: green), then smashes one: "The vulture smashed your egg!" red on the
//    ostrich, "You smashed an egg!" green on the vulture, and nobody ever sees a separate "Smashed!" banner or an "Egg smashed." hint.
//    A phone that opens after the smash is not told "Smashed!" again.
// 2) Four humans in a Hunters game. A shove: the badger's line is green, the hyena's red, the two birds' navy. A smash: vulture green, ostrich red, hunters navy.
// 3) Every theme: a green, a red and a navy line keep white text on their own color (Black and white keeps its white bar and black text).
// Reads the server's game (server.rooms) only to set up squares; the moves are real taps.
process.env.PORT = 3992; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '600000'; process.env.BO_CLOCKMS = '600000'; process.env.BO_TOUGH = '0'; process.env.BO_H4START = '4,3,5,3';
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js'), H = require('./hunt.js'), HA = require('./huntai.js');
const U = 'http://localhost:3992/', COLS = 9;
const GREEN = 'rgb(22, 122, 46)', RED = 'rgb(179, 18, 63)', NAVY = 'rgb(27, 37, 64)', WHITE = 'rgb(255, 255, 255)';
const THEMES = ['classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
(async () => {
  const b = await webkit.launch(), errs = [];
  // every phone writes down each status line, banner and hint it shows: where, the words, the class and the real background color
  const mk = async name => {
    const c = await b.newContext({ ...devices['iPhone 13'] }), p = await c.newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off', 'bo_muted']) localStorage.setItem(k, '1');
      ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9'));
      localStorage.setItem('bo_bw_default', '1'); localStorage.setItem('bo_theme', 'classic');
      window.__news = []; const seen = new Set();
      const rec = (where, el) => { const t = el.textContent.trim().replace(/Skip guide$/, '').trim(); if (!t) return; const cs = getComputedStyle(el), k = where + '|' + t + '|' + el.className; if (seen.has(k)) return; seen.add(k); window.__news.push({ where, text: t, cls: el.className, bg: cs.backgroundColor, color: cs.color }); };
      setInterval(() => {
        document.querySelectorAll('#msgslot .status-active').forEach(e => rec(e.id || (e.className.match(/h3pop|ate-line/) || ['status'])[0], e));
        const bn = document.getElementById('banner'); if (bn && !bn.classList.contains('hidden')) rec('banner', bn);
        const h = document.getElementById('hint'); if (h) rec('hint', h);
        document.querySelectorAll('#board .msniff').forEach(e => rec('msniff', e));
        const o = document.querySelector('#over:not(.hidden) h1'); if (o) rec('over', o);
      }, 25);
    });
    p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.name = name; return p;
  };
  const news = p => p.evaluate(() => window.__news.slice());
  const line = async (p, where, text, tone, bg) => {
    try { await p.waitForFunction(([w, t]) => window.__news.some(x => x.where === w && x.text === t), [where, text], { timeout: 15000 }); }
    catch (e) { throw new Error(p.name + ': no ' + where + ' line "' + text + '". Seen: ' + JSON.stringify(await news(p))); }
    const x = (await news(p)).find(n => n.where === where && n.text === text);
    assert.ok(x.cls.split(/\s+/).includes('news-' + tone), p.name + ' "' + text + '" should be ' + tone + ', class "' + x.cls + '"');
    assert.equal(x.bg, bg, p.name + ' "' + text + '" background');
    assert.equal(x.color, WHITE, p.name + ' "' + text + '" text color');
    return x;
  };
  const S_ = p => p.evaluate(() => UI._S());
  const myTurn = async p => { await p.waitForFunction(() => { const S = UI._S(); return S && S.myTurn && S.phase === 'play' && !UI._locked(); }, null, { timeout: 20000 }); await p.waitForTimeout(150); return S_(p); };
  const cell = (p, x, y) => p.locator('#board .cell').nth(y * COLS + x);
  const room2 = () => [...server.rooms.values()].find(r => r.g && !r.three && !r.hunt && !r.team && !r.ai);
  const noBanner = async (p, label) => {
    const all = await news(p);
    assert.ok(!all.some(n => /Smashed!|Egg smashed\./.test(n.text)), label + ': a separate smash line appeared ' + JSON.stringify(all.filter(n => /Smashed!|Egg smashed\./.test(n.text))));
  };
  const skipCartoon = async p => { const go = p.locator('#surprise-go button'); if (await go.count()) await go.click().catch(() => {}); if (await p.evaluate(() => !!(window.CUTAWAYS && CUTAWAYS.busy()))) await p.waitForFunction(() => !CUTAWAYS.busy(), null, { timeout: 15000 }); };

  // ---------------------------------------------------------------- 1) two humans: ostrich and vulture
  const A = await mk('ostrich'), V = await mk('vulture');
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  await V.goto((await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3992')); await V.waitForSelector('#roomLobby');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [3, 4]]) { await cell(A, x, y).click(); await A.waitForTimeout(120); } // three eggs, ostrich on the first
  const room = room2(), g = room.g; assert.ok(room && g);
  // the vulture lands next to the egg at (2,1): "sniffed" on the ostrich's phone, "nearby" on the vulture's
  await myTurn(V);
  g.vulture = [4, 2]; g.stones = 1; server.broadcast(room);
  await V.waitForFunction(() => UI._S().vulture[0] === 4 && UI._S().vulture[1] === 2);
  await cell(V, 3, 2).click();
  await line(V, 'snpop', 'Egg nearby!', 'good', GREEN);
  const sn = (await news(A)).find(n => n.text === 'Vulture sniffed an egg.');
  if (sn) { assert.ok(sn.cls.includes('news-bad'), 'ostrich sees the sniff as bad'); assert.equal(sn.bg, RED); }
  // the ostrich takes a turn, then the vulture throws at the egg at (2,1) and smashes it
  await myTurn(A); await A.locator('#board .cell.legal').first().click();
  await myTurn(V); await V.evaluate(() => UI.setMode('throw'));
  await cell(V, 2, 1).click(); if (await V.evaluate(() => !!document.querySelector('#board .cell.confirm'))) await cell(V, 2, 1).click();
  await A.waitForFunction(() => document.querySelectorAll('.cell.hit').length === 1, null, { timeout: 8000 });
  await skipCartoon(A); await skipCartoon(V);
  await line(A, 'announce', 'The vulture smashed your egg!', 'bad', RED);
  await line(V, 'announce', 'You smashed an egg!', 'good', GREEN);
  await A.waitForTimeout(1500); await V.waitForTimeout(500);
  await noBanner(A, 'ostrich'); await noBanner(V, 'vulture');
  // a phone that reloads after the smash (it comes back to the same seat) is not told about it again; the board shows the wrecked square
  for (const p of [A, V]) {
    await p.reload(); await p.waitForSelector('#board .cell'); await p.waitForFunction(() => UI._S() && UI._S().phase === 'play');
    await p.waitForTimeout(2500); await skipCartoon(p);
    const all = await news(p); assert.ok(!all.some(n => /smash/i.test(n.text) && n.where !== 'hint'), p.name + ' reloaded and was told about the smash again ' + JSON.stringify(all));
    await noBanner(p, p.name + ' after reload');
    assert.equal(await p.locator('#board .cell.hit').count(), 1, p.name + ' the wrecked square still shows');
  }
  console.log('PASS 2 players: ostrich red, vulture green, no "Smashed!" banner');

  // ---------------------------------------------------------------- 2) four humans, Hunters
  const O = await mk('ostrich4'), Vu = await mk('vulture4'), Y = await mk('hyena'), K = await mk('badger'), ALL = [O, Vu, Y, K];
  await O.goto(U); await O.click('#playFriend'); await O.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await O.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3992');
  for (const p of [Vu, Y, K]) await p.goto(link);
  await O.waitForFunction(() => LobbyUI.get().humanCount === 4);
  for (const [p, r] of [[O, 'ostrich'], [Vu, 'vulture'], [Y, 'hyena'], [K, 'badger']]) { await p.waitForSelector(`[data-role="${r}"]`); await p.click(`[data-role="${r}"]`); }
  await O.waitForFunction(() => LobbyUI.get().canStart && LobbyUI.get().setup === '4h');
  await O.click('#startGame'); for (const p of ALL) await p.waitForSelector('#board .cell');
  const hroom = [...server.rooms.values()].find(r => r.hunt); hroom.clock = false;
  const hg = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && hg.phase !== 'play'; i++) assert.ok(HA.act(hg, 'blue', HA.move(hg, 'blue', {})));
  hg.hunt.hs.hyena.p = [4, 3]; hg.hunt.hs.badger.p = [5, 3]; hg.ostrich = [0, 0]; hg.vulture = [0, 6]; hg.turn = 'badger'; hroom.g = hg; server.broadcast(hroom);
  await K.waitForSelector('#actions.mine', { state: 'attached', timeout: 10000 });
  // the badger walks onto the hyena: the badger "You shoved the hyena!" green, the hyena "The badger shoved you!" red, the birds "The badger shoved the hyena!" navy
  await K.locator('.cell').nth(3 * 9 + 4).click({ force: true });
  for (let i = 0; i < 60 && !hroom.g.hunt.rival; i++) await K.waitForTimeout(50);
  assert.equal(hroom.g.hunt.rival && hroom.g.hunt.rival.by, 'badger');
  for (const p of ALL) await skipCartoon(p);
  await line(K, 'announce', 'You shoved the hyena!', 'good', GREEN);
  await line(Y, 'announce', 'The badger shoved you!', 'bad', RED);
  await line(O, 'announce', 'The badger shoved the hyena!', 'plain', NAVY);
  await line(Vu, 'announce', 'The badger shoved the hyena!', 'plain', NAVY);
  // an egg is smashed: vulture green, ostrich red, the two hunters navy
  for (const p of ALL) await p.evaluate(() => { window.__news.length = 0; });
  hg.lastSmash = { seq: (hg.smashSeq = (hg.smashSeq || 0) + 1), by: 'red', owner: 'blue' }; server.broadcast(hroom);
  for (const p of ALL) await skipCartoon(p);
  await line(Vu, 'announce', 'You smashed an egg!', 'good', GREEN);
  await line(O, 'announce', 'The vulture smashed your egg!', 'bad', RED);
  await line(Y, 'announce', 'The vulture smashed an egg.', 'plain', NAVY);
  await line(K, 'announce', 'The vulture smashed an egg.', 'plain', NAVY);
  for (const p of ALL) await noBanner(p, p.name);
  // a clock runs out (Brian, 2026-11-25): "Out of time." is red on the phone whose time ran out; "Time's up. Turn skipped." is navy on every other phone
  for (const p of ALL) await p.evaluate(() => { window.__news.length = 0; });
  hg.timeNote = { seq: (hg.timeSeq = (hg.timeSeq || 0) + 1), seat: 'hyena', round: hg.round }; server.broadcast(hroom);
  await line(Y, 'announce', 'Out of time.', 'bad', RED);
  for (const p of [O, Vu, K]) await line(p, 'announce', "Time's up. Turn skipped.", 'plain', NAVY);
  console.log('PASS Hunters: badger green, hyena red, birds navy; smash vulture green, ostrich red, hunters navy; out of time red for the hyena, navy for the rest');

  // ---------------------------------------------------------------- 3) every theme keeps a readable green, red and navy line
  const T = A; const sizes = [];
  for (const theme of [...THEMES, 'bw']) {
    await T.evaluate(t => THEME.set(t), theme); await T.waitForTimeout(150);
    for (const [tone, want] of [['good', GREEN], ['bad', RED], ['plain', NAVY]]) {
      const got = await T.evaluate(async ([tone, theme]) => {
        const slot = document.getElementById('msgslot'), e = document.createElement('div');
        e.id = 'announce'; e.className = 'show status-active news-' + tone; e.textContent = 'Sample news line'; slot.appendChild(e);
        const cs = getComputedStyle(e), r = { bg: cs.backgroundColor, color: cs.color, shown: cs.display !== 'none' }; e.remove(); return r;
      }, [tone, theme]);
      if (theme === 'bw') assert.notEqual(got.bg, want, 'Black and white keeps its own look (' + tone + ')');
      else { assert.equal(got.bg, want, theme + ' ' + tone + ' background'); assert.equal(got.color, WHITE, theme + ' ' + tone + ' text'); }
      sizes.push(theme + ':' + tone);
    }
  }
  console.log('PASS ' + sizes.length + ' theme checks');
  console.log('errors', errs); assert.deepEqual(errs, []);
  await b.close(); server.close(); console.log('PASS e2e-news-colors'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
