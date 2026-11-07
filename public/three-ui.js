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
 badger:{n:'Honey badger',art:BADGER,pw:'Burrow',pwTxt:'Stay still to burrow. Birds cannot see you then. Moving pops you up, and you can catch on that move. A bird is out after 2 catches.'}};
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
const SUB={blue:'hide eggs',red:'hunt eggs',hunter:'catch birds',o1:'team ostrich',o2:'team ostrich',v1:'team vulture',v2:'team vulture',hyena:'Pounce · 2 catches',badger:'Burrow · 2 catches'};
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
 bar.innerHTML=h.order.filter(r=>r!=='hunter').map(bird).join('')+(five?`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: ${KIND[k].pw}. Moves 1 square a turn. Wins by knocking out an ostrich AND a vulture.">${sp(KIND[k].art,24)}<b>1</b></span>`:'');}
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
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${S.endWhy||why}</p>${winNote(S)}${endBits(S)}</div>`;}
// --- 4 players "Hunters": ostrich + vulture + hyena + honey badger (rival hunters) ---
function hChips(S){let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,live=S.phase==='play',me=h.mySeat;bar.classList.add('team');
 const bird=r=>{const b=h.birds[r],pips=Array.from({length:2},(_,i)=>`<i class="pip${i<b.catches?' on':''}"></i>`).join('');
  const tip=`${BN[r]}${r===me?' (you)':''}: caught ${b.catches} time${b.catches===1?'':'s'} (${h.ko.hyena===h.ko.badger?h.ko.hyena+' catches knock a bird out':'hyena needs '+h.ko.hyena+', honey badger '+h.ko.badger})${b.out?' · OUT ('+(b.why==='starved'?'starved':'knocked out')+')':b.catches?' · HURT'+(b.skip?' · loses its next turn':''):''}`;
  return `<span class="bchip ${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}${r===me?' me':''}" data-tip="${tip}" data-b="${r}">${sp(r==='blue'?OSTI:VULI,22)}<span class="pips">${pips}</span>${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const hun=k=>{const now=live&&(S.turn===k||(S.turn==='hunter'&&me===k)),n=h.hkos[k];
  return `<span class="bchip hunter h${k}${now?' now':''}${k===me?' me':''}" data-b="${k}" data-tip="${KIND[k].n}${k===me?' (you)':''}: ${KIND[k].pw}. ${h.ko[k]} catches knock a bird out. Knock-outs: ${n}.">${sp(KIND[k].art,24)}<b>${n}</b></span>`;};
 bar.innerHTML=bird('red')+bird('blue')+hun('hyena')+hun('badger');}
