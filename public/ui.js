(function(){
const $=id=>document.getElementById(id);
const OST='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#38d6f0" stroke-width="2" stroke-linecap="round"/><path d="M14 32 L12 38 M20 32 L22 38" stroke="#000" stroke-width="2.5"/></svg>';
const VUL='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/><path d="M23 11 L28 13 L23 14Z" fill="#ffb347" stroke="#000" stroke-width="1.5"/></svg>';
$('lobbyArt').innerHTML=OST;$('artBlue').innerHTML=OST;$('artRed').innerHTML=VUL;
let ws,S=null,mode=null,me=JSON.parse(localStorage.getItem('bo_me')||'{}');
const key=p=>p[0]+','+p[1];
const FLAT='<svg viewBox="0 0 20 20" width="1em" height="1em" aria-hidden="true"><path d="M3 10H17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 4.5"/></svg>';
const SCENT='<svg viewBox="0 0 20 20" width="1em" height="1em" aria-hidden="true"><path d="M5 17c-3-4 3-6 0-10s1-5 1-5M10 17c-3-4 3-6 0-10s1-5 1-5M15 17c-3-4 3-6 0-10s1-5 1-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const FOOT='<svg viewBox="0 0 20 20" width="1em" height="1em" aria-hidden="true" class="fsv"><ellipse cx="7" cy="12" rx="2.6" ry="4" fill="currentColor"/><ellipse cx="13" cy="7" rx="2.6" ry="4" fill="currentColor"/><path d="M10 1l3 3h-6z" fill="currentColor"/></svg>';
const VOCAB={legal:['✦','Glowing square = you can tap it now'],foot:[FOOT,'Older footprints (last 3 rounds, faded = older; they vanish after 3 rounds, not out of range)'],footnew:[FOOT,'Last seen: the ostrich\'s newest track (stays bold until it leaves a newer one)'],zone:['','Green tint = an egg could be here (inside a recent “egg nearby” scent, last 3 landings)'],cleared:['','Hatched = cleared: a recent landing smelled no egg within 2'],sniffy:[SCENT,'Wavy scent (latest landing): an egg IS within '+window.BO.CONFIG.smellRange+' squares of here'],oldy:[SCENT,'Small faded waves = older scent (more faded = older): an egg was within '+window.BO.CONFIG.smellRange+' then'],oldn:[FLAT,'Faint flat mark = older no-scent (more faded = older): no egg within '+window.BO.CONFIG.smellRange+' then'],_s1:[SCENT,'Scent: an egg is within '+window.BO.CONFIG.smellRange+' squares of here'],
 sniffn:[FLAT,'Flat dotted line (latest landing): NO egg within '+window.BO.CONFIG.smellRange+' squares of here'],spot:['👁','Spotted egg: the vulture saw an egg here'],hit:['💥','Smashed egg'],miss:['✕','Stone missed: nothing here'],
 guard:['🛡','Guarded: the ostrich stood on an egg, the stone bounced'],land:['🦅','The vulture landed here'],myegg:['🥚','Your egg (🔥 = rounds until cold)'],me:['★','This is you'],vul:['🦅','The vulture']};
const mk=(t,n)=>`<span class="mk mk-${t}" data-t="${t}">${VOCAB[t][0]}${n?'<b>'+n+'</b>':''}</span>`;
const C0=window.BO.CONFIG;
['eggs','warm','sit','fly','rounds','smell'].forEach(k=>document.querySelectorAll('.c-'+k).forEach(e=>e.textContent={eggs:C0.eggs,warm:C0.warmth,sit:C0.maxSit,fly:C0.vultureFly,rounds:C0.rounds,smell:C0.smellRange}[k]));
// --- robust connection layer ---
let pending=null,pendTimer=null,connTimer=null,attempts=0,hb=null,lastPong=0;
function status(msg,err){const e=$('lobbyErr');if(e){e.textContent=msg||'';e.style.color=err?'#ffb3a8':'#fff';}
 document.querySelectorAll('#roleBlue,#roleRed,#joinBtn').forEach(b=>b.disabled=!!msg&&!err);
 if(S&&msg)$('log').textContent=msg;}
function connect(){
 clearTimeout(connTimer);try{ws&&ws.close();}catch(e){}
 attempts++;status(S?`Reconnecting… (try ${attempts})`:attempts>1?`Connecting… (try ${attempts}, the server may be waking up)`:'Connecting…');
 const sock=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');ws=sock;
 connTimer=setTimeout(()=>{if(sock.readyState!==1)retry();},6000);
 sock.onopen=()=>{clearTimeout(connTimer);lastPong=Date.now();startHB();
  if(pending)sendPending();else if(S&&me.code)sock.send(JSON.stringify({t:'join',code:me.code,token:me.token}));};
 sock.onerror=()=>{};
 sock.onclose=()=>{if(sock!==ws)return;stopHB();if(pending||S)retry();};
 sock.onmessage=ev=>{const m=JSON.parse(ev.data);lastPong=Date.now();
  if(m.t==='pong')return;
  if(m.t==='joined'){pending=null;clearTimeout(pendTimer);attempts=0;status('');me={code:m.code,token:m.token,role:m.role};localStorage.setItem('bo_me',JSON.stringify(me));history.replaceState(null,'','/?room='+m.code);}
  if(m.t==='state'&&m.pass)return passState(m);
  if(m.t==='state'){const prev=S;S=m.state;if(!prev||prev.turn!==S.turn||prev.phase!==S.phase)mode=null;render(prev);sounds(prev);if(!prev)maybeWalk(S.role);}
  if(m.t==='error'){if(!S){pending=null;clearTimeout(pendTimer);attempts=0;status(m.msg,true);}else $('log').textContent=m.msg;}};
}
function retry(){
 if(attempts>=6&&!S){pending=null;clearTimeout(pendTimer);attempts=0;status('Could not reach the game server. Check your connection and tap again.',true);return;}
 setTimeout(connect,Math.min(800*attempts,4000));
}
function sendPending(){ws.send(JSON.stringify(pending));clearTimeout(pendTimer);
 pendTimer=setTimeout(()=>{if(pending){status('Still waiting for the server… retrying');connect();}},5000);}
function startHB(){stopHB();hb=setInterval(()=>{if(ws.readyState===1){ws.send('{"t":"ping"}');if(Date.now()-lastPong>45000){ws.close();}}},20000);}
function stopHB(){clearInterval(hb);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S&&(!ws||ws.readyState>1)){attempts=0;connect();}});
const send=o=>{try{tipBar(null)}catch(e){}return ws&&ws.readyState===1&&ws.send(JSON.stringify(o));};
function open(msg){pending=msg;attempts=0;if(ws&&ws.readyState===1)sendPending();else connect();}
function tapper(el,fn){let t=0;el.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();fn();},{passive:false});el.addEventListener('click',()=>{if(Date.now()-t>600)fn();});}
let pickAI=false;
let aiLvl=localStorage.getItem('bo_ailvl')||'normal';const lvlUI=()=>{$('lvlEasy').classList.toggle('on',aiLvl==='easy');$('lvlNormal').classList.toggle('on',aiLvl!=='easy');};lvlUI();
function step(role,ai){pickAI=ai;$('friendStep').classList.toggle('hidden',role!=='f');$('homeStep').classList.toggle('hidden',!!role);if(role==='f')role=0;$('roleStep').classList.toggle('hidden',!role||role==='f');$('lvlRow').classList.toggle('hidden',!ai);status('');}
tapper($('playFriend'),()=>step('f',false));tapper($('twoPhones'),()=>step(1,false));tapper($('friendBack'),()=>step(0,false));tapper($('playAI'),()=>step(1,true));tapper($('roleBack'),()=>step(pickAI?0:'f',false));
tapper($('haveCode'),()=>{const h=$('joinRow').classList.toggle('hidden');$('haveCode').setAttribute('aria-expanded',!h);if(!h)$('codeIn').focus();});
tapper($('lvlEasy'),()=>{aiLvl='easy';localStorage.setItem('bo_ailvl',aiLvl);lvlUI();});tapper($('lvlNormal'),()=>{aiLvl='normal';localStorage.setItem('bo_ailvl',aiLvl);lvlUI();});
tapper($('playPass'),()=>open({t:'create',pass:true}));
// --- pass & play: one phone, both sides. Only the side holding the phone is ever rendered; an opaque cover sits between turns ---
const NAME={blue:'Ostrich',red:'Vulture'};let PV=null,holder=null,lastBy={},locked=false,hT=null;
function showCover(r,first){const h=$('handoff');h.className=r;$('hArt').innerHTML=r==='blue'?OST:VUL;
 $('hTitle').textContent=`Pass to the ${NAME[r]}${r==='red'?' 🦅':' 🐦'}`;
 $('hSub').textContent=first?`The ${NAME[r]} goes first and hides the eggs. ${NAME[r==='blue'?'red':'blue']}, look away!`:`${NAME[r==='blue'?'red':'blue']}, hand over the phone. No peeking!`;
 $('hGo').textContent=`I'm the ${NAME[r]} — tap to start`;
 $('board').innerHTML='';$('actions').innerHTML='';$('hint').textContent='';}
