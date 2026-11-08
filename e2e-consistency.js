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
    await P.addInitScript(() => { localStorage.setItem('bo_card_off','1'); localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.removeItem('bo_cs_red'); localStorage.removeItem('bo_cs_blue'); });
    P.on('pageerror', e => errs.push(e.message));
    await P.goto('http://localhost:3992/?theme=' + theme);
    if (kind === 'pass') { await P.click('#playPass'); await P.click('#passGo'); await P.click('#hGo'); }
    else { await P.click('#playSolo'); await P.click('[data-bots="1"]'); await P.click('#soloGo'); await P.click(kind === 'ai-red' ? '[data-role="red"]' : '[data-role="blue"]'); await P.click('#startGame'); } // a solo Start needs a picked animal (T7)
    const cells = P.locator('#board .cell'); let lastTurn = null;
    const progress = () => P.evaluate(() => { const S = UI._S(); return JSON.stringify([S.turn, S.round, S.phase, S.ostrich, S.vulture, S.stones, S.sitRun, S.carried, S.lastAction, S.eggs, S.marks]); });
    // The hints a player can legitimately see at the start of a turn (wording from public/ui.js render()), by what the turn is.
    const hintOk = st => {
      const h = st.hint;
      if (st.role === 'red') {
        if (st.spotted && st.stones > 0) return /Throw on your own square\./.test(h);
        if (st.stones < 1) return /No stone\. Go to rocks\./.test(h) || /Found it\. Get a stone first\./.test(h);
        if (st.btns.some(x => x.pressed && /Throw/.test(x.t))) return /Tap to throw\./.test(h);
        return /Your turn\. Tap to fly\./.test(h);
      }
      return /Tap to move|Pick where the egg goes|Kick it away|Your turn|Hide your eggs|Pick your start/i.test(h);
    };
    for (let turn = 0; turn < 400; turn++) {
      await P.waitForFunction(() => { const S = UI._S(); return S && (S.phase === 'over' || ((S.myTurn || S.phase.startsWith('setup') && S.role === 'blue') && !UI._locked() && document.getElementById('handoff').classList.contains('hidden'))) || !document.getElementById('handoff').classList.contains('hidden'); }, null, { timeout: 15000 });
      if (!(await P.locator('#handoff.hidden').count())) { await P.click('#hGo'); continue; }
      const st = await P.evaluate(() => { const S = UI._S(); return { phase: S.phase, role: S.role, legal: UI._legal(), hint: document.getElementById('hint').textContent,
        turn: S.turn, round: S.round, myTurn: S.myTurn, stones: S.stones, mustLeave: !!S.mustLeave, onEgg: !!S.onEgg,
        spotted: !!(S.role === 'red' && S.vulture && S.marks && S.marks[S.vulture[0] + ',' + S.vulture[1]] === 'spotted'),
        n: { fly: (S.fly || []).length, throw: (S.throw || []).length, moves: (S.moves || []).length, carry: (S.carryMoves || []).length, hmoves: (S.hmoves || []).length },
        dom: [...document.querySelectorAll('#board .cell')].map((e, i) => e.classList.contains('legal') ? i : -1).filter(i => i >= 0),
        bad: [...document.querySelectorAll('#actions button')].filter(x => x.disabled && (x.matches('.on,.pulse,.spot') || getComputedStyle(x).animationName !== 'none')).map(x => x.textContent),
        btns: [...document.querySelectorAll('#actions button')].map(x => ({ t: x.textContent, dis: x.disabled, on: x.classList.contains('on'), pressed: x.getAttribute('aria-pressed') === 'true' })), cols: S.cfg.cols }; });
      if (st.phase === 'over') break;
      checks++;
      // everything a future failure needs to explain itself
      const dump = `${kind} ${theme} turn#${turn}: ` + JSON.stringify({ phase: st.phase, role: st.role, turn: st.turn, myTurn: st.myTurn, round: st.round, stones: st.stones, mustLeave: st.mustLeave, targets: st.legal.length, lens: st.n, buttons: st.btns.map(x => x.t + (x.pressed ? ' [pressed]' : '') + (x.dis ? ' [disabled]' : '')), hint: st.hint });
      // A turn starts in the default mode (Fly for the vulture, Walk for the ostrich): the mode a player picked last turn must not carry over.
      // Only checked when the previous loop pass really ended the turn.
      if (st.phase === 'play' && lastTurn && lastTurn !== st.turn + '|' + st.round) {
        const pressed = st.btns.filter(x => x.pressed).map(x => x.t);
        assert.ok(pressed.length === 1 && /^(✓ )?(Fly|Walk)$/.test(pressed[0]), 'a new turn starts in the default mode, got ' + JSON.stringify(pressed) + ' | ' + dump);
      }
      lastTurn = st.turn + '|' + st.round;
      const want = st.legal.map(p => p[1] * st.cols + p[0]).sort((a, b) => a - b);
      assert.deepEqual(st.dom.sort((a, b) => a - b), want, `${theme} glowing squares == legal (${st.role} ${st.phase})`);
      assert.ok(st.legal.length > 0, 'a turn always has targets | ' + dump);
      // The hint tells the player what to do this turn: glowing squares, a stone-less vulture's rock pile, a found egg to smash, or an ostrich that must step off.
      assert.ok(hintOk(st), `${theme} hint says what to do this turn: "${st.hint}" | ` + dump);
      assert.deepEqual(st.bad, [], 'no highlighted/pulsing disabled control');
      if (st.phase === 'play') {
        assert.equal(st.btns.filter(x => x.on || x.pressed).length, 1, 'exactly one mode is selected (a selected + Carry is disabled and marked only by aria-pressed): ' + JSON.stringify(st.btns));
        // every enabled mode button does something visible
        for (const bt of st.btns.filter(x => !x.dis && !/Sit/.test(x.t))) {
          // a selected + Carry button is disabled, so it has no 'on' class; aria-pressed marks every selected mode
          const i = st.btns.indexOf(bt); if (await P.locator('#actions button').nth(i).isDisabled()) continue; // an earlier click (+ Carry) can disable a later button (Kick)
          await P.locator('#actions button').nth(i).click({ force: true });
          const after = await P.evaluate(() => ({ on: [...document.querySelectorAll('#actions button')].findIndex(x => x.getAttribute('aria-pressed') === 'true'), n: document.querySelectorAll('.cell.legal').length, hint: document.getElementById('hint').textContent }));
          assert.equal(after.on, i, 'tapped mode becomes selected'); assert.ok(after.n > 0 && /Tap to move|Tap to fly|Tap to throw|Pick where the egg goes|Kick it away|Your turn|No stone\. Go to rocks|Found it\. Get a stone first|Throw on your own square/.test(after.hint), 'mode shows targets + hint: ' + after.hint); // a found egg under the vulture swaps in the smash hints; throw mode names its targets "red-orange squares", not "glowing"; this wording dates from 3eb803b
        }
      }
      // tap a non-glowing square: explained locally, no server error. "Non-glowing" means legal in NO mode for this player,
      // so the tap can never perform a move (a fly square tapped in Throw mode is still a move once the mode changes).
      const cur = await P.evaluate(() => { const S = UI._S(), at = a => (a || []).map(p => p[1] * S.cfg.cols + p[0]);
        return [...new Set([...UI._legal().map(p => p[1] * S.cfg.cols + p[0]), ...at(S.fly), ...at(S.throw), ...at(S.moves), ...at(S.carryMoves), ...at(S.hmoves)])]; });
      const off = [...Array(63).keys()].filter(i => !cur.includes(i));
      if (off.length) { await cells.nth(off[rnd(off.length)]).click({ force: true }); await P.waitForTimeout(30);
        assert.ok(!/Not a legal/.test(await P.textContent('#log')), 'non-glowing tap never hits server');
        assert.ok((await P.textContent('#hint')).length > 5, 'explained');
        const still = await P.evaluate(() => { const S = UI._S(); return { turn: S.turn, round: S.round, myTurn: S.myTurn, last: JSON.stringify(S.lastAction) }; });
        assert.ok(still.myTurn === st.myTurn && still.turn === st.turn && still.round === st.round, 'a tap on a non-glowing square never plays a move or ends the turn: ' + JSON.stringify(still) + ' | ' + dump); }
      // act: sometimes Sit, else random glowing square in current mode
      const before = await progress();
      const sit = await P.locator('#actions button:has-text("Sit"):not([disabled])');
      if (await sit.count() && rnd(3) === 0) await sit.click({ force: true });
      else {
        const L = await P.evaluate(() => { const S = UI._S(); return (S.myTurn || S.phase.startsWith('setup') && S.role === 'blue') ? UI._legal().map(p => p[1] * S.cfg.cols + p[0]) : []; });
        if (!L.length) continue; // no longer this player's turn: loop again, the wait at the top handles it
        const target = cells.nth(L[rnd(L.length)]); await target.click({ force: true });
        if (await P.evaluate(() => UI._mode && UI._mode() === 'kick')) { await P.waitForTimeout(80); await target.click({ force: true }); } // a kick is two taps: pick the animal, tap it again
      }
      // Wait for the server's answer, so the next pass never reads the old turn (the stale state still said myTurn, with Throw left selected).
      // The pass-and-play cover also counts: the handoff screen shows once the move was played.
      await P.waitForFunction(b => { const S = UI._S(); return !document.getElementById('handoff').classList.contains('hidden') || JSON.stringify([S.turn, S.round, S.phase, S.ostrich, S.vulture, S.stones, S.sitRun, S.carried, S.lastAction, S.eggs, S.marks]) !== b; }, before, { timeout: 10000 })
        .catch(() => { throw new Error('the move was never answered | ' + dump); });
      assert.ok(!/Not a legal/.test(await P.textContent('#log')), 'legal tap accepted');
    }
    await P.waitForSelector('#over:not(.hidden)', { timeout: 20000 }); await c.close();
  }
  const kinds = ['pass', 'ai-red', 'ai-blue'];
  for (let i = 0; i < T.length; i++) { const k = kinds[i % 3]; await game(k, T[i]); console.log('ok', k, T[i]); }
  console.log('checks', checks, 'errors', errs); assert.equal(errs.length, 0);
  await b.close(); server.close(); console.log('PASS e2e-consistency'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
