// Phone header (WebKit, 390 x 664): the EGGS number is one digit, in every theme and every mode.
// It matches that phone's own eggsLeft, it is the same public count for every seat, and it does not
// carry an egg's square. A redraw that holds the old count must not also paint the new one.
const assert = require('assert'), fs = require('fs');
fs.mkdirSync('shots', { recursive: true });
process.env.SWPORT = process.env.SWPORT || '3981';
process.env.BO_BOTMS = '200';
const L = require('./swlib');
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];
const lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function offsetCopies(shadow) {
  if (!shadow || shadow === 'none') return [];
  const bad = [];
  const re = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g;
  let m;
  while ((m = re.exec(shadow))) {
    const x = +m[1], y = +m[2], blur = +m[3];
    if (blur === 0 && (x !== 0 || y !== 0)) bad.push(m[0]);
  }
  return bad;
}

async function dismiss(p) {
  for (let i = 0; i < 6; i++) {
    const rc = await p.locator('#rolecard:not(.hidden) .rok');
    if (await rc.count()) { await rc.click(); await p.waitForTimeout(150); } else break;
  }
}

async function paint(p) {
  return p.evaluate(() => {
    const parse = c => { const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(c || ''); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; };
    const hexes = s => [...String(s || '').matchAll(/#([0-9a-fA-F]{6})\b/g)].map(m => {
      const h = m[1]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    });
    const from = s => [...String(s || '').matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).concat(hexes(s)).filter(c => c && c[3] >= 0.5);
    const hud = getComputedStyle(document.getElementById('hud'));
    const img = hud.backgroundImage || '';
    const backs = (/gradient/.test(img) && !/url\(/.test(img) ? from(img) : []).concat(from(hud.backgroundColor));
    const one = id => {
      const all = [...document.querySelectorAll('#' + id)];
      const n = all[0];
      if (!n) return { id, missing: true, n: all.length };
      const c = getComputedStyle(n);
      const fill = parse(c.webkitTextFillColor) || parse(c.color);
      return {
        id, n: all.length, text: n.textContent, nodes: n.childNodes.length,
        shadow: c.textShadow, color: fill, before: getComputedStyle(n, '::before').content, after: getComputedStyle(n, '::after').content,
      };
    };
    const S = window.UI && UI._S();
    const alive = S && S.eggs ? S.eggs.filter(e => e.alive).length : null;
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      backs, eggs: one('eggsLeft'), rounds: one('roundsLeft'), hunger: one('hungerLeft'), stones: one('stonesLeft'),
      eggsLeft: S ? S.eggsLeft : null, cfgEggs: S && S.cfg ? S.cfg.eggs : null, alive, hasEggs: !!(S && S.eggs), role: S && S.role, phase: S && S.phase,
      line: (document.querySelector('#hud .ctr') || {}).innerText || '',
    };
  });
}

function assertOneNumber(info, label) {
  const e = info.eggs;
  assert.equal(e.n, 1, label + ' one EGGS element, got ' + e.n);
  assert.equal(e.missing, undefined, label + ' EGGS element is in the header');
  assert.equal(e.nodes, 1, label + ' the number is one text node');
  assert.equal(e.before, 'none', label + ' no extra EGGS ::before');
  assert.equal(e.after, 'none', label + ' no extra EGGS ::after at rest');
  assert.equal(e.text, String(info.eggsLeft), label + ' header shows eggsLeft ' + info.eggsLeft + ' not ' + e.text);
  assert.equal(offsetCopies(e.shadow).length, 0, label + ' egg number has no second copy: ' + e.shadow);
  for (const id of ['rounds', 'hunger', 'stones']) {
    const c = info[id];
    if (c.missing) continue;
    assert.equal(offsetCopies(c.shadow).length, 0, label + ' ' + id + ' has no second copy: ' + c.shadow);
  }
  assert.equal((info.line.match(/EGGS/g) || []).length, 1, label + ' the word EGGS appears once: ' + JSON.stringify(info.line));
  if (info.hasEggs) assert.equal(info.alive, info.eggsLeft, label + ' eggsLeft matches the alive eggs this phone was sent');
  assert.ok(e.color && e.color[3] > 0.9, label + ' the egg number is a solid colour');
  // Classic, nature and the default black-and-white bar are the ones this fix recolors.
  // Other themes keep their own colours; toybox's blue on its pale bar is about 3:1 already.
  const need = info.theme === 'classic' || info.theme === 'nature' || info.theme === 'bw' ? 4.5 : 2.5;
  assert.ok(info.backs.length, label + ' header background');
  for (const bg of info.backs) {
    const r = ratio(e.color, bg);
    assert.ok(r >= need, label + ' egg number contrast ' + r.toFixed(2) + ' on ' + bg.slice(0, 3).join(',') + ' (need ' + need + ')');
  }
}