function showView(r,v){holder=r;const prev=lastBy[r]||null;const pr=S;S=v;mode=null;if(!pr)$('lobby').classList.add('hidden');render(prev);sounds(prev);if(!lastBy[r])maybeWalk(r);lastBy[r]=v;}
function passState(m){clearTimeout(hT);PV=m;const next=m.active,over=m.views.blue.phase==='over';
 if(over||holder===next||(holder&&locked)){if(over){$('handoff').className='hidden';locked=false;}if(!locked||over)return showView(over?'blue':next,m.views[over?'blue':next]);return;}
 if(!holder){locked=true;showCover(next,m.views.blue.phase==='setupEggs');$('lobby').classList.add('hidden');return;}
 // let the player who just moved see their own result (fly / throw / smash), then cover
 showView(holder,m.views[holder]);locked=true;hT=setTimeout(()=>showCover(next),1400);}
tapper($('hGo'),()=>{if(!PV)return;$('handoff').className='hidden';locked=false;const r=PV.active;showView(r,PV.views[r]);});
tapper($('roleBlue'),()=>open(pickAI?{t:'create',role:'blue',ai:aiLvl}:{t:'create',role:'blue'}));tapper($('roleRed'),()=>open(pickAI?{t:'create',role:'red',ai:aiLvl}:{t:'create',role:'red'}));
tapper($('joinBtn'),()=>open({t:'join',code:$('codeIn').value.trim(),token:me.code===$('codeIn').value.trim().toUpperCase()?me.token:undefined}));
tapper($('inviteBtn'),()=>{sheetOpen=!sheetOpen;render();});tapper($('waitClose'),()=>{sheetOpen=false;render();});
// invite popover closes on any tap outside it (or its chip)
const outside=e=>{if(sheetOpen&&!e.target.closest('#wait,#inviteBtn')){sheetOpen=false;render();}};
document.addEventListener('touchstart',outside,{passive:true,capture:true});document.addEventListener('mousedown',outside,true);tapper($('howBtn'),()=>UI.rules());tapper($('helpBtn'),()=>UI.rules());
function muteLabel(){$('muteBtn').textContent=SFX.muted?'🔇':'🔊';$('muteBtn2').textContent=SFX.muted?'🔇':'🔊';}
muteLabel();tapper($('muteBtn'),()=>{SFX.toggle();muteLabel();});tapper($('muteBtn2'),()=>{SFX.toggle();muteLabel();});
function sounds(prev){if(!prev)return;const blue=S.role==='blue';
 if(S.phase==='over'&&prev.phase!=='over')return SFX.play(S.winner===S.role?'win':'lose');
 if(prev.phase.startsWith('setup')&&S.phase===prev.phase&&blue)SFX.play('place');
 const la=S.lastAction;
 if(prev.turn==='red'&&S.turn==='blue'&&la&&prev.phase==='play'&&la.type==='fly')SFX.play(la.spotted?'warn':'fly'); // throw sounds play on impact (smash.js)
 if(prev.turn==='blue'&&S.turn==='red'&&prev.phase==='play')setTimeout(()=>SFX.play('step'),blue?0:0);
 if(S.lastCold&&prev.round!==S.round)setTimeout(()=>SFX.play('cold'),400);
 else if(blue&&S.myTurn&&S.eggs&&S.eggs.some(e=>e.alive&&e.coldIn<=1))setTimeout(()=>SFX.play('warn'),700);
 if(S.myTurn&&!prev.myTurn&&S.phase==='play')setTimeout(()=>SFX.play('turn'),450);
 if(!blue&&la&&la.type==='fly'&&prev.turn==='red'&&S.turn==='blue')setTimeout(()=>SFX.play(la.smell?'sniffYes':'sniffNo'),350);}
