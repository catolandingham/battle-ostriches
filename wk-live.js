// WebKit iPhone test against a URL: create a game in one context, join from another.
const { webkit, devices } = require('playwright-core');
const U = process.argv[2] || 'https://battle-ostriches.onrender.com/';
(async () => {
  const b = await webkit.launch(); const logs = [];
  const mk = async (n) => { const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage(); if (n !== 'T') await p.addInitScript(() => ['seen','blue','red'].forEach(k => localStorage.setItem('bo_tut_' + k, '1')));
    p.on('console', m => logs.push(n + ' console: ' + m.text())); p.on('pageerror', e => logs.push(n + ' pageerror: ' + e.message)); return p; };
  const A = await mk('A'), V = await mk('V');
  try {
    await A.goto(U);
    await A.tap('#mkBlue');
    await A.waitForSelector('#shareCode:not(:empty)', { timeout: 60000 });
    const code = await A.textContent('#shareCode'); console.log('created room', code);
    await V.goto(U + '?room=' + code);
    await V.waitForSelector('#board .cell', { timeout: 60000 });
    await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'), null, { timeout: 30000 });
    // tutorial: fresh context sees it once, can swipe/next/back/skip, replay from buttons
    const T = await mk('T'); await T.goto(U); await T.waitForSelector('#tut:not(.hidden)', { timeout: 10000 });
    const dots = await T.locator('#tutDots span').count(); await T.tap('#tutNext'); const t2 = await T.textContent('#tutT');
    await T.tap('#tutBack'); const t1 = await T.textContent('#tutT');
    const imgOk = await T.evaluate(() => { const i = document.getElementById('tutImg'); return i.complete && i.naturalWidth > 0; });
    await T.tap('#tutSkip'); await T.reload(); await T.waitForTimeout(800); const forced = await T.isVisible('#tut');
    await T.tap('#howBtn'); const all = await T.locator('#tutDots span').count(); await T.tap('#tutSkip');
    await T.tap('#mkRed'); await T.waitForSelector('#tut:not(.hidden)', { timeout: 60000 }); const redSteps = await T.locator('#tutDots span').count(); const redT = await T.textContent('#tutT');
    await T.tap('#tutSkip'); await T.tap('#helpBtn'); const help = await T.isVisible('#tut');
    if (forced || !imgOk || !help || dots < 2) throw new Error('tutorial check failed');
    console.log('PASS tutorial: intro', dots, 'steps (', t1, '→', t2, '), img loaded', imgOk, '; not forced on reload', !forced, '; How to play', all, 'steps; vulture-side on join', redSteps, 'steps starting', JSON.stringify(redT), '; ? help opens', help);
    const snd = await T.evaluate(() => { SFX.names.forEach(n => SFX.play(n)); return { names: SFX.names.length, muted: SFX.muted }; });
    await T.tap('#tutSkip'); await T.tap('#muteBtn'); await T.reload(); await T.waitForTimeout(500); const mutedAfter = await T.evaluate(() => SFX.muted);
    await T.evaluate(() => SFX.toggle());
    const firstCard = await T.evaluate(() => TUT.steps[0].t);
    if (!mutedAfter) throw new Error('mute did not persist');
    console.log('PASS sound:', snd.names, 'effects played without error; mute persists after reload', mutedAfter, '; first tutorial card', JSON.stringify(firstCard));
    console.log('PASS: join synced; A hint =', await A.textContent('#hint'), '| V hint =', await V.textContent('#hint'));
  } catch (e) { console.log('FAIL', e.message.split('\n')[0]); console.log('lobbyErr:', await A.textContent('#lobbyErr').catch(()=>'')); process.exitCode = 1; }
  console.log(logs.slice(0, 10).join('\n')); await b.close();
})();
