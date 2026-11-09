// All egg states keep the same upper-left slot, in every theme, at actual phone cell size.
const assert = require('assert'), path = require('path');
const { webkit } = require('playwright-core');
(async () => {
  const browser=await webkit.launch(),page=await browser.newPage({viewport:{width:390,height:664}});
  await page.goto('file://'+path.resolve('tools/icon-tests/eggs.html'));
  const themes=['bw','classic','nature','notes','golden','paper','arcade','toybox','tactical','storm','volcano','comic','pharaoh','neon'];
  for(const theme of themes){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    const rows=await page.evaluate(()=>[...document.querySelectorAll('[data-eggtest]')].filter(c=>c.querySelector('.cm-egg')).map(c=>{
      const r=c.getBoundingClientRect(),e=c.querySelector('.cm-egg svg').getBoundingClientRect();
      const box=q=>{const b=q.getBoundingClientRect();return {x:b.left-r.left,y:b.top-r.top,w:b.width,h:b.height,right:b.right-r.left,bottom:b.bottom-r.top};};
      return {name:c.dataset.eggtest,egg:box(c.querySelector('.cm-egg svg')),bird:c.querySelector('.pc')&&box(c.querySelector('.pc')),number:c.querySelector('.wnum')&&box(c.querySelector('.wnum')),cell:{w:r.width,h:r.height}};
    }));
    const ref=rows[0].egg;
    for(const row of rows){
      for(const key of ['x','y','w','h'])assert.ok(Math.abs(ref[key]-row.egg[key])<.1,theme+' '+row.name+' same egg '+key+': '+JSON.stringify(row));
      assert.ok(row.egg.x<row.cell.w*.1&&row.egg.y<row.cell.h*.1,theme+' upper-left');
      if(row.bird){const cx=row.bird.x+row.bird.w/2,cy=row.bird.y+row.bird.h/2;assert.ok(Math.abs(cx-row.cell.w/2)<1&&Math.abs(cy-row.cell.h/2)<1&&row.bird.w/row.cell.w>.8,theme+' '+row.name+' bird stays centred at full size (Brian, PR #24 review) '+JSON.stringify(row));}
      if(row.number){const n=row.number,cx=n.x+n.w/2,cy=n.y+n.h/2;assert.ok(cx>row.egg.x&&cx<row.egg.right&&cy>row.egg.y+row.egg.h*.3&&cy<row.egg.bottom-row.egg.h*.15,theme+' '+row.name+' number inside the egg (Brian, 2026-11-08) '+JSON.stringify(row));}
    }
  }
  // Twelve themes draw an FX sprite instead of the hidden .pc SVG. Check the real
  // sprite too, so it sits in the same centred slot as the board piece.
  await page.evaluate(()=>{const c=document.querySelector('[data-eggtest="own + bird, 14"]').cloneNode(true),b=document.querySelector('#board');b.innerHTML='';b.appendChild(c);});
  await page.addScriptTag({path:path.resolve('public/fx.js')});
  for(const theme of themes.filter(t=>!['bw','classic'].includes(t))){
   const r=await page.evaluate(t=>{document.documentElement.dataset.theme=t;FX.update({role:'blue',phase:'play',cfg:{cols:1,rows:1},ostrich:[0,0],vulture:[-99,-99]},null);const p=document.querySelector('.pc.po').getBoundingClientRect(),f=document.querySelector('#fx .spr-o').getBoundingClientRect();return {p:{x:p.x,y:p.y,w:p.width,h:p.height},f:{x:f.x,y:f.y,w:f.width,h:f.height}};},theme);
   for(const k of ['x','y','w','h'])assert(Math.abs(r.p[k]-r.f[k])<.1,theme+' sprite honors centred animal slot '+JSON.stringify(r));
  }
  await browser.close();console.log('PASS all egg states, 1/14 countdowns, plain/lit, all 14 themes');
})().catch(e=>{console.error(e);process.exit(1)});
