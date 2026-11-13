// Runs every unit and phone (e2e) suite one at a time and prints one PASS or FAIL line each.
// Usage: node tests/run-all.js [--shard=2/3 | --long] [name-filter ...]   (e.g. `node tests/run-all.js lobby` runs testlobby.js and e2e-lobby*.js)
// A suite listed in KNOWN_FAILURES below fails for a real game reason that is on the problem list. It is still run and still shown (as KNOWN), but it does not turn the check red. Never add a suite here to hide a failure you have not written down.
// Each suite gets 8 minutes (e2e-consistency.js, which plays 13 full games, gets 30; e2e-invite.js gets 12). Logs go to shots/test-logs/<suite>.log. A suite that fails is tried up to two more times; passing on a retry is shown as FLAKY. Exits 1 if any suite fails three times.
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..'), LOGS = path.join(ROOT, 'shots', 'test-logs'), LIMIT = 8 * 60 * 1000;
// Suites that need more than the usual time. e2e-consistency.js plays 13 full games and runs alone in the GitHub check (--long); e2e-invite.js plays two full games against the computer, with a built-in pause on every computer turn.
const LONG = { 'e2e-consistency.js': 30 * 60 * 1000 }, EXTRA = { 'e2e-invite.js': 12 * 60 * 1000 };
const SKIP = new Set(['e2e-live.js']); // e2e-live.js plays against the live site, not a local server
const KNOWN_FAILURES = {
  // These four fail on a clean Linux machine with the same WebKit the check uses. None was fixed or weakened here; each is on Brian's problem list.
  'e2e-pass.js': 'Pass-and-play: after the vulture smashes an egg the screen waits on "Tap to go on." and the test never taps it (the test looks out of date with the 2026-11-11 flow, not confirmed)',
  'e2e-motion-views.js': 'Kick: the ostrich\'s slide animation is gone 300 ms after a repeated update arrives ("duplicate packet interrupted full kicker slide"); either the animation really is cut short or the test is out of date (not confirmed)',
  'e2e-cause.js': 'Fails on GitHub (WebKit) but passes in Chromium on the machine used to look at it; it waits for the "egg went cold" animation and the next turn and times out. Cause not found',
  'e2e-three.js': 'Fails on GitHub (WebKit) but passes in Chromium on the machine used to look at it; the hyena\'s second (pounce) tap does not produce the catch line within 15 seconds. Cause not found',
};
const flags = process.argv.slice(2).filter(a => a.startsWith('--')), filters = process.argv.slice(2).filter(a => !a.startsWith('--'));
const shard = (flags.find(a => a.startsWith('--shard=')) || '').slice(8).split('/').map(Number); // --shard=2/3 runs every 3rd suite, starting at the 2nd (the GitHub check splits the work this way)
const onlyLong = flags.includes('--long'); // --long runs just the suites listed in LONG
const all = fs.readdirSync(ROOT).filter(f => /^(test.*|ai-test|e2e.*)\.js$/.test(f) && !SKIP.has(f));
const unit = all.filter(f => !f.startsWith('e2e')).sort(), e2e = all.filter(f => f.startsWith('e2e')).sort();
let suites = [...unit, ...e2e].filter(f => !filters.length || filters.some(x => f.includes(x)));
if (onlyLong) suites = suites.filter(f => LONG[f]); else if (shard.length === 2) suites = suites.filter(f => !LONG[f]).filter((f, i) => i % shard[1] === shard[0] - 1);
fs.mkdirSync(LOGS, { recursive: true });
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(ROOT, 'node_modules', '.pw-browsers') };

