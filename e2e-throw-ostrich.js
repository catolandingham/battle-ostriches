// One tap on a throw square always throws, every square. No second tap and no confirm mark.
process.env.PORT = 3991; process.env.BO_BOTMS = '400'; process.env.BO_NOSTORE = '1'; process.env.BO_H3START = '8,3'; process.env.BO_CLOCKMS = '600000';
const { webkit, devices } = require('playwright-core'); const assert = require('assert');
const server = require('./server.js'), B = require('./game.js');
(async () => {
  const b = await webkit.launch(), errs = [];
  const room = () => [...server.rooms.values()].filter(r => r.g && r.three && r.bots && r.bots.length).pop();
  const ready = P => P.waitForFunction(() => { const S = UI._S(); return S && S.phase === 'play' && S.myTurn && !UI._locked() && !document.getElementById('surprise-go'); }, null, { timeout: 30000 });
  for (const [label, carry, same, emptyOnly] of [['empty square', false, false, true], ['carrying, next to the vulture', true, false, false], ['not carrying, next to the vulture', false, false, false], ['carrying, same square', true, true, false]]) {
    const c = await b.newContext({ ...devices['iPhone 13'] }), P = await c.newPage();
    await P.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '99')); window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    P.on('pageerror', e => errs.push(e.message));
    await P.goto('http://localhost:3991/');
    await P.click('#playSolo'); await P.click('[data-bots="2"]'); await P.click('#soloGo'); await P.click('[data-role="red"]'); await P.click('#startGame');
    await P.waitForSelector('#board .cell'); await ready(P); await P.waitForTimeout(400);
    const R = room(), g = R.g; R.bots = []; clearTimeout(R.aiT);
    const v = g.vulture, adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => [v[0] + d[0], v[1] + d[1]]).find(q => q[0] >= 0 && q[1] >= 0 && q[0] < g.cfg.cols && q[1] < g.cfg.rows && !B.isRock(g, q) && !B.isFood(g, q) && !g.marks[q.join()]);
    const egg = g.eggs.find(e => e.alive); g.ostrich = same ? v.slice() : adj.slice(); g.stones = 1;
    if (carry) { egg.pos = null; g.carrying = egg.id; }
    server.broadcast(R);
    await P.waitForFunction(o => { const S = UI._S(); return S && S.myTurn && S.ostrich && S.ostrich.join() === o && S.stones === 1; }, g.ostrich.join(), { timeout: 8000 });
    await P.waitForTimeout(300);
    const S = await P.evaluate(() => UI._S()), cell = (x, y) => P.locator('#board .cell').nth(y * S.cfg.cols + x);
    await P.click('#actions button:has-text("Throw")', { force: true }); await P.waitForTimeout(200);
    assert.equal(await P.evaluate(() => UI._mode()), 'throw', label + ': Throw chosen');
    const empty = S.throw.find(q => q.join() !== g.ostrich.join() && q.join() !== v.join() && !B.isRock(g, q) && !B.isFood(g, q));
    const target = emptyOnly ? empty : g.ostrich;
    assert.ok(target, label + ': a legal square');
    await cell(target[0], target[1]).tap(); await P.waitForTimeout(700);
    assert.equal(g.stones, 0, label + ': one tap threw the stone');
    assert.equal(g.lastAction && g.lastAction.type, 'throw', label + ': the throw happened on the server');
    assert.equal(await P.evaluate(() => document.querySelectorAll('#board .cell.confirm').length), 0, label + ': no confirm mark');
    assert.ok(!/Throw anyway/.test(await P.evaluate(() => document.body.innerText)), label + ': no Throw anyway');
    await c.close(); console.log('ok', label);
  }
  assert.equal(errs.length, 0, errs.join('\n'));
  await b.close(); server.close(); console.log('PASS e2e-throw-ostrich'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
