(function(){
const $=id=>document.getElementById(id);
const OST='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#38d6f0" stroke-width="2" stroke-linecap="round"/><path d="M14 32 L12 38 M20 32 L22 38" stroke="#000" stroke-width="2.5"/></svg>';
const VUL='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/><path d="M23 11 L28 13 L23 14Z" fill="#ffb347" stroke="#000" stroke-width="1.5"/></svg>';
$('lobbyArt').innerHTML=OST;
let ws,S=null,mode=null,me=JSON.parse(localStorage.getItem('bo_me')||'{}');
const key=p=>p[0]+','+p[1];
// Open-skies icon set: ONE big simple mark per square, no corner badges. Same in every theme (vocab.css).
window.addEventListener('DOMContentLoaded',()=>{const r=document.getElementById('roundsLeft');if(r&&window.BO)r.textContent=BO.CONFIG.rounds;});
// the server lost this game (restart/deploy with no saved copy): say so plainly instead of leaving a frozen board
function gameGone(){if(document.getElementById('gone'))return;pending=null;try{clearTimeout(pendTimer)}catch(e){}localStorage.removeItem('bo_me');
 const d=document.createElement('div');d.id='gone';d.innerHTML='<div class="gbox"><div class="gt">Game was reset</div><p>The server restarted and this game could not be restored.</p><button id="goneNew" class="big">Start a new game</button></div>';
 document.body.appendChild(d);document.getElementById('goneNew').onclick=()=>{location.href='/';};}
const LEAF='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32C8 14 20 6 34 6c0 16-8 28-26 26z" fill="#3fbf4a" stroke="#0d3d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 30L28 12" stroke="#0d3d14" stroke-width="2.5" stroke-linecap="round"/></svg>';
const ROCKS='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 33l4-10 9-3 6 5-2 8z" fill="#9aa1ab" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/><path d="M19 33l3-12 9-4 5 9-3 7z" fill="#7d858f" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 21l4-10 8 1 2 8-8 3z" fill="#b8bec6" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const STONE='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 27l5-13 13-4 9 9-4 12-17 2z" fill="#9aa1ab" stroke="#1d2128" stroke-width="3" stroke-linejoin="round"/></svg>';
const XMARK='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 9L31 31M31 9L9 31" stroke="#1a0000" stroke-width="11" stroke-linecap="round"/><path d="M9 9L31 31M31 9L9 31" stroke="#ff2a1f" stroke-width="7" stroke-linecap="round"/></svg>';
const EGG='<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="22" rx="12" ry="15" fill="#ffd21f" stroke="#3a2a00" stroke-width="3"/><ellipse cx="15" cy="15" rx="3" ry="5" fill="#fff6c0"/></svg>';
const MYEGG='<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="21" rx="11" ry="14" fill="#fffaf0" stroke="#2a2418" stroke-width="2.5"/></svg>';
const MAYBE='<svg viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="21" rx="11" ry="14" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 3"/><text x="20" y="28" text-anchor="middle" font-size="19" font-weight="900" fill="#fff" font-family="sans-serif">?</text></svg>';
let sniffSeen={},sniffUntil=0,overHold=0;
const VOCAB={maybe:[MAYBE,'Egg might be here: your last sniff said "Egg nearby!" and nothing rules this square out'],legal:['','Glowing square = you can move here'],target:['','Red-orange glow = you can throw a stone here'],stone:[STONE,'Stone mark: a stone landed here. The ostrich won\'t carry an egg onto it'],food:[LEAF,'Food: the ostrich must step here at least every '+window.BO.CONFIG.food+' turns or it starves'],
 rock:[ROCKS,'Rock pile: the vulture lands here to pick up a stone (holds 1)'],hit:[XMARK,'Smashed egg: this square is blocked now'],spot:[EGG,'Found egg: the vulture landed on it'],
 myegg:[MYEGG,'Your egg: the ring drains as it cools; the number is rounds left'],me:['','This is you'],vul:['','The vulture'],ost:['','The ostrich']};
const SHORT={stone:'Stone mark (no carrying eggs here)',hit:'Smashed egg (square blocked)',spot:'Found egg',food:'Food',rock:'Rock pile (stone refill)',vul:'The vulture',ost:'The ostrich'};
// warmth ring: full red when just warmed -> orange -> pale -> icy blue as it cools (never purple)
const WSTOPS=[[0,[111,200,255]],[.34,[236,240,236]],[.67,[255,154,46]],[1,[232,56,47]]];
function warmCol(f){f=Math.max(0,Math.min(1,f));for(let i=1;i<WSTOPS.length;i++)if(f<=WSTOPS[i][0]){const[a,ca]=WSTOPS[i-1],[b,cb]=WSTOPS[i],t=(f-a)/(b-a);return'rgb('+ca.map((c,j)=>Math.round(c+(cb[j]-c)*t)).join(',')+')';}return'rgb(232,56,47)';}
function warmRing(n,W){const f=Math.max(0,n)/W,C=2*Math.PI*17,col=warmCol(f);
 return `<svg class="wring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="5"/><circle cx="20" cy="20" r="17" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/></svg><span class="wnum${n<=2?' low':''}" style="--wc:${col}">${n}</span>`;}
const icon=(t,cls)=>`<span class="ic ic-${t}${cls?' '+cls:''}" data-t="${t}">${VOCAB[t][0]}</span>`;
const C0=window.BO.CONFIG;
['eggs','warm','sit','fly','rounds','smell','food','stones'].forEach(k=>document.querySelectorAll('.c-'+k).forEach(e=>e.textContent={eggs:C0.eggs,warm:C0.warmth,sit:C0.maxSit,fly:C0.vultureFly,rounds:C0.rounds,smell:C0.smellRange,food:C0.food,stones:C0.stones}[k]));
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
  if(pending)sendPending();else if(inRoom()&&me.code)sock.send(JSON.stringify({t:'join',code:me.code,token:me.token}));};
 sock.onerror=()=>{};
 sock.onclose=()=>{if(sock!==ws)return;stopHB();if(pending||inRoom())retry();};
 sock.onmessage=ev=>{const m=JSON.parse(ev.data);lastPong=Date.now();
  if(m.t==='pong')return;
  if(m.t==='joined'){pending=null;clearTimeout(pendTimer);attempts=0;status('');sniffSeen={};me={code:m.code,token:m.token,role:m.role};localStorage.setItem('bo_me',JSON.stringify(me));history.replaceState(null,'','/?room='+m.code);return;}
  if(m.t==='state'&&m.lobby){if(S&&S.phase&&S.phase!=='over')return;pending=null;clearTimeout(pendTimer);attempts=0;status('');S=null;window.LobbyUI&&LobbyUI.show(m.state);return;}
  else if(m.t==='state'&&m.pass)return passState(m);
  else if(m.t==='state'){window.LobbyUI&&LobbyUI.hide();const prev=S;S=m.state;if(!prev||prev.turn!==S.turn||prev.phase!==S.phase)mode=null;render(prev);sounds(prev);if(!prev)maybeWalk(S.role);return;}
  else if(m.t==='error'&&/No game with that code/.test(m.msg)&&(S||m.gone)){gameGone();return;}
  else if(m.t==='error'){if(!S){pending=null;clearTimeout(pendTimer);attempts=0;status(m.msg,true);}else $('log').textContent=m.msg;}};
}
function inRoom(){const n=document.getElementById('roomLobby');return !!(S||(n&&!n.classList.contains('hidden')));}
function retry(){
 if(attempts>=6&&!inRoom()){pending=null;clearTimeout(pendTimer);attempts=0;status('Could not reach the game server. Check your connection and tap again.',true);return;}
 setTimeout(connect,Math.min(800*attempts,4000));
}
function sendPending(){ws.send(JSON.stringify(pending));clearTimeout(pendTimer);
 pendTimer=setTimeout(()=>{if(pending){status('Still waiting for the server… retrying');connect();}},5000);}
