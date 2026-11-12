// End screens (N2 draw, Hunters tie), 3-player double-turn cues, and phone-size reminder screenshots.
process.env.PORT = 3981; process.env.BO_H3START = '8,3'; process.env.BO_NOSTORE = '1';
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs'), path = require('path');
const server = require('./server.js');
const R = require('./public/roles.js');
const U = 'http://localhost:3981/';
const OUT = path.resolve('/workspace/bw/reminders/build2/shots');
fs.mkdirSync(OUT, { recursive: true });

const TIE = 'Both birds are out. The hunters tie: you have the same number of knock-outs, and the same number of catches.';
const DRAW = 'Time ran out and nobody met their goal.';
const CARDS = [
  ['classic-ostrich', 'blue', null, '2'],
  ['classic-vulture', 'red', null, '2'],
  ['3p-ostrich', 'blue', 'hyena', '3'],
  ['3p-vulture', 'red', 'hyena', '3'],
  ['3p-hyena', 'hunter', 'hyena', '3'],
  ['3p-badger', 'hunter', 'badger', '3'],
  ['2v2-ostrich', 'o1', null, '4'],
  ['2v2-vulture', 'v1', null, '4'],
  ['hunters-ostrich', 'blue', null, '4h'],
  ['hunters-vulture', 'red', null, '4h'],
  ['hunters-hyena', 'hyena', null, '4h'],
  ['hunters-badger', 'badger', null, '4h'],
  ['5p-ostrich', 'o1', 'hyena', '5'],
  ['5p-vulture', 'v1', 'hyena', '5'],
  ['5p-hyena', 'hunter', 'hyena', '5'],
  ['5p-badger', 'hunter', 'badger', '5'],
];

