// The start-of-game cards (public/tutorial.js): for every role x mode, all three cards show a picture that exists, in the B&W look (real board
// pictures for cards 2 and 3) and in another look (the player's animal), and exactly one page dot is marked current and is filled. Card 1 is the animal.
process.env.PORT = 3994; process.env.BO_NOSTORE = '1';
const { webkit, devices } = require('playwright-core'); const assert = require('assert'), fs = require('fs'), path = require('path');
const server = require('./server.js'), R = require('./public/roles.js'), SA = require('./public/start-art.js');
const rules = R.rulesFromModules();
(async () => {
  // 1. the keyword table: every line a card 2 or 3 can carry maps to a topic with a picture file; unmatched lines get the fallback
  const lines = new Set(['Tap a lit square on your turn.']);
  const cases = [];
  for (const [role, kind] of [['blue', 'hyena'], ['red', 'hyena'], ['hunter', 'hyena'], ['hunter', 'badger'], ['blue', 'badger'], ['red', 'badger']])
    for (const mode of ['2', '3', '4', '4h', '5']) {
      if (role === 'hunter' && (mode === '2' || mode === '4')) continue;
      const c = R.roleCard(role, kind, mode, rules); cases.push({ role, kind, mode, animal: c.picture });
      c.lines.slice(1, 3).forEach(l => lines.add(l));
    }
  for (const l of lines) { const f = path.join(__dirname, 'public', 'tut', 'start', SA.pick(l) + '.png'); assert.ok(fs.existsSync(f), 'no picture file for: ' + l + ' -> ' + f); assert.ok(fs.statSync(f).size < 80000, f + ' is under 80 KB'); }
  for (const t of SA.TOPICS) assert.ok(fs.existsSync(path.join(__dirname, 'public', 'tut', 'start', t + '.png')), 'topic file ' + t);
  assert.equal(SA.pick('Something nobody wrote'), SA.FALLBACK, 'unmatched lines use the fallback');
  console.log('ok ' + lines.size + ' lines map to pictures that exist');
  // 2. the cards in a phone
  const b = await webkit.launch(), errs = [];
  const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off'].forEach(k => localStorage.setItem(k, '1')); });
  await p.goto('http://127.0.0.1:3994/', { timeout: 20000 });
  for (const theme of ['bw', 'classic']) {
    await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    for (const c of cases) {
      const S = await p.evaluate(({ c, rules }) => { const S = { rules, role: c.role, kind: c.kind, three: c.mode !== '2', h3: c.mode === '2' ? undefined : c.mode === '4' ? { team: 1, n: 4 } : c.mode === '5' ? { team: 1, n: 5 } : c.mode === '4h' ? { hunt: 1 } : {} }; if (S.h3 && c.role !== 'hunter') S.h3.kind = c.kind; const cards = TUT.cards(S); TUT.showCards(cards); return cards.length; }, { c, rules });
      assert.equal(S, 3, 'three cards');
      for (let i = 0; i < 3; i++) {
        const m = await p.evaluate(async () => {
          const box = document.getElementById('tutImg'), im = box.querySelector('img'); if (im && !im.complete) await new Promise(r => { im.onload = im.onerror = r; });
          const dots = [...document.querySelectorAll('#tutDots span')], on = dots.filter(d => d.classList.contains('on')), off = dots.filter(d => !d.classList.contains('on'));
          const bg = e => getComputedStyle(e).backgroundColor, r = box.getBoundingClientRect();
          return { img: im ? im.getAttribute('src') : null, ok: im ? im.naturalWidth > 0 : false, art: box.classList.contains('art'), animal: im ? (im.className.match(/aimg-(\w+)/) || [])[1] : null, h: r.height, dots: dots.length, on: on.length, aria: document.querySelectorAll('#tutDots [aria-current]').length, onBg: on[0] && bg(on[0]), offBg: off[0] && bg(off[0]), onW: on[0] && on[0].getBoundingClientRect().width, offW: off[0] && off[0].getBoundingClientRect().width };
        });
        const at = `${theme} ${c.role}/${c.kind} mode ${c.mode} card ${i + 1}`;
        assert.ok(m.ok, `${at}: the picture loads (${m.img})`); assert.ok(m.h > 100, `${at}: the picture box is not empty`);
        assert.equal(m.dots, 3, at + ': three dots'); assert.equal(m.on, 1, at + ': exactly one dot is current'); assert.equal(m.aria, 1, at + ': the current dot is marked for screen readers');
        assert.notEqual(m.onBg, m.offBg, `${at}: the current dot is filled differently (${m.onBg} vs ${m.offBg})`); assert.ok(m.onW > m.offW, at + ': the current dot is longer');
        assert.notEqual(m.onBg, 'rgba(0, 0, 0, 0)', at + ': the current dot has a fill');
        if (i === 0 || theme !== 'bw') assert.ok(m.art && m.animal === c.animal, `${at}: shows the ${c.animal} drawing (got ${m.animal})`);
        else assert.ok(/^\/tut\/start\/\w+\.png$/.test(m.img), at + ': a real board picture (' + m.img + ')');
        if (i < 2) await p.evaluate(() => document.getElementById('tutNext').click());
      }
    }
  }
  console.log('ok every role x mode x look: 3 cards with pictures, one current dot');
  assert.equal(errs.length, 0, errs.join('\n')); await b.close(); console.log('PASS e2e-start-cards'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
