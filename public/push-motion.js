// Viewer-only push motion. Inputs are already-redacted server views; never guess a hidden destination.
(function(root){
 const valid=p=>Array.isArray(p)&&p[0]>=0&&p[1]>=0;
 const same=(a,b)=>valid(a)&&valid(b)&&a[0]===b[0]&&a[1]===b[1];
 function positions(s){const m={},h=s.h3||{},seat=h.mySeat;
  if(valid(s.ostrich))m[seat&&/^o/.test(seat)?seat:'blue']=s.ostrich;
  if(valid(s.vulture))m[seat&&/^v/.test(seat)?seat:'red']=s.vulture;
  for(const p of h.pieces||[])if(valid(p.p))m[p.seat]=p.p;
  for(const p of h.hunters||[])if(valid(p.p))m[p.kind]=p.p;
  if(valid(h.hunter))m[h.kind||s.kind||'hyena']=h.hunter;
  if(s.role==='hunter'&&valid(s.hunter))m[s.kind||h.kind||'hyena']=s.hunter;
  return m;
 }
 function path(cfg,from,to,wrap=false,max=3){
  if(!valid(from)||!valid(to)||same(from,to))return [];
  for(let n=1;n<=max;n++)for(const dx of [-1,0,1])for(const dy of [-1,0,1]){if(!dx&&!dy)continue;
   const points=[from.slice()];for(let k=1;k<=n;k++){let x=from[0]+dx*k,y=from[1]+dy*k;if(wrap){x=(x+cfg.cols*max)%cfg.cols;y=(y+cfg.rows*max)%cfg.rows;}points.push([x,y]);}
   if(same(points[n],to)&&points.every(p=>p[0]<cfg.cols&&p[1]<cfg.rows&&p[0]>=0&&p[1]>=0))return points;
  }return [];
 }
 const fresh=(a,b)=>a&&(!b||a.seq!==b.seq);
 function events(s,prev){if(!prev||!s.cfg||!(s.phase==='play'||s.phase==='over'&&prev.phase==='play'))return [];const out=[],a=positions(prev),b=positions(s),h=s.h3||{},old=prev.h3||{};
  const add=(key,from,to,wrap,max)=>{const points=path(s.cfg,from,to,wrap,max);if(points.length>1&&!out.some(e=>e.key===key))out.push({key,points});};
  const lc=h.lastCatch;if(s.role!=='hunter'&&fresh(lc,old.lastCatch)&&!lc.ko&&valid(lc.at)&&valid(lc.to))add(lc.bird,lc.at,lc.to,false,2);
  if(fresh(s.kick,prev.kick)&&valid(s.kick.to))for(const key in b)if(same(b[key],s.kick.to)&&valid(a[key]))add(key,a[key],b[key],true,s.kick.moved||3);
  if(fresh(h.rival,old.rival)&&valid(h.rival.to)){const key=h.rival.by==='badger'?'hyena':'badger';add(key,a[key],h.rival.to,false,2);}
  if(fresh(h.burst,old.burst)&&valid(h.burst.to))add('hyena',a.hyena,h.burst.to,false,2);
  if(fresh(s.stoneNote,prev.stoneNote))for(const key in b)if(valid(a[key])&&!same(a[key],b[key]))add(key,a[key],b[key],false,2);
  return out;
 }
 function run(s,prev,board){if(typeof document==='undefined')return;const stage=document.getElementById('stage');if(!stage)return;
  const pending=events(s,prev),current=positions(s);
  // Duplicate state packets may redraw the board during a push. Keep the original
  // one-second clock and bind the newly drawn destination piece, rather than jumping.
  stage.querySelectorAll('.push-motion').forEach(layer=>{
   if(pending.length||!same(current[layer._key],layer._to)){layer._finish();return;}
   const c=board.children[layer._to[1]*s.cfg.cols+layer._to[0]],a=c&&c.querySelector(layer._selector);
   if(a&&layer._moving){a.style.visibility='hidden';layer._hidden.push(a);}
  });
  for(const ev of pending){
   const last=ev.points[ev.points.length-1],cell=board.children[last[1]*s.cfg.cols+last[0]];if(!cell)continue;
   const cls=ev.key==='blue'||/^o\d/.test(ev.key)?'.po':ev.key==='red'||/^v\d/.test(ev.key)?'.pv':'.ph.h'+ev.key;
   const actor=cell.querySelector('.pc'+cls);if(!actor)continue;
   const sr=stage.getBoundingClientRect(),ar=actor.getBoundingClientRect();
   const points=ev.points.map(p=>{const c=board.children[p[1]*s.cfg.cols+p[0]],r=c.getBoundingClientRect();return {x:r.left-sr.left+r.width/2,y:r.top-sr.top+r.height/2};});
   const layer=document.createElement('div');layer.className='push-motion';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'190'});
   const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('width',stage.clientWidth);svg.setAttribute('height',stage.clientHeight);svg.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none';
   for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i];if(Math.abs(p.x-q.x)>board.clientWidth/2||Math.abs(p.y-q.y)>board.clientHeight/2)continue;const line=document.createElementNS(NS,'line');for(const [k,v] of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'currentColor','stroke-width':2,'stroke-dasharray':'3 3'}))line.setAttribute(k,v);svg.appendChild(line);}
   layer.dataset.sprite=ev.key==='blue'||/^o\d/.test(ev.key)?'o':ev.key==='red'||/^v\d/.test(ev.key)?'v':'h';layer._key=ev.key;layer._to=last;layer._selector='.pc'+cls;layer._hidden=[actor];
   layer._finish=()=>{if(layer._done)return;layer._done=true;layer._hidden.forEach(a=>a.style.visibility='');layer.remove();};
   layer.appendChild(svg);stage.appendChild(layer);
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;layer._moving=!reduced;layer.dataset.moving=reduced?'0':'1';
   if(!reduced){
    actor.style.visibility='hidden';const end=points[points.length-1],coords=[{...points[0]}];
    const c0=board.children[0].getBoundingClientRect(),c1=board.children[1].getBoundingClientRect(),cy=board.children[s.cfg.cols].getBoundingClientRect();
    const spanX=(c1.left-c0.left)*s.cfg.cols,spanY=(cy.top-c0.top)*s.cfg.rows;let wrapX=false,wrapY=false;
    for(let i=1;i<points.length;i++){let dx=points[i].x-points[i-1].x,dy=points[i].y-points[i-1].y;if(Math.abs(dx)>spanX/2){dx-=Math.sign(dx)*spanX;wrapX=true;}if(Math.abs(dy)>spanY/2){dy-=Math.sign(dy)*spanY;wrapY=true;}coords.push({x:coords[i-1].x+dx,y:coords[i-1].y+dy});}
    const br=board.getBoundingClientRect();layer.style.clipPath=`inset(${br.top-sr.top}px ${sr.right-br.right}px ${sr.bottom-br.bottom}px ${br.left-sr.left}px)`;
    // Copies entering the opposite edge keep a wrapped push moving one square at a time, never across the whole board.
    for(const x of wrapX?[-spanX,0,spanX]:[0])for(const y of wrapY?[-spanY,0,spanY]:[0]){
     const copy=actor.cloneNode(true),skin=document.querySelector('#fx .spr-'+layer.dataset.sprite);if(skin)copy.innerHTML=skin.innerHTML;copy.classList.add('push-actor');copy.style.cssText=`position:absolute!important;left:${ar.left-sr.left}px!important;top:${ar.top-sr.top}px!important;width:${ar.width}px!important;height:${ar.height}px!important;border:0!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;`;
     layer.appendChild(copy);const frames=coords.map((p,i)=>({transform:`translate(${p.x-end.x+x}px,${p.y-end.y+y}px)`,offset:i/(coords.length-1)}));
     const anim=copy.animate(frames,{duration:1000,easing:'linear'});anim.onfinish=layer._finish;
    }
   }
   setTimeout(layer._finish,1050);
  }
 }
 const api={path,positions,events,run};if(typeof module!=='undefined')module.exports=api;root.PUSH_MOTION=api;
})(typeof window==='undefined'?globalThis:window);
