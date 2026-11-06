// 3-player mode UI: lobby step, hunter pick, per-bird header, shot clock, hunter piece, sense wave, catch + knockback, burrow.
// Rules live on the server (three.js); this only draws what this seat is allowed to see.
(function(){
const $=id=>document.getElementById(id),key=p=>p[0]+','+p[1],D=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
// --- marks: bold, one per square, distinct by SHAPE and colour, same in every theme ---
const HYENA='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 30 L8 17 L14 13 L27 13 L31 9 L33 3 L36 9 L38 17 L32 21 L30 30 L26 30 L25 23 L14 23 L12 30 Z" fill="#e0a34a" stroke="#1d1206" stroke-width="2.6" stroke-linejoin="round"/><path d="M8 17 L4 9 L12 14" fill="#e0a34a" stroke="#1d1206" stroke-width="2.4" stroke-linejoin="round"/><circle cx="15" cy="17" r="2.2" fill="#3b2410"/><circle cx="21" cy="19" r="2" fill="#3b2410"/><circle cx="26" cy="16" r="1.8" fill="#3b2410"/><path d="M8 13 L22 10" stroke="#3b2410" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="12" r="1.8" fill="#000"/><path d="M36 17 L32 18" stroke="#1d1206" stroke-width="2"/></svg>';
const BADGER='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true"><path d="M5 29 C5 15 13 8 22 8 L32 11 C38 14 39 22 36 27 L33 33 L12 34 C7 33 5 31 5 29Z" fill="#f7f4ee" stroke="#1a120c" stroke-width="2.6" stroke-linejoin="round"/><path d="M14 31 l2 6 M22 33 l1 6 M30 31 l2 5" stroke="#1a120c" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M18 15 L35 17.5 L34 21 L18 18.5Z" fill="#1a120c"/><circle cx="31" cy="17.6" r="2" fill="#fff"/><circle cx="31.6" cy="17.8" r="1" fill="#111"/></svg>';
const MOUND='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true"><path d="M2 36 Q8 8 20 6 Q32 8 38 36 Z" fill="#f6e2a8" stroke="#1a1008" stroke-width="3.2" stroke-linejoin="round"/><path d="M10 26 q3-2 6 0M24 22 q3-2 6 0M16 32 q3-2 6 0" stroke="#6b4420" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="17" cy="20" r="2.6" fill="#fff" stroke="#111" stroke-width="1"/><circle cx="23" cy="20" r="2.6" fill="#fff" stroke="#111" stroke-width="1"/><circle cx="17" cy="20.6" r="1.2" fill="#111"/><circle cx="23" cy="20.6" r="1.2" fill="#111"/></svg>';
const CLAW='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 6 L18 34 M19 4 L25 34 M28 6 L32 32" stroke="#000" stroke-width="8" stroke-linecap="round"/><path d="M10 6 L18 34 M19 4 L25 34 M28 6 L32 32" stroke="#ff2a6d" stroke-width="4.5" stroke-linecap="round"/></svg>';
const OSTI='<svg viewBox="0 0 40 40"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="3" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/></svg>';
const VULI='<svg viewBox="0 0 40 40"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/></svg>';
const KIND={hyena:{n:'Hyena',art:HYENA,pw:'Pounce',pwTxt:'If your sense says a bird is within 2, you get one extra 1-square move that turn. A bird is out after 2 catches.'},
 badger:{n:'Honey badger',art:BADGER,pw:'Burrow',pwTxt:'Stay still to burrow. You usually hide at once; tough ground takes one more still turn. Birds cannot see you then. Moving pops you up, and you can catch on that move. 1 catch knocks a bird out.'}};
const BN={blue:'Ostrich',red:'Vulture',hunter:'Hunter'};
const hName=S=>S.h3&&S.h3.kind?KIND[S.h3.kind].n:'Hunter';
const tname=(S,r)=>r==='hunter'?hName(S):r==='hyena'||r==='badger'?KIND[r].n:(S&&S.h3&&S.h3.team?{o1:'Ostrich 1',o2:'Ostrich 2',v1:'Vulture 1',v2:'Vulture 2'}[r]:0)||BN[r];
const sp=(svg,px)=>`<span class="h3i" style="width:${px}px;height:${px}px">${svg}</span>`;
// --- lobby: Classic 2-player by default (the old simple lobby). Bigger modes sit behind a small "More players" link:
// 3, 4 (2 vs 2 or Hunters) and 5. Picking one routes both play buttons into a setup step (your seat, friend/computer for the rest). ---
const SN={o1:'Ostrich 1',o2:'Ostrich 2',v1:'Vulture 1',v2:'Vulture 2',blue:'Ostrich',red:'Vulture',hunter:'Hunter',hyena:'Hyena',badger:'Honey badger'};
const SEATS={'3':['blue','red','hunter'],'4':['o1','v1','o2','v2'],'4h':['blue','red','hyena','badger'],'5':['o1','v1','o2','v2','hunter']};
const MODES=[['2','Classic','2 players'],['3','3','+ hunter'],['4','4','2 vs 2'],['4h','4','Hunters'],['5','5','2v2 + hunter']];
const TITLE={'3':'3 players · + hunter','4':'4 players · 2 vs 2','4h':'4 players · Hunters','5':'5 players · 2 vs 2 + hunter'};
const isOs=r=>r==='blue'||r==='o1'||r==='o2';
const seatArt=(r,k)=>r==='hunter'?KIND[k].art:r==='hyena'||r==='badger'?KIND[r].art:isOs(r)?OSTI:VULI;
const SUB={blue:'hide eggs',red:'hunt eggs',hunter:'catch birds',o1:'team ostrich',o2:'team ostrich',v1:'team vulture',v2:'team vulture',hyena:'Pounce · 2 catches',badger:'Burrow · 1 catch'};
let mode='2',three=false;
let myRole='blue',kind=localStorage.getItem('bo_kind')||'hyena',seat={};
function rulesMode(m){document.querySelectorAll('.mrules').forEach(e=>e.classList.toggle('hidden',e.dataset.m!==m));}
function endBits(S){const names=S&&S.arrivals||[];const note=names.length?`<p class="arrive">${names.map(n=>String(n).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join(', ')} joined — the next game adds them.</p>`:'';
 const change=S&&S.flow?`<button class="big alt" id="rematchChange" onclick="UI.rematch('change')">Rematch · Change roles</button>`:'';
 return `${note}<button class="big" id="rematchSame" onclick="UI.rematch('same')">Rematch · Same roles</button>${change}<button class="big ghost" id="newGame" onclick="UI.menu()">New Game</button>`;}
function lobby(){return; /* roles and player count live in the pre-game lobby, not a count-first picker */}
function lobbyRetired(){const home=$('homeStep');if(!home||$('moreP'))return;
 const more=document.createElement('button');more.id='moreP';more.className='linkbtn morep';more.setAttribute('aria-expanded','false');more.textContent='More players';
 const pc=document.createElement('div');pc.id='pcount';pc.className='pcount hidden';
 pc.innerHTML=MODES.map(([m,n,s])=>`<button id="pc${m}" data-m="${m}"><b>${n}</b><small>${s}</small></button>`).join('');
 home.insertBefore(more,$('haveCode'));home.insertBefore(pc,$('haveCode'));
 const st=document.createElement('div');st.id='threeStep';st.className='hidden';
 st.innerHTML=`<h2 id="t3title">3-player game</h2><div class="t3lbl">You play</div><div class="rolerow r3" id="t3roles"></div>
 <div id="t3seats"></div><div id="t3kind"></div><button class="big" id="t3go">Start game</button><button class="linkbtn" id="t3back">← Back</button>`;
 $('roleStep').parentNode.insertBefore(st,$('roleStep').nextSibling);
 const pcUI=()=>{MODES.forEach(([m])=>$('pc'+m).classList.toggle('on',mode===m));more.textContent=mode==='2'?'More players':'Players: '+TITLE[mode];rulesMode(mode);};pcUI();
 const tap=(el,f)=>{let t=0;el.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();f(e);},{passive:false});el.addEventListener('click',e=>{if(Date.now()-t>600)f(e);});};
 tap(more,()=>{const open=pc.classList.toggle('hidden')===false;more.setAttribute('aria-expanded',String(open));});
 MODES.forEach(([m])=>tap($('pc'+m),()=>{mode=m;three=m!=='2';pcUI();if(m==='2'){pc.classList.add('hidden');more.setAttribute('aria-expanded','false');}}));
 // with more players, both play buttons open the setup step (captured before the 2-player handlers)
 for(const id of ['playFriend','playAI'])for(const ev of ['touchend','click'])$(id).addEventListener(ev,e=>{if(!three)return;e.stopImmediatePropagation();e.preventDefault();
  if(ev==='click'&&Date.now()-(tap.t||0)<600)return;if(ev==='touchend')tap.t=Date.now();
  const bot=id==='playAI';seat={};SEATS[mode].forEach(r=>seat[r]=bot?'bot':'friend');if(!SEATS[mode].includes(myRole))myRole=SEATS[mode][0];show3();},true);
 st.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.r){myRole=b.dataset.r;draw3();}else if(b.dataset.seat){seat[b.dataset.seat]=b.dataset.v;draw3();}else if(b.dataset.k){kind=b.dataset.k;localStorage.setItem('bo_kind',kind);draw3();}
  else if(b.id==='t3back'){st.classList.add('hidden');$('homeStep').classList.remove('hidden');}
  else if(b.id==='t3go'){const bots=SEATS[mode].filter(r=>r!==myRole&&seat[r]==='bot'),level=localStorage.getItem('bo_ailvl')||'normal';
   UI.open(mode==='3'?{t:'create',three:1,role:myRole,bots,kind,level}:mode==='4h'?{t:'create',hunt:1,role:myRole,bots,level}:{t:'create',team:+mode,role:myRole,bots,kind,level});}});}
