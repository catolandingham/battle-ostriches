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
  if(m.t==='state'){const prev=S;S=m.state;if(!prev||prev.turn!==S.turn||prev.phase!==S.phase)mode=null;render(prev);sounds(prev);if(!prev&&window.TUT)TUT.maybeShow(S.role);}
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
tapper($('inviteBtn'),()=>{sheetOpen=true;render();});tapper($('waitClose'),()=>{sheetOpen=false;render();});tapper($('howBtn'),()=>UI.rules());tapper($('helpBtn'),()=>UI.rules());
function muteLabel(){$('muteBtn').textContent=SFX.muted?'🔇':'🔊';$('muteBtn2').textContent=SFX.muted?'🔇 Sound off':'🔊 Sound on';}
muteLabel();tapper($('muteBtn'),()=>{SFX.toggle();muteLabel();});tapper($('muteBtn2'),()=>{SFX.toggle();muteLabel();});
function sounds(prev){if(!prev)return;const blue=S.role==='blue';
 if(S.phase==='over'&&prev.phase!=='over')return SFX.play(S.winner===S.role?'win':'lose');
 if(prev.phase.startsWith('setup')&&S.phase===prev.phase&&blue)SFX.play('place');
 const la=S.lastAction;
 if(prev.turn==='red'&&S.turn==='blue'&&la&&prev.phase==='play')SFX.play(la.type==='fly'?(la.spotted?'warn':'fly'):la.result==='fake'?'scrape':la.result==='hit'?'crack':la.result==='feather'?'feather':'miss');
 if(prev.turn==='blue'&&S.turn==='red'&&prev.phase==='play')setTimeout(()=>SFX.play('step'),blue?0:0);
 if(S.lastCold&&prev.round!==S.round)setTimeout(()=>SFX.play('cold'),400);
 else if(blue&&S.myTurn&&S.eggs&&S.eggs.some(e=>e.alive&&e.coldIn<=1))setTimeout(()=>SFX.play('warn'),700);
 if(S.myTurn&&!prev.myTurn&&S.phase==='play')setTimeout(()=>SFX.play('turn'),450);
 if(!blue&&la&&la.type==='fly'&&prev.turn==='red'&&S.turn==='blue')setTimeout(()=>SFX.play(la.smell?'sniffYes':'sniffNo'),350);
 if(blue&&prev.fakesLeft>S.fakesLeft)SFX.play('scrape');}
const roomQ=new URLSearchParams(location.search).get('room');
if(!roomQ)TUT.firstVisit();
if(roomQ){$('codeIn').value=roomQ;open({t:'join',code:roomQ,token:me.code===roomQ.toUpperCase()?me.token:undefined});}
$('shareBtn').onclick=()=>{const u=$('shareLink').value;if(navigator.share)navigator.share({title:'Battle Ostriches',text:'Play Battle Ostriches with me! Code '+S.code,url:u}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(u);$('shareBtn').textContent='Copied!';}};
window.UI={rules(){$('rules').classList.remove('hidden')},closeRules(){$('rules').classList.add('hidden')},
 setMode(m){mode=m;render();},act(a){coachDid(a);send({t:'act',a})},replayCoach(){['blue','red'].forEach(r=>localStorage.removeItem('bo_cs_'+r));if(S)render();},rematch(){send({t:'act',a:'rematch'})},
 _rr(){if(S)render();},menu(){S=null;localStorage.removeItem('bo_me');location.href='/';}};
// --- learn-by-playing coach marks: one hint, anchored, everything else dimmed; advances when the player does it ---
const COACH={blue:[
  {when:S=>S.myTurn&&S.moves.length,txt:'Tap a glowing square to step',at:'board',done:'step'},
  {when:S=>S.myTurn&&S.can.sit,txt:'Sit on your egg to keep it warm (🔥 = turns until cold)',at:'sit',done:'sit'},
  {when:S=>S.myTurn&&S.hungry&&S.food,txt:'Go eat the 🦗',at:'board',done:'eat'}],
 red:[{when:S=>S.myTurn,txt:'Fly toward the footprints 👣',at:'board',done:'fly'},
  {when:S=>S.myTurn&&S.stones>0,txt:'Now tap Throw, then a square next to you',at:'throw',done:'throw'},
  {when:S=>S.myTurn&&!S.stones,txt:'Out of stones: land on a 🪨 rock to reload',at:'board',done:'refill'}]};
