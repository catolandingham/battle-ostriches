const B=require('./game.js');const assert=require('assert');let n=0;const t=(name,f)=>{f();n++;console.log('ok',name)};
const C=B.CONFIG;
// eggs at (2,2) (6,2) (2,5); ostrich on (2,2); vulture flies (4,3)->(4,2)
function setup(cfg){const g=B.newGame(cfg);assert(B.placeEgg(g,[2,2]));assert(B.placeEgg(g,[6,2]));assert(B.placeEgg(g,[2,5]));B.placeOstrich(g,[2,2]);assert(B.vultureFly(g,[4,2]));return g;}
const fl=g=>B.vultureFly(g,g.vulture[1]===2?[4,3]:[4,2]);
t('config: open-skies ruleset',()=>{assert.equal(C.rounds,30);assert.equal(C.eggs,3);assert.equal(C.vultureFly,2);assert.equal(C.throwRange,1);assert.equal(C.smellRange,1);
 assert.equal(C.stones,1);assert.equal(C.food,15);assert.equal(C.warmth,15);assert.equal(C.foods.length,2);assert.equal(C.rocks.length,2);});
t('setup: vulture opens; no egg under vulture, on/next to food, or on rocks',()=>{const g=setup();assert.equal(g.turn,'blue');const h=B.newGame();
 assert(!B.placeEgg(h,[4,3]));assert(!B.placeEgg(h,[0,0]));assert(!B.placeEgg(h,[1,1]));assert(!B.placeEgg(h,[7,5]));assert(!B.placeEgg(h,[4,0]));assert(B.placeEgg(h,[2,0]));});
t('ostrich walks up to 2 squares, and only 1 when it carries an egg',()=>{const g=setup();assert.equal(C.ostrichWalk,2);assert.equal(C.carryWalk,1);
 assert(!B.ostrichStep(g,[5,5]),'3 squares is too far');assert(!B.ostrichStep(g,[2,2]),'not its own square');
 const mv=B.ostrichMoves(g).map(String);assert(mv.includes('4,4')&&mv.includes('3,3')&&mv.includes('0,0')&&!mv.includes('4,2'),'the vulture stands on (4,2): not a landing square');assert(!mv.includes('5,2')&&!mv.includes('2,2'));
 const cm=B.ostrichMoves(g,true).map(String);assert(cm.includes('3,3')&&!cm.includes('4,4')&&!cm.includes('0,0'),'carrying: 1 square only');
 assert(B.ostrichStep(g,[4,4]));assert.equal(g.turn,'red');assert.deepEqual(g.ostrich,[4,4]);
 const h=setup();assert(B.ostrichStep(h,[3,3],true));assert.equal(h.carrying,0);assert.deepEqual(h.ostrich,[3,3]);
 const k=setup();assert(!B.ostrichStep(k,[4,4],true),'a carried egg moves 1 square, not 2');});
t('carry 1 square, set down next turn; not onto egg/food/rocks',()=>{const g=setup();assert(B.ostrichStep(g,[3,3],true));assert.equal(g.carrying,0);fl(g);assert.deepEqual(g.eggs[0].pos,[3,3]);
 const h=B.newGame();B.placeEgg(h,[3,1]);B.placeEgg(h,[2,4]);B.placeEgg(h,[6,4]);B.placeOstrich(h,[3,1]);B.vultureFly(h,[5,3]);assert(!B.ostrichMoves(h,true).some(p=>p+''==='4,0'));});
t('one stone: throw uses it, refill by landing on rocks',()=>{const g=setup();B.ostrichStep(g,[2,1]);assert.equal(g.stones,1);assert.equal(B.vultureThrow(g,[5,2]),'miss');assert.equal(g.stones,0);
 B.ostrichStep(g,[2,2]);assert.equal(B.throwTargets(g).length,0);assert(!B.vultureThrow(g,[5,2]));assert(B.vultureFly(g,[4,0]));assert.equal(g.stones,1);assert(g.lastAction.refill);});
