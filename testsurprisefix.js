// Phone-size checks for the surprise-moment fixes: the cartoon covers the board
// and hides the action bar, a stone's landing piece stays hidden while it slides,
// an egg number stays inside its egg on the frozen board, and "Tap to go on."
// waits until the cartoon has left.
process.env.PORT = '4017';
process.env.BO_NOSTORE = '1';
const assert = require('assert');
const { webkit, devices } = require('playwright-core');
const server = require('./server');
const phone = devices['iPhone 13'];

function boardHTML(pieceAt) {
  const cols = 9, rows = 7;
  let html = '';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const egg = (x === 1 && y === 1) ? '<span class="ic ic-myegg"><span class="wnum">14</span></span>' : '';
    const pc = (x === pieceAt[0] && y === pieceAt[1]) ? '<div class="pc ph hhyena mine" style="position:absolute;inset:4%"></div>' : '';
    html += `<div class="cell${(x + y) % 2 ? ' alt' : ''}" style="position:relative">${egg}${pc}</div>`;
  }
  return html;
}

(async () => {
  const b = await webkit.launch();
  const c = await b.newContext({ ...phone });
  const P = await c.newPage();
  await P.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_card_off', '1'); });
  await P.goto('http://localhost:4017/?theme=comic');
  await P.waitForSelector('#board');
  const cfg = { cols: 9, rows: 7 };
  const base = { role: 'blue', phase: 'play', myTurn: true, cfg, h3: { mySeat: 'blue' }, ostrich: [2, 2], vulture: [0, 0], marks: {} };

  // Egg smash: warmth "14" stays in its egg during Look out!, the cartoon covers
  // the board, Walk is not painted on top, and Tap waits until the card is gone.
  await P.evaluate(({ html, base }) => {
    document.documentElement.dataset.theme = 'comic';
    const board = document.getElementById('board');
    board.style.gridTemplateColumns = 'repeat(9, 36px)';
    board.style.gridTemplateRows = 'repeat(7, 36px)';
    board.innerHTML = html;
    const actions = document.getElementById('actions');
    actions.innerHTML = '<button class="on" aria-pressed="true">✓ Walk</button>';
    actions.style.display = 'flex';
    const prev = { ...base, smashNote: null };
    const S = { ...base, smashNote: { seq: 1, by: 'red', owner: 'blue' } };
    window.CUTAWAYS.prepare(S, prev, board);
    window.CUTAWAYS.play(S, prev, board);
  }, { html: boardHTML([4, 3]), base });

  await P.waitForTimeout(400);
  const look = await P.evaluate(() => {
    const n = document.querySelector('#boardhold .wnum');
    const cell = n && n.closest('.cell');
    const nr = n.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return {
      font: cs.fontSize,
      inside: nr.left >= cr.left - 1 && nr.right <= cr.right + 1 && nr.top >= cr.top - 1 && nr.bottom <= cr.bottom + 1,
      text: n.textContent
    };
  });
  assert.equal(look.text, '14');
  assert.equal(look.font, '10px', 'the egg number stays the in-egg size on the frozen board, not a large 14: ' + look.font);
  assert.ok(look.inside, 'the egg number stays inside its own square during Look out!');

  await P.waitForTimeout(1200); // into the cartoon (Look out is 1s)
  const mid = await P.evaluate(() => {
    const card = document.querySelector('#cutaway .cutaway-card');
    const board = document.getElementById('board');
    const actions = document.getElementById('actions');
    const br = board.getBoundingClientRect(), cr = card.getBoundingClientRect(), ar = actions.getBoundingClientRect();
    const you = document.querySelector('#stage > .youflag');
    return {
      scene: document.getElementById('cutaway') && document.getElementById('cutaway').dataset.scene,
      covers: cr.left <= br.left + 2 && cr.right >= br.right - 2,
      actionsHidden: getComputedStyle(actions).visibility === 'hidden',
      tap: !!document.getElementById('surprise-go'),
      youHidden: !you || getComputedStyle(you).visibility === 'hidden',
      overlap: !(cr.bottom <= ar.top + 1 || cr.top >= ar.bottom - 1 || cr.right <= ar.left + 1 || cr.left >= ar.right - 1)
    };
  });
  assert.equal(mid.scene, 'egg-smash');
  assert.ok(mid.covers, 'the cartoon card is at least as wide as the board');
  assert.ok(mid.actionsHidden, 'Walk is hidden while the cartoon is up');
  assert.ok(!mid.tap, 'Tap to go on. is not up during the cartoon');
  assert.ok(!mid.overlap || mid.actionsHidden, 'the action bar does not paint over the cartoon');

  await P.waitForFunction(() => !!document.getElementById('surprise-go') && !document.getElementById('cutaway'), null, { timeout: 6000 });
  const tapText = await P.locator('#surprise-go button').evaluate(el => el.textContent);
  assert.equal(tapText, 'Tap to go on.');

  await P.close();
  // Stone, on a fresh page: the hyena already drawn on the landing square stays hidden while the copy slides.
  const P2 = await c.newPage();
  await P2.goto('http://localhost:4017/?theme=comic');
  await P2.waitForSelector('#board');
  await P2.evaluate(({ cfg }) => {
    const cols = cfg.cols, rows = cfg.rows;
    const board = document.getElementById('board');
    board.style.gridTemplateColumns = 'repeat(9, 36px)';
    board.style.gridTemplateRows = 'repeat(7, 36px)';
    document.documentElement.dataset.theme = 'comic';
    const cell = (x, y, inner) => `<div class="cell" style="position:relative;width:36px;height:36px">${inner || ''}</div>`;
    let oldHtml = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) oldHtml += cell(x, y, (x === 4 && y === 3) ? '<div class="pc ph hhyena mine"></div>' : '');
    board.innerHTML = oldHtml;
    const prev = { role: 'hunter', kind: 'hyena', phase: 'play', cfg, h3: { mySeat: 'hunter', kind: 'hyena', hunter: [4, 3] }, hunter: [4, 3], stoneNote: null };
    const S = { role: 'hunter', kind: 'hyena', phase: 'play', cfg, h3: { mySeat: 'hunter', kind: 'hyena', hunter: [4, 5] }, hunter: [4, 5], stoneNote: { seq: 4, by: 'red', targets: ['hyena'], trails: [{ key: 'hyena', points: [[4, 3], [4, 4], [4, 5]] }] } };
    window.CUTAWAYS.prepare(S, prev, board);
    let neu = '';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) neu += cell(x, y, (x === 4 && y === 5) ? '<div class="pc ph hhyena mine" id="landed"></div>' : '');
    board.innerHTML = neu;
    const stage = document.getElementById('stage');
    stage.querySelectorAll('.youflag').forEach(e => e.remove());
    const landed = document.getElementById('landed').closest('.cell');
    const flag = document.createElement('span'); flag.className = 'youtag youflag'; flag.textContent = 'YOU';
    const sr = stage.getBoundingClientRect(), lr = landed.getBoundingClientRect();
    flag.style.left = (lr.left - sr.left + lr.width / 2) + 'px'; flag.style.top = (lr.top - sr.top) + 'px';
    stage.appendChild(flag);
    window.PUSH_MOTION.run(S, prev, board);
    window.CUTAWAYS.play(S, prev, board);
  }, { cfg });

  await P2.waitForTimeout(3200); // Look out 1s + cartoon 2s, then the slide has started
  const slide = await P2.evaluate(() => {
    const landed = document.getElementById('landed');
    const cell = landed.closest('.cell');
    const copy = document.querySelector('.push-actor');
    const cr = cell.getBoundingClientRect();
    const pr = copy && copy.getBoundingClientRect();
    const centerIn = r => pr && (pr.left + pr.width / 2) > r.left && (pr.left + pr.width / 2) < r.right && (pr.top + pr.height / 2) > r.top && (pr.top + pr.height / 2) < r.bottom;
    return {
      pieceHidden: getComputedStyle(landed).visibility === 'hidden',
      youHidden: getComputedStyle(document.querySelector('#stage > .youflag')).visibility === 'hidden',
      copy: !!copy,
      copyOnLanding: centerIn(cr)
    };
  });
  assert.ok(slide.pieceHidden, 'the hyena already on the landing square is hidden during the slide');
  assert.ok(slide.youHidden, 'the YOU tag on the landing square is hidden during the slide');
  assert.ok(slide.copy, 'a moving copy exists');
  assert.ok(!slide.copyOnLanding, 'the moving copy has not already settled on the landing square');

  // The opening hunt sentence must not cover "You're on the egg!".
  await P2.evaluate(() => {
    document.getElementById('hint').textContent = "You're on the egg!";
    const S = { phase: 'play', round: 1, role: 'red', h3: { ready: true } };
    const prev = { phase: 'play', round: 1, h3: { ready: true } };
    window.T3UI.startLine(S, prev, '3');
    window.T3UI.preferEggLine();
  });
  const top = await P2.evaluate(() => ({
    hint: document.getElementById('hint').textContent,
    status: [...document.querySelectorAll('#msgslot .status-active')].map(e => e.textContent)
  }));
  assert.equal(top.hint, "You're on the egg!");
  assert.ok(!top.status.some(t => /hunts eggs/.test(t)), 'the hunt intro is not the status line: ' + top.status.join(' | '));

  await b.close();
  server.close();
  console.log('PASS surprise fixes: cartoon covers the board, egg number stays put, stone landing stays hidden, tap waits');
  process.exit(0);
})().catch(e => { console.error(e); try { server.close(); } catch (err) {} process.exit(1); });