function startHB(){stopHB();hb=setInterval(()=>{if(ws.readyState===1){ws.send('{"t":"ping"}');if(Date.now()-lastPong>45000){ws.close();}}},20000);}
function stopHB(){clearInterval(hb);}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&inRoom()&&(!ws||ws.readyState>1)){attempts=0;connect();}});
let fitAt=0;function fitPhone(){const now=Date.now();if(now-fitAt<250)return;fitAt=now;const vv=window.visualViewport,h=Math.round(vv?vv.height:innerHeight)+'px',top=Math.round(Math.max(0,vv?vv.offsetTop:0))+'px',root=document.documentElement;root.style.setProperty('--vvh',h);root.style.setProperty('--vvo',top);}
fitPhone();if(window.visualViewport)visualViewport.addEventListener('resize',fitPhone);window.addEventListener('resize',fitPhone);
const send=o=>{try{tipBar(null)}catch(e){}return ws&&ws.readyState===1&&ws.send(JSON.stringify(o));};
function open(msg){pending=msg;attempts=0;if(ws&&ws.readyState===1)sendPending();else connect();}
function tapper(el,fn){if(!el)return;let t=0;el.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();fn();},{passive:false});el.addEventListener('click',()=>{if(Date.now()-t>600)fn();});}
function home(){$('homeStep').classList.remove('hidden');$('passStep').classList.add('hidden');$('soloStep').classList.add('hidden');$('roomLobby').classList.add('hidden');status('');}
let soloN=2;const soloHint=()=>{const t={1:'You + 1 computer → Ostrich and Vulture',2:'You + 2 computers → Hunter',3:'You + 3 computers → choose 2 vs 2 or Hunters',4:'You + 4 computers → 2 vs 2 + hunter'};$('soloHint').textContent=t[soloN];};
tapper($('playFriend'),()=>open({t:'create',friends:1}));
tapper($('playSolo'),()=>{home();$('homeStep').classList.add('hidden');$('soloStep').classList.remove('hidden');soloHint();});
tapper($('soloBack'),home);tapper($('passBack'),home);
tapper($('playPass'),()=>{home();$('homeStep').classList.add('hidden');$('passStep').classList.remove('hidden');});
tapper($('passGo'),()=>open({t:'create',pass:true}));
tapper($('soloGo'),()=>open({t:'create',solo:1,bots:soloN}));
$('botPick').addEventListener('click',e=>{const b=e.target.closest('[data-bots]');if(!b)return;soloN=+b.dataset.bots;[...$('botPick').children].forEach(x=>x.classList.toggle('on',x===b));soloHint();});
tapper($('homeGear'),()=>{const m=$('homeMenu'),closed=m.classList.toggle('hidden');$('homeGear').setAttribute('aria-expanded',String(!closed));});
// --- pass & play: one phone, both sides. Only the side holding the phone is ever rendered; an opaque cover sits between turns ---
const NAME={blue:'Ostrich',red:'Vulture'};let PV=null,holder=null,lastBy={},locked=false,hT=null;
function showCover(r,first){const h=$('handoff');h.className=r;$('hArt').innerHTML=r==='blue'?OST:VUL;
 $('hTitle').textContent=`Pass to the ${NAME[r]}${r==='red'?' 🦅':' 🐦'}`;
 $('hSub').textContent=first?`The ${NAME[r]} goes first and hides the eggs. ${NAME[r==='blue'?'red':'blue']}, look away!`:`${NAME[r==='blue'?'red':'blue']}, hand over the phone. No peeking!`;
 $('hGo').textContent=`I'm the ${NAME[r]} — tap to start`;
 $('board').innerHTML='';$('actions').innerHTML='';$('hint').textContent='';
 const bn=$('banner');if(bn){bn.textContent='';bn.className='hidden';}}
function showView(r,v){holder=r;const prev=lastBy[r]||null;const pr=S;S=v;mode=null;if(!pr)$('lobby').classList.add('hidden');render(prev);sounds(prev);if(!lastBy[r])maybeWalk(r);lastBy[r]=v;}
function passState(m){clearTimeout(hT);PV=m;const next=m.active,over=m.views.blue.phase==='over';
 if(over||holder===next||(holder&&locked)){if(over){$('handoff').className='hidden';locked=false;}if(!locked||over)return showView(over?'blue':next,m.views[over?'blue':next]);return;}
 if(!holder){locked=true;showCover(next,m.views.blue.phase==='setupEggs');$('lobby').classList.add('hidden');return;}
 // let the player who just moved see their own result (fly / throw / smash), then cover
 showView(holder,m.views[holder]);locked=true;hT=setTimeout(()=>showCover(next),1400);}
tapper($('hGo'),()=>{if(!PV)return;$('handoff').className='hidden';locked=false;const r=PV.active;showView(r,PV.views[r]);});
tapper($('joinBtn'),()=>open({t:'join',code:$('codeIn').value.trim(),token:me.code===$('codeIn').value.trim().toUpperCase()?me.token:undefined}));
$('seatPick').addEventListener('click',e=>{const b=e.target.closest('button[data-seat]');if(b&&!b.classList.contains('on'))send({t:'seat',role:b.dataset.seat});});
tapper($('inviteBtn'),()=>{sheetOpen=!sheetOpen;render();});tapper($('waitClose'),()=>{sheetOpen=false;render();});
// invite popover closes on any tap outside it (or its chip)
const outside=e=>{if(sheetOpen&&!e.target.closest('#wait,#inviteBtn')){sheetOpen=false;render();}};
document.addEventListener('touchstart',outside,{passive:true,capture:true});document.addEventListener('mousedown',outside,true);tapper($('howBtn'),()=>UI.rules());tapper($('helpBtn'),()=>UI.rules());
function muteLabel(){const t=SFX.muted?'Sound off':'Sound on';$('muteBtn').textContent=SFX.muted?'🔇':'🔊';$('muteBtn').setAttribute('aria-label',t);if($('muteBtn2')){$('muteBtn2').textContent=t;$('muteBtn2').setAttribute('aria-label',t);}}
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
if(roomQ){$('codeIn').value=roomQ;open({t:'join',code:roomQ,token:me.code===roomQ.toUpperCase()?me.token:undefined});}
$('shareBtn').onclick=()=>{const u=$('shareLink').value;if(navigator.share)navigator.share({title:'Battle Ostriches',text:'Play Battle Ostriches with me! Code '+S.code,url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u);$('shareBtn').textContent='Copied!';}};
// --- walkthrough (same chips as the board) ---
const WALK={blue:[['🥚','Your goal','Hide '+C0.eggs+' eggs. Keep at least one alive for '+C0.rounds+' rounds. The vulture sees you, but not your eggs.'],
  ['👆','Your turn','Step 1 square. On an egg: Sit (max '+C0.maxSit+' in a row) or Carry it 1 square. The ring on each egg drains as it cools: visit it before the number hits 0.'],
  ['🍃','Stay fed','Step on a leaf at least every '+C0.food+' turns or you starve. A stone thrown at you just bounces off, so your square (and an egg in your beak) is always safe. Squares next to you are not!']],
 red:[['💥','Your goal','Smash all '+C0.eggs+' hidden eggs. You can see the ostrich; its eggs are hidden.'],
  ['👆','Your turn','Fly up to '+C0.vultureFly+' squares. Each landing tells you "Egg nearby!" or "No egg nearby" (within 1 square). Land on an egg to find it.'],
  ['🪨','Stones','You carry 1 stone. Throw at your square or one next to it. A stone at the ostrich just bounces off. A missed stone stays on the board, and the ostrich won\'t carry an egg onto it. Land on a rock pile to pick up another.']]};
