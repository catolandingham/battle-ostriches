// Two headless WebKit iPhones play the Balanced rules against the local server, including a stone smash.
// Saves smash frames + GIFs to shots/balanced/.
const { webkit, devices } = require('playwright-core');
const assert = require('assert'), fs = require('fs'), { execSync } = require('child_process');
process.env.PORT = 3999; const server = require('./server.js');
const OUT = 'shots/balanced/'; fs.mkdirSync(OUT + 'frames', { recursive: true });
(async () => {
  const b = await webkit.launch(); const errs = [];
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('bo_tut_seen', '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => errs.push(e.message)); return p; };
  const A = await mk(), V = await mk(); const U = 'http://localhost:3999/';
  const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x);
  await A.goto(U); await A.click('#mkBlue'); await A.waitForSelector('#shareCode:not(:empty)');
  const link = await A.inputValue('#shareLink');
  await V.goto(link.replace(/^http:\/\/[^/]+/, 'http://localhost:3999')); await V.waitForSelector('#board .cell');
  await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
  for (const [x, y] of [[3, 4], [8, 6], [0, 6], [8, 6]]) { await cell(A, x, y).click(); await A.waitForTimeout(100); }
  await V.waitForSelector('#actions.mine');
  assert.equal(await V.locator('.egg').count(), 0, 'vulture sees no eggs');
  assert.ok(/Fly/.test(await V.textContent('#actions')) && /Throw stone/.test(await V.textContent('#actions')), 'text labels');
  assert.equal(await V.locator('#stonesLeft').count(), 0, 'no stone counter');
  await V.screenshot({ path: OUT + '1-vulture-before-throw.png' });
  // THROW at the hidden egg next to the vulture, then film both phones
  await V.click('#actions button:has-text("Throw")'); await cell(V, 3, 4).click();
  const t0 = Date.now(); let i = 0;
  while (Date.now() - t0 < 1900) { await Promise.all([A.screenshot({ path: `${OUT}frames/o${String(i).padStart(3, '0')}.png` }), V.screenshot({ path: `${OUT}frames/v${String(i).padStart(3, '0')}.png` })]); i++; }
  console.log('captured', i, 'frame pairs');
  assert.ok(await A.locator('.cell.hit').count() === 1 && await V.locator('.cell.hit').count() === 1, 'hit mark on both');
  await A.screenshot({ path: OUT + '2-ostrich-after-smash.png' }); await V.screenshot({ path: OUT + '3-vulture-after-smash.png' });
  assert.equal(await A.textContent('#eggsLeft'), '2');
  // ostrich: buttons are text, Carry the egg away
  const acts = await A.textContent('#actions'); assert.ok(/Step/.test(acts) && /Sit/.test(acts) && /Carry egg/.test(acts), acts);
  await A.click('#actions button:has-text("Carry")'); await cell(A, 7, 5).click();
  await V.waitForSelector('#actions.mine');
  assert.ok(await V.locator('.num').count() >= 1, 'vulture sees footprints');
  // vulture misses (thud/dust) on its own square
  await V.click('#actions button:has-text("Throw")'); await cell(V, 4, 3).click();
  await A.waitForTimeout(250); await A.screenshot({ path: OUT + '4-ostrich-sees-miss-in-flight.png' }); await A.waitForTimeout(500); await A.screenshot({ path: OUT + '5-ostrich-sees-miss-dust.png' });
  await A.waitForSelector('#actions.mine'); assert.ok(await A.locator('.cell.miss').count() === 1, 'miss mark');
  assert.ok(await A.locator('.egg').count() === 2, 'carried egg set down');
  // sit 3x then must step off
  for (let k = 0; k < 3; k++) { await A.click('#actions button:has-text("Sit")'); await V.waitForSelector('#actions.mine'); await cell(V, 4, k % 2 ? 3 : 2).click(); await A.waitForSelector('#actions.mine'); }
  assert.ok(await A.locator('#actions button:has-text("Sit")').isDisabled(), 'sit cap'); await A.screenshot({ path: OUT + '6-ostrich-sit-cap.png' });
  assert.ok(await V.locator('.smell').count() >= 2, 'smell history');
  await V.screenshot({ path: OUT + '7-vulture-smell-history.png' });
  await A.reload(); await A.waitForFunction(() => document.querySelectorAll('.egg').length === 2);
  console.log('errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close();
  const mkGif = (pre, name) => execSync(`ffmpeg -y -loglevel error -framerate 12 -i ${OUT}frames/${pre}%03d.png -vf "crop=iw:ih*0.62:0:ih*0.12,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" ${OUT}${name}`);
  mkGif('o', 'smash-ostrich.gif'); mkGif('v', 'smash-vulture.gif');
  console.log('PASS e2e'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
