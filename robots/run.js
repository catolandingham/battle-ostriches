// Robot players for a local server. Many browsers join one room.
// Writes robots-out/FINDINGS.md, screenshots, and one short video.
// Exits 1 when a robot sees a rule break, a stuck table, a desync, a console or server error,
// a dead or off-screen control, an overlap, a shot-clock failure, or a rejoin failure.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'robots-out');
const PORT = process.env.ROBOT_PORT || '4019';
const BUDGET = Number(process.env.ROBOT_BUDGET_MS || 7 * 60 * 1000);
const SEED = 20261113;
fs.mkdirSync(OUT, { recursive: true });

const findings = [];
const serverNotes = [];
let browser;
const t0 = Date.now();
const over = () => Date.now() - t0 > BUDGET;

function add(severity, scenario, text) {
  findings.push({ severity, scenario, text });
  console.log(severity.toUpperCase(), scenario + ':', text);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function waitHealth() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const req = http.get('http://127.0.0.1:' + PORT + '/healthz', res => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (Date.now() - started > 8000) reject(new Error('health ' + res.statusCode));
        else setTimeout(tick, 150);
      });
      req.on('error', () => {
        if (Date.now() - started > 8000) reject(new Error('server did not start'));
        else setTimeout(tick, 150);
      });
    };
    tick();
  });
}

function startServer(extra) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT, BO_NOSTORE: '1', ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const keep = buf => {
    const s = buf.toString();
    if (/error|Error|unhandled/i.test(s)) serverNotes.push(s.trim().slice(0, 400));
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('exit', code => { if (code && code !== 0 && code !== null) serverNotes.push('server exited ' + code); });
  return child;
}

async function stopServer(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 300));
  if (!child.killed) child.kill('SIGKILL');
}

const initScript = () => {
  for (const k of ['bo_hs_off', 'bo_tut_seen', 'bo_walk_blue', 'bo_walk_red', 'bo_walk_hunter', 'bo_tips_off', 'bo_card_off', 'bo_muted']) localStorage.setItem(k, '1');
  window.AudioContext = undefined;
  window.webkitAudioContext = undefined;
};

async function openPage(opts) {
  const ctx = await browser.newContext({
    viewport: opts.viewport,
    hasTouch: !!opts.touch,
    isMobile: !!opts.touch,
    recordVideo: opts.video ? { dir: OUT, size: opts.viewport } : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 240)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 240)); });
  await page.addInitScript(initScript);
  return { ctx, page, errors };
}

async function stateOf(page) {
  return page.evaluate(() => {
    const s = window.UI && UI._S && UI._S();
    if (!s) return null;
    return { phase: s.phase || null, turn: s.turn || null, round: s.round || null, role: s.role || null, eggsLeft: s.eggsLeft == null ? null : s.eggsLeft };
  }).catch(() => null);
}

async function layoutOf(page) {
  return page.evaluate(() => {
    const issues = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    const board = document.querySelector('#board');
    const actions = document.querySelector('#actions');
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    if (!board || board.getBoundingClientRect().width < 8) return issues;
    const b = box(board);
    if (b.x < -2 || b.y < -2 || b.r > vw + 2 || b.b > vh + 2) issues.push('board is off the screen');
    if (actions && actions.getBoundingClientRect().height > 4) {
      const a = box(actions);
      const overlaps = !(a.r < b.x + 1 || a.x > b.r - 1 || a.b < b.y + 1 || a.y > b.b - 1);
      if (overlaps) issues.push('the buttons overlap the board');
      if (a.w < 8 || a.x < -2 || a.r > vw + 2 || a.b > vh + 2) issues.push('an action control is off the screen or has no size');
    }
    return issues;
  }).catch(() => []);
}

async function shot(page, name) {
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file }).catch(() => {});
  return file;
}

async function claim(page, prefer) {
  for (const role of prefer) {
    const btn = page.locator('[data-role="' + role + '"]:not([disabled])');
    if (await btn.count()) { await btn.first().click(); return role; }
  }
  const any = page.locator('[data-role]:not([disabled])');
  if (await any.count()) { await any.first().click(); return 'first-open'; }
  return null;
}

