// Theme presentation layer (nature / neon). Pure visuals: sprites tween between squares, throw arcs, puffs, radar rings.
// Reads the same state the board shows; never touches rules. Classic theme: does nothing.
(function(){
const NS='http://www.w3.org/2000/svg';
const SPR={
 nature:{
  o:'<svg viewBox="0 0 40 40"><ellipse cx="20" cy="23" rx="11" ry="13" fill="#3b2f25"/><ellipse cx="20" cy="25" rx="8" ry="9" fill="#5a4a3a"/><path d="M14 17q-4 8 0 16M26 17q4 8 0 16" stroke="#e9e1d3" stroke-width="2" fill="none" opacity=".8"/><path d="M20 12 L20 4" stroke="#c9a98a" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="3.5" r="2.6" fill="#c9a98a"/><path d="M20 1 l0 -1" stroke="#6b5040" stroke-width="2"/></svg>',
  v:'<svg viewBox="0 0 40 40"><path d="M20 10 C8 12 2 18 1 22 C8 21 12 22 15 24 L20 34 L25 24 C28 22 32 21 39 22 C38 18 32 12 20 10Z" fill="#5b4a3c"/><path d="M6 20 C10 19 13 19 15 21 M34 20 C30 19 27 19 25 21" stroke="#8c7663" stroke-width="1.5" fill="none"/><circle cx="20" cy="9" r="3.6" fill="#e6d3b0"/><path d="M20 4 l-1.5 3 h3z" fill="#e3a24a"/></svg>'},
 neon:{
  o:'<svg viewBox="0 0 40 40" fill="none" stroke="#38d6f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 27 C9 19 16 17 22 19 L28 6 L33 7"/><path d="M9 27 C14 31 24 31 27 24 L22 19"/><path d="M16 30 L14 37 M21 30 L23 37"/></svg>',
  v:'<svg viewBox="0 0 40 40" fill="none" stroke="#e04cff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z"/><circle cx="20" cy="10" r="4"/><path d="M23 10 L28 12 L23 13"/></svg>'}};
let layer,spr={},last={},theme=()=>document.documentElement.getAttribute('data-theme');
function cellRect(x,y,S){const b=document.getElementById('board');const c=b&&b.children[y*S.cfg.cols+x];if(!c)return null;const r=c.getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};}
function ensure(){if(!layer){layer=document.createElement('div');layer.id='fx';document.body.appendChild(layer);}}
function sprite(id,svg,S,p,sz){const r=cellRect(p[0],p[1],S);if(!r)return;let e=spr[id];
 if(!e||e.dataset.svg!==svg){if(e)e.remove();e=document.createElement('div');e.className='spr spr-'+id;e.innerHTML=svg;e.dataset.svg=svg;layer.appendChild(e);spr[id]=e;e.style.transition='none';}
 const s=r.w*(sz||1),tx=r.x+(r.w-s)/2,ty=r.y+(r.h-s)/2,prev=e.dataset.pos,np=p.join(',');
 e.style.width=e.style.height=s+'px';
 if(prev&&prev!==np){const[px,py]=prev.split(',').map(Number);const ang=Math.atan2(p[1]-py,p[0]-px)*180/Math.PI+90;e.style.setProperty('--rot',ang+'deg');
  requestAnimationFrame(()=>{e.style.transition='transform .45s cubic-bezier(.4,.1,.3,1)';e.style.transform=`translate(${tx}px,${ty}px) rotate(var(--rot))`;});
  if(theme()==='neon'){ring(r.x+r.w/2,r.y+r.h/2,r.w*.9,id==='o'?'#38d6f0':'#e04cff',.5);}
 } else {e.style.transform=`translate(${tx}px,${ty}px) rotate(var(--rot,0deg))`;}
 e.dataset.pos=np;}
function ring(cx,cy,rad,col,dur,cls){const d=document.createElement('div');d.className='fxring '+(cls||'');d.style.cssText=`left:${cx-rad}px;top:${cy-rad}px;width:${rad*2}px;height:${rad*2}px;border-color:${col};animation-duration:${dur}s`;layer.appendChild(d);setTimeout(()=>d.remove(),dur*1000+50);}
function throwFx(S,from,to,result){const a=cellRect(from[0],from[1],S),b=cellRect(to[0],to[1],S);if(!a||!b)return;
 const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2,t=theme(),T=t==='neon'?350:600;
 if(t==='neon'){const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','fxsvg');const minx=Math.min(ax,bx)-60,miny=Math.min(ay,by)-80;
  svg.style.cssText=`left:${minx}px;top:${miny}px;width:${Math.abs(ax-bx)+120}px;height:${Math.abs(ay-by)+140}px`;
  const pth=document.createElementNS(NS,'path');const mx=(ax+bx)/2-minx,my=Math.min(ay,by)-miny-50;
  pth.setAttribute('d',`M${ax-minx} ${ay-miny} Q${mx} ${my} ${bx-minx} ${by-miny}`);pth.setAttribute('class','laser');svg.appendChild(pth);layer.appendChild(svg);
  const L=pth.getTotalLength();pth.style.strokeDasharray=L;pth.style.strokeDashoffset=L;pth.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:T,easing:'ease-out',fill:'forwards'});
  setTimeout(()=>{svg.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});burst(bx,by,result);},T);setTimeout(()=>svg.remove(),T+400);}
 else{const s=document.createElement('div');s.className='fxstone';layer.appendChild(s);
  s.animate([{transform:`translate(${ax}px,${ay}px) scale(1)`},{transform:`translate(${(ax+bx)/2}px,${Math.min(ay,by)-70}px) scale(1.5)`},{transform:`translate(${bx}px,${by}px) scale(.9)`}],{duration:T,easing:'ease-in'});
  setTimeout(()=>{s.remove();puff(bx,by,result);},T-10);}}