const roomQ=new URLSearchParams(location.search).get('room');
if(!roomQ)TUT.firstVisit();
if(roomQ){$('codeIn').value=roomQ;$('joinRow').classList.remove('hidden');open({t:'join',code:roomQ,token:me.code===roomQ.toUpperCase()?me.token:undefined});}
$('shareBtn').onclick=()=>{const u=$('shareLink').value;if(navigator.share)navigator.share({title:'Battle Ostriches',text:'Play Battle Ostriches with me! Code '+S.code,url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u);$('shareBtn').textContent='Copied!';}};
// --- map key + walkthrough (same chips as the board) ---
const KEYS={blue:['legal','me','myegg','land','hit','miss','guard','vul'],red:['legal','me','zone','cleared','footnew','foot','spot','hit','miss','guard']};
function chip(t){return t==='zone'?'<span class="lg-zone"></span>':t==='cleared'?'<span class="lg-cleared"></span>':t==='legal'?'<span class="lg-legal"></span>':t==='me'?`<span style="width:24px;height:24px;flex:none">${S&&S.role==='red'?VUL:OST}</span>`:t==='vul'?`<span style="width:24px;height:24px;flex:none">${VUL}</span>`:t==='myegg'?'<span class="mk" style="background:#fff;color:#000">🥚</span>':mk(t);}
function legend(){const r=S?S.role:'blue',L=$('legend');L.innerHTML=`<h3>Map key (${r==='blue'?'Ostrich':'Vulture'})</h3><ul>${KEYS[r].map(t=>`<li>${chip(t)}<span>${VOCAB[t][1]}</span></li>`).join('')}</ul><p style="font-size:.85rem;margin:6px 0 0">Tip: tap any mark on the board to see what it is.</p><button id="legendClose">Got it</button>`;
 L.classList.remove('hidden');tapper($('legendClose'),()=>L.classList.add('hidden'));}
