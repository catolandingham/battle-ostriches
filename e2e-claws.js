// Hunter catch counter in the chip row (Brian, 2026-11-08): curved three-scratch sets, no numbers.
// 3 sets in 3-player games, 4 in Hunters and 5-player games; each catch past that adds one more earned set.
// Draws real engine views, sets the catch count, checks sets / earned sets / look, and saves each hunter chip to shots/claws/.
process.env.PORT='3967';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const assert=require('assert'),fs=require('fs'),{webkit}=require('playwright-core'),S=require('./server'),{make}=require('./tests/hunter-fixtures');
const OUT=process.env.CLAW_OUT||'shots/claws';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await webkit.launch(),page=await browser.newPage({viewport:{width:390,height:664},deviceScaleFactor:3});await page.addInitScript(()=>{for(const k of ['bo_tut_seen','bo_card_off','bo_tips_off','bo_muted'])localStorage.setItem(k,'1');});await page.goto('http://localhost:3967/');
 await page.evaluate(()=>document.querySelectorAll('.screen').forEach(e=>e.classList.add('hidden')));
 // spread n catches over the birds, at most 2 each (a third would be past a knock-out)
 const spread=(v,n)=>{for(const b of Object.values(v.h3.birds))b.catches=0,b.out=false;for(const b of Object.values(v.h3.birds)){const k=Math.min(2,n);b.catches=k;b.out=k>=2;n-=k;}assert.equal(n,0);};
 const cases=[['3p',3,[0,1,2,3,4]],['Hunters',4,[0,1,2,3,4,5]],['5p',4,[0,1,2,3,4,5]]];
 for(const [mode,base,counts] of cases){
  const f=make(S,mode);
  for(const n of counts){
   const v=f.view(f.roles[0]);if(mode==='Hunters')v.h3.hcatches={hyena:n,badger:0};else spread(v,n);
   await page.evaluate(v=>{document.querySelector('#board').innerHTML='';T3UI.after(v,null,document.querySelector('#board'));},v);
   const chip=page.locator(mode==='Hunters'?'#h3bar .bchip.hunter[data-b="hyena"]':'#h3bar .bchip.hunter');
   const r=await chip.evaluate(e=>{const c=[...e.querySelectorAll('.claw')],cr=e.getBoundingClientRect();return {sets:c.length,on:e.querySelectorAll('.claw.on').length,text:e.innerText.trim(),paths:c.map(x=>x.querySelector('path').getAttribute('d')),
    onStyle:c.filter(x=>x.classList.contains('on')).map(x=>{const s=getComputedStyle(x.querySelector('path'));return [s.stroke,parseFloat(s.strokeWidth)];}),
    offStyle:c.filter(x=>!x.classList.contains('on')).map(x=>{const s=getComputedStyle(x.querySelector('path'));return [s.stroke,parseFloat(s.strokeWidth)];}),
    inside:c.every(x=>{const b=x.getBoundingClientRect();return b.left>=cr.left&&b.right<=cr.right;})};});
   const tag=mode+' '+n+' catches';
   assert.equal(r.sets,Math.max(base,n),tag+': sets shown');assert.equal(r.on,n,tag+': earned sets');
   assert.ok(!/\d/.test(r.text),tag+': no number in the chip');assert.ok(r.inside,tag+': every set fits inside the chip');
   assert.ok(r.paths.every(d=>(d.match(/Q/g)||[]).length===3),tag+': each set is three curved scratches');
   r.onStyle.forEach(([c,w])=>{assert.equal(c,'rgb(17, 17, 17)');assert.ok(w>=1.3,tag+' earned is bold');});
   r.offStyle.forEach(([c,w])=>{assert.equal(c,'rgb(153, 153, 153)');assert.ok(w<=.7,tag+' unearned is thin');});
   await chip.screenshot({path:OUT+'/'+mode+'-'+n+'.png',animations:'disabled'});
  }
 }
 await browser.close();S.close();console.log('PASS hunter claws: 3p 3 sets, Hunters/5p 4 sets, one more per extra catch, no numbers');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
