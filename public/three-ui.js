// 3-player mode UI: lobby step, hunter pick, per-bird header, shot clock, hunter piece, sense wave, catch + knockback, burrow.
// Rules live on the server (three.js); this only draws what this seat is allowed to see.
(function(){
const $=id=>document.getElementById(id),key=p=>p[0]+','+p[1],D=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
// --- marks: bold, one per square, distinct by SHAPE and colour, same in every theme ---
const HYENA=ART.hyena;
// The badger, face on: a white face with two dark stripes and angry brows (Brian, 2026-11-08).
const BADGER=ART.badger;
const MOUND='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true"><path d="M2 36 Q8 8 20 6 Q32 8 38 36 Z" fill="#f6e2a8" stroke="#1a1008" stroke-width="3.2" stroke-linejoin="round"/><path d="M10 26 q3-2 6 0M24 22 q3-2 6 0M16 32 q3-2 6 0" stroke="#6b4420" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="17" cy="20" r="2.6" fill="#fff" stroke="#111" stroke-width="1"/><circle cx="23" cy="20" r="2.6" fill="#fff" stroke="#111" stroke-width="1"/><circle cx="17" cy="20.6" r="1.2" fill="#111"/><circle cx="23" cy="20.6" r="1.2" fill="#111"/></svg>';
const OSTI=ART.ostrich;
const VULI=ART.vulture;
const KIND={hyena:{n:'Hyena',art:HYENA,pw:'Pounce',pwTxt:'When you miss, move 1 more.'},
 badger:{n:'Badger',art:BADGER,pw:'Burrow',pwTxt:'Burrow: stay still to hide.'}};
// The small line is the sentence once. Prefixing the short name doubled a sentence that already started with that name.
const kindLine=k=>KIND[k].pwTxt;
const BN={blue:'Ostrich',red:'Vulture',hunter:'Hunter'};
const hName=S=>S.h3&&S.h3.kind?KIND[S.h3.kind].n:'Hunter';
const tname=(S,r)=>r==='hunter'?hName(S):r==='hyena'||r==='badger'?KIND[r].n:(S&&S.h3&&S.h3.team?{o1:'Ostrich 1',o2:'Ostrich 2',v1:'Vulture 1',v2:'Vulture 2'}[r]:0)||BN[r];
const sp=(svg,px)=>`<span class="h3i" style="width:${px}px;height:${px}px">${svg}</span>`;
// Chip row marks (Brian, 2026-11-08). Hearts under a bird: one per catch it can take; a catch empties one, from the right.
// Claws under a hunter: three sets of scratches; each catch it makes darkens one set. These never appear on board squares.
const HEART='<svg viewBox="0 0 12 11" aria-hidden="true"><path d="M6 10.2C2.6 7.6 .8 5.8 .8 3.6C.8 2 2 .8 3.5 .8C4.6 .8 5.5 1.4 6 2.3C6.5 1.4 7.4 .8 8.5 .8C10 .8 11.2 2 11.2 3.6C11.2 5.8 9.4 7.6 6 10.2Z"/></svg>';
const hearts=(n,lost)=>Array.from({length:n},(_,i)=>`<i class="heart${i>=n-lost?' lost':''}">${HEART}</i>`).join('');
// One catch = three curved scratches, as in Brian's approved "Three scratches" drawing (bw/layout/claw-marks.png).
const SCRATCH='<svg viewBox="-1 -1 11 12" aria-hidden="true"><path d="M0 9Q1 4 3 1M3 10Q4 4 6 0M6 9Q7 4 9 1"/></svg>';
// Sets shown (Brian, 2026-11-08): 3 in 3-player games, 4 in Hunters and 5-player games; each catch past that adds one more earned set. No numbers.
const claws=(n,base)=>{n=n|0;const k=Math.max(base,n);return `<span class="claws${k>4?' many':''}">${Array.from({length:k},(_,i)=>`<i class="claw${i<n?' on':''}">${SCRATCH}</i>`).join('')}</span>`;};
const caught=h=>Object.values(h.birds||{}).reduce((n,b)=>n+(b.catches|0),0);
// --- lobby: Classic 2-player by default (the old simple lobby). Bigger modes sit behind a small "More players" link:
// 3, 4 (2 vs 2 or Hunters) and 5. Picking one routes both play buttons into a setup step (your seat, friend/computer for the rest). ---
const SN={o1:'Ostrich 1',o2:'Ostrich 2',v1:'Vulture 1',v2:'Vulture 2',blue:'Ostrich',red:'Vulture',hunter:'Hunter',hyena:'Hyena',badger:'Badger'};
const SEATS={'3':['blue','red','hunter'],'4':['o1','v1','o2','v2'],'4h':['blue','red','hyena','badger'],'5':['o1','v1','o2','v2','hunter']};
const MODES=[['2','Classic','2 players'],['3','3','+ hunter'],['4','4','2 vs 2'],['4h','4','Hunters'],['5','5','2v2 + hunter']];
const TITLE={'3':'3 players · + hunter','4':'4 players · 2 vs 2','4h':'4 players · Hunters','5':'5 players · 2 vs 2 + hunter'};
const isOs=r=>r==='blue'||r==='o1'||r==='o2';
const seatArt=(r,k)=>r==='hunter'?KIND[k].art:r==='hyena'||r==='badger'?KIND[r].art:isOs(r)?OSTI:VULI;
const SUB={blue:'hide eggs',red:'hunt eggs',hunter:'catch birds',o1:'team ostrich',o2:'team ostrich',v1:'team vulture',v2:'team vulture',hyena:'Pounce',badger:'Burrow'};
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
 const note=mode==='4'||mode==='5'?'<p class="t3note">Ostriches 1 + 2 team up (each has its own 2-egg nest, either can warm any egg). Vultures 1 + 2 share every sniff.</p>':mode==='4h'?'<p class="t3note">Hyena and badger are rivals: both hunt the birds. Most knock-outs wins once both birds are out.</p>':'';
 $('t3seats').innerHTML=note+others.map(r=>`<div class="t3row"><span class="t3who">${sp(seatArt(r,kind),26)} ${SN[r]}</span><span class="seg"><button data-seat="${r}" data-v="friend" class="${seat[r]==='friend'?'on':''}">👤 Friend</button><button data-seat="${r}" data-v="bot" class="${seat[r]==='bot'?'on':''}">🤖 Computer</button></span></div>`).join('');
 const hasH=S3.includes('hunter'),pick=hasH&&(myRole==='hunter'||seat.hunter==='bot');
 $('t3kind').innerHTML=!hasH?'':pick?`<div class="t3lbl">${myRole==='hunter'?'Your hunter':'Computer hunter'}</div><div class="kindrow">${['hyena','badger'].map(k=>`<button class="kindbtn${kind===k?' on':''}" data-k="${k}"><span class="ka">${KIND[k].art}</span><b>${KIND[k].n}</b><small>${kindLine(k)}</small></button>`).join('')}</div>`:'<p class="t3note">The hunter player picks hyena or badger when they join.</p>';}
// --- 4/5 players (2v2, + hunter): numbered birds, teammates, shared sniffs ---
const NUM=r=>/\d/.test(r)?r[1]:'';
function tTag(S){const r=S.h3.mySeat;if(r==='hunter')return tag(S);return `<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${isOs(r)?OSTI:VULI}</span> ${SN[r].toUpperCase()}`;}
function tHint(S,a){const r=S.h3.mySeat,t=S.turn,h=S.h3;
  if(r==='hunter'&&S.myTurn)return hint(Object.assign({},S,{h3:h}),a);
 if(!h.ready)return h.needKind?'Pick your hunter.':`Waiting for all ${h.n} players…`;
 if(h.setupStep==='done'&&h.teamSetup&&h.teamSetup!=='done')return h.teamSetup==='eggs'?'Partner is hiding eggs…':'Partner is placing…';
 const me=h.birds[r];if(me&&me.out)return 'You\'re out. Watching.';
 if((r==='blue'||r==='o1'||r==='o2')&&window.UI&&UI._S()&&UI._S().sittingAt&&UI._S().ostrich&&UI._S().sittingAt.some(q=>q[0]===UI._S().ostrich[0]&&q[1]===UI._S().ostrich[1]))return 'The vulture sees you sit.';return `${tname(S,t)}'s turn…`;}
function tChips(S){let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,live=S.phase==='play',five=h.n===5,ko=h.ko;bar.classList.add('team');
 const bird=r=>{const b=h.birds[r],pips=five?hearts(ko,b.catches):'';
  const tip=`${SN[r]}${r===h.mySeat?' (you)':''}: ${b.out?'out.':b.catches?'caught '+(b.catches===1?'once.':b.catches+' times.'):'not caught.'}`;
  return `<span class="bchip ${isOs(r)?'blue':'red'} s${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}${r===h.mySeat?' me':''}" data-tip="${tip}" data-b="${r}">${sp(isOs(r)?OSTI:VULI,22)}<b class="cnum">${NUM(r)}</b>${five?`<span class="pips">${pips}</span>`:''}${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const k=h.kind||'hyena';
 bar.innerHTML=h.order.filter(r=>r!=='hunter').map(bird).join('')+(five?`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: catches birds.">${sp(KIND[k].art,24)}${claws(caught(h),4)}</span>`:'');}
function tPieces(S,board){const h=S.h3,me=h.mySeat;
 const badge=(c,r,mate)=>{const b=document.createElement('b');b.className='snum '+(isOs(r)?'o':'v')+(mate?' mate':'')+(r===me?' me':'');b.textContent=NUM(r);c.appendChild(b);};
 for(const q of h.pieces){if(h.birds&&h.birds[q.seat]&&h.birds[q.seat].out)continue;const c=cellAt(board,S,q.p);if(!c||q.p[0]<0)continue;const d=document.createElement('div');d.className='pc '+(q.type==='o'?'po':'pv')+' other'+(q.mate?' mate':' opp');
  d.innerHTML=q.type==='o'?(q.carrying&&window.ART&&ART.ostrichCarry?ART.ostrichCarry:OSTI):VULI;if(q.carrying)d.classList.add('carrying');c.appendChild(d);c.dataset.seat=q.seat;badge(c,q.seat,q.mate);
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+SN[q.seat]+(q.mate?' (your teammate)':'')+(q.carrying?', carrying an egg':'');}
 const mine=me==='hunter'?null:cellAt(board,S,isOs(me)?S.ostrich:S.vulture);if(mine)badge(mine,me,false);
 const ms=h.mateSniff;if(ms){const c=cellAt(board,S,ms.p);if(c){const r=document.createElement('div');r.className='msniff '+(ms.yes?'yes':'no');r.textContent=ms.yes?'Egg near':'No egg';c.appendChild(r);
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(isOs(me)?'':'Your teammate sniffed here: ')+(ms.yes?'an egg is on or next to this square':'no egg on or next to this square');}}
 if(isOs(me)&&S.eggs)S.eggs.forEach(e=>{if(!e.alive||!e.pos||e.mine)return;const c=cellAt(board,S,e.pos);c&&c.classList.add('mateegg');});}
const HUNT_TIE_WHY='Both birds are out. The hunters tie: you have the same number of knock-outs, and the same number of catches.';
const HUNT_TIE_RULE='If you have the same number of knock-outs, whoever got more catches wins. Same catches? You tie.';
const DRAW_WHY='Time ran out and nobody met their goal.';
function isHuntTie(S){return !!(S&&S.h3&&S.h3.hunt&&S.winner==='none'&&S.winBy!=='time');}
function endTitle(S,winTitle){return isHuntTie(S)?"It's a tie.":S.winner==='none'?"It's a draw.":winTitle;}
function endArt(S,winArt){return isHuntTie(S)?'<span>'+KIND.hyena.art+'</span><span>'+KIND.badger.art+'</span>':S.winner==='none'?'<span>'+OSTI+'</span><span>'+VULI+'</span>':winArt;}
function endWhyText(S,fallback){return S.endWhy||(isHuntTie(S)?HUNT_TIE_WHY:S.winner==='none'?DRAW_WHY:fallback);}
function endBox(S,art,title,why){return `<div class="lobbybox"><div class="bigost${S.winner==='none'?' pair':''}">${art}</div><h1>${title}</h1><p>${why}</p>${winNote(S)}${endBits(S)}</div>`;}
function tOver(S){const h=S.h3,w=S.winner,me=h.mySeat,C=S.cfg,mySide=me==='hunter'?'hunter':isOs(me)?'blue':'red';
 const art=w==='hunter'?KIND[h.kind||'hyena'].art:w==='blue'?OSTI:w==='red'?VULI:'';
 const title=w===mySide?(me==='hunter'?'You win!':'Your team wins!'):w==='hunter'?`${hName(S)} wins!`:w==='blue'?'Ostriches win!':'Vultures win!';
 const why=w==='hunter'?`The ${hName(S)} knocked out an ostrich and a vulture by round ${S.round}.`:w==='blue'?`The ostriches kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='ostriches-out'?'Both ostriches were out.':`The vultures smashed every egg by round ${S.round}.`)
  :'Every bird that could win was out.';
 return endBox(S,endArt(S,art),endTitle(S,title),endWhyText(S,why));}
// --- 4 players "Hunters": ostrich + vulture + hyena + badger (rival hunters) ---
function hChips(S){let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,live=S.phase==='play',me=h.mySeat;bar.classList.add('team');
 const bird=r=>{const b=h.birds[r],pips=hearts(2,b.catches);
  const tip=`${BN[r]}${r===me?' (you)':''}: ${b.out?'out.':b.catches?b.catches+' of '+(h.ko.hyena===h.ko.badger?h.ko.hyena:h.ko.hyena)+' catches.':'not caught.'}`;
  return `<span class="bchip ${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}${r===me?' me':''}" data-tip="${tip}" data-b="${r}">${sp(r==='blue'?OSTI:VULI,22)}<span class="pips">${pips}</span>${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const hun=k=>{const now=live&&(S.turn===k||(S.turn==='hunter'&&me===k)),n=h.hkos[k];
  const tip=k==='hyena'?`${KIND[k].n}${k===me?' (you)':''}: Pounce. When you miss, move 1 more square. ${h.ko[k]} catches knock a bird out. Knock-outs: ${n}.`:`${KIND[k].n}${k===me?' (you)':''}: ${KIND[k].pw}. ${h.ko[k]} catches knock a bird out. Knock-outs: ${n}.`;
  return `<span class="bchip hunter h${k}${now?' now':''}${k===me?' me':''}" data-b="${k}" data-tip="${tip}">${sp(KIND[k].art,24)}${claws(h.hcatches?h.hcatches[k]|0:0,4)}</span>`;};
 bar.innerHTML=bird('red')+bird('blue')+hun('hyena')+hun('badger');}
function hPieces(S,board,prev){const h=S.h3,me=h.mySeat;
 for(const x of h.hunters||[]){const c=cellAt(board,S,x.p);if(!c)continue;const bur=x.burrowed;const pc=document.createElement('div');
  pc.className='pc ph h'+x.kind+(bur?' bur':'')+(x.me?' mine':' rival');pc.innerHTML=bur?MOUND:KIND[x.kind].art;c.appendChild(pc);c.classList.add('hcell');
  if(x.me){const old=document.getElementById('current');if(old&&old!==c)old.removeAttribute('id');c.id='current';}
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+(x.me?(bur?'You, hidden.':'You.'):me==='hyena'||me==='badger'?'Rival. Landing on it shoves it.':KIND[x.kind].n+'. Don\'t let it land on you.');
}
}
function hOver(S){const h=S.h3,w=S.winner,me=h.mySeat,C=S.cfg;
 const art=w==='hyena'||w==='badger'?KIND[w].art:w==='blue'?OSTI:w==='red'?VULI:'';
 const title=w===me?'You win!':`${tname(S,w)} wins!`;
 const ko=`Knock-outs: hyena ${h.hkos.hyena}, badger ${h.hkos.badger}.`;
 const why=w==='hyena'||w==='badger'?`Both birds were out. ${ko}`:w==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='starved'?'The ostrich was out and no eggs were left.':`The vulture smashed every egg by round ${S.round}.`):isHuntTie(S)?HUNT_TIE_WHY:HUNT_TIE_RULE;
 return endBox(S,endArt(S,art),endTitle(S,title),endWhyText(S,why));}
// --- in game ---
let lastSense='',lastCatch=0,deadline=0,clockMs=10000,raf=0,lastTurnKey='',nearSeen=null;
function warnNear(S,board,prev){if(!window.BORing)return;if(!S||S.phase!=='play'){nearSeen=null;return;}
 // Look out! is a 1s beat after a hit: no "X near!" on that state, or on a
 // redraw during the beat. Remember who is already seen so the line does not
 // pop the moment the beat ends and cover the real event line.
 const pol=prev&&window.SURPRISE&&SURPRISE.policy?SURPRISE.policy(S,prev):null;
 const now=BORing.seenHunterKinds(S);
 if((pol&&pol.lookout)||Date.now()<lookoutUntil){nearSeen=now.slice();return;}
 const was=nearSeen;nearSeen=now.slice();
 const added=was?BORing.hunterAlerts(was,now):now;
 added.forEach(k=>pop(board,BORing.hunterNearLabel(k),'near'));}
function tag(S){if(S.h3&&S.h3.team&&S.h3.mySeat!=='hunter')return tTag(S);const k=S.h3&&S.h3.kind||'hyena';return `<span style="display:inline-block;width:30px;height:30px;vertical-align:middle">${KIND[k].art}</span> ${KIND[k].n.toUpperCase()}`;}
function waitMsg(S){return `Wait, it's the ${tname(S,S.turn)}'s turn.`;}
function nopeMsg(S){return `Move up to ${S.h3.range} square${S.h3.range>1?'s':''}: tap a glowing square.`;}
function hint(S,a){if(S.h3.team&&!hint.in){hint.in=1;try{return tHint(S,a);}finally{hint.in=0;}}const r=S.role,t=S.turn;
 if(r==='hunter'&&S.myTurn){const k=S.h3.kind;
  a.innerHTML=S.pounce?'<button class="on" title="Skip this extra move. You will not catch the bird." onclick="UI.send({t:\'act\',a:\'hstay\'})">Stay</button>':`<button title="${k==='badger'?(S.burrowed?'Stay burrowed. Birds still cannot see you.':'Stay still to burrow.'):'Stay put and end your turn.'}" onclick="UI.send({t:'act',a:'hstay'})">${k==='badger'?(S.burrowed?'Stay':'Burrow'):'Stay'}</button>${S.canBurst?`<button title="Come up and shove the hyena back." onclick="UI.send({t:'act',a:'hburst'})">Burst out</button>`:''}`;
  if(S.pounce)return 'When you miss, move 1 more square.';
  if(S.h3.extra)return 'Your turn again. Tap to move.';
  const burrowNote=k==='badger'&&!S.burrowed?'Tap to move, or Burrow. ':'Your turn. Tap to move. ';
  return burrowNote+(S.sense?'':'No bird near.');}
 if(!S.h3.ready)return S.h3.needKind?'Pick your hunter.':`Waiting for all ${S.h3.hunt?4:3} players…`;
 if(r!=='hunter'&&S.h3.birds[r]&&S.h3.birds[r].out)return 'You\'re out. Watching.';
 if(r==='blue'&&window.UI&&UI._S()&&UI._S().sittingAt&&UI._S().ostrich&&UI._S().sittingAt.some(q=>q[0]===UI._S().ostrich[0]&&q[1]===UI._S().ostrich[1]))return 'The vulture sees you sit.';
 if(t==='hunter'&&S.h3&&S.h3.extra)return tname(S,t)+"'s turn again.";
 return `${tname(S,t)}'s turn…`;}
function chips(S){if(S.h3.hunt)return hChips(S);if(S.h3.team)return tChips(S);let bar=$('h3bar');if(!bar){bar=document.createElement('div');bar.id='h3bar';$('hud').after(bar);
  bar.addEventListener('click',e=>{const c=e.target.closest('[data-tip]');if(c&&UI._tip)UI._tip(c.dataset.tip);});}
 const h=S.h3,ko=h.ko,live=S.phase==='play';
 const bird=r=>{const b=h.birds[r],pips=hearts(ko,b.catches);
  const tip=`${BN[r]}: ${b.out?'out.':b.catches?b.catches+' of '+ko+' catches.':'not caught.'}`;
  return `<span class="bchip ${r}${b.out?' out':''}${b.catches&&!b.out?' injured':''}${live&&S.turn===r?' now':''}" data-tip="${tip}" data-b="${r}">${sp(r==='blue'?OSTI:VULI,24)}<span class="pips">${pips}</span>${b.out?'<b class="ko">OUT</b>':''}</span>`;};
 const k=h.kind||'hyena';
 bar.innerHTML=bird('red')+bird('blue')+`<span class="bchip hunter${live&&S.turn==='hunter'?' now':''}" data-tip="${KIND[k].n}: catches birds.">${sp(KIND[k].art,26)}${claws(caught(h),3)}</span>`;}
function clock(S){let c=$('clock3');if(!c){c=document.createElement('div');c.id='clock3';c.innerHTML='<div class="cfill"></div><span class="ctxt"></span>';const anchor=$('h3bar')||$('turnTag')||$('board');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(c,anchor.nextSibling);}
 const src=S.h3&&S.h3.clockLeft!=null?S.h3:(S.clockLeft!=null?S:null);
 const on=S.phase==='play'&&!!src;c.classList.toggle('hidden',!on);if(!on){cancelAnimationFrame(raf);return;}
 if(src.clockMs)clockMs=src.clockMs;
 if(src.clockPaused){cancelAnimationFrame(raf);lastTurnKey='';const left=Math.max(0,src.clockLeft),s=Math.ceil(left/1000);c.firstChild.style.width=(100*left/clockMs)+'%';
  c.lastChild.innerHTML='<svg class="clk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '+s+'s';c.classList.toggle('low',left<=4000);c.setAttribute('aria-label','Shot clock paused, '+s+' seconds');c.dataset.who=S.turn;c.classList.toggle('mine',!!S.myTurn);return;}
 const tk=S.round+':'+S.turn+':'+(src.extra?'2':'1')+':'+src.clockLeft,local=Math.max(0,deadline-Date.now());if(tk!==lastTurnKey||Math.abs(local-src.clockLeft)>1500){lastTurnKey=tk;deadline=Date.now()+src.clockLeft;clockMs=src.clockMs||clockMs;}
 c.dataset.who=S.turn;c.classList.toggle('mine',!!S.myTurn);
 const tick=()=>{const left=Math.max(0,deadline-Date.now()),s=Math.ceil(left/1000);c.firstChild.style.width=(100*left/clockMs)+'%';
  c.lastChild.innerHTML='<svg class="clk" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '+s+'s';c.classList.toggle('low',left<=4000);c.setAttribute('aria-label','Shot clock, '+s+' seconds');if(left>0)raf=requestAnimationFrame(tick);};
 cancelAnimationFrame(raf);tick();}
function cellAt(board,S,p){return p&&p[0]>=0?board.children[p[1]*S.cfg.cols+p[0]]:null;}
function noteBanner(cls,txt,force){const bn=$('banner');if(!bn)return;if(!force&&bn.textContent&&!bn.classList.contains('hidden'))return;if(window.BO_BANNER)BO_BANNER.set(txt,cls);else{bn.textContent=txt;bn.className=cls;}}
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
// The badger's quotes (public/badgerlines.js): one line at a time near the badger's square, about 1 second each. They sit in their own
// element, not in the board, so the next state redrawing the board does not wipe them. The words and who may see them live in badgerlines.js.
const BL=window.BadgerLines;let bPicker=BL.createPicker(),bLastS=null;
const winNote=S=>{const t=BL.winLine(S);return t?`<p class="badgerwin">${t}</p>`:'';};
function badgerSay(text){window.STATUS_QUEUE.add({id:'badgerline',className:'h3pop badger',text,priority:0});}
function badgerLines(S,prev){if(S===bLastS)return;bLastS=S;if(!prev||(prev.round!=null&&S.round<prev.round))bPicker=BL.createPicker();
 for(const e of BL.detect(prev,S,bPicker))badgerSay(e.text);}
// One look per meaning, in one corner of the square (never over its middle). "May be here" is the animal's small outline, dashed and unfilled. "Is here" (known to be there) is the same small shape filled white with a dark edge. Animals themselves stay full size.
// The shapes: an egg for the vulture's sniff and for eggs you know, a bird for the hunters' sense, a badger for a burrow a bird saw being dug. Style (dashed or filled) lives in part1.css.
// The bird is a plain (not dashed) side-view line: dashes break a small detailed shape apart, and a hunter only ever sees "may be here" birds, so there is no filled bird to mix it up with.
// The badger's dig-in spot is a pile of dirt, filled white like every other "is here" mark.
const EGGD='M18 2C9.4 2 2 15.4 2 26C2 36 8.4 42 18 42C27.6 42 34 36 34 26C34 15.4 26.6 2 18 2Z',BIRDD='M3 15L12 21C11 30 18 36 26 33C32 31 35 26 33 20L39 17L32 15C31 9 25 7 21 11C19 13 19 16 20 19C15 18 9 16 3 15Z',MOUNDD='M2 34C6 26 10 25 13 21C16 15 24 15 27 21C30 25 34 26 38 34Z';
// each outline is drawn twice: a wider dark line underneath (mk-d) and the white line on top (mk), so it stays crisp on any tile
const two=d=>'<path class="mk-d" pathLength="100" d="'+d+'"/><path class="mk" pathLength="100" d="'+d+'"/>';
const CM={
 egg:'<svg viewBox="0 0 36 44" aria-hidden="true">'+two(EGGD)+'</svg>', // egg shape B (Brian, 2026-11-08)
 bird:'<svg viewBox="0 0 40 40" aria-hidden="true">'+two(BIRDD)+'<circle class="mk-eye" cx="27" cy="13.5" r="2.2"/></svg>',
 badger:'<svg viewBox="0 0 40 40" aria-hidden="true">'+two(MOUNDD)+'<circle class="mk-eye" cx="15" cy="28" r="1.8"/><circle class="mk-eye" cx="24" cy="25" r="1.8"/><circle class="mk-eye" cx="29" cy="30" r="1.8"/></svg>'};
function markHTML(kind,cls){return CM[kind]?'<i class="cmark cm-'+kind+(cls?' '+cls:'')+'" aria-hidden="true">'+CM[kind]+'</i>':'';}
function mark(cell,kind,cls){if(!cell||!CM[kind])return null;
 // one mark per square: what is known ("is here", solid) replaces a "may be here" outline on the same square, and never the other way round
 const ex=cell.querySelector('.cmark');if(ex){if(/(^| )is( |$)/.test(cls||'')&&!ex.classList.contains('is'))ex.remove();else return null;}
 const i=document.createElement('i');i.className='cmark cm-'+kind+(cls?' '+cls:'');i.setAttribute('aria-hidden','true');i.innerHTML=CM[kind];cell.appendChild(i);return i;}
// the same mark in every square of the box around (cx,cy), clipped to the board; the centre square is left out
// An egg can never be on a rock pile, on or next to a leaf, or on a wrecked square, so those squares never get an egg mark.
const noEgg=(S,x,y)=>{const C=S.cfg,m=(S.marks||{})[x+','+y];return (C.rocks||[]).some(q=>q[0]===x&&q[1]===y)||(C.foods||[]).some(f=>Math.max(Math.abs(f[0]-x),Math.abs(f[1]-y))<=1)||m==='hit'||m==='stone';};
function marksAround(board,S,cx,cy,range,kind,cls){const C=S.cfg;let n=0;
 for(let y=Math.max(0,cy-range);y<=Math.min(C.rows-1,cy+range);y++)for(let x=Math.max(0,cx-range);x<=Math.min(C.cols-1,cx+range);x++){if(x===cx&&y===cy)continue;if(kind==='egg'&&S.cfg&&noEgg(S,x,y))continue;const c=board.children[y*C.cols+x];if(c&&c.classList&&c.classList.contains('cell')&&mark(c,kind,cls))n++;}
 return n;}
function isNearLine(item){const t=(item&&item.text||'').trim(),c=item&&item.className||'';return /\bnear[!.]?$/i.test(t)||/(^|\s)near(\s|$)/.test(c);}
function pop(board,txt,cls){if(Date.now()<lookoutUntil)return;window.STATUS_QUEUE.add({className:'h3pop '+cls,text:txt,priority:10});}
// Shared with sniff/fact notices: one one-second message, personal events before background facts.
function announce(txt,priority,hold,preempt,heldEvent){window.STATUS_QUEUE.add({id:'announce',className:'show'+(/you/i.test(txt)?' bad':''),text:txt,priority:priority==null?(/\byou\b/i.test(txt)?100:50):priority,hold:hold||undefined,preempt:!!preempt,heldEvent:!!heldEvent});}
let lookoutKey='',lookoutUntil=0,lineGen=0;
function releaseHeldLine(){
 lineGen++;
 if(window.STATUS_QUEUE&&STATUS_QUEUE.drop)STATUS_QUEUE.drop(item=>item.heldEvent);
}
function speak(S,prev,txt,priority,preempt){
 const pol=window.SURPRISE&&SURPRISE.policy&&S&&prev?SURPRISE.policy(S,prev):null;
 const ended=S&&S.phase==='over';
 const held=!!(pol&&pol.affected&&!ended);
 const hold=held?pol.lineHold:(window.SURPRISE?SURPRISE.holdFor(txt):undefined);
 if(pol&&pol.lookout&&pol.ev){
  const k=pol.ev.event+':'+pol.ev.seq,gen=lineGen;
  // The beat owns the status line. Drop a near warning that is waiting, and
  // refuse a new one until the beat (and the line that follows it) is up.
  lookoutUntil=Date.now()+SURPRISE.LOOKOUT_MS+400;
  if(window.STATUS_QUEUE.drop)STATUS_QUEUE.drop(isNearLine);
  document.querySelectorAll('#msgslot .h3pop.near').forEach(el=>el.remove());
  if(lookoutKey!==k){lookoutKey=k;announce(SURPRISE.LOOKOUT_LINE,120,SURPRISE.LOOKOUT_MS,true);}
  setTimeout(()=>{if(gen!==lineGen)return;if(window.STATUS_QUEUE.drop)STATUS_QUEUE.drop(isNearLine);announce(txt,priority,hold,true,held);},SURPRISE.LOOKOUT_MS);return;
 }
 announce(txt,priority,hold,preempt,held);
}
if(window.CUTAWAYS)CUTAWAYS.onDone=releaseHeldLine;
const evSeen={kick:0,pop:0,rival:0,stone:0,dug:0,burst:0};
function events(S,prev,board){
 if(!S)return;if(!S.three)rulesMode('2');
 const h=S.h3||{};
 for(const e of window.CatchText.newEvents(evSeen,S,prev)){const big=e.kind==='kick'||e.kind==='burst'||e.kind==='rival'||e.kind==='smash'||(e.kind==='stone'&&S.stoneNote&&(S.stoneNote.targets||[]).length);speak(S,prev,window.CatchText.viewerEvent(e,S),null,big);
  // the square highlight: the hyena's landing square for the meeting; the badger's own square for a pop-out, only if this phone can see the badger
  const sq=e.kind==='rival'||e.kind==='kick'||e.kind==='burst'?e.square:e.kind==='dug'?null:e.seen?(h.hunters?(h.hunters.find(x=>x.kind==='badger')||{}).p:h.hunter):null,c=cellAt(board,S,sq);c&&c.classList.add('h3kb');}}
// One plain line at the start of every game: who hunts what, naming only the animals in the game (roles.js).
let startDone=false;
function eggLineShowing(){const h=document.getElementById('hint');return !!(h&&h.textContent.indexOf("You're on the egg!")===0);}
function preferEggLine(){
 if(!eggLineShowing()||!window.STATUS_QUEUE||!STATUS_QUEUE.drop)return;
 STATUS_QUEUE.drop(item=>/hunts eggs/.test(item.text||''));
}
function startLine(S,prev,mode){
 if(!S||S.phase!=='play'){startDone=false;return;}
 const h=S.h3;if(h&&(h.ready===false||h.needKind||(h.team&&h.teamSetup&&h.teamSetup!=='done')))return;
 // Standing on a found egg with a stone: that line is the top line. The
 // opening "who hunts what" sentence waits until this turn is over.
 if(eggLineShowing()){if(window.STATUS_QUEUE&&STATUS_QUEUE.drop)STATUS_QUEUE.drop(item=>/hunts eggs/.test(item.text||''));return;}
 if(startDone)return;
 startDone=true;if(!prev&&S.round>1)return;
 announce(window.Roles.huntLine(mode,S.role==='hunter'?(S.kind||(h&&h.kind)):(h&&h.kind)),20);}
function after(S,prev,board){
 // A hit's Look out! owns the status line from the start of this paint, before
 // a "near" warning can be queued on top of it.
 if(prev&&window.SURPRISE&&SURPRISE.policy){const pol=SURPRISE.policy(S,prev);if(pol&&pol.lookout)lookoutUntil=Date.now()+SURPRISE.LOOKOUT_MS+400;}
 badgerLines(S,prev);chips(S);clock(S);kindPick(S);if(S.h3.team)tPieces(S,board);if(S.h3.hunt)hPieces(S,board,prev);
 rulesMode(S.h3.hunt?'4h':S.h3.team?String(S.h3.n):'3');
 const h=S.h3,k=h.kind||'hyena',me=S.role;
 // hunter piece: the hunter always sees itself; a bird only sees it within 2 squares (never a burrowed badger)
 const hp=h.hunter,hc=cellAt(board,S,hp);
 // a mound where the badger dug in, only for a bird that saw it dig and only while it stays buried (the server sends h.mound to nobody else)
 if(h.mound){const mc=cellAt(board,S,h.mound);if(mc&&!mc.querySelector('.cmark.cm-badger')){mark(mc,'badger','is');mc.dataset.tip=(mc.dataset.tip?mc.dataset.tip+' · ':'')+'The badger dug in here';mc.setAttribute('aria-label',(mc.getAttribute('aria-label')?mc.getAttribute('aria-label')+'. ':'')+'Badger dug in here');}}
 if(hc){const bur=me==='hunter'&&S.burrowed;const pc=document.createElement('div');pc.className='pc ph h'+k+(bur?' bur':'')+(me==='hunter'?' mine':'');pc.innerHTML=bur?MOUND:KIND[k].art;hc.appendChild(pc);hc.classList.add('hcell');if(me==='hunter'){const old=document.getElementById('current');if(old&&old!==hc)old.removeAttribute('id');hc.id='current';}
  hc.dataset.tip=(hc.dataset.tip?hc.dataset.tip+' · ':'')+(me==='hunter'?(bur?'You, hidden.':'You.'):KIND[k].n+'. Don\'t let it land on you.');
}
 // ambush sight: a burrowed badger sees the exact square of any bird next to it (S.seenBirds comes from the rules only while burrowed)
 if(me==='hunter'&&S.phase==='play'&&S.burrowed&&S.seenBirds)for(const q of S.seenBirds){const c=cellAt(board,S,q.p);if(!c||c.querySelector('.pc.po,.pc.pv'))continue;
  const d=document.createElement('div');d.className='pc '+(q.type==='o'?'po':'pv')+' ambushsee';d.innerHTML=q.type==='o'?OSTI:VULI;c.appendChild(d);
  const rg=document.createElement('i');rg.className='kring cue';c.appendChild(rg); // the act-on ring: a bird you can catch
  c.dataset.tip=(c.dataset.tip?c.dataset.tip+' · ':'')+'Bird next to you.';c.setAttribute('aria-label',(c.getAttribute('aria-label')?c.getAttribute('aria-label')+'. ':'')+'Bird next to you');}
 // sense: hunter only. The shaded box is yes or no. It does not name a direction or draw a compass.
 if(me==='hunter'&&S.phase==='play'&&S.sense!=null&&S.myTurn){
  const hx=S.hunter[0],hy=S.hunter[1],range=h.senseRange,area=!!(window.NextStep&&NextStep.compute(S).kind==='area');
  if(S.sense){for(let y=0;y<S.cfg.rows;y++)for(let x=0;x<S.cfg.cols;x++){const dx=x-hx,dy=y-hy;if(!dx&&!dy)continue;if(Math.max(Math.abs(dx),Math.abs(dy))>range)continue;
   const c=board.children[y*S.cfg.cols+x];if(!c||!c.classList||!c.classList.contains('cell'))continue;if(c.querySelector('.pc.po,.pc.pv'))continue;
   const both=S.pounce&&S.firstAt&&Math.max(Math.abs(x-S.firstAt[0]),Math.abs(y-S.firstAt[1]))<=range;if(S.pounce&&!both)continue; // the Pounce marks only the squares inside both readings
   c.classList.add('maybird');mark(c,'bird',area?'cue':'');const had=c.getAttribute('aria-label')||'';if(!/Bird may be here/.test(had))c.setAttribute('aria-label',had?had+'. Bird may be here':'Bird may be here');}}
  const sk=S.round+':'+S.senseSeq;if(sk!==lastSense){lastSense=sk;UI.pause(1100);
   pop(board,S.sense?(S.pounce?'Still near.':'Bird near.'):'Nothing near.',S.sense?'yes':'no');
   window.SFX&&SFX.play(S.sense?'sniffYes':'sniffNo');}
  if(S.pounce)noteBanner('pounce','Pounce!',true);}
 if(false&&S.pounce&&S.myTurn&&me==='hunter'){const mine=board.querySelector('.pc.ph.mine');const cell=hc||(mine&&mine.closest('.cell'));
  if(cell&&!cell.querySelector('.pouncetag')){const t=document.createElement('span');t.className='pouncetag';t.textContent='';cell.appendChild(t);}}
 // catch + knockback feedback
 if(S.phase&&S.phase.startsWith('setup'))lastCatch=0;
 const lc=h.lastCatch;if(lc&&lc.seq!==lastCatch){const fresh=lastCatch!==0||(prev&&prev.h3);lastCatch=lc.seq;
  if(fresh){const ac=cellAt(board,S,lc.at),tc=cellAt(board,S,lc.to);
   const word=lc.bird==='red'||lc.bird==='v1'||lc.bird==='v2'?'vulture':'ostrich';
   if(ac&&me==='hunter'&&!ac.querySelector('.pc.po,.pc.pv')){const disc=document.createElement('div');disc.className='pc '+(word==='ostrich'?'po':'pv')+' foundnow';disc.innerHTML=word==='ostrich'?OSTI:VULI;ac.appendChild(disc);}
   if(tc)tc.classList.add('h3kb');
   // what the catch means, in words: hurt or out, and who did it (catchtext.js)
   const CT=window.CatchText,seat=h.mySeat||me,by=lc.by||k;
   speak(S,prev,CT.catchLine(lc,seat,by,CT.catchesLeft(h,lc)),seat===lc.bird?100:50,true);
   const ch=document.querySelector('#h3bar .bchip.'+lc.bird);ch&&ch.classList.add('hitnow');window.SFX&&SFX.play(me==='hunter'?'win':'warn');}}
 outBanner(S,prev);
 warnNear(S,board,prev);
 // waiting panel text: which seats are still open
 if(!S.joined){const w=$('wait');const open=Object.entries(h.seats).filter(([,v])=>v==='open').map(([r])=>SN[r]);if(w)w.firstElementChild.nextElementSibling.textContent=`Waiting for: ${open.join(', ')}. Send them this link:`;}}
function kindPick(S){let k=$('kindPick');if(!S.h3.needKind){k&&k.classList.add('hidden');return;}
 if(!k){k=document.createElement('div');k.id='kindPick';document.body.appendChild(k);}
 k.className='';k.innerHTML=`<div class="hbox"><h1>You're the hunter</h1><p>Pick your animal</p><div class="kindrow">${['hyena','badger'].map(x=>`<button class="kindbtn" id="pick-${x}" onclick="UI.send({t:'act',a:'kind',kind:'${x}'})"><span class="ka">${KIND[x].art}</span><b>${KIND[x].n}</b><small>${kindLine(x)}</small></button>`).join('')}</div></div>`;}
function over(S){if(S.h3.hunt)return hOver(S);if(S.h3.team)return tOver(S);const h=S.h3,w=S.winner,me=S.role,C=S.cfg;
 const art=w==='hunter'?KIND[h.kind||'hyena'].art:w==='blue'?OSTI:w==='red'?VULI:'';
 const title=w===me?'You win!':`${tname(S,w)} wins!`;
 const why=w==='hunter'?`The ${hName(S)} knocked out both birds in round ${S.round}.`:w==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`
  :w==='red'?(S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:S.winBy==='starved'?'The ostrich was out and no eggs were left.':`The vulture smashed every egg by round ${S.round}.`)
  :S.winBy==='time'?'Time ran out: the ostrich was out and the vulture never got every egg.':'The eggs were lost, but the vulture was already out.';
 return endBox(S,endArt(S,art),endTitle(S,title),endWhyText(S,why));}
window.T3UI={mark,markHTML,marksAround,after,events,startLine,preferEggLine,announce,hint,tag,waitMsg,nopeMsg,over,endBits,KIND,clock};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',lobby):lobby();
})();