(async () => {
  const b = await webkit.launch(), errs = [];
  const mk = async () => {
    const c = await b.newContext({ ...devices['iPhone 13'] });
    const p = await c.newPage();
    await p.addInitScript(() => {
      for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1');
      ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9'));
    });
    p.on('pageerror', e => errs.push(e.message));
    return p;
  };
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  const shown = (p) => p.locator('#rolecard:not(.hidden)');

  const A = await mk(), V = await mk(), H = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3981');
  await V.goto(link); await H.goto(link);
  await A.waitForFunction(() => { const s = LobbyUI.get(); return s && s.setup === '3'; });
  await A.click('[data-role="blue"]'); await V.click('[data-role="red"]'); await H.click('[data-role="hyena"]');
  await A.click('#startGame');
  await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell'); await H.waitForSelector('#board .cell');
  for (const p of [A, V, H]) { await p.waitForSelector('#rolecard:not(.hidden)'); await p.click('#rolecard .rok'); }
  for (const [x, y] of [[2, 1], [6, 1], [2, 5], [7, 6]]) { await cell(A, x, y).click(); await A.waitForTimeout(80); }
  await A.waitForTimeout(200);

  // --- every reminder card over the live board ---
  const showCard = async (page, role, kind, mode) => {
    await page.evaluate(({ role, kind, mode }) => {
      const S = UI._S(), c = Roles.roleCard(role, kind, mode, S.rules);
      const art = k => k === 'ostrich' ? (window.OST || (window.ART && ART.ostrich)) : k === 'vulture' ? (window.VUL || (window.ART && ART.vulture)) : (T3UI.KIND[k] && T3UI.KIND[k].art) || '';
      const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
      const lines = c.lines && c.lines.length ? c.lines : [c.goal, ...(c.moves || [])].filter(Boolean);
      const el = document.getElementById('rolecard');
      el.innerHTML = `<div class="rc" data-animal="${esc(c.animal || '')}"><div class="rtop"><span class="rpic">${art(c.picture)}</span><h2>${esc(c.mode || '')}</h2></div><p class="rwho">${esc(c.title)}</p><ul class="rmoves">${lines.map(m => `<li>${esc(m)}</li>`).join('')}</ul><button type="button" class="rok">Got it</button></div>`;
      el.classList.remove('hidden');
    }, { role, kind, mode });
    await page.waitForSelector('#rolecard:not(.hidden) .rc');
  };
  const hideCard = async (page) => page.evaluate(() => { const el = document.getElementById('rolecard'); if (el) el.classList.add('hidden'); });

  for (const [name, role, kind, mode] of CARDS) {
    const c = R.roleCard(role, kind, mode);
    await showCard(A, role, kind, mode);
    const t = await A.evaluate(() => document.getElementById('rolecard').innerText);
    for (const l of [c.title, ...(c.lines || [])]) assert.ok(t.includes(l), name + ' missing: ' + l + '\n' + t);
    await A.screenshot({ path: path.join(OUT, name + '.png') });
    await hideCard(A);
  }
  console.log('ok every reminder card');

  // --- 3p double-turn look T1 ---
  const setExtra = async (page, seat) => page.evaluate((seat) => {
    const S = UI._S();
    S.phase = 'play'; S.turn = 'hunter'; S.pounce = false;
    S.myTurn = S.role === 'hunter' || S.role === seat && seat === 'hunter';
    if (S.role === 'hunter') S.myTurn = true;
    else S.myTurn = false;
    S.h3 = Object.assign(S.h3 || {}, { extra: true, kind: S.h3 && S.h3.kind || 'hyena' });
    UI._rr();
  }, seat);
  await setExtra(H, 'hunter'); await setExtra(V, 'red');
  const hintH = await H.evaluate(() => (document.getElementById('hint') || {}).textContent || '');
  const hintV = await V.evaluate(() => (document.getElementById('hint') || {}).textContent || '');
  assert.ok(hintH.includes('Your turn again. Tap to move.'), 'hunter second-turn hint: ' + hintH);
  assert.ok(hintV.includes("Hyena's turn again."), 'other seat second-turn hint: ' + hintV);
  const chipH = await H.evaluate(() => !!document.querySelector('#h3bar .bchip.hunter.now, #h3bar .bchip.hhyena.now, #h3bar [data-b="hunter"].now'));
  const chipV = await V.evaluate(() => !!document.querySelector('#h3bar .bchip.hunter.now, #h3bar .bchip.hhyena.now, #h3bar [data-b="hunter"].now'));
  assert.ok(chipH && chipV, 'the turn chip stays on the hunter between the two turns');
  const seatMark = await H.evaluate(() => !!document.querySelector('.tmark, .againmark, [data-extra], .seatmark'));
  assert.ok(!seatMark, 'no seat mark on the second turn');
  await H.screenshot({ path: path.join(OUT, '3p-double-hunter.png') });
  await V.screenshot({ path: path.join(OUT, '3p-double-other.png') });
  console.log('ok 3p double-turn look T1');

  // --- N2 draw ---
  const showOver = async (page, state) => page.evaluate((state) => {
    const el = document.getElementById('over');
    el.innerHTML = T3UI.over(state);
    el.classList.remove('hidden');
    const rc = document.getElementById('rolecard'); if (rc) rc.classList.add('hidden');
  }, state);
  const drawState = {
    phase: 'over', winner: 'none', winBy: 'time', endWhy: DRAW, role: 'blue', turn: 'blue', round: 30,
    cfg: { rounds: 30 }, eggsLeft: 0, flow: true, arrivals: [],
    h3: { kind: 'hyena', hunt: false, team: false, mySeat: 'blue', birds: { red: { out: false, catches: 0 }, blue: { out: true, catches: 0, why: 'starved' } }, ko: 2 }
  };
  await showOver(A, drawState);
  const drawText = await A.evaluate(() => document.getElementById('over').innerText);
  assert.ok(drawText.includes("It's a draw."), drawText);
  assert.ok(drawText.includes(DRAW), drawText);
  assert.ok(drawText.includes('Rematch · Same roles') && drawText.includes('New Game'), 'existing rematch buttons');
  const pair = await A.evaluate(() => {
    const box = document.querySelector('#over .bigost.pair');
    return !!(box && box.querySelectorAll('span').length === 2 && box.querySelectorAll('svg, img').length >= 2);
  });
  assert.ok(pair, 'N2 shows both bird drawings');
  assert.ok(!/No winner|🤝/.test(drawText), 'no handshake / No winner');
  await A.screenshot({ path: path.join(OUT, 'n2-draw.png') });
  console.log('ok N2 draw');

  // --- Hunters tie ---
  const tieState = {
    phase: 'over', winner: 'none', winBy: 'ko', endWhy: TIE, role: 'hyena', turn: 'badger', round: 12,
    cfg: { rounds: 30 }, eggsLeft: 2, flow: true, arrivals: [],
    h3: { hunt: true, kind: 'hyena', mySeat: 'hyena', hkos: { hyena: 1, badger: 1 }, ko: { hyena: 2, badger: 2 },
      birds: { red: { out: true, catches: 2, why: 'caught' }, blue: { out: true, catches: 2, why: 'caught' } } }
  };
  await showOver(A, tieState);
  const tieText = await A.evaluate(() => document.getElementById('over').innerText);
  assert.ok(tieText.includes("It's a tie."), tieText);
  assert.ok(tieText.includes(TIE), tieText);
  const huntPair = await A.evaluate(() => {
    const box = document.querySelector('#over .bigost.pair');
    return !!(box && box.querySelectorAll('span').length === 2 && box.querySelectorAll('svg, img').length >= 2);
  });
  assert.ok(huntPair, 'the hunters tie shows both hunter drawings');
  // fallback when endWhy is missing still uses the approved tie body
  const fallback = await A.evaluate(() => {
    const S = { phase: 'over', winner: 'none', winBy: 'ko', role: 'hyena', cfg: { rounds: 30 },
      h3: { hunt: true, kind: 'hyena', mySeat: 'hyena', hkos: { hyena: 1, badger: 1 }, ko: { hyena: 2, badger: 2 }, birds: { red: { out: true, catches: 1 }, blue: { out: true, catches: 1 } } } };
    return T3UI.over(S);
  });
  assert.ok(fallback.includes("It's a tie.") && fallback.includes(TIE), 'missing endWhy still uses the approved tie body');
  const ruleFallback = fs.readFileSync('./public/three-ui.js', 'utf8');
  assert.ok(ruleFallback.includes('If you have the same number of knock-outs, whoever got more catches wins. Same catches? You tie.'), 'line-130 fallback wording is in three-ui.js');
  await A.screenshot({ path: path.join(OUT, 'hunters-tie.png') });
  console.log('ok Hunters tie');

  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close();
  console.log('PASS e2e-ends'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