function hPieces(S,board,prev){const h=S.h3,me=h.mySeat;
 for(const x of h.hunters||[]){const c=cellAt(board,S,x.p);if(!c)continue;const bur=x.burrowed;const pc=document.createElement('div');
  pc.className='pc ph h'+x.kind+(bur?' bur':'')+(x.me?' mine':' rival');pc.innerHTML=bur?MOUND:KIND[x.kind].art;c.appendChild(pc);c.classList.add('hcell');
  if(x.me){const old=document.getElementById('current');if(old&&old!==c)old.removeAttribute('id');c.id='current';}
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(x.me?(bur?'You, burrowed: nobody can see you':'You ('+KIND[x.kind].n+')'):me==='hyena'||me==='badger'?`Your rival, the ${KIND[x.kind].n}. ${x.kind==='badger'?'If it moves onto you, you are knocked back 2. If you move onto it, you bounce back 2.':'If you move onto it, it is knocked back 2.'}`:`${KIND[x.kind].n}! It catches a bird by landing on it (or if you step onto it)`);
  if(bur){const l=document.createElement('span');l.className='burtag';l.textContent='BURROWED';c.appendChild(l);}
}
}
function hOver(S){const h=S.h3,w=S.winner,me=h.mySeat,C=S.cfg;
 const art=w==='hyena'||w==='badger'?KIND[w].art:w==='blue'?OSTI:w==='red'?VULI:'🤝';
 const title=w==='none'?'No winner':w===me?'You win!':`${tname(S,w)} wins!`;
 const ko=`Knock-outs: hyena ${h.hkos.hyena}, honey badger ${h.hkos.badger}.`;
 const why=w==='hyena'||w==='badger'?`Both birds were out. ${ko}${h.hkos.hyena===h.hkos.badger?' Tie: the last knock-out wins.':''}`:w==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='starved'?'The ostrich was out and no eggs were left.':`The vulture smashed every egg by round ${S.round}.`):`No hunter got a knock-out. ${ko}`;
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${S.endWhy||why}</p>${winNote(S)}${endBits(S)}</div>`;}
// --- in game ---
let lastSense='',lastCatch=0,deadline=0,clockMs=10000,raf=0,lastTurnKey='',nearSeen=null;
function warnNear(S,board){if(!window.BORing)return;if(!S||S.phase!=='play'){nearSeen=null;return;}
 const now=BORing.seenHunterKinds(S),prev=nearSeen;nearSeen=now.slice();
 const added=prev?BORing.hunterAlerts(prev,now):now;
 added.forEach(k=>pop(board,BORing.hunterNearLabel(k),'near'));}
function tag(S){if(S.h3&&S.h3.team&&S.h3.mySeat!=='hunter')return tTag(S);const k=S.h3&&S.h3.kind||'hyena';return `<span style="display:inline-block;width:30px;height:30px;vertical-align:middle">${KIND[k].art}</span> ${KIND[k].n.toUpperCase()}`;}
function waitMsg(S){return `Wait, it's the ${tname(S,S.turn)}'s turn.`;}
function nopeMsg(S){return `Move up to ${S.h3.range} square${S.h3.range>1?'s':''}: tap a glowing square.`;}
function hint(S,a){if(S.h3.team&&!hint.in){hint.in=1;try{return tHint(S,a);}finally{hint.in=0;}}const r=S.role,t=S.turn;
 if(r==='hunter'&&S.myTurn){const k=S.h3.kind;
  a.innerHTML=S.pounce?'<button class="on" title="Skip this extra move. You will not catch the bird." onclick="UI.send({t:\'act\',a:\'hstay\'})">Stop</button>':`<button title="${k==='badger'?(S.burrowed?'Stay burrowed. Birds still cannot see you.':'Stay still to burrow.'):'Stay put and end your turn.'}" onclick="UI.send({t:'act',a:'hstay'})">${k==='badger'?(S.burrowed?'Stay':'Burrow'):'Stay'}</button>`;
  if(S.pounce)return 'One more square. Bright dots: the bird is most likely here.';
  const burrowNote=k!=='badger'||S.burrowed?'':'Stay still to burrow. ';
  return burrowNote+`Tap a glowing square to move up to ${S.h3.range}. ${S.sense?'Rose dots: a bird may be here.':'No bird near.'}`;}
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
 bar.innerHTML=bird('red')+bird('blue')+`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: ${KIND[k].pw}. Moves 1 square a turn. Wins by knocking out both birds.">${sp(KIND[k].art,26)}<b>1</b></span>`;}