function show3(){$('homeStep').classList.add('hidden');$('friendStep').classList.add('hidden');$('roleStep').classList.add('hidden');$('threeStep').classList.remove('hidden');draw3();}
function draw3(){const S3=SEATS[mode],np=S3.length;
 $('t3title').textContent=TITLE[mode];$('t3go').textContent=`Start ${np}-player game`;
 const rr=$('t3roles');rr.className='rolerow r3'+(S3.length>3?' r5':'');
 rr.innerHTML=S3.map(r=>`<button class="rolebtn${r===myRole?' on':''}" data-r="${r}"><span class="ra">${seatArt(r,kind)}${/\d/.test(r)?`<b class="snum">${r[1]}</b>`:''}</span>${SN[r]}<small>${SUB[r]}</small></button>`).join('');
 const others=S3.filter(r=>r!==myRole);
 const note=mode==='4'||mode==='5'?'<p class="t3note">Ostriches 1 + 2 team up (each has its own 2-egg nest, either can warm any egg). Vultures 1 + 2 share every sniff.</p>':mode==='4h'?'<p class="t3note">Hyena and honey badger are rivals: both hunt the birds. Most knock-outs wins once both birds are out.</p>':'';
 $('t3seats').innerHTML=note+others.map(r=>`<div class="t3row"><span class="t3who">${sp(seatArt(r,kind),26)} ${SN[r]}</span><span class="seg"><button data-seat="${r}" data-v="friend" class="${seat[r]==='friend'?'on':''}">👤 Friend</button><button data-seat="${r}" data-v="bot" class="${seat[r]==='bot'?'on':''}">🤖 Computer</button></span></div>`).join('');
 const hasH=S3.includes('hunter'),pick=hasH&&(myRole==='hunter'||seat.hunter==='bot');
 $('t3kind').innerHTML=!hasH?'':pick?`<div class="t3lbl">${myRole==='hunter'?'Your hunter':'Computer hunter'}</div><div class="kindrow">${['hyena','badger'].map(k=>`<button class="kindbtn${kind===k?' on':''}" data-k="${k}"><span class="ka">${KIND[k].art}</span><b>${KIND[k].n}</b><small>${KIND[k].pw}: ${KIND[k].pwTxt}</small></button>`).join('')}</div>`:'<p class="t3note">The hunter player picks hyena or honey badger when they join.</p>';}