let wi=0,wr='blue',wDone=null;
function maybeWalk(r){if(!WALK[r]||localStorage.getItem('bo_walk_'+r))return;walk(r);}
function walk(role,done){wr=(role&&WALK[role]&&role)||(S&&WALK[S.role]&&S.role)||'blue';if(!WALK[wr])return;wi=0;wDone=done||null;drawWalk();$('walk').classList.remove('hidden');}
function closeWalk(){$('walk').classList.add('hidden');localStorage.setItem('bo_walk_'+wr,'1');const d=wDone;wDone=null;d&&d();maybeCard();}
function drawWalk(){const st=WALK[wr],cur=st[wi],W=$('walk');
 W.innerHTML=`<div class="wcard"><div class="wart"><span style="width:56px;height:56px;display:inline-block">${wr==='red'?VUL:OST}</span><span style="font-size:44px">${cur[0]}</span></div><h2>${cur[1]}</h2><p id="wText">${cur[2]}</p><div class="wdots">${st.map((_,k)=>`<span class="${k===wi?'on':''}"></span>`).join('')}</div><div class="wnav"><button id="wSkip">Skip</button><button id="wNext">${wi===st.length-1?"Let's play":'Next'}</button></div></div>`;
 tapper($('wSkip'),closeWalk);tapper($('wNext'),()=>{if(wi<st.length-1){wi++;drawWalk();}else closeWalk();});}
// --- role card: one card per animal per phone, shown at the first play state for that seat (words in roles.js) ---
let cardOpen=null;
const cardSeen=id=>{try{return localStorage.getItem('bo_card_'+id)||localStorage.getItem('bo_card_off')}catch(e){return 1}};
function cardMode(s){return !s.three?'2':s.h3&&s.h3.team?String(s.h3.n):s.h3&&s.h3.hunt?'4h':'3';}
function cardFor(s){if(!s||!window.Roles||!s.rules)return null;const h=s.h3||{};
 return Roles.roleCard(h.mySeat||s.role,s.role==='hunter'?(s.kind||h.kind):h.kind,cardMode(s),s.rules);}
function cardArt(k){return k==='ostrich'?OST:k==='vulture'?VUL:window.T3UI&&T3UI.KIND[k]?T3UI.KIND[k].art:'';}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function showCard(c,picked,again){const el=$('rolecard');if(!el||!c)return;cardOpen={id:c.id,again:!!again};
 el.innerHTML=`<div class="rc" data-animal="${c.animal}"><span class="rpic">${cardArt(c.picture)}</span><h2>${esc(c.title)}</h2>${picked?`<p class="rpicked">${esc(Roles.PICKED)}</p>`:''}<p class="rgoal">${esc(c.goal)}</p><ul class="rmoves">${c.moves.map(m=>`<li>${esc(m)}</li>`).join('')}</ul><p class="rlose">${esc(c.lose)}</p><button type="button" class="rok">Got it</button></div>`;
 el.classList.remove('hidden');}
function closeCard(){const el=$('rolecard');if(!el||!cardOpen)return;el.classList.add('hidden');
 if(!cardOpen.again)try{localStorage.setItem('bo_card_'+cardOpen.id,'1')}catch(e){}cardOpen=null;}
function maybeCard(){if(cardOpen||!S||S.phase!=='play'||S.god)return;const h=S.h3;
 if(h&&(h.ready===false||h.needKind||(h.team&&h.teamSetup&&h.teamSetup!=='done')))return;
 if(h&&h.birds&&h.birds[h.mySeat||S.role]&&h.birds[h.mySeat||S.role].out)return;
 const walk=$('walk'),tut=document.getElementById('tut');if(!walk.classList.contains('hidden')||(tut&&!tut.classList.contains('hidden')))return;
 const c=cardFor(S);if(!c||cardSeen(c.id))return;showCard(c,S.picked,false);}
tapper($('rolecard'),closeCard);
window.UI={card(){showCard(cardFor(S),S&&S.picked,true);},walk(){walk();},rules(){$('rules').classList.remove('hidden');const rb=$('roleCardBtn');if(rb)rb.classList.toggle('hidden',!cardFor(S));const b=document.getElementById('guideToggle');if(b){const on=!localStorage.getItem('bo_hs_off');b.textContent=on?'Ostrich guides: ON (tap to turn off)':'Ostrich guides: OFF (tap to turn on)';}},closeRules(){$('rules').classList.add('hidden')},
 setMode(m){if(locked||!S||!S.myTurn)return;mode=m;if(m==='throw')coachDid('throw');render();},act(a){if(locked||!S||!S.myTurn)return;if(a==='sit'&&!(S.can&&S.can.sit))return nope(S.mustLeave?`You sat ${S.cfg.maxSit} turns in a row. Step off this turn.`:'Sit only works while you stand on an egg.');coachDid(a);if(a==='sit'&&G&&G.id==='start')gSet('start','1');send({t:'act',a})},guides(on){if(on)localStorage.removeItem('bo_hs_off');else localStorage.setItem('bo_hs_off','1');const b=document.getElementById('guideToggle');if(b)b.textContent=on?'Ostrich guides: ON (tap to turn off)':'Ostrich guides: OFF (tap to turn on)';if(S)render();},replayCoach(){Object.keys(localStorage).filter(k=>k.startsWith('bo_g_')).forEach(k=>localStorage.removeItem(k));['blue','red'].forEach(r=>localStorage.removeItem('bo_cs_'+r));localStorage.removeItem('bo_tips_off');Object.keys(localStorage).filter(k=>k.startsWith('bo_tip_')).forEach(k=>localStorage.removeItem(k));if(S)render();},rematch(how){holder=null;lastBy={};sniffSeen={};send({t:'act',a:'rematch',how:how||'same'})},
 _rr(){if(S)render();},open(m){open(m);},pause(ms){sniffUntil=Math.max(sniffUntil,Date.now()+ms);},send(o){send(o);},_tip:t=>tipBar(t),_S:()=>S,_legal:()=>legalNow(),_locked:()=>locked,menu(){S=null;localStorage.removeItem('bo_me');location.href='/';}};
// --- learn-by-playing coach marks: one hint, anchored, everything else dimmed; advances when the player does it ---
const COACH={blue:[
  {when:S=>S.myTurn&&S.moves.length,txt:'Tap a glowing square to step',at:'board',done:'step'},
  {when:S=>S.myTurn&&S.can.sit,txt:'Sit to warm this egg (the ring refills)',at:'sit',done:'sit'}],
 red:[{when:S=>S.myTurn,txt:'Tap a glowing square to fly and sniff',at:'board',done:'fly'},
  {when:S=>S.myTurn&&S.throw&&S.throw.length,txt:'Tip: tap Throw stone to aim',at:'throw',done:'throw'}]};
const cIdx=r=>+(localStorage.getItem('bo_cs_'+r)||0);
function coachNow(){return null;if(!S||S.phase!=='play')return null;const st=COACH[S.role][cIdx(S.role)];return st&&st.when(S)?st:null;}
function coachDid(a){if(!S)return;const st=COACH[S.role][cIdx(S.role)];if(st&&st.done===a&&st.when(S))localStorage.setItem('bo_cs_'+S.role,cIdx(S.role)+1);}
let sheetOpen=false;
// --- mark tooltips: hover (desktop), tap on non-legal squares, long-press anywhere (phone). Never blocks a legal tap. ---
let noClick=0,tipT=null,lpT=null,lpXY=null;const TT=document.createElement('div');TT.id='marktip';TT.className='hidden';TT.setAttribute('role','tooltip');document.body.appendChild(TT);
function showTip(c,txt,ms){if(!txt||(S&&S.phase==='over'))return;TT.textContent=txt;TT.classList.remove('hidden');const r=c.getBoundingClientRect(),w=TT.offsetWidth,h=TT.offsetHeight;
 let x=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2)),y=r.top-h-8;if(y<6)y=r.bottom+8;TT.style.left=x+'px';TT.style.top=y+'px';clearTimeout(tipT);if(ms)tipT=setTimeout(hideTip,ms);}