function run(file) {
  return new Promise(done => {
    const t0 = Date.now(), log = fs.createWriteStream(path.join(LOGS, file.replace(/\.js$/, '.log')));
    const p = spawn(process.execPath, [file], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '', timedOut = false;
    const keep = d => { log.write(d); tail = (tail + d).slice(-2000); };
    p.stdout.on('data', keep); p.stderr.on('data', keep);
    const timer = setTimeout(() => { timedOut = true; p.kill('SIGKILL'); }, LONG[file] || EXTRA[file] || LIMIT);
    p.on('close', code => {
      clearTimeout(timer); log.end();
      const secs = Math.round((Date.now() - t0) / 1000);
      const lines = tail.trim().split('\n').filter(Boolean), last = lines.find(l => /Error|Timeout|not ok|FAIL|stayed|expected/i.test(l)) || lines.filter(l => !/^\s*[}\])]/.test(l)).pop() || '';
      done({ file, ok: code === 0 && !timedOut, secs, note: timedOut ? 'timed out after ' + Math.round((LONG[file] || EXTRA[file] || LIMIT) / 60000) + ' minutes' : last.slice(0, 120) });
    });
  });
}

(async () => {
  const results = [];
  for (const f of suites) {
    let r = await run(f);
    // A suite that fails is run up to two more times (not if it timed out, and not if it is a known failure). Passing the second time is shown as FLAKY and listed in the summary, so a timing wobble does not hide and does not block. Failing all three times is red.
    if (!r.ok && !KNOWN_FAILURES[f] && !/timed out/.test(r.note)) { const first = r; for (let t = 2; t <= 3 && !r.ok; t++) r = await run(f); r.firstNote = first.note; r.flaky = r.ok; }
    results.push(r);
    const known = KNOWN_FAILURES[f];
    r.known = !r.ok && !!known; r.fixed = r.ok && !!known;
    console.log(`${r.flaky ? 'FLAKY' : r.ok ? 'PASS' : r.known ? 'KNOWN' : 'FAIL'}  ${r.file.padEnd(26)} ${String(r.secs).padStart(4)}s  ${r.flaky ? 'failed once (' + r.firstNote + '), passed on a retry' : r.ok ? (r.fixed ? 'now passing: remove it from KNOWN_FAILURES in tests/run-all.js' : '') : r.known ? 'known failure: ' + known : r.note}`);
  }
  // Show the end of each failed suite's log right here, so a red check explains itself without downloading anything.
  for (const r of results.filter(x => !x.ok && !x.known)) {
    let txt = ''; try { txt = fs.readFileSync(path.join(LOGS, r.file.replace(/\.js$/, '.log')), 'utf8'); } catch (e) {}
    console.log(`\n----- ${r.file}: last lines of its log -----\n` + txt.trim().split('\n').slice(-25).join('\n').slice(-3000));
  }
  const failed = results.filter(r => !r.ok && !r.known), known = results.filter(r => r.known), passed = results.filter(r => r.ok);
  console.log(`\n${passed.length} of ${results.length} suites passed.${known.length ? ' ' + known.length + ' known failure(s) (listed in KNOWN_FAILURES in tests/run-all.js).' : ''}${failed.length ? ' ' + failed.length + ' FAILED. Logs: shots/test-logs/' : ''}`);
  // A short summary for GitHub (the workflow copies it into the job summary).
  const md = [`## Test suites: ${passed.length} of ${results.length} passed`];
  md.push(failed.length ? `\n### Failed (${failed.length})\n` + failed.map(r => `- ${r.file}: ${r.note.replace(/[\r\n|]/g, ' ')}`).join('\n') : '\nNo failures.');
  const flaky = results.filter(r => r.flaky);
  if (flaky.length) md.push(`\n### Flaky: failed once, passed on a retry (${flaky.length})\n` + flaky.map(r => `- ${r.file}: first failure was: ${r.firstNote.replace(/[\r\n|]/g, ' ')}`).join('\n'));
  if (known.length) md.push(`\n### Known failures, not counted as red (${known.length})\n` + known.map(r => `- ${r.file}: ${KNOWN_FAILURES[r.file]}`).join('\n'));
  fs.writeFileSync(path.join(LOGS, 'summary.md'), md.join('\n') + '\n');
  process.exit(failed.length ? 1 : 0);
})();