function clock(S){let c=$('clock3');if(!c){c=document.createElement('div');c.id='clock3';c.innerHTML='<div class="cfill"></div><span class="ctxt"></span>';$('h3bar').after(c);}
 const on=S.phase==='play'&&S.h3.clockLeft!=null;c.classList.toggle('hidden',!on);if(!on){cancelAnimationFrame(raf);return;}
 const tk=S.round+':'+S.turn+':'+S.h3.clockLeft,local=Math.max(0,deadline-Date.now());if(tk!==lastTurnKey||Math.abs(local-S.h3.clockLeft)>1500){lastTurnKey=tk;deadline=Date.now()+S.h3.clockLeft;clockMs=S.h3.clockMs;}
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
// "The ostrich is out." once per elimination, for everyone still playing. outSeen remembers which birds were already out (a re-render, or opening
// the page mid-game, never repeats it; a new game clears it). The line stays up a few seconds and is re-applied if the next state redraws the banner.
const outSeen={};let outNote=null;
function outBanner(S,prev){const birds=S.h3.birds;if(!birds)return;
 const first=!(prev&&prev.h3);
 for(const [r,b] of Object.entries(birds)){
  if(!b.out){delete outSeen[r];continue;}
  if(outSeen[r])continue;outSeen[r]=1;
  const mine=r===(S.h3.mySeat||S.role);
  if(!first&&!mine&&S.phase==='play'){const txt=window.CatchText.outLine(r);outNote={txt,until:Date.now()+4000};noteBanner('no',txt,true);setTimeout(()=>{const bn=$('banner');if(bn&&bn.textContent===txt){bn.textContent='';bn.className='hidden';}},4000);}}
 if(outNote&&Date.now()<outNote.until)noteBanner('no',outNote.txt);}
// The honey badger's quotes (public/badgerlines.js): one line at a time near the badger's square, about 3 seconds each. They sit in their own
// element, not in the board, so the next state redrawing the board does not wipe them. The words and who may see them live in badgerlines.js.
const BL=window.BadgerLines;let bPicker=BL.createPicker(),bLastS=null,bBusy=false;const bQ=[];
const winNote=S=>{const t=BL.winLine(S);return t?`<p class="badgerwin">${t}</p>`:'';};
function badgerSay(text){if(bQ.length<4)bQ.push(text);setTimeout(()=>bPump(0),60);} // after this state's board is drawn, so the badger's square is there to point at
function bPump(tries){if(bBusy||!bQ.length)return;
 if((document.querySelector('#board .h3pop')||document.getElementById('announce')&&document.getElementById('announce').classList.contains('show'))&&tries<10){setTimeout(()=>bPump(tries+1),400);return;}
 bBusy=true;const o=document.createElement('div');o.id='badgerline';o.className='h3pop badger';o.textContent=bQ.shift();document.body.appendChild(o);
 const cell=document.querySelector('#board .pc.ph.hbadger'),bd=document.getElementById('board'),r=(cell||bd).getBoundingClientRect(),w=o.offsetWidth,h=o.offsetHeight,vw=window.innerWidth;
 let x=r.left+r.width/2,y=cell?r.top-8-h/2:r.top+r.height/2;x=Math.max(w/2+8,Math.min(vw-w/2-8,x));if(y<h/2+8)y=r.bottom+8+h/2;
 o.style.left=x+'px';o.style.top=y+'px';
 setTimeout(()=>{o.remove();bBusy=false;bPump(0);},3000);}
function badgerLines(S,prev){if(S===bLastS)return;bLastS=S;if(!prev||(prev.round!=null&&S.round<prev.round))bPicker=BL.createPicker();
 for(const e of BL.detect(prev,S,bPicker))badgerSay(e.text);}
function pop(board,txt,cls){const o=document.createElement('div');o.className='h3pop '+cls;o.textContent=txt;board.appendChild(o);setTimeout(()=>o.remove(),cls==='catch'?3400:1800);}
// --- Announcements: one plain line for a big event (catch, knock-out, the hunters meeting, the badger coming out, the start-of-game line) on every phone.
// The line lives in #announce, outside #board, so a board redraw never erases it. Each line stays up about 3 seconds, one at a time, in order.
// Where the event happened (a square highlight) is drawn on the board only when the view carries that square, and the server sends it only to a player who can see it. ---
const ANN_MS=3000,annQ=[];let annBusy=false;
function announce(txt){if(!txt)return;annQ.push(txt);if(annQ.length>4)annQ.shift();annPump();}
function annPump(){if(annBusy||!annQ.length)return;annBusy=true;
 let o=$('announce');if(!o){o=document.createElement('div');o.id='announce';o.setAttribute('role','status');o.setAttribute('aria-live','polite');document.body.appendChild(o);}
 o.textContent=annQ.shift();o.className='show';
 setTimeout(()=>{o.className='';o.textContent='';setTimeout(()=>{annBusy=false;annPump();},120);},ANN_MS);}
const evSeen={kick:0,pop:0,rival:0,stone:0};
function events(S,prev,board){
 if(!S)return;if(!S.three)rulesMode('2');
 const h=S.h3||{};
 for(const e of window.CatchText.newEvents(evSeen,S,prev)){announce(e.text);
  // the square highlight: the hyena's landing square for the meeting; the badger's own square for a pop-out, only if this phone can see the badger
  const sq=e.kind==='rival'||e.kind==='kick'?e.square:e.seen?(h.hunters?(h.hunters.find(x=>x.kind==='badger')||{}).p:h.hunter):null,c=cellAt(board,S,sq);c&&c.classList.add('h3kb');}}
// One plain line at the start of every game: who hunts what, naming only the animals in the game (roles.js).
let startDone=false;
function startLine(S,prev,mode){
 if(!S||S.phase!=='play'){startDone=false;return;}
 const h=S.h3;if(startDone||(h&&(h.ready===false||h.needKind||(h.team&&h.teamSetup&&h.teamSetup!=='done'))))return;
 startDone=true;if(!prev&&S.round>1)return;
 announce(window.Roles.huntLine(mode,S.role==='hunter'?(S.kind||(h&&h.kind)):(h&&h.kind)));}
function after(S,prev,board){badgerLines(S,prev);chips(S);clock(S);kindPick(S);if(S.h3.team)tPieces(S,board);if(S.h3.hunt)hPieces(S,board,prev);
 rulesMode(S.h3.hunt?'4h':S.h3.team?String(S.h3.n):'3');
 const h=S.h3,k=h.kind||'hyena',me=S.role;
 // hunter piece: the hunter always sees itself; a bird only sees it within 2 squares (never a burrowed badger)
 const hp=h.hunter,hc=cellAt(board,S,hp);
 if(hc){const bur=me==='hunter'&&S.burrowed;const pc=document.createElement('div');pc.className='pc ph h'+k+(bur?' bur':'')+(me==='hunter'?' mine':'');pc.innerHTML=bur?MOUND:KIND[k].art;hc.appendChild(pc);hc.classList.add('hcell');if(me==='hunter'){const old=document.getElementById('current');if(old&&old!==hc)old.removeAttribute('id');hc.id='current';}
  hc.dataset.tip=(hc.dataset.tip?hc.dataset.tip+' · ':'')+(me==='hunter'?(bur?'You, burrowed: the birds can\'t see you':'You ('+KIND[k].n+')'):`${KIND[k].n}! It catches a bird by landing on it (or if you step onto it)`);
  if(bur){const l=document.createElement('span');l.className='burtag';l.textContent='BURROWED';hc.appendChild(l);}
}
 // ambush sight: a burrowed badger sees the exact square of any bird next to it (S.seenBirds comes from the rules only while burrowed)
 if(me==='hunter'&&S.phase==='play'&&S.burrowed&&S.seenBirds)for(const q of S.seenBirds){const c=cellAt(board,S,q.p);if(!c||c.querySelector('.pc.po,.pc.pv'))continue;
  const d=document.createElement('div');d.className='pc '+(q.type==='o'?'po':'pv')+' ambushsee';d.innerHTML=q.type==='o'?OSTI:VULI;c.appendChild(d);
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+'A bird is next to you. You can see it from your burrow.';c.setAttribute('aria-label',(c.getAttribute('aria-label')?c.getAttribute('aria-label')+'. ':'')+'Bird next to you');}
 // sense: hunter only. The shaded box is yes or no. It does not name a direction or draw a compass.
 if(me==='hunter'&&S.phase==='play'&&S.sense!=null&&S.myTurn){
  const hx=S.hunter[0],hy=S.hunter[1],range=h.senseRange;
  if(S.sense){for(let y=0;y<S.cfg.rows;y++)for(let x=0;x<S.cfg.cols;x++){const dx=x-hx,dy=y-hy;if(!dx&&!dy)continue;if(Math.max(Math.abs(dx),Math.abs(dy))>range)continue;
   const c=board.children[y*S.cfg.cols+x];if(!c||!c.classList||!c.classList.contains('cell'))continue;if(c.querySelector('.pc.po,.pc.pv'))continue;
   c.classList.add('maybird');if(S.pounce&&S.firstAt&&Math.max(Math.abs(x-S.firstAt[0]),Math.abs(y-S.firstAt[1]))<=range)c.classList.add('bright');const had=c.getAttribute('aria-label')||'';if(!/Bird may be here/.test(had))c.setAttribute('aria-label',had?had+'. Bird may be here':'Bird may be here');}}
  const sk=S.round+':'+S.senseSeq;if(sk!==lastSense){lastSense=sk;UI.pause(1100);
   pop(board,S.sense?(S.pounce?'Still close.':'Bird may be here.'):'Nothing near',S.sense?'yes':'no');
   window.SFX&&SFX.play(S.sense?'sniffYes':'sniffNo');}
  if(S.pounce)noteBanner('pounce','Pounce!',true);}
 if(S.pounce&&S.myTurn&&me==='hunter'){const mine=board.querySelector('.pc.ph.mine');const cell=hc||(mine&&mine.closest('.cell'));
  if(cell&&!cell.querySelector('.pouncetag')){const t=document.createElement('span');t.className='pouncetag';t.textContent='CAN CATCH';cell.appendChild(t);}}
 // catch + knockback feedback
 if(S.phase&&S.phase.startsWith('setup'))lastCatch=0;
 const lc=h.lastCatch;if(lc&&lc.seq!==lastCatch){const fresh=lastCatch!==0||(prev&&prev.h3);lastCatch=lc.seq;
  if(fresh){const ac=cellAt(board,S,lc.at),tc=cellAt(board,S,lc.to);
   const word=lc.bird==='red'||lc.bird==='v1'||lc.bird==='v2'?'vulture':'ostrich';
   if(ac&&me==='hunter'&&!ac.querySelector('.pc.po,.pc.pv')){const disc=document.createElement('div');disc.className='pc '+(word==='ostrich'?'po':'pv')+' foundnow';disc.innerHTML=word==='ostrich'?OSTI:VULI;ac.appendChild(disc);}
   if(ac){const m=document.createElement('div');m.className='h3claw';m.innerHTML=CLAW;ac.appendChild(m);}
   if(tc)tc.classList.add('h3kb');
   // what the catch means, in words: hurt or out, and who did it (catchtext.js)
   const CT=window.CatchText,seat=h.mySeat||me,by=lc.by||k;
   announce(CT.catchLine(lc,seat,by,CT.catchesLeft(h,lc)));
   const ch=document.querySelector('#h3bar .bchip.'+lc.bird);ch&&ch.classList.add('hitnow');window.SFX&&SFX.play(me==='hunter'?'win':'warn');}}
 outBanner(S,prev);
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
 return `<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>${S.endWhy||why}</p>${winNote(S)}${endBits(S)}</div>`;}
window.T3UI={after,events,startLine,announce,hint,tag,waitMsg,nopeMsg,over,endBits,KIND};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',lobby):lobby();
})();