function puff(x,y,result){for(let i=0;i<7;i++){const d=document.createElement('div');d.className='fxdust';d.style.left=x+'px';d.style.top=y+'px';layer.appendChild(d);
  const a=i/7*6.28,r=18+Math.random()*12;d.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:.9},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px)) scale(1.4)`,opacity:0}],{duration:650,easing:'ease-out'});setTimeout(()=>d.remove(),700);}}
function burst(x,y,result){const col=result==='hit'?'#ff7a1a':result==='feather'?'#ffffff':'#e04cff';
 for(let i=0;i<12;i++){const d=document.createElement('div');d.className='fxspark';d.style.background=col;d.style.boxShadow='0 0 8px '+col;d.style.left=x+'px';d.style.top=y+'px';layer.appendChild(d);
  const a=i/12*6.28,r=26+Math.random()*16;d.animate([{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px))`,opacity:0}],{duration:500,easing:'ease-out'});setTimeout(()=>d.remove(),550);}}
// direction of pressed footprints: point toward the busiest neighbouring trail square
function orientPrints(S){if(S.role!=='red'||!S.prints)return;const P=S.prints,b=document.getElementById('board');
 for(const k in P){const[x,y]=k.split(',').map(Number);let best=null,bv=0;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const v=P[(x+dx)+','+(y+dy)]||0;if(v>bv){bv=v;best=[dx,dy];}}
  const c=b.children[y*S.cfg.cols+x],n=c&&c.querySelector('.num');if(n&&best)n.style.setProperty('--prot',(Math.atan2(best[1],best[0])*180/Math.PI+90)+'deg');}}
window.FX={update(S,prev){const t=theme();ensure();layer.className=t||'';
 if(t!=='nature'&&t!=='neon'||!S||S.phase==='setupEggs'){for(const k in spr){spr[k].remove();delete spr[k];}return;}
 orientPrints(S);
 const sz=t==='nature'?1.05:.9;
 if(S.ostrich)sprite('o',SPR[t].o,S,S.ostrich,sz);else if(spr.o){spr.o.remove();delete spr.o;}
 if(S.vulture)sprite('v',SPR[t].v,S,S.vulture,S.role==='blue'?.8:sz);
 const la=S.lastAction,sig=la&&JSON.stringify([S.round,S.turn,la]);
 if(prev&&la&&sig!==last.sig&&prev.turn==='red'&&S.turn==='blue'){
  if(la.type==='throw')throwFx(S,S.vulture,la.p,la.result);
  if(la.type==='fly'&&la.smell&&S.role==='red'&&t==='neon'){const r=cellRect(S.vulture[0],S.vulture[1],S);if(r)ring(r.x+r.w/2,r.y+r.h/2,r.w*(S.cfg.smellRange+.5),'#5effa0',1.4,'radar');}}
 last.sig=sig;},
 relayout(){for(const k in spr)spr[k].dataset.pos='';}};
addEventListener('resize',()=>FX.relayout());
})();
