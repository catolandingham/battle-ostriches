(function(){
const $=id=>document.getElementById(id);
const OST=ART.ostrich;
const VUL=ART.vulture;
$('lobbyArt').innerHTML=OST;
let ws,S=null,mode=null,me={};
// Seat token is saved in localStorage and a 6-hour first-party cookie. It is not put in the URL.
// A copied address bar is only /?room=CODE, so the link cannot reclaim someone else's seat.
const seatKey=c=>'bo_seat_'+String(c||'').toUpperCase();
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function cookieGet(n){const m=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(n+'='));if(!m)return '';try{return decodeURIComponent(m.slice(n.length+1))}catch(e){return m.slice(n.length+1)}}
function cookieSet(n,v,sec){const secure=location.protocol==='https:'?'; Secure':'';document.cookie=n+'='+encodeURIComponent(v)+'; Path=/; Max-Age='+sec+'; SameSite=Lax'+secure}
function cookieDel(n){document.cookie=n+'=; Path=/; Max-Age=0; SameSite=Lax'}
function stripSeatHash(){
  if(!/(?:^|#|&)m=/.test(location.hash||''))return;
  const room=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
  history.replaceState(null,'',room?'/?room='+room:(location.pathname+location.search));
}
function loadMe(){
  stripSeatHash();
  let stored={};try{stored=JSON.parse(lsGet('bo_me')||'{}')||{}}catch(e){stored={}}
  const roomQ=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
  const code=roomQ||String(stored.code||'').toUpperCase();
  let token='',role=stored.role;
  if(code&&lsGet(seatKey(code)))token=lsGet(seatKey(code));
  if(!token&&stored.code&&String(stored.code).toUpperCase()===code&&stored.token)token=stored.token;
  if(!token&&code){
    try{const ck=JSON.parse(cookieGet('bo_me')||'null');if(ck&&ck.code&&String(ck.code).toUpperCase()===code&&ck.token)token=ck.token;if(ck&&ck.role)role=role||ck.role}catch(e){}
    if(!token){const c2=cookieGet(seatKey(code));if(c2)token=c2}
  }
  return {code:code||stored.code,token,role};
}
function saveMe(next){
  me={code:String(next.code||'').toUpperCase(),token:next.token,role:next.role};
  lsSet('bo_me',JSON.stringify(me));
  if(me.code&&me.token){lsSet(seatKey(me.code),me.token);cookieSet('bo_me',JSON.stringify(me),6*3600);cookieSet(seatKey(me.code),me.token,6*3600)}
  if(me.code)history.replaceState(null,'','/?room='+me.code);
}
function clearMe(){
  if(me&&me.code){lsDel(seatKey(me.code));cookieDel(seatKey(me.code))}
  lsDel('bo_me');cookieDel('bo_me');me={};
}
me=loadMe();
function tokenFor(code){const c=String(code||'').trim().toUpperCase();if(!c)return;if(me.code&&String(me.code).toUpperCase()===c&&me.token)return me.token;const t=lsGet(seatKey(c));if(t)return t;try{const ck=JSON.parse(cookieGet('bo_me')||'null');if(ck&&ck.code&&String(ck.code).toUpperCase()===c&&ck.token)return ck.token}catch(e){}const c2=cookieGet(seatKey(c));if(c2)return c2;}
const key=p=>p[0]+','+p[1];
// Open-skies icon set: ONE big simple mark per square, no corner badges. Same in every theme (vocab.css).
window.addEventListener('DOMContentLoaded',()=>{const r=document.getElementById('roundsLeft');if(r)r.textContent='1 of '+(window.BO&&BO.CONFIG&&BO.CONFIG.rounds||30);});
// the server lost this game (restart/deploy with no saved copy): say so plainly instead of leaving a frozen board
function gameGone(){if(document.getElementById('gone'))return;pending=null;try{clearTimeout(pendTimer)}catch(e){}clearMe();
 const d=document.createElement('div');d.id='gone';d.innerHTML='<div class="gbox"><div class="gt">Game was reset</div><p>The server restarted and this game could not be restored.</p><button id="goneNew" class="big">Start a new game</button></div>';
 document.body.appendChild(d);document.getElementById('goneNew').onclick=()=>{location.href='/';};}
const LEAF='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32C8 14 20 6 34 6c0 16-8 28-26 26z" fill="#3fbf4a" stroke="#0d3d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 30L28 12" stroke="#0d3d14" stroke-width="2.5" stroke-linecap="round"/></svg>';
const ROCKS='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 33l4-10 9-3 6 5-2 8z" fill="#9aa1ab" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/><path d="M19 33l3-12 9-4 5 9-3 7z" fill="#7d858f" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 21l4-10 8 1 2 8-8 3z" fill="#b8bec6" stroke="#1d2128" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const STONE='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M7 27l5-13 13-4 9 9-4 12-17 2z" fill="#9aa1ab" stroke="#1d2128" stroke-width="3" stroke-linejoin="round"/></svg>';
const XMARK='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 9L31 31M31 9L9 31" stroke="#1a0000" stroke-width="11" stroke-linecap="round"/><path d="M9 9L31 31M31 9L9 31" stroke="#ff2a1f" stroke-width="7" stroke-linecap="round"/></svg>';
const EGG='<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 2C9.4 2 2 15.4 2 26C2 36 8.4 42 18 42C27.6 42 34 36 34 26C34 15.4 26.6 2 18 2Z" fill="#ffd21f" stroke="#3a2a00" stroke-width="3"/><ellipse cx="13" cy="14" rx="3" ry="5" fill="#fff6c0"/></svg>';
const MYEGG='<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 2C9.4 2 2 15.4 2 26C2 36 8.4 42 18 42C27.6 42 34 36 34 26C34 15.4 26.6 2 18 2Z" fill="#fffaf0" stroke="#2a2418" stroke-width="2.5"/></svg>';
const MAYBE='<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 2C9.4 2 2 15.4 2 26C2 36 8.4 42 18 42C27.6 42 34 36 34 26C34 15.4 26.6 2 18 2Z" fill="none" stroke="#111" stroke-width="6"/><path d="M18 2C9.4 2 2 15.4 2 26C2 36 8.4 42 18 42C27.6 42 34 36 34 26C34 15.4 26.6 2 18 2Z" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 3"/></svg>'; // a dashed egg outline: an egg may be here
let sniffSeen={},sniffUntil=0,overHold=0,kickPick=null; // kickPick: the animal chosen to kick (tap it again to kick)
const VOCAB={maybe:[MAYBE,'Egg may be here.'],legal:['','Move here.'],target:['','Throw here.'],stone:[STONE,'Wrecked. Can\'t land.'],food:[LEAF,'Food.'],
 rock:[ROCKS,'Rocks: get a stone.'],hit:[XMARK,'Smashed. Can\'t land.'],spot:[EGG,'Found egg.'],
 myegg:[MYEGG,'Your egg.'],me:['','You.'],vul:['','The vulture'],ost:['','The ostrich']};
const SHORT={stone:'Wrecked. Can\'t land.',hit:'Smashed. Can\'t land.',spot:'Found egg',food:'Food',rock:'Rocks: get a stone.',vul:'The vulture',ost:'The ostrich'};
// warmth ring: full red when just warmed -> orange -> pale -> icy blue as it cools (never purple)
const WSTOPS=[[0,[111,200,255]],[.34,[236,240,236]],[.67,[255,154,46]],[1,[232,56,47]]];
function warmCol(f){f=Math.max(0,Math.min(1,f));for(let i=1;i<WSTOPS.length;i++)if(f<=WSTOPS[i][0]){const[a,ca]=WSTOPS[i-1],[b,cb]=WSTOPS[i],t=(f-a)/(b-a);return'rgb('+ca.map((c,j)=>Math.round(c+(cb[j]-c)*t)).join(',')+')';}return'rgb(232,56,47)';}
function warmRing(n,W){const f=Math.max(0,n)/W,C=2*Math.PI*17,col=warmCol(f);
 return `<svg class="wring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="5"/><circle cx="20" cy="20" r="17" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/></svg><span class="wnum${n<=2?' low':''}" style="--wc:${col}">${n}</span>`;}
// just the countdown number (a small pill beside the egg in the square's corner; its edge takes the warmth colour)
function warmNum(n,W){const col=warmCol(Math.max(0,n)/W);return `<span class="wnum${n<=2?' low':''}" style="--wc:${col}">${n}</span>`;}
// "is here": the small egg in the corner, filled white (the same shape as the dashed "may be here" egg)
const eggIs=()=>window.T3UI?T3UI.markHTML('egg','is'):'';
// the same ring for the egg you stand on, drawn round the whole square; when the egg was warmed since the last view it visibly refills from where it was
function sqRing(n,W,was){const f=Math.max(0,Math.min(1,n/W)),col=warmCol(f),refill=was!=null&&n>was,f0=refill?Math.max(0,Math.min(1,was/W)):f;
 return `<svg class="wring sq${refill?' refill':''}" viewBox="0 0 40 40" preserveAspectRatio="none" aria-hidden="true" style="--f0:${(f0*100).toFixed(1)};--c0:${warmCol(f0)}"><rect x="2" y="2" width="36" height="36" rx="5" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="5"/><rect x="2" y="2" width="36" height="36" rx="5" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round" pathLength="100" stroke-dasharray="${(f*100).toFixed(1)} 100"/></svg><span class="wnum${n<=2?' low':''}" style="--wc:${col}">${n}</span>`;}
const icon=(t,cls)=>`<span class="ic ic-${t}${cls?' '+cls:''}" data-t="${t}">${t==='spot'?eggIs():VOCAB[t][0]}</span>`;
const C0=window.BO.CONFIG;
// an eye: standard symbol for "seen by others" (on the Sit button, since a sitting ostrich shows where it is)
const EYE='<svg class="eye" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="vertical-align:-3px;margin-right:4px"><path d="M1 12 C5 5 19 5 23 12 C19 19 5 19 1 12Z" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="#111"/></svg>';
const CARRYIC='<svg class="eye carryic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="vertical-align:-3px;margin-right:4px"><path d="M12 1.5C9.6 1.5 7.6 6.2 7.6 9.4C7.6 12.2 9.5 14 12 14C14.5 14 16.4 12.2 16.4 9.4C16.4 6.2 14.4 1.5 12 1.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M3 15.5Q12 24 21 15.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'; // Carry: an egg lifted on a curve
['eggs','warm','sit','fly','rounds','smell','food','stones','walk','carry','kick','kickb','push'].forEach(k=>document.querySelectorAll('.c-'+k).forEach(e=>e.textContent={push:C0.pushHunters,eggs:C0.eggs,warm:C0.warmth,fly:C0.vultureFly,rounds:C0.rounds,smell:C0.smellRange,food:C0.food,stones:C0.stones,walk:C0.ostrichWalk,carry:C0.carryWalk,kick:C0.kickPush,kickb:C0.kickPushBadger}[k]));
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
  if(m.t==='joined'){pending=null;clearTimeout(pendTimer);attempts=0;status('');sniffSeen={};saveMe({code:m.code,token:m.token,role:m.role});return;}
  if(m.t==='state'&&m.lobby){if(S&&S.phase&&S.phase!=='over')return;pending=null;clearTimeout(pendTimer);attempts=0;status('');S=null;const ask=$('rejoinAsk');if(ask)ask.classList.add('hidden');window.LobbyUI&&LobbyUI.show(m.state);return;}
  else if(m.t==='state'&&m.pass)return passState(m);
  else if(m.t==='state'){window.LobbyUI&&LobbyUI.hide();if(window.CUTAWAYS&&CUTAWAYS.defer(m.state))return;acceptState(m.state);return;}
  else if(m.t==='error'&&/No game with that code/.test(m.msg)&&(S||m.gone)){gameGone();return;}
  else if(m.t==='error'){actLock=false;if(!S){pending=null;clearTimeout(pendTimer);attempts=0;status(m.msg,true);window.LobbyUI&&LobbyUI.fail&&LobbyUI.fail();}else $('log').textContent=m.msg;}};
}
function acceptState(state){actLock=false;const prev=S;S=state;if(!prev||prev.turn!==S.turn||prev.phase!==S.phase)mode=null;render(prev);sounds(prev);if(!prev)maybeWalk(S.role);}
// A cartoon holds the board on its snapshot, and the board still gets only the newest held state when the cartoon ends.
// The turn line and the shot clock sit above that picture, so they follow every state the moment it arrives.
// While the board is held there are no move buttons: TURNLINE.holdTurn cuts a turn-plus-instruction line down to its turn part.
const holdTurn=l=>window.TURNLINE?TURNLINE.holdTurn(l):l;
function heldLine(st){
 if(!st||st.phase!=='play'||st.pass)return null;
 const a=document.createElement('div');
 if(st.three&&(!st.myTurn||st.role==='hunter'))return holdTurn(window.T3UI.hint(st,a));
 if(!st.myTurn)return st.role==='blue'?'Vulture\'s turn…':'Ostrich\'s turn…';
 return holdTurn(st.role==='blue'?'Your turn. Tap to move.':st.stones<1?'No stone. Go to rocks.':'Your turn. Tap to fly.');
}
function paintHeld(st){
 const line=heldLine(st);if(line==null||!window.TURNLINE)return;
 const own=!!st.myTurn,shown=TURNLINE.live.show(line),hint=$('hint');
 if(hint){if(hint.firstChild&&hint.firstChild.nodeType===3)hint.firstChild.nodeValue=shown;else hint.insertBefore(document.createTextNode(shown),hint.firstChild);hint.classList.toggle('myturn',own);hint.classList.toggle('empty',!shown);}
 if(window.T3UI&&T3UI.clock)T3UI.clock(st,{held:true});
}
if(window.CUTAWAYS){CUTAWAYS.bind(acceptState);CUTAWAYS.note=paintHeld;}
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
window.addEventListener('pageshow',ev=>{if(ev.persisted&&inRoom()&&(!ws||ws.readyState>1)){attempts=0;connect();}});
let fitAt=0;function fitPhone(){const now=Date.now();if(now-fitAt<250)return;fitAt=now;const vv=window.visualViewport,h=Math.round(vv?vv.height:innerHeight)+'px',top=Math.round(Math.max(0,vv?vv.offsetTop:0))+'px',root=document.documentElement;root.style.setProperty('--vvh',h);root.style.setProperty('--vvo',top);}
fitPhone();if(window.visualViewport)visualViewport.addEventListener('resize',fitPhone);window.addEventListener('resize',fitPhone);
let actLock=false; // one action tap is in flight; further taps wait for the next state
const TURN_ACT=a=>a==='place'||a==='step'||a==='carry'||a==='sit'||a==='fly'||a==='throw'||a==='kick'||a==='hmove'||a==='hstay'||a==='hburst'||a==='hide';
const send=o=>{try{tipBar(null)}catch(e){}
 if(o&&o.t==='act'&&TURN_ACT(o.a)){
  if(actLock)return false;
  if(S&&S.stamp)o.stamp={round:S.stamp.round,turn:S.stamp.turn,bonus:!!S.stamp.bonus,sense:S.stamp.sense,seq:S.stamp.seq};
  if(!(ws&&ws.readyState===1))return false;
  actLock=true;}
 if(o&&o.t==='act'&&window.CUTAWAYS&&CUTAWAYS.busy&&CUTAWAYS.busy())CUTAWAYS.dismiss();
 return ws&&ws.readyState===1&&ws.send(JSON.stringify(o));};
function wantSimple(){try{return new URLSearchParams(location.search).get('simple')==='1';}catch(e){return false;}}
function open(msg){if(msg&&wantSimple())msg.simple=true;pending=msg;attempts=0;if(ws&&ws.readyState===1)sendPending();else connect();}
function tapper(el,fn){if(!el)return;let t=0;el.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();fn();},{passive:false});el.addEventListener('click',()=>{if(Date.now()-t>600)fn();});}
function home(){$('homeStep').classList.remove('hidden');$('joinStep').classList.add('hidden');$('passStep').classList.add('hidden');$('soloStep').classList.add('hidden');$('roomLobby').classList.add('hidden');status('');}
let soloN=2;const soloHint=()=>{const t={1:'You + 1 computer → Ostrich and Vulture',2:'You + 2 computers → Hunter',3:'You + 3 computers → choose 2 vs 2 or Hunters',4:'You + 4 computers → 2 vs 2 + hunter'};$('soloHint').textContent=t[soloN];};
tapper($('playFriend'),()=>open({t:'create',friends:1}));
tapper($('playSolo'),()=>{home();$('homeStep').classList.add('hidden');$('soloStep').classList.remove('hidden');soloHint();});
tapper($('playJoin'),()=>{home();$('homeStep').classList.add('hidden');$('joinStep').classList.remove('hidden');$('codeIn').focus();});
tapper($('joinBack'),home);tapper($('soloBack'),home);tapper($('passBack'),home);
tapper($('playPass'),()=>{home();$('homeStep').classList.add('hidden');$('passStep').classList.remove('hidden');});
tapper($('passGo'),()=>open({t:'create',pass:true}));
tapper($('soloGo'),()=>open({t:'create',solo:1,bots:soloN}));
$('botPick').addEventListener('click',e=>{const b=e.target.closest('[data-bots]');if(!b)return;soloN=+b.dataset.bots;[...$('botPick').children].forEach(x=>x.classList.toggle('on',x===b));soloHint();});
tapper($('homeGear'),()=>{const m=$('homeMenu'),closed=m.classList.toggle('hidden');$('homeGear').setAttribute('aria-expanded',String(!closed));});
// --- pass & play: one phone, both sides. Only the side holding the phone is ever rendered; an opaque cover sits between turns ---
const NAME={blue:'Ostrich',red:'Vulture'};let PV=null,holder=null,lastBy={},locked=false,hT=null;
function showCover(r,first){const h=$('handoff');h.className=r;$('hArt').innerHTML=r==='blue'?OST:VUL;
 $('hTitle').textContent=`Pass to the ${NAME[r]}`;
 $('hSub').textContent=first?`The ${NAME[r]} goes first and hides the eggs. ${NAME[r==='blue'?'red':'blue']}, look away!`:`${NAME[r==='blue'?'red':'blue']}, hand over the phone. No peeking!`;
 $('hGo').textContent=`I'm the ${NAME[r]} — tap to start`;
 $('board').innerHTML='';$('actions').innerHTML='';$('hint').textContent='';
 const bn=$('banner');if(bn){bn.textContent='';bn.className='hidden';}if(window.BO_BANNER)BO_BANNER.reset();}
