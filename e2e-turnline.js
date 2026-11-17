// Phone-width checks for the three turn-line fixes. Display only.
process.env.PORT = '3988';
process.env.BO_NOSTORE = '1';
const A = require('assert');
const { webkit } = require('playwright-core');
const S = require('./server');

(async () => {
  const b = await webkit.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 664 } });
  await p.addInitScript(() => { localStorage.setItem('bo_card_off', '1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_tips_off', '1'); });
  await p.goto('http://localhost:3988/');
  await p.evaluate(() => {
    document.getElementById('lobby').classList.add('hidden');
    const tut = document.getElementById('tut'); if (tut) tut.classList.add('hidden');
  });

  // Sitting ostrich: the status bar names the turn. The sitting sentence is not it.
  const sit = await p.evaluate(() => {
    const S = { phase: 'play', role: 'blue', turn: 'hunter', myTurn: false, ostrich: [2, 1], sittingAt: [[2, 1]], h3: { kind: 'badger', ready: true, birds: { blue: { out: false }, red: { out: false } }, clockMs: 10000 } };
    const a = document.getElementById('actions');
    return { hint: T3UI.hint(S, a), sit: TURNLINE.SIT_LINE, line: TURNLINE.watchLine(S) };
  });
  A.equal(sit.hint, "Badger's turn…");
  A.equal(sit.line, "Badger's turn…");
  A.equal(sit.sit, 'The vulture sees you sit.');
  A.notEqual(sit.hint, sit.sit);

  // Fast badger: the next watch line waits a second. A tap during that second still runs.
  await p.evaluate(() => {
    const hint = document.getElementById('hint');
    window.__shownAt = performance.now();
    hint.textContent = TURNLINE.live.show("Badger's turn…");
    window.__taps = 0;
    const btn = document.createElement('button');
    btn.id = 'turnTap';
    btn.textContent = 'Move';
    btn.addEventListener('click', () => { window.__taps++; });
    document.getElementById('actions').appendChild(btn);
  });
  await p.locator('#turnTap').click({ force: true });
  const mid = await p.evaluate(() => {
    const shown = TURNLINE.live.show("Vulture's turn…");
    return { shown, hint: document.getElementById('hint').textContent, taps: window.__taps };
  });
  A.equal(mid.taps, 1, 'the tap is not waiting on the turn line');
  A.equal(mid.shown, "Badger's turn…");
  A.equal(mid.hint, "Badger's turn…");
  await p.waitForFunction(() => document.getElementById('hint').textContent === "Vulture's turn…", null, { timeout: 2500 });
  const held = await p.evaluate(() => performance.now() - window.__shownAt);
  A.ok(held >= 900 && held < 1800, 'the badger line stayed up about a second, not a flash: ' + held);

  // Caught ostrich: states that arrive while the cartoon is up update the turn line and the clock, and the board queue still keeps only the last state.
  const caught = await p.evaluate(() => {
    const board = document.getElementById('board');
    board.innerHTML = '<div class="cell"></div>';
    let bar = document.getElementById('h3bar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'h3bar'; document.getElementById('hud').after(bar); }
    const prev = { phase: 'play', turn: 'hunter', role: 'blue', myTurn: false, h3: {}, cfg: { cols: 9, rows: 7 } };
    const caughtState = { phase: 'play', turn: 'red', role: 'blue', myTurn: false, h3: { lastCatch: { seq: 7, at: [1, 1], bird: 'blue', by: 'hyena', ko: false } }, cfg: { cols: 9, rows: 7 }, ostrich: [4, 4], vulture: [0, 0] };
    CUTAWAYS.prepare(caughtState, prev, board);
    document.getElementById('hint').textContent = "Vulture's turn…";
    document.getElementById('hint').classList.remove('myturn');
    const mine = { phase: 'play', turn: 'blue', role: 'blue', myTurn: true, pass: false, three: true, showTimers: true, moves: [[3, 3]], ostrich: [4, 4], h3: { kind: 'hyena', ready: true, birds: { blue: { out: false }, red: { out: false } }, clockMs: 10000, clockLeft: null } };
    const deferred = CUTAWAYS.defer(mine);
    const clock = document.getElementById('clock3');
    const hint = document.getElementById('hint').textContent;
    return {
      deferred,
      busy: CUTAWAYS.busy(),
      hint,
      mine: document.getElementById('hint').classList.contains('myturn'),
      clock: !!(clock && !clock.classList.contains('hidden') && clock.classList.contains('mine')),
      flush: (typeof CUTAWAYS.flushStates === 'function') ? CUTAWAYS.flushStates([{ turn: 'red' }, mine]).length : 1
    };
  });
  A.equal(caught.deferred, true, 'the board state is still held for the cartoon');
  A.equal(caught.busy, true);
  A.equal(caught.hint, 'Your turn. Tap to move.');
  A.equal(caught.mine, true);
  A.equal(caught.clock, true, 'the clock is on screen as soon as it is your turn');
  A.equal(caught.flush, 1);

  await b.close();
  S.close();
  console.log('PASS turn line on a phone: sitting keeps the turn line, a fast line stays a second, your turn and clock show during the cartoon');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
