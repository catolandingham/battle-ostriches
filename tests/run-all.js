// Runs every unit and phone (e2e) suite one at a time and prints one PASS or FAIL line each.
// Usage: node tests/run-all.js [name-filter ...]   (e.g. `node tests/run-all.js lobby` runs testlobby.js and e2e-lobby*.js)
// Each suite gets 4 minutes (e2e-consistency.js, which plays 13 full games, gets 15). Logs go to shots/test-logs/<suite>.log. Exits 1 if any suite fails.
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..'), LOGS = path.join(ROOT, 'shots', 'test-logs'), LIMIT = 4 * 60 * 1000, LONG = { 'e2e-consistency.js': 15 * 60 * 1000 };
const SKIP = new Set(['e2e-live.js']); // e2e-live.js plays against the live site, not a local server
const filters = process.argv.slice(2);
const all = fs.readdirSync(ROOT).filter(f => /^(test.*|ai-test|e2e.*)\.js$/.test(f) && !SKIP.has(f));
const unit = all.filter(f => !f.startsWith('e2e')).sort(), e2e = all.filter(f => f.startsWith('e2e')).sort();
const suites = [...unit, ...e2e].filter(f => !filters.length || filters.some(x => f.includes(x)));
fs.mkdirSync(LOGS, { recursive: true });
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(ROOT, 'node_modules', '.pw-browsers') };

function run(file) {
  return new Promise(done => {
    const t0 = Date.now(), log = fs.createWriteStream(path.join(LOGS, file.replace(/\.js$/, '.log')));
    const p = spawn(process.execPath, [file], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '', timedOut = false;
    const keep = d => { log.write(d); tail = (tail + d).slice(-2000); };
    p.stdout.on('data', keep); p.stderr.on('data', keep);
    const timer = setTimeout(() => { timedOut = true; p.kill('SIGKILL'); }, LONG[file] || LIMIT);
    p.on('close', code => {
      clearTimeout(timer); log.end();
      const secs = Math.round((Date.now() - t0) / 1000);
      const last = tail.trim().split('\n').filter(Boolean).pop() || '';
      done({ file, ok: code === 0 && !timedOut, secs, note: timedOut ? 'timed out after ' + Math.round((LONG[file] || LIMIT) / 60000) + ' minutes' : last.slice(0, 120) });
    });
  });
}

(async () => {
  const results = [];
  for (const f of suites) {
    const r = await run(f); results.push(r);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.file.padEnd(26)} ${String(r.secs).padStart(4)}s  ${r.ok ? '' : r.note}`);
  }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} suites passed.${failed.length ? ' Logs: shots/test-logs/' : ''}`);
  process.exit(failed.length ? 1 : 0);
})();
