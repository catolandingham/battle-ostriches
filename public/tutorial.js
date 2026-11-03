// First-time tutorial: swipeable steps with real screenshots. Shown once per side; replay via How to play / ? buttons.
(function(){
const C=window.BO.CONFIG;
const STEPS=[
 {r:'all',img:'real',t:'Based on real birds',d:'Egyptian vultures really do pick up stones in their beaks and throw them to crack ostrich eggs. Ostriches lay their eggs in shallow scrapes in the sand and sit on them to keep them warm and safe.'},
 {r:'all',img:'lobby',t:'Welcome to Battle Ostriches',d:'Two players, two phones. One is the Ostrich hiding eggs, the other is the Vulture hunting them with stones.'},
 {r:'all',img:'share',t:'Create & share',d:'Tap Create game, then Share link (or read out the 4-letter code). Your opponent opens the link on their own phone, and turns sync live.'},
 {r:'blue',img:'hide-eggs',t:'Ostrich: hide your eggs',d:`Tap ${C.eggs} squares to hide eggs, then tap where your ostrich starts. Spread out = harder to find, but longer trips to keep them warm.`},
 {r:'blue',img:'warmth',t:'Keep every egg warm',d:`Each egg's 🔥 timer counts down. Sit on it at least once every ${C.warmth} rounds or it goes cold and is lost. The egg you stand on can't be smashed.`},
 {r:'blue',img:'feeding',t:'Sit, then go feed',d:`Sit stays on an egg. After ${C.maxSit} rounds in a row on the same egg you get hungry and must step off.`},
 {r:'blue',img:'carry',t:'Carry an egg',d:'On an egg, tap Carry, then a square: you walk off holding it. It is safe with you but cools down. Every other turn: Step one square in any direction.'},
 {r:'blue',img:'setdown',t:'Set it down',d:'Tap Set down to place the egg on your square. It takes your whole turn. Hide it somewhere the vulture already searched! If the vulture lands on an unguarded egg it is spotted (👁): sit on it or carry it away right away.'},
 {r:'red',img:'fly',t:'Vulture: fly',d:`Fly up to ${C.vultureFly} squares. It reveals nothing, but gets you close to where the eggs might be.`},
 {r:'red',img:'throw',t:'Vulture: throw a stone',d:'Throw at your own square or any square next to you. You may hit any square again: eggs move!'},
 {r:'red',img:'marks',t:'Read the footprints',d:'👣 Every square the ostrich crosses shows footprints, and they get deeper (darker, with a number) each time. Busy trails lead to eggs.'},
 {r:'all',img:'marks',t:'Hit, miss, feather',d:'Black square + orange burst = egg smashed. Dark ✕ = miss. 🪶 Feather = an egg was there, but the ostrich was guarding it. 👁 = egg spotted by landing on it (it may have moved since).'},
 {r:'all',img:'warmth',t:'Who wins?',d:`The top counter shows ROUNDS left and EGGS left. The Ostrich wins if any egg survives ${C.rounds} rounds. The Vulture wins by destroying every egg.`},
];
let list=[],i=0,el;
function build(){el=document.createElement('div');el.id='tut';el.className='screen hidden';el.innerHTML=
 `<div class="tutcard"><button class="tutskip" id="tutSkip">Skip</button><div class="tutimg"><img id="tutImg" alt=""></div>
 <h2 id="tutT"></h2><p id="tutD"></p><div class="dots" id="tutDots"></div>
 <div class="tutnav"><button id="tutBack">Back</button><button id="tutNext">Next</button></div>
 <a href="#" id="tutRules">Full rules</a></div>`;document.body.appendChild(el);
 const on=(id,f)=>{const b=document.getElementById(id);let t=0;b.addEventListener('touchend',e=>{e.preventDefault();t=Date.now();f();},{passive:false});b.addEventListener('click',e=>{e.preventDefault();if(Date.now()-t>600)f();});};
 on('tutSkip',close);on('tutBack',()=>go(i-1));on('tutNext',()=>i<list.length-1?go(i+1):close());on('tutRules',()=>{close();window.UI.rules();});
 let x0=null;el.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
 el.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));});}
function go(n){if(n<0||n>=list.length)return;i=n;const s=list[i];
 document.getElementById('tutImg').src='/tut/'+s.img+(s.img==='real'?'.svg':'.png');document.getElementById('tutT').textContent=s.t;document.getElementById('tutD').textContent=s.d;
 document.getElementById('tutDots').innerHTML=list.map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('');
 document.getElementById('tutBack').disabled=i===0;document.getElementById('tutNext').textContent=i===list.length-1?"Let's play":'Next';}
function close(){el.classList.add('hidden');}
function show(role){if(!el)build();list=(role==='intro'?STEPS.filter(s=>s.r==='all'):STEPS.filter(s=>!role||role==='all'||s.r==='all'||s.r===role));
 if(role==='blue'||role==='red')list=list.filter(s=>s.img!=='lobby'&&s.img!=='share'&&s.img!=='real');
 el.classList.remove('hidden');go(0);}
window.TUT={show,steps:STEPS,
 maybeShow(role){const k='bo_tut_'+role;if(localStorage.getItem(k))return;localStorage.setItem(k,'1');localStorage.setItem('bo_tut_seen','1');show(role);},
 firstVisit(){if(localStorage.getItem('bo_tut_seen'))return;localStorage.setItem('bo_tut_seen','1');show('intro');}};
})();
