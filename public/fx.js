// Theme presentation layer (nature / neon). Pure visuals: sprites tween between squares, throw arcs, puffs, radar rings.
// Reads the same state the board shows; never touches rules. Classic theme: does nothing.
(function(){
const NS='http://www.w3.org/2000/svg';
const SPR={
 nature:{
  o:'<svg viewBox="0 0 40 40"><ellipse cx="20" cy="23" rx="11" ry="13" fill="#3b2f25"/><ellipse cx="20" cy="25" rx="8" ry="9" fill="#5a4a3a"/><path d="M14 17q-4 8 0 16M26 17q4 8 0 16" stroke="#e9e1d3" stroke-width="2" fill="none" opacity=".8"/><path d="M20 12 L20 4" stroke="#c9a98a" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="3.5" r="2.6" fill="#c9a98a"/><path d="M20 1 l0 -1" stroke="#6b5040" stroke-width="2"/></svg>',
  v:'<svg viewBox="0 0 40 40"><path d="M20 10 C8 12 2 18 1 22 C8 21 12 22 15 24 L20 34 L25 24 C28 22 32 21 39 22 C38 18 32 12 20 10Z" fill="#5b4a3c"/><path d="M6 20 C10 19 13 19 15 21 M34 20 C30 19 27 19 25 21" stroke="#8c7663" stroke-width="1.5" fill="none"/><circle cx="20" cy="9" r="3.6" fill="#e6d3b0"/><path d="M20 4 l-1.5 3 h3z" fill="#e3a24a"/></svg>'},
 notes:{
  o:'<svg viewBox="0 0 40 40" fill="none" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="20" cy="24" rx="10" ry="12" fill="#efe4c8"/><path d="M13 18q-3 7 0 14M27 18q3 7 0 14M16 22l8 0M15 26l10 0M16 30l8 0" stroke-width="1"/><path d="M20 12V4"/><circle cx="20" cy="3.5" r="2.4" fill="#efe4c8"/><path d="M20 1v-1.5" stroke-width="2"/></svg>',
  v:'<svg viewBox="0 0 40 40" fill="none" stroke="#2b2118" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10C8 12 2 18 1 22c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-4-7-10-19-12z" fill="#efe4c8"/><path d="M5 20l3-2M9 21l3-2M31 20l-3-2M35 21l-3-2M18 26l4 0M18 29l4 0" stroke-width="1"/><circle cx="20" cy="9" r="3.4" fill="#efe4c8"/><path d="M20 4l-1.5 3h3z" fill="#2b2118"/></svg>'},
 golden:{
  o:'<svg viewBox="0 0 40 40"><ellipse cx="20" cy="23" rx="11" ry="13" fill="#1d1008"/><path d="M10 18q-2 6 1 12" stroke="#ffb347" stroke-width="1.6" fill="none"/><path d="M20 12V4" stroke="#1d1008" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="3.5" r="2.6" fill="#1d1008"/><path d="M14 13q6-3 12 0" stroke="#ffcf7a" stroke-width="1" fill="none" opacity=".8"/></svg>',
  v:'<svg viewBox="0 0 40 40"><path d="M20 10C8 12 2 18 1 22c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-4-7-10-19-12z" fill="#1d1008"/><path d="M3 20C8 15 14 13 20 13s12 2 17 7" stroke="#ffb347" stroke-width="1.4" fill="none"/><circle cx="20" cy="9" r="3.6" fill="#1d1008"/></svg>'},
 paper:{
  o:'<svg viewBox="0 0 40 40" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"><path d="M9 23l5-11 12 0 5 11-4 11-14 0z" fill="#3d6b8f"/><path d="M14 20l12 0-2 9-8 0z" fill="#f2efe6" stroke-width="0"/><path d="M18 12h4V3h-4z" fill="#e8a66a"/></svg>',
  v:'<svg viewBox="0 0 40 40" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"><path d="M2 21l18-10 18 10-12 3-6 10-6-10z" fill="#6b3a5a"/><path d="M16 8h8v6h-8z" fill="#f4d9b0"/><path d="M18 5l2-3 2 3z" fill="#f2a33a"/></svg>'},
 arcade:{o:"<svg viewBox=\"0 0 10 10\" shape-rendering=\"crispEdges\"><rect x=\"4\" y=\"0\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"5\" y=\"0\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"1\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"5\" y=\"1\" width=\"1\" height=\"1\" fill=\"#f2c14e\"/><rect x=\"4\" y=\"2\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"3\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"2\" y=\"4\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"3\" y=\"4\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"4\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"5\" y=\"4\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"6\" y=\"4\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"1\" y=\"5\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"2\" y=\"5\" width=\"1\" height=\"1\" fill=\"#ffffff\"/><rect x=\"3\" y=\"5\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"5\" width=\"1\" height=\"1\" fill=\"#ffffff\"/><rect x=\"5\" y=\"5\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"6\" y=\"5\" width=\"1\" height=\"1\" fill=\"#ffffff\"/><rect x=\"7\" y=\"5\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"1\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"2\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"3\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"5\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"7\" y=\"6\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"2\" y=\"7\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"3\" y=\"7\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"4\" y=\"7\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"5\" y=\"7\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"6\" y=\"7\" width=\"1\" height=\"1\" fill=\"#222034\"/><rect x=\"3\" y=\"8\" width=\"1\" height=\"1\" fill=\"#e8a66a\"/><rect x=\"6\" y=\"8\" width=\"1\" height=\"1\" fill=\"#e8a66a\"/><rect x=\"3\" y=\"9\" width=\"1\" height=\"1\" fill=\"#e8a66a\"/><rect x=\"6\" y=\"9\" width=\"1\" height=\"1\" fill=\"#e8a66a\"/></svg>",v:"<svg viewBox=\"0 0 10 8\" shape-rendering=\"crispEdges\"><rect x=\"4\" y=\"0\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"5\" y=\"0\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"3\" y=\"1\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"4\" y=\"1\" width=\"1\" height=\"1\" fill=\"#ffcd75\"/><rect x=\"5\" y=\"1\" width=\"1\" height=\"1\" fill=\"#ffcd75\"/><rect x=\"6\" y=\"1\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"0\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"1\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"2\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"3\" y=\"2\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"4\" y=\"2\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"5\" y=\"2\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"6\" y=\"2\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"7\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"8\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"9\" y=\"2\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"0\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"1\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"2\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"3\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"4\" y=\"3\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"5\" y=\"3\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"6\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"7\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"8\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"9\" y=\"3\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"1\" y=\"4\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"2\" y=\"4\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"4\" y=\"4\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"5\" y=\"4\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"7\" y=\"4\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"8\" y=\"4\" width=\"1\" height=\"1\" fill=\"#5d275d\"/><rect x=\"4\" y=\"5\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"5\" y=\"5\" width=\"1\" height=\"1\" fill=\"#b13e53\"/><rect x=\"4\" y=\"6\" width=\"1\" height=\"1\" fill=\"#b13e53\"/></svg>"},
 toybox:{
  o:'<svg viewBox="0 0 40 40"><defs><radialGradient id="tg1" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9fe0ff"/><stop offset=".5" stop-color="#2f8fd8"/><stop offset="1" stop-color="#174a7a"/></radialGradient></defs><ellipse cx="20" cy="25" rx="12" ry="11" fill="url(#tg1)"/><rect x="17" y="5" width="6" height="14" rx="3" fill="url(#tg1)"/><circle cx="20" cy="6" r="4.5" fill="url(#tg1)"/><ellipse cx="16" cy="20" rx="4" ry="2.5" fill="#fff" opacity=".55"/><circle cx="18.5" cy="5" r="1.2" fill="#fff"/></svg>',
  v:'<svg viewBox="0 0 40 40"><defs><radialGradient id="tg2" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffb0c8"/><stop offset=".5" stop-color="#e0407a"/><stop offset="1" stop-color="#7a1a3e"/></radialGradient></defs><path d="M3 22c4-9 30-9 34 0-6 1-10 2-12 5l-5 7-5-7c-2-3-6-4-12-5z" fill="url(#tg2)"/><circle cx="20" cy="12" r="6" fill="url(#tg2)"/><ellipse cx="17" cy="10" rx="2.4" ry="1.4" fill="#fff" opacity=".7"/><path d="M20 4l-2 4h4z" fill="#ffb03a"/></svg>'},
 tactical:{
  o:'<svg viewBox="0 0 40 40" fill="none" stroke="#7dffb0" stroke-width="2"><circle cx="20" cy="20" r="8" fill="#7dffb033"/><path d="M20 4v8M20 28v8M4 20h8M28 20h8"/><text x="20" y="23.5" font-size="9" text-anchor="middle" fill="#7dffb0" stroke="none" font-family="monospace">O</text></svg>',
  v:'<svg viewBox="0 0 40 40" fill="none" stroke="#ff6b5a" stroke-width="2"><path d="M20 6l14 26H6z" fill="#ff6b5a33"/><text x="20" y="27" font-size="9" text-anchor="middle" fill="#ff6b5a" stroke="none" font-family="monospace">V</text></svg>'},
 storm:{o:'<svg viewBox="0 0 40 40" stroke="#3df2ff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M14 33l-2 6M26 33l2 6" fill="none" stroke="#f3ecff" stroke-width="2.5"/><ellipse cx="20" cy="24" rx="12" ry="11" fill="#f3ecff"/><path d="M12 22q8-5 16 0" fill="none" stroke="#9b5cff" stroke-width="2"/><path d="M20 15V5" fill="none" stroke="#f3ecff" stroke-width="3.5"/><circle cx="20" cy="5" r="3.6" fill="#f3ecff"/><path d="M22 4l5 1-5 2z" fill="#ffe94a"/></svg>',v:'<svg viewBox="0 0 40 40" stroke="#3df2ff" stroke-width="1.4" stroke-linejoin="round"><path d="M20 12C8 13 2 18 1 23c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-5-7-10-19-11z" fill="#0a0318"/><path d="M1 23c3-1 6-1 8 0l-2-4zM39 23c-3-1-6-1-8 0l2-4z" fill="#ffe94a"/><circle cx="20" cy="10" r="4.4" fill="#2a1a4e"/><path d="M18 6.5l2-4 2 4z" fill="#ffe94a"/><circle cx="18.4" cy="9.4" r="1" fill="#ffe94a" stroke="none"/><circle cx="21.6" cy="9.4" r="1" fill="#ffe94a" stroke="none"/></svg>'},
 volcano:{o:'<svg viewBox="0 0 40 40" stroke="#ff7a1a" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M14 33l-2 6M26 33l2 6" fill="none" stroke="#ffb347" stroke-width="2.5"/><ellipse cx="20" cy="24" rx="12" ry="11" fill="#2a1f1c"/><path d="M11 24q9-6 18 0" fill="none" stroke="#ff5a00" stroke-width="1.5"/><path d="M20 15V5" fill="none" stroke="#ffb347" stroke-width="3.5"/><circle cx="20" cy="5" r="3.6" fill="#ffb347"/><path d="M22 4l5 1-5 2z" fill="#ffd166"/></svg>',v:'<svg viewBox="0 0 40 40" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><path d="M20 12C8 13 2 18 1 23c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-5-7-10-19-11z" fill="#3a0d06"/><path d="M1 23c3-1 6-1 8 0l-2-4zM39 23c-3-1-6-1-8 0l2-4z" fill="#ff5a00"/><circle cx="20" cy="10" r="4.4" fill="#c8a090"/><path d="M18 6.5l2-4 2 4z" fill="#ffd166"/><circle cx="18.4" cy="9.4" r="1" fill="#fff1a8" stroke="none"/><circle cx="21.6" cy="9.4" r="1" fill="#fff1a8" stroke="none"/></svg>'},
 comic:{o:'<svg viewBox="0 0 40 40" stroke="#000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M14 33l-2 6M26 33l2 6" fill="none" stroke="#ffb3c8" stroke-width="2.5"/><ellipse cx="20" cy="24" rx="12" ry="11" fill="#1e6bff"/><ellipse cx="16" cy="20" rx="4" ry="2.4" fill="#fff" stroke="none"/><path d="M20 15V5" fill="none" stroke="#ffb3c8" stroke-width="3.5"/><circle cx="20" cy="5" r="3.6" fill="#ffb3c8"/><path d="M22 4l5 1-5 2z" fill="#ffe600"/></svg>',v:'<svg viewBox="0 0 40 40" stroke="#000" stroke-width="2.2" stroke-linejoin="round"><path d="M20 12C8 13 2 18 1 23c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-5-7-10-19-11z" fill="#ff2d55"/><path d="M1 23c3-1 6-1 8 0l-2-4zM39 23c-3-1-6-1-8 0l2-4z" fill="#000"/><circle cx="20" cy="10" r="4.4" fill="#ffe0a0"/><path d="M18 6.5l2-4 2 4z" fill="#ffe600"/><circle cx="18.4" cy="9.4" r="1" fill="#000" stroke="none"/><circle cx="21.6" cy="9.4" r="1" fill="#000" stroke="none"/></svg>'},
 pharaoh:{o:'<svg viewBox="0 0 40 40" stroke="#07123f" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M14 33l-2 6M26 33l2 6" fill="none" stroke="#f5c542" stroke-width="2.5"/><ellipse cx="20" cy="24" rx="12" ry="11" fill="#2fd3c0"/><path d="M10 22h20M11 26h18" fill="none" stroke="#f5c542" stroke-width="1.6"/><path d="M20 15V5" fill="none" stroke="#f5c542" stroke-width="3.5"/><circle cx="20" cy="5" r="3.6" fill="#f5c542"/><path d="M22 4l5 1-5 2z" fill="#d9412b"/></svg>',v:'<svg viewBox="0 0 40 40" stroke="#07123f" stroke-width="1.4" stroke-linejoin="round"><path d="M20 12C8 13 2 18 1 23c7-1 11 0 14 2l5 10 5-10c3-2 7-3 14-2-1-5-7-10-19-11z" fill="#fff4d6"/><path d="M1 23c3-1 6-1 8 0l-2-4zM39 23c-3-1-6-1-8 0l2-4z" fill="#07123f"/><circle cx="20" cy="10" r="4.4" fill="#f5c542"/><path d="M18 6.5l2-4 2 4z" fill="#d9412b"/><circle cx="18.4" cy="9.4" r="1" fill="#07123f" stroke="none"/><circle cx="21.6" cy="9.4" r="1" fill="#07123f" stroke="none"/></svg>'},
 neon:{
  o:'<svg viewBox="0 0 40 40" fill="none" stroke="#38d6f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 27 C9 19 16 17 22 19 L28 6 L33 7"/><path d="M9 27 C14 31 24 31 27 24 L22 19"/><path d="M16 30 L14 37 M21 30 L23 37"/></svg>',
  v:'<svg viewBox="0 0 40 40" fill="none" stroke="#e04cff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z"/><circle cx="20" cy="10" r="4"/><path d="M23 10 L28 12 L23 13"/></svg>'}};
// One look per animal in every theme (Brian, 2026-11-08): the moving sprites use the same locked drawings as the board, upright.
if(window.ART)for(const t in SPR){SPR[t].o=window.ART.ostrich;SPR[t].v=window.ART.vulture;}
const TH={storm:{sz:1.08,th:'stone'},volcano:{sz:1.08,th:'stone'},comic:{sz:1.1,th:'stone',hop:1,squash:1},pharaoh:{sz:1.08,th:'stone'},nature:{sz:1.05,th:'stone',dust:'#d9c296'},neon:{sz:.9,th:'laser',col:'#ff5bd6',ring:1},notes:{sz:1,th:'ink',col:'#2b2118',blot:['#c0563f88','#d9a44a77','#7a9c6a66']},golden:{sz:1.05,th:'stone',dust:'#ffc46b',glow:1},paper:{sz:1,th:'stone',dust:'confetti',hop:1},arcade:{sz:.95,th:'stone',dust:'pixel',steps:1},toybox:{sz:1.02,th:'stone',dust:'#ffffff',hop:1,squash:1},tactical:{sz:.85,th:'ink',ink:'tacarc',ret:1,ring:1,rcol:'#7dffb0',blot:['#7dffb055','#7dffb033','#7dffb044']}};
let layer,spr={},last={},theme=()=>document.documentElement.getAttribute('data-theme');
function cellRect(x,y,S){const b=document.getElementById('board');const c=b&&b.children[y*S.cfg.cols+x];if(!c)return null;const r=c.getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};}
function ensure(){if(!layer){layer=document.createElement('div');layer.id='fx';document.body.appendChild(layer);}}
function sprite(id,svg,S,p,sz,off){let r=cellRect(p[0],p[1],S);if(!r)return;
 const cell=document.getElementById('board').children[p[1]*S.cfg.cols+p[0]],pc=cell&&cell.querySelector(id==='o'?'.pc.po':'.pc.pv');
 // The themed sprite must use the same separated animal slot as the SVG board piece.
 if(cell&&cell.querySelector('.cm-egg')&&pc){const q=pc.getBoundingClientRect();r={x:q.left+scrollX,y:q.top+scrollY,w:q.width,h:q.height};sz=1;off=0;}
 if(off){r={x:r.x+off*r.w*.2,y:r.y+off*r.h*.2,w:r.w*.6,h:r.h*.6};}let e=spr[id];
 if(!e||e.dataset.svg!==svg){if(e)e.remove();e=document.createElement('div');e.className='spr spr-'+id;e.innerHTML=svg;e.dataset.svg=svg;layer.appendChild(e);spr[id]=e;e.style.transition='none';}
 const s=r.w*(sz||1),tx=r.x+(r.w-s)/2,ty=r.y+(r.h-s)/2,prev=e.dataset.pos,np=p.join(',');
 e.style.width=e.style.height=s+'px';
 if(prev&&prev!==np){const ang=0; // faces stay upright (the old top-down sprites turned toward the move)
  e.style.setProperty('--rot',ang+'deg');
  const C=TH[theme()]||{};if(C.hop){const ox=e._tx||tx,oy=e._ty||ty,rot=ang+'deg';e.style.transition='none';e.style.transform=`translate(${tx}px,${ty}px) rotate(${rot})`;e.animate([{transform:`translate(${ox}px,${oy}px) rotate(${rot}) scale(1)`},...(C.squash?[{transform:`translate(${ox}px,${oy}px) rotate(${rot}) scale(1.25,.75)`,offset:.15}]:[]),{transform:`translate(${(ox+tx)/2}px,${(oy+ty)/2-r.h*.55}px) rotate(${rot}) scale(1.18)`,offset:.5},...(C.squash?[{transform:`translate(${tx}px,${ty}px) rotate(${rot}) scale(1.3,.7)`,offset:.85}]:[]),{transform:`translate(${tx}px,${ty}px) rotate(${rot}) scale(1)`}],{duration:C.squash?620:520,easing:'ease-in-out'});}
  else requestAnimationFrame(()=>{e.style.transition=C.steps?'transform .45s steps(4,end)':'transform .45s cubic-bezier(.4,.1,.3,1)';e.style.transform=`translate(${tx}px,${ty}px) rotate(var(--rot))`;});
  if(C.ring){ring(r.x+r.w/2,r.y+r.h/2,r.w*(C.rcol?1.6:.9),C.rcol||(id==='o'?'#38d6f0':'#e04cff'),C.rcol?.9:.5);}
 } else {e.style.transform=`translate(${tx}px,${ty}px) rotate(var(--rot,0deg))`;}
 e.dataset.pos=np;e._tx=tx;e._ty=ty;}
function ring(cx,cy,rad,col,dur,cls){const d=document.createElement('div');d.className='fxring '+(cls||'');d.style.cssText=`left:${cx-rad}px;top:${cy-rad}px;width:${rad*2}px;height:${rad*2}px;border-color:${col};animation-duration:${dur}s`;layer.appendChild(d);setTimeout(()=>d.remove(),dur*1000+50);}
function throwFx(S,from,to,result){const a=cellRect(from[0],from[1],S),b=cellRect(to[0],to[1],S);if(!a||!b)return;
 const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2,t=theme(),C=TH[t],T=C.th==='laser'?350:C.th==='ink'?700:600;
 if(C.th!=='stone'){const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','fxsvg');const minx=Math.min(ax,bx)-60,miny=Math.min(ay,by)-80;
  svg.style.cssText=`left:${minx}px;top:${miny}px;width:${Math.abs(ax-bx)+120}px;height:${Math.abs(ay-by)+140}px`;
  const pth=document.createElementNS(NS,'path');const mx=(ax+bx)/2-minx,my=Math.min(ay,by)-miny-50;
  pth.setAttribute('d',`M${ax-minx} ${ay-miny} Q${mx} ${my} ${bx-minx} ${by-miny}`);pth.setAttribute('class',C.ink||(C.th==='ink'?'inkarc':'laser'));if(C.ret){const R=document.createElement('div');R.className='fxret';R.style.left=bx+'px';R.style.top=by+'px';layer.appendChild(R);setTimeout(()=>R.remove(),T+500);}svg.appendChild(pth);layer.appendChild(svg);
  const L=pth.getTotalLength();pth.style.strokeDasharray=L;pth.style.strokeDashoffset=L;pth.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:T,easing:'ease-out',fill:'forwards'});
  setTimeout(()=>{svg.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'});C.th==='ink'?blot(bx,by,result,C):burst(bx,by,result);},T);setTimeout(()=>svg.remove(),T+400);}
 else{const s=document.createElement('div');s.className='fxstone'+(C.glow?' glow':'')+(C.hop&&!C.squash?' paper':'')+(C.steps?' pix':'')+(C.squash?' toy':'');layer.appendChild(s);
  s.animate([{transform:`translate(${ax}px,${ay}px) scale(1)`},{transform:`translate(${(ax+bx)/2}px,${Math.min(ay,by)-70}px) scale(1.5)`},{transform:`translate(${bx}px,${by}px) scale(.9)`}],{duration:T,easing:C.steps?'steps(6,end)':'ease-in'});
  setTimeout(()=>{s.remove();puff(bx,by,result,C);},T-10);}}
const CONF=['#e86a4a','#f2c14e','#5aa9a0','#fff','#3d6b8f'];
function blot(x,y,result,C){for(let i=0;i<5;i++){const d=document.createElement('div');d.className='fxblot';d.style.left=x+'px';d.style.top=y+'px';d.style.background=result==='hit'?'#e0a630aa':C.blot[i%3];layer.appendChild(d);const a=Math.random()*6.28,r=4+Math.random()*12;
  d.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px)) scale(1.3)`,opacity:.9,offset:.35},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px)) scale(1.5)`,opacity:0}],{duration:1100,easing:'ease-out'});setTimeout(()=>d.remove(),1150);}}
