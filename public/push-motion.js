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
 function kingPath(from,to){if(!valid(from)||!valid(to)||same(from,to))return [];const points=[from.slice()];let x=from[0],y=from[1],guard=0;while((x!==to[0]||y!==to[1])&&guard++<32){if(x!==to[0])x+=Math.sign(to[0]-x);if(y!==to[1])y+=Math.sign(to[1]-y);points.push([x,y]);}return x===to[0]&&y===to[1]?points:[];}
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
  const lc=h.lastCatch;if(s.role!=='hunter'&&fresh(lc,old.lastCatch)&&!lc.ko&&valid(lc.at)&&valid(lc.to)){const points=kingPath(lc.at,lc.to);if(points.length>1&&!out.some(e=>e.key===lc.bird))out.push({key:lc.bird,points});}
  // A watcher whose hunter is already out of sight does not get a slide. The
  // trail itself is never extended: points come only from the redacted view.
  const skipKick=!!(root.SURPRISE&&SURPRISE.skipKickSlide&&SURPRISE.skipKickSlide(s,prev));
  if(!skipKick&&fresh(s.kick,prev.kick)&&s.kick.trail&&s.kick.trail.some(valid)&&s.kick.trail.length>1)out.push({key:s.kick.key,points:s.kick.trail});
  if(!skipKick&&fresh(s.kick,prev.kick)&&valid(s.kick.to))for(const key in b)if(same(b[key],s.kick.to)&&valid(a[key]))add(key,a[key],b[key],true,s.kick.moved||3);
  if(fresh(h.rival,old.rival)&&h.rival.trail&&h.rival.trail.some(valid)&&h.rival.trail.length>1)out.push({key:h.rival.by==='badger'?'hyena':'badger',points:h.rival.trail});
  if(fresh(h.rival,old.rival)&&valid(h.rival.to)){const key=h.rival.by==='badger'?'hyena':'badger';add(key,a[key],h.rival.to,false,2);}
  if(fresh(h.burst,old.burst)&&h.burst.trail&&h.burst.trail.some(valid)&&h.burst.trail.length>1)out.push({key:'hyena',points:h.burst.trail});
  if(fresh(h.burst,old.burst)&&valid(h.burst.to))add('hyena',a.hyena,h.burst.to,false,2);
  if(fresh(s.bumpNote,prev.bumpNote)&&s.bumpNote.trail&&s.bumpNote.trail.some(valid)&&s.bumpNote.trail.length>1)out.push({key:s.bumpNote.key,points:s.bumpNote.trail});
  if(fresh(s.stoneNote,prev.stoneNote))for(const t of s.stoneNote.trails||[])if(t.points.some(valid)&&t.points.length>1)out.push({key:t.key,points:t.points});
  if(fresh(s.stoneNote,prev.stoneNote))for(const key in b)if(valid(a[key])&&!same(a[key],b[key]))add(key,a[key],b[key],false,2);
  // A state applied when the surprise hold ends may include an ordinary move
  // that happened while this phone was watching the slide (in Hunters, the
  // shoved badger's turn starts at once, and a bot can walk during the cartoon).
  // Ordinary walks have no surprise trail, so without this the piece snaps from
  // the slide landing to its new square. Slide each moved visible piece from
  // where the hold left it; if the squares are not a straight push, still lerp.
  if(root.CUTAWAYS&&root.CUTAWAYS.flushing)for(const key in b){
   if(!valid(a[key])||!valid(b[key])||same(a[key],b[key])||out.some(e=>e.key===key))continue;
   add(key,a[key],b[key],false,3);
   if(!out.some(e=>e.key===key))add(key,a[key],b[key],true,3);
   if(!out.some(e=>e.key===key))out.push({key,points:[a[key].slice(),b[key].slice()]});
  }
  return out;
 }
 function run(s,prev,board){if(typeof document==='undefined')return;const stage=document.getElementById('stage');if(!stage)return;
  const pending=events(s,prev),current=positions(s);cause(s,prev,board);
  stage.querySelectorAll('.partial-motion').forEach(l=>{if(l._stamp!==JSON.stringify([s.turn,s.round,s.lastAction,current]))l._finish();else l._bind();});
  // Duplicate state packets may redraw the board during a push. Keep the original
  // one-second clock and bind the newly drawn destination piece, rather than jumping.
  stage.querySelectorAll('.push-motion').forEach(layer=>{
   if(pending.length||layer._stamp!==JSON.stringify([s.turn,s.round,s.lastAction,current])){layer._finish();return;}
   const c=board.children[layer._to[1]*s.cfg.cols+layer._to[0]],a=c&&c.querySelector(layer._selector);
   if(a&&layer._moving){a.style.visibility='hidden';layer._hidden.push(a);}
  });
  for(const ev of pending)hideLanding(ev,s,board);
  const job={s,prev,board,pending,current,stage};
  if(pending.length&&root.CUTAWAYS&&CUTAWAYS.busy&&CUTAWAYS.busy()){armed=job;return;}
  playArmed(job);
 }
 // Partial slides never infer a missing square: hold/fade at the last permitted square.
 function partial(ev,s,board,stage,current){
  const known=ev.points.filter(valid);if(!known.length)return;const first=known[0],sr=stage.getBoundingClientRect(),c=board.children[first[1]*s.cfg.cols+first[0]],r=c.getBoundingClientRect();
  const cls=ev.key==='blue'||/^o[12]$/.test(ev.key)?'po':ev.key==='red'||/^v[12]$/.test(ev.key)?'pv':'ph h'+ev.key;
  const tmp=document.createElement('div');tmp.className='pc '+cls;tmp.style.visibility='hidden';tmp.innerHTML=ev.key==='hyena'||ev.key==='badger'?window.T3UI.KIND[ev.key].art:'';c.appendChild(tmp);const ar=tmp.getBoundingClientRect();tmp.remove();
  const layer=document.createElement('div');layer.className='partial-motion';layer.setAttribute('aria-hidden','true');layer._stamp=JSON.stringify([s.turn,s.round,s.lastAction,current]);layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:190';
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible';
  const xy=p=>{const x=board.children[p[1]*s.cfg.cols+p[0]].getBoundingClientRect();return{x:x.left-sr.left+x.width/2,y:x.top-sr.top+x.height/2};};
  for(let i=1;i<ev.points.length;i++)if(valid(ev.points[i-1])&&valid(ev.points[i])){const a=xy(ev.points[i-1]),b=xy(ev.points[i]),l=document.createElementNS(NS,'line');for(const [k,v]of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'currentColor','stroke-width':2,'stroke-dasharray':'3 3'}))l.setAttribute(k,v);svg.appendChild(l);}
  layer.appendChild(svg);stage.appendChild(layer);layer._hidden=[];layer._moving=!matchMedia('(prefers-reduced-motion:reduce)').matches;layer._bind=()=>{const end=ev.points[ev.points.length-1];if(!layer._moving||!valid(end))return;const cell=board.children[end[1]*s.cfg.cols+end[0]],pc=cell.querySelector('.pc.'+cls.split(' ').join('.'));if(pc){pc.style.visibility='hidden';layer._hidden.push(pc);}};layer._bind();layer._finish=()=>{layer._hidden.forEach(e=>e.style.visibility='');layer.remove();};
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){const copy=tmp.cloneNode(true);copy.classList.add('push-actor');copy.style.cssText=`position:absolute!important;left:${ar.left-sr.left}px!important;top:${ar.top-sr.top}px!important;width:${ar.width}px!important;height:${ar.height}px!important;border:0!important;background:transparent!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;`;layer.appendChild(copy);
   const base=xy(first);let last=base;const frames=ev.points.map((p,i)=>{if(valid(p))last=xy(p);return {transform:`translate(${last.x-base.x}px,${last.y-base.y}px)`,opacity:valid(p)?1:0,offset:i/(ev.points.length-1)};});copy.animate(frames,{duration:sceneMs(),easing:'linear'});
  }setTimeout(layer._finish,sceneMs()+50);
 }
 let pendingCause=[];
 function causeLife(s){
  const k=s&&s.kick,n=k&&Array.isArray(k.trail)?Math.max(1,k.trail.filter(valid).length-1):1;
  return n*stepMs()+50;
 }
 function releaseCause(s){const drops=pendingCause.splice(0),life=causeLife(s);drops.forEach(drop=>setTimeout(drop,life));}
 function cause(s,prev,board){if(!prev)return;const h=s.h3||{},old=prev.h3||{},items=[];
  if(fresh(s.kick,prev.kick))items.push({by:s.kick.by||'blue',kick:true});
  if(fresh(s.stoneNote,prev.stoneNote)&&s.stoneNote.targets?.length)items.push({by:s.stoneNote.by||'red'});
  if(fresh(h.rival,old.rival))items.push({by:h.rival.by});if(fresh(h.burst,old.burst))items.push({by:'badger'});if(fresh(h.lastCatch,old.lastCatch))items.push({by:h.lastCatch.by||h.kind});
  const wait=!!(root.CUTAWAYS&&CUTAWAYS.busy&&CUTAWAYS.busy());
  for(const item of items){const cls=item.by==='blue'||/^o[12]$/.test(item.by)?'.pc.po':item.by==='red'||/^v[12]$/.test(item.by)?'.pc.pv':'.pc.h'+item.by;
   const p=positions(s)[item.by],cell=valid(p)?board.children[p[1]*s.cfg.cols+p[0]]:null,pc=cell&&cell.querySelector(cls),chip=document.querySelector('#h3bar [data-b="'+item.by+'"]'),el=pc||chip;if(!el)continue;
   const leg=item.kick?document.createElement('i'):null;if(leg){leg.className='kick-leg';el.appendChild(leg);}
   el.classList.add('push-cause');
   const drop=()=>{el.classList.remove('push-cause');if(leg&&leg.parentNode)leg.remove();};
   // The slide waits behind the cartoon. Keep the cause mark until that slide is on screen.
   if(wait)pendingCause.push(drop);else setTimeout(drop,causeLife(s));
  }
 }
 function stepMs(){return (root.SURPRISE&&root.SURPRISE.STEP_MS)||600;}
 function sceneMs(ev){const n=ev&&Array.isArray(ev.points)?Math.max(1,ev.points.filter(valid).length-1):1;return n*stepMs();}
 function concealCell(cell){
  if(!cell)return;
  cell.classList.add('surprise-landing');
  cell.querySelectorAll('.pc,.youring,.youpulse').forEach(el=>el.style.setProperty('visibility','hidden','important'));
 }
 function hideLanding(ev,s,board){
  if(typeof document==='undefined'||!board||!ev||!ev.points||!s||!s.cfg)return;
  const last=[...ev.points].reverse().find(valid);if(!last)return;
  const cell=board.children[last[1]*s.cfg.cols+last[0]];concealCell(cell);
  const here=positions(s)[ev.key];
  if(valid(here)&&!same(here,last))concealCell(board.children[here[1]*s.cfg.cols+here[0]]);
  const stage=document.getElementById('stage');
  if(stage)stage.querySelectorAll('.youflag').forEach(el=>{
   const cr=cell&&cell.getBoundingClientRect(),fr=el.getBoundingClientRect();
   if(!cell||(fr.left+fr.width/2>=cr.left-4&&fr.left+fr.width/2<=cr.right+4&&fr.bottom>=cr.top-24&&fr.top<=cr.bottom+4))
    el.classList.add('surprise-hidden');
  });
 }
 function clearLanding(){
  if(typeof document==='undefined')return;
  document.querySelectorAll('.surprise-landing').forEach(c=>{
   c.classList.remove('surprise-landing');
   c.querySelectorAll('.pc,.youring,.youpulse').forEach(el=>el.style.removeProperty('visibility'));
  });
  document.querySelectorAll('.youflag.surprise-hidden').forEach(el=>el.classList.remove('surprise-hidden'));
 }
 function tagMovingYou(s,key,copy){
  if(!copy||copy.querySelector('.surprise-you'))return;
  const mine=s&&((s.h3&&s.h3.mySeat)||s.role);
  const kind=s&&(s.role==='hunter'?(s.kind||(s.h3&&s.h3.kind)):mine);
  const own=key===mine||key===kind||key===s.role||(s.role==='blue'&&(key==='blue'||key==='ostrich'))||(s.role==='red'&&(key==='red'||key==='vulture'));
  if(!own)return;
  const t=document.createElement('span');t.className='youtag youflag surprise-you';t.textContent='YOU';
  t.style.cssText='position:absolute;left:50%;top:0;transform:translate(-50%,-110%);z-index:2;pointer-events:none;';
  copy.appendChild(t);
 }
 let armed=null;
 function playArmed(job){
  const {s,prev,board,pending,current,stage}=job;
  releaseCause(s);
  for(const ev of pending){
   hideLanding(ev,s,board);
   if(ev.points.some(p=>!valid(p))){partial(ev,s,board,stage,current);continue;}
   const last=ev.points[ev.points.length-1],cell=board.children[last[1]*s.cfg.cols+last[0]];if(!cell)continue;
   const cls=ev.key==='blue'||/^o\d/.test(ev.key)?'.po':ev.key==='red'||/^v\d/.test(ev.key)?'.pv':'.ph.h'+ev.key;
   let actor=cell.querySelector('.pc'+cls),temporary=false;
   if(!actor&&s.kick&&ev.key===s.kick.key&&s.kick.trail&&s.kick.trail.every(valid)&&(ev.key==='hyena'||ev.key==='badger')){actor=document.createElement('div');actor.className='pc ph h'+ev.key;actor.innerHTML=window.T3UI.KIND[ev.key].art;cell.appendChild(actor);temporary=true;}
   if(!actor)continue;
   const sr=stage.getBoundingClientRect(),ar=actor.getBoundingClientRect();
   if(temporary)actor.remove();
   const points=ev.points.map(p=>{const c=board.children[p[1]*s.cfg.cols+p[0]],r=c.getBoundingClientRect();return {x:r.left-sr.left+r.width/2,y:r.top-sr.top+r.height/2};});
   const layer=document.createElement('div');layer.className='push-motion';layer.setAttribute('aria-hidden','true');Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'190'});
   const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('width',stage.clientWidth);svg.setAttribute('height',stage.clientHeight);svg.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none';
   for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i];if(Math.abs(p.x-q.x)>board.clientWidth/2||Math.abs(p.y-q.y)>board.clientHeight/2)continue;const line=document.createElementNS(NS,'line');for(const [k,v] of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'currentColor','stroke-width':2,'stroke-dasharray':'3 3'}))line.setAttribute(k,v);svg.appendChild(line);}
   layer.dataset.sprite=ev.key==='blue'||/^o\d/.test(ev.key)?'o':ev.key==='red'||/^v\d/.test(ev.key)?'v':'h';layer._stamp=JSON.stringify([s.turn,s.round,s.lastAction,current]);layer._key=ev.key;layer._to=last;layer._selector='.pc'+cls;layer._hidden=[actor];
   layer._finish=()=>{if(layer._done)return;layer._done=true;layer._hidden.forEach(a=>a.style.visibility='');layer.remove();if(typeof document!=='undefined'&&!document.querySelector('.push-motion,.partial-motion'))clearLanding();};
   layer.appendChild(svg);stage.appendChild(layer);
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;layer._moving=!reduced;layer.dataset.moving=reduced?'0':'1';
   if(!reduced){
    actor.style.setProperty('visibility','hidden','important');const end=points[points.length-1],coords=[{...points[0]}];
    const c0=board.children[0].getBoundingClientRect(),c1=board.children[1].getBoundingClientRect(),cy=board.children[s.cfg.cols].getBoundingClientRect();
    const spanX=(c1.left-c0.left)*s.cfg.cols,spanY=(cy.top-c0.top)*s.cfg.rows;let wrapX=false,wrapY=false;
    for(let i=1;i<points.length;i++){let dx=points[i].x-points[i-1].x,dy=points[i].y-points[i-1].y;if(Math.abs(dx)>spanX/2){dx-=Math.sign(dx)*spanX;wrapX=true;}if(Math.abs(dy)>spanY/2){dy-=Math.sign(dy)*spanY;wrapY=true;}coords.push({x:coords[i-1].x+dx,y:coords[i-1].y+dy});}
    const br=board.getBoundingClientRect();layer.style.clipPath=`inset(${br.top-sr.top}px ${sr.right-br.right}px ${sr.bottom-br.bottom}px ${br.left-sr.left}px)`;
    const start=coords[0],ox=(ar.left-sr.left+ar.width/2)-end.x,oy=(ar.top-sr.top+ar.height/2)-end.y;
    for(const x of wrapX?[-spanX,0,spanX]:[0])for(const y of wrapY?[-spanY,0,spanY]:[0]){
     const copy=actor.cloneNode(true),skin=document.querySelector('#fx .spr-'+layer.dataset.sprite);if(skin)copy.innerHTML=skin.innerHTML;copy.classList.add('push-actor');
     // Park the copy on the first square, not on the landing square. The piece already drawn there stays hidden until this copy arrives.
     copy.style.cssText=`position:absolute!important;left:${start.x+ox-ar.width/2+x}px!important;top:${start.y+oy-ar.height/2+y}px!important;width:${ar.width}px!important;height:${ar.height}px!important;border:0!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;`;
     layer.appendChild(copy);
     // A wrap draws a second copy so the animal can leave one edge and enter the other.
     // That copy must not already be sitting on the landing square.
     const dest=board.children[last[1]*s.cfg.cols+last[0]].getBoundingClientRect(),pr=copy.getBoundingClientRect();
     const midX=pr.left+pr.width/2,midY=pr.top+pr.height/2;
     const parked=midX>dest.left&&midX<dest.right&&midY>dest.top&&midY<dest.bottom&&!same(ev.points[0],last);
     if(parked){copy.remove();continue;}
     tagMovingYou(s,ev.key,copy);const frames=coords.map((p,i)=>({transform:`translate(${p.x-start.x}px,${p.y-start.y}px)`,offset:coords.length<2?1:i/(coords.length-1)}));
     const anim=copy.animate(frames,{duration:sceneMs(ev),easing:'linear',fill:'forwards'});anim.onfinish=layer._finish;
    }
    const watch=()=>{if(layer._done)return;hideLanding(ev,s,board);requestAnimationFrame(watch);};requestAnimationFrame(watch);
   }
   setTimeout(layer._finish,sceneMs(ev)+50);
  }
 }
 function kickChoose(board, plans){
  if(typeof document==='undefined')return;
  const stage=document.getElementById('stage');if(!stage)return;
  const stamp=JSON.stringify(plans||[]);
  const prev=stage.querySelector('.kick-preview');
  if(prev&&prev.dataset.stamp===stamp)return;
  stage.querySelectorAll('.kick-preview').forEach(n=>n.remove());
  if(!board||!plans||!plans.length||!plans[0]||!board.children.length)return;
  const cols=board.children.length>7?Math.round(board.children.length/7):9;
  const rows=board.children.length/cols;
  const sr=stage.getBoundingClientRect();
  const layer=document.createElement('div');layer.className='kick-preview';layer.dataset.stamp=stamp;layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'40'});
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('width',stage.clientWidth);svg.setAttribute('height',stage.clientHeight);svg.style.cssText='position:absolute;inset:0;overflow:visible;pointer-events:none';
  const center=p=>{const c=board.children[p[1]*cols+p[0]];if(!c)return null;const r=c.getBoundingClientRect();return {x:r.left-sr.left+r.width/2,y:r.top-sr.top+r.height/2};};
  const c0=board.children[0].getBoundingClientRect(),c1=board.children[1]&&board.children[1].getBoundingClientRect(),cy=board.children[cols]&&board.children[cols].getBoundingClientRect();
  const spanX=c1?(c1.left-c0.left)*cols:0,spanY=cy?(cy.top-c0.top)*rows:0;
  const br=board.getBoundingClientRect();layer.style.clipPath=`inset(${br.top-sr.top}px ${sr.right-br.right}px ${sr.bottom-br.bottom}px ${br.left-sr.left}px)`;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  for(const plan of plans){
   if(!plan.points||plan.points.length<1||!plan.at)continue;
   const pts=plan.points.map(center).filter(Boolean);if(!pts.length)continue;
   for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i];if(Math.abs(p.x-q.x)>board.clientWidth/2||Math.abs(p.y-q.y)>board.clientHeight/2)continue;const line=document.createElementNS(NS,'line');for(const [k,v] of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'currentColor','stroke-width':2,'stroke-dasharray':'3 3'}))line.setAttribute(k,v);svg.appendChild(line);}
   const cell=board.children[plan.at[1]*cols+plan.at[0]];if(!cell)continue;
   const sel=plan.key==='hyena'||plan.key==='badger'?'.pc.ph.h'+plan.key:'.pc.pv';
   const actor=cell.querySelector(sel)||cell.querySelector('.pc:not(.po)');if(!actor)continue;
   const ar=actor.getBoundingClientRect();
   const coords=[{...pts[0]}];let wrapX=false,wrapY=false;
   for(let i=1;i<pts.length;i++){let dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y;if(spanX&&Math.abs(dx)>spanX/2){dx-=Math.sign(dx)*spanX;wrapX=true;}if(spanY&&Math.abs(dy)>spanY/2){dy-=Math.sign(dy)*spanY;wrapY=true;}coords.push({x:coords[i-1].x+dx,y:coords[i-1].y+dy});}
   const start=coords[0],end=coords[coords.length-1],ox=(ar.left-sr.left+ar.width/2)-pts[0].x,oy=(ar.top-sr.top+ar.height/2)-pts[0].y;
   const steps=Math.max(1,coords.length-1),move=steps*stepMs(),total=move+450;
   const copies=reduced?[[0,0]]:wrapX||wrapY?[[wrapX?-spanX:0,wrapY?-spanY:0],[0,0],[wrapX?spanX:0,wrapY?spanY:0]]:[[0,0]];
   for(const [x,y] of copies){
    const copy=actor.cloneNode(true);copy.classList.add('push-actor','kick-ghost');
    copy.style.cssText=`position:absolute!important;left:${start.x+ox-ar.width/2+x}px!important;top:${start.y+oy-ar.height/2+y}px!important;width:${ar.width}px!important;height:${ar.height}px!important;border:0!important;background:transparent!important;visibility:visible!important;opacity:.5!important;pointer-events:none!important;`;
    layer.appendChild(copy);
    if(reduced){copy.style.transform=`translate(${end.x-start.x}px,${end.y-start.y}px)`;continue;}
    const moveEnd=move/total,pauseEnd=(move+300)/total;
    const frames=coords.map((p,i)=>({transform:`translate(${p.x-start.x}px,${p.y-start.y}px)`,opacity:.5,offset:coords.length<2?moveEnd:(i/(coords.length-1))*moveEnd}));
    frames.push({transform:`translate(${end.x-start.x}px,${end.y-start.y}px)`,opacity:.5,offset:pauseEnd});
    frames.push({transform:`translate(${end.x-start.x}px,${end.y-start.y}px)`,opacity:0,offset:1});
    copy.animate(frames,{duration:total,easing:'linear',iterations:Infinity});
   }
  }
  layer.appendChild(svg);stage.appendChild(layer);
 }
 function go(){if(!armed)return;const job=armed;armed=null;playArmed(job);}
 function finish(){const stage=typeof document!=='undefined'&&document.getElementById('stage');if(!stage)return;stage.querySelectorAll('.push-motion,.partial-motion').forEach(l=>l._finish&&l._finish());if(pendingCause.length)releaseCause(null);armed=null;clearLanding();}
 const api={path,positions,events,run,go,finish,kickChoose,sceneMs,stepMs};if(typeof module!=='undefined')module.exports=api;root.PUSH_MOTION=api;
})(typeof window==='undefined'?globalThis:window);