async function joinTable(n, opts) {
  const pages = [];
  const host = await openPage(opts);
  pages.push(host);
  await host.page.goto('http://127.0.0.1:' + PORT + '/');
  await host.page.click('#playFriend');
  await host.page.waitForSelector('#lobbyCode:not(:empty)', { timeout: 8000 });
  const link = (await host.page.inputValue('#lobbyLink')).replace(/^http:\/\/[^/]+/, 'http://127.0.0.1:' + PORT);
  for (let i = 1; i < n; i++) {
    const p = await openPage({ ...opts, video: false });
    pages.push(p);
    await p.page.goto(link);
    await p.page.waitForSelector('#roomLobby, #lobbyCode', { timeout: 8000 });
  }
  const prefs = [
    ['blue', 'o1', 'ostrich'],
    ['red', 'v1', 'vulture'],
    ['hyena', 'hunter', 'o2'],
    ['badger', 'v2', 'o2'],
    ['hunter', 'o2', 'v2'],
    ['o1'], ['v1'], ['o2'],
  ];
  for (let i = 0; i < pages.length; i++) await claim(pages[i].page, prefs[i] || ['o1']);
  return { pages, link };
}

async function closeAll(pages) {
  for (const p of pages) await p.ctx.close().catch(() => {});
}

async function scenarioPlayers(n, label, opts) {
  if (over()) { add('skip', label, 'time budget used up before this table'); return; }
  const { pages } = await joinTable(n, opts);
  try {
    const host = pages[0].page;
    const start = host.locator('#startGame:not([disabled])');
    let started = false;
    try {
      await start.waitFor({ timeout: n > 5 ? 4000 : 8000 });
      if (n <= 5) { await start.click(); started = true; }
    } catch (e) { started = false; }
    if (n > 5) {
      if (started) add('fail', label, 'the host could start a game with ' + n + ' people. The standing rule stops at 5.');
      else add('ok', label, n + ' browsers joined. Start stayed off, which matches the 5-player cap.');
      await shot(host, label);
      return;
    }
    if (!started) {
      add('fail', label, 'the host never got a Start button with ' + n + ' people');
      await shot(host, label + '-stuck');
      return;
    }
    try {
      await host.waitForSelector('#board .cell', { timeout: 12000 });
    } catch (e) {
      add('fail', label, 'Start was tapped and the board never came up');
      await shot(host, label + '-noboard');
      return;
    }
    for (const p of pages) {
      const lay = await layoutOf(p.page);
      for (const issue of lay) add('fail', label, issue + ' (' + (opts.touch ? 'touch' : 'mouse') + ' ' + opts.viewport.width + 'x' + opts.viewport.height + ')');
      for (const err of p.errors) add('fail', label, 'browser error: ' + err);
    }
    const states = [];
    for (const p of pages) states.push(await stateOf(p.page));
    const phases = [...new Set(states.map(s => s && s.phase).filter(Boolean))];
    const rounds = [...new Set(states.map(s => s && s.round).filter(v => v != null))];
    if (phases.length > 1) add('fail', label, 'clients disagree on the phase: ' + phases.join(' vs '));
    if (rounds.length > 1) add('fail', label, 'clients disagree on the round: ' + rounds.join(' vs '));
    if (!findings.some(f => f.scenario === label && f.severity === 'fail')) add('ok', label, n + ' players reached the board together');
    await shot(host, label);
    return { pages, states };
  } finally {
    await closeAll(pages);
  }
}