function puff(x,y,result,C){C=C||{};for(let i=0;i<(C.dust==='confetti'?10:7);i++){const d=document.createElement('div');d.className='fxdust'+(C.dust==='confetti'?' conf':'')+(C.dust==='pixel'?' pixd':'')+(C.glow?' glow':'');if(C.dust==='confetti')d.style.background=CONF[i%5];else if(C.dust==='pixel')d.style.background=result==='hit'?['#f2c14e','#ffffff','#e8a66a'][i%3]:['#a7f070','#73eff7','#ffffff'][i%3];else if(C.dust)d.style.background=C.dust;d.style.left=x+'px';d.style.top=y+'px';layer.appendChild(d);
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
 if(!TH[t]||!S||S.phase==='setupEggs'){for(const k in spr){spr[k].remove();delete spr[k];}return;}
 orientPrints(S);
 const sz=TH[t].sz;
 const onB=(p,side)=>{if(!p||p[0]<0||p[1]<0)return false;const b=S.h3&&S.h3.birds;if(!b)return true;if(S.h3.team){const me=S.h3.mySeat;if(side==='o'&&(me==='o1'||me==='o2')&&b[me]&&b[me].out)return false;if(side==='v'&&(me==='v1'||me==='v2')&&b[me]&&b[me].out)return false;return true;}if(side==='o'&&b.blue&&b.blue.out)return false;if(side==='v'&&b.red&&b.red.out)return false;return true;};
 const both=onB(S.ostrich,'o')&&onB(S.vulture,'v')&&S.ostrich+''===S.vulture+''; // share a square: shrink both and offset so neither hides the other
 if(onB(S.ostrich,'o'))sprite('o',SPR[t].o,S,S.ostrich,sz,both?1:0);else if(spr.o){spr.o.remove();delete spr.o;}
 if(onB(S.vulture,'v'))sprite('v',SPR[t].v,S,S.vulture,S.role==='blue'?.8:sz,both?-1:0);else if(spr.v){spr.v.remove();delete spr.v;}
 const la=S.lastAction,sig=la&&JSON.stringify([S.round,S.turn,la]);
 if(prev&&la&&sig!==last.sig&&prev.turn==='red'&&S.turn==='blue'){
  if(la.type==='throw'&&!window.SMASH)throwFx(S,S.vulture,la.p,la.result);
  if(la.type==='fly'&&la.smell&&S.role==='red'&&TH[t].ring){const r=cellRect(S.vulture[0],S.vulture[1],S);if(r)ring(r.x+r.w/2,r.y+r.h/2,r.w*(S.cfg.smellRange+.5),'#5effa0',1.4,'radar');}}
 last.sig=sig;},
 relayout(){for(const k in spr)spr[k].dataset.pos='';}};
