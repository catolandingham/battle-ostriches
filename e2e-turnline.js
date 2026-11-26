// Phone-width checks for the turn line (390 x 664, WebKit): a caught ostrich sees "Your turn." during the cartoon and "Your turn. Tap to move." with the buttons
// and her clock does not run while she has no buttons, a sitting ostrich gets "The vulture sees you sit." once as a news line, and a fast
// computer turn does not flash by. Display only; the turn order is the server's.
process.env.PORT = '4041'; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '60000';
const A = require('assert'), { webkit } = require('playwright-core');
const S = require('./server'), T = require('./three'), B = require('./game');
const U = 'http://localhost:4041/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// ONLY=2 runs just part 2 (a failing part otherwise hides the rest).
const run = n => !process.env.ONLY || process.env.ONLY === String(n);
const WATCH = /^(Ostrich|Vulture|Hyena|Badger|Hunter)'s turn(…| again\.)$/;

(async () => {
  const browser = await webkit.launch(), errs = [];
  const mk = async () => {
    const p = await browser.newPage({ viewport: { width: 390, height: 664 } });
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1');
      window.__hint = [];
      const start = () => {
        const h = document.getElementById('hint'); if (!h) return setTimeout(start, 10);
        const note = () => window.__hint.push({ t: performance.now(), text: h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.nodeValue : h.textContent, mine: h.classList.contains('myturn') });
        note(); new MutationObserver(note).observe(h, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      };
      start();
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  const join3 = async (p, room, role) => {
    await p.addInitScript(pack => { localStorage.setItem('bo_me', JSON.stringify(pack)); localStorage.setItem('bo_seat_' + pack.code, pack.token); }, { code: room.code, token: room.players[role].token, role });
    await p.goto(U + '?room=' + room.code);
    await p.waitForSelector('#board .cell', { timeout: 15000 });
  };
  const snap = p => p.evaluate(() => {
    const h = document.getElementById('hint'), k = document.getElementById('clock3');
    return { t: performance.now(), hint: h ? (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.nodeValue : h.textContent) : null, mine: !!h && h.classList.contains('myturn'),
      cartoon: !!document.getElementById('cutaway'), busy: !!(window.CUTAWAYS && CUTAWAYS.busy()),
      clock: k && !k.classList.contains('hidden') ? (k.textContent || '').trim() : null,
      btns: [...document.querySelectorAll('#actions button')].filter(b => b.offsetParent).map(b => b.textContent.replace('✓', '').trim()) };
  });

  // ---- 1. Caught ostrich, 3 players. The server makes it her turn while the cartoon is still up.
  if (run(1)) {
    process.env.BO_BOTMS = '1000';
    const made = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null), room = made.room;
    const g = room.g = T.newGame3('hyena', undefined, [4, 3]);
    for (const q of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, q);
    T.placeOstrich3(g, [5, 3]);
    g.phase = 'play'; g.round = 2; g.turn = 'blue'; g.three.h = [4, 3]; g.three.pounce = false;
    const p = await mk(); await join3(p, room, 'blue');
    await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn; });
    await sleep(1200);
    g.turn = 'hunter';
    A.ok(T.hunterMove(g, [5, 3]), 'the hunter catches the ostrich');
    room.touched = Date.now(); S.broadcast(room);
    const samples = [];
    let handsOn = null, holdEnded = null, serverHers = null;
    for (let i = 0; i < 160; i++) {
      const s = await snap(p); s.turn = g.turn; samples.push(s);
      if (s.turn === 'blue' && serverHers == null) serverHers = s.t;
      if (serverHers != null && !s.busy && holdEnded == null) holdEnded = s.t;
      if (s.turn === 'blue' && s.btns.some(b => /Walk/.test(b))) { handsOn = s.t; break; }
      await sleep(50);
    }
    A.ok(serverHers != null, 'the server made it her turn');
    A.ok(samples.some(s => s.cartoon), 'the catch cartoon was shown');
    const during = samples.filter(s => s.turn === 'blue' && s.btns.length === 0 && s.t >= serverHers);
    A.ok(during.length > 5, 'there was a stretch where it is her turn and the cartoon still holds the board (' + during.length + ' samples)');
    for (const s of during) {
      A.equal(s.hint, 'Your turn.', 'during the hold her turn line says only "Your turn." (no buttons yet, so no "Tap to move."), not "' + s.hint + '"');
      A.ok(s.mine, 'and it is marked as hers');
    }
    const clocks = [...new Set(during.map(s => s.clock))];
    A.ok(during.every(s => s.clock), 'her clock is on screen during the hold');
    A.equal(clocks.length, 1, 'her clock does not count down while she has no buttons: ' + clocks.join(','));
    A.equal(clocks[0], (T.T3.clockMs / 1000) + 's', 'her clock shows the new turn\'s full time during the hold (not a leftover from the turn before): ' + clocks.join(','));
    A.ok(handsOn != null, 'Walk and Kick come up');
    A.ok(holdEnded != null && handsOn - holdEnded <= 500, 'the buttons are up within 0.5 s of the hold ending: ' + Math.round(handsOn - holdEnded) + ' ms');
    const first = samples.find(s => s.btns.some(b => /Walk/.test(b)));
    A.equal(first.hint, 'Your turn. Tap to move.', 'when the buttons come up the line is exactly "Your turn. Tap to move."');
    await p.close();
  }

  // ---- 2. Sitting ostrich: 2 players, then a hunter game. The line says whose turn it is; the eye stays.
  for (const mode of run(2) ? ['two', 'hunter'] : []) {
    process.env.BO_BOTMS = '1000';
    let room, p, g;
    if (mode === 'two') {
      p = await mk(); await p.goto(U);
      await p.evaluate(() => UI.open({ t: 'create', ai: 'normal', role: 'blue' }));
      await p.waitForSelector('#board .cell', { timeout: 15000 });
      room = [...S.rooms.values()].filter(r => r.g && !r.three && !r.hunt && !r.team).pop();
      clearTimeout(room.aiT); room.aiT = null; g = room.g;
      for (const q of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, q);
      B.placeOstrich(g, [2, 1]);
      g.phase = 'play'; g.round = 2; g.turn = 'blue'; g.hungerLeft = 10; g.vulture = [7, 5];
      S.broadcast(room);
    } else {
      const made = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null); room = made.room;
      g = room.g = T.newGame3('hyena', undefined, [7, 5]);
      for (const q of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, q);
      T.placeOstrich3(g, [2, 1]);
      g.phase = 'play'; g.round = 2; g.turn = 'blue'; g.three.h = [7, 5]; g.vulture = [8, 0];
      p = await mk(); await join3(p, room, 'blue'); S.broadcast(room);
    }
    await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn && s.can && s.can.sit; }, null, { timeout: 10000 });
    await sleep(600);
    A.ok(await p.locator('#actions button', { hasText: 'Sit' }).locator('svg.eye').count() >= 1, mode + ': the Sit button keeps its eye');
    await p.evaluate(() => {
      window.__hint.length = 0; window.__news = [];
      const slot = document.getElementById('msgslot');
      new MutationObserver(() => { const e = slot.querySelector('.status-active'); const t = e ? e.textContent : ''; const last = window.__news[window.__news.length - 1]; if (t && (!last || last.text !== t)) window.__news.push({ t: performance.now(), text: t, id: e.id }); }).observe(slot, { childList: true, subtree: true });
    });
    await p.locator('#actions button', { hasText: 'Sit' }).click();
    const seen = [];
    for (let i = 0; i < 70; i++) { const s = await snap(p); s.turn = g.turn; seen.push(s); await sleep(50); }
    A.ok(await p.evaluate(() => !!document.querySelector('#board .sittag')), mode + ': the eye is on the sitting ostrich\'s square');
    const lines = await p.evaluate(() => window.__hint.map(h => h.text));
    A.ok(!lines.some(l => /sees you sit/.test(l)), mode + ': the sitting sentence never takes the turn line: ' + JSON.stringify([...new Set(lines)]));
    const news = await p.evaluate(() => window.__news.filter(n => /sees you sit/.test(n.text)));
    A.equal(news.length, 1, mode + ': "The vulture sees you sit." shows once as a news line in the status slot: ' + JSON.stringify(news));
    // It stays up the news minimum (1 s, 0.3 s a word: 5 words = 1.5 s) and then goes.
    await p.waitForFunction(() => !document.querySelector('#msgslot .status-active'), null, { timeout: 4000 });
    // She stays sitting through the next turns: no repeat.
    await sleep(2500);
    A.equal(await p.evaluate(() => window.__news.filter(n => /sees you sit/.test(n.text)).length), 1, mode + ': not repeated while she stays sitting');
    const away = seen.filter(s => s.turn !== 'blue' && !s.cartoon);
    A.ok(away.length > 3, mode + ': the turn passed to the other side');
    A.ok(away.some(s => WATCH.test(s.hint)), mode + ': while the others play the line names whose turn it is: ' + JSON.stringify([...new Set(away.map(s => s.hint))]));
    await p.close();
  }

  // ---- 3. A fast computer turn does not flash. Watcher lines hold about a second; your own turn never waits.
  if (run(3)) {
    process.env.BO_BOTMS = '150';
    const made = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'badger' }, null), room = made.room;
    const g = room.g = T.newGame3('badger', undefined, [6, 1]);
    for (const q of [[2, 1], [6, 5], [2, 5]]) B.placeEgg(g, q);
    T.placeOstrich3(g, [1, 3]);
    g.phase = 'play'; g.round = 2; g.turn = 'blue'; g.vulture = [7, 3]; g.three.h = [6, 1]; g.three.pounce = false; g.hungerLeft = 10; g.stones = 1;
    const p = await mk(); await join3(p, room, 'blue'); S.broadcast(room);
    await p.waitForFunction(() => { const s = UI._S(); return s && s.phase === 'play' && s.myTurn; }, null, { timeout: 10000 });
    await sleep(800);
    await p.evaluate(() => { window.__hint.length = 0; });
    const mv = await p.evaluate(() => UI._S().moves[0]);
    await p.locator('#actions button', { hasText: 'Walk' }).click().catch(() => {});
    await p.locator('#board .cell').nth(mv[1] * 9 + mv[0]).click();
    await p.waitForFunction(() => window.__hint.some(h => /^Badger's turn/.test(h.text)), null, { timeout: 5000 });
    await p.waitForFunction(() => { const l = window.__hint; return l.length && l[l.length - 1].mine; }, null, { timeout: 8000 });
    await sleep(300);
    const log = await p.evaluate(() => window.__hint.map(h => ({ t: h.t, text: h.text, mine: h.mine })));
    // Collapse repeats and check every watcher line that was followed by another watcher line stayed up about a second.
    const runs = []; for (const e of log) { if (!runs.length || runs[runs.length - 1].text !== e.text) runs.push({ text: e.text, t: e.t, mine: e.mine }); }
    for (let i = 0; i < runs.length - 1; i++) {
      if (!WATCH.test(runs[i].text)) continue;
      const up = runs[i + 1].t - runs[i].t;
      if (WATCH.test(runs[i + 1].text)) A.ok(up >= 900, runs[i].text + ' flashed by in ' + Math.round(up) + ' ms: ' + JSON.stringify(runs.map(r => r.text)));
    }
    A.ok(runs.some(r => /^Badger's turn/.test(r.text)), 'the Badger line was shown');
    const last = runs[runs.length - 1];
    A.ok(last.mine && /Your turn/.test(last.text), 'it ends on your own turn: ' + JSON.stringify(runs.map(r => r.text)));
    A.ok(last.t - log.find(e => /^Badger's turn/.test(e.text)).t < 700, 'your own turn did not wait out the Badger line');
    await p.close();
  }

  // ---- 4. The held line itself, with real timers on the phone.
  if (run(4)) {
    const p = await mk(); await p.goto(U);
    const r = await p.evaluate(async () => {
      const hint = document.getElementById('hint'); hint.textContent = '';
      const t0 = performance.now(); hint.textContent = TURNLINE.live.show("Badger's turn…");
      await new Promise(r => setTimeout(r, 140));
      const mid = TURNLINE.live.show("Vulture's turn…");
      const midHint = hint.textContent;
      await new Promise(r => setTimeout(r, 1100));
      const swapped = hint.textContent, held = performance.now() - t0;
      return { mid, midHint, swapped, held, own: TURNLINE.live.show('Your turn. Tap to move.') };
    });
    A.equal(r.mid, "Badger's turn…"); A.equal(r.midHint, "Badger's turn…");
    A.equal(r.swapped, "Vulture's turn…", 'the newest line shows after the second');
    A.equal(r.own, 'Your turn. Tap to move.');
    await p.close();
  }

  A.deepEqual(errs, [], 'no page errors');
  await browser.close(); S.close();
  console.log('PASS turn line on a phone: caught ostrich sees "Your turn." and a paused clock during the cartoon and "Your turn. Tap to move." with the buttons, a sitting ostrich gets the sit news line once, a fast turn holds a second');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
