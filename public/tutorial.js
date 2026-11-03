// Onboarding: 3 tiny intro cards, then learn-by-playing coach marks (ui.js) and one-time just-in-time tips.
(function(){
const C=window.BO.CONFIG;
const OST='<svg viewBox="0 0 40 40"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#38d6f0" stroke-width="2" stroke-linecap="round"/><path d="M14 32 L12 38 M20 32 L22 38" stroke="#000" stroke-width="2.5"/></svg>';
const VUL='<svg viewBox="0 0 40 40"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/><path d="M23 11 L28 13 L23 14Z" fill="#ffb347" stroke="#000" stroke-width="1.5"/></svg>';
const INTRO=[
 {art:`<div class="tart"><div class="tbird">${OST}</div><div class="tvs">vs</div><div class="tbird">${VUL}</div></div><div class="tlogo">Battle Ostriches</div>`,t:'Welcome!',d:'A hide-and-seek duel for two phones.'},
 {art:`<div class="tgoal"><div><div class="tbird s">${OST}</div><b>🥚</b><span>keep 1 egg alive for ${C.rounds} rounds</span></div><div><div class="tbird s">${VUL}</div><b>💥💥💥</b><span>smash all ${C.eggs}</span></div></div>`,t:'Ostrich vs vulture',d:'Real Egyptian vultures crack ostrich eggs with stones. One of you is the ostrich, one is the vulture.'},
 {art:`<div class="tart"><div class="tbird">${OST}</div><div class="tvs">👆</div></div>`,t:'Ready?',d:"You'll learn your moves as you play."},
];
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
 document.getElementById('tutImg').innerHTML=s.art||`<img src="/tut/${s.img}" alt="">`;document.getElementById('tutImg').className='tutimg'+(s.art?' art':'');
 document.getElementById('tutT').textContent=s.t;document.getElementById('tutD').textContent=s.d;
 document.getElementById('tutDots').innerHTML=list.map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('');
 document.getElementById('tutBack').disabled=i===0;document.getElementById('tutNext').textContent=i===list.length-1?"Let's play":'Next';}
function close(){el.classList.add('hidden');}
function show(role){if(!el)build();
 list=INTRO;
 el.classList.remove('hidden');go(0);}
// just-in-time tips: shown once per id, small, dismissible, never blocks the board
const seen=id=>{try{return localStorage.getItem('bo_tip_'+id)}catch(e){return 1}};
let tq=[],tEl=null,tTimer;
function tip(id,text){if(seen(id)||tq.some(q=>q[0]===id))return;try{localStorage.setItem('bo_tip_'+id,'1')}catch(e){}tq.push([id,text]);if(!tEl||tEl.classList.contains('hidden'))nextTip();}
function nextTip(){const q=tq.shift();if(!tEl){tEl=document.createElement('div');tEl.id='toast';tEl.className='hidden';document.body.appendChild(tEl);
  tEl.addEventListener('click',()=>{tEl.classList.add('hidden');setTimeout(nextTip,150);});}
 if(!q){tEl.classList.add('hidden');return;}tEl.innerHTML=`<span>${q[1]}</span><b>✕</b>`;tEl.dataset.id=q[0];tEl.classList.remove('hidden');
 clearTimeout(tTimer);tTimer=setTimeout(()=>{tEl.classList.add('hidden');setTimeout(nextTip,200);},7000);}
window.TUT={show,tip,intro:INTRO,
 maybeShow(){},
 firstVisit(){if(localStorage.getItem('bo_tut_seen'))return;localStorage.setItem('bo_tut_seen','1');show('intro');}};
})();