function showView(r,v){actLock=false;holder=r;const prev=lastBy[r]||null;const pr=S;S=v;mode=null;if(!pr)$('lobby').classList.add('hidden');render(prev);sounds(prev);if(!lastBy[r])maybeWalk(r);lastBy[r]=v;}
function passState(m){PV=m;const next=m.active,over=m.views.blue.phase==='over';
 if(over||holder===next||(holder&&locked)){if(over){clearTimeout(hT);$('handoff').className='hidden';locked=false;}if(!locked||over)return showView(over?'blue':next,m.views[over?'blue':next]);return;}
 if(!holder){locked=true;showCover(next,m.views.blue.phase==='setupEggs');$('lobby').classList.add('hidden');return;}
 // let the player who just moved see their own result (fly / throw / smash), then cover
 clearTimeout(hT);showView(holder,m.views[holder]);locked=true;hT=setTimeout(()=>showCover(next),1400);}
tapper($('hGo'),()=>{if(!PV)return;$('handoff').className='hidden';locked=false;const r=PV.active;showView(r,PV.views[r]);});
tapper($('joinBtn'),()=>open({t:'join',code:$('codeIn').value.trim(),token:tokenFor($('codeIn').value)}));
$('seatPick').addEventListener('click',e=>{const b=e.target.closest('button[data-seat]');if(b&&!b.classList.contains('on'))send({t:'seat',role:b.dataset.seat});});
tapper($('inviteBtn'),()=>{sheetOpen=!sheetOpen;render();});tapper($('waitClose'),()=>{sheetOpen=false;render();});
// invite popover closes on any tap outside it (or its chip)
const outside=e=>{if(sheetOpen&&!e.target.closest('#wait,#inviteBtn')){sheetOpen=false;render();}};
document.addEventListener('touchstart',outside,{passive:true,capture:true});document.addEventListener('mousedown',outside,true);tapper($('howBtn'),()=>UI.rules());tapper($('helpBtn'),()=>UI.rules());
let gameMenu=false;
function syncMenu(){const s=$('menuSound');if(s)s.textContent=SFX.muted?'Sound off':'Sound on';const t=$('menuTimer'),b=$('timerToggle');if(t&&b)t.textContent=b.getAttribute('aria-pressed')==='false'?'Timer off':'Timer on';}
function closeGameMenu(){gameMenu=false;const m=$('gameMenu');if(m)m.classList.add('hidden');const b=$('moreBtn');if(b)b.setAttribute('aria-expanded','false');}
tapper($('moreBtn'),()=>{gameMenu=!gameMenu;const m=$('gameMenu');if(m)m.classList.toggle('hidden',!gameMenu);$('moreBtn').setAttribute('aria-expanded',String(gameMenu));if(gameMenu)syncMenu();});
tapper($('menuHelp'),()=>{closeGameMenu();UI.rules();});
tapper($('menuRules'),()=>{closeGameMenu();const c=cardFor(S);if(!c){UI.rules();return;}showCard(Object.assign({},c,{title:'Rules for this game',mode:c.title}),false,true);});
tapper($('menuSound'),()=>{SFX.toggle();syncMenu();});
tapper($('menuTheme'),()=>{if(window.THEME)THEME.next();});
tapper($('menuTimer'),()=>{const b=$('timerToggle');if(b)b.click();syncMenu();});
tapper($('menuLeave'),()=>{closeGameMenu();if(!S||S.phase==='over')return;const friends=!(S.pass||S.ai);$('leaveTitle').textContent='Leave this game?';$('leaveBody').textContent=friends?'This ends the game for everyone.':"You'll go back to the start.";$('leaveAsk').classList.remove('hidden');});
tapper($('leaveNo'),()=>$('leaveAsk').classList.add('hidden'));
tapper($('leaveYes'),()=>{$('leaveAsk').classList.add('hidden');send({t:'act',a:'leave'});setTimeout(()=>UI.menu(),150);});
tapper($('rejoinAskYes'),()=>{const el=$('rejoinAsk');if(!el||el.classList.contains('hidden'))return;send({t:'claim-answer',seat:el.dataset.seat,id:el.dataset.id,yes:true});});
tapper($('rejoinAskNo'),()=>{const el=$('rejoinAsk');if(!el||el.classList.contains('hidden'))return;send({t:'claim-answer',seat:el.dataset.seat,id:el.dataset.id,yes:false});});
document.addEventListener('mousedown',e=>{if(gameMenu&&!e.target.closest('#gameMenu,#moreBtn'))closeGameMenu();},true);
function muteLabel(){if(window.SFX)SFX.paint();}
muteLabel();tapper($('muteBtn'),()=>{SFX.toggle();});tapper($('muteBtn2'),()=>{SFX.toggle();});tapper($('soundBtn'),()=>{SFX.toggle();});
// The throw just made pushed an animal (its stone note is new this update, or the action carries the push line): that is a hit on the animal, not a miss.
function stoneHitAnimal(S,prev,la){if(!la||la.type!=='throw'||la.result==='hit'||la.result==='bounce')return false;if(la.line)return true;const n=S&&S.stoneNote;return !!(n&&(n.targets||[]).length&&(!prev||!prev.stoneNote||prev.stoneNote.seq!==n.seq));}
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
if(window.TUT)TUT.arm=true;
if(roomQ){$('codeIn').value=roomQ;open({t:'join',code:roomQ,token:tokenFor(roomQ)});}
$('shareBtn').onclick=()=>{const u=$('shareLink').value;if(navigator.share)navigator.share({title:'Battle Ostriches',text:'Play Battle Ostriches with me! Code '+S.code,url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u);$('shareBtn').textContent='Copied!';}};
// --- walkthrough (same chips as the board) ---
const WALK={}; // the walkthrough cards are gone: the role card and the first-use tips teach the rest
let wi=0,wr='blue',wDone=null;
function maybeWalk(r){if(S&&S.simple)return;if(!WALK[r]||localStorage.getItem('bo_walk_'+r))return;walk(r);}
function walk(role,done){wr=(role&&WALK[role]&&role)||(S&&WALK[S.role]&&S.role)||'blue';if(!WALK[wr])return;wi=0;wDone=done||null;drawWalk();$('walk').classList.remove('hidden');}
function closeWalk(){$('walk').classList.add('hidden');localStorage.setItem('bo_walk_'+wr,'1');const d=wDone;wDone=null;d&&d();maybeCard();}
function drawWalk(){const st=WALK[wr],cur=st[wi],W=$('walk');
 W.innerHTML=`<div class="wcard"><div class="wart"><span style="width:56px;height:56px;display:inline-block">${wr==='red'?VUL:OST}</span><span style="font-size:44px">${cur[0]}</span></div><h2>${cur[1]}</h2><p id="wText">${cur[2]}</p><div class="wdots">${st.map((_,k)=>`<span class="${k===wi?'on':''}"></span>`).join('')}</div><div class="wnav"><button id="wSkip">Skip</button><button id="wNext">${wi===st.length-1?"Let's play":'Next'}</button></div></div>`;
 tapper($('wSkip'),closeWalk);tapper($('wNext'),()=>{if(wi<st.length-1){wi++;drawWalk();}else closeWalk();});}