const cIdx=r=>+(localStorage.getItem('bo_cs_'+r)||0);
function coachNow(){if(!S||S.phase!=='play')return null;const st=COACH[S.role][cIdx(S.role)];return st&&st.when(S)?st:null;}
function coachDid(a){if(!S)return;const st=COACH[S.role][cIdx(S.role)];if(st&&st.done===a&&st.when(S))localStorage.setItem('bo_cs_'+S.role,cIdx(S.role)+1);}
let sheetOpen=false;
function tap(x,y){if(!S)return;const p=[x,y];
 if(S.role==='blue'&&(S.phase==='setupEggs'||S.phase==='setupOstrich'))return send({t:'act',a:'place',p});
 if(!S.myTurn)return;const m=curMode();if(m){coachDid(m==='carry'?'step':m);if(S.role==='blue'&&S.food&&key(S.food)===key(p))coachDid('eat');if(S.role==='red'&&m==='fly'&&(S.cfg.rocks||[]).some(r=>key(r)===key(p)))coachDid('refill');send({t:'act',a:m,p});}}
function curMode(){if(!S.myTurn)return null;if(S.role==='red')return mode||'fly';
 if(mode==='carry'&&S.can.carry)return'carry';return S.moves.length?'step':null;}
function render(prev){
 $('lobby').classList.add('hidden');const C=S.cfg,blue=S.role==='blue',body=document.body;body.className=blue?'blue':'red';
 $('turnTag').innerHTML=`<span style="display:inline-block;width:26px;height:26px;vertical-align:middle">${blue?OST:VUL}</span> ${blue?'OSTRICH':'VULTURE'}`;
 $('roundsLeft').textContent=C.rounds-S.round+1;$('eggsLeft').textContent=S.eggsLeft;if($('stonesLeft'))$('stonesLeft').textContent=S.stones;
 // waiting for opponent
 const link=location.origin+'/?room='+S.code,slot=$('wait-slot');
 $('shareCode').textContent=S.code;$('shareLink').value=link;const w=$('wait');
 if(!S.opponent&&S.phase!=='over'){w.classList.remove('hidden','sheet');slot.appendChild(w);sheetOpen=false;}
 else if(sheetOpen){w.classList.remove('hidden');w.classList.add('sheet');document.body.appendChild(w);} else w.classList.add('hidden');
 $('inviteBtn').classList.toggle('hidden',!S.opponent||S.phase==='over');
 const M=curMode(),L=S.myTurn?(blue?(M==='carry'?S.carryMoves:S.moves):(M==='throw'?S.throw:S.fly)):[];
 const lk=new Set(L.map(key)),setup=blue&&(S.phase==='setupEggs'||S.phase==='setupOstrich');
 const B_dist=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]));const la0=S.lastAction,sniff=!blue&&S.myTurn&&la0&&la0.type==='fly'&&la0.smell&&prev&&prev.turn==='blue';
 const prints=S.prints||{},maxP=Math.max(1,...Object.values(prints));
 const board=$('board');board.style.gridTemplateColumns=`repeat(${C.cols},1fr)`;board.innerHTML='';
 const eggAt={};(S.eggs||[]).forEach((e,i)=>{if(e.alive&&e.pos)eggAt[key(e.pos)]=e;});
 for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const k=x+','+y,d=document.createElement('div');d.className='cell';
  let m=S.marks[k];if(!blue&&m==='fake')m=null;if(m==='fake')m='miss';if(m)d.classList.add(m);if(!blue&&m==='spotted')d.innerHTML+='<div class="egg seen"></div>';
  if(lk.has(k)||(setup&&!eggAt[k]&&(S.phase==='setupOstrich'||k!==key(S.vulture))))d.classList.add('legal');
  const n=prints[k];if(!blue&&n&&m!=='hit'){d.style.background=`rgb(${110+n/maxP*120|0},${34+n/maxP*60|0},34)`;d.innerHTML+=`<span class="num">👣${n>1?n:''}</span>`;}
  if(blue&&S.vtracks&&S.vtracks[k]&&!(S.ostrich&&k===key(S.ostrich)))d.innerHTML+=`<span class="vtr" style="opacity:${Math.min(.9,.3+S.vtracks[k]*.15)}">●</span>`;
  if(blue&&S.nestOk&&S.nestOk.some(q=>key(q)===k))d.classList.add('nestok');
  if(blue&&S.can&&S.can.down&&S.ostrich&&k===key(S.ostrich))d.classList.add('nestok');
  if(blue&&(S.fakes||[]).some(f=>key(f)===k))d.innerHTML+='<span class="fakeic">🪹</span>';
  if(!blue&&sniff&&B_dist([x,y],S.vulture)<=C.smellRange)d.classList.add('sniff');
  if((C.rocks||[]).some(r=>key(r)===k)){d.classList.add('rocksq');d.innerHTML+='<span class="rock">🪨</span>';}
  if(blue&&S.food&&key(S.food)===k)d.innerHTML+='<span class="food">🦗</span>';
  const e=eggAt[k];if(e)d.innerHTML+=`<div class="egg${e.coldIn<=2?' cold':''}"></div>`+(blue&&S.phase==='play'?`<span class="eggw${e.coldIn<=1?' crit':e.coldIn<=2?' low':''}">🔥${e.coldIn}</span>`:'');
  if(k===key(S.vulture))d.innerHTML+=`<div class="pc" style="background:none;border:0${blue?';width:60%;height:60%':''}">${VUL}</div>`;
  if(S.ostrich&&k===key(S.ostrich))d.innerHTML+=`<div class="pc" style="background:none;border:0">${OST}${S.carrying!==null?'<span style="position:absolute;right:-4px;bottom:-4px;font-size:.6em">🥚</span>':''}</div>`+(S.carrying!==null&&S.eggs[S.carrying]?`<span class="eggw">🔥${S.eggs[S.carrying].coldIn}</span>`:'');
  d.onclick=()=>tap(x,y);board.appendChild(d);}
 $('warm').innerHTML='';
 const a=$('actions');let h='';a.innerHTML='';const CM=coachNow(),coach=!!CM;
 const btn=(id,lbl,on,click,dis)=>`<button class="${on?'on':''}" ${dis?'disabled':''} onclick="${click}">${lbl}</button>`;
 if(S.phase==='setupEggs')h=blue?`Tap ${C.eggs-S.eggs.length} squares to hide your eggs.`:'The ostrich is hiding its eggs…';
 else if(S.phase==='setupOstrich')h=blue?'Tap where your ostrich starts.':'The ostrich is hiding its eggs…';
 else if(S.phase==='play'&&!S.myTurn)h=blue?'Vulture\'s turn…':'Ostrich\'s turn…';
 else if(S.phase==='play'&&blue){
  if(S.carrying===null){a.innerHTML=btn('s','👣 Step',M==='step',"UI.setMode('step')")+(S.onEgg?btn('c','🥚 Carry',M==='carry',"UI.setMode('carry')",!S.can.carry)+btn('t','🪺 Sit',false,"UI.act('sit')",!S.can.sit):'')+(S.can.scrape&&S.round>1?btn('f','🪹 Fake',false,"UI.act('scrape')"):'');}
  else a.innerHTML=btn('s','👣 Step',M==='step',"UI.setMode('step')",!S.moves.length)+btn('d','⬇️ Set down',false,"UI.act('down')",!S.can.down);
  h=S.hungry?'Hungry — walk to the 🦗.':S.carryMaxed&&S.can.down?'Set the egg down now.':'';
 } else if(S.phase==='play'){
  a.innerHTML=btn('fl','🪽 Fly',M==='fly',"UI.setMode('fly')")+btn('th',`🪨 Throw · ${S.stones}`,M==='throw',"UI.setMode('throw')",!S.stones);
  h=!S.stones?'Out of stones — land on a 🪨 rock.':'';}
 a.className=S.phase==='play'&&S.myTurn?'mine':'';
 // ONE message per turn: the most important event wins
 let ev='';const la=S.lastAction,newTurn=prev&&prev.turn!==S.turn&&S.myTurn;
 if(newTurn&&la){
  if(blue&&la.type==='throw')ev=la.result==='hit'?'💥 An egg was smashed!':la.result==='feather'?'🪶 A stone bounced off you.':'';
  if(blue&&!ev&&la.spotted)ev='👁 The vulture found an egg! Move it or sit.';
  if(!blue&&la.type==='fly'&&la.spotted)ev='🥚 An egg is right here!';
  if(S.lastCold&&!ev)ev=`❄️ An egg went cold.`;
  if(blue&&!ev&&S.food&&prev&&!prev.food)ev='🦗 Hungry! Food appeared.';
 }
 if(!blue&&prev&&prev.turn==='red'&&la&&la.type==='throw'&&S.turn==='blue')ev=la.result==='hit'?'💥 Smash!':la.result==='feather'?'🪶 Guarded!':'';
 if(ev)h=ev;
 // just-in-time tips (once each)
 if(window.TUT&&S.phase==='play'&&la){const T=TUT.tip;
  if(la.type==='throw'&&la.result==='hit')T('hit','💥 = a smashed egg. It stays on the map.');
  if(la.type==='throw'&&(la.result==='miss'||la.result==='fake'))T('miss','✕ = a stone that hit nothing.');
  if(la.type==='throw'&&la.result==='feather')T('feather',blue?'🪶 Standing on an egg protects it from stones.':'🪶 = the ostrich was sitting on an egg there. Eggs can\'t be hit while guarded.');
  if(la.spotted)T('spotted',blue?'The vulture landed on an unguarded egg and can see it. Sit on it or carry it away.':'Landing on an egg reveals it. If the ostrich moves it, it disappears next time you look.');
  if(!blue&&la.type==='fly'&&la.smell&&S.myTurn)T('smell',`👃 The glow means an egg is within ${C.smellRange} squares.`);
  if(!blue&&la.fake&&S.myTurn)T('fake','That nest was empty — a fake scrape.');}
 if(window.TUT&&blue&&S.phase==='play'&&S.myTurn){const T=TUT.tip;
  if(S.onEgg&&S.can.carry&&S.round>2)T('carry',`🥚 Carry lets you walk off with this egg for up to ${C.maxCarry} turns. A stone on you smashes it.`);
  if(S.carrying!==null)T('setdown','Green squares = where you may set the egg down (no stone has hit them).');
  if(S.can.scrape&&S.round>2)T('fakebtn','🪹 Fake scrapes a decoy nest that looks real to the vulture.');
  if(S.vtracks&&Object.keys(S.vtracks).length>1)T('vtracks','● dots = where the vulture has landed.');}
 if(window.TUT&&!blue&&S.phase==='play'&&S.myTurn&&!S.stones)TUT.tip('rocks',`Out of stones. Land on any 🪨 rock to reload ${C.stones}.`);
 // render the coach mark
 document.querySelectorAll('.spot').forEach(e=>e.classList.remove('spot'));let ce=$('coach');if(!ce){ce=document.createElement('div');ce.id='coach';document.body.appendChild(ce);}
 document.body.classList.toggle('coaching',coach);
 if(CM){const an=CM.at==='board'?$('board'):[...a.querySelectorAll('button')].find(b=>(CM.at==='sit'?/Sit/:/Throw/).test(b.textContent));
  if(an){an.classList.add('spot');if(CM.at!=='board')an.classList.add('pulse');}ce.textContent=CM.txt;ce.className='';if(an){const r=an.getBoundingClientRect();ce.style.top=Math.max(4,r.top-ce.offsetHeight-12)+'px';}h='';}
 else ce.className='hidden';
 if(coach)$('hint').classList.add('empty');
 requestAnimationFrame(()=>window.FX&&FX.update(S,prev));
 $('hint').textContent=h;$('hint').classList.toggle('empty',!h||coach);$('log').textContent=S.phase==='play'&&!S.opponent?'Opponent offline…':'';
 const o=$('over');if(S.phase==='over'){const won=S.winner===S.role;o.classList.remove('hidden');
  o.innerHTML=`<div class="lobbybox"><div class="bigost">${S.winner==='blue'?OST:VUL}</div><h1>${won?'You win!':'You lose'}</h1><p>${S.winner==='blue'?`The ostrich kept ${S.eggsLeft} egg(s) alive for ${C.rounds} rounds.`:`The vulture got every egg by round ${S.round}.`}</p><button class="big" onclick="UI.rematch()">Rematch</button><button class="big ghost" onclick="UI.menu()">Menu</button></div>`;}
 else o.classList.add('hidden');
}
})();
