// Stone-throw animation for every theme: the stone arcs from the vulture to the target, then
// hit = egg cracks (shell shards + yolk splat), guarded = stone bounces off with a feather, miss = thud + dust.
// Both players see it; it only uses info both already have (vulture square, target, result).
(function(){
let layer,lastSig=null;
const ensure=()=>{if(!layer){layer=document.createElement('div');layer.id='smashfx';document.body.appendChild(layer);}};
function rect(S,p){const b=document.getElementById('board'),c=b&&b.children[p[1]*S.cfg.cols+p[0]];return c?c.getBoundingClientRect():null;}
const el=(cls,css,html)=>{const d=document.createElement('div');d.className=cls;if(css)d.style.cssText=css;if(html)d.innerHTML=html;layer.appendChild(d);return d;};
const kill=(d,ms)=>setTimeout(()=>d.remove(),ms);
const SHELL='<svg viewBox="0 0 40 50"><path d="M20 2C9 2 3 20 3 31c0 10 8 17 17 17s17-7 17-17C37 20 31 2 20 2z" fill="#fffbe9" stroke="#2a2118" stroke-width="3"/></svg>';
const HALF=(side)=>`<svg viewBox="0 0 40 50"><path d="${side?'M20 2C31 2 37 20 37 31c0 10-8 17-17 17L23 40 17 33 24 25 18 17 22 10z':'M20 2C9 2 3 20 3 31c0 10 8 17 17 17L23 40 17 33 24 25 18 17 22 10z'}" fill="#fffbe9" stroke="#2a2118" stroke-width="3" stroke-linejoin="round"/></svg>`;
function play(S,la){ensure();const a=rect(S,la.from),b=rect(S,la.p);if(!a||!b)return;
 const ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2,w=b.width;
 const same=la.from[0]===la.p[0]&&la.from[1]===la.p[1],H=same?w*1.6:w*1.3+Math.hypot(bx-ax,by-ay)*.25,T=same?620:720;
 const cell=document.getElementById('board').children[la.p[1]*S.cfg.cols+la.p[0]];if(cell)cell.classList.add('fxhold');
 // the egg about to be hit is drawn back in so it can crack
 let egg=null;if(la.result==='hit'){egg=el('sm-egg',`left:${bx-w*.25}px;top:${by-w*.32}px;width:${w*.5}px;height:${w*.62}px`,SHELL);}
 const st=el('sm-stone',`width:${w*.34}px;height:${w*.3}px`),sh=el('sm-shadow',`width:${w*.36}px;height:${w*.12}px`);
 const K=[],KS=[];for(let i=0;i<=16;i++){const t=i/16,x=ax+(bx-ax)*t,y=ay+(by-ay)*t-H*4*t*(1-t);
  K.push({transform:`translate(${x-w*.17}px,${y-w*.15}px) rotate(${t*540}deg) scale(${1+.5*4*t*(1-t)})`});KS.push({transform:`translate(${x-w*.18}px,${ay+(by-ay)*t+w*.25}px) scale(${.5+.5*t})`,opacity:.25+.4*t});}
 st.animate(K,{duration:T,easing:'cubic-bezier(.3,.1,.6,1)',fill:'forwards'});sh.animate(KS,{duration:T,easing:'cubic-bezier(.3,.1,.6,1)',fill:'forwards'});
 window.SFX&&SFX.play('whoosh');try{document.dispatchEvent(new CustomEvent('bo-throw',{detail:{ax,ay,bx,by,w,T,res:la.result}}))}catch(e){}
 setTimeout(()=>{sh.remove();if(cell)cell.classList.remove('fxhold');impact(la.result,bx,by,w,st,egg);if(la.result==='bounce')reveal(la.egg,bx,by,w);},T);}
// after a bounce: big bold egg outline (egg safe) or a crossed-out empty egg (no egg), held ~1.6s
function reveal(has,x,y,w){const d=el('sm-reveal '+(has?'yes':'no'),`left:${x}px;top:${y}px;width:${w*1.8}px;height:${w*1.8}px`,`<svg viewBox="0 0 40 50"><path d="M20 3C9 3 4 20 4 31c0 10 7 16 16 16s16-6 16-16C36 20 31 3 20 3z" fill="${has?'#fff6c8':'#ffffffcc'}" stroke="${has?'#1f9d3a':'#d22'}" stroke-width="4.5" ${has?'':'stroke-dasharray="6 4"'}/>${has?'<path d="M12 28l6 6 11-13" fill="none" stroke="#1f9d3a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>':'<path d="M6 46L34 6" stroke="#d22" stroke-width="5" stroke-linecap="round"/>'}</svg><b>${has?'EGG SAFE':'NO EGG'}</b>`);
 d.animate([{transform:'translate(-50%,-60%) scale(.3)',opacity:0},{transform:'translate(-50%,-60%) scale(1.1)',opacity:1,offset:.15},{transform:'translate(-50%,-60%) scale(1)',opacity:1,offset:.8},{transform:'translate(-50%,-60%) scale(1)',opacity:0}],{duration:2000,fill:'forwards'});kill(d,2050);}
function dust(x,y,w,n,col){for(let i=0;i<n;i++){const d=el('sm-dust',`left:${x}px;top:${y}px;width:${w*.22}px;height:${w*.22}px;background:${col}`);
 const ang=Math.PI*(1+i/(n-1)),r=w*(.35+Math.random()*.3);d.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:.9},{transform:`translate(calc(-50% + ${Math.cos(ang)*r}px),calc(-50% + ${Math.sin(ang)*r*.6}px)) scale(1.6)`,opacity:0}],{duration:700,easing:'ease-out'});kill(d,720);}}