// --- role card: one card per animal per phone, shown at the first play state for that seat (words in roles.js) ---
let cardOpen=null;
const cardSeen=id=>{try{return localStorage.getItem('bo_card_'+id)||localStorage.getItem('bo_card_off')}catch(e){return 1}};
// How to play: the first line of each mode's rules says who hunts what (roles.js huntLine), naming the hunter once the game knows it
function rulesNow(){if(S&&S.rules)return S.rules;const L=window.LobbyUI&&LobbyUI.get&&LobbyUI.get();return (L&&L.rules)||null;}
// How to play's "your N eggs" uses the eggs each ostrich hides in this mode (2 in 2 vs 2 and 5 players, 3 otherwise).
function paintEggs(m){const n=window.Roles&&Roles.eggsFor?Roles.eggsFor(m,rulesNow()):null;const v=n!=null?n:(m==='4'||m==='5'?null:C0.eggs);if(v==null)return;document.querySelectorAll('.c-eggs').forEach(e=>e.textContent=v);}
function knownMode(){if(S)return cardMode(S);const box=$('roomLobby'),home=$('lobby');const inLobby=box&&home&&!box.classList.contains('hidden')&&!home.classList.contains('hidden');const L=inLobby&&window.LobbyUI&&LobbyUI.get&&LobbyUI.get();if(L&&(L.setup||L.preview))return String(L.setup||L.preview);const shown=document.querySelector('.mrules:not(.hidden)');return shown?shown.dataset.m:null;}
function fillHuntLines(){document.querySelectorAll('[data-ic]').forEach(e=>{e.innerHTML={ROCKS,LEAF,EGG}[e.dataset.ic]||'';});document.querySelectorAll('[data-cm]').forEach(e=>{e.innerHTML='';if(window.T3UI)T3UI.mark(e,e.dataset.cm,e.dataset.cmcls||'');});const R=S&&S.rules;if(R){document.querySelectorAll('[data-r]').forEach(e=>{const v=e.dataset.r.split('.').reduce((o,k)=>o&&o[k],R);if(v!=null&&typeof v!=='object')e.textContent=v;});
 const m=R.modes||{},goal=(g,mode,hy)=>{g=g||{kind:'all',n:0};if(mode==='5')return g.kind==='first'?'knock out an ostrich and a vulture.':'knock out every bird.';return g.kind==='catches'?'make '+g.n+' catches. A bird is out after 2 catches.':g.kind==='first'?'knock out one bird.':'knock out both birds.';};
 const a=document.querySelector('.hgoal3'),b=document.querySelector('.hgoal5');if(a&&m['3'])a.textContent=goal(m['3'].goal,'3');if(b&&m['5'])b.textContent=goal(m['5'].goal,'5');}const k=S&&(S.role==='hunter'?(S.kind||(S.h3&&S.h3.kind)):(S.h3&&S.h3.kind));document.querySelectorAll('.mrules').forEach(e=>{const l=e.querySelector('.huntline');if(l&&window.Roles)l.textContent=Roles.huntLine(e.dataset.m,k);});}
function cardMode(s){return !s.three?'2':s.h3&&s.h3.team?String(s.h3.n):s.h3&&s.h3.hunt?'4h':'3';}
function cardFor(s){if(!s||!window.Roles||!s.rules)return null;const h=s.h3||{};
 return Roles.roleCard(h.mySeat||s.role,s.role==='hunter'?(s.kind||h.kind):h.kind,cardMode(s),s.rules);}
function cardArt(k){return k==='ostrich'?OST:k==='vulture'?VUL:window.T3UI&&T3UI.KIND[k]?T3UI.KIND[k].art:'';}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function mySeat(){return (S&&S.h3&&S.h3.mySeat)||(S&&S.role)||null;}
let rulesOpen=false;
function showCard(c,picked,again){const el=$('rolecard');if(!el||!c)return;cardOpen={id:c.id,again:!!again};
 const lines=c.lines&&c.lines.length?c.lines:[c.goal,...(c.moves||[])].filter(Boolean);
 el.innerHTML=`<div class="rc" data-animal="${esc(c.animal||'')}"><div class="rtop"><span class="rpic">${cardArt(c.picture)}</span><h2>${esc(c.mode||'')}</h2></div><p class="rwho">${esc(c.title)}</p>${picked?`<p class="rpicked">${esc(Roles.PICKED)}</p>`:''}<ul class="rmoves">${lines.map(m=>`<li>${esc(m)}</li>`).join('')}</ul><button type="button" class="rok">Got it</button></div>`;
 el.classList.remove('hidden');
 send({t:'card-hold',seat:mySeat()});}
function closeCard(){const el=$('rolecard');if(!el||!cardOpen)return;el.classList.add('hidden');
 if(!cardOpen.again)try{localStorage.setItem('bo_card_'+cardOpen.id,'1')}catch(e){}
 const seat=mySeat();cardOpen=null;if(!rulesOpen)send({t:'card-done',seat});if(S)render();}
function maybeCard(){if(S&&S.simple)return;if(cardOpen||!S||S.god||S.phase==='over')return;
 const setup=S.phase==='play'||S.phase==='setup'||S.phase==='setupEggs'||S.phase==='setupOstrich';if(!setup)return;const h=S.h3;
 if(h&&(h.ready===false||h.needKind))return;
 if(h&&h.birds&&h.birds[h.mySeat||S.role]&&h.birds[h.mySeat||S.role].out)return;
 const walk=$('walk'),tut=document.getElementById('tut');if(!walk.classList.contains('hidden')||(tut&&!tut.classList.contains('hidden')))return;
 const c=cardFor(S);if(!c||cardSeen(c.id))return;showCard(c,S.picked,false);}