tapper($('keyBtn'),legend);
const WALK={blue:[['🥚','Your goal','Hide '+C0.eggs+' eggs. Keep at least one alive for '+C0.rounds+' rounds.'],
  ['👆','Your turn','Tap a glowing square to step 1 square. On an egg you can Sit (warms + shields it) or Carry it 1 square. 🔥 = rounds before an egg goes cold.'],
  ['🏆','How to win','Survive '+C0.rounds+' rounds with an egg left. The vulture sees your footprints, so leave false trails. Tap 🔑 Map key any time.']],
 red:[['💥','Your goal','Smash all '+C0.eggs+' hidden ostrich eggs.'],
  ['👆','Your turn','Fly up to '+C0.vultureFly+' squares, or Throw a stone at your square or one next to it. Tap a glowing square.'],
  ['🏆','How to win','Follow the bold last-seen track (older prints fade after 3 rounds) and the green "egg could be here" area, then throw. Smash every egg before round '+C0.rounds+'. Tap 🔑 Map key any time.']]};
let wi=0,wr='blue',wDone=null;
function maybeWalk(r){if(!localStorage.getItem('bo_walk_'+r))walk(r);}
function walk(role,done){wr=role||(S?S.role:'blue');wi=0;wDone=done||null;drawWalk();$('walk').classList.remove('hidden');}
function closeWalk(){$('walk').classList.add('hidden');localStorage.setItem('bo_walk_'+wr,'1');const d=wDone;wDone=null;d&&d();}
function drawWalk(){const st=WALK[wr],cur=st[wi],W=$('walk');
 W.innerHTML=`<div class="wcard"><div class="wart"><span style="width:56px;height:56px;display:inline-block">${wr==='red'?VUL:OST}</span><span style="font-size:44px">${cur[0]}</span></div><h2>${cur[1]}</h2><p id="wText">${cur[2]}</p><div class="wdots">${st.map((_,k)=>`<span class="${k===wi?'on':''}"></span>`).join('')}</div><div class="wnav"><button id="wSkip">Skip</button><button id="wNext">${wi===st.length-1?"Let's play":'Next'}</button></div></div>`;
 tapper($('wSkip'),closeWalk);tapper($('wNext'),()=>{if(wi<st.length-1){wi++;drawWalk();}else closeWalk();});}
window.UI={walk(){walk();},rules(){$('rules').classList.remove('hidden')},closeRules(){$('rules').classList.add('hidden')},
 setMode(m){if(locked||!S||!S.myTurn)return;mode=m;if(m==='throw')coachDid('throw');render();},act(a){if(locked||!S||!S.myTurn)return;if(a==='sit'&&!(S.can&&S.can.sit))return nope(S.mustLeave?`You sat ${S.cfg.maxSit} turns in a row. Step off this turn.`:'Sit only works while you stand on an egg.');coachDid(a);send({t:'act',a})},replayCoach(){['blue','red'].forEach(r=>localStorage.removeItem('bo_cs_'+r));localStorage.removeItem('bo_tips_off');Object.keys(localStorage).filter(k=>k.startsWith('bo_tip_')).forEach(k=>localStorage.removeItem(k));if(S)render();},rematch(){holder=null;lastBy={};send({t:'act',a:'rematch'})},
 _rr(){if(S)render();},_tip:t=>tipBar(t),_S:()=>S,_legal:()=>legalNow(),_locked:()=>locked,menu(){S=null;localStorage.removeItem('bo_me');location.href='/';}};
