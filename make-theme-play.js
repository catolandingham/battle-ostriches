// Records each reimagined theme in play (both phones) -> shots/themes/<theme>-play.webm/.gif + mid-game screenshots.
const { webkit, devices } = require('playwright-core'); const fs = require('fs'), cp = require('child_process');
process.env.PORT = 3995; const server = require('./server.js'); const O = 'shots/themes/'; fs.mkdirSync(O + 'vid', { recursive: true });
(async () => {
  const b = await webkit.launch(), U = 'http://localhost:3995/';
  for (const theme of process.argv.slice(2).length ? process.argv.slice(2) : ['nature', 'neon']) {
    const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], recordVideo: { dir: O + 'vid', size: { width: 390, height: 664 } } }); const p = await c.newPage();
      await p.addInitScript(t => { ['bo_tut_seen'].forEach(k => localStorage.setItem(k, '1')); localStorage.setItem('bo_cs_blue', '9'); localStorage.setItem('bo_cs_red', '9');
        ['hit','miss','feather','spotted','smell','fake','carry','setdown','fakebtn','vtracks','rocks'].forEach(k => localStorage.setItem('bo_tip_' + k, '1')); localStorage.setItem('bo_theme', t); }, theme); return [c, p]; };
    const [cA, A] = await mk(), [cV, V] = await mk();
    const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x), W = ms => A.waitForTimeout(ms);
    const my = p => p.waitForFunction(() => document.querySelector('#actions.mine'));
    await A.goto(U); await A.click('#mkBlue'); await A.waitForSelector('#shareCode:not(:empty)');
    await V.goto(await A.inputValue('#shareLink')); await V.waitForSelector('#board .cell');
    await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
    for (const [x, y] of [[0, 0], [8, 6], [4, 5], [0, 0]]) { await cell(A, x, y).click(); await W(150); }
    const thr = async (x, y) => { await my(V); await V.click('#actions button:has-text("Throw")', { force: true }); await cell(V, x, y).click(); await W(1100); };
    const fly = async (x, y) => { await my(V); await cell(V, x, y).click(); await W(1100); };
    const st = async (x, y) => { await my(A); await cell(A, x, y).click(); await W(900); };
    const sit = async () => { await my(A); await A.click('#actions button:has-text("Sit")', { force: true }); await W(900); };
    await fly(3, 3); await st(1, 1); await thr(3, 4); await st(0, 0); await fly(4, 4); await sit(); await thr(4, 5);
    await A.screenshot({ path: `${O}${theme}-ostrich.png` }); await V.screenshot({ path: `${O}${theme}-vulture.png` });
    await sit(); await fly(3, 3); await W(600);
    const va = await A.video().path(), vv = await V.video().path(); await cA.close(); await cV.close();
    fs.renameSync(va, `${O}${theme}-play-ostrich.webm`); fs.renameSync(vv, `${O}${theme}-play-vulture.webm`);
    cp.execSync(`ffmpeg -y -loglevel error -i ${O}${theme}-play-ostrich.webm -i ${O}${theme}-play-vulture.webm -filter_complex "[0:v][1:v]hstack,fps=12,scale=520:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse" ${O}${theme}-play.gif`);
    console.log(theme, 'recorded');
  }
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
