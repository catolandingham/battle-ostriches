// Renders an icon test page at phone pixel density so candidate icons can be judged at their real size.
// Usage: node tools/icon-tests/shot.js birds.html out.png   (pages: birds.html, faces.html; add your own beside them)
const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(__dirname, '../../node_modules/.pw-browsers');
const { webkit } = require('../../node_modules/playwright-core');
(async () => {
  const page = process.argv[2] || 'birds.html', out = process.argv[3] || page.replace(/\.html$/, '.png');
  const b = await webkit.launch();
  const p = await b.newPage({ viewport: { width: 380, height: 420 }, deviceScaleFactor: 3 });
  p.on('pageerror', e => console.log('page error', e.message));
  await p.goto('file://' + path.join(__dirname, page)); await p.waitForTimeout(400);
  await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote', out);
})();