function hideTip(){clearTimeout(tipT);TT.classList.add('hidden');}
{const B=$('board'),cellOf=e=>e.target.closest&&e.target.closest('.cell');
 B.addEventListener('mouseover',e=>{if(e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents)return;const c=cellOf(e);if(c&&c.dataset.tip&&matchMedia('(hover:hover)').matches)showTip(c,c.dataset.tip);else if(!c||!c.dataset.tip)hideTip();});
 B.addEventListener('mouseleave',()=>{if(matchMedia('(hover:hover)').matches)hideTip();});
 B.addEventListener('touchstart',e=>{const c=cellOf(e);clearTimeout(lpT);if(!c||!c.dataset.tip)return;const t=e.touches[0];lpXY=[t.clientX,t.clientY];
  lpT=setTimeout(()=>{showTip(c,c.dataset.tip,2600);noClick=Date.now()+700;},450);},{passive:true});
 B.addEventListener('touchmove',e=>{const t=e.touches[0];if(lpXY&&Math.hypot(t.clientX-lpXY[0],t.clientY-lpXY[1])>10)clearTimeout(lpT);},{passive:true});
 B.addEventListener('touchend',e=>{clearTimeout(lpT);if(Date.now()<noClick&&e.cancelable)e.preventDefault();},{passive:false});
 B.addEventListener('contextmenu',e=>{if(cellOf(e))e.preventDefault();});
 document.addEventListener('scroll',hideTip,true);}
// taps on a square only go to the server when that square is glowing; otherwise explain right here
function tipBar(t){const b=$('tipbar');if(!t){b.classList.add('hidden');return;}b.innerHTML=`<span>💡 ${t}</span> <button class="tipoff" id="tipOff">Turn off tips</button>`;b.classList.remove('hidden');tapper($('tipOff'),()=>{localStorage.setItem('bo_tips_off','1');tipBar(null);});}
function nope(msg){const h=$('hint');h.textContent=msg;h.classList.remove('empty');h.classList.remove('nudge');void h.offsetWidth;h.classList.add('nudge');}
const isF=(C,k)=>C.foods.some(q=>key(q)===k),isR=(C,k)=>C.rocks.some(q=>key(q)===k);
const nearF=(C,p)=>C.foods.some(q=>Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]))<=1);
function legalNow(){if(!S)return[];const blue=S.role==='blue',M=curMode(),C=S.cfg;
 if(blue&&S.phase==='setupEggs'){const eg=new Set((S.eggs||[]).map(e=>key(e.pos)));const r=[];for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y;if(!eg.has(k)&&k!==key(S.vulture)&&!(S.h3&&S.h3.block||[]).some(q=>key(q)===k)&&!isR(C,k)&&!nearF(C,[x,y]))r.push([x,y]);}return r;}
 if(blue&&S.phase==='setupOstrich'){const blocked=new Set();if(S.h3){(S.h3.block||[]).forEach(q=>blocked.add(key(q)));(S.h3.pieces||[]).forEach(q=>{if(q.p&&q.p[0]>=0)blocked.add(key(q.p));});}const r=[];for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y;if(!blocked.has(k))r.push([x,y]);}return r;}
 if(!S.myTurn)return[];if(S.role==='hunter')return S.hmoves||[];return blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly);}
function tap(x,y){if(!S||locked)return;if(Date.now()<sniffUntil){clearTimeout(tap.q);tap.q=setTimeout(()=>tap(x,y),sniffUntil-Date.now()+20);return;}const p=[x,y],ok=legalNow().some(q=>q[0]===x&&q[1]===y);
 if(!ok){const c=$('board').children[y*S.cfg.cols+x];if(c&&c.dataset.tip&&c.dataset.tags)showTip(c,c.dataset.tip,2600);}
 if(S.role==='blue'&&(S.phase==='setupEggs'||S.phase==='setupOstrich'))return ok?send({t:'act',a:'place',p}):nope('Tap a glowing square. Eggs can\'t go on rocks, or on or next to food.');
 if(S.phase!=='play')return;if(!S.myTurn)return nope(S.three?window.T3UI.waitMsg(S):S.role==='blue'?'Wait, it\'s the Vulture\'s turn.':'Wait, it\'s the Ostrich\'s turn.');
 const m0=curMode();if(m0==='hmove'){if(!ok)return nope(window.T3UI.nopeMsg(S));return send({t:'act',a:'hmove',p});}
 const m=curMode();if(!m)return;
 if(!ok&&m==='carry'&&isF(S.cfg,key(p))&&gd(p,S.ostrich)===1){const c=$('board').children[p[1]*S.cfg.cols+p[0]];c&&c.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:180});return nope("Can't carry egg and food");}
 if(!ok)return nope(m==='throw'?(S.stones<1?'No stone. Land on a rock pile to pick one up.':'Throw at a red-orange square: your square or one next to you. A stone at the ostrich just bounces off.'):m==='fly'?`Too far. Fly up to ${S.cfg.vultureFly} squares: tap a glowing square.`:m==='carry'?'Carry 1 square: tap a glowing square (not onto an egg, food, rocks, a stone mark, or a smashed square).':'Step 1 square: tap a glowing square next to you (smashed squares are blocked).');
 coachDid(m==='carry'?'step':m);send({t:'act',a:m,p});}
function curMode(){if(!S.myTurn)return null;if(S.role==='hunter')return'hmove';if(S.role==='red')return mode||'fly';
 if(mode==='carry'&&S.can&&S.can.carry)return'carry';return S.moves.length?'step':null;}
// --- GUIDED HARD STOPS (human ostrich only, client-side): once per device, the ostrich must DO the thing.
// start: just a one-time tip, never restricts (Brian 11/4). hungry: only moves toward the nearest leaf until it eats. cold: only moves toward the coldest egg until it stands on it.
// Server rules and the computer ostrich are untouched. Skip in tests: localStorage bo_hs_off=1.
const NOSTONE_FOUND='You found an egg, but you have no stone. Get one, then come back.';
const gd=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));
const gGet=id=>localStorage.getItem('bo_g_'+id),gSet=(id,v)=>localStorage.setItem('bo_g_'+id,v);
let G=null;
function guideNow(){G=null;
 if(!S||S.role!=='blue'||S.phase!=='play'||localStorage.getItem('bo_hs_off'))return null;const C=S.cfg,o=S.ostrich,eggs=(S.eggs||[]).map((e,i)=>Object.assign({i},e)).filter(e=>e.alive&&!e.carried&&e.pos);
 const near=ps=>ps.reduce((b,p)=>!b||gd(p,o)<gd(b,o)?p:b,null);
 // finish active guides
 if(gGet('hungry')==='on'&&isF(C,key(o)))gSet('hungry','1');
 const cv=gGet('cold');if(cv&&cv.startsWith('on:')){const e=S.eggs[+cv.slice(3)];if(!e||!e.alive||e.carried||key(e.pos)===key(o))gSet('cold','1');}
 if(!S.myTurn)return null;
 // start new ones (one at a time, start first)
 // start: a one-time TIP only (no path, no pulse toward any egg, no move restriction): pointing at an egg would show the vulture where it is.
 const st=gGet('start');if(!st&&eggs.length)gSet('start','on:'+S.round);
 const st2=gGet('start');if(st2&&st2.startsWith('on:')&&S.round>+st2.slice(3))gSet('start','1');
 if(gGet('start')!=='1'&&!(gGet('start')||'').startsWith('on:'))gSet('start','1');
 if(gGet('start')!=='on'&&!(gGet('start')||'').startsWith('on:')){const fd=gd(near(C.foods),o);if(!gGet('hungry')&&S.hungerLeft<=Math.max(4,fd+2))gSet('hungry','on');}
 if((gGet('start')||'').startsWith('on:'))return G={id:'start',tip:1,txt:'Tip: sit on eggs to keep them warm'};
 if(gGet('hungry')==='on')return G={id:'hungry',t:near(C.foods),txt:`You're hungry! Go eat (${S.hungerLeft} left)`};
 return null;}
