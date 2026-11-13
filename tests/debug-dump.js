// TEMPORARY debugging helper (not committed to main): when a phone suite crashes, print what each phone page was showing.
const pw = require('playwright-core'); const pages = [];
for (const bt of [pw.webkit, pw.chromium]) { const orig = bt.launch.bind(bt);
  bt.launch = async (...a) => { const b = await orig(...a); const nc = b.newContext.bind(b);
    b.newContext = async (...x) => { const c = await nc(...x); c.on('page', p => pages.push(p)); return c; }; return b; }; }
async function dump(why) {
  console.log('\n=== DEBUG DUMP after', why, '===');
  for (const p of pages) { try { console.log(await Promise.race([p.evaluate(() => JSON.stringify({ body: document.body.className, text: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 700), actions: (document.getElementById('actions') || {}).className, handoff: (document.getElementById('handoff') || {}).className, legal: document.querySelectorAll('.cell.legal').length, state: window.UI && UI._S ? { turn: UI._S().turn, round: UI._S().round, phase: UI._S().phase, role: UI._S().role } : null })), new Promise((_, r) => setTimeout(() => r(new Error('page not answering')), 4000))])); } catch (e) { console.log('page error', e.message); } }
}
process.on('unhandledRejection', async e => { console.log('unhandledRejection', String(e && e.message).slice(0, 200)); await dump('rejection'); process.exit(1); });
process.on('uncaughtException', async e => { console.log('uncaught', String(e && e.message).slice(0, 200)); await dump('exception'); process.exit(1); });
const realExit = process.exit.bind(process); let dumping = false;
process.exit = code => { if (code && !dumping && pages.length) { dumping = true; dump('exit ' + code).finally(() => realExit(code)); } else realExit(code); };
