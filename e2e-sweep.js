// Bug-sweep regressions (2026-11-11), WebKit iPhone 390x844, default (black-and-white) theme:
//  1. Lobby: your picked animal card is readable in every mode (name and "YOU" are not the colour of the card) and is not a black fill.
//  2. A hunter never sees a vulture tip ("Fly here"); a classic game never names a badger in its square tips.
//  3. A line in the banner stays up long enough to read (1s, or 0.3s a word), even if the state redraws at once.
//  4. A tap during a cartoon or "Tap to go on." is ignored quietly: no "Not a legal move right now." and no move sent.
process.env.SWPORT = 3969;
const assert = require('assert');
const L = require('./swlib');
const bright = rgb => L.lum(rgb);
(async () => {
  const b = await L.launch();
  // 1. lobby picks, every mode and every role card
  for (const [bots, roles] of [[1, ['blue', 'red']], [2, ['blue', 'red', 'hyena', 'badger']], [3, ['ostrich', 'vulture', 'hyena', 'badger']], [4, ['o1', 'o2', 'v1', 'v2', 'hyena', 'badger']]]) {
    const p = await L.phone(b, { record: false }); await p.goto(L.U); await p.click('#playSolo'); await p.click(`[data-bots="${bots}"]`); await p.click('#soloGo'); await p.waitForSelector('#roomLobby .rolecard');
    for (const r of roles) {
      if (!(await p.locator(`[data-role="${r}"]`).count())) continue;
      await p.click(`[data-role="${r}"]`); await p.waitForSelector(`.rolecard.mine[data-role="${r}"]`);
      const m = await p.evaluate(() => { const parse = c => /rgba?\((\d+), (\d+), (\d+)/.exec(c).slice(1, 4).map(Number); const e = document.querySelector('.rolecard.mine'), cs = getComputedStyle(e);
        return { bg: parse(cs.backgroundColor), name: parse(getComputedStyle(e.querySelector('b')).webkitTextFillColor), you: parse(getComputedStyle(e.querySelector('small')).webkitTextFillColor), small: e.querySelector('small').textContent, outline: cs.outlineWidth, art: [...e.querySelectorAll('svg *')].map(s => getComputedStyle(s).stroke).filter(x => /rgb\(/.test(x)).map(parse) }; });
      assert.ok(L.ratio(m.name, m.bg) >= 4.5, `${bots} computers, ${r}: the picked card name is readable (${L.ratio(m.name, m.bg).toFixed(2)})`);
      assert.ok(L.ratio(m.you, m.bg) >= 4.5, `${bots} computers, ${r}: the YOU line is readable`);
      assert.equal(m.small, 'YOU'); assert.ok(bright(m.bg) > 0.8, `${bots} computers, ${r}: the picked card is not a dark fill`); assert.ok(parseFloat(m.outline) >= 3, 'a thick edge marks the pick');
      assert.ok(m.art.every(c => L.ratio(c, m.bg) >= 3), 'the animal art is drawn dark on the light card');
    }
    await p.context().close();
  }
  console.log('ok lobby picks');
  // 2. tips by role. Classic ostrich: no badger in the kick tip. 3 players as the badger: no "Fly here" on any square.
  {
    const p = await L.solo(b, 1, 'blue', { record: false }); await L.untilMyTurn(p);
    const tips = await p.evaluate(() => [...document.querySelectorAll('#board .cell')].map(c => c.dataset.tip || '').join('\n'));
    assert.ok(!/badger/i.test(tips), 'classic: no badger named in any square tip'); await p.context().close();
  }
  {
    const p = await L.solo(b, 2, 'badger', { record: false });
    for (let turn = 0; turn < 3; turn++) {
      await L.untilMyTurn(p);
      await p.waitForSelector('#board .cell.legal', { state: 'attached', timeout: 15000 });
      const tips = await p.evaluate(() => [...document.querySelectorAll('#board .cell.legal')].map(c => c.dataset.tip || ''));
      assert.ok(tips.length > 0 && tips.every(t => /Move here/.test(t)) && !tips.some(t => /Fly|Throw|Kick/.test(t)), 'the badger\'s squares say Move here: ' + [...new Set(tips)].join(' | '));
      const [x, y] = (await p.evaluate(() => UI._legal()))[0]; await L.cell(p, x, y).click({ force: true }); await p.waitForTimeout(400);
    }
    assert.deepEqual(p.errs, []); await p.context().close();
  }
  console.log('ok tips by role');
  // 3. banner hold
  {
    const p = await L.solo(b, 1, 'red', { record: false }); await p.waitForSelector('#board .cell');
    const r = await p.evaluate(async () => {
      const bn = document.getElementById('banner'), log = []; BO_BANNER.reset();
      const read = () => bn.classList.contains('hidden') ? '' : bn.textContent;
      BO_BANNER.set('Egg nearby!', 'yes'); const t0 = performance.now(); log.push(['0', read()]);
      BO_BANNER.set('', ''); log.push(['redraw at once', read()]);
      await new Promise(r => setTimeout(r, 500)); log.push(['500ms', read()]);
      await new Promise(r => setTimeout(r, 650)); log.push(['1150ms', read()]);
      BO_BANNER.set('The vulture smashed the whole nest of eggs today, again!', 'yes'); const long = 'The vulture smashed the whole nest of eggs today, again!'; // 10 words: 3s
      BO_BANNER.set('', ''); await new Promise(r => setTimeout(r, 2500)); log.push(['2500ms long', read()]);
      await new Promise(r => setTimeout(r, 700)); log.push(['3200ms long', read()]);
      return log; });
    const g = Object.fromEntries(r); assert.equal(g['0'], 'Egg nearby!'); assert.equal(g['redraw at once'], 'Egg nearby!', 'a redraw does not wipe a line before it can be read'); assert.equal(g['500ms'], 'Egg nearby!'); assert.equal(g['1150ms'], '');
    assert.ok(g['2500ms long'].startsWith('The vulture smashed'), 'a 10 word line stays up 3s'); assert.equal(g['3200ms long'], '');
    await p.context().close();
  }
  console.log('ok banner hold');
  // 4. taps during a hold are ignored: no refusal text, nothing sent
  {
    const p = await L.solo(b, 2, 'blue', { record: false }); await p.waitForSelector('#board .cell');
    const sent = await p.evaluate(() => { window.__sent = []; const ws = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { window.__sent.push(String(d)); return ws.call(this, d); }; return true; });
    await L.untilMyTurn(p);
    // fake a hold: the same flag the cartoon sets, then tap every legal square and press an action button
    await p.evaluate(() => { window.__busy = CUTAWAYS.busy; CUTAWAYS.busy = () => true; window.__sent.length = 0; });
    const legal = await p.evaluate(() => UI._legal()); assert.ok(legal.length);
    for (const [x, y] of legal.slice(0, 3)) await L.cell(p, x, y).click({ force: true });
    await p.locator('#actions button').first().click({ force: true });
    await p.waitForTimeout(500);
    const acts = await p.evaluate(() => window.__sent.filter(s => /"t":"act"/.test(s)).length);
    assert.equal(acts, 0, 'no move is sent during a hold'); assert.ok(!/legal move right now/.test(await p.textContent('#log')), 'no refusal text');
    await p.evaluate(() => { CUTAWAYS.busy = window.__busy; });
    const [x, y] = legal[0]; await L.cell(p, x, y).click({ force: true });
    await p.waitForTimeout(600);
    assert.ok(await p.evaluate(() => window.__sent.filter(s => /"t":"act"/.test(s)).length) >= 1, 'taps work again when the hold is over');
    await p.context().close();
  }
  console.log('ok taps during a hold');
  // 5. the top bar reads in the light themes: the egg count and the room-link icon were white on cream
  for (const th of ['paper', 'notes', 'toybox']) {
    const p = await L.solo(b, 2, 'badger', { record: false, theme: th }); await p.waitForSelector('#board .cell'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number), lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const bar = rgb(getComputedStyle(document.getElementById('hud')).backgroundColor), e = document.getElementById('eggsLeft'), sh = getComputedStyle(e).textShadow;
      const out = { eggs: ratio(rgb(getComputedStyle(e).color), bar), shadow: sh }; const btn = document.getElementById('inviteBtn'), path = btn && btn.querySelector('svg *');
      if (path) out.link = ratio(rgb(getComputedStyle(path).stroke), rgb(getComputedStyle(btn).backgroundColor)); return out; });
    assert.ok(r.eggs >= 4.5, th + ' egg count contrast ' + r.eggs.toFixed(2)); assert.ok(!r.shadow || r.shadow === 'none', th + ' egg count has no black smudge: ' + r.shadow);
    if (r.link != null && th === 'notes') assert.ok(r.link >= 3, th + ' room-link icon contrast ' + r.link.toFixed(2));
    await p.context().close();
  }
  console.log('ok light themes');
  await b.close(); L.server.close(); console.log('PASS e2e-sweep'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