// --- 4/5 players (2v2, + hunter): numbered birds, teammates, shared sniffs ---
const NUM=r=>/\d/.test(r)?r[1]:'';
function tTag(S){const r=S.h3.mySeat;if(r==='hunter')return tag(S);return `<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${isOs(r)?OSTI:VULI}</span> ${SN[r].toUpperCase()}`;}
function tHint(S,a){const r=S.h3.mySeat,t=S.turn,h=S.h3;
  if(r==='hunter'&&S.myTurn)return hint(Object.assign({},S,{h3:h}),a);
 if(!h.ready)return h.needKind?'Pick your hunter.':`Waiting for all ${h.n} players…`;
 if(h.setupStep==='done'&&h.teamSetup&&h.teamSetup!=='done')return h.teamSetup==='eggs'?'Waiting for the other ostrich to hide eggs…':'Waiting for the other ostrich to finish placing.';
 const me=h.birds[r];if(me&&me.out)return `You're out (${me.why==='starved'?'starved':'knocked out'}). Watching the board — no moves.`;
 if(h.lost&&h.lost.bird===r&&h.lost.round>=S.round-1&&t!==r)return 'Caught! You lost this turn. '+tname(S,t)+'\'s turn…';
 const mt=t&&t!=='hunter'&&t[0]===r[0]?' (your teammate)':'';return `${tname(S,t)}'s turn${mt}…`;}
