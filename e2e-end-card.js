// The end card covers the whole board and the theme animal layer (no leaf, rock, egg or animal sprite paints above it), in every theme.
// Two humans in a friends game; the game is ended from the server, then every theme is checked on both phones: at many points over the card
// (text, buttons, empty space) the top-most thing must be inside #over, and every board icon and #fx sprite must sit below the card in paint order.
process.env.PORT = 3993; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '600000'; process.env.BO_CLOCKMS = '600000';
const { webkit, devices } = require('playwright-core');
const assert = require('assert');
const server = require('./server.js');
const U = 'http://localhost:3993/', THEMES = ['bw', 'classic', 'comic', 'nature', 'neon'];
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }), p = await c.newPage();
    await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_tips_off', 'bo_card_off', 'bo_muted']) localStorage.setItem(k, '1'); localStorage.setItem('bo_bw_default', '1'); localStorage.setItem('bo_theme', 'classic'); }); return p; };
  const A = await mk(), V = await mk();
  await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
  await V.goto((await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://localhost:3993')); await V.waitForSelector('#roomLobby');
  await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [6, 2], [2, 1], [3, 4]]) { await A.locator('#board .cell').nth(y * 9 + x).click(); await A.waitForTimeout(120); }
  const room = [...server.rooms.values()].find(r => r.g && !r.three && !r.hunt && !r.team && !r.ai), g = room.g;
  g.phase = 'over'; g.winner = 'red'; g.winBy = 'cold'; server.broadcast(room);
  for (const p of [A, V]) { await p.waitForSelector('#over:not(.hidden) h1', { timeout: 15000 }); }
  await A.waitForTimeout(1500);
  let checks = 0;
  for (const p of [A, V]) for (const th of THEMES) {
    await p.evaluate(t => THEME.set(t), th); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const over = document.getElementById('over'), box = over.getBoundingClientRect(), bad = [];
      // 1) the top-most thing at a grid of points over the whole card is the card or something in it (pointer-events:none sprites are skipped by elementFromPoint, so also check paint order below)
      for (let x = 10; x < box.width; x += 40) for (let y = 10; y < box.height; y += 40) { const e = document.elementFromPoint(x, y); if (!e || !over.contains(e)) bad.push('point ' + x + ',' + y + ' ' + (e && e.tagName + '.' + e.className)); }
      // 2) every board icon and #fx sprite is painted below the card: its stacking root is under the card's z-index
      const cz = +getComputedStyle(over).zIndex, items = [...document.querySelectorAll('#board .ic, #board .cmark, #board .pc, #fx > *')];
      for (const e of items) { let n = e, z = 0; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.zIndex !== 'auto' && cs.position !== 'static') { z = +cs.zIndex; if (n.parentElement === document.body || n.id === 'fx') break; } n = n.parentElement; } if (z >= cz) bad.push('paints above card: ' + e.tagName + '.' + String(e.className.baseVal ?? e.className) + ' z=' + z); }
      return { bad: bad.slice(0, 8), cz, n: items.length };
    });
    assert.deepEqual(r.bad, [], (p === A ? 'ostrich ' : 'vulture ') + th + ' ' + JSON.stringify(r));
    assert.ok(r.cz > 47, 'card z-index above the board icons');
    checks++;
  }
  // a menu opened over the end card must still be above it
  await V.evaluate(() => THEME.set('classic'));
  const menuZ = await V.evaluate(() => { const m = document.getElementById('gameMenu'); return m ? +getComputedStyle(m).zIndex : 80; });
  assert.ok(menuZ > 52, 'the game menu stays above the end card');
  console.log('PASS end card covers the board in ' + checks + ' theme/phone checks');
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