t('unguarded egg smashed; square becomes blocked',()=>{const g=setup();B.ostrichStep(g,[1,1]);B.vultureFly(g,[5,2]);B.ostrichStep(g,[1,2]);assert.equal(B.vultureThrow(g,[6,2]),'hit');assert.equal(g.marks['6,2'],'hit');
 const h=setup();h.marks['3,3']='hit';assert(!B.ostrichMoves(h).some(p=>p+''==='3,3'));});
t('fly range 2; sniff = egg within 1, this turn only',()=>{const g=setup();B.ostrichStep(g,[1,1]);assert(!B.vultureFly(g,[7,2]));assert(B.vultureFly(g,[6,3]));assert.equal(g.lastAction.smell,true);
 B.ostrichStep(g,[1,2]);assert(B.vultureFly(g,[6,5]));assert.equal(g.lastAction.smell,false);});
t('landing on unguarded egg finds it; mark clears when carried away',()=>{const g=setup();B.ostrichStep(g,[1,1]);B.vultureFly(g,[6,2]);assert.equal(g.marks['6,2'],'spotted');assert.deepEqual(Object.keys(B.visible(g).marks),['6,2']);});
t('hunger: eat at food every N turns or starve',()=>{const g=setup({...C,warmth:99});B.ostrichStep(g,[1,1]);fl(g);B.ostrichStep(g,[0,0]);assert.equal(g.hungerLeft,C.food);fl(g);
 for(let i=0;i<C.food&&!g.winner;i++){B.ostrichStep(g,g.ostrich[0]===1?[2,0]:[1,0]);if(!g.winner)fl(g);}assert.equal(g.winner,'red');assert.equal(g.winBy,'starved');});
t('warmth: unvisited eggs go cold; vulture wins',()=>{const g=setup();let x=0;for(let r=1;r<=C.warmth+2&&!g.winner;r++){B.ostrichStep(g,r%2?[1,1]:[0,0]);if(!g.winner)fl(g);}assert.equal(g.winBy,'cold')});
t('ostrich wins after C.rounds rounds (eating + sitting)',()=>{const cfg={...C,warmth:99};const g=B.newGame(cfg);B.placeEgg(g,[2,0]);B.placeEgg(g,[6,2]);B.placeEgg(g,[2,5]);B.placeOstrich(g,[1,0]);B.vultureFly(g,[4,2]);
 for(let r=1;r<=40&&!g.winner;r++){B.ostrichStep(g,g.ostrich[0]===0?[1,0]:[0,0]);if(!g.winner)fl(g);}assert.equal(g.winner,'blue');assert.equal(g.round,C.rounds)});
t('regression (Brian r28): vulture on the ostrich square throws -> bounce, egg safe (sitting, carrying, bot path), UI never cracks an egg',()=>{
 const AI=require('./ai.js');const g=setup();assert(B.ostrichSit(g));assert(B.vultureFly(g,[3,3]));assert(B.ostrichSit(g));g.vulture=[2,2];g.turn='red';
 assert(AI.redView(g).throw.some(p=>p+''==='2,2'));assert.equal(B.vultureThrow(g,[2,2]),'bounce');assert(g.eggs[0].alive);assert.equal(AI.redView(g).lastAction.result,'bounce');assert.equal(g.marks['2,2'],undefined);assert.deepEqual(Object.keys(AI.redView(g).lastAction).sort(),['egg','from','p','result','type']);assert.equal(g.lastAction.egg,true);
 const h=setup();assert(B.ostrichStep(h,[3,2],true));h.vulture=[3,2];assert.equal(B.vultureThrow(h,[3,2]),'bounce');assert(h.eggs[0].alive);assert.deepEqual(h.eggs[0].pos,[3,2]);assert.equal(h.lastAction.egg,true);
 const q=setup();assert(B.ostrichStep(q,[2,3]));q.vulture=[2,3];assert.equal(B.vultureThrow(q,[2,3]),'bounce');assert.equal(q.lastAction.egg,false);
 const w={};require('vm').runInNewContext(require('fs').readFileSync(__dirname+'/public/smash.js','utf8'),{window:w,document:{}});
 assert.equal(w.SMASH.kind('bounce'),'feather');assert.equal(w.SMASH.kind('hit'),'hit');assert.equal(w.SMASH.kind('miss'),'miss');});