async function holdBoth(p, theme) {
  return p.evaluate(t => {
    window.THEME.set(t);
    const read = id => {
      const el = document.getElementById(id);
      if (!el) return { id, missing: true };
      const cs = getComputedStyle(el);
      el.style.setProperty('--held', cs.color);
      el.style.setProperty('--heldsh', cs.textShadow);
      el.dataset.old = '9';
      el.classList.add('fxheld');
      const c = getComputedStyle(el), a = getComputedStyle(el, '::after');
      const alpha = s => { if (!s || s === 'transparent') return 0; const m = /rgba?\(\s*[\d.]+(?:\s*,\s*[\d.]+){2}(?:\s*,\s*([\d.]+))?\s*\)/.exec(s); return !m || m[1] == null ? 1 : +m[1]; };
      const out = { id, text: el.textContent, color: c.color, fill: c.webkitTextFillColor, after: a.content, afterColor: a.color, afterFill: a.webkitTextFillColor, liveA: Math.min(alpha(c.color), alpha(c.webkitTextFillColor)), afterA: Math.min(alpha(a.color), alpha(a.webkitTextFillColor)) };
      el.classList.remove('fxheld'); el.removeAttribute('data-old');
      el.style.removeProperty('--held'); el.style.removeProperty('--heldsh');
      return out;
    };
    return { eggs: read('eggsLeft'), stones: read('stonesLeft') };
  }, theme);
}