// cold egg: NOT forced. First time any egg has <=8 rounds left: loud pulse + one-line warning until it's warmed. Afterward: subtle ring pulse only.
const COOL=8;let W=null;
function coolNow(){W=null;if(!S||S.role!=='blue'||S.phase!=='play')return;const eggs=(S.eggs||[]).map((e,i)=>Object.assign({i},e)).filter(e=>e.alive&&!e.carried&&e.pos);
 const off=localStorage.getItem('bo_hs_off'),cv=gGet('cold');if(off)return;
 if(cv&&cv.startsWith('on:')){const e=S.eggs[+cv.slice(3)];if(!e||!e.alive||e.carried||key(e.pos)===key(S.ostrich)||e.coldIn>COOL)gSet('cold','1');}
 const ce=eggs.slice().sort((a,b)=>a.coldIn-b.coldIn)[0];
 if(!off&&!gGet('cold')&&ce&&ce.coldIn<=COOL&&key(ce.pos)!==key(S.ostrich)&&!(gGet('start')||'').startsWith('on:'))gSet('cold','on:'+ce.i);
 const c=gGet('cold');const loud=!off&&c&&c.startsWith('on:')?S.eggs[+c.slice(3)]:null;
 W={cool:new Set(eggs.filter(e=>e.coldIn<=COOL&&key(e.pos)!==key(S.ostrich)).map(e=>key(e.pos))),loud:loud?key(loud.pos):null,
  txt:loud?`Egg cooling — ${loud.coldIn} round${loud.coldIn===1?'':'s'} left!${loud.coldIn<=4?' Hurry back!':''}`:'',urgent:loud&&loud.coldIn<=4};}
function guideApply(){if(S&&!S._o)S._o={m:S.moves,c:S.carryMoves,cc:S.can&&S.can.carry};else if(S){S.moves=S._o.m;S.carryMoves=S._o.c;if(S.can)S.can.carry=S._o.cc;}if(!G)return;const o=S.ostrich;if(!G.t)return;if(G.free){G.path=[];let p=o.slice();for(let k=0;k<20&&gd(p,G.t)>0;k++){p=[p[0]+Math.sign(G.t[0]-p[0]),p[1]+Math.sign(G.t[1]-p[1])];G.path.push(key(p));}return;}const tg=G.any||[G.t],f=ms=>{const r=(ms||[]).filter(p=>tg.some(t=>gd(p,t)<gd(o,t)));return r.length||!(ms||[]).length?r:ms;};
 if(G.sit&&S.can&&S.can.sit){S.moves=[];S.carryMoves=[];S.can.carry=false;}else{S.moves=f(S.moves);S.carryMoves=f(S.carryMoves);}
 G.path=[];let p=o.slice();for(let k=0;k<20&&gd(p,G.t)>0;k++){p=[p[0]+Math.sign(G.t[0]-p[0]),p[1]+Math.sign(G.t[1]-p[1])];G.path.push(key(p));}}
// "YOU" tag on this phone's own piece, plus a 0.6 s pulse when this player's turn starts (Nov 4 playtest: "I don't see where I am").
// It only marks a piece this player already sees: nothing for an eliminated (off-board) bird, the watcher view or the end screen.
// The pulse plays once per turn (youKey); a re-render inside those 0.6 s picks the animation up where it was.
let youKey='',youAt=0;
function youTag(board){
 if(!S||S.god||S.phase==='over'){youKey='';return;}
 const bs=S.h3&&S.h3.birds,mb=bs&&bs[S.h3.mySeat||S.role];if(mb&&mb.out)return;
 const mine=board.querySelector('.pc.ph.mine'),cell=mine?mine.closest('.cell'):board.querySelector('.cell[data-tags~="me"]');
 if(!cell)return;
 const t=document.createElement('span');t.className='youtag'+(cell.querySelector('.pouncetag')?' low':'');t.textContent='YOU';cell.appendChild(t);
 if(S.phase!=='play'||!S.myTurn)return;
 const k=S.role+':'+S.round+':'+S.turn;if(k!==youKey){youKey=k;youAt=Date.now();}
 const el=Date.now()-youAt;if(el>=600)return;
 const p=document.createElement('span');p.className='youpulse';p.style.animationDelay=(-el)+'ms';cell.appendChild(p);
 setTimeout(()=>document.querySelectorAll('.youpulse').forEach(e=>e.remove()),650-el);}
