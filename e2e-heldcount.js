// Phone header (WebKit, 390 x 664): while the egg count or the stone count holds its old number
// (the .fxheld class, set by hold() when an egg goes cold or a stone is picked up), the new number
// must be invisible and the old number must stay readable, in every theme. Before the fix, 12 of 14
// themes kept the new number visible under the held old one, so "2/3" printed over "3/3".
const assert = require('assert');
process.env.SWPORT = process.env.SWPORT || '3982';
process.env.BO_BOTMS = '200';
const L = require('./swlib');
const THEMES = ['bw', 'classic', 'nature', 'notes', 'golden', 'paper', 'arcade', 'toybox', 'tactical', 'storm', 'volcano', 'comic', 'pharaoh', 'neon'];

async function probe(p, theme) {
  return p.evaluate(t => {
    window.THEME.set(t);
    const alpha = s => { if (!s || s === 'transparent') return 0; const m = /rgba?\(\s*[\d.]+(?:\s*,\s*[\d.]+){2}(?:\s*,\s*([\d.]+))?\s*\)/.exec(s); return !m || m[1] == null ? 1 : +m[1]; };
    const one = id => {
      const el = document.getElementById(id);
      if (!el) return { id, missing: true };
      const live = el.textContent;
      const before = getComputedStyle(el).color;
      // Same steps as hold() and release() in public/fx.js (they are private to that file): keep the theme colour, then hold the old number "9/9".
      const hold = (e, old) => { const cs = getComputedStyle(e); e.style.setProperty('--held', cs.color); e.style.setProperty('--heldsh', cs.textShadow); e.dataset.old = old; e.classList.add('fxheld'); };
      const release = e => { e.classList.remove('fxheld'); e.removeAttribute('data-old'); e.style.removeProperty('--held'); e.style.removeProperty('--heldsh'); };
      hold(el, '9/9');
      const c = getComputedStyle(el), a = getComputedStyle(el, '::after');
      const out = {
        id, live, before, content: a.content,
        liveAlpha: Math.min(alpha(c.color), alpha(c.webkitTextFillColor)),
        liveShadow: c.textShadow,
        heldColor: a.color, heldFill: a.webkitTextFillColor,
        heldAlpha: Math.min(alpha(a.color), alpha(a.webkitTextFillColor)),
      };
      release(el);
      out.after = getComputedStyle(el).color; // back to normal once released
      out.afterAlpha = alpha(getComputedStyle(el).webkitTextFillColor);
      return out;
    };
    return { theme: document.documentElement.getAttribute('data-theme'), eggs: one('eggsLeft'), stones: one('stonesLeft') };
  }, theme);
}

(async () => {
  const b = await L.launch();
  const p = await L.solo(b, 1, 'blue', { record: false, theme: 'bw' });
  await p.setViewportSize({ width: 390, height: 664 });
  await L.untilMyTurn(p);
  let checks = 0;
  const fails = [];
  for (const th of THEMES) {
    const r = await probe(p, th);
    assert.equal(r.theme, th, 'theme applied: ' + th);
    for (const [name, c] of [['egg count', r.eggs], ['stone count', r.stones]]) {
      const label = th + ' ' + name;
      try {
        assert.ok(!c.missing, label + ' is in the header');
        assert.ok(/^\d+\/\d+$/.test(c.live), label + ' reads alive/start, got ' + c.live);
        assert.equal(c.content, '"9/9"', label + ' shows the held old number');
        assert.equal(c.liveAlpha, 0, label + ' new number is hidden while held (alpha ' + c.liveAlpha + ', ' + c.liveShadow + ')');
        assert.equal(c.liveShadow, 'none', label + ' new number has no shadow copy while held: ' + c.liveShadow);
        assert.equal(c.heldAlpha, 1, label + ' held old number is solid, alpha ' + c.heldAlpha);
        assert.equal(c.heldColor, c.before, label + ' held old number keeps the theme colour ' + c.before + ', got ' + c.heldColor);
        assert.equal(c.heldFill, c.before, label + ' held old number fill keeps the theme colour, got ' + c.heldFill);
        assert.equal(c.afterAlpha, 1, label + ' number is visible again after release');
        assert.equal(c.after, c.before, label + ' colour restored after release');
        checks += 9;
      } catch (e) { fails.push(e.message); }
    }
  }
  assert.deepEqual(p.errs, [], 'no page errors');
  await b.close(); L.server.close();
  if (fails.length) { console.log('FAIL ' + fails.length + ' of ' + (THEMES.length * 2) + ' theme/counter cases failed:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('OK e2e-heldcount: ' + THEMES.length + ' themes x (egg count, stone count), ' + checks + ' checks');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