function shake(){const b=document.getElementById('board');b&&b.animate([{transform:'translate(0,0)'},{transform:'translate(-4px,2px)'},{transform:'translate(4px,-2px)'},{transform:'translate(-2px,1px)'},{transform:'translate(0,0)'}],{duration:260});}
const kind=r=>r==='hit'?'hit':r==='miss'?'miss':'feather'; // 'bounce' (stone at the ostrich) must never play the egg-crack
function impact(res,x,y,w,st,egg){res=kind(res);try{document.dispatchEvent(new CustomEvent('bo-impact',{detail:{x,y,w,res}}))}catch(e){}
 if(res==='feather'){window.SFX&&SFX.play('feather');const dx=w*.9;st.animate([{transform:st.style.transform||getComputedStyle(st).transform},{transform:`translate(${x+dx*.5-w*.17}px,${y-w*.8}px) rotate(700deg)`},{transform:`translate(${x+dx-w*.17}px,${y+w*.1}px) rotate(900deg)`,opacity:0}],{duration:520,easing:'ease-out',fill:'forwards'});kill(st,540);
  const f=el('sm-feather',`left:${x}px;top:${y}px;font-size:${w*.45}px`,'🪶');f.animate([{transform:'translate(-50%,-50%) rotate(0)',opacity:1},{transform:`translate(-20%,${-w*.2}px) rotate(-30deg)`,offset:.3},{transform:`translate(-80%,${w*.4}px) rotate(25deg)`,opacity:0}],{duration:1300,easing:'ease-in-out'});kill(f,1320);
  const r=el('sm-ring',`left:${x}px;top:${y}px;width:${w}px;height:${w}px`);kill(r,500);return;}
 if(res==='miss'){window.SFX&&SFX.play('thud');st.animate([{transform:getComputedStyle(st).transform},{transform:getComputedStyle(st).transform+' translateY(-6px)',offset:.4},{transform:getComputedStyle(st).transform,opacity:0}],{duration:600,fill:'forwards'});kill(st,620);
  dust(x,y+w*.15,w,7,'#c8b38a');return;}
 // hit: crack the egg
 window.SFX&&SFX.play('smash');st.remove();shake();
 const fl=el('sm-flash',`left:${x}px;top:${y}px;width:${w*1.4}px;height:${w*1.4}px`);kill(fl,400);
 if(egg){egg.animate([{transform:'scale(1)'},{transform:'scale(1.15,.85) rotate(-6deg)'},{transform:'scale(.9,1.1) rotate(6deg)'}],{duration:120});setTimeout(()=>egg.remove(),110);}
 const yolk=el('sm-yolk',`left:${x}px;top:${y+w*.08}px;width:${w*.9}px;height:${w*.62}px`);
 yolk.animate([{transform:'translate(-50%,-50%) scale(.1)'},{transform:'translate(-50%,-50%) scale(1.25,1.1)',offset:.35},{transform:'translate(-50%,-50%) scale(1)'}],{duration:450,easing:'ease-out',fill:'forwards'});
 setTimeout(()=>yolk.animate([{opacity:1},{opacity:0}],{duration:700,fill:'forwards'}),1700);kill(yolk,2450);
 for(const side of[0,1]){const h=el('sm-half',`left:${x-w*.25}px;top:${y-w*.32}px;width:${w*.5}px;height:${w*.62}px`,HALF(side));const s=side?1:-1;
  h.animate([{transform:'translate(0,0) rotate(0)'},{transform:`translate(${s*w*.55}px,${-w*.55}px) rotate(${s*50}deg)`,offset:.45},{transform:`translate(${s*w*.8}px,${w*.15}px) rotate(${s*110}deg)`,opacity:0}],{duration:900,easing:'cubic-bezier(.2,.7,.4,1)',fill:'forwards'});kill(h,920);}
 for(let i=0;i<10;i++){const sz=w*(.06+Math.random()*.08),d=el('sm-shard',`left:${x}px;top:${y}px;width:${sz}px;height:${sz*1.3}px`);const ang=Math.random()*Math.PI*2,r=w*(.5+Math.random()*.6);
  d.animate([{transform:'translate(-50%,-50%) rotate(0)'},{transform:`translate(calc(-50% + ${Math.cos(ang)*r}px),calc(-50% + ${Math.sin(ang)*r-w*.3}px)) rotate(${Math.random()*720}deg)`,opacity:1,offset:.6},{transform:`translate(calc(-50% + ${Math.cos(ang)*r*1.1}px),calc(-50% + ${Math.sin(ang)*r+w*.1}px)) rotate(${Math.random()*900}deg)`,opacity:0}],{duration:850,easing:'ease-out'});kill(d,870);}
 for(let i=0;i<6;i++){const d=el('sm-drop',`left:${x}px;top:${y}px;width:${w*.12}px;height:${w*.12}px`);const ang=Math.PI*(1.1+.8*i/5),r=w*(.45+Math.random()*.35);
  d.animate([{transform:'translate(-50%,-50%) scale(.4)'},{transform:`translate(calc(-50% + ${Math.cos(ang)*r}px),calc(-50% + ${Math.sin(ang)*r*.5}px)) scale(1)`}],{duration:380,easing:'ease-out',fill:'forwards'});setTimeout(()=>d.animate([{opacity:1},{opacity:0}],{duration:700,fill:'forwards'}),1700);kill(d,2450);}}
window.SMASH={kind,play,update(S,prev){const la=S&&S.lastAction;if(!la||la.type!=='throw'||!la.from){lastSig=la?JSON.stringify(la)+S.round:null;return;}
 const sig=JSON.stringify(la)+S.round;if(!prev||sig===lastSig){lastSig=sig;return;}lastSig=sig;
 if(prev.turn==='red'&&(S.turn==='blue'||S.phase==='over'))requestAnimationFrame(()=>play(S,la));}};
})();