function tChips(S){let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,live=S.phase==='play',five=h.n===5,ko=h.ko;bar.classList.add('team');
 const bird=r=>{const b=h.birds[r],pips=five?Array.from({length:ko},(_,i)=>`<i class="pip${i<b.catches?' on':''}"></i>`).join(''):'';
  const tip=`${SN[r]}${r===h.mySeat?' (you)':''}${five?`: caught ${b.catches} of ${ko} times`:''}${b.out?' · OUT ('+(b.why==='starved'?'starved':'knocked out')+')':b.catches?' · HURT'+(b.skip?' · loses its next turn':''):''}`;
  return `<span class="bchip ${isOs(r)?'blue':'red'} s${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}${r===h.mySeat?' me':''}" data-tip="${tip}" data-b="${r}">${sp(isOs(r)?OSTI:VULI,22)}<b class="cnum">${NUM(r)}</b>${five?`<span class="pips">${pips}</span>`:''}${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const k=h.kind||'hyena';
 bar.innerHTML=h.order.filter(r=>r!=='hunter').map(bird).join('')+(five?`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: ${KIND[k].pw}. Moves ${h.boost?2:1} square${h.boost?'s (boost after its first knock-out)':''}. Wins by knocking out an ostrich AND a vulture.">${sp(KIND[k].art,24)}<b>${h.boost?'⚡2':'1'}</b></span>`:'');}
function tPieces(S,board){const h=S.h3,me=h.mySeat;
 const badge=(c,r,mate)=>{const b=document.createElement('b');b.className='snum '+(isOs(r)?'o':'v')+(mate?' mate':'')+(r===me?' me':'');b.textContent=NUM(r);c.appendChild(b);};
 for(const q of h.pieces){if(h.birds&&h.birds[q.seat]&&h.birds[q.seat].out)continue;const c=cellAt(board,S,q.p);if(!c||q.p[0]<0)continue;const d=document.createElement('div');d.className='pc '+(q.type==='o'?'po':'pv')+' other'+(q.mate?' mate':' opp');
  d.innerHTML=q.type==='o'?OSTI:VULI;c.appendChild(d);c.dataset.seat=q.seat;badge(c,q.seat,q.mate);
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+SN[q.seat]+(q.mate?' (your teammate)':'')+(q.carrying?', carrying an egg':'');}
 const mine=me==='hunter'?null:cellAt(board,S,isOs(me)?S.ostrich:S.vulture);if(mine)badge(mine,me,false);
 const ms=h.mateSniff;if(ms){const c=cellAt(board,S,ms.p);if(c){const r=document.createElement('div');r.className='msniff '+(ms.yes?'yes':'no');r.textContent=ms.yes?'👃!':'👃';c.appendChild(r);
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(isOs(me)?'':'Your teammate sniffed here: ')+(ms.yes?'an egg is on or next to this square':'no egg on or next to this square');}}
 if(isOs(me)&&S.eggs)S.eggs.forEach(e=>{if(!e.alive||!e.pos||e.mine)return;const c=cellAt(board,S,e.pos);c&&c.classList.add('mateegg');});}
function tOver(S){const h=S.h3,w=S.winner,me=h.mySeat,C=S.cfg,mySide=me==='hunter'?'hunter':isOs(me)?'blue':'red';
 const art=w==='hunter'?KIND[h.kind||'hyena'].art:w==='blue'?OSTI:w==='red'?VULI:'🤝';
 const title=w==='none'?'No winner':w===mySide?(me==='hunter'?'You win!':'Your team wins!'):w==='hunter'?`${hName(S)} wins!`:w==='blue'?'Ostriches win!':'Vultures win!';
 const why=w==='hunter'?`The ${hName(S)} knocked out an ostrich and a vulture by round ${S.round}.`:w==='blue'?`The ostriches kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='ostriches-out'?'Both ostriches were out.':`The vultures smashed every egg by round ${S.round}.`)
  :'Every bird that could win was out.';
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${why}</p>${endBits(S)}</div>`;}
// --- 4 players "Hunters": ostrich + vulture + hyena + honey badger (rival hunters) ---
function hChips(S){let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,live=S.phase==='play',me=h.mySeat;bar.classList.add('team');
 const bird=r=>{const b=h.birds[r],pips=Array.from({length:2},(_,i)=>`<i class="pip${i<b.catches?' on':''}"></i>`).join('');
  const tip=`${BN[r]}${r===me?' (you)':''}: caught ${b.catches} time${b.catches===1?'':'s'} (hyena needs 2, honey badger 1)${b.out?' · OUT ('+(b.why==='starved'?'starved':'knocked out')+')':b.catches?' · HURT'+(b.skip?' · loses its next turn':''):''}`;
  return `<span class="bchip ${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}${r===me?' me':''}" data-tip="${tip}" data-b="${r}">${sp(r==='blue'?OSTI:VULI,22)}<span class="pips">${pips}</span>${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const hun=k=>{const now=live&&(S.turn===k||(S.turn==='hunter'&&me===k)),n=h.hkos[k];
  return `<span class="bchip hunter h${k}${now?' now':''}${k===me?' me':''}" data-b="${k}" data-tip="${KIND[k].n}${k===me?' (you)':''}: ${KIND[k].pw}. ${k==='hyena'?'2 catches':'1 catch'} knock a bird out. Knock-outs: ${n}.">${sp(KIND[k].art,24)}<b>${n}</b></span>`;};
 bar.innerHTML=bird('red')+bird('blue')+hun('hyena')+hun('badger');}
function hPieces(S,board){const h=S.h3,me=h.mySeat;
 for(const x of h.hunters||[]){const c=cellAt(board,S,x.p);if(!c)continue;const bur=x.burrowed;const pc=document.createElement('div');
  pc.className='pc ph h'+x.kind+(bur?' bur':'')+(x.me?' mine':' rival');pc.innerHTML=bur?MOUND:KIND[x.kind].art;c.appendChild(pc);c.classList.add('hcell');
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(x.me?(bur?'You, burrowed: nobody can see you':'You ('+KIND[x.kind].n+')'):me==='hyena'||me==='badger'?`Your rival, the ${KIND[x.kind].n}. ${x.kind==='badger'?'If it moves onto you, you are knocked back 2. If you move onto it, you bounce back 2.':'If you move onto it, it is knocked back 2.'}`:`${KIND[x.kind].n}! It catches a bird by landing on it (or if you step onto it)`);
  if(bur){const l=document.createElement('span');l.className='burtag';l.textContent='BURROWED';c.appendChild(l);}
  else if(x.me&&x.kind==='badger'&&S.dig===1){const l=document.createElement('span');l.className='burtag dig';l.textContent='TOUGH GROUND';c.appendChild(l);c.dataset.tip+=' · Tough ground: stay still once more to burrow';}}
 const rv=h.rival;if(rv&&rv.seq!==hPieces.rv){const fresh=hPieces.rv!==undefined;hPieces.rv=rv.seq;
  if(fresh){const t=cellAt(board,S,rv.to);t&&t.classList.add('h3kb');pop(board,rv.by==='badger'?'Badger shoved the hyena back 2!':'Hyena bounced off the badger!','catch');}}}
function hOver(S){const h=S.h3,w=S.winner,me=h.mySeat,C=S.cfg;
 const art=w==='hyena'||w==='badger'?KIND[w].art:w==='blue'?OSTI:w==='red'?VULI:'🤝';
 const title=w==='none'?'No winner':w===me?'You win!':`${tname(S,w)} wins!`;
 const ko=`Knock-outs: hyena ${h.hkos.hyena}, honey badger ${h.hkos.badger}.`;
 const why=w==='hyena'||w==='badger'?`Both birds were out. ${ko}${h.hkos.hyena===h.hkos.badger?' Tie: the last knock-out wins.':''}`:w==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='starved'?'The ostrich was out and no eggs were left.':`The vulture smashed every egg by round ${S.round}.`):`No hunter got a knock-out. ${ko}`;
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${why}</p>${endBits(S)}</div>`;}
// --- in game ---
let lastSense='',lastCatch=0,deadline=0,clockMs=10000,raf=0,lastTurnKey='',nearSeen=null;
function warnNear(S,board){if(!window.BORing)return;if(!S||S.phase!=='play'){nearSeen=null;return;}
 const now=BORing.seenHunterKinds(S),prev=nearSeen;nearSeen=now.slice();
 const added=prev?BORing.hunterAlerts(prev,now):now;
 added.forEach(k=>pop(board,BORing.hunterNearLabel(k),'near'));}
function tag(S){if(S.h3&&S.h3.team&&S.h3.mySeat!=='hunter')return tTag(S);const k=S.h3&&S.h3.kind||'hyena';return `<span style="display:inline-block;width:30px;height:30px;vertical-align:middle">${KIND[k].art}</span> ${KIND[k].n.toUpperCase()}`;}
function waitMsg(S){return `Wait, it's the ${tname(S,S.turn)}'s turn.`;}
function nopeMsg(S){return `Move ${S.h3.range} square${S.h3.range>1?'s':''}: tap a glowing square.`;}
function hint(S,a){if(S.h3.team&&!hint.in){hint.in=1;try{return tHint(S,a);}finally{hint.in=0;}}const r=S.role,t=S.turn;
 if(r==='hunter'&&S.myTurn){const k=S.h3.kind;
  a.innerHTML=S.pounce?'<button class="on" title="Skip this extra move. You will not catch the bird." onclick="UI.send({t:\'act\',a:\'hstay\'})">Stop</button>':`<button title="${k==='badger'?(S.burrowed?'Stay burrowed. Birds still cannot see you.':S.dig===1?'Tough ground: stay still once more to finish the burrow.':'Stay still to burrow. You usually hide at once; tough ground takes one more still turn.'):'Stay put and end your turn.'}" onclick="UI.send({t:'act',a:'hstay'})">${k==='badger'?(S.burrowed?'Stay':S.dig===1?'Finish':'Burrow'):'Stay'}</button>`;
  if(S.pounce)return 'POUNCE: a bird is within 2. Land on it to catch it — this extra move is still your turn.';
  const burrowNote=k!=='badger'||S.burrowed?'':S.dig===1?'Tough ground: stay still once more to burrow. ':'Stay still to burrow. You usually hide at once. ';
  return burrowNote+`Tap a glowing square to move ${S.h3.range}${S.h3.boost?' (boost!)':''}. ${S.sense?'A bird is within 2. It is not pointed at.':'No bird within 2, so no bird is drawn.'}`;}
 if(!S.h3.ready)return S.h3.needKind?'Pick your hunter.':`Waiting for all ${S.h3.hunt?4:3} players…`;
 const lost=S.h3.lost;if(r!=='hunter'&&lost&&lost.bird===r&&lost.round>=S.round-1&&t!==r)return 'Caught! You lost this turn. '+tname(S,t)+'\'s turn…';
 if(r!=='hunter'&&S.h3.birds[r]&&S.h3.birds[r].out)return `You're out (${S.h3.birds[r].why==='starved'?'starved':'knocked out'}). Watching the board — no moves.`;
 return `${tname(S,t)}'s turn…`;}
function chips(S){if(S.h3.hunt)return hChips(S);if(S.h3.team)return tChips(S);let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,ko=h.ko,live=S.phase==='play';
 const bird=r=>{const b=h.birds[r],pips=Array.from({length:ko},(_,i)=>`<i class="pip${i<b.catches?' on':''}"></i>`).join('');
  const tip=`${BN[r]}: caught ${b.catches} of ${ko} times${b.out?' · OUT ('+(b.why==='starved'?'starved':'knocked out')+')':b.catches?' · HURT'+(b.skip?' · loses its next turn':''):''}`;
  return `<span class="bchip ${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}" data-tip="${tip}" data-b="${r}">${sp(r==='blue'?OSTI:VULI,24)}<span class="pips">${pips}</span>${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const k=h.kind||'hyena';
 bar.innerHTML=bird('red')+bird('blue')+`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: ${KIND[k].pw}. Moves ${h.boost?2:1} square${h.boost?'s (boost after the first knock-out)':''}. Wins by knocking out both birds.">${sp(KIND[k].art,26)}<b>${h.boost?'⚡2':'1'}</b></span>`;}
function clock(S){let c=$('clock3');if(!c){c=document.createElement('div');c.id='clock3';c.innerHTML='<div class="cfill"></div><span class="ctxt"></span>';$('h3bar').after(c);}
 const on=S.phase==='play'&&S.h3.clockLeft!=null;c.classList.toggle('hidden',!on);if(!on){cancelAnimationFrame(raf);return;}
 const tk=S.round+':'+S.turn+':'+S.h3.clockLeft;if(tk!==lastTurnKey){lastTurnKey=tk;deadline=Date.now()+S.h3.clockLeft;clockMs=S.h3.clockMs;}
 c.dataset.who=S.turn;c.classList.toggle('mine',!!S.myTurn);
 const tick=()=>{const left=Math.max(0,deadline-Date.now()),s=Math.ceil(left/1000);c.firstChild.style.width=(100*left/clockMs)+'%';
  c.lastChild.innerHTML='<svg class="clk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '+s+'s';c.classList.toggle('low',left<=4000);c.setAttribute('aria-label','Shot clock, '+s+' seconds');if(left>0)raf=requestAnimationFrame(tick);};
 cancelAnimationFrame(raf);tick();}
function cellAt(board,S,p){return p&&p[0]>=0?board.children[p[1]*S.cfg.cols+p[0]]:null;}
function noteBanner(cls,txt,force){const bn=$('banner');if(!bn)return;if(!force&&bn.textContent&&!bn.classList.contains('hidden'))return;bn.textContent=txt;bn.className=cls;}
function markHurt(S,board){const birds=S.h3&&S.h3.birds;if(!birds)return;
 const tag=(cell,b)=>{if(!cell||!b||b.out||!b.catches)return;cell.classList.add('injured');const pc=cell.querySelector('.pc');if(pc)pc.classList.add('injured');
  if(!cell.querySelector('.hurtag')){const l=document.createElement('span');l.className='hurtag';l.textContent='HURT';cell.appendChild(l);}
  cell.dataset.tip=(cell.dataset.tip?cell.dataset.tip+' · ':'')+(b.skip?'Hurt: caught, and loses its next turn.':'Hurt: caught '+b.catches+' time'+(b.catches===1?'':'s')+'. Still in the game.');};
 if(S.h3.team){for(const [r,b] of Object.entries(birds)){let cell=board.querySelector('.cell[data-seat="'+r+'"]');if(!cell&&r===S.h3.mySeat)cell=board.querySelector('.cell[data-tags~="me"]');tag(cell,b);}}
 else{const po=board.querySelector('.pc.po'),pv=board.querySelector('.pc.pv');tag(po&&po.closest('.cell'),birds.blue);tag(pv&&pv.closest('.cell'),birds.red);}}
function pop(board,txt,cls){const o=document.createElement('div');o.className='h3pop '+cls;o.textContent=txt;board.appendChild(o);setTimeout(()=>o.remove(),1800);}
function after(S,prev,board){chips(S);clock(S);kindPick(S);if(S.h3.team)tPieces(S,board);if(S.h3.hunt)hPieces(S,board);
 rulesMode(S.h3.hunt?'4h':S.h3.team?String(S.h3.n):'3');
 const h=S.h3,k=h.kind||'hyena',me=S.role;
 // hunter piece: the hunter always sees itself; a bird only sees it within 2 squares (never a burrowed badger)
 const hp=h.hunter,hc=cellAt(board,S,hp);
 if(hc){const bur=me==='hunter'&&S.burrowed;const pc=document.createElement('div');pc.className='pc ph h'+k+(bur?' bur':'')+(me==='hunter'?' mine':'');pc.innerHTML=bur?MOUND:KIND[k].art;hc.appendChild(pc);hc.classList.add('hcell');
  hc.dataset.tip=(hc.dataset.tip?hc.dataset.tip+' · ':'')+(me==='hunter'?(bur?'You, burrowed: the birds can\'t see you':'You ('+KIND[k].n+')'):`${KIND[k].n}! It catches a bird by landing on it (or if you step onto it)`);
  if(bur){const l=document.createElement('span');l.className='burtag';l.textContent='BURROWED';hc.appendChild(l);}
  else if(me==='hunter'&&k==='badger'&&S.dig===1){const l=document.createElement('span');l.className='burtag dig';l.textContent='TOUGH GROUND';hc.appendChild(l);hc.dataset.tip+=' · Tough ground: stay still once more to burrow';}}
 // sense: hunter only. The shaded box is yes or no. It does not name a direction or draw a compass.
 if(me==='hunter'&&S.phase==='play'&&S.sense!=null&&S.myTurn){
  const hx=S.hunter[0],hy=S.hunter[1],range=h.senseRange;
  for(let y=0;y<S.cfg.rows;y++)for(let x=0;x<S.cfg.cols;x++){const dx=x-hx,dy=y-hy;if(Math.max(Math.abs(dx),Math.abs(dy))>range)continue;
   const c=board.children[y*S.cfg.cols+x];c.classList.add('hzone',S.sense?'hyes':'hno');
   c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(S.sense?'Sense yes: a bird is somewhere in this 2-square box. This does not point at the bird.':'Sense no: no bird in this 2-square box.');}
  const sk=S.round+':'+S.senseSeq;if(sk!==lastSense){lastSense=sk;UI.pause(1100);
   if(hc){const w=document.createElement('div');w.className='h3wave '+(S.sense?'yes':'no');hc.appendChild(w);}
   pop(board,S.sense?(S.pounce?'Still close! Pounce!':'BIRD NEAR!'):'Nothing near',S.sense?'yes':'no');
   window.SFX&&SFX.play(S.sense?'sniffYes':'sniffNo');}
  if(S.pounce)noteBanner('pounce','POUNCE: land on the bird to catch it.',true);}
 if(S.pounce&&S.myTurn&&me==='hunter'){const mine=board.querySelector('.pc.ph.mine');const cell=hc||(mine&&mine.closest('.cell'));
  if(cell&&!cell.querySelector('.pouncetag')){const t=document.createElement('span');t.className='pouncetag';t.textContent='CAN CATCH';cell.appendChild(t);}}
 // catch + knockback feedback
 const lc=h.lastCatch;if(lc&&lc.seq!==lastCatch){const fresh=lastCatch!==0||(prev&&prev.h3);lastCatch=lc.seq;
  if(fresh){const ac=cellAt(board,S,lc.at),tc=cellAt(board,S,lc.to);
   if(ac){const m=document.createElement('div');m.className='h3claw';m.innerHTML=CLAW;ac.appendChild(m);}
   if(tc)tc.classList.add('h3kb');
   const who=tname(S,lc.bird),byOther=h.hunt&&me==='hunter'&&lc.by!==h.mySeat;pop(board,byOther?`${KIND[lc.by].n} ${lc.ko?'knocked out':'caught'} the ${who}!`:me==='hunter'?(lc.ko?`${who} KNOCKED OUT!`:`Caught the ${who}!`):me===lc.bird||(S.h3.team&&S.h3.mySeat===lc.bird)?(lc.ko?'You were knocked out!':'CAUGHT! Knocked back 2'):(lc.ko?`${who} knocked out!`:`${who} was caught!`),'catch');
   const ch=document.querySelector('#h3bar .bchip.'+lc.bird);ch&&ch.classList.add('hitnow');window.SFX&&SFX.play(me==='hunter'?'win':'warn');}}
 markHurt(S,board); warnNear(S,board);
 // waiting panel text: which seats are still open
 if(!S.joined){const w=$('wait');const open=Object.entries(h.seats).filter(([,v])=>v==='open').map(([r])=>SN[r]);if(w)w.firstElementChild.nextElementSibling.textContent=`Waiting for: ${open.join(', ')}. Send them this link:`;}}
function kindPick(S){let k=$('kindPick');if(!S.h3.needKind){k&&k.classList.add('hidden');return;}
 if(!k){k=document.createElement('div');k.id='kindPick';document.body.appendChild(k);}
 k.className='';k.innerHTML=`<div class="hbox"><h1>You're the hunter</h1><p>Pick your animal</p><div class="kindrow">${['hyena','badger'].map(x=>`<button class="kindbtn" id="pick-${x}" onclick="UI.send({t:'act',a:'kind',kind:'${x}'})"><span class="ka">${KIND[x].art}</span><b>${KIND[x].n}</b><small>${KIND[x].pw}: ${KIND[x].pwTxt}</small></button>`).join('')}</div></div>`;}
function over(S){if(S.h3.hunt)return hOver(S);if(S.h3.team)return tOver(S);const h=S.h3,w=S.winner,me=S.role,C=S.cfg;
 const art=w==='hunter'?KIND[h.kind||'hyena'].art:w==='blue'?OSTI:w==='red'?VULI:'🤝';
 const title=w==='none'?'No winner':w===me?'You win!':`${tname(S,w)} wins!`;
 const why=w==='hunter'?`The ${hName(S)} knocked out both birds in round ${S.round}.`:w==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='starved'?'The ostrich was out and no eggs were left.':`The vulture smashed every egg by round ${S.round}.`)
  :S.winBy==='time'?'Time ran out: the ostrich was out and the vulture never got every egg.':'The eggs were lost, but the vulture was already out.';
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${why}</p>${endBits(S)}</div>`;}
window.T3UI={after,hint,tag,waitMsg,nopeMsg,over,endBits,KIND};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',lobby):lobby();
})();