// --- learn-by-playing coach marks: one hint, anchored, everything else dimmed; advances when the player does it ---
const COACH={blue:[
  {when:S=>S.myTurn&&S.moves.length,txt:'Tap a glowing square to step',at:'board',done:'step'},
  {when:S=>S.myTurn&&S.can.sit,txt:'Sit to warm this egg and shield it (🔥 = rounds until cold)',at:'sit',done:'sit'}],
 red:[{when:S=>S.myTurn,txt:'Tap a glowing square to fly toward the footprints 👣',at:'board',done:'fly'},
  {when:S=>S.myTurn&&S.throw&&S.throw.length,txt:'Tip: tap Throw stone to switch from flying to throwing',at:'throw',done:'throw'}]};
const cIdx=r=>+(localStorage.getItem('bo_cs_'+r)||0);
function coachNow(){return null;if(!S||S.phase!=='play')return null;const st=COACH[S.role][cIdx(S.role)];return st&&st.when(S)?st:null;}
function coachDid(a){if(!S)return;const st=COACH[S.role][cIdx(S.role)];if(st&&st.done===a&&st.when(S))localStorage.setItem('bo_cs_'+S.role,cIdx(S.role)+1);}
let sheetOpen=false;
// taps on a square only go to the server when that square is glowing; otherwise explain right here
function tipBar(t){const b=$('tipbar');if(!t){b.classList.add('hidden');return;}b.innerHTML=`<span>💡 ${t}</span> <button class="tipoff" id="tipOff">Turn off tips</button>`;b.classList.remove('hidden');tapper($('tipOff'),()=>{localStorage.setItem('bo_tips_off','1');tipBar(null);});}
function nope(msg){const h=$('hint');h.textContent=msg;h.classList.remove('empty');h.classList.remove('nudge');void h.offsetWidth;h.classList.add('nudge');}
function legalNow(){if(!S)return[];const blue=S.role==='blue',M=curMode();
 if(blue&&S.phase==='setupEggs'){const eg=new Set((S.eggs||[]).map(e=>key(e.pos)));const r=[];for(let y=0;y<S.cfg.rows;y++)for(let x=0;x<S.cfg.cols;x++){const k=x+','+y;if(!eg.has(k)&&k!==key(S.vulture))r.push([x,y]);}return r;}
 if(blue&&S.phase==='setupOstrich'){const r=[];for(let y=0;y<S.cfg.rows;y++)for(let x=0;x<S.cfg.cols;x++)r.push([x,y]);return r;}
 if(!S.myTurn)return[];return blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly);}
function tap(x,y){if(!S||locked)return;const p=[x,y],ok=legalNow().some(q=>q[0]===x&&q[1]===y);
 if(!ok){const c=$('board').children[y*S.cfg.cols+x],tg=c&&c.dataset.tags?c.dataset.tags.split(' ').filter(Boolean):[];if(tg.length)return nope(tg.map(t=>VOCAB[t][1]).join(' · '));}
 if(S.role==='blue'&&(S.phase==='setupEggs'||S.phase==='setupOstrich'))return ok?send({t:'act',a:'place',p}):nope('Tap an empty glowing square.');
 if(S.phase!=='play')return;if(!S.myTurn)return nope(S.role==='blue'?'Wait — it\'s the Vulture\'s turn.':'Wait — it\'s the Ostrich\'s turn.');
 const m=curMode();if(!m)return;
 if(!ok)return nope(m==='throw'?'Stones only reach the glowing squares: your square or one next to you.':m==='fly'?`Too far. Fly up to ${S.cfg.vultureFly} squares: tap a glowing square.`:m==='carry'?'Carry 1 square: tap a glowing square (not onto another egg).':'Step 1 square: tap a glowing square next to you.');
 coachDid(m==='carry'?'step':m);send({t:'act',a:m,p});}
function curMode(){if(!S.myTurn)return null;if(S.role==='red')return mode||'fly';
 if(mode==='carry'&&S.can&&S.can.carry)return'carry';return S.moves.length?'step':null;}
