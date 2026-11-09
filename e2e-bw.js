// Default theme, real how-to crops/approved role captions, finite found-egg pulse and reduced motion.
process.env.PORT = '3978'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert');
const { webkit } = require('playwright-core');
const server = require('./server');
(async () => {
  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 664 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3978/');
  assert.equal(await page.getAttribute('html', 'data-theme'), 'bw');
  await page.evaluate(() => UI.rules());
  await page.waitForFunction(() => [...document.querySelectorAll('#howPics img')].length === 4 && [...document.querySelectorAll('#howPics img')].every(im => im.complete && im.naturalWidth > 0));
  assert.equal(await page.locator('#howPics figcaption').nth(2).textContent(), 'Filled egg: found. Throw at it.');
  assert.equal(await page.locator('#howPics .found img').evaluate(e => getComputedStyle(e).animationName), 'foundpulse2');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#howPics .found img').evaluate(e => getComputedStyle(e).animationName), 'none');
  await page.evaluate(() => {
    document.querySelector('#board').innerHTML = '<div class="cell"><span class="ic-myegg"><i class="cmark cm-egg is"><svg></svg></i></span></div>';
  });
  await page.waitForTimeout(50);
  assert.equal(await page.locator('#board .justfound').count(), 0, 'unfound own egg does not pulse');
  await page.evaluate(() => { document.querySelector('#board').innerHTML = '<div class="cell spotted"><span class="ic-spot"><i class="cmark cm-egg is"><svg viewBox="0 0 40 40"><path d="M20 3L30 30H10Z"/></svg></i></span></div>'; });
  await page.waitForSelector('#board .justfound', { state: 'attached' });
  assert.equal(await page.locator('#board .justfound').count(), 1, 'only egg svg pulses, not both nested wrappers');
  assert.equal(await page.locator('#board .justfound').evaluate(e => getComputedStyle(e).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const css = await page.locator('#board .justfound').evaluate(e => { const s=getComputedStyle(e);return [s.animationName,s.animationDuration,s.animationIterationCount]; });
  assert.deepEqual(css, ['foundpulse', '0.55s', '2']);
  assert.ok(await page.locator('#board .justfound').evaluate(e => e.getAnimations().every(a => a.effect.getKeyframes().every(k => !k.transform || k.transform === 'none'))), 'pulse never changes egg size or position');
  await page.waitForTimeout(1250);
  assert.equal(await page.locator('#board .justfound').evaluate(e => e.getAnimations().filter(a => a.playState === 'running').length), 0, 'pulse ends');
  await page.evaluate(() => { document.querySelector('#board').innerHTML = '<div class="cell spotted"><span class="ic-spot"><i class="cmark cm-egg is"><svg></svg></i></span></div>'; });
  await page.waitForTimeout(50);
  assert.equal(await page.locator('#board .justfound').count(), 0, 'same found egg does not repeat on redraw');
  await page.evaluate(() => UI.closeRules());
  await page.evaluate(() => {
    document.querySelector('#lobby').classList.add('hidden');
    document.querySelector('#hint').textContent=BadgerLines.LINES.firstBurrow;
    const fact=document.createElement('div');fact.id='badgerline';fact.className='h3pop';fact.textContent=BadgerLines.LINES.firstBurrow;document.querySelector('#msgslot').appendChild(fact);
  });
  const fact=await page.locator('#badgerline').evaluate(e=>{const r=e.getBoundingClientRect(),s=document.querySelector('#msgslot').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const t=range.getBoundingClientRect();return {fits:e.scrollHeight<=e.clientHeight+1,padded:t.top>=r.top+5&&t.bottom<=r.bottom-5,inSlot:r.top>=s.top&&r.bottom<=s.bottom+1};});
  assert.ok(fact.fits&&fact.padded&&fact.inSlot,'long fact wraps with top/bottom padding '+JSON.stringify(fact));
  assert.equal(await page.locator('#hint').evaluate(e=>getComputedStyle(e).visibility),'hidden','a fading fact never overlays the hint text');
  assert.equal(await page.locator('#badgerline').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)','fact has an opaque white backing');

  await page.evaluate(()=>{for(const [id,txt] of [['snpop','Nothing near.'],['announce','The hyena caught the vulture!']]){const e=document.createElement('div');e.id=id;e.textContent=txt;if(id==='announce')e.className='show';document.querySelector('#msgslot').appendChild(e);}});
  assert.equal(await page.locator('#announce').evaluate(e=>getComputedStyle(e).visibility),'visible','catch notice wins over a simultaneous sniff');
  assert.equal(await page.locator('#snpop').evaluate(e=>getComputedStyle(e).visibility),'hidden','no stacked status text');
  await page.evaluate(()=>{document.querySelector('#announce').remove();document.querySelector('#snpop').remove();document.querySelector('#badgerline').remove();});
  assert.equal(await page.locator('#hint').evaluate(e=>getComputedStyle(e).visibility),'visible','hint returns when status clears');

  for (const [role, caption] of [['blue','Filled egg: a vulture found your egg.'],['red','Filled egg: you found it. Throw a stone at it.']]) {
    const p = await context.newPage();
    await p.addInitScript(() => { for(const k of ['bo_hs_off','bo_tut_seen','bo_card_off','bo_tips_off'])localStorage.setItem(k,'1'); });
    await p.goto('http://localhost:3978/'); await p.click('#playSolo'); await p.click('[data-bots="1"]'); await p.click('#soloGo'); await p.click('[data-role="'+role+'"]'); await p.click('#startGame');
    await p.waitForFunction(() => UI._S() && UI._S().phase !== 'lobby');
    await p.evaluate(() => UI.rules());
    assert.equal(await p.locator('#howPics figcaption').nth(2).textContent(), caption);
    if(role==='blue')assert.ok((await p.locator('#howPics .found img').getAttribute('src')).endsWith('2-blue.png'), 'ostrich found picture must not call the vulture YOU');
    await p.evaluate(() => { UI._S().role='hunter'; UI.rules(); });
    assert.equal(await p.locator('#howPics figcaption').nth(2).textContent(), 'Filled egg: a vulture found an egg.');
    await p.close();
  }
  await browser.close(); server.close(); console.log('PASS default bw, H1, approved captions, found pulse/reduced motion'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