addEventListener('resize',()=>FX.relayout());
})();
// Cause before result (Brian's D36: never show a result without its cause). Four short marks, each at most 0.7 s, each drawn only
// on a screen that already holds the facts: the stone flight (vulture, own landing), the carried egg (ostrich, own move), the badger
// sinking into its mound (badger, own burrow) and the cold egg dimming (any screen whose last state listed that egg with a square).
// Marks are classes on the board squares (fxpick, fxcarry, fxcold, fxburrow) and the stone chip (fxfill). The board is rebuilt on every
// state, so run() re-applies a live mark with a negative delay and it carries on from where it was. Nothing here changes turn timing.
(function(){
const MS={pick:700,carry:560,cold:700,burrow:700},RMS=200,HOLD=.85;
let layer=null,act=[],last={},cur=null;
const rm=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
const ensure=()=>{if(!layer||!layer.isConnected){layer=document.createElement('div');layer.id='causefx';document.body.appendChild(layer);}};
const cellAt=(board,S,p)=>p&&p[0]>=0&&p[1]>=0?board.children[p[1]*S.cfg.cols+p[0]]:null;
const mid=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
// a fixed box that travels from a to b (each {x,y,s}: centre and size)
function box(html,a,b,d,arc,cls){ensure();const e=document.createElement('div');e.className='fxc-box '+(cls||'');e.innerHTML=html;e.style.width=e.style.height=b.s+'px';layer.appendChild(e);
 const tf=(c,sc,up)=>`translate(${c.x-b.s/2}px,${c.y-b.s/2-(up||0)}px) scale(${sc})`;
 e.animate([{transform:tf(a,a.s/b.s)},{transform:tf({x:(a.x+b.x)/2,y:(a.y+b.y)/2},(a.s+b.s)/2/b.s,arc||0),offset:.5},{transform:tf(b,1)}],{duration:d,easing:'ease-in-out',fill:'forwards'});
 setTimeout(()=>e.remove(),d+40);return e;}
const mark=(el,a)=>{el.style.setProperty('--fxd',a.d+'ms');el.style.setProperty('--fxdel',-(Date.now()-a.t0)+'ms');};
// the count keeps showing its old number (a pseudo-element) while the real text already holds the new one
function hold(el,old){if(!el)return;if(!el.classList.contains('fxheld')){const cs=getComputedStyle(el);el.style.setProperty('--held',cs.color);el.style.setProperty('--heldsh',cs.textShadow);}el.dataset.old=old;el.classList.add('fxheld');}
function release(el){if(!el)return;el.classList.remove('fxheld');el.removeAttribute('data-old');el.style.removeProperty('--held');el.style.removeProperty('--heldsh');}
function strip(){document.querySelectorAll('.fxpick,.fxcarry,.fxcold,.fxburrow,.fxfill').forEach(e=>{e.classList.remove('fxpick','fxcarry','fxslide','fxslideo','fxcold','fxburrow','fxfill');e.style.removeProperty('--fxd');e.style.removeProperty('--fxdel');});
 document.querySelectorAll('.fxghost,.fxsink').forEach(e=>e.remove());document.querySelectorAll('.fxheld').forEach(release);}
function apply(S,board){const t=Date.now();act=act.filter(a=>t<a.t0+a.d);
 for(const a of act){
  if(a.kind==='pick'){const c=cellAt(board,S,a.at);if(c){c.classList.add('fxpick');mark(c,a);}
   const chip=document.querySelector('#stats .hs');if(chip){chip.classList.add('fxfill');mark(chip,a);}
   if(t<a.t0+a.d*HOLD)hold(document.getElementById('stonesLeft'),a.old);}
  else if(a.kind==='carry'){const c=cellAt(board,S,a.at);if(c){c.classList.add('fxcarry');if(a.egg)c.classList.add('fxslide');if(a.ost)c.classList.add('fxslideo');mark(c,a);}}
  else if(a.kind==='cold'){const c=cellAt(board,S,a.at);if(c){c.classList.add('fxcold');mark(c,a);
    if(!c.querySelector('.fxghost')){const g=document.createElement('span');g.className='fxghost';g.innerHTML=a.html;c.appendChild(g);mark(g,a);}}
   hold(document.getElementById('eggsLeft'),a.old);}
  else if(a.kind==='burrow'){const c=cellAt(board,S,a.at),pc=c&&c.querySelector('.pc.ph.bur');if(c&&pc){c.classList.add('fxburrow');mark(c,a);
    if(!pc.querySelector('.fxsink')&&a.art){const s=document.createElement('span');s.className='fxsink';s.innerHTML='<span>'+a.art+'</span>';pc.appendChild(s);mark(s,a);}}}}}
function add(kind,o){const a=Object.assign({kind,t0:Date.now(),d:rm()?RMS:MS[kind]},o);act.push(a);
 setTimeout(()=>{act=act.filter(x=>Date.now()<x.t0+x.d);strip();if(cur)apply(cur.S,cur.board);},a.d+30);
 if(kind==='pick')setTimeout(()=>{if(!act.some(x=>x.kind==='pick'&&Date.now()<x.t0+x.d*HOLD))release(document.getElementById('stonesLeft'));},a.d*HOLD+10);return a;}
const once=(kind,S,la)=>{const sig=JSON.stringify([S.code,S.round,S.turn,kind,la||null]);if(last[kind]===sig)return false;last[kind]=sig;return true;};
function detect(S,prev,board,ic){if(!prev||S.god||!S.cfg)return;
 const la=S.lastAction,own=!!prev.myTurn&&!S.myTurn,fast=rm();
 // 1. the vulture's own landing on a rock pile: a stone leaves the pile and drops into the stone count
 if(S.role==='red'&&own&&prev.phase==='play'&&la&&la.type==='fly'&&la.refill&&S.vulture&&S.vulture[0]>=0&&once('pick',S,la)){
  const c=cellAt(board,S,S.vulture),chip=document.querySelector('#stats .hs svg');
  const a=add('pick',{at:S.vulture.slice(),old:prev.stones+'/'+S.cfg.stones});
  if(c&&chip&&!fast){const r=c.getBoundingClientRect(),q=chip.getBoundingClientRect(),w=Math.max(18,q.width);box(ic.stone,{...mid(r),s:r.width*.55},{...mid(q),s:w},a.d*HOLD,r.width*.9,'fxc-stone');}}
 // 2. the ostrich's own carry: the egg (and, with no sprite layer, the ostrich) slides from the old square to the new one
 if(S.role==='blue'&&own&&prev.phase==='play'&&la&&la.type==='carry'&&prev.ostrich&&S.ostrich&&prev.ostrich[0]>=0&&S.ostrich[0]>=0&&(prev.ostrich[0]!==S.ostrich[0]||prev.ostrich[1]!==S.ostrich[1])&&once('carry',S,la)){
  const f=cellAt(board,S,prev.ostrich),c=cellAt(board,S,S.ostrich);
  const a=add('carry',{at:S.ostrich.slice(),egg:!!(f&&c&&!fast)});
  if(f&&c&&!fast){const fr=f.getBoundingClientRect(),tr=c.getBoundingClientRect();
   const em=c.querySelector('.cm-egg'),er=em&&em.getBoundingClientRect();box(ic.egg,{...mid(fr),s:fr.width*.5},er?{...mid(er),s:Math.max(er.width,er.height)}:{x:tr.left+tr.width*.26,y:tr.top+tr.height*.32,s:tr.width*.5},a.d,tr.width*.5,'fxc-egg');
   if(!document.querySelector('#fx .spr-o')){const po=c.querySelector('.pc.po');if(po){a.ost=true;const pr=po.getBoundingClientRect();
    box(po.innerHTML,{x:fr.left+(pr.left-tr.left)+pr.width/2,y:fr.top+(pr.top-tr.top)+pr.height/2,s:pr.width},{...mid(pr),s:pr.width},a.d,tr.width*.15,'fxc-ost');}}}}
 // 3. an egg that was on the list with a square last state and is gone now, without a smash on it, went cold
 if(prev.eggs&&S.eggs&&once('cold',S,S.eggsLeft)){
  S.eggs.forEach((e,i)=>{const pe=prev.eggs[i];if(!pe||!pe.alive||e.alive||!pe.pos||pe.pos[0]<0)return;
   if(S.marks&&S.marks[pe.pos[0]+','+pe.pos[1]]==='hit')return;
   if(la&&la.type==='throw'&&la.result==='hit'&&la.p&&la.p[0]===pe.pos[0]&&la.p[1]===pe.pos[1])return;
   add('cold',{at:pe.pos.slice(),old:String(prev.eggsLeft),html:ic.egg+ic.ring(0)});});}
 // 4. the badger's own burrow: the badger sinks into the mound
 if(S.role==='hunter'&&S.burrowed&&!prev.burrowed&&prev.phase==='play'&&S.hunter&&S.hunter[0]>=0&&once('burrow',S,null)){
  const k=window.T3UI&&T3UI.KIND&&T3UI.KIND.badger;add('burrow',{at:S.hunter.slice(),art:k?k.art:''});}}
window.CAUSE={run(S,prev,board,ic){if(!S||!board)return;cur={S,board};detect(S,prev,board,ic);apply(S,board);},
 _active:()=>act.map(a=>a.kind)};
})();