tapper($('rolecard'),closeCard);
function simpleNow(){if(S&&S.simple)return true;if(S&&S.phase&&!S.lobby&&!S.simple)return false;return wantSimple();}
const SIMPLE_PAGE=[['Goal','Ostriches win if any egg is still alive after round 30.','Vultures win when every egg is broken or cold.','A hunter wins when it knocks out 2 birds. With two hunters, the one with more knock outs wins.'],['Each round','Vultures go first, then ostriches, then hunters. In 2 vs 2 the turns go Vulture 1, Ostrich 1, Vulture 2, Ostrich 2.'],['Setup','Each ostrich hides its eggs: 3 when alone, 2 each in a team. Eggs never go on a rock pile, or on or next to a leaf.'],['Seeing','Everyone sees every animal.','Eggs stay hidden from the other side until a vulture finds them.'],['Moving','Every animal moves up to 2 squares in any direction. You can pass over anything.','You can\'t land on a wrecked square or on another animal. A hunter can land on a bird: that is a catch.'],['Camouflage','Every animal can hide 2 times a game. Hiding lasts 2 rounds. Your own team still sees you.','If you try to land where a hidden animal is, you stay where you were and it is seen again. A hunter landing on a hidden bird still catches it.'],['Ostrich','Stand or sit on each egg at least once every 15 rounds or it goes cold.','Land on a leaf, or stay on one, at least once every 15 turns or you starve and are out.','Kick: instead of moving, push an animal next to you 3 squares straight away. It stops early at the edge, a wrecked square, or another animal.'],['Vulture','Land on an egg to find it. A found egg is shown to everyone.','Hold 1 stone. Land on a rock pile to get another.','Throw at your square or one next to it. A stone breaks an egg there, wrecks the square, and pushes any animal there 2 squares away. A leaf or rock pile never gets wrecked.','A stone thrown at an ostrich is kicked back onto your own square.','If a stone lands on your own square, you hop to the nearest open square.'],['Hunters','A hyena and a badger play the same way.','A caught bird is set down 3 squares away. The second catch knocks it out.','When two hunters would land on each other, the mover stays where it was.'],['Teams','Ostriches on a team can warm each other\'s eggs.','Never throw a stone at your teammate\'s square or kick your teammate.','Your team stays in while one of your birds is in.']];
function paintSimpleRules(on){const card=document.querySelector('#rules .card');if(!card)return;let box=document.getElementById('simpleRules');const kids=[...card.children].filter(e=>e.id!=='simpleRules');if(!on){if(box)box.remove();kids.forEach(e=>e.classList.remove('simple-hold'));return;}kids.forEach(e=>{if(e.tagName==='H2')return;if(e.tagName==='BUTTON'&&/Got it/.test(e.textContent))return;e.classList.add('simple-hold');});if(!box){box=document.createElement('div');box.id='simpleRules';box.innerHTML=SIMPLE_PAGE.map(s=>'<h3>'+s[0]+'</h3>'+s.slice(1).map(p=>'<p>'+p+'</p>').join('')).join('');const h2=card.querySelector('h2');if(h2)h2.after(box);else card.prepend(box);}box.classList.remove('simple-hold');}
window.UI={card(){if(S&&S.simple){UI.rules();return;}showCard(cardFor(S),S&&S.picked,true);},walk(){if(S&&S.simple)return;walk();},paintEggs(m){paintEggs(m);},rules(){const simple=simpleNow();paintSimpleRules(simple);if(simple){$('rules').classList.remove('hidden');$('rules').scrollTop=0;const rb=$('roleCardBtn');if(rb)rb.classList.add('hidden');const b=document.getElementById('guideToggle');if(b){const on=!localStorage.getItem('bo_hs_off');b.textContent=on?'Ostrich guides: ON (tap to turn off)':'Ostrich guides: OFF (tap to turn on)';}if(!rulesOpen){rulesOpen=true;send({t:'card-hold',seat:mySeat()});}return;}const m=knownMode()||'2';if(document.querySelector('.mrules:not(.hidden)')&&window.T3UI&&T3UI.rulesMode)T3UI.rulesMode(m);else paintEggs(m);fillHuntLines();$('rules').classList.remove('hidden');$('rules').scrollTop=0;howPics();const rb=$('roleCardBtn');if(rb)rb.classList.toggle('hidden',!cardFor(S));const b=document.getElementById('guideToggle');if(b){const on=!localStorage.getItem('bo_hs_off');b.textContent=on?'Ostrich guides: ON (tap to turn off)':'Ostrich guides: OFF (tap to turn on)';}if(!rulesOpen){rulesOpen=true;send({t:'card-hold',seat:mySeat()});}},closeRules(){$('rules').classList.add('hidden');if(!rulesOpen)return;rulesOpen=false;if(!cardOpen)send({t:'card-done',seat:mySeat()});},
 setMode(m){if(locked||!S||!S.myTurn||inHold())return;kickPick=null;mode=m;if(m==='throw')coachDid('throw');render();},
 kick(){if(locked||!S||!S.myTurn||S.role!=='blue'||inHold())return;if(curMode()==='carry')return nope('Not while carrying.');
  if(!(S.can&&S.can.kick))return nope('Nothing to kick.');
  kickPick=null;mode='kick';render();}, // like Throw: Kick selects the mode, then a tap on the glowing animal kicks it
 act(a){if(a==='kick')return UI.kick();if(actLock||locked||!S||!S.myTurn||inHold())return;if(a==='sit'&&!(S.can&&S.can.sit))return nope('Not there.');coachDid(a);if(a==='sit'&&G&&G.id==='start')gSet('start','1');send({t:'act',a})},guides(on){if(on)localStorage.removeItem('bo_hs_off');else localStorage.setItem('bo_hs_off','1');const b=document.getElementById('guideToggle');if(b)b.textContent=on?'Ostrich guides: ON (tap to turn off)':'Ostrich guides: OFF (tap to turn on)';if(S)render();},replayCoach(){Object.keys(localStorage).filter(k=>k.startsWith('bo_g_')).forEach(k=>localStorage.removeItem(k));['blue','red'].forEach(r=>localStorage.removeItem('bo_cs_'+r));localStorage.removeItem('bo_tips_off');Object.keys(localStorage).filter(k=>k.startsWith('bo_tip_')).forEach(k=>localStorage.removeItem(k));if(S)render();},rematch(how){holder=null;lastBy={};sniffSeen={};send({t:'act',a:'rematch',how:how||'same'})},
 _rr(){if(S)render();},_mode:()=>curMode(),open(m){open(m);},pause(ms){sniffUntil=Math.max(sniffUntil,Date.now()+ms);},send(o){send(o);},_tip:t=>tipBar(t),_S:()=>S,_legal:()=>legalNow(),_locked:()=>locked,menu(){S=null;clearMe();location.href='/';}};
// --- learn-by-playing coach marks: one hint, anchored, everything else dimmed; advances when the player does it ---
const COACH={blue:[
  {when:S=>S.myTurn&&S.moves.length,txt:'Tap to move.',at:'board',done:'step'},
  {when:S=>S.myTurn&&S.can.sit,txt:'Sit to warm this egg.',at:'sit',done:'sit'}],
 red:[{when:S=>S.myTurn,txt:'Tap to fly.',at:'board',done:'fly'},
  {when:S=>S.myTurn&&S.throw&&S.throw.length,txt:'Tap Throw to aim.',at:'throw',done:'throw'}]};
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
// tips use the one message slot above the board (never a bar that pushes the board down); each shows about 5 seconds, once
function tipBar(t){const b=$('tipbar');clearTimeout(tipBar.t);if(!t){b.classList.add('hidden');b.textContent='';return;}b.textContent=t;b.classList.remove('hidden');tipBar.t=setTimeout(()=>tipBar(null),5000);}
function nope(msg,tp){const h=$('hint');h.textContent=msg;h.classList.remove('empty');h.classList.remove('nudge');void h.offsetWidth;h.classList.add('nudge');flashRight(tp);}
// after a wrong tap or a miss, the right option(s) pulse for a moment: the next-step squares, otherwise the legal squares nearest the tap
function flashRight(tp){if(!S||S.phase==='over'||!(S.myTurn||S.role==='red'))return;const board=$('board'),C=S.cfg;let keys=[];
 const ns=window.NextStep?NextStep.compute(Object.assign({},S,{myTurn:true})):{targets:[]};
 if(ns.targets&&ns.targets.length&&S.phase==='play')keys=ns.targets;
 else if(S.myTurn){const L=legalNow().slice(),ref=tp||(S.ostrich&&S.ostrich[0]>=0?S.ostrich:S.vulture&&S.vulture[0]>=0?S.vulture:null);
  if(ref){L.sort((a,b)=>gd(a,ref)-gd(b,ref)||(a[0]-b[0]));keys=L.slice(0,3).map(key);}}
 keys.forEach(k=>{const [x,y]=k.split(',').map(Number),c=board.children[y*C.cols+x];if(c&&c.classList){c.classList.remove('fix');void c.offsetWidth;c.classList.add('fix');setTimeout(()=>c.classList&&c.classList.remove('fix'),1700);}});}
const isF=(C,k)=>C.foods.some(q=>key(q)===k),isR=(C,k)=>C.rocks.some(q=>key(q)===k);
const nearF=(C,p)=>C.foods.some(q=>Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]))<=1);
function legalNow(){if(!S)return[];const blue=S.role==='blue',M=curMode(),C=S.cfg;
 if(blue&&S.phase==='setupEggs'){const eg=new Set((S.eggs||[]).map(e=>key(e.pos)));const r=[];for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y;if(!eg.has(k)&&k!==key(S.vulture)&&!(S.h3&&S.h3.block||[]).some(q=>key(q)===k)&&!isR(C,k)&&!nearF(C,[x,y]))r.push([x,y]);}return r;}
 if(blue&&S.phase==='setupOstrich'){const blocked=new Set();if(S.h3){(S.h3.block||[]).forEach(q=>blocked.add(key(q)));(S.h3.pieces||[]).forEach(q=>{if(q.p&&q.p[0]>=0)blocked.add(key(q.p));});}const r=[];for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y;if(!blocked.has(k))r.push([x,y]);}return r;}
 if(!S.myTurn)return[];if(S.role==='hunter')return S.hmoves||[];if(blue&&M==='kick')return (S.kickPlans||[]).map(p=>p.to);return blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly);}
// The banner is drawn again on every state. A line in it stays up long enough to read (1s, or 0.3s a word when longer, the same rule as the status queue)
// before a different line, or none, replaces it. Redrawing the same line keeps its clock.
const BO_BANNER=(()=>{let shown='',at=0,want=null,timer=null;
 const need=t=>{const w=(String(t).trim().match(/\S+/g)||[]).length;return Math.max(1000,w*300);};
 function busy(){return !!document.querySelector('#msgslot .status-active, #badgerline');}
 function paint(t,c){const bn=document.getElementById('banner');if(!bn)return;if(bn.textContent!==t)bn.textContent=t;bn.className=t?c:'hidden';if(t&&busy())bn.classList.add('held');if(t!==shown){shown=t;at=Date.now();}}
 function set(t,c){want={t,c};const bn=document.getElementById('banner');if(!bn)return;
  if(t===shown){clearTimeout(timer);timer=null;paint(t,c);return;}
  const left=shown?need(shown)-(Date.now()-at):0;
  if(left>0&&bn.textContent===shown&&!bn.classList.contains('hidden')){clearTimeout(timer);timer=setTimeout(()=>{timer=null;if(want)paint(want.t,want.c);},left);return;}
  clearTimeout(timer);timer=null;paint(t,c);}
 return {set,reset(){clearTimeout(timer);timer=null;shown='';at=0;want=null;},current:()=>shown};})();
