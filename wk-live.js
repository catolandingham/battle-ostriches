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
    await A.tap('#playFriend'); await A.tap('#roleBlue');
    await A.waitForSelector('#shareCode:not(:empty)', { timeout: 60000 });
    const code = await A.textContent('#shareCode'); console.log('created room', code);
    await V.goto(U + '?room=' + code);
    await V.waitForSelector('#board .cell', { timeout: 60000 });
    await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'), null, { timeout: 30000 });
    // onboarding: fresh context sees the 3-card intro once (Welcome first); rules page from ? and How to play; coach on first game
    const T = await mk('T'); await T.goto(U); await T.waitForSelector('#tut:not(.hidden)', { timeout: 10000 });
    const dots = await T.locator('#tutDots span').count(); const t1 = await T.textContent('#tutT'); await T.tap('#tutNext'); const t2 = await T.textContent('#tutT');
    await T.tap('#tutSkip'); await T.reload(); await T.waitForTimeout(800); const forced = await T.isVisible('#tut');
    await T.tap('#howBtn'); const rules = await T.isVisible('#rules'); await T.evaluate(() => document.getElementById('rules').classList.add('hidden'));
    await T.tap('#helpBtn').catch(() => {}); const help = await T.isVisible('#rules');
    if (forced || dots !== 3 || !/welcome/i.test(t1) || !rules) throw new Error('onboarding check failed');
    console.log('PASS onboarding: intro', dots, 'cards (', t1, '→', t2, '); not forced on reload', !forced, '; How to play opens rules', rules, '; ? opens rules', help);
    const snd = await T.evaluate(() => { SFX.names.forEach(n => SFX.play(n)); return { names: SFX.names.length, muted: SFX.muted }; });
    await T.evaluate(() => document.getElementById('rules').classList.add('hidden')); await T.evaluate(() => SFX.toggle()); await T.reload(); await T.waitForTimeout(500); const mutedAfter = await T.evaluate(() => SFX.muted);
    await T.evaluate(() => SFX.toggle());
    if (!mutedAfter) throw new Error('mute did not persist');
    const coach = await A.evaluate(() => !!document.querySelector('#coach') && !document.getElementById('coach').classList.contains('hidden'));
    const invite = await A.isVisible('#inviteBtn');
    console.log('PASS sound:', snd.names, 'effects played without error; mute persists', mutedAfter, '; first-game coach visible', coach, '; invite icon in header', invite);
    console.log('PASS: join synced; A hint =', await A.textContent('#hint'), '| V hint =', await V.textContent('#hint'));
  } catch (e) { console.log('FAIL', e.message.split('\n')[0]); console.log('lobbyErr:', await A.textContent('#lobbyErr').catch(()=>'')); process.exitCode = 1; }
  console.log(logs.slice(0, 10).join('\n')); await b.close();
})();
