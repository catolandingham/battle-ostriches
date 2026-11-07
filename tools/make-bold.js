// Records the bold themes in play on two WebKit iPhones -> shots/bold/<t>.jpg (ostrich|vulture side-by-side) and public/gallery/<t>.mp4
const { webkit, devices } = require('playwright-core'); const fs = require('fs'), cp = require('child_process');
process.env.PORT = 3994; const server = require('../server.js'); const O = 'shots/bold/', G = 'public/gallery/', TMP = '/tmp/boldvid/';
[O, G, TMP].forEach(d => fs.mkdirSync(d, { recursive: true }));
(async () => {
  const b = await webkit.launch(), U = 'http://localhost:3994/';
  for (const theme of process.argv.slice(2).length ? process.argv.slice(2) : ['storm', 'volcano', 'comic', 'pharaoh']) {
    const t0 = Date.now();
    const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], recordVideo: { dir: TMP, size: { width: 390, height: 664 } } }); const p = await c.newPage();
      await p.addInitScript(t => { localStorage.setItem('bo_hs_off','1'); localStorage.setItem('bo_tut_seen', '1'); localStorage.setItem('bo_walk_blue','1'); localStorage.setItem('bo_walk_red','1'); localStorage.setItem('bo_cs_blue', '9'); localStorage.setItem('bo_cs_red', '9');
        ['hit','miss','feather','spotted','smell','fake','carry','setdown','fakebtn','vtracks','rocks'].forEach(k => localStorage.setItem('bo_tip_' + k, '1')); localStorage.setItem('bo_theme', t); }, theme); return [c, p]; };
    const [cA, A] = await mk(), [cV, V] = await mk();
    const cell = (p, x, y) => p.locator('.cell').nth(y * 9 + x), W = ms => A.waitForTimeout(ms);
    const my = p => p.waitForFunction(() => document.querySelector('#actions.mine'));
    await A.goto(U); await A.click('#playFriend'); await A.click('#twoPhones'); await A.waitForSelector('#shareCode:not(:empty)');
    await V.goto(await A.inputValue('#shareLink')); await V.waitForSelector('#board .cell');
    await A.waitForFunction(() => document.getElementById('wait').classList.contains('hidden'));
    const tStart = (Date.now() - t0) / 1000;
    for (const [x, y] of [[0, 0], [8, 6], [4, 5], [0, 0]]) { await cell(A, x, y).click(); await W(250); }
    const thr = async (x, y, shot) => { await my(V); await V.click('#actions button:has-text("Throw")', { force: true }); await W(250); await cell(V, x, y).click();
      if (shot) { await W(1000); await Promise.all([A.screenshot({ path: TMP + 'a.png' }), V.screenshot({ path: TMP + 'v.png' })]); await W(1200); } else await W(1600); };
    const fly = async (x, y) => { await my(V); await cell(V, x, y).click(); await W(1100); };
    const st = async (x, y) => { await my(A); await cell(A, x, y).click(); await W(900); };
    const sit = async () => { await my(A); await A.click('#actions button:has-text("Sit")', { force: true }); await W(900); };
    await fly(3, 3); await st(1, 1); await thr(3, 4); await st(0, 0); await fly(4, 4); await sit(); await thr(4, 5, true);
    await st(1, 0); await thr(2, 1); await W(800);
    const va = await A.video().path(), vv = await V.video().path(); await cA.close(); await cV.close();
    const ss = Math.max(0, tStart - 0.3).toFixed(2);
    cp.execSync(`ffmpeg -y -loglevel error -ss ${ss} -i ${va} -ss ${ss} -i ${vv} -filter_complex "[0:v][1:v]hstack=inputs=2,pad=iw+0:ih:0:0,fps=30,scale=780:-2" -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.1 -crf 26 -preset slow -an -movflags +faststart ${G}${theme}.mp4`);
    cp.execSync(`ffmpeg -y -loglevel error -i ${TMP}a.png -i ${TMP}v.png -filter_complex "[0:v][1:v]hstack=inputs=2" -q:v 3 ${O}${theme}.jpg`);
    console.log(theme, 'ok', fs.statSync(O + theme + '.jpg').size, fs.statSync(G + theme + '.mp4').size);
  }
  await b.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