async function playTwo(opts) {
  if (over()) { add('skip', 'scripted-2', 'time budget used up'); return; }
  const { pages } = await joinTable(2, opts);
  try {
    const host = pages[0].page;
    await host.locator('#startGame:not([disabled])').click({ timeout: 8000 });
    await host.waitForSelector('#board .cell', { timeout: 12000 });
    const cell = (x, y) => host.locator('#board .cell').nth(y * 9 + x);
    for (const [x, y] of [[2, 2], [6, 2], [2, 5], [7, 5]]) {
      await cell(x, y).click().catch(() => {});
      await host.waitForTimeout(200);
    }
    await host.waitForTimeout(500);
    const after = await stateOf(host);
    const s0 = await stateOf(host);
    const s1 = await stateOf(pages[1].page);
    if (s0 && s1 && s0.phase && s1.phase && s0.phase !== s1.phase) add('fail', 'scripted-2', 'the two phones disagree on the phase');
    if (!after || !after.phase) add('fail', 'scripted-2', 'no game state after the opening taps');
    else add('ok', 'scripted-2', 'opening taps on a 2-player phone, phase ' + after.phase);
    const rnd = mulberry32(SEED);
    let idle = 0;
    for (let i = 0; i < 6; i++) {
      let acted = false;
      for (const p of pages) {
        const st = await stateOf(p.page);
        if (!st || !st.phase || st.phase === 'over') continue;
        const mine = await p.page.evaluate(() => {
          const s = window.UI && UI._S && UI._S();
          return !!(s && s.myTurn);
        }).catch(() => false);
        if (!mine) continue;
        const legal = p.page.locator('#board .cell.legal');
        const btn = p.page.locator('#actions button:not([disabled])');
        const nLegal = await legal.count();
        const nBtn = await btn.count();
        if (!nLegal && !nBtn) { idle++; continue; }
        if (nLegal && (nBtn === 0 || rnd() < 0.7)) await legal.nth(Math.floor(rnd() * nLegal)).click({ timeout: 1000 }).catch(() => {});
        else await btn.nth(Math.floor(rnd() * nBtn)).click({ timeout: 1000 }).catch(() => {});
        acted = true;
        idle = 0;
        break;
      }
      if (!acted) idle++;
      await host.waitForTimeout(300);
    }
    if (idle >= 6) add('fail', 'monkey-2', 'a player whose turn it was had no working tap, six times');
    else add('ok', 'monkey-2', 'seeded taps hit real squares or buttons');
    for (const p of pages) for (const err of p.errors) add('fail', 'scripted-2', 'browser error: ' + err);
    const lay = await layoutOf(host);
    for (const issue of lay) add('fail', 'scripted-2', issue);
    await shot(host, 'scripted-2');
  } catch (e) {
    add('fail', 'scripted-2', String(e.message || e).slice(0, 240));
    await shot(pages[0].page, 'scripted-2-fail').catch(() => {});
  } finally {
    await closeAll(pages);
  }
}

async function reachPlay(pages) {
  const host = pages[0].page;
  await host.locator('#startGame:not([disabled])').click({ timeout: 8000 });
  await host.waitForSelector('#board .cell', { timeout: 12000 });
  for (let n = 0; n < 8; n++) {
    const st = await stateOf(host);
    if (st && st.phase === 'play') return st;
    let clicked = false;
    for (const p of pages) {
      const legal = p.page.locator('#board .cell.legal');
      if (await legal.count()) { await legal.first().click({ timeout: 1000 }).catch(() => {}); clicked = true; break; }
    }
    if (!clicked) break;
    await host.waitForTimeout(250);
  }
  return stateOf(host);
}

async function clockCheck() {
  if (over()) { add('skip', 'shot-clock', 'time budget used up'); return; }
  const two = await joinTable(2, { viewport: { width: 390, height: 664 }, touch: true });
  try {
    await reachPlay(two.pages);
    const before = await stateOf(two.pages[0].page);
    await two.pages[0].page.waitForTimeout(3500);
    const after = await stateOf(two.pages[0].page);
    if (before && after && before.phase === 'play' && before.turn && after.turn && before.turn === after.turn) {
      add('fail', 'shot-clock-2', 'a 2-player game stayed on ' + after.turn + ' for 3.5 seconds with a 2 second clock');
    } else if (before && after && before.turn && after.turn && before.turn !== after.turn) add('ok', 'shot-clock-2', 'the 2-player turn changed with nobody tapping');
    else add('fail', 'shot-clock-2', 'could not reach a live 2-player turn to time the clock');
    await shot(two.pages[0].page, 'shot-clock-2');
  } catch (e) {
    add('fail', 'shot-clock-2', String(e.message || e).slice(0, 240));
  } finally {
    await closeAll(two.pages);
  }

  const three = await joinTable(3, { viewport: { width: 390, height: 664 }, touch: true });
  try {
    const before = await reachPlay(three.pages);
    await three.pages[0].page.waitForTimeout(4000);
    const after = await stateOf(three.pages[0].page);
    if (before && after && before.phase === 'play' && before.turn && after.turn && before.turn !== after.turn) add('ok', 'shot-clock-3', 'nobody tapped, and the 3-player turn changed');
    else add('fail', 'shot-clock-3', 'a 3-player turn stayed at ' + (after && after.turn) + ' (phase ' + (after && after.phase) + ')');
    for (const p of three.pages) for (const err of p.errors) add('fail', 'shot-clock-3', 'browser error: ' + err);
    await shot(three.pages[0].page, 'shot-clock-3');
  } catch (e) {
    add('fail', 'shot-clock-3', String(e.message || e).slice(0, 240));
  } finally {
    await closeAll(three.pages);
  }
}