(async () => {
  const b = await L.launch();
  const p = await L.solo(b, 1, 'blue', { record: false, theme: 'bw' });
  await p.setViewportSize({ width: 390, height: 664 });
  await L.untilMyTurn(p);
  for (const th of THEMES) {
    await p.evaluate(t => window.THEME.set(t), th);
    await p.waitForTimeout(50);
    const info = await paint(p);
    assert.equal(info.theme, th);
    assert.equal(info.phase, 'play');
    assert.equal(info.eggsLeft, 3, th + ' a fresh game still has 3 eggs, not 6');
    assertOneNumber(info, th);
    const held = await holdBoth(p, th);
    for (const part of [held.eggs, held.stones]) {
      assert.ok(!part.missing, th + ' ' + part.id);
      assert.equal(part.after, '"9"', th + ' ' + part.id + ' holds the old number');
      assert.ok(part.liveA < 0.05, th + ' ' + part.id + ' hides the live number while holding (' + part.color + ' / ' + part.fill + ')');
      assert.ok(part.afterA > 0.5, th + ' ' + part.id + ' the held number stays visible (' + part.afterColor + ')');
    }
  }
  await p.evaluate(() => window.THEME.set('classic'));
  await p.locator('#hud').screenshot({ path: 'shots/eggcount-after-classic.png' });
  await p.evaluate(() => window.THEME.set('bw'));
  await p.locator('#hud').screenshot({ path: 'shots/eggcount-after-bw.png' });
  await p.context().close();
  console.log('ok themes');

  // Each seat's header matches its own view. Hunters and vultures are not sent egg squares.
  // Totals: 3 in a one-nest game (2 players, 3 players, Hunters), 4 when two ostriches each hide 2.
  const seats = [
    [1, 'red', '2p vulture', 3, false],
    [2, 'blue', '3p ostrich', 3, true],
    [2, 'hyena', '3p hyena', 3, false],
    [2, 'badger', '3p badger', 3, false],
    [3, 'ostrich', '2v2 ostrich', 4, true],
    [3, 'badger', 'hunters badger', 3, false],
    [4, 'o1', '5p ostrich', 4, true],
    [4, 'v1', '5p vulture', 4, false],
    [4, 'hyena', '5p hyena', 4, false],
  ];
  for (const [bots, role, label, expect, seesEggs] of seats) {
    const q = await L.solo(b, bots, role, { record: false, theme: 'classic' });
    await q.setViewportSize({ width: 390, height: 664 });
    await L.untilMyTurn(q);
    const info = await paint(q);
    assert.equal(info.phase, 'play', label + ' reached play (' + info.phase + ')');
    assert.equal(info.hasEggs, seesEggs, label + (seesEggs ? ' is sent its eggs' : ' is not sent egg squares'));
    assert.equal(info.eggsLeft, expect, label + ' public count is ' + expect + ', header has ' + info.eggsLeft);
    assertOneNumber(info, label + ' classic');
    await q.evaluate(() => window.THEME.set('bw'));
    assertOneNumber(await paint(q), label + ' bw');
    await q.context().close();
    console.log('ok ' + label);
  }

  // Pass & play: both hands show the same public count, and the vulture's board has no egg squares.
  {
    const q = await L.phone(b, { record: false });
    await q.setViewportSize({ width: 390, height: 664 });
    await q.goto(L.U);
    await q.click('#playPass'); await q.click('#passGo');
    await q.waitForSelector('#handoff.blue'); await q.click('#hGo');
    await q.waitForSelector('#board .cell');
    await dismiss(q);
    for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 2]]) await q.locator('#board .cell').nth(y * 9 + x).click();
    await q.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.eggsLeft === 3; });
    let info = await paint(q);
    assert.equal(info.role, 'blue');
    assertOneNumber(info, 'pass ostrich');
    await q.waitForSelector('#handoff.red', { timeout: 20000 });
    await q.click('#hGo');
    await q.waitForSelector('#actions.mine', { state: 'attached' });
    info = await paint(q);
    assert.equal(info.role, 'red', 'pass handed to the vulture');
    assert.equal(info.hasEggs, false, 'pass vulture is not sent egg squares');
    assert.equal(info.eggsLeft, 3);
    assert.equal(await q.locator('#board .ic-myegg,.ic-spot,.wnum').count(), 0, 'pass vulture board hides eggs');
    assertOneNumber(info, 'pass vulture');
    await q.context().close();
    console.log('ok pass & play');
  }

  // Two phones, one room: ostrich and vulture show the same count after the eggs are hidden.
  {
    const A = await L.phone(b, { record: false }), V = await L.phone(b, { record: false });
    await A.setViewportSize({ width: 390, height: 664 });
    await V.setViewportSize({ width: 390, height: 664 });
    await A.goto(L.U + '?theme=classic'); await A.click('#playFriend');
    await A.waitForSelector('#lobbyCode:not(:empty)');
    const link = await A.inputValue('#lobbyLink');
    await V.goto(link.replace(/^http:\/\/[^/]+/, L.U.replace(/\/$/, '')));
    await V.waitForSelector('#roomLobby');
    await A.click('[data-role="blue"]'); await V.click('[data-role="red"]');
    await A.click('#startGame');
    await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
    await dismiss(A); await dismiss(V);
    for (const [x, y] of [[3, 4], [6, 2], [2, 1], [7, 2]]) await A.locator('#board .cell').nth(y * 9 + x).click();
    await V.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.eggsLeft === 3; });
    const a = await paint(A), v = await paint(V);
    assert.equal(a.eggsLeft, 3); assert.equal(v.eggsLeft, 3);
    assert.equal(a.eggs.text, v.eggs.text, 'both phones show the same EGGS number');
    assert.equal(a.hasEggs, true); assert.equal(v.hasEggs, false, 'vulture view has no egg squares');
    assert.equal(await V.locator('#board .ic-myegg,.ic-spot,.wnum').count(), 0);
    assertOneNumber(a, '2p ostrich'); assertOneNumber(v, '2p vulture');
    await A.context().close(); await V.context().close();
    console.log('ok two phones');
  }

  await b.close(); L.server.close();
  console.log('PASS e2e-eggcount');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
