// Plays every cutaway in the real game (the repo copy) on a 390x844 phone at 3x and records it.
// The page clock is stepped 50 ms at a time so every 20 fps frame is exact.
// Usage (cwd = repo copy): node ../tools/capture.js [scene ...]
const R = process.cwd();
process.env.PORT = process.env.PORT || '4197';
process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000'; process.env.BO_CLOCKMS = '900000';
const path = require('path'), fs = require('fs'), cp = require('child_process');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(R, 'node_modules', '.pw-browsers');
const { webkit } = require(path.join(R, 'node_modules', 'playwright-core'));
const server = require(path.join(R, 'server')), T = require(path.join(R, 'three')), H = require(path.join(R, 'hunt')), B = require(path.join(R, 'game'));
const OUT = '/workspace/bw/scenes/rebuild/captures', FR = '/workspace/bw/scenes/rebuild/capframes';
const ONLY = process.argv.slice(2);
const U = 'http://localhost:' + process.env.PORT + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NF = 46; // 2.3 s: the card, its slide-out and the board after
(async () => {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_card_off', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_walk_hyena', 'bo_walk_badger', 'bo_tips_off', 'bo_muted']) localStorage.setItem(k, '1'); });
  await page.clock.install();
  await page.goto(U);
  const settle = async () => { await page.waitForFunction(() => !document.querySelector('#cutaway,#boardhold,.push-motion'), null, { timeout: 8000 }); await sleep(400); };
  const report = {};
  async function record(name, fire) {
    if (ONLY.length && !ONLY.includes(name)) return;
    await settle();
    // wait for every cartoon drawing to be loaded, as it would be after the first seconds of a game
    await page.waitForFunction(() => { const a = window.CUTAWAY_ART; if (!a) return false; return Object.values(a.sprites).every(u => { const i = [...document.images].find(x => x.src.endsWith(u)); return true; }); });
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 200);
    fire(); 
    let n = 0;
    while (!(await page.$('#cutaway'))) { await page.clock.runFor(10); if (++n > 400) throw new Error(name + ': no card'); await sleep(5); }
    const id = await page.getAttribute('#cutaway', 'data-scene');
    if (id !== name) throw new Error('expected ' + name + ' got ' + id);
    const dir = path.join(FR, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    for (let f = 0; f < NF; f++) {
      if (f) await page.clock.runFor(50);
      await page.evaluate(() => { const t = Date.now(); for (const a of document.getAnimations()) { if (a.__born == null) a.__born = t - 0; a.pause(); a.currentTime = t - a.__born; } });
      await page.screenshot({ path: path.join(dir, String(f).padStart(2, '0') + '.png') });
    }
    await page.clock.resume();
    const mp4 = path.join(OUT, name + '.mp4');
    cp.execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '20', '-i', path.join(dir, '%02d.png'), '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', mp4]);
    report[name] = fs.statSync(mp4).size; console.log(name, 'ok', report[name]);
  }
  // ---- Room A: three players, this phone is the ostrich ----
  await page.evaluate(() => UI.open({ t: 'create', three: true, role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }));
  await page.waitForSelector('#board .cell');
  const room = () => [...server.rooms.values()].find(r => r.three);
  for (const p of [[2, 1], [6, 1], [2, 5]]) { if (!B.placeEgg(room().g, p)) throw new Error('egg ' + p); server.broadcast(room()); await sleep(60); }
  if (!T.placeOstrich3(room().g, [4, 4])) throw new Error('start square'); server.broadcast(room()); await sleep(200);
  const g = () => room().g, go = () => server.broadcast(room());
  const fresh = (kind) => { const x = g(); x.marks = {}; x.phase = 'play'; x.winner = null; x.lastKick = null; x.three.kind = kind; x.three.burrowed = false; x.three.pounce = false; x.three.birds.blue.catches = 0; x.three.birds.blue.out = false; };
  const act = (role, m) => () => { if (!server.act3(room(), role, m)) throw new Error('act ' + JSON.stringify(m)); go(); };
  fresh('hyena'); g().turn = 'blue'; g().ostrich = [3, 3]; g().vulture = [8, 6]; g().three.h = [4, 3]; go();
  await record('kick', act('blue', { a: 'kick', p: [4, 3] }));
  fresh('hyena'); g().turn = 'blue'; g().ostrich = [7, 3]; g().vulture = [0, 6]; g().three.h = [8, 3]; go();
  await record('kick-wrap', act('blue', { a: 'kick', p: [8, 3] }));
  fresh('hyena'); g().turn = 'hunter'; g().three.h = [3, 3]; g().ostrich = [4, 3]; g().vulture = [8, 6]; go();
  await record('catch', act('hunter', { a: 'hmove', p: [4, 3] }));
  fresh('hyena'); g().three.birds.blue.catches = 1; g().turn = 'hunter'; g().three.h = [5, 3]; g().ostrich = [6, 3]; g().vulture = [0, 0]; go();
  await record('knockout', act('hunter', { a: 'hmove', p: [6, 3] }));
  fresh('hyena'); g().turn = 'red'; g().vulture = [3, 3]; g().ostrich = [3, 5]; g().three.h = [4, 3]; g().stones = 1; go();
  await record('stone', () => { if (!T.vultureThrow3(g(), [4, 3])) throw new Error('stone'); go(); });
  fresh('hyena'); g().turn = 'blue'; g().ostrich = [3, 3]; g().vulture = [4, 3]; g().three.h = [8, 6]; go();
  await record('kick-vulture', act('blue', { a: 'kick', p: [4, 3] }));
  fresh('badger'); g().turn = 'blue'; g().ostrich = [3, 3]; g().vulture = [8, 6]; g().three.h = [4, 3]; go();
  await record('kick-badger', act('blue', { a: 'kick', p: [4, 3] }));
  fresh('badger'); g().turn = 'hunter'; g().three.h = [3, 3]; g().ostrich = [4, 3]; g().vulture = [8, 6]; go();
  await record('catch-badger-ostrich', act('hunter', { a: 'hmove', p: [4, 3] }));
  fresh('badger'); g().three.birds.blue.catches = 1; g().turn = 'hunter'; g().three.h = [3, 3]; g().ostrich = [4, 3]; g().vulture = [8, 6]; go();
  await record('knockout-badger-ostrich', act('hunter', { a: 'hmove', p: [4, 3] }));
  fresh('badger'); g().turn = 'red'; g().vulture = [3, 3]; g().ostrich = [3, 5]; g().three.h = [4, 3]; g().stones = 1; go();
  await record('stone-badger', () => { if (!T.vultureThrow3(g(), [4, 3])) throw new Error('stone badger'); go(); });
  fresh('hyena'); g().turn = 'red'; g().vulture = [2, 2]; g().ostrich = [6, 5]; g().three.h = [8, 6]; g().stones = 1; go();
  await record('egg-smash', () => { if (!T.vultureThrow3(g(), [2, 1]) || g().lastAction.result !== 'hit') throw new Error('egg smash'); go(); });
  // ---- Hunters rooms ----
  async function huntRoom(role) {
    for (const r of [...server.rooms.values()]) if (r.hunt) server.rooms.delete(r.code);
    const bots = ['blue', 'red', 'hyena', 'badger'].filter(x => x !== role);
    await page.clock.resume();
    await page.evaluate(([role, bots]) => UI.open({ t: 'create', hunt: true, role, bots }), [role, bots]);
    await page.waitForSelector('#board .cell');
    await sleep(300);
    const hr = [...server.rooms.values()].find(r => r.hunt), hg = hr.g;
    let ne = 0; for (const p of [[2, 1], [6, 1], [2, 5], [6, 5], [1, 3], [7, 3], [3, 0]]) { if (ne < 3 && B.placeEgg(hg, p)) { ne++; server.broadcast(hr); await sleep(60); } } console.log('hunt phase', hg.phase, hg.eggs.length);
    if (hg.phase === 'setupOstrich' && !H.placeOstrichH(hg, [4, 4])) throw new Error('hunt start'); server.broadcast(hr); await sleep(200);
    hg.phase = 'play'; return hr;
  }
  let hr = await huntRoom('red'); let hg = hr.g; const hgo = () => server.broadcast(hr);
  const hfresh = () => { hg.marks = {}; hg.phase = 'play'; hg.winner = null; for (const b of ['blue', 'red']) { hg.hunt.birds[b].catches = 0; hg.hunt.birds[b].out = false; } for (const h of ['hyena', 'badger']) { hg.hunt.hs[h].pounce = false; hg.hunt.hs[h].burrowed = false; } };
  const hmove = p => () => { if (!H.hunterMove(hg, p)) throw new Error('hmove ' + p); hgo(); };
  hfresh(); hg.turn = 'hyena'; hg.hunt.hs.hyena.p = [3, 3]; hg.hunt.hs.badger.p = [0, 6]; hg.vulture = [4, 3]; hg.ostrich = [8, 6]; hgo();
  await record('catch-hyena-vulture', hmove([4, 3]));
  hfresh(); hg.hunt.birds.red.catches = 1; hg.turn = 'hyena'; hg.hunt.hs.hyena.p = [3, 3]; hg.hunt.hs.badger.p = [8, 6]; hg.vulture = [4, 3]; hg.ostrich = [0, 0]; hgo();
  await record('knockout-hyena-vulture', hmove([4, 3]));
  hfresh(); hg.turn = 'badger'; hg.hunt.hs.badger.p = [3, 3]; hg.hunt.hs.hyena.p = [8, 6]; hg.vulture = [4, 3]; hg.ostrich = [0, 0]; hgo();
  await record('catch-badger-vulture', hmove([4, 3]));
  hfresh(); hg.hunt.birds.red.catches = 1; hg.turn = 'badger'; hg.hunt.hs.badger.p = [3, 3]; hg.hunt.hs.hyena.p = [8, 0]; hg.vulture = [4, 3]; hg.ostrich = [0, 6]; hgo();
  await record('knockout-badger-vulture', hmove([4, 3]));
  hr = await huntRoom('hyena'); hg = hr.g;
  hfresh(); hg.turn = 'badger'; hg.hunt.hs.badger.p = [4, 3]; hg.hunt.hs.badger.burrowed = true; hg.hunt.hs.hyena.p = [4, 3]; hg.hunt.hs.hyena.came = { to: [4, 3], dir: [1, 0] }; hg.ostrich = [0, 0]; hg.vulture = [0, 6]; hgo();
  await record('burst', () => { if (!H.hunterBurst(hg)) throw new Error('burst'); hgo(); });
  hfresh(); hg.turn = 'badger'; hg.hunt.hs.badger.p = [3, 3]; hg.hunt.hs.hyena.p = [4, 3]; hg.ostrich = [0, 0]; hg.vulture = [0, 6]; hgo();
  await record('shove-badger-hyena', hmove([4, 3]));
  hfresh(); hg.turn = 'hyena'; hg.hunt.hs.hyena.p = [3, 3]; hg.hunt.hs.badger.p = [4, 3]; hg.ostrich = [0, 0]; hg.vulture = [0, 6]; hgo();
  await record('shove-hyena-badger', hmove([4, 3]));
  console.log('errors', JSON.stringify(errors));
  const cj = path.join(OUT, 'captures.json'); let old = {}; try { old = JSON.parse(fs.readFileSync(cj, 'utf8')); } catch (e) {}
  fs.writeFileSync(cj, JSON.stringify(Object.assign(old, report), null, 1));
  await context.close(); await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