window.BO_BANNER=BO_BANNER;
// Food counter rise, and the private "you ate" sign. The header is rebuilt on every paint, so the rise
// keeps its own clock and writes the digit that is actually on screen, never the finished number early.
const ateBadge={};
let ateLine=null;
const hungerPlayer=window.ATE.createPlayer({
 element:()=>document.getElementById('hungerLeft'),
 onShow(n,rising){
  if(n==null){document.documentElement.classList.remove('hunger-rise');return;}
  const node=document.getElementById('hungerLeft'),chip=node&&node.closest('.hh');
  if(chip)chip.classList.toggle('low',n<=3);
  const bar=chip&&chip.querySelector('.hbar i'),food=S&&S.cfg&&S.cfg.food;
  if(bar&&food)bar.style.width=Math.max(0,Math.min(100,100*n/food))+'%';
  document.documentElement.classList.toggle('hunger-rise',!!rising);
 }
});
function ateSeat(){return window.ATE?ATE.seatOf(S):'';}
function ateShowing(){return !!(window.ATE&&ateLine&&Date.now()<ateLine.until&&ateSeat()===ateLine.seat&&ATE.isOstrich(S));}
function ateBadgeOn(prev){
 if(!window.ATE)return false;
 const seat=ateSeat(),on=ATE.badgeOn(!!ateBadge[seat],prev,S);
 if(ATE.isOstrich(S))ateBadge[seat]=on;
 return on;
}
function hungerDigit(now,was){
 const st=hungerPlayer.state();
 if(was!=null&&now>was)return st.shown!=null&&st.shown>=was&&st.shown<now?st.shown:was;
 if(st.rising&&st.shown!=null&&st.shown<now)return st.shown;
 return now;
}
// While a cartoon or the reading pause is up, the screen shows a frozen board and this phone's state is a step behind the table's, so a tap would be refused ("Not a legal move right now."). Ignore it quietly.
function inHold(){return !!(window.CUTAWAYS&&CUTAWAYS.busy&&CUTAWAYS.busy());}
function tap(x,y){clearTimeout(tap.q);if(!S||actLock||locked||cardOpen||inHold())return;if(Date.now()<sniffUntil){const stamp=()=>S&&JSON.stringify([S.phase,S.round,S.turn,S.myTurn,S.ostrich,S.vulture,S.hunter,S.pounce,S.lastAction]),queuedState=stamp(),queuedMode=curMode();tap.q=setTimeout(()=>{if(stamp()===queuedState&&curMode()===queuedMode)tap(x,y);},sniffUntil-Date.now()+20);return;}const p=[x,y],ok=legalNow().some(q=>q[0]===x&&q[1]===y);
 if(!ok){const c=$('board').children[y*S.cfg.cols+x];if(c&&c.dataset.tip&&c.dataset.tags)showTip(c,c.dataset.tip,2600);if(c&&c.animate)c.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-3px)'},{transform:'translateX(0)'}],{duration:220});}
 if(S.role==='blue'&&(S.phase==='setupEggs'||S.phase==='setupOstrich'))return ok?send({t:'act',a:'place',p}):nope('Not there.',p);
 if(S.phase!=='play')return;if(!S.myTurn)return nope(S.three?window.T3UI.waitMsg(S):S.role==='blue'?'Wait. Vulture\'s turn.':'Wait. Ostrich\'s turn.');
 const m0=curMode();if(m0==='hmove'){if(!ok)return nope('Too far.',p);return send({t:'act',a:'hmove',p});}
 const m=curMode();if(!m)return;
 if(!ok&&m==='carry'&&isF(S.cfg,key(p))&&gd(p,S.ostrich)===1){const c=$('board').children[p[1]*S.cfg.cols+p[0]];c&&c.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:180});return nope('No eggs by food.',p);}
 if(!ok)return nope(m==='throw'?window.THROW_TAP.miss(S,p):m==='kick'?'Tap where they go.':m==='carry'?'Not there.':'Too far.',p);
 if(m==='kick'){const plan=(S.kickPlans||[]).find(q=>q.to&&q.to[0]===x&&q.to[1]===y);if(!plan)return;coachDid('kick');send({t:'act',a:'kick',p:plan.at});return;}
 coachDid(m==='carry'?'step':m);send({t:'act',a:m,p});}
function onFoundEggWithStone(st){return !!(st&&st.role==='red'&&st.phase==='play'&&st.myTurn&&st.stones>0&&st.vulture&&st.marks&&st.marks[st.vulture[0]+','+st.vulture[1]]==='spotted');}
function curMode(){if(!S.myTurn)return null;if(S.role==='hunter')return'hmove';if(S.role==='red'){if(mode)return mode;if(onFoundEggWithStone(S))return'throw';return'fly';}
 if(mode==='carry'&&S.can&&S.can.carry)return'carry';if(mode==='kick'&&S.kickTargets&&S.kickTargets.length)return'kick';return S.moves.length?'step':null;}
// --- GUIDED HARD STOPS (human ostrich only, client-side): once per device, the ostrich must DO the thing.
// start: just a one-time tip, never restricts (Brian 11/4). hungry: only moves toward the nearest leaf until it eats. cold: only moves toward the coldest egg until it stands on it.
// Server rules and the computer ostrich are untouched. Skip in tests: localStorage bo_hs_off=1.
const NOSTONE_FOUND='Found it. Get a stone first.';
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
 if((gGet('start')||'').startsWith('on:'))return G={id:'start',tip:1,txt:'Sit on eggs to warm them.'};
 if(gGet('hungry')==='on')return G={id:'hungry',t:near(C.foods),txt:'Hungry! Go eat.'};
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
  txt:loud?'Egg cooling. Go back.':'',urgent:loud&&loud.coldIn<=4};}
function guideApply(){if(S&&!S._o)S._o={m:S.moves,c:S.carryMoves,cc:S.can&&S.can.carry};else if(S){S.moves=S._o.m;S.carryMoves=S._o.c;if(S.can)S.can.carry=S._o.cc;}if(!G)return;const o=S.ostrich;if(!G.t)return;if(G.free){G.path=[];let p=o.slice();for(let k=0;k<20&&gd(p,G.t)>0;k++){p=[p[0]+Math.sign(G.t[0]-p[0]),p[1]+Math.sign(G.t[1]-p[1])];G.path.push(key(p));}return;}const tg=G.any||[G.t],f=ms=>{const r=(ms||[]).filter(p=>tg.some(t=>gd(p,t)<gd(o,t)));return r.length||!(ms||[]).length?r:ms;};
 if(G.sit&&S.can&&S.can.sit){S.moves=[];S.carryMoves=[];S.can.carry=false;}else{S.moves=f(S.moves);S.carryMoves=f(S.carryMoves);}
 G.path=[];let p=o.slice();for(let k=0;k<20&&gd(p,G.t)>0;k++){p=[p[0]+Math.sign(G.t[0]-p[0]),p[1]+Math.sign(G.t[1]-p[1])];G.path.push(key(p));}}
// "YOU" tag on this phone's own piece, plus a 0.6 s pulse when this player's turn starts (Nov 4 playtest: "I don't see where I am").
// It only marks a piece this player already sees: nothing for an eliminated (off-board) bird, the watcher view or the end screen.
// The pulse plays once per turn (youKey); a re-render inside those 0.6 s picks the animation up where it was.
let youKey='',youAt=0;
function youTag(board){
 $('stage').querySelectorAll('.youflag').forEach(x=>x.remove());
 if(!S||S.god||S.phase==='over'){youKey='';return;}
 const bs=S.h3&&S.h3.birds,mb=bs&&bs[S.h3.mySeat||S.role];if(mb&&mb.out)return;
 const mine=board.querySelector('.pc.ph.mine'),cell=mine?mine.closest('.cell'):board.querySelector('.cell[data-tags~="me"]');
 if(!cell)return;
 const ring=document.createElement('i');ring.className='youring';cell.appendChild(ring); // one ring under your own animal, the same in every theme
 // the YOU tag hangs above the square (in the stage, outside the board's clipping), so it never covers the animal, the egg under it or its number
 const stage=$('stage');stage.querySelectorAll('.youflag').forEach(x=>x.remove());
 const t=document.createElement('span');t.className='youtag youflag';t.textContent='YOU';
 const sr=stage.getBoundingClientRect(),cr=cell.getBoundingClientRect();t.style.left=(cr.left-sr.left+cr.width/2)+'px';t.style.top=(cr.top-sr.top+1)+'px';stage.appendChild(t);
 if(S.phase!=='play'||!S.myTurn)return;
 const k=S.role+':'+S.round+':'+S.turn;if(k!==youKey){youKey=k;youAt=Date.now();}
 const el=Date.now()-youAt;if(el>=600)return;
 const p=document.createElement('span');p.className='youpulse';p.style.animationDelay=(-el)+'ms';cell.appendChild(p);
 setTimeout(()=>document.querySelectorAll('.youpulse').forEach(e=>e.remove()),650-el);}
// Kick preview (long-press tooltip): the direction and how far, nothing about what lies there. It wraps at the edge and may stop early.
function kickTip(x,y){const o=S.ostrich,dx=Math.sign(x-o[0]),dy=Math.sign(y-o[1]),A={'0,-1':'up','0,1':'down','-1,0':'left','1,0':'right','-1,-1':'up and left','1,-1':'up and right','-1,1':'down and left','1,1':'down and right'};
 const plan=(S.kickPlans||[]).find(p=>p.to&&p.to[0]===x&&p.to[1]===y);
 if(plan&&plan.who&&plan.who!=='vulture'){const n=plan.who==='badger'?S.cfg.kickPushBadger:S.cfg.kickPush,name=plan.who==='badger'?'badger':plan.who==='hyena'?'hyena':'hunter';return 'The '+name+' lands '+n+' square'+(n===1?'':'s')+' away, on a random square.';}
 return 'Kick it '+(A[dx+','+dy]||'away')+', up to '+S.cfg.kickPush+' squares.';}
