// Pass & play on current main: the ostrich carries an egg into the vulture's vicinity, then leaves.
// The stored clue stays on the board as green squares, and is not spoken again as a live banner.
const { webkit, chromium, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs');
process.env.PORT = process.env.PORT || 3994;
process.env.BO_NOSTORE = '1';
const server = require('./server.js');
const OUT = require('path').join(__dirname, 'shots', 'e2e');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
(async () => {
  let b, kind = 'webkit';
  try { b = await webkit.launch(); }
  catch (e) { kind = 'chrome'; b = await chromium.launch({ channel: 'chrome' }); }
  const errs = [];
  const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
  await P.addInitScript(() => { localStorage.setItem('bo_card_off','1'); localStorage.setItem('bo_hs_off', '1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue', '1'); localStorage.setItem('bo_walk_red', '1'); localStorage.setItem('bo_tips_off', '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); });
  P.on('pageerror', e => errs.push(e.message));
  const cell = async (x, y) => { await P.evaluate(([x, y]) => { const S = UI._S(), i = y * S.cfg.cols + x; document.querySelectorAll('#board .cell')[i].click(); }, [x, y]); };
  const said = async () => ({ banner: (await P.textContent('#banner')) || '', pop: (await P.locator('#snpop').count()) ? await P.textContent('#snpop') : '', hint: (await P.textContent('#hint')) || '', maybe: await P.locator('#board .cmark.cm-egg').count() }); // the last clue is a small egg outline in the corner of the sniffed squares
  const go = async role => { await P.waitForSelector('#handoff.' + role); await P.click('#hGo'); await P.waitForSelector('#board .cell'); };
  await P.goto('http://localhost:' + process.env.PORT + '/');
  await P.click('#playPass'); await P.click('#passGo');
  await go('blue');
  for (const [x, y] of [[7, 3], [2, 5], [3, 5], [7, 3]]) { await cell(x, y); await P.waitForTimeout(40); }
  await go('red');
  await cell(5, 3); // perch, egg still 2 away
  await P.waitForSelector('#snpop');
  let m = await said();
  assert.equal(m.banner, 'No egg nearby', 'first perch is a live no');
  const carry = async () => { await P.evaluate(() => { const b = [...document.querySelectorAll('#actions button')].find(x => /Carry/.test(x.textContent)); if (!b) throw new Error('no carry button: ' + document.getElementById('actions').textContent); b.click(); }); };
  await go('blue');
  await carry();
  await cell(6, 3); // carry the egg into the vulture's vicinity
  await go('red');
  await P.waitForTimeout(250);
  m = await said();
  assert.ok(!/Egg nearby|No egg nearby/.test(m.banner + m.pop), 'old no is not spoken after the egg arrives: ' + JSON.stringify(m));
  await cell(6, 4); // land beside the egg: live yes
  await P.waitForSelector('#snpop');
  m = await said();
  assert.equal(m.banner, 'Egg nearby!', 'current egg is still announced');
  await go('blue');
  await carry();
  await cell(7, 2); // bird leaves; the sniffed square is empty
  await go('red');
  await P.waitForTimeout(300);
  m = await said();
  assert.ok(!/Egg nearby/.test(m.banner + m.pop + m.hint), 'stored yes is not spoken live: ' + JSON.stringify(m));
  assert.ok(m.maybe > 0, 'the last clue outline stays');
  assert.equal(await P.evaluate(() => document.body.className), 'red');
  await P.screenshot({ path: OUT + '/stale-clue-later-arrival.png', type: 'png' });
  await cell(5, 4); // later arrival on an empty square
  await P.waitForSelector('#snpop');
  m = await said();
  assert.equal(m.banner, 'No egg nearby', 'empty square gets its own live no');
  assert.equal(m.pop, 'No egg nearby');
  console.log('browser', kind, 'errors', errs);
  assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-sniff'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
