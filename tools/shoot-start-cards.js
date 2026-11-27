// Takes the pictures on the start-of-game cards (public/tut/start/*.webp) from the real game: iPhone 13, default theme.
// Usage: node tools/shoot-start-cards.js [topic ...]   (needs ffmpeg; SCENE=tap,eggs,... picks scenes)
process.env.PORT = process.env.PORT || '3991'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '60'; process.env.BO_CLOCKMS = '120000'; process.env.BO_H3START = process.env.BO_H3START || '';
if (!process.env.BO_H3START) delete process.env.BO_H3START;
const { webkit, devices } = require('playwright-core'), fs = require('fs'), path = require('path');
const server = require('../server.js'); const U = 'http://localhost:' + process.env.PORT + '/';
const RAW = path.join(__dirname, '..', 'shots', 'sc'); fs.mkdirSync(RAW, { recursive: true });
const want = process.argv.slice(2);
(async () => {
  const b = await webkit.launch();
  const mk = async () => { const c = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 }); const p = await c.newPage(); await p.addInitScript(() => { for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off']) localStorage.setItem(k, '1'); ['blue', 'red'].forEach(r => localStorage.setItem('bo_cs_' + r, '9')); }); p.on('pageerror', e => console.log('pageerror', e.message)); return p; };
  // the picture, cut like the How to play ones (tools/shots-real-play.js howCrop): a few squares of the real B&W board around the moment
  // (focus = selector of the thing to centre on), plus the action buttons underneath when the buttons are the point. Shrunk to a small palette PNG.
  const { execFileSync } = require('child_process');
  const crop = async (p, name, focus, buttons) => {
    const r = await p.evaluate(([f, btn]) => { const bd = document.getElementById('board').getBoundingClientRect(), cs = [...document.querySelectorAll('#board .cell')]; const el = f && cs.find(c => c.matches(f) || c.querySelector(f)) || cs[Math.floor(cs.length / 2)]; const c = el.getBoundingClientRect(); const W = 5 * c.width + 2, H = 3 * c.height + 2; let L = c.x + c.width / 2 - W / 2, T = c.y + c.height / 2 - H / 2; L = Math.max(bd.x, Math.min(L, bd.right - W)); T = Math.max(bd.y, Math.min(T, bd.bottom - H)); const a = document.getElementById('actions').getBoundingClientRect(); return { x: L, y: T, width: W, height: H, at: a.height > 0 ? { top: a.top - 4, h: a.height + 8 } : null }; }, [focus, buttons]);
    const f1 = path.join(RAW, name + '-a.png'), f2 = path.join(RAW, name + '-b.png'), out = path.join(RAW, name + '.png');
    await p.screenshot({ path: f1, clip: { x: r.x, y: r.y, width: r.width, height: r.height } });
    const tail2 = 'split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse', tail = 'scale=480:-2,split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse';
    if (buttons && r.at) { await p.screenshot({ path: f2, clip: { x: 0, y: r.at.top, width: 390, height: r.at.h } }); execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f1, '-i', f2, '-filter_complex', '[0]scale=480:-2[a];[1]scale=480:-2[b];[a][b]vstack,' + tail2, out]); }
    else execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f1, '-filter_complex', tail, out]);
    console.log('shot', name, fs.statSync(out).size, 'bytes', buttons ? (r.at ? 'with buttons' : 'NO BUTTONS') : '');
  };
  const info = p => p.evaluate(() => { const S = UI._S(); return S && { phase: S.phase, role: S.role, round: S.round, myTurn: S.myTurn, acts: [...document.querySelectorAll('#actions button')].map(x => x.innerText.trim()), hint: document.getElementById('hint').innerText, keys: Object.keys(S) }; });
  const closeCard = async p => { if (await p.locator('#rolecard:not(.hidden)').count()) await p.click('#rolecard').catch(() => {}); };
  // one step: place an egg or take a legal square
  const step = async p => p.evaluate(() => { const S = UI._S(); if (!S) return 'none'; if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return 'busy'; if (document.getElementById('cutaway') || document.getElementById('surprise-go')) return 'busy'; const c = document.querySelector('#board .cell.legal'); if (!c) return 'nolegal'; c.click(); return 'tap'; });
  const stepTo = (p, sel) => p.evaluate(sel => { const S = UI._S(); if (!S) return; if (window.CUTAWAYS && CUTAWAYS.busy && CUTAWAYS.busy()) return; if (document.getElementById('cutaway') || document.getElementById('surprise-go')) return; const cells = [...document.querySelectorAll('#board .cell')], legal = cells.filter(c => c.classList.contains('legal')); if (!legal.length) return; const xy = c => { const i = cells.indexOf(c); return [i % 9, Math.floor(i / 9)]; }; const t = sel && cells.find(c => c.matches(sel) || c.querySelector(sel)); let best = legal[0]; if (t) { const [tx, ty] = xy(t); let d = 1e9; for (const c of legal) { const [x, y] = xy(c), k = Math.abs(x - tx) + Math.abs(y - ty) + (c === t ? 100 : 0); if (k < d) { d = k; best = c; } } } best.click(); }, sel);
  async function drive(p, pred, name, chase, focus, buttons, max = 300) {
    for (let i = 0; i < max; i++) {
      await closeCard(p);
      const s = await info(p);
      if (s && s.phase === 'over') return console.log('over before', name), false;
      if (s && s.myTurn && s.phase === 'play' && await p.evaluate('(' + pred.toString() + ')()').catch(() => false) && await p.evaluate(() => document.getElementById('actions').getBoundingClientRect().height > 0)) { await p.waitForTimeout(500); await crop(p, name, focus, buttons); return true; }
      if (s && (s.myTurn || /^setup/.test(s.phase))) await stepTo(p, chase);
      await p.waitForTimeout(150);
    }
    console.log('gave up', name); return false;
  }
  const solo = async (bots, role, kind) => { const p = await mk(); await p.goto(U); await p.click('#playSolo'); await p.click('[data-bots="' + bots + '"]'); await p.click('#soloGo'); if (role) await p.click('[data-role="' + role + '"]'); if (kind) await p.click('[data-hkind="' + kind + '"]'); await p.click('#startGame'); await p.waitForSelector('#board .cell'); return p; };
  const seen = new Set(); const explore = async (p, n, chase) => { for (let i = 0; i < n; i++) { await closeCard(p); const s = await info(p); const k = s && s.myTurn && JSON.stringify([s.acts, s.hint]); if (k && !seen.has(k)) { seen.add(k); console.log(s.round, k); } if (s && (s.myTurn || /^setup/.test(s.phase))) await step(p); await p.waitForTimeout(200); } };
  const which = process.env.SCENE;
  if (which === 'x-classic0') { const p = await solo(1, 'blue'); await explore(p, 30); await crop(p, 'x-classic'); await p.screenshot({ path: RAW + '/x-full.png' }); console.log(await p.evaluate(() => ['hud','hint','board','actions'].map(i => i + JSON.stringify(document.getElementById(i).getBoundingClientRect())).join(' '))); }
  const dist = (a, b) => `(()=>{const cs=[...document.querySelectorAll('#board .cell')];const f=s=>cs.findIndex(c=>c.matches(s)||c.querySelector(s));const i=f('${a}'),j=f('${b}');return i<0||j<0?99:Math.abs(i%9-j%9)+Math.abs(Math.floor(i/9)-Math.floor(j/9));})()`;
  const team = async (mine, name, pred, buttons) => {
    const A = await mk(), V = await mk(), other = mine === 'ostrich' ? V : A;
    await A.goto(U); await A.click('#playFriend'); await A.waitForSelector('#lobbyCode:not(:empty)');
    const link = (await A.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, U.replace(/\/$/, ''));
    await V.goto(link); await V.waitForSelector('#roomLobby');
    await A.click('#botPlus'); await A.click('#botPlus');
    await A.waitForSelector('[data-role="ostrich"]'); await A.click('[data-role="ostrich"]'); await V.click('[data-role="vulture"]');
    await A.waitForFunction(() => { const s = LobbyUI.get(); return s && !document.getElementById('startGame').disabled; });
    await A.click('#startGame'); await A.waitForSelector('#board .cell'); await V.waitForSelector('#board .cell');
    const me = mine === 'ostrich' ? A : V, he = mine === 'ostrich' ? V : A;
    he.on('pageerror', () => {}); drive(he, () => false, 'x-' + name, null, null, false, 400).catch(() => {});
    return drive(me, pred, name, null, mine === 'ostrich' ? '.cell.mine,.aimg-ostrich' : '.aimg-vulture', buttons);
  };
  const scenes = {
    xf: async () => { const p = await solo(1, 'blue'); await explore(p, 8); console.log(await p.evaluate(() => [...document.querySelectorAll('#board .cell')].filter(c => /ic-egg|egg/i.test(c.className+c.dataset.tags)).map(c => c.outerHTML.slice(0, 300)).join('\\n'))); },
    tap: async () => drive(await solo(1, 'blue'), () => true, 'tap', null, '.aimg-ostrich'),
    eggs: async () => drive(await solo(1, 'blue'), () => !!document.querySelector('.ic-myegg'), 'eggs', null, '.ic-myegg'),
    eat: async () => drive(await solo(1, 'blue'), () => !!document.querySelector('.ic-food') , 'eat', '.ic-food', '.ic-food'),
    catch: async () => drive(await solo(2, 'blue'), new Function('return ' + dist('.aimg-ostrich', '.aimg-hyena,.aimg-badger') + ' <= 2'), 'catch', '.aimg-hyena,.aimg-badger', '.aimg-hyena,.aimg-badger'),
    pounce: async () => drive(await solo(2, 'hyena'), () => !!document.querySelector('.smell') || UI._S().round >= 4, 'pounce', '.aimg-ostrich,.aimg-vulture', '.aimg-hyena', true),
    boost: async () => drive(await solo(2, 'hyena'), () => /knock/i.test(document.getElementById('hint').innerText) || UI._S().round >= 5, 'boost', '.aimg-ostrich,.aimg-vulture', '.aimg-hyena'),
    burrow: async () => drive(await solo(2, 'badger'), () => [...document.querySelectorAll('#actions button')].some(b => /Burrow/.test(b.innerText)), 'burrow', '.aimg-ostrich,.aimg-vulture', '.aimg-badger', true),
    tie: async () => drive(await solo(3, 'hyena'), () => UI._S().round >= 3, 'tie', '.aimg-ostrich,.aimg-vulture', '.aimg-hyena'),
    warm: async () => team('ostrich', 'warm', () => [...document.querySelectorAll('#actions button')].some(b => /warm/i.test(b.innerText)) || UI._S().round >= 4, false),
    share: async () => team('vulture', 'share', () => !!document.querySelector('.cell.spot,.cell.spotted,.cell.found') || UI._S().round >= 4, false),
  };
  for (const k of Object.keys(scenes)) if (!which ? false : which.split(',').includes(k)) await scenes[k]();
  await b.close(); process.exit(0);
})();