// How to play: four small pictures of the board, drawn with the real marks (the same classes and art the game uses), one short line each
function howPics(){const box=$('howPics');if(!box)return;
 const mini=(cols,rows,cells,after)=>{const m=document.createElement('div');m.className='mini';m.style.gridTemplateColumns=`repeat(${cols},44px)`;m.style.gridTemplateRows=`repeat(${rows},44px)`;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const d=document.createElement('div');d.className='cell'+((x+y)%2?' alt':'');d.innerHTML=(cells[x+','+y]||'');m.appendChild(d);}
  return {m,after:()=>after&&after(m,{cfg:{cols,rows}})};};
 const lit=(m,...ix)=>ix.forEach(i=>m.children[i].classList.add('legal')),myegg=`<span class="ic ic-myegg" data-t="myegg">${eggIs()}</span>`;
 const flag=(m,x,y)=>{const c=m.children[y*(+m.style.gridTemplateColumns.match(/\d+(?=,)/)||4)+x]||m.children[0];const t=document.createElement('span');t.className='youtag youflag';t.textContent='YOU';t.style.left=(c.offsetLeft+c.offsetWidth/2)+'px';t.style.top=(c.offsetTop+1)+'px';m.appendChild(t);};
 const pics=[
  mini(4,2,{'1,1':`${myegg}<div class="pc po">${OST}</div>${sqRing(11,C0.warmth,null)}`},m=>{m.children[5].classList.add('sat');lit(m,0,1,2,4,6);flag(m,1,1);}),
  mini(4,2,{'1,1':`<div class="pc pv">${VUL}</div>`},(m,s)=>{if(window.T3UI)T3UI.marksAround(m,s,1,1,1,'egg');}),
  mini(4,2,{'1,1':`<div class="pc pv">${VUL}</div>`,'2,1':`<span class="ic ic-spot" data-t="spot">${eggIs()}</span>`},m=>{flag(m,1,1);}),
  mini(4,2,{'1,1':`<span class="ic ic-hit" data-t="hit">${XMARK}</span>`,'2,1':`<div class="pc po">${OST}</div>`},m=>{m.children[5].classList.add('hit');})];
 // Captions differ by role (blue, red, hunter); unapproved roles keep shared lines.
 const CAPS={all:['Tap a lit square to move.','Dashed egg: may be here.','Filled egg: found. Throw at it.','Wrecked: no one can land.']};
 // Approved by Brian: role-specific filled-egg lines for ostrich, vulture and hunters.
 CAPS.blue=CAPS.all.slice();CAPS.blue[2]='Filled egg: a vulture found your egg.';
 CAPS.red=CAPS.all.slice();CAPS.red[2]='Filled egg: you found it. Throw a stone at it.';
 CAPS.hunter=CAPS.all.slice();CAPS.hunter[2]='Filled egg: a vulture found an egg.';
 const lines=(S&&CAPS[S.role])||CAPS.all;
 // the black-and-white theme shows real board pictures (4 x 2 squares cut from real play, tools/shots-real-play.js howcrops); other themes draw them
 const real=document.documentElement.getAttribute('data-theme')==='bw';
 box.innerHTML='';pics.forEach((p,i)=>{const f=document.createElement('figure');f.className='pic'+(real?' realpic'+(i===2?' found':''):'');if(real){const im=document.createElement('img');im.src='tut/how/'+(i===2&&S&&S.role==='blue'?'2-blue':i)+'.png';im.alt='';f.appendChild(im);}else f.appendChild(p.m);const c=document.createElement('figcaption');c.textContent=lines[i];f.appendChild(c);box.appendChild(f);});
 if(!real)pics.forEach(p=>p.after());}
function syncRejoinAsk(){const el=$('rejoinAsk');if(!el)return;const a=S&&S.rejoinAsk;if(!a){el.classList.add('hidden');return;}
 $('rejoinAskTitle').textContent=a.title||'';const body=$('rejoinAskBody');if(body){const t=a.body||'';body.textContent=t;body.hidden=!t;}
 $('rejoinAskYes').textContent=a.yes||'Let them in';$('rejoinAskNo').textContent=a.no||'Not them';
 el.dataset.id=a.id||'';el.dataset.seat=a.seat||'';el.classList.remove('hidden');}