function render(prev){
 $('lobby').classList.add('hidden');const C=S.cfg,blue=S.role==='blue',body=document.body;body.className=blue?'blue':'red';
 $('turnTag').innerHTML=`<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${blue?OST:VUL}</span> ${blue?'OSTRICH':'VULTURE'}`;
 $('roundsLeft').textContent=C.rounds-S.round+1;$('eggsLeft').textContent=S.eggsLeft
 // waiting for opponent
 const link=location.origin+'/?room='+S.code,slot=$('wait-slot');
 $('shareCode').textContent=S.code;$('shareLink').value=link;const w=$('wait');
 // Big panel ONLY while the other seat has never been claimed. It used to key off S.opponent (= opponent's socket is
 // live right now), so whenever the opponent's phone slept/backgrounded/reconnected mid-game the full panel came back.
 const waiting=!S.joined&&!S.ai&&S.phase!=='over';
 if(waiting){w.classList.remove('hidden','sheet');slot.appendChild(w);sheetOpen=false;}
 else if(sheetOpen&&!S.ai){w.classList.remove('hidden');w.classList.add('sheet');document.body.appendChild(w);} else{w.classList.add('hidden');w.classList.remove('sheet');sheetOpen=false;}
 w.firstElementChild.nextElementSibling.textContent=waiting?'Waiting for your opponent. Send them this link:':'Room code';
 $('inviteCode').textContent=S.code;$('inviteBtn').classList.toggle('hidden',waiting||!!S.ai||S.phase==='over');$('inviteBtn').setAttribute('aria-expanded',sheetOpen);
 const M=curMode(),L=S.myTurn?(blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly)):[];
 const lk=new Set(L.map(key)),setup=blue&&(S.phase==='setupEggs'||S.phase==='setupOstrich');
 const smells=S.smells||{},PT=S.printT||{},lastSeen=Object.keys(PT).sort((a,b)=>PT[b]-PT[a])[0]||null;
 // smell -> 'possible egg area': union of recent yes-zones minus recent no-zones (server keeps only the last 3 landings)
 const SM=Object.entries(smells).map(([q,y])=>[q.split(',').map(Number),y]),R=C.smellRange,D=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
 const zoneOf=k=>{const p=k.split(',').map(Number);if(SM.some(([q,y])=>!y&&D(q,p)<=R))return'no';return SM.some(([q,y])=>y&&D(q,p)<=R)?'yes':null;};
 const waveAt=prev&&S.lastAction&&S.lastAction.type==='fly'&&prev.turn!==S.turn&&!blue?key(S.vulture):null;
 const prints=S.prints||{},maxP=Math.max(1,...Object.values(prints));
 const board=$('board');board.style.gridTemplateColumns=`repeat(${C.cols},1fr)`;board.innerHTML='';
 const eggAt={};(S.eggs||[]).forEach((e,i)=>{if(e.alive&&e.pos)eggAt[key(e.pos)]=e;});
 for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y,d=document.createElement('div');d.className='cell';
  let m=S.marks[k];if(m)d.classList.add(m);const tags=[];
  if(lk.has(k)||(setup&&(S.phase==='setupOstrich'||(!eggAt[k]&&k!==key(S.vulture)))))d.classList.add('legal');
  // fixed visual vocabulary (same icon/shape/colour in every theme): see VOCAB + vocab.css
  // layering: ONE primary mark centred (stone result > latest smell > footprints), the rest become small corner badges
  const L=[];
  if(m==='hit')L.push(['hit']);else if(m==='miss')L.push(['miss']);else if(m==='feather')L.push(['guard']);
  if(!blue&&S.phase==='play'){const z=zoneOf(k);if(z==='yes'){d.classList.add('zone');tags.push('zone');}else if(z==='no'){d.classList.add('cleared');tags.push('cleared');}}
  if(!blue&&waveAt===k)d.innerHTML+='<span class="wave" aria-hidden="true"></span>';
  const n=prints[k];if(!blue&&n&&m!=='hit'){const age=S.round-((S.printT||{})[k]||0),dir=(S.printDir||{})[k],last=k===lastSeen;
   L.push([last?'footnew':'foot',n>1?n:'',last?1:Math.max(.35,1-age*.25),dir]);}
  if(!blue&&m==='spotted'){d.innerHTML+='<div class="egg seen"></div>';L.push(['spot']);}
  if(blue&&S.vtracks&&S.vtracks[k]&&!(S.ostrich&&k===key(S.ostrich)))L.push(['land']);
  const occupied=!!(eggAt[k]||k===key(S.vulture)||(S.ostrich&&k===key(S.ostrich)));
  const pri=['hit','miss','guard','sniffy','sniffn','footnew','foot','oldy','oldn'];const rk=x=>{const i=pri.indexOf(x[0]);return i<0?50:i;};L.sort((p,q)=>rk(p)-rk(q));
  const corners=['c-tl','c-tr','c-bl','c-br'];let ci=0;
  L.forEach((x,i)=>{const isPri=i===0&&!occupied&&pri.includes(x[0]);const pos=isPri?'pri':(corners[ci++]||'c-br');
   let h=mk(x[0],x[1]).replace('class="mk','class="mk '+pos+' ');
   const st=[];if(x[2]!==undefined&&x[2]<1)st.push('opacity:'+x[2].toFixed(2));
   if(x[3]&&(x[0]==='foot'||x[0]==='footnew'))st.push('--rot:'+Math.round(Math.atan2(x[3][0],-x[3][1])*180/Math.PI)+'deg');
   if(st.length)h=h.replace('<span ','<span style="'+st.join(';')+'" ');
   d.innerHTML+=h;tags.push(x[0]==='footnew'?'foot':x[0]);});
  const e=eggAt[k];if(e)d.innerHTML+=`<div class="egg${e.coldIn<=2?' cold':''}"></div>`+(blue&&S.phase==='play'?`<span class="eggw${e.coldIn<=1?' crit':e.coldIn<=2?' low':''}">🔥${e.coldIn}</span>`:'');
  if(k===key(S.vulture))d.innerHTML+=`<div class="pc" style="background:none;border:0${blue?';width:60%;height:60%':''}">${VUL}</div>`;
  if(S.ostrich&&k===key(S.ostrich))d.innerHTML+=`<div class="pc" style="background:none;border:0">${OST}${S.carrying!==null?'<span style="position:absolute;right:-4px;bottom:-4px;font-size:.6em">🥚</span>':''}</div>`+(S.carrying!==null&&S.eggs[S.carrying]?`<span class="eggw">🔥${S.eggs[S.carrying].coldIn}</span>`:'');
  if(eggAt[k])tags.push(blue?'myegg':'spot');if(k===key(S.vulture))tags.push(blue?'vul':'me');if(S.ostrich&&k===key(S.ostrich))tags.push('me');
  d.dataset.tags=tags.join(' ');d.onclick=()=>tap(x,y);board.appendChild(d);}
 $('warm').innerHTML='';
 const a=$('actions');let h='';a.innerHTML='';const CM=coachNow(),coach=!!CM;
 const btn=(id,lbl,on,click,dis)=>`<button class="${on&&!dis?'on':''}" ${dis?'disabled aria-disabled="true"':''} ${on?'aria-pressed="true"':''} onclick="${click}">${on&&!dis?'✓ ':''}${lbl}</button>`;
 if(S.phase==='setupEggs')h=blue?`Tap a glowing square to hide an egg (${C.eggs-S.eggs.length} left).`:'The ostrich is hiding its eggs…';
 else if(S.phase==='setupOstrich')h=blue?'Tap a glowing square to place your ostrich.':'The ostrich is hiding its eggs…';
 else if(S.phase==='play'&&!S.myTurn)h=blue?'Vulture\'s turn…':'Ostrich\'s turn…';
 else if(S.phase==='play'&&blue){
  a.innerHTML=btn('s','Step',M==='step',"UI.setMode('step')")+(S.onEgg?btn('c','Carry egg',M==='carry',"UI.setMode('carry')",!S.can.carry)+btn('t',S.mustLeave?'Sit · step off first':`Sit · ${C.maxSit-S.sitRun} left`,false,"UI.act('sit')",!S.can.sit):'');
  h=S.mustLeave?`You sat ${C.maxSit} turns: tap a glowing square to step off (or Carry egg).`:M==='carry'?'Tap a glowing square to carry the egg there. It lands where you stand next turn.':S.moves.length?(S.can.sit?'Tap a glowing square to move, or Sit.':'Tap a glowing square to move.'):'';
 } else if(S.phase==='play'){
  a.innerHTML=btn('fl','Fly',M==='fly',"UI.setMode('fly')")+btn('th','Throw stone',M==='throw',"UI.setMode('throw')");
  h=M==='throw'?'Tap a glowing square to throw a stone.':'Tap a glowing square to fly there.';}
 a.className=S.phase==='play'&&S.myTurn?'mine':'';
 // ONE message per turn: the most important event wins
 let ev='';const la=S.lastAction,newTurn=prev&&prev.turn!==S.turn&&S.myTurn;
 if(newTurn&&la){
  if(blue&&la.type==='throw')ev=la.result==='hit'?'💥 An egg was smashed!':la.result==='feather'?'🪶 A stone bounced off you.':'';
  if(blue&&!ev&&la.spotted)ev='👁 The vulture found an egg! Move it or sit.';
  if(!blue&&la.type==='fly'&&la.spotted)ev='🥚 An egg is right here!';
  if(S.lastCold&&!ev)ev=`❄️ An egg went cold.`;
 }
 if(!blue&&prev&&prev.turn==='red'&&la&&la.type==='throw'&&S.turn==='blue')ev=la.result==='hit'?'💥 Smash!':la.result==='feather'?'🪶 Guarded!':'';
 if(ev)h=ev+(h?' '+h:'');
 if(!blue&&S.phase==='play'&&S.myTurn&&S.ostrichDid)h=(S.ostrichDid==='move'?'👣 Ostrich moved (new last-seen track). ':'👣 Ostrich stayed on the same square (sitting?). ')+h;
 // just-in-time tips (once each)
 if(window.TUT&&S.phase==='play'&&la){const T=TUT.tip;
  if(la.type==='throw'&&la.result==='hit')T('hit','💥 = a smashed egg. It stays on the map.');
  if(la.type==='throw'&&la.result==='miss')T('miss','✕ = a stone that hit nothing.');
  if(la.type==='throw'&&la.result==='feather')T('feather',blue?'🪶 Standing on an egg protects it from stones.':'🪶 = the ostrich was sitting on an egg there. Eggs can\'t be hit while guarded.');
  if(la.spotted)T('spotted',blue?'The vulture landed on an unguarded egg and can see it. Sit on it or carry it away.':'Landing on an egg reveals it. If the ostrich moves it, it disappears next time you look.');
  if(!blue&&Object.keys(smells).length&&S.myTurn)T('smell',`Green tint = an egg could be there (scent within ${C.smellRange} of a recent landing). Hatched = cleared. Only your last 3 landings count.`);}
 if(window.TUT&&blue&&S.phase==='play'&&S.myTurn){const T=TUT.tip;
  if(S.onEgg&&S.can.carry&&S.round>2)T('carry','Carry egg: move it 1 square. A stone on you this turn smashes it.');
  if(S.mustLeave)T('sitcap',`Max ${C.maxSit} sits in a row, then step off for a turn.`);
  if(S.vtracks&&Object.keys(S.vtracks).length>1)T('vtracks','● dots = where the vulture has landed.');}
 if(window.TUT&&S.phase==='play'){const seenT=new Set();document.querySelectorAll('#board .mk').forEach(e=>seenT.add(e.dataset.t));seenT.forEach(t=>TUT.tip('mk_'+t,VOCAB[t][0]+' '+VOCAB[t][1]));}
 // render the coach mark
 document.querySelectorAll('.spot').forEach(e=>e.classList.remove('spot'));let ce=$('coach');if(!ce){ce=document.createElement('div');ce.id='coach';document.body.appendChild(ce);}
 // coach hint lives in the hint bar (never covers squares, never dims the board); its control pulses only if enabled
 document.body.classList.remove('coaching');ce.className='hidden';
 if(CM){let an=CM.at==='board'?null:[...a.querySelectorAll('button')].find(b=>(CM.at==='sit'?/Sit/:/Throw/).test(b.textContent));
  if(an&&!an.disabled){an.classList.add('spot','pulse');}if(CM.at==='board'||(an&&!an.disabled))h=CM.txt+(h&&CM.at!=='board'?' — or '+h.charAt(0).toLowerCase()+h.slice(1):'');}
 requestAnimationFrame(()=>window.FX&&FX.update(S,prev));window.SMASH&&SMASH.update(S,prev);
 $('hint').textContent=h;$('hint').classList.toggle('empty',!h);$('log').textContent=S.joined&&!S.opponent&&S.phase!=='over'?'Opponent offline… they can rejoin with the same link.':'';
 const o=$('over');if(S.phase==='over'){const won=S.winner===S.role;o.classList.remove('hidden');
  o.innerHTML=`<div class="lobbybox"><div class="bigost">${S.winner==='blue'?OST:VUL}</div><h1>${S.pass?(S.winner==='blue'?'Ostrich wins!':'Vulture wins!'):won?'You win!':'You lose'}</h1>${S.ai?`<p>vs computer (${S.ai})</p>`:''}<p>${S.winner==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`:`The vulture got every egg by round ${S.round}.`}</p><button class="big" onclick="UI.rematch()">Rematch</button><button class="big ghost" onclick="UI.menu()">Menu</button></div>`;}
 else o.classList.add('hidden');
}
})();
