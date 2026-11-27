// Takes the pictures on the start-of-game cards (public/tut/start/*.png) from the real game: iPhone 13, B&W look (the default).
// Usage: SCENE=tap,eggs,... node tools/shoot-start-cards.js     (needs ffmpeg; output goes to shots/sc/, copy what you like to public/tut/start/)
// A real game is started through the lobby, then the server room is set directly to the moment the words describe (these are pictures, not tests).
process.env.PORT = process.env.PORT || '3991'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '60000'; process.env.BO_CLOCKMS = '600000'; delete process.env.BO_H3START;
const { webkit, devices } = require('playwright-core'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const server = require('../server.js'); const U = 'http://localhost:' + process.env.PORT + '/';
const RAW = path.join(__dirname, '..', 'shots', 'sc'); fs.mkdirSync(RAW, { recursive: true });
const K = p => p[0] + ',' + p[1];
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => console.log('pageerror', e.message)); return p; };
  const closeCard = async p => { if (await p.locator('#rolecard:not(.hidden)').count()) await p.click('#rolecard').catch(() => {}); };
  const state = p => p.evaluate(() => { const S = UI._S(); return S && { phase: S.phase, myTurn: S.myTurn }; });
  const tapLegal = p => p.evaluate(() => { if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return; const c = document.querySelector('#board .cell.legal'); if (c) c.click(); });
  // play the setup taps until the game is in play
  const toPlay = async p => { for (let i = 0; i < 80; i++) { await closeCard(p); const s = await state(p); if (s && s.phase === 'play') return; await tapLegal(p); await p.waitForTimeout(200); } throw new Error('never reached play'); };
  const solo = async (bots, role) => { const p = await mk(); await p.goto(U); await p.click('#playSolo'); await p.click('[data-bots="' + bots + '"]'); await p.click('#soloGo'); await p.click('[data-role="' + role + '"]'); await p.click('#startGame'); await p.waitForSelector('#board .cell'); await toPlay(p); return p; };
  const room = () => [...server.rooms.values()].pop();
  // set the room, tell everyone, wait until the phone shows it
  const inject = async (pages, fn, want) => {
    const r = room(); fn(r.g, r); server.broadcast(r);
    for (const p of [].concat(pages)) { for (let i = 0; i < 60; i++) { await closeCard(p); const s = await state(p); if (s && (want ? s.phase === want : s.myTurn && s.phase === 'play') && !(await p.evaluate(() => (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) || !!document.getElementById('cutaway') || !!document.getElementById('surprise-go')))) break; await p.waitForTimeout(150); } await p.waitForTimeout(900); await closeCard(p); }
  };
  // The picture: cols x rows squares of the real board around the focus (the YOU tag above a square is kept in), optionally the top bar above it and/or the action buttons below it.
  const crop = async (p, name, o) => {
    o = Object.assign({ cols: 5, rows: 3, focus: null, hud: false, buttons: false, el: null }, o);
    const r = await p.evaluate(o => {
      const bd = document.getElementById('board').getBoundingClientRect(), cs = [...document.querySelectorAll('#board .cell')];
      const el = o.focus && cs.find(c => c.matches(o.focus) || c.querySelector(o.focus)) || cs[Math.floor(cs.length / 2)], c = el.getBoundingClientRect();
      const W = o.cols * c.width + 2, H = o.rows * c.height + 2; let L = c.x + c.width / 2 - W / 2, T = c.y + c.height / 2 - H / 2;
      L = Math.max(bd.x, Math.min(L, bd.right - W)); T = Math.max(bd.y, Math.min(T, bd.bottom - H));
      const tag = T <= bd.y + 1 ? 16 : 0; // the YOU tag of a top-row square sticks out above the board
      const q = id => { const a = document.getElementById(id).getBoundingClientRect(); return a.height > 0 ? { top: a.top - 3, h: a.height + 6 } : null; };
      return { x: L, y: T - tag, w: W, h: H + tag, hud: q('hud'), at: q('actions') };
    }, o);
    const files = [];
    const shot = async (sfx, clip) => { const f = path.join(RAW, name + sfx + '.png'); await p.screenshot({ path: f, clip }); files.push(f); };
    let n = 0; for (const it of (o.els || []).concat(o.hud ? ['#hud'] : [])) { const sel = it.sel || it, e = await p.locator(sel).boundingBox(); if (e && e.height > 0) await shot('-h' + n++, { x: it.x || 0, y: e.y - 3, width: it.w || 390, height: e.height + 6 }); }
    if (o.noBoard) {} else if (o.clip) await shot('-a', { x: 0, y: o.clip[0], width: 390, height: o.clip[1] });
    else await shot('-a', { x: r.x, y: r.y, width: r.w, height: r.h });
    if (!files.length) throw new Error('nothing to shoot');
    if (o.buttons && r.at) await shot('-b', { x: 0, y: r.at.top, width: 390, height: r.at.h });
    const out = path.join(RAW, name + '.png');
    const ins = files.flatMap(f => ['-i', f]), sc = files.map((_, i) => `[${i}]scale=480:-2[s${i}]`).join(';');
    const fc = (files.length > 1 ? sc + ';' + files.map((_, i) => `[s${i}]`).join('') + `vstack=${files.length}` : 'scale=480:-2') + ',split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse';
    execFileSync('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', fc, out]);
    console.log('shot', name, fs.statSync(out).size, 'bytes');
  };
  const team = async mine => {
    const A = await mk(), V = await mk();
    await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
    const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, U.replace(/\/$/, ''));
    await V.goto(link); await V.waitForSelector('#roomLobby'); await A.click('#botPlus'); await A.click('#botPlus');
    await A.waitForSelector('[data-role="ostrich"]'); await A.click('[data-role="ostrich"]'); await V.click('[data-role="vulture"]');
    await A.waitForFunction(() => !document.getElementById('startGame').disabled); await A.click('#startGame');
    await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
    for (let i = 0; i < 120; i++) { await Promise.all([A, V].map(closeCard)); const s = await state(A); if (s && s.phase === 'play') break; await Promise.all([A, V].map(tapLegal)); await A.waitForTimeout(250); }
    return mine === 'ostrich' ? A : V;
  };
  const eggsOf = (g, nest) => g.eggs.filter(e => e.alive && (nest == null || e.nest === nest));
  const S = {
    tap: async () => { const p = await solo(1, 'blue'); await inject(p, g => { g.ostrich = [4, 3]; g.vulture = [8, 0]; g.turn = 'blue'; }); await crop(p, 'tap', { focus: '#current' }); },
    // one egg cold in 1 round, one broken, one fine
    eggs: async () => { const p = await solo(1, 'blue'); await inject(p, g => { g.round = 14; g.ostrich = [3, 3]; g.vulture = [8, 0]; g.turn = 'blue'; g.hungerLeft = 12;
      g.eggs = [{ id: 0, pos: [4, 3], alive: true, lastWarm: 0 }, { id: 1, pos: [5, 3], alive: false, lastWarm: 0 }, { id: 2, pos: [4, 2], alive: true, lastWarm: 13 }]; g.marks = { '5,3': 'hit' }; }); await crop(p, 'eggs', { focus: '#current', cols: 5, rows: 3 }); },
    eat: async () => { const p = await solo(1, 'blue'); await inject(p, g => { g.round = 6; g.ostrich = [1, 1]; g.vulture = [8, 3]; g.hungerLeft = 2; g.turn = 'blue';
      g.eggs = [{ id: 0, pos: [5, 3], alive: true, lastWarm: 5 }, { id: 1, pos: [6, 4], alive: true, lastWarm: 5 }, { id: 2, pos: [5, 5], alive: true, lastWarm: 5 }]; }); await crop(p, 'eat', { focus: '#current', cols: 4, rows: 3, hud: true }); },
    catch: async () => { const p = await solo(2, 'blue'); await inject(p, g => { g.round = 4; g.ostrich = [4, 3]; g.vulture = [1, 5]; g.three.h = [5, 3]; g.three.sense = true; g.turn = 'blue'; }); await crop(p, 'catch', { focus: '#current' }); },
    // a bird that is out: the vulture's own view after the hyena caught it twice
    knockout: async () => { const p = await solo(2, 'blue'); await inject(p, g => { g.round = 6; g.ostrich = [4, 3]; g.vulture = [3, 3]; g.three.h = [6, 3]; g.three.birds.blue = { out: true, catches: 2, skip: 0, why: 'caught' }; g.turn = 'red'; }, 'play'); await crop(p, 'knockout', { els: [{ sel: '#h3bar', x: 70, w: 250 }], noBoard: true }); },
    boost: async () => { const p = await solo(2, 'hyena'); await inject(p, g => { g.round = 6; g.ostrich = [1, 5]; g.vulture = [8, 5]; g.three.h = [4, 3]; g.three.birds.red = { out: true, catches: 2, skip: 0, why: 'caught' }; g.turn = 'hunter'; g.three.pounce = false; g.three.sense = false; g.three.senseSeq++; g.three.senseAt = [4, 3]; }); console.log('boost lit', await p.evaluate(() => document.querySelectorAll('#board .cell.legal').length)); await crop(p, 'boost', { focus: '#current', cols: 9, rows: 5 }); },
    pounce: async () => { const p = await solo(2, 'hyena'); await inject(p, g => { g.round = 6; g.ostrich = [1, 5]; g.vulture = [8, 5]; g.three.h = [4, 3]; g.turn = 'hunter'; g.ostrich = [6, 3]; g.three.sense = true; g.three.senseSeq++; g.three.senseAt = [4, 3]; g.three.pounce = true; }); console.log('pounce lit', await p.evaluate(() => document.querySelectorAll('#board .cell.legal').length)); await crop(p, 'pounce', { focus: '#current', cols: 5, rows: 3, buttons: true }); },
    burrow: async () => { const p = await solo(2, 'badger'); await inject(p, g => { g.round = 4; g.ostrich = [1, 5]; g.vulture = [8, 5]; g.three.h = [4, 3]; g.turn = 'hunter'; g.three.sense = false; g.three.senseSeq++; g.three.senseAt = [4, 3]; }); await crop(p, 'burrow', { focus: '#current', buttons: true }); },
    tie: async () => { const p = await solo(3, 'hyena'); await inject(p, g => { const h = g.hunt; h.birds.red = { out: true, catches: 1, skip: 0, why: 'caught' }; h.birds.blue = { out: true, catches: 1, skip: 0, why: 'caught' }; h.hs.hyena.kos = 1; h.hs.badger.kos = 1; h.hs.hyena.catches = 1; h.hs.badger.catches = 1; g.phase = 'over'; g.winner = 'none'; g.winBy = 'both'; h.final = true; g.endWhy = 'Both birds are out. The hunters tie: you have the same number of knock-outs, and the same number of catches.'; }, 'over'); await p.waitForTimeout(3500); console.log(await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /tie/i.test(e.textContent) && e.children.length < 3 && e.getBoundingClientRect().height > 0).map(e => e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().top)).slice(0, 8))); await crop(p, 'tie', { clip: [105, 245] }); },
    warm: async () => { const p = await team('ostrich'); await inject(p, g => { g.round = 4; const e = eggsOf(g, 1)[0]; g.b.o1.pos = e.pos.slice(); g.b.o2.pos = [Math.min(8, e.pos[0] + 2), Math.min(6, e.pos[1] + 2)]; g.turn = 'o1'; }); await crop(p, 'warm', { focus: '#current', cols: 4, rows: 3 }); },
    share: async () => { const p = await team('vulture'); await inject(p, g => { g.round = 4; const e = eggsOf(g, 0)[0]; g.marks[K(e.pos)] = 'spotted'; const [x, y] = e.pos; g.b.v1.pos = [Math.min(8, x + 1), y]; g.b.v2.pos = [Math.max(0, x - 1), y]; g.turn = 'v1'; }); await crop(p, 'share', { focus: '#current', cols: 4, rows: 3 }); },
  };
  for (const k of (process.env.SCENE || '').split(',').filter(Boolean)) { try { await S[k](); } catch (e) { console.log('FAILED', k, e.message.slice(0, 200)); } }
  await b.close(); process.exit(0);
})();