async function rejoinCheck() {
  if (over()) { add('skip', 'rejoin', 'time budget used up'); return; }
  const { pages, link } = await joinTable(2, { viewport: { width: 390, height: 664 }, touch: true });
  try {
    const host = pages[0].page;
    await host.locator('#startGame:not([disabled])').click({ timeout: 8000 });
    await host.waitForSelector('#board .cell', { timeout: 12000 });
    const fresh = await openPage({ viewport: { width: 390, height: 664 }, touch: true });
    pages.push(fresh);
    await fresh.page.goto(link);
    await fresh.page.waitForTimeout(1200);
    const text = await fresh.page.locator('body').innerText();
    if (/Back in the game|Rejoin as|already running|play in the next one/i.test(text)) add('ok', 'rejoin', 'a new browser saw a rejoin or next-game line');
    else add('fail', 'rejoin', 'a new browser did not see a rejoin line');
    for (const err of fresh.errors) add('fail', 'rejoin', 'browser error: ' + err);
    await shot(fresh.page, 'rejoin');
  } catch (e) {
    add('fail', 'rejoin', String(e.message || e).slice(0, 240));
  } finally {
    await closeAll(pages);
  }
}

function writeReport() {
  const fails = findings.filter(f => f.severity === 'fail');
  const lines = [];
  lines.push('# Robot findings, ' + new Date().toISOString().slice(0, 16) + ' UTC');
  lines.push('');
  lines.push('These robots played a local server. Nothing in the game was changed.');
  lines.push('');
  lines.push(fails.length ? fails.length + ' problem' + (fails.length === 1 ? '' : 's') + '.' : 'No problem in the checks that finished.');
  lines.push('');
  lines.push('| Result | Check | What happened |');
  lines.push('|---|---|---|');
  for (const f of findings) lines.push('| ' + f.severity + ' | ' + f.scenario + ' | ' + f.text.replace(/\|/g, '/') + ' |');
  if (serverNotes.length) {
    lines.push('');
    lines.push('## Server log lines that look like errors');
    lines.push('');
    for (const n of [...new Set(serverNotes)].slice(0, 12)) lines.push('- ' + n.replace(/\s+/g, ' '));
  }
  lines.push('');
  lines.push('Screenshots and one video, when the run produced them, are next to this file.');
  fs.writeFileSync(path.join(OUT, 'FINDINGS.md'), lines.join('\n') + '\n');
  return fails.length;
}

(async () => {
  browser = await chromium.launch({ headless: true });
  const phone = { viewport: { width: 390, height: 664 }, touch: true };
  const tablet = { viewport: { width: 768, height: 1024 }, touch: true };
  const desktop = { viewport: { width: 1280, height: 800 }, touch: false };

  let child = startServer({ BO_CLOCKMS: '120000', BO_REJOIN_GRACE_MS: '400' });
  try {
    await waitHealth();
    await playTwo({ ...phone, video: true });
    await scenarioPlayers(3, 'players-3-phone', phone);
    await scenarioPlayers(4, 'players-4-tablet', tablet);
    await scenarioPlayers(5, 'players-5-desktop', desktop);
    await scenarioPlayers(8, 'players-8-phone', { ...phone, video: false });
    await rejoinCheck();
  } catch (e) {
    add('fail', 'setup', String(e.message || e).slice(0, 240));
  } finally {
    await stopServer(child);
  }

  child = startServer({ BO_CLOCKMS: '2000', BO_REJOIN_GRACE_MS: '60000' });
  try {
    await waitHealth();
    await clockCheck();
  } catch (e) {
    add('fail', 'shot-clock', String(e.message || e).slice(0, 240));
  } finally {
    await stopServer(child);
  }

  if (serverNotes.length) add('fail', 'server', serverNotes[0].slice(0, 240));
  const fails = writeReport();
  await browser.close().catch(() => {});
  console.log('findings', findings.length, 'fails', fails, 'ms', Date.now() - t0);
  process.exit(fails ? 1 : 0);
})().catch(err => {
  console.error(err);
  try { fs.writeFileSync(path.join(OUT, 'FINDINGS.md'), '# Robot findings\n\nThe run crashed: ' + err.message + '\n'); } catch (e) {}
  process.exit(1);
});
