// Onboarding: 3 tiny intro cards, then learn-by-playing coach marks (ui.js) and one-time just-in-time tips.
(function(){
const C=window.BO.CONFIG;
const OST=ART.ostrich;
const VUL=ART.vulture;
const FALLBACK=[
 {t:'Welcome',d:'A hide-and-seek game for 2 to 5 players.'},
 {t:'Your move',d:'Tap a lit square on your turn.'},
 {t:'The clock',d:'Each turn has a short timer. When it runs out, the turn ends.'},
];
function linesFor(S){
 if(!S||!window.Roles||!S.rules)return null;
 const h=S.h3||{},mode=!S.three?'2':h.team?String(h.n||4):h.hunt?'4h':'3';
 const card=Roles.roleCard(h.mySeat||S.role,S.role==='hunter'?(S.kind||h.kind):h.kind,mode,S.rules);
 if(!card||!card.lines||!card.lines.length)return null;
 const bits=card.lines.slice(0,3);while(bits.length<3)bits.push('Tap a lit square on your turn.');
 const own=window.ART&&ART[card.picture]||OST; // card 1: the player's own animal; cards 2 and 3: a real B&W board picture (other looks: the animal again)
 return [{t:card.title,d:bits[0],art:own},{t:'Your move',d:bits[1],alt:own},{t:'Remember',d:bits[2],alt:own}];
}
let list=[],i=0,el,after=null;
function build(){el=document.createElement('div');el.id='tut';el.className='screen hidden';el.innerHTML=
 `<div class="tutcard"><button class="tutskip" id="tutSkip">Skip</button><div class="tutimg" id="tutImg"></div>
 <h2 id="tutT"></h2><p id="tutD"></p><div class="dots" id="tutDots"></div>
 <div class="tutnav"><button id="tutBack">Back</button><button id="tutNext">Next</button></div>
 <a href="#" id="tutRules">All rules</a></div>`;document.body.appendChild(el);
 const on=(id,f)=>{const b=document.getElementById(id);let t=0;b.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();f();},{passive:false});b.addEventListener('click',e=>{e.preventDefault();if(Date.now()-t>600)f();});};
 on('tutSkip',close);on('tutBack',()=>go(i-1));on('tutNext',()=>i<list.length-1?go(i+1):close());on('tutRules',()=>{close();window.UI.rules();});
 let x0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
 el.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));});}
function go(n){if(n<0||n>=list.length)return;i=n;const s=list[i];
 const bw=document.documentElement.getAttribute('data-theme')==='bw',SA=window.StartArt;let art=s.art,img=s.img?'/tut/'+s.img:null;
 if(!art&&!img){if(bw&&SA)img=SA.src(s.d);else art=s.alt||OST;}
 document.getElementById('tutImg').innerHTML=art||(img?`<img src="${img}" alt="">`:'');document.getElementById('tutImg').className='tutimg'+(art?' art':'')+(img&&/\/(warm|share|boost|pounce)\.png$/.test(img)?' tall':'');
 document.getElementById('tutT').textContent=s.t;document.getElementById('tutD').textContent=s.d;
 document.getElementById('tutDots').innerHTML=list.map((_,k)=>`<span class="${k===i?'on':''}"${k===i?' aria-current="step"':''}></span>`).join('');
 document.getElementById('tutBack').disabled=i===0;document.getElementById('tutNext').textContent=i===list.length-1?"Let's play":'Next';}
function close(){el.classList.add('hidden');}
function showCards(cards){if(!el)build();list=cards&&cards.length?cards:FALLBACK;el.classList.remove('hidden');go(0);}
function show(){showCards(linesFor(window.UI&&UI._S&&UI._S())||FALLBACK);}
function offer(S){if(!S||S.lobby||S.simple||S.phase==='over'||!S.phase)return;const h=S.h3||{};
 const id=(h.mySeat||S.role||'')+':'+(S.kind||h.kind||'')+':'+(!S.three?'2':h.team?String(h.n||4):h.hunt?'4h':'3');
 const key='bo_tut_'+id;try{if(localStorage.getItem(key)||localStorage.getItem('bo_tut_seen'))return;}catch(e){return;}
 const cards=linesFor(S);if(!cards)return;try{localStorage.setItem(key,'1');}catch(e){}showCards(cards);}
// just-in-time tips: shown once per id, small, dismissible, never blocks the board
const seen=id=>{try{return localStorage.getItem('bo_tip_'+id)}catch(e){return 1}};
// tips go to the inline tip bar under the hint (never covers the board, no dismiss needed, clears on the next action)
let shownThisTurn=false;
function tip(id,text){if(localStorage.getItem('bo_tips_off')||seen(id))return;const b=document.getElementById('tipbar');if(b&&!b.classList.contains('hidden'))return; // one at a time
 try{localStorage.setItem('bo_tip_'+id,'1')}catch(e){}window.UI&&UI._tip&&UI._tip(text);}
window.TUT={show,tip,offer,intro:FALLBACK,cards:linesFor,showCards,
 maybeShow(){},
 firstVisit(){offer(window.UI&&UI._S&&UI._S());}};
})();
