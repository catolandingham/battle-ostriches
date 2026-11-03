// Verifies gallery videos autoplay inline in WebKit iPhone emulation. Usage: node gallery-check.js [baseUrl]
const { webkit, devices } = require('playwright-core');
(async () => { let base = process.argv[2], srv; if (!base) { process.env.PORT = 3993; srv = require('./server.js'); base = 'http://localhost:3993'; }
  const b = await webkit.launch(), c = await b.newContext({ ...devices['iPhone 13'] }), p = await c.newPage();
  await p.goto(base + '/gallery.html'); await p.waitForTimeout(4000);
  const r = await p.$$eval('video', vs => vs.map(v => ({ src: v.currentSrc.split('/').pop(), t: +v.currentTime.toFixed(2), paused: v.paused, w: v.videoWidth, inline: v.playsInline, muted: v.muted, err: v.error && v.error.code })));
  console.log(JSON.stringify(r)); await p.screenshot({ path: 'shots/bold/gallery-webkit.png' });
  const ok = r.length === 4 && r.every(v => !v.paused && v.t > 0.5 && v.w > 0 && v.inline && v.muted && !v.err);
  console.log(ok ? 'GALLERY OK' : 'GALLERY FAIL'); await b.close(); srv && srv.close(); process.exit(ok ? 0 : 1); })();
