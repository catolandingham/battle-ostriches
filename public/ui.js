(function(){
const $=id=>document.getElementById(id);
const OST='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#38d6f0" stroke-width="2" stroke-linecap="round"/><path d="M14 32 L12 38 M20 32 L22 38" stroke="#000" stroke-width="2.5"/></svg>';
const VUL='<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/><path d="M23 11 L28 13 L23 14Z" fill="#ffb347" stroke="#000" stroke-width="1.5"/></svg>';
$('lobbyArt').innerHTML=OST;
let ws,S=null,mode=null,me=JSON.parse(localStorage.getItem('bo_me')||'{}');
const key=p=>p[0]+','+p[1];
const C0=window.BO.CONFIG;
['eggs','warm','sit','fly','rounds'].forEach(k=>document.querySelectorAll('.c-'+k).forEach(e=>e.textContent={eggs:C0.eggs,warm:C0.warmth,sit:C0.maxSit,fly:C0.vultureFly,rounds:C0.rounds}[k]));
// --- robust connection layer ---
let pending=null,pendTimer=null,connTimer=null,attempts=0,hb=null,lastPong=0;
function status(msg,err){const e=$('lobbyErr');if(e){e.textContent=msg||'';e.style.color=err?'#ffb3a8':'#fff';}
 document.querySelectorAll('#mkBlue,#mkRed,#joinBtn').forEach(b=>b.disabled=!!msg&&!err);
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
  if(m.t==='state'){const prev=S;S=m.state;if(!prev||prev.turn!==S.turn||prev.phase!==S.phase)mode=null;render(prev);if(!prev&&window.TUT)TUT.maybeShow(S.role);}
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
const send=o=>ws&&ws.readyState===1&&ws.send(JSON.stringify(o));
function open(msg){pending=msg;attempts=0;if(ws&&ws.readyState===1)sendPending();else connect();}
function tapper(el,fn){let t=0;el.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();fn();},{passive:false});el.addEventListener('click',()=>{if(Date.now()-t>600)fn();});}
tapper($('mkBlue'),()=>open({t:'create',role:'blue'}));
tapper($('mkRed'),()=>open({t:'create',role:'red'}));
tapper($('joinBtn'),()=>open({t:'join',code:$('codeIn').value.trim(),token:me.code===$('codeIn').value.trim().toUpperCase()?me.token:undefined}));
tapper($('howBtn'),()=>TUT.show('all'));tapper($('helpBtn'),()=>TUT.show(S?S.role:'all'));
const roomQ=new URLSearchParams(location.search).get('room');
if(!roomQ)TUT.firstVisit();
if(roomQ){$('codeIn').value=roomQ;open({t:'join',code:roomQ,token:me.code===roomQ.toUpperCase()?me.token:undefined});}
$('shareBtn').onclick=()=>{const u=$('shareLink').value;if(navigator.share)navigator.share({title:'Battle Ostriches',text:'Play Battle Ostriches with me! Code '+S.code,url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u);$('shareBtn').textContent='Copied!';}};
window.UI={rules(){$('rules').classList.remove('hidden')},closeRules(){$('rules').classList.add('hidden')},
 setMode(m){mode=m;render();},act(a){send({t:'act',a})},rematch(){send({t:'act',a:'rematch'})},
 menu(){S=null;localStorage.removeItem('bo_me');location.href='/';}};
function tap(x,y){if(!S)return;const p=[x,y];
 if(S.role==='blue'&&(S.phase==='setupEggs'||S.phase==='setupOstrich'))return send({t:'act',a:'place',p});
 if(!S.myTurn)return;const m=curMode();if(m)send({t:'act',a:m,p});}
function curMode(){if(!S.myTurn)return null;if(S.role==='red')return mode||'fly';
 if(mode==='carry'&&S.can.carry)return'carry';return S.moves.length?'step':null;}
function render(prev){
 $('lobby').classList.add('hidden');const C=S.cfg,blue=S.role==='blue',body=document.body;body.className=blue?'blue':'red';
 $('turnTag').innerHTML=`<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${blue?OST:VUL}</span> ${blue?'OSTRICH':'VULTURE'}`;
 $('roundsLeft').textContent=C.rounds-S.round+1;$('eggsLeft').textContent=S.eggsLeft;
 // waiting for opponent
 const link=location.origin+'/?room='+S.code,slot=$('wait-slot');
 if(!S.opponent&&S.phase!=='over'){const w=$('wait');w.classList.remove('hidden');slot.appendChild(w);$('shareCode').textContent=S.code;$('shareLink').value=link;}
 else $('wait').classList.add('hidden');
 const M=curMode(),L=S.myTurn?(blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly)):[];
 const lk=new Set(L.map(key)),setup=blue&&(S.phase==='setupEggs'||S.phase==='setupOstrich');
 const prints=S.prints||{},maxP=Math.max(1,...Object.values(prints));
 const board=$('board');board.style.gridTemplateColumns=`repeat(${C.cols},1fr)`;board.innerHTML='';
 const eggAt={};(S.eggs||[]).forEach((e,i)=>{if(e.alive&&e.pos)eggAt[key(e.pos)]=e;});
 for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y,d=document.createElement('div');d.className='cell';
  const m=S.marks[k];if(m)d.classList.add(m);
  if(lk.has(k)||(setup&&!eggAt[k]&&(S.phase==='setupOstrich'||k!==key(S.vulture))))d.classList.add('legal');
  const n=prints[k];if(!blue&&n&&m!=='hit'){d.style.background=`rgb(${110+n/maxP*120|0},${34+n/maxP*60|0},34)`;d.innerHTML+=`<span class="num">👣${n>1?n:''}</span>`;}
  const e=eggAt[k];if(e)d.innerHTML+=`<div class="egg${e.coldIn<=2?' cold':''}"></div>`;
  if(k===key(S.vulture))d.innerHTML+=`<div class="pc" style="background:none;border:0${blue?';width:60%;height:60%':''}">${VUL}</div>`;
  if(S.ostrich&&k===key(S.ostrich))d.innerHTML+=`<div class="pc" style="background:none;border:0">${OST}${S.carrying!==null?'<span style="position:absolute;right:-4px;bottom:-4px;font-size:.6em">🥚</span>':''}</div>`;
  d.onclick=()=>tap(x,y);board.appendChild(d);}
 const w=$('warm');w.innerHTML='';
 if(blue&&S.phase==='play')S.eggs.forEach((e,i)=>{const c=document.createElement('div');c.className='wchip'+(!e.alive?' dead':e.coldIn<=1?' crit':e.coldIn<=2?' low':'');c.textContent=`🥚${i+1}: ${e.alive?(e.carried?'carried · ':'')+'🔥'+e.coldIn:'lost'}`;w.appendChild(c);});
 const a=$('actions');let h='';a.innerHTML='';
 if(S.phase==='setupEggs')h=blue?`Tap ${C.eggs-S.eggs.length} square(s) to hide eggs. Spread out = harder to find, longer to keep warm.`:'The ostrich is hiding its eggs…';
 else if(S.phase==='setupOstrich')h=blue?'Tap where your ostrich starts (on an egg to start warming it).':'The ostrich is hiding its eggs…';
 else if(S.phase==='play'&&!S.myTurn)h=blue?'Vulture\'s turn — watch the sky…':'Ostrich\'s turn — it\'s moving somewhere…';
 else if(S.phase==='play'&&blue){
  a.innerHTML=`<button class="${M==='step'?'on':''}" onclick="UI.setMode('step')">👣 Step</button>`+(S.carrying===null?`<button ${S.can.carry?'':'disabled'} class="${M==='carry'?'on':''}" onclick="UI.setMode('carry')">🥚 Carry</button><button ${S.can.sit?'':'disabled'} onclick="UI.act('sit')">🪺 Sit</button>`:`<button ${S.can.down?'':'disabled'} onclick="UI.act('down')">⬇️ Set down</button>`);
  h=M==='carry'?'Carry: tap a highlighted square to walk off WITH this egg.':S.carrying!==null?'Carrying an egg (it is cooling). Step, or Set down here (takes your turn).':S.mustLeave?`Hungry! ${C.maxSit} rounds on this egg — step off to feed.`:S.onEgg?'On an egg (warm & safe). Sit, Carry it, or Step off.':'Step: tap a highlighted square.';
 } else if(S.phase==='play'){
  a.innerHTML=`<button class="${M==='fly'?'on':''}" onclick="UI.setMode('fly')">🪽 Fly</button><button class="${M==='throw'?'on':''}" onclick="UI.setMode('throw')">🪨 Throw</button>`;
  h=M==='fly'?`Fly up to ${C.vultureFly} squares (reveals nothing). Darker 👣 = more ostrich traffic.`:'Throw a stone at your square or a neighbour. Repeats allowed.';}
 // event line
 let ev='';const la=S.lastAction;
 if(prev&&la&&prev.turn==='red'&&S.turn==='blue'&&la.type==='throw')ev=la.result==='hit'?'💥 SMASH! An egg was broken.':la.result==='feather'?(blue?'🪶 A stone hit you — your egg was safe.':'🪶 Feathers! An ostrich was guarding an egg there.'):'✕ Stone missed.';
 else if(prev&&la&&prev.turn==='red'&&S.turn==='blue'&&blue)ev='The vulture flew.';
 if(S.lastCold&&prev&&prev.round!==S.round)ev+=` ❄️ ${S.lastCold} egg(s) went cold!`;
 $('hint').textContent=h;$('log').textContent=ev||(S.phase==='play'?`Round ${S.round} of ${C.rounds} · room ${S.code}${S.opponent?'':' · opponent offline'}`:'');
 const o=$('over');if(S.phase==='over'){const won=S.winner===S.role;o.classList.remove('hidden');
  o.innerHTML=`<div class="lobbybox"><div class="bigost">${S.winner==='blue'?OST:VUL}</div><h1>${won?'You win!':'You lose'}</h1><p>${S.winner==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`:`The vulture got every egg by round ${S.round}.`}</p><button class="big" onclick="UI.rematch()">Rematch</button><button class="big ghost" onclick="UI.menu()">Menu</button></div>`;}
 else o.classList.add('hidden');
}
})();