t('regression (Brian): landing ON an unguarded egg = found (spotted), not just a sniff',()=>{const AI=require('./ai.js');const g=setup();B.ostrichStep(g,[1,1]);assert(B.vultureFly(g,[6,2]));
 assert.deepEqual(g.lastAction.spotted,[6,2]);const v=AI.redView(g);assert.equal(v.marks['6,2'],'spotted');assert.deepEqual(v.lastAction.spotted,[6,2]);assert.deepEqual(v.sniff.p,[6,2]);});
t('food path counts moves (2 squares each) around smashed squares, and the warning is path + 1 spare turn',()=>{
 const open=B.foodRoute(C,[4,3],{});
 assert.equal(open.len,2); assert.deepEqual(open.food,[0,0]); // 4 squares, 2 per move
 const warn=(h,r,legal)=>!!(r&&r.len>0&&h<=r.len+1&&r.next&&legal.has(r.next.join(',')));
 assert.equal(warn(4,open,new Set([open.next.join(',')])),false);
 assert.equal(warn(3,open,new Set([open.next.join(',')])),true);
 assert.equal(warn(2,open,new Set(['9,9'])),false);
 const marks={'1,0':'hit','1,1':'hit','1,2':'hit','1,3':'hit'};
 const around=B.foodRoute(C,[2,0],marks);
 assert.equal(around.len,1,"a wrecked square no longer blocks the way: walkers pass over it");
 assert.equal(warn(around.len+2,around,new Set([around.next.join(',')])),false);
 assert.equal(warn(around.len+1,around,new Set([around.next.join(',')])),true);
 assert.equal(B.foodRoute(C,[0,0],{}).len,0);
 const box={}; for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++) if(dx||dy) box[(4+dx)+','+(3+dy)]='hit';
 assert.equal(B.foodRoute(C,[4,3],box).len,2,"a ring of wrecked squares is passed over");
});
// Brian's pass-and-play playtest: the vulture was told "Egg nearby!" on a later turn about a square
// that had held an egg. The landing snapshot stays (so the green "might" squares and the bot do not
// learn whether the egg moved). The spoken announcement does not.
t('regression (Brian playtest): removed egg does not announce Egg nearby later; a current egg still does',()=>{
 const AI=require('./ai.js');const g=B.newGame();
 assert(B.placeEgg(g,[6,2]));assert(B.placeEgg(g,[2,5]));assert(B.placeEgg(g,[3,5]));B.placeOstrich(g,[6,2]);
 assert(B.vultureFly(g,[5,3]));assert.equal(g.lastAction.smell,true);assert.equal(B.smellsEgg(g,[5,3]),true);
 assert.equal(B.sniffFresh(g),true);assert.equal(B.sniffAnnounce(g,'red'),'Egg nearby!');assert.equal(B.sniffAnnounce(g,'blue'),'');
 assert(B.ostrichStep(g,[7,2],true)); // egg leaves the sniffed neighborhood
 assert.equal(g.round,2);assert.equal(B.smellsEgg(g,[5,3]),false);assert.equal(g.sniff.yes,true);assert.equal(AI.redView(g).sniff.yes,true);
 assert.equal(B.sniffFresh(g),false);assert.equal(B.sniffAnnounce(g,'red'),'');
 assert(B.vultureFly(g,[4,1]));assert.equal(g.lastAction.smell,false);assert.equal(B.sniffAnnounce(g,'red'),'No egg nearby');
 assert(B.ostrichStep(g,[7,1]));assert.equal(B.sniffAnnounce(g,'red'),''); // do not repeat the old "no" either
 assert(B.vultureFly(g,[6,1]));assert.equal(B.smellsEgg(g,[6,1]),true);assert.equal(g.lastAction.smell,true);assert.equal(B.sniffAnnounce(g,'red'),'Egg nearby!');
});
t('regression (Brian playtest): a cold egg is not smelled and does not announce later',()=>{
 const g=B.newGame({...C,warmth:1});assert(B.placeEgg(g,[6,2]));assert(B.placeEgg(g,[2,5]));assert(B.placeEgg(g,[3,5]));B.placeOstrich(g,[2,5]);
 assert(B.vultureFly(g,[6,3]));assert.equal(B.sniffAnnounce(g,'red'),'Egg nearby!');
 assert(B.ostrichSit(g));assert.equal(g.eggs[0].alive,false);assert.deepEqual(g.eggs[0].pos,[6,2]);
 assert.equal(B.smellsEgg(g,[6,3]),false);assert.equal(g.sniff.yes,true);assert.equal(B.sniffAnnounce(g,'red'),'');
});
t('regression (Brian playtest): bird brings an egg in, leaves, and the old clue is not spoken live',()=>{
 const g=B.newGame();assert(B.placeEgg(g,[7,3]));assert(B.placeEgg(g,[2,5]));assert(B.placeEgg(g,[3,5]));B.placeOstrich(g,[7,3]);
 assert(B.vultureFly(g,[5,3]));assert.equal(g.lastAction.smell,false);assert.equal(B.sniffAnnounce(g,'red'),'No egg nearby');
 assert(B.ostrichStep(g,[6,3],true)); // bird carries the egg into the vulture's vicinity
 assert.equal(B.smellsEgg(g,[5,3]),true);assert.equal(g.sniff.yes,false);assert.equal(B.sniffAnnounce(g,'red'),'');
 assert(B.vultureFly(g,[6,4]));assert.equal(g.lastAction.smell,true);assert.equal(B.sniffAnnounce(g,'red'),'Egg nearby!');
 assert(B.ostrichStep(g,[7,2],true)); // bird leaves; the sniffed square is empty
 assert.equal(B.smellsEgg(g,[6,4]),false);assert.equal(g.sniff.yes,true);assert.equal(B.sniffAnnounce(g,'red'),'');
 assert(B.vultureFly(g,[5,4]));assert.equal(g.lastAction.smell,false);assert.equal(B.sniffAnnounce(g,'red'),'No egg nearby');
});
t('regression (Brian playtest): Found egg stays only while that egg is still found',()=>{
 const g=B.newGame();assert(B.placeEgg(g,[6,2]));assert(B.placeEgg(g,[2,5]));assert(B.placeEgg(g,[3,5]));B.placeOstrich(g,[1,1]);
 assert(B.vultureFly(g,[6,2]));assert.equal(g.marks['6,2'],'spotted');assert.equal(B.sniffAnnounce(g,'red'),'Found egg!');
 assert(B.ostrichStep(g,[1,2]));assert.equal(g.marks['6,2'],'spotted');assert.equal(B.sniffAnnounce(g,'red'),'Found egg!');
 const cold=B.newGame({...C,warmth:1});assert(B.placeEgg(cold,[6,2]));assert(B.placeEgg(cold,[2,5]));assert(B.placeEgg(cold,[3,5]));B.placeOstrich(cold,[2,5]);
 assert(B.vultureFly(cold,[6,2]));assert.equal(B.sniffAnnounce(cold,'red'),'Found egg!');
 assert(B.ostrichSit(cold));assert.equal(cold.marks['6,2'],undefined);assert.equal(B.sniffAnnounce(cold,'red'),'');
});
console.log(n+' tests passed');
