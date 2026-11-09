// A real engine catch updates each seat's header; its visible marker must change in any future design.
process.env.PORT='3977';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const assert=require('assert'),{webkit}=require('playwright-core'),S=require('./server'),{make}=require('./tests/hunter-fixtures');
(async()=>{
 const browser=await webkit.launch(),page=await browser.newPage({viewport:{width:390,height:664}});await page.addInitScript(()=>{for(const k of ['bo_tut_seen','bo_card_off','bo_tips_off','bo_muted'])localStorage.setItem(k,'1');});await page.goto('http://localhost:3977/');
 await page.evaluate(()=>document.querySelectorAll('.screen').forEach(e=>e.classList.add('hidden')));
 const draw=async(view,bird)=>{
  await page.evaluate(v=>{document.querySelector('#board').innerHTML='';T3UI.after(v,null,document.querySelector('#board'));},view);
  const chip=page.locator('#h3bar .bchip[data-b="'+bird+'"]'),result=await chip.evaluate(e=>({html:e.innerHTML,on:e.querySelectorAll('.heart.lost').length,fill:[...e.querySelectorAll('.heart:not(.lost) path')].map(p=>getComputedStyle(p).fill),out:!!e.querySelector('.ko'),outText:e.querySelector('.ko')?.textContent,outStyle:e.querySelector('.ko')&&[getComputedStyle(e.querySelector('.ko')).color,getComputedStyle(e.querySelector('.ko')).backgroundColor]}));
  result.image=await chip.screenshot({animations:'disabled'});return result;
 };
 for(const mode of ['3p','Hunters','5p']){
  const f=make(S,mode),before={};for(const r of f.roles)before[r]=await draw(f.view(r),f.bird);
  assert(f.catchBird(),mode+' actual catch');
  for(const r of f.roles){const v=f.view(r);assert.equal(v.h3.birds[f.bird].catches,1);const a=await draw(v,f.bird);assert(!a.image.equals(before[r].image),mode+' '+r+' design-neutral pixel change after a catch');assert.notEqual(a.html,before[r].html,mode+' '+r+' visible marker must change');assert.equal(a.on,1);assert(a.fill.every(c=>c==='rgb(17, 17, 17)'),mode+' '+r+' remaining hearts stay filled');}
  assert(f.catchBird(),mode+' second actual catch');
  for(const r of f.roles){const a=await draw(f.view(r),f.bird);assert.equal(a.on,2);assert(a.out&&a.outText==='OUT',mode+' '+r+' knockout clear');assert.deepEqual(a.outStyle,['rgb(255, 255, 255)','rgb(0, 0, 0)']);}
 }
 await browser.close();S.close();console.log('PASS actual catches: visible change and OUT on every role, 3p/Hunters/5p');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
