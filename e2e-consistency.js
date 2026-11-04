// State-consistency walker (WebKit iPhone 13): random pass & play and vs-computer games with coach marks ON.
// At every turn: glowing squares == legal moves, hint matches, highlighted/pulsing controls are enabled and do something,
// taps on non-glowing squares are explained locally and never reach the server as an illegal move.
const { webkit, devices } = require('playwright-core'); const assert = require('assert');
process.env.PORT = 3992; const server = require('./server.js');
const T = ['classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
let seed = 7; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
(async () => { const b = await webkit.launch(), errs = []; let checks = 0;
  async function game(kind, theme) {
    const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
    await P.addInitScript(() => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.removeItem('bo_cs_red'); localStorage.removeItem('bo_cs_blue'); });
    P.on('pageerror', e => errs.push(e.message));
    await P.goto('http://localhost:3992/?theme=' + theme);
    if (kind === 'pass') { await P.click('#playFriend'); await P.click('#playPass'); await P.click('#hGo'); }
    else { await P.click('#playAI'); await P.click(kind === 'ai-red' ? '#roleRed' : '#roleBlue'); }
    const cells = P.locator('#board .cell');
    for (let turn = 0; turn < 400; turn++) {
      await P.waitForFunction(() => { const S = UI._S(); return S && (S.phase === 'over' || ((S.myTurn || S.phase.startsWith('setup') && S.role === 'blue') && !UI._locked() && document.getElementById('handoff').classList.contains('hidden'))) || !document.getElementById('handoff').classList.contains('hidden'); }, null, { timeout: 15000 });
      if (!(await P.locator('#handoff.hidden').count())) { await P.click('#hGo'); continue; }
      const st = await P.evaluate(() => { const S = UI._S(); return { phase: S.phase, role: S.role, legal: UI._legal(), hint: document.getElementById('hint').textContent,
        dom: [...document.querySelectorAll('#board .cell')].map((e, i) => e.classList.contains('legal') ? i : -1).filter(i => i >= 0),
        bad: [...document.querySelectorAll('#actions button')].filter(x => x.disabled && (x.matches('.on,.pulse,.spot') || getComputedStyle(x).animationName !== 'none')).map(x => x.textContent),
        btns: [...document.querySelectorAll('#actions button')].map(x => ({ t: x.textContent, dis: x.disabled, on: x.classList.contains('on') })), cols: S.cfg.cols }; });
      if (st.phase === 'over') break;
      checks++;
      const want = st.legal.map(p => p[1] * st.cols + p[0]).sort((a, b) => a - b);
      assert.deepEqual(st.dom.sort((a, b) => a - b), want, `${theme} glowing squares == legal (${st.role} ${st.phase})`);
      assert.ok(st.legal.length > 0, 'a turn always has targets');
      assert.ok(/glowing square/i.test(st.hint), `${theme} hint names the glowing squares: "${st.hint}"`);
      assert.deepEqual(st.bad, [], 'no highlighted/pulsing disabled control');
      if (st.phase === 'play') {
        assert.equal(st.btns.filter(x => x.on).length, 1, 'exactly one mode is selected: ' + JSON.stringify(st.btns));
        // every enabled mode button does something visible
        for (const bt of st.btns.filter(x => !x.dis && !/Sit/.test(x.t))) {
          const i = st.btns.indexOf(bt); await P.locator('#actions button').nth(i).click({ force: true });
          const after = await P.evaluate(() => ({ on: [...document.querySelectorAll('#actions button')].findIndex(x => x.classList.contains('on')), n: document.querySelectorAll('.cell.legal').length, hint: document.getElementById('hint').textContent }));
          assert.equal(after.on, i, 'tapped mode becomes selected'); assert.ok(after.n > 0 && /glowing/.test(after.hint), 'mode shows targets + hint');
        }
      }
      // tap a non-glowing square: explained locally, no server error
      const cur = await P.evaluate(() => { const S = UI._S(); return UI._legal().map(p => p[1] * S.cfg.cols + p[0]); });
      const off = [...Array(63).keys()].filter(i => !cur.includes(i));
      if (off.length) { await cells.nth(off[rnd(off.length)]).click({ force: true }); await P.waitForTimeout(30);
        assert.ok(!/Not a legal/.test(await P.textContent('#log')), 'non-glowing tap never hits server');
        assert.ok((await P.textContent('#hint')).length > 5, 'explained'); }
      // act: sometimes Sit, else random glowing square in current mode
      const sit = await P.locator('#actions button:has-text("Sit"):not([disabled])');
      if (await sit.count() && rnd(3) === 0) await sit.click({ force: true });
      else { const L = await P.evaluate(() => { const S = UI._S(); return UI._legal().map(p => p[1] * S.cfg.cols + p[0]); }); await cells.nth(L[rnd(L.length)]).click({ force: true }); }
      await P.waitForTimeout(150);
      assert.ok(!/Not a legal/.test(await P.textContent('#log')), 'legal tap accepted');
    }
    await P.waitForSelector('#over:not(.hidden)', { timeout: 20000 }); await c.close();
  }
  const kinds = ['pass', 'ai-red', 'ai-blue'];
  for (let i = 0; i < T.length; i++) { const k = kinds[i % 3]; await game(k, T[i]); console.log('ok', k, T[i]); }
  console.log('checks', checks, 'errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-consistency'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