function render(prev){
 maybeCard();$('lobby').classList.add('hidden');const C=S.cfg,blue=S.role==='blue',body=document.body;body.className=(S.role==='hunter'?'hunter':blue?'blue':'red')+(S.three?' three':'')+(S.god?' godview':'');
 $('turnTag').innerHTML=S.role==='hunter'||(S.h3&&S.h3.team)?window.T3UI.tag(S):`<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${blue?OST:VUL}</span> ${blue?'OSTRICH':'VULTURE'}`;
 $('roundsLeft').textContent=C.rounds-S.round+1;$('eggsLeft').textContent=S.eggsLeft;
 // HUD: ostrich hunger (leaf + turns left) and vulture stones, both public
 const hud=$('stats');if(hud){const play=S.phase==='play'||S.phase==='over';hud.classList.toggle('hidden',!play);
  if(play)hud.innerHTML=`<span class="hh${S.hungerLeft<=3?' low':''}" data-tip="Ostrich food: turns left before it starves">${LEAF}<b id="hungerLeft">${S.hungerLeft}</b>${blue?`<i class="hbar"><i style="width:${Math.max(0,Math.min(100,100*S.hungerLeft/C.food))}%"></i></i>`:''}</span><span class="hs${S.stones<1?' empty':''}" data-tip="Vulture stones">${STONE}<b id="stonesLeft">${S.stones}/${C.stones}</b></span>`;}
 // waiting for opponent
 const link=location.origin+'/?room='+S.code,slot=$('wait-slot');
 $('shareCode').textContent=S.code;$('shareLink').value=link;const w=$('wait');
 // Big panel ONLY while the other seat has never been claimed. It used to key off S.opponent (= opponent's socket is
 // live right now), so whenever the opponent's phone slept/backgrounded/reconnected mid-game the full panel came back.
 const waiting=!S.joined&&!S.ai&&S.phase!=='over';
 if(waiting){w.classList.remove('hidden','sheet');slot.appendChild(w);sheetOpen=false;}
 else if(sheetOpen&&!S.ai){w.classList.remove('hidden');w.classList.add('sheet');document.body.appendChild(w);} else{w.classList.add('hidden');w.classList.remove('sheet');sheetOpen=false;}
 w.firstElementChild.nextElementSibling.textContent=waiting?'Waiting for your opponent. Send them this link:':'Room code';
 // share first: while nobody else has joined and nothing is placed yet, pick (or change) your side under the code
 const sp=$('seatPick'),SNM={blue:'🐦 Ostrich',red:'🦅 Vulture',hunter:'🐾 Hunter',hyena:'🐾 Hyena',badger:'🦡 Honey badger',o1:'🐦 Ostrich 1',o2:'🐦 Ostrich 2',v1:'🦅 Vulture 1',v2:'🦅 Vulture 2'};
 const mySeat=S.h3&&S.h3.mySeat||S.role,seatsAll=S.h3?Object.entries(S.h3.seats):[['blue',S.role==='blue'?'on':'open'],['red',S.role==='red'?'on':'open']];
 const fresh=waiting&&(S.phase==='setupEggs'||S.phase==='setup')&&!(S.eggs||[]).length&&!(S.h3&&S.h3.setupStep&&S.h3.setupStep!=='eggs');
 const choices=seatsAll.filter(([r,v])=>r===mySeat||v==='open').map(([r])=>r);
 sp.classList.toggle('hidden',!fresh||choices.length<2);
 if(fresh&&choices.length>1)sp.innerHTML='<div class="splbl">You play</div>'+choices.map(r=>`<button data-seat="${r}" class="${r===mySeat?'on':''}">${SNM[r]||r}</button>`).join('');
 $('inviteCode').textContent='';$('inviteBtn').classList.toggle('hidden',waiting||!!S.ai||S.phase==='over');$('inviteBtn').setAttribute('aria-expanded',sheetOpen);
 guideNow();guideApply();coolNow();
 const M=curMode();
 let foodLead=false,foodText='';
 if(S.phase==='play'&&blue&&S.ostrich&&S.ostrich[0]>=0&&M!=='carry'){const route=BO.foodRoute(C,S.ostrich,S.marks);const base=(S._o&&S._o.m)||S.moves||[];
  if(route&&route.len>0&&S.hungerLeft<=route.len+1&&route.next&&base.some(p=>key(p)===key(route.next))){if(!(S.moves||[]).some(p=>key(p)===key(route.next)))S.moves=(S.moves||[]).concat([route.next]);foodText=`Leaf in ${route.len} step${route.len===1?'':'s'} · ${S.hungerLeft} left`;foodLead=true;}}
 const L=!S.myTurn?[]:S.role==='hunter'?(S.hmoves||[]):(blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly));
 const lk=new Set(L.map(key)),setup=blue&&(S.phase==='setupEggs'||S.phase==='setupOstrich');
 const board=$('board');board.style.gridTemplateColumns=`repeat(${C.cols},minmax(0,1fr))`;board.style.alignContent='start';board.style.alignItems='start';board.innerHTML='';
 const la=S.lastAction,newTurn=!!(prev&&(prev.turn!==S.turn||prev.round!==S.round));
 const lastThrow=la&&la.type==='throw'&&la.p&&newTurn?key(la.p):null;const eggAt={};(S.eggs||[]).forEach(e=>{if(e.alive&&e.pos)eggAt[key(e.pos)]=e;});
 const sn=S.phase==='play'&&S.sniff?S.sniff:null,snK=sn?((sn.round!=null?sn.round:'x')+'|'+sn.p+'|'+sn.yes):'';
 // This animal, this sense, once, and only while that sense is still the current round. The live round
 // used to be part of the key, so the ostrich's move replayed "Egg nearby!" after the egg could leave.
 const senseNow=BO.sniffFresh(S),seen=sniffSeen[S.role]||'',snNew=!!sn&&senseNow&&snK!==seen;sniffSeen[S.role]=snK;if(snNew)sniffUntil=Date.now()+1200;
 const found=!!sn&&key(sn.p)===key(S.vulture)&&S.marks[key(S.vulture)]==='spotted'; // landed ON an egg: that's a find, not a sniff
 const inSn=k=>{if(!sn)return false;const [a,b]=k.split(',').map(Number);return Math.max(Math.abs(a-sn.p[0]),Math.abs(b-sn.p[1]))<=1;};
 const birdGone=side=>{const b=S.h3&&S.h3.birds;if(!b)return false;if(S.h3.team){const me=S.h3.mySeat;return side==='o'?!!((me==='o1'||me==='o2')&&b[me]&&b[me].out):!!((me==='v1'||me==='v2')&&b[me]&&b[me].out);}return side==='o'?!!(b.blue&&b.blue.out):!!(b.red&&b.red.out);};
 const onBoard=p=>p&&p[0]>=0&&p[1]>=0;
 const noStone=!blue&&S.role==='red'&&S.phase==='play'&&S.myTurn&&S.stones<1,throwing=!blue&&M==='throw',ok=onBoard(S.ostrich)&&!birdGone('o')?key(S.ostrich):'',vk=onBoard(S.vulture)&&!birdGone('v')?key(S.vulture):'';
 for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y,d=document.createElement('div');d.className='cell'+((x+y)%2?' alt':'');
  const m=S.marks[k];if(m)d.classList.add(m);const tags=[],tip=[];
  const legal=lk.has(k)||(setup&&legalNow().some(q=>key(q)===k));
  if(W&&W.cool.has(k)){if(W.loud===k){d.classList.add('gloud');if(W.urgent)d.classList.add('urgent');}else d.classList.add('gcool');}
  if(G&&G.path&&G.path.includes(k))d.classList.add(k===key(G.t)?'gtarget':'gpath');
  if(legal){d.classList.add('legal');if(throwing)d.classList.add('target');tags.push(throwing?'target':'legal');d.setAttribute('aria-label',throwing?'Throw here':'Legal step');}
  const maybe=!found&&!blue&&sn&&sn.yes&&inSn(k)&&!m&&k!==ok&&!isF(C,k)&&!isR(C,k);
  if(blue&&sn&&sn.yes&&inSn(k)&&m!=='hit')d.classList.add('snseen');
  if(maybe){d.classList.add('maybe');tags.push('maybe');tip.push('Egg might be here (sniff)');}
  if(sn&&snNew&&inSn(k)&&!found){d.classList.add(sn.yes?'snyes':'snno');d.style.animationDelay=(Math.max(Math.abs(x-sn.p[0]),Math.abs(y-sn.p[1]))*.18)+'s';}
  // exactly one tile icon: smashed > found egg > own egg > food > rocks
  const e=eggAt[k];let h='';
  if(m==='hit'){h=icon('hit');tip.push(SHORT.hit);}
  else if(m==='stone'){h=icon('stone');tip.push(SHORT.stone);}
  else if(!blue&&m==='spotted'){h=icon('spot');tip.push(SHORT.spot);}
  else if((blue||S.god)&&e){h=`<span class="ic ic-myegg${m==='spotted'?' found':''}${S.god&&!blue?' godegg':''}" data-t="myegg">${MYEGG}${S.phase==='play'?warmRing(e.coldIn,C.warmth):''}</span>`;
   tip.push((blue?'Your egg: ':'Egg: ')+e.coldIn+' round'+(e.coldIn===1?'':'s')+' until cold'+(m==='spotted'?' · the vulture found it':'')+(S.god&&!blue?' · watching':''));}
  else if(maybe){h=icon('maybe');}
  else if(isF(C,k)){h=icon('food');tip.push(SHORT.food+': resets the ostrich\'s hunger to '+C.food);}
  else if(isR(C,k)){h=icon('rock');tip.push(SHORT.rock);}
  if(h)tags.push(h.match(/data-t="(\w+)"/)[1]);
  if(noStone&&isR(C,k))d.classList.add('rockcall'); // vulture with no stone: both rock piles glow (every turn)
  if(k===lastThrow&&(la.result==='miss'||la.result==='bounce')){d.classList.add(la.result==='bounce'?'bounce':'flash');}
  if(k===vk&&k!==ok&&(m==='spotted'||(blue&&e)))d.classList.add('vfound'); // vulture on a found egg: both show, corner layout
  if(k===vk&&k===ok){d.classList.add('both');tip.push('Vulture and ostrich share this square');}
  if(k===vk){h+=`<div class="pc pv">${VUL}</div>`;tip.push(blue?'The vulture':'You (vulture)');tags.push(blue?'vul':'me');}
  if(k===ok){if(blue&&e){d.classList.add('sat');}h+=`<div class="pc po">${OST}</div>`+(S.carried?'<span class="carry">'+MYEGG+'</span>':'');tip.push(blue?'You (ostrich)'+(S.carried?', carrying an egg':''):'The ostrich'+(S.carried?' (carrying something)':''));tags.push(blue?'me':'ost');
   if(blue&&S.carried&&S.eggs&&S.eggs[S.carrying])h+=warmRing(S.eggs[S.carrying].coldIn,C.warmth);}
  if(legal)tip.push(throwing?'Throw a stone here':setup?(S.phase==='setupEggs'?'Hide an egg here':'Start here'):blue?'Move here':'Fly here');
  d.innerHTML=h;d.dataset.tip=[...new Set(tip)].join(' · ');
  d.dataset.tags=tags.join(' ');if(tags.includes('me'))d.id='current';d.onclick=()=>{if(Date.now()<noClick)return;tap(x,y);};board.appendChild(d);}
 {const cs=getComputedStyle(board),gap=parseFloat(cs.columnGap)||0,pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),inner=board.clientWidth-pad,w=(inner-gap*(C.cols-1))/C.cols;if(w>1){board.style.gridAutoRows='0';board.style.gridTemplateRows=`repeat(${C.rows},${w}px)`;}}
 if(prev&&blue&&S.hungerLeft>prev.hungerLeft&&S.ostrich&&S.ostrich[0]>=0){const c=board.children[S.ostrich[1]*C.cols+S.ostrich[0]];if(c)c.classList.add('ate');}
 if(snNew){const vc=board.children[sn.p[1]*C.cols+sn.p[0]];if(vc&&!found){const w=document.createElement('div');w.className='snwave '+(sn.yes?'yes':'no');vc.appendChild(w);}
  if(!window.BORing||BORing.showSniffPop(blue,!!sn.yes,found)){const o=document.createElement('div');o.id='snpop';o.className=(found?'yes found':sn.yes?'yes':'no')+(blue?' small':'');o.textContent=found?(blue?'Vulture found your egg!':'Found egg!'):sn.yes?(blue?'Vulture smells an egg nearby':'Egg nearby!'):'No egg nearby';board.appendChild(o);setTimeout(()=>o.remove(),1400);}}
 // sniff banner: the vulture's yes/no for this sense only (a later round must not repeat it), plus hunger
 const bn=$('banner');let bt='',bc='';
 const smashed=la&&la.type==='throw'&&la.result==='hit';
 if(smashed){bt='💥 Smash!';bc='yes';}
 else if(foodLead){bt=foodText;bc='hungry';}
 else if(BO.sniffAnnounce(S)){bt=BO.sniffAnnounce(S);bc=bt==='No egg nearby'?'no':'yes';}
 else if(S.phase==='play'&&blue&&S.ostrich&&S.ostrich[0]>=0&&!BO.foodRoute(C,S.ostrich,S.marks)&&S.hungerLeft<=2){bt=`Hungry! ${S.hungerLeft} left, no open path to a leaf`;bc='hungry';}
 if(prev&&S.phase==='play'&&(S.lastCold|0)>(prev.lastCold|0)&&!smashed){bt='An egg went cold.';bc='no';}
 if(prev&&blue&&S.hungerLeft>prev.hungerLeft){bt='Ate the leaf. Hunger restored.';bc='yes';}
 {const left=C.rounds-S.round+1;if(S.phase==='play'&&left<=3&&!bt){bt=left===1?'⏳ Last round!':`⏳ Final ${left} rounds!`;bc='final';}}
 if(bn){bn.textContent=bt;bn.className=bt?bc:'hidden';}
 $('warm').innerHTML='';
 const a=$('actions');let h='';a.innerHTML='';const CM=coachNow(),coach=!!CM;
 const btn=(id,lbl,on,click,dis)=>`<button class="${on&&!dis?'on':''}" ${dis?'disabled aria-disabled="true"':''} ${on?'aria-pressed="true"':''} onclick="${click}">${on&&!dis?'✓ ':''}${lbl}</button>`;
 if(S.phase==='setupEggs')h=blue?`Tap a glowing square to hide an egg (${S.h3&&S.h3.eggsToPlace!=null?S.h3.eggsToPlace:C.eggs-S.eggs.length} left). Not on rocks, or on or next to food.`:(S.h3&&S.h3.teamSetup==='ostrich'?'The ostriches are choosing where to start…':'The ostrich is hiding its eggs…');
 else if(S.phase==='setupOstrich')h=blue?'Tap a glowing square to place your ostrich.':(S.h3&&S.h3.teamSetup==='ostrich'?'The ostriches are choosing where to start…':'The ostrich is hiding its eggs…');
 else if(S.phase==='play'&&S.three&&(!S.myTurn||S.role==='hunter'))h=window.T3UI.hint(S,a);
 else if(S.phase==='play'&&!S.myTurn)h=blue?'Vulture\'s turn…':'Ostrich\'s turn…';
 else if(S.phase==='play'&&blue){
  a.innerHTML=btn('s','Step',M==='step',"UI.setMode('step')")+(S.onEgg?btn('c',M==='carry'?'Carry selected · tap a square':'+ Carry',M==='carry',"UI.setMode('carry')",M==='carry'||!S.can.carry)+btn('t',S.mustLeave?'Sit · step off first':`Sit · ${C.maxSit-S.sitRun} left`,false,"UI.act('sit')",!S.can.sit):'');
  h=S.mustLeave?`You sat ${C.maxSit} turns: step off (or + Carry).`:M==='carry'?'Carry selected. Tap a glowing square. This does not end your turn.':S.moves.length?(S.onEgg&&S.can&&(S.can.sit||S.can.carry)?'Tap a glowing square to move. + Carry selects a move and does not end the turn.':'Tap a glowing square to move.'):'';
 } else if(S.phase==='play'){
  a.innerHTML=btn('fl','Fly',M==='fly',"UI.setMode('fly')")+btn('th',S.stones<1?'Throw stone (none)':`Throw stone · ${S.stones}/${C.stones}`,M==='throw',"UI.setMode('throw')",S.stones<1);
  h=S.stones<1?'No stone. Land on a glowing rock pile to pick one up.':M==='throw'?'Tap a red-orange square to throw your stone.':S.stones>0?'Tap a glowing square to fly. Tap yourself to Throw.':'Tap a glowing square to fly there.';}
 a.className=S.phase==='play'&&S.myTurn?'mine':'';
 // ONE message per turn: the most important event wins
 let ev='';const myNew=newTurn&&S.myTurn;
 if(myNew&&la){
  if(blue&&la.type==='throw')ev=la.result==='bounce'?(la.egg?'Bounced! Egg under ostrich.':'Bounced! No egg.'):la.result==='hit'?'💥 An egg was smashed!':'The stone missed.';
  if(blue&&!ev&&la.spotted)ev='The vulture found an egg! Move it or sit on it.';
  if(!blue&&la.type==='fly'&&la.spotted)ev='You found an egg. Smash it: tap Throw stone, then your square.';
  if(S.lastCold&&!ev&&!smashed)ev=`❄️ An egg went cold.`;
 }
 if(smashed)ev='💥 Smash!';
 else if(!blue&&prev&&prev.turn==='red'&&la&&la.type==='throw'&&S.turn==='blue')ev=la.result==='bounce'?(la.egg?'Bounced! Egg under ostrich.':'Bounced! No egg.'):'Miss.';
 else if(!blue&&S.role==='red'&&S.phase==='play'&&!S.myTurn&&la&&la.type==='fly'){ // the vulture's own landing, shown while the ostrich takes its turn
  if(la.spotted&&S.stones<1)ev=NOSTONE_FOUND;else if(la.refill)ev='Picked up a stone.';}
 if(ev)h=ev+(h?' '+h:'');
 if(W&&W.txt&&!G)h=W.txt;
 if(G&&!(foodLead&&G.id==='hungry')&&M!=='carry')h=G.txt;
 if(!blue&&S.phase==='play'&&S.myTurn&&S.marks[key(S.vulture)]==='spotted'&&S.stones>0&&!smashed)h=M==='throw'?'Tap your own square to smash the egg.':'Smash it: tap Throw stone, then your square.';
 if(!blue&&S.role==='red'&&S.phase==='play'&&S.myTurn&&S.marks[key(S.vulture)]==='spotted'&&S.stones<1&&!smashed)h=NOSTONE_FOUND; // standing on a found egg with no stone: say why you can't smash it
 // just-in-time tips (once each)
 if(window.TUT&&S.phase==='play'){const T=TUT.tip;
  if(la&&la.type==='throw'&&la.result==='hit')T('hit','Red X = a smashed egg. Nobody can step there now.');
  if(la&&la.type==='throw'&&la.result==='miss')T('stone','Gray stone = a stone landed here. It stays all game, and the ostrich won\'t carry an egg onto it.');
  if(la&&la.spotted)T('spotted',blue?'The vulture landed on your egg and found it. Sit on it or carry it away.':'Big yellow egg = found. It stays found until the ostrich carries it away.');
  if(!blue&&S.myTurn&&la&&la.type==='fly')T('sniff',`After each landing you sniff: "Egg nearby!" means an egg is on your square or next to it, and the possible squares turn green.`);
  if(!blue&&S.myTurn&&M==='throw')T('throwtip','Red-orange = you can throw here. Green ? = an egg might be here. A stone at the ostrich just bounces off.');}
 if(window.TUT&&blue&&S.phase==='play'&&S.myTurn){const T=TUT.tip;
  if(S.round>1)T('warm','The ring on each egg drains as it cools. Stand on the egg to refill it.');
  if(S.hungerLeft<=C.food/2&&!foodLead)T('food',`Step on a green leaf within ${S.hungerLeft} turns or you starve.`);
  if(S.onEgg&&S.can.carry&&S.round>3)T('carry','Carry egg: move it 1 square to hide it again.');
  if(S.mustLeave)T('sitcap',`Max ${C.maxSit} sits in a row, then step off for a turn.`);}
 if(window.TUT&&S.phase==='play'&&S.round>2)TUT.tip('marks','Hover or tap a square to see what it is.');
 // render the coach mark
 document.querySelectorAll('.spot').forEach(e=>e.classList.remove('spot'));let ce=$('coach');if(!ce){ce=document.createElement('div');ce.id='coach';document.body.appendChild(ce);}
 document.body.classList.remove('coaching');ce.className='hidden';
 if(CM){let an=CM.at==='board'?null:[...a.querySelectorAll('button')].find(b=>(CM.at==='sit'?/Sit/:/Throw/).test(b.textContent));
  if(an&&!an.disabled){an.classList.add('spot','pulse');}if(CM.at==='board'||(an&&!an.disabled))h=CM.txt+(h&&CM.at!=='board'?' — or '+h.charAt(0).toLowerCase()+h.slice(1):'');}
 if(S.three)window.T3UI.after(S,prev,board);
 youTag(board);
 if(window.BORing)BORing.sync(S);
 if(S.role!=='hunter'){requestAnimationFrame(()=>window.FX&&FX.update(S,prev));window.SMASH&&SMASH.update(S,prev);}
 // make 'your turn' + what to do impossible to miss (Brian playtest: a player missed the instructions)
 const mt=S.phase==='play'&&S.myTurn&&!S.pass;$('hint').classList.toggle('myturn',!!mt);
 if(window.BORing&&S.phase==='play'&&S.myTurn){for(const note of BORing.omittedNotes(S)){const sit=/^sit/i.test(note),stone=/stone/i.test(note);if(sit&&!/step off|sit is used/i.test(h))h=(h?h+' ':'')+note;if(stone&&!/stone/i.test(h))h=(h?h+' ':'')+note;}}
 if(mt&&!/your turn/i.test(h)){const what=S.role==='red'?'Tap a glowing square to fly'+(S.stones>0?'. Tap yourself to Throw':''):S.role==='hunter'?'Tap a glowing square to move. Tap yourself to stay':'Tap a glowing square to step'+(S.onEgg&&S.can&&(S.can.sit||S.can.carry)?'. Tap your ostrich for Sit or Carry':'');h='YOUR TURN · '+(h&&!/turn…$/.test(h)?h:what);}
 $('hint').textContent=h;if(h&&(G||(W&&W.txt))){const sb=document.createElement('button');sb.className='skipguide';sb.id='skipGuide';sb.textContent='Skip guide';$('hint').appendChild(sb);tapper(sb,()=>{UI.guides(false)});}$('hint').classList.toggle('empty',!h);$('hint').classList.toggle('guide',!!G||!!(W&&W.txt));$('hint').classList.toggle('cold',!G&&!!(W&&W.txt));$('hint').classList.toggle('urgent',!G&&!!(W&&W.urgent));$('log').textContent=S.joined&&!S.opponent&&S.phase!=='over'?'Opponent offline… they can rejoin with the same link.':'';
 // cause before result (D36): stone into the count, carried egg slide, cold egg dims, badger sinks; each only on a screen that already held the facts (fx.js)
 if(window.CAUSE)CAUSE.run(S,prev,board,{stone:STONE,egg:MYEGG,ring:n=>warmRing(n,C.warmth)});
 const o=$('over');if(S.phase==='over'){hideTip();tipBar(null);$('rules').classList.add('hidden');$('walk').classList.add('hidden');const tut=document.getElementById('tut');if(tut)tut.classList.add('hidden');
  if(!overHold){overHold=Date.now()+1000;setTimeout(()=>{if(S&&S.phase==='over')render();},1000);}}
 else overHold=0;
 const keyEl=$('markkey');if(keyEl){const may=!!board.querySelector('.maybird'),legal=!!board.querySelector('.cell.legal');keyEl.hidden=!(may||(legal&&S.myTurn&&S.phase==='play'));keyEl.classList.toggle('hasmaybe',may);}
 if(S.phase==='over'&&overHold&&Date.now()<overHold)o.classList.add('hidden');
 else if(S.phase==='over'&&S.three){const pop=document.getElementById('snpop');if(pop)pop.remove();o.classList.remove('hidden');o.innerHTML=window.T3UI.over(S);}
 else if(S.phase==='over'){const pop=document.getElementById('snpop');if(pop)pop.remove();const won=S.winner===S.role;o.classList.remove('hidden');
  o.innerHTML=`<div class="lobbybox"><div class="bigost">${S.winner==='blue'?OST:VUL}</div><h1>${S.pass?(S.winner==='blue'?'Ostrich wins!':'Vulture wins!'):won?'You win!':'You lose'}</h1>${S.ai?`<p>vs computer (${S.ai})</p>`:''}<p>${S.winner==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`:S.winBy==='starved'?`The ostrich starved in round ${S.round}.`:S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:`The vulture smashed every egg by round ${S.round}.`}</p>${window.T3UI.endBits(S)}</div>`;}
 else o.classList.add('hidden');
}
})();