function hideBtn(){if(!S||!S.simple||!S.myTurn||!(S.hideLeft>0))return '';const me=S.h3&&S.h3.mySeat||S.role;if(S.veil&&(S.veil[me]||(S.role==='blue'&&S.veil.blue)||(S.role==='red'&&S.veil.red)))return '';return `<button type="button" onclick="UI.send({t:'act',a:'hide'})">Hide <b class="hidect">${S.hideLeft|0}</b></button>`;}
function render(prev){
 syncRejoinAsk();
 if(window.TUT&&TUT.offer)TUT.offer(S);maybeCard();$('lobby').classList.add('hidden');const C=S.cfg,blue=S.role==='blue',body=document.body;body.className=(S.role==='hunter'?'hunter':blue?'blue':'red')+(S.three?' three':'')+(S.god?' godview':'');
 $('turnTag').innerHTML=S.role==='hunter'||(S.h3&&S.h3.team)?window.T3UI.tag(S):`<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${blue?OST:VUL}</span> ${blue?'OSTRICH':'VULTURE'}`;
 $('roundsLeft').textContent=(S.round||1)+' of '+(C.rounds||30);
 // HUD: food, stones, and eggs on one chip row. The food number is public.
 // A rise counts up from the old digit; a paint in the middle must not jump to the new one.
 const hud=$('stats');if(hud){const play=S.phase==='play'||S.phase==='over';const chips=play||S.phase==='setupEggs'||S.phase==='setupOstrich'||S.phase==='setup';hud.classList.toggle('hidden',!chips);
  if(chips){const now=S.hungerLeft|0,was=prev&&prev.hungerLeft!=null?prev.hungerLeft|0:null,digit=hungerDigit(now,was),badge=play&&ateBadgeOn(prev),pop=play&&!!(window.ATE&&ATE.justAte(prev,S));
   const leaf=badge?`<span class="leaf-hold">${LEAF.replace('<svg ','<svg class="leaf-back" ')}${LEAF.replace('<svg ','<svg class="leaf-front" ')}</span>`:LEAF;
   const food=play?`<span class="hh${digit<=3?' low':''}${badge?' ate':''}${pop?' ate-pop':''}" data-tip="Ostrich food: turns left before it starves"><span class="hh-top">${leaf}<b id="hungerLeft">${digit}</b></span>${blue?`<i class="hbar"><i style="width:${Math.max(0,Math.min(100,100*digit/C.food))}%"></i></i>`:''}</span><span class="hs${S.stones<1?' empty':''}" data-tip="Vulture stones">${STONE}<b id="stonesLeft">${S.stones}/${C.stones}</b></span>`:'';
   const alive=S.eggsLeft|0,placed=S.h3&&S.h3.eggsTotal!=null?S.h3.eggsTotal|0:0,start=Math.max(C.eggs|0,placed);
   hud.innerHTML=food+`<span class="he">${EGG}<b id="eggsLeft">${alive}/${start}</b></span>`;
   if(play){if(was!=null&&now>was)hungerPlayer.play(was,now);
    else if(hungerPlayer.rising()){if(hungerPlayer.state().target!=null&&now<hungerPlayer.state().target)hungerPlayer.reset();else hungerPlayer.hold();}}
  }}
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
 const sp=$('seatPick'),SNM={blue:'Ostrich',red:'Vulture',hunter:'Hunter',hyena:'Hyena',badger:'Badger',o1:'Ostrich 1',o2:'Ostrich 2',v1:'Vulture 1',v2:'Vulture 2'};
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
  if(route&&route.len>0&&S.hungerLeft<=route.len+1&&route.next&&base.some(p=>key(p)===key(route.next))){if(!(S.moves||[]).some(p=>key(p)===key(route.next)))S.moves=(S.moves||[]).concat([route.next]);foodText=`Leaf in ${route.len} move${route.len===1?'':'s'} · ${S.hungerLeft} left`;foodLead=true;}}
 const L=!S.myTurn?[]:S.role==='hunter'?(S.hmoves||[]):(blue?(M==='carry'?S.carryMoves:M==='kick'?(S.kickPlans||[]).map(p=>p.to):S.moves):(M==='throw'?S.throw:S.fly));
 const lk=new Set(L.map(key)),setup=blue&&(S.phase==='setupEggs'||S.phase==='setupOstrich');
 const NS=window.NextStep?NextStep.compute(S):{kind:null,targets:[],toward:[],button:null},nsT=new Set(NS.targets),nsW=new Set(NS.toward); // the next step of this animal's loop, drawn on the board (nextstep.js)
 const board=$('board');board.style.gridTemplateColumns=`repeat(${C.cols},minmax(0,1fr))`;board.style.alignContent='start';board.style.alignItems='start';
 if(window.CUTAWAYS)CUTAWAYS.prepare(S,prev,board);
 board.innerHTML='';
 const la=S.lastAction,newTurn=!!(prev&&(prev.turn!==S.turn||prev.round!==S.round));
 const lastThrow=la&&la.type==='throw'&&la.p&&newTurn?key(la.p):null;const eggAt={};(S.eggs||[]).forEach((e,i)=>{if(e.alive&&e.pos){e._i=i;eggAt[key(e.pos)]=e;}});
 const sn=S.phase==='play'&&S.sniff?S.sniff:null,snK=sn?((sn.round!=null?sn.round:'x')+'|'+sn.p+'|'+sn.yes):'';
 // This animal, this sense, once, and only while that sense is still the current round. The live round
 // used to be part of the key, so the ostrich's move replayed "Egg nearby!" after the egg could leave.
 const senseNow=BO.sniffFresh(S),seen=sniffSeen[S.role]||'',snNew=!!sn&&senseNow&&snK!==seen;sniffSeen[S.role]=snK;if(snNew)sniffUntil=Date.now()+1200;
 const found=!!sn&&key(sn.p)===key(S.vulture)&&S.marks[key(S.vulture)]==='spotted'; // landed ON an egg: that's a find, not a sniff
 const inSn=k=>{if(!sn)return false;const [a,b]=k.split(',').map(Number);return Math.max(Math.abs(a-sn.p[0]),Math.abs(b-sn.p[1]))<=1;};
 // Outlines use the last landing, including after a throw cleared the live sense. A new landing replaces it.
 const snShow=BO.outlineSniff(S);
 const inShow=k=>{if(!snShow)return false;const [a,b]=k.split(',').map(Number);return Math.max(Math.abs(a-snShow.p[0]),Math.abs(b-snShow.p[1]))<=1;};
 const birdGone=side=>{const b=S.h3&&S.h3.birds;if(!b)return false;if(S.h3.team){const me=S.h3.mySeat;return side==='o'?!!((me==='o1'||me==='o2')&&b[me]&&b[me].out):!!((me==='v1'||me==='v2')&&b[me]&&b[me].out);}return side==='o'?!!(b.blue&&b.blue.out):!!(b.red&&b.red.out);};
 const onBoard=p=>p&&p[0]>=0&&p[1]>=0;
 const noStone=!blue&&S.role==='red'&&S.phase==='play'&&S.myTurn&&S.stones<1,throwing=!blue&&M==='throw',kicking=blue&&M==='kick',ok=onBoard(S.ostrich)&&!birdGone('o')?key(S.ostrich):'',vk=onBoard(S.vulture)&&!birdGone('v')?key(S.vulture):'';
 const fogP=S.phase==='play'&&!S.god&&S.role!=='hunter'?(S.role==='blue'?S.ostrich:S.role==='red'?S.vulture:null):null,fogOf=fogP&&fogP[0]>=0?fogP:null;
 const senseZone=window.SENSE_ZONE?SENSE_ZONE.zone(S,M):null,senseSet=new Set(window.SENSE_ZONE?SENSE_ZONE.squares(C,senseZone):[]),tagAbove=senseZone?senseZone.c[0]+','+(senseZone.c[1]-1):''; // tagAbove: the YOU tag sits on the square above your piece // stripes: squares within how far this player's own piece senses (senserange.js, sense-stripes.css)
 for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y,d=document.createElement('div');d.className='cell'+((x+y)%2?' alt':'');
  const m=S.role==='hunter'&&!S.simple&&S.phase!=='over'&&S.marks[k]==='spotted'?null:S.marks[k];if(m)d.classList.add(m);const tags=[],tip=[];
  if(!S.simple&&fogOf&&Math.max(Math.abs(x-fogOf[0]),Math.abs(y-fogOf[1]))>SENSE_ZONE.SEE)d.classList.add('fog'); // fog of war: a bird sees hunters only within 2 (hunters get none). Simple rules: everyone sees every animal.
  const legal=lk.has(k)||(setup&&legalNow().some(q=>key(q)===k));
  if(senseSet.has(k)){d.classList.add('sense');if(k===tagAbove)d.classList.add('ytag');}
  if(nsT.has(k)&&NS.kind!=='rocks'&&!kicking)d.classList.add('cue','cue-'+NS.kind);
  if(legal&&kicking){d.setAttribute('aria-label','Tap where they go.');}
  else if(legal){d.classList.add('legal');if(setup)d.classList.add('setupsq');if(throwing)d.classList.add('target');tags.push(throwing?'target':'legal');d.setAttribute('aria-label',throwing?'Throw here':'Legal step');if(nsW.has(k))d.classList.add('toward');}
  if(!blue&&snShow&&inShow(k)&&!m&&k!==ok)tip.push('Egg may be here.'); // the 8 squares get a small egg outline in the corner (below)
  if(sn&&snNew&&inSn(k)&&!found){d.classList.add(sn.yes?'snyes':'snno');d.style.animationDelay=(Math.max(Math.abs(x-sn.p[0]),Math.abs(y-sn.p[1]))*.18)+'s';}
  // exactly one tile icon: smashed > found egg > own egg > food > rocks
  const e=eggAt[k];let h='';const under=!!(blue&&e&&k===ok&&S.phase==='play'); // the egg you stand on: ring around the whole square
  if(m==='hit'){h=icon(S.role==='hunter'&&!S.simple&&S.phase!=='over'?'stone':'hit');tip.push(S.role==='hunter'&&!S.simple&&S.phase!=='over'?SHORT.stone:SHORT.hit);}
  else if(m==='stone'){h=icon('hit');tip.push(SHORT.stone);} // every wrecked square looks the same: one X
  else if(!blue&&m==='spotted'){h=icon('spot');tip.push(SHORT.spot);}
  else if((blue||S.god||S.phase==='over')&&e){h=`<span class="ic ic-myegg${S.god&&!blue?' godegg':''}" data-t="myegg">${eggIs()}${S.phase==='play'&&!under?warmNum(e.coldIn,C.warmth):''}</span>${under?sqRing(e.coldIn,C.warmth,prev&&prev.eggs&&prev.eggs[e._i]&&prev.eggs[e._i].alive?prev.eggs[e._i].coldIn:null):''}`;
   tip.push((blue?'Your egg. ':'Egg. ')+'Cold in '+e.coldIn+'.'+(m==='spotted'?' Found.':''));}
  else if(isF(C,k)){h=icon('food');tip.push(SHORT.food);}
  else if(isR(C,k)){h=icon('rock');tip.push(SHORT.rock);}
  if(h)tags.push(h.match(/data-t="(\w+)"/)[1]);
  if(noStone&&isR(C,k))d.classList.add('rockcall'); // vulture with no stone: both rock piles glow (every turn)
  if(k===lastThrow&&(la.result==='miss'||la.result==='bounce')){d.classList.add(la.result==='bounce'?'bounce':'flash');}
  if(k===vk&&k!==ok&&(m==='spotted'||(blue&&e)))d.classList.add('vfound'); // vulture on a found egg: both show, corner layout
  if(k===vk&&k===ok){d.classList.add('both');tip.push('Vulture and ostrich share this square');}
  const veil=S.simple&&S.veil||{},mound=window.T3UI&&T3UI.MOUND||'';
  if(k===vk){h+=veil.red&&mound?`<div class="pc ph bur">${mound}</div>`:`<div class="pc pv">${VUL}</div>`;if(blue)tip.push('The vulture');tags.push(blue?'vul':'me');} // no "You." label on your own piece: the YOU tag already says it
  if(k===ok){if(blue&&e){d.classList.add('sat');}h+=veil.blue&&mound?`<div class="pc ph bur">${mound}</div>`:`<div class="pc po${S.carried?' carrying':''}">${S.carried&&ART.ostrichCarry?ART.ostrichCarry:OST}</div>`;if(!blue)tip.push('The ostrich');tags.push(blue?'me':'ost');}
  if(legal)tip.push(kicking?kickTip(x,y):throwing?'Throw here.':setup?(S.phase==='setupEggs'?'Hide an egg here':'Start here'):blue||S.role==='hunter'?'Move here':'Fly here'); // a hunter walks; only the vulture flies
  d.innerHTML=h;d.dataset.tip=[...new Set(tip)].join(' · ');
  d.dataset.tags=tags.join(' ');if(tags.includes('me'))d.id='current';d.onclick=()=>{if(Date.now()<noClick)return;tap(x,y);};board.appendChild(d);}
 {const cs=getComputedStyle(board),gap=parseFloat(cs.columnGap)||0,pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),inner=board.clientWidth-pad,w=(inner-gap*(C.cols-1))/C.cols;if(w>1){board.style.gridAutoRows='0';board.style.gridTemplateRows=`repeat(${C.rows},${w}px)`;}}
 const ateNow=!!(window.ATE&&ATE.justAte(prev,S));
 if(ateNow)ateLine={seat:ATE.seatOf(S),until:Date.now()+ATE.LINE_MS};
 const ateShow=ateShowing();
 if(ateNow&&S.ostrich&&S.ostrich[0]>=0){const c=board.children[S.ostrich[1]*C.cols+S.ostrich[0]];if(c)c.classList.add('ate');}
 // "may be here" is a small outline of the animal in the corner of each square it may be on: here, an egg in each of the 8 squares around where the vulture last landed. A throw keeps that landing's outlines; the next landing replaces them.
 if(snShow&&S.phase==='play'&&window.T3UI)T3UI.marksAround(board,S,snShow.p[0],snShow.p[1],1,'egg');
 if(snNew){const vc=board.children[sn.p[1]*C.cols+sn.p[0]];if(vc&&!found){const w=document.createElement('div');w.className='snwave '+(sn.yes?'yes':'no');vc.appendChild(w);}
  if(!window.BORing||BORing.showSniffPop(blue,!!sn.yes,found)){{const sniffText=found?(blue?'Vulture found your egg!':'Found egg!'):sn.yes?(blue?'Vulture sniffed an egg.':'Egg nearby!'):'No egg nearby';window.STATUS_QUEUE.add({id:'snpop',className:(found?'yes found':sn.yes?'yes':'no')+(blue?' small':'')+' '+News.cls(News.tone(sniffText,S)),text:sniffText,priority:found?40:10});}}}
 // sniff banner: the vulture's yes/no for this sense only (a later round must not repeat it), plus hunger
 const bn=$('banner');let bt='',bc='';
 const smashed=la&&((la.type==='throw'&&la.result==='hit')||la.smashed); // a last-round landing uses the same smash lines as a stone
 // A smash is said once, in each player's own line (catchtext.js). There is no separate "Smashed!" banner, and a page opened after a smash does not replay one.
 if(foodLead){bt=foodText;bc='hungry';}
 else if(BO.sniffAnnounce(S)){bt=BO.sniffAnnounce(S);bc=News.cls(News.tone(bt,S));}
 else if(S.phase==='play'&&blue&&S.ostrich&&S.ostrich[0]>=0&&!BO.foodRoute(C,S.ostrich,S.marks)&&S.hungerLeft<=2){bt='Hungry. No way to food.';bc='hungry';}
 if(prev&&S.phase==='play'&&(S.lastCold|0)>(prev.lastCold|0)&&!smashed){bt='An egg went cold.';bc=News.cls(News.tone(bt,S));}
 {const left=C.rounds-S.round+1;if(S.phase==='play'&&left<=3&&!bt){bt=left===1?'Last round!':`Final ${left} rounds!`;bc='final';}}
 if(bn)BO_BANNER.set(bt,bc);
 $('warm').innerHTML='';
 const a=$('actions');let h='';a.innerHTML='';const CM=coachNow(),coach=!!CM;
 const btn=(id,lbl,on,click,dis)=>`<button class="${on&&!dis?'on':''}" ${dis?'disabled aria-disabled="true"':''} ${on?'aria-pressed="true"':''} onclick="${click}">${on&&!dis?'✓ ':''}${lbl}</button>`;
 if(S.phase==='setupEggs')h=blue?`Hide your eggs. ${S.h3&&S.h3.eggsToPlace!=null?S.h3.eggsToPlace:C.eggs-S.eggs.length} left.`:(S.h3&&S.h3.teamSetup==='ostrich'?'The ostriches are choosing where to start…':'The ostrich is hiding its eggs…');
 else if(S.phase==='setupOstrich')h=blue?'Pick your start.':(S.h3&&S.h3.teamSetup==='ostrich'?'The ostriches are choosing where to start…':'The ostrich is hiding its eggs…');
 else if(S.phase==='play'&&S.three&&(!S.myTurn||S.role==='hunter'))h=window.T3UI.hint(S,a);
 else if(S.phase==='play'&&!S.myTurn)h=blue?'Vulture\'s turn…':'Ostrich\'s turn…';
 else if(S.phase==='play'&&blue){
  a.innerHTML=btn('s','Walk',M==='step',"UI.setMode('step')")+(S.onEgg&&!S.simple?btn('c',CARRYIC+'Carry',M==='carry',"UI.setMode('carry')",M==='carry'||!S.can.carry):'')+(S.onEgg?btn('t',EYE+'Sit',false,"UI.act('sit')",!S.can.sit):'')+(S.kickNear?btn('k','Kick',M==='kick',"UI.kick()",M==='carry'||!(S.can&&S.can.kick)):'')+hideBtn();
  h=M==='kick'?'Tap where they go.':M==='carry'?'Pick where the egg goes.':S.moves.length?'Your turn. Tap to move.':'';
 } else if(S.phase==='play'){
  a.innerHTML=btn('fl','Fly',M==='fly',"UI.setMode('fly')")+btn('th','Throw',M==='throw',"UI.setMode('throw')",S.stones<1)+hideBtn();
  if(NS.button==='throw'&&M!=='throw'){const tb=[...a.querySelectorAll('button')].find(x=>/Throw/.test(x.textContent));if(tb)tb.classList.add('cuebtn');}
  h=S.stones<1?'No stone. Go to rocks.':M==='throw'?'Tap to throw.':'Your turn. Tap to fly.';}
 a.className=S.phase==='play'&&S.myTurn?'mine':'';
 // ONE message per turn: the most important event wins
 let ev='';const myNew=newTurn&&S.myTurn;
 if(myNew&&la){
  if(blue&&la.type==='throw')ev=la.result==='bounce'?'Kicked it back!':la.result==='hit'?'':stoneHitAnimal(S,prev,la)?'':'Missed.'; // a hit is the one smash line, not "Egg smashed."; a stone that pushed the badger or hyena is not a miss
  if(blue&&!ev&&la.spotted)ev='The vulture found an egg! Move it or sit on it.';
  if(!blue&&la.type==='fly'&&la.spotted)ev='Found an egg. Throw on it.';
  if(S.lastCold&&!ev&&!smashed)ev='An egg went cold.';
 }
 if(smashed){/* said once, in the viewer's own line (catchtext.js) */}
 else if(!blue&&prev&&prev.turn==='red'&&la&&la.type==='throw'&&S.turn==='blue')ev=la.result==='bounce'?(la.egg?'Bounced! Egg under ostrich.':'Bounced! No egg.'):stoneHitAnimal(S,prev,la)?'':'Miss.';
 else if(!blue&&S.role==='red'&&S.phase==='play'&&!S.myTurn&&la&&la.type==='fly'){ // the vulture's own landing, shown while the ostrich takes its turn
  if(la.spotted&&S.stones<1)ev=NOSTONE_FOUND;else if(la.refill)ev='Picked up a stone.';}
 if(ev)h=ev+(h?' '+h:'');
 if(W&&W.txt&&!G)h=W.txt;
 if(G&&!(foodLead&&G.id==='hungry')&&M!=='carry')h=G.txt;
 if(!blue&&S.phase==='play'&&S.myTurn&&S.marks[key(S.vulture)]==='spotted'&&S.stones>0&&!smashed)h="You're on the egg!";
 if(!blue&&S.role==='red'&&S.phase==='play'&&S.myTurn&&S.marks[key(S.vulture)]==='spotted'&&S.stones<1&&!smashed)h=NOSTONE_FOUND; // standing on a found egg with no stone: say why you can't smash it
 // just-in-time tips (once each)
 if(window.TUT&&S.phase==='play'){const T=TUT.tip;
  if(la&&((la.type==='throw'&&la.result==='hit')||la.smashed))T('hit','Smashed. Nobody can land here.');
  if(la&&la.type==='throw'&&la.result==='miss')T('stone','Wrecked. Nobody can land here.');
  if(la&&la.spotted)T('spotted',blue?'Found! Sit on it or move it.':'Found. It stays found until moved.');
  if(!S.simple&&!blue&&S.myTurn&&la&&la.type==='fly')T('sniff','Each landing sniffs the squares around you.');
  if(!blue&&S.myTurn&&M==='throw')T('throwtip','Throwing at the ostrich bounces back.');}
 if(window.TUT&&blue&&S.phase==='play'&&S.myTurn){const T=TUT.tip;
  if(S.round>1)T('warm','Stand on an egg to warm it.');
  if(S.hungerLeft<=C.food/2&&!foodLead)T('food',`Eat within ${S.hungerLeft} turns.`);
  if(!S.simple&&S.onEgg&&S.can.carry&&S.round>3)T('carry','Carry moves an egg 1 square.');
  if(S.kickNear&&S.can&&S.can.kick)T('kick','Kick: a vulture goes straight back. A hunter lands on a random square.');
}
 if(window.TUT&&S.phase==='play'&&S.round>2)TUT.tip('marks','Hover or tap a square to see what it is.');
 // render the coach mark
 document.querySelectorAll('.spot').forEach(e=>e.classList.remove('spot'));let ce=$('coach');if(!ce){ce=document.createElement('div');ce.id='coach';document.body.appendChild(ce);}
 document.body.classList.remove('coaching');ce.className='hidden';
 if(CM){let an=CM.at==='board'?null:[...a.querySelectorAll('button')].find(b=>(CM.at==='sit'?/Sit/:/Throw/).test(b.textContent));
  if(an&&!an.disabled){an.classList.add('spot','pulse');}if(CM.at==='board'||(an&&!an.disabled))h=CM.txt+(h&&CM.at!=='board'?' — or '+h.charAt(0).toLowerCase()+h.slice(1):'');}
 (S.sittingAt||[]).forEach(q=>{const c=board.children[q[1]*C.cols+q[0]];if(c&&c.classList&&!c.querySelector('.sittag')){const t=document.createElement('span');t.className='sittag';t.innerHTML=EYE;t.setAttribute('aria-label','Seen by the vulture');c.appendChild(t);}});
 if(S.three)window.T3UI.after(S,prev,board);
 else if(window.T3UI&&T3UI.clock)T3UI.clock(S);
 if(window.PUSH_MOTION)PUSH_MOTION.kickChoose(board,blue&&M==='kick'?(S.kickPlans||[]):[]);
 window.T3UI.events(S,prev,board);window.T3UI.startLine(S,prev,cardMode(S));
 if(/^(Missed\.|Miss\.)/.test(ev))setTimeout(()=>flashRight(),50); // a miss: the right option pulses
 youTag(board);
 if(window.BORing)BORing.sync(S);
 if(S.role!=='hunter'){requestAnimationFrame(()=>window.FX&&FX.update(S,prev));window.SMASH&&SMASH.update(S,prev);}
 // make 'your turn' + what to do impossible to miss (Brian playtest: a player missed the instructions)
 const mt=S.phase==='play'&&S.myTurn&&!S.pass;$('hint').classList.toggle('myturn',!!mt);
 if(window.BORing&&S.phase==='play'&&S.myTurn){for(const note of BORing.omittedNotes(S)){const sit=/^sit/i.test(note),stone=/stone/i.test(note);if(sit&&!/step off|sit is used/i.test(h))h=(h?h+' ':'')+note;if(stone&&!/stone/i.test(h))h=(h?h+' ':'')+note;}}
 if(mt&&(!h||/turn…$/.test(h))){const what=S.role==='red'?'Tap to fly':S.role==='hunter'?'Tap to move':'Tap to move';h=(h&&!/turn…$/.test(h)?h:'Your turn. '+what+'.');}
 if(blue&&M==='kick')h='Tap where they go.';
 if(ateShow)h=ATE.LINE;
 if(window.TURNLINE)h=TURNLINE.live.show(h);
 $('hint').textContent=h;if(typeof preferEggLine==='function')preferEggLine();if(!ateShow&&h&&(G||(W&&W.txt))&&!(blue&&M==='kick')){const sb=document.createElement('button');sb.className='skipguide';sb.id='skipGuide';sb.textContent='Skip guide';$('hint').appendChild(sb);tapper(sb,()=>{UI.guides(false)});}$('hint').classList.toggle('empty',!h);{const ht=ateShow?News.tone(ATE.LINE,S):News.hintTone(h,S);$('hint').classList.toggle('news-good',ht==='good');$('hint').classList.toggle('news-bad',ht==='bad');}$('hint').classList.toggle('guide',!!G||!!(W&&W.txt));$('hint').classList.toggle('cold',!G&&!!(W&&W.txt));$('hint').classList.toggle('urgent',!G&&!!(W&&W.urgent));$('log').textContent=S.joined&&!S.opponent&&S.phase!=='over'?'Opponent offline… they can rejoin with the same link.':'';
 // cause before result (D36): stone into the count, carried egg slide, cold egg dims, badger sinks; each only on a screen that already held the facts (fx.js)
 if(window.CAUSE)CAUSE.run(S,prev,board,{stone:STONE,egg:MYEGG,ring:n=>warmRing(n,C.warmth)});
 if(window.PUSH_MOTION)PUSH_MOTION.run(S,prev,board);
 if(window.CUTAWAYS)CUTAWAYS.play(S,prev,board);
 const o=$('over');if(S.phase==='over'){hideTip();tipBar(null);$('rules').classList.add('hidden');if(rulesOpen){rulesOpen=false;if(!cardOpen)send({t:'card-done',seat:mySeat()});}$('walk').classList.add('hidden');const tut=document.getElementById('tut');if(tut)tut.classList.add('hidden');
  const wait=window.CUTAWAYS&&CUTAWAYS.busy()?CUTAWAYS.MS:1000;
  if(!overHold){overHold=Date.now()+wait;setTimeout(()=>{if(S&&S.phase==='over')render();},wait);}}
 else overHold=0;
 const keyEl=$('markkey');if(keyEl){const may=!!board.querySelector('.maybird'),legal=!!board.querySelector('.cell.legal');keyEl.hidden=!(may||(legal&&S.myTurn&&S.phase==='play'));keyEl.classList.toggle('hasmaybe',may);}
 if(S.phase==='over'&&overHold&&Date.now()<overHold)o.classList.add('hidden');
 else if(S.phase==='over'&&S.winBy==='left'){const pop=document.getElementById('snpop');if(pop)pop.remove();const art=S.leftArt==='vulture'?VUL:S.leftArt==='hyena'&&window.T3UI?T3UI.KIND.hyena.art:S.leftArt==='badger'&&window.T3UI?T3UI.KIND.badger.art:OST;const title=String(S.leftName||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));o.classList.remove('hidden');o.innerHTML=`<div class="lobbybox"><div class="bigost">${art}</div><h1>${title}</h1><p>This game is over.</p><button class="big ghost" id="newGame" onclick="UI.menu()">New Game</button></div>`;}
 else if(S.phase==='over'&&S.three){const pop=document.getElementById('snpop');if(pop)pop.remove();o.classList.remove('hidden');o.innerHTML=window.T3UI.over(S);}
 else if(S.phase==='over'){const pop=document.getElementById('snpop');if(pop)pop.remove();const won=S.winner===S.role;o.classList.remove('hidden');
  o.innerHTML=`<div class="lobbybox"><div class="bigost">${S.winner==='blue'?OST:VUL}</div><h1 class="${News.cls(News.endTone(S))}">${S.pass?(S.winner==='blue'?'Ostrich wins!':'Vulture wins!'):won?'You win!':'You lose'}</h1>${S.ai?`<p>vs computer (${S.ai})</p>`:''}<p>${S.endWhy||(S.winner==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`:S.winBy==='starved'?`The ostrich starved in round ${S.round}.`:S.winBy==='cold'?`The last egg went cold in round ${S.round}.`:`The vulture smashed every egg by round ${S.round}.`)}</p>${window.T3UI.endBits(S)}</div>`;}
 else o.classList.add('hidden');
 // Last, so a line queued earlier in this paint (a turn line, a cold egg, a cartoon caption) cannot cover it.
 if(window.STATUS_QUEUE){if(ateShow)STATUS_QUEUE.add({text:ATE.LINE,key:'you-ate',className:'ate-line '+News.cls(News.tone(ATE.LINE,S)),priority:90,preempt:true,hold:ATE.LINE_MS});
  else if(STATUS_QUEUE.drop)STATUS_QUEUE.drop(item=>item.key==='you-ate');}
 // She just sat down: one news line on her phone, once per sit (not again while she stays sitting). Same slot and reading time as the other news lines.
 if(window.STATUS_QUEUE&&window.TURNLINE&&TURNLINE.justSat(S,prev))STATUS_QUEUE.add({id:'announce',key:'sit-seen',className:'show bad',text:TURNLINE.SIT_LINE,priority:60});
}
})();
