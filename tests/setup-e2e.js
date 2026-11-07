// Installs the WebKit build the phone (e2e) tests use into node_modules/.pw-browsers (about 90 MB download).
// Usage: npm run setup:e2e
// On Nov 6 the Playwright installer downloaded its zip on this Mac and then hung while unpacking it.
// If the download sits unchanged for a minute and the installer has not finished, this unzips it itself.
const fs = require('fs'), os = require('os'), path = require('path'), { spawn, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), BROWSERS = path.join(ROOT, 'node_modules', '.pw-browsers');
const PWC = path.join(ROOT, 'node_modules', 'playwright-core');
const rev = JSON.parse(fs.readFileSync(path.join(PWC, 'browsers.json'), 'utf8')).browsers.find(b => b.name === 'webkit').revision;
const target = path.join(BROWSERS, 'webkit-' + rev), done = path.join(target, 'INSTALLATION_COMPLETE');

if (fs.existsSync(done)) { console.log('WebKit ' + rev + ' is already installed in node_modules/.pw-browsers.'); process.exit(0); }

const started = Date.now();
// A private temp folder for the download, so the fallback below only ever unzips a file this run downloaded.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bo-webkit-'));
const cli = path.join(PWC, 'cli.js');
const p = spawn(process.execPath, [cli, 'install', 'webkit'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: BROWSERS, TMPDIR: TMP } });
let finished = false;
p.on('close', code => { finished = true; clearInterval(watch); if (fs.existsSync(done)) ok(); else fail('The installer exited (code ' + code + ') without finishing.'); });

// The installer downloads to TMP/playwright-download-XXXX/<name>.zip, then unpacks into target.
function newestZip() {
  let best = null;
  for (const d of fs.readdirSync(TMP).filter(n => n.startsWith('playwright-download-'))) {
    const dir = path.join(TMP, d);
    let names = []; try { names = fs.readdirSync(dir); } catch (e) { continue; }
    for (const n of names.filter(n => /webkit.*\.zip$/.test(n) && n.includes(rev))) {
      const f = path.join(dir, n), st = fs.statSync(f);
      if (st.mtimeMs >= started - 1000 && (!best || st.mtimeMs > best.mtime)) best = { f, size: st.size, mtime: st.mtimeMs };
    }
  }
  return best;
}
let lastSize = -1, sameSince = 0;
const watch = setInterval(() => {
  if (finished || fs.existsSync(done)) return;
  const z = newestZip(); if (!z) return;
  if (z.size !== lastSize) { lastSize = z.size; sameSince = Date.now(); return; }
  if (Date.now() - sameSince < 60 * 1000) return;
  clearInterval(watch); finished = true;
  console.log('\nThe installer stalled after downloading. Unpacking ' + path.basename(z.f) + ' directly.');
  p.kill('SIGKILL');
  fs.rmSync(target, { recursive: true, force: true }); fs.mkdirSync(target, { recursive: true });
  execFileSync('unzip', ['-q', z.f, '-d', target], { stdio: 'inherit' });
  fs.writeFileSync(path.join(target, 'DEPENDENCIES_VALIDATED'), '');
  fs.writeFileSync(done, '');
  ok();
}, 5000);

function ok() { console.log('WebKit ' + rev + ' is ready. Run every test with: npm test'); process.exit(0); }
function fail(msg) { console.error(msg + ' Try again with: npm run setup:e2e'); process.exit(1); }
