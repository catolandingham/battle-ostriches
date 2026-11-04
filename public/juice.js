// Theme juice for the bold set (storm / volcano / comic / pharaoh): extra flashes, particles and words
// layered on top of the shared stone-smash animation. Pure visuals, driven by smash.js events.
(function(){
let L;const th=()=>document.documentElement.getAttribute('data-theme');
const ON={storm:1,volcano:1,comic:1,pharaoh:1};
const mk=(cls,css,html,tag)=>{if(!L){L=document.createElement('div');L.id='juice';document.body.appendChild(L);}const d=document.createElement(tag||'div');d.className=cls;if(css)d.style.cssText=css;if(html)d.innerHTML=html;L.appendChild(d);return d;};
const kill=(d,ms)=>setTimeout(()=>d.remove(),ms);
function flash(bg,ms,peak){const f=mk('j-flash',`background:${bg}`);f.animate([{opacity:0},{opacity:peak||.85,offset:.12},{opacity:.1,offset:.3},{opacity:peak?peak*.7:.6,offset:.42},{opacity:0}],{duration:ms,easing:'ease-out',fill:'forwards'});kill(f,ms+20);}
function parts(x,y,n,cols,spd,up,sz,ms){for(let i=0;i<n;i++){const s=sz*(.5+Math.random()),p=mk('j-p',`left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${cols[i%cols.length]};box-shadow:0 0 ${s}px ${cols[i%cols.length]}`);
 const a=Math.random()*Math.PI*2,r=spd*(.5+Math.random());const dx=Math.cos(a)*r,dy=Math.sin(a)*r-up;
 p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.8)`,opacity:1,offset:.5},{transform:`translate(calc(-50% + ${dx*1.2}px),calc(-50% + ${dy+up*1.4}px)) scale(.2)`,opacity:0}],{duration:ms*(.7+Math.random()*.5),easing:'cubic-bezier(.1,.7,.3,1)'});kill(p,ms*1.3);}}
function ring(x,y,r,col,ms,bw){const d=mk('j-p',`left:${x-r}px;top:${y-r}px;width:${2*r}px;height:${2*r}px;border:${bw||5}px solid ${col};box-shadow:0 0 14px ${col}`);d.animate([{transform:'scale(.1)',opacity:1},{transform:'scale(1)',opacity:0}],{duration:ms,easing:'ease-out',fill:'forwards'});kill(d,ms+20);}
function shake(px){const a=document.getElementById('app');a&&a.animate([0,1,2,3,4,5].map(i=>({transform:i==5?'none':`translate(${(Math.random()-.5)*px*2}px,${(Math.random()-.5)*px*2}px) rotate(${(Math.random()-.5)*px*.3}deg)`})),{duration:360});}
function bolt(x,y,w){let d=`M${x+(Math.random()-.5)*60} -10`,cx=x+(Math.random()-.5)*60,cy=-10;const n=7;for(let i=1;i<=n;i++){cy=-10+(y+10)*i/n;cx=i==n?x:cx+(x-cx)/(n-i+1)+(Math.random()-.5)*w*.9;d+=` L${cx} ${cy}`;}
 const s=mk('j-bolt',`width:100vw;height:100vh`,`<svg width="100%" height="100%" style="overflow:visible"><path d="${d}" fill="none" stroke="#9b5cff" stroke-width="10" opacity=".6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffe94a" stroke-width="1.5"/></svg>`);
 s.animate([{opacity:1},{opacity:.2,offset:.2},{opacity:1,offset:.35},{opacity:0}],{duration:420,fill:'forwards'});kill(s,440);}
function word(x,y,txt,col,rot,sz){const d=mk('j-word',`left:${x}px;top:${y}px;color:${col};font-size:${sz||34}px`,txt);
 d.animate([{transform:`translate(-50%,-50%) rotate(${rot}deg) scale(.2)`,opacity:1},{transform:`translate(-50%,-120%) rotate(${rot}deg) scale(1.35)`,offset:.2},{transform:`translate(-50%,-120%) rotate(${rot}deg) scale(1)`,offset:.35},{transform:`translate(-50%,-150%) rotate(${rot}deg) scale(1)`,opacity:1,offset:.8},{transform:`translate(-50%,-170%) rotate(${rot}deg) scale(.9)`,opacity:0}],{duration:1100,easing:'ease-out',fill:'forwards'});kill(d,1120);}
function burstStar(x,y,r,a,b){const d=mk('j-p',`left:${x-r}px;top:${y-r}px;width:${2*r}px;height:${2*r}px;border-radius:0`,`<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M20 1l4 11 11-5-5 11 9 5-11 3 3 12-9-8-6 10-2-12-12 1 8-9-8-9 12 1z" fill="${a}" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 10l2 6 6-2-3 6 5 3-6 1 1 6-5-4-3 5-1-6-6 0 4-5-4-4 6 0z" fill="${b}"/></svg>`);
 d.animate([{transform:'scale(.1) rotate(-30deg)'},{transform:'scale(1.2) rotate(8deg)',offset:.25},{transform:'scale(1) rotate(0)',offset:.5},{transform:'scale(1.05)',opacity:0}],{duration:900,fill:'forwards'});kill(d,920);}
function rays(x,y,r,col){const d=mk('j-p',`left:${x-r}px;top:${y-r}px;width:${2*r}px;height:${2*r}px;background:repeating-conic-gradient(${col} 0 10deg,transparent 10deg 30deg);-webkit-mask:radial-gradient(circle,transparent 18%,#000 20%,#000 50%,transparent 70%);mask:radial-gradient(circle,transparent 18%,#000 20%,#000 50%,transparent 70%)`);
 d.animate([{transform:'scale(.2) rotate(0)',opacity:1},{transform:'scale(1) rotate(60deg)',opacity:1,offset:.5},{transform:'scale(1.2) rotate(90deg)',opacity:0}],{duration:900,easing:'ease-out',fill:'forwards'});kill(d,920);}
document.addEventListener('bo-throw',e=>{const t=th();if(!ON[t])return;const{ax,ay,bx,by,w,T}=e.detail;
 if(t==='storm'){flash('#e6dcff',360,.35);}
 if(t==='volcano'){let i=0;const iv=setInterval(()=>{const k=i/9,x=ax+(bx-ax)*k,y=ay+(by-ay)*k-(w*1.3)*4*k*(1-k);parts(x,y,2,['#ff5a00','#ffd166'],w*.25,0,w*.12,500);if(++i>8)clearInterval(iv);},T/9);}
 if(t==='comic'){word((ax+bx)/2,Math.min(ay,by)-w*.6,'WHOOSH!','#fff',-8,20);}
 if(t==='pharaoh'){let i=0;const iv=setInterval(()=>{const k=i/9,x=ax+(bx-ax)*k,y=ay+(by-ay)*k-(w*1.3)*4*k*(1-k);parts(x,y,2,['#f5c542','#fff4d6'],w*.15,0,w*.09,500);if(++i>8)clearInterval(iv);},T/9);}});
document.addEventListener('bo-impact',e=>{const t=th();if(!ON[t])return;const{x,y,w,res}=e.detail,hit=res==='hit';
 if(t==='storm'){bolt(x,y,w);flash(hit?'#ffffff':'#c9b6ff',hit?520:380,hit?.9:.5);ring(x,y,w*(hit?1.8:1),'#3df2ff',500,4);if(hit){parts(x,y,18,['#ffe94a','#3df2ff','#fff'],w*1.3,w*.2,w*.12,700);shake(9);}}
 if(t==='volcano'){ring(x,y,w*(hit?2:1.1),'#ff5a00',600,hit?8:4);parts(x,y,hit?26:10,['#ff3d00','#ff7a1a','#ffd166','#fff1a8'],w*(hit?1.5:.8),w*.6,w*.14,900);if(hit){flash('radial-gradient(circle at '+x+'px '+y+'px,#ffb347,#ff3d0088 30%,transparent 70%)',500,.9);shake(10);}}
 if(t==='comic'){const W=hit?['POW!','SMASH!','KRAK!'][Math.random()*3|0]:(res==='feather'||res==='bounce')?'BONK!':'THUD!';burstStar(x,y,w*(hit?1.5:.9),hit?'#ff2d55':'#fff','#ffe600');word(x,y,W,hit?'#ffe600':'#1e6bff',hit?-12:8,hit?40:28);if(hit){shake(8);parts(x,y,12,['#ff2d55','#1e6bff','#ffe600','#fff'],w*1.2,w*.3,w*.16,700);}}
 if(t==='pharaoh'){rays(x,y,w*(hit?2.2:1.2),'#f5c542');ring(x,y,w*(hit?1.6:.9),'#2fd3c0',600,4);parts(x,y,hit?22:10,['#f5c542','#ffd76a','#2fd3c0','#d9412b'],w*(hit?1.3:.7),w*.4,w*.11,850);if(hit){flash('radial-gradient(circle at '+x+'px '+y+'px,#fff4d6,#f5c54266 30%,transparent 70%)',500,.8);shake(7);}}});
})();
