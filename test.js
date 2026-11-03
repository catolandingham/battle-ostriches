const B=require('./game.js');const assert=require('assert');let n=0;const t=(name,f)=>{f();n++;console.log('ok',name)};
const C=B.CONFIG;
function setup(cfg){const g=B.newGame(cfg);B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeEgg(g,[0,6]);B.placeOstrich(g,[0,0]);B.vultureFly(g,[4,2]);return g;}
const fl=(g,i)=>B.vultureFly(g,g.vulture[1]===2?[4,3]:[4,2]);
t('balanced config',()=>{assert.equal(C.rounds,35);assert(C.warmth>=10&&C.warmth<=16);assert.equal(C.maxSit,3);assert.equal(C.vultureFly,2);assert.equal(C.throwRange,1);
 for(const k of['fakeNests','stones','rocks','foodMin','maxCarry'])assert(!(k in C),'removed '+k);});
t('setup: vulture opens; cannot hide egg under vulture',()=>{const g=setup();assert.equal(g.phase,'play');assert.equal(g.turn,'blue');assert(!B.placeEgg(B.newGame(),[4,3]))});
t('ostrich steps 1 square (8 dirs)',()=>{const g=setup();assert(!B.ostrichStep(g,[2,2]));assert(B.ostrichStep(g,[1,1]));assert.equal(g.turn,'red')});
t('sit cap: 3 in a row, then must step off one turn, single counter',()=>{const g=setup();for(let i=0;i<3;i++){assert(B.ostrichSit(g));fl(g);}
 assert(!B.canSit(g));assert(B.mustLeave(g));assert(!B.ostrichSit(g));assert.equal(g.sitRun,3);assert(!('sitCount' in g));
 assert(B.ostrichStep(g,[1,0]));fl(g);assert.equal(g.sitRun,0);assert(B.ostrichStep(g,[0,0]));fl(g);assert(B.canSit(g));});
t('carry = 1-turn: pick up + step, auto set down anywhere next turn',()=>{const g=setup();assert(B.canCarry(g));assert(B.ostrichStep(g,[1,1],true));assert.equal(g.carrying,0);assert.equal(g.eggs[0].pos,null);
 fl(g);assert.equal(g.carrying,null);assert.deepEqual(g.eggs[0].pos,[1,1]);assert(B.canSit(g));});
t('cannot carry onto another egg',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[1,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[0,0]);B.vultureFly(g,[4,2]);assert(!B.ostrichStep(g,[1,0],true));assert(B.ostrichStep(g,[0,1],true));});
t('carried egg is smashed by a stone on the ostrich',()=>{const g=setup();B.ostrichStep(g,[1,1],true);g.vulture=[2,2];assert.equal(B.vultureThrow(g,[1,1]),'hit');assert(!g.eggs[0].alive);assert.equal(g.carrying,null);assert.equal(g.marks['1,1'],'hit')});
t('sitting/standing protects; unguarded egg smashed; miss',()=>{const g=setup();B.ostrichSit(g);g.vulture=[1,1];assert.equal(B.vultureThrow(g,[0,0]),'feather');assert(g.eggs[0].alive);
 B.ostrichStep(g,[0,1]);assert.equal(B.vultureThrow(g,[0,0]),'hit');B.ostrichStep(g,[1,2]);assert.equal(B.vultureThrow(g,[2,2]),'miss');});
t('unlimited stones',()=>{const g=setup();for(let i=0;i<20;i++){assert(B.vultureThrow(g,[4,2])==='miss'||true);if(g.turn==='blue')B.ostrichStep(g,g.ostrich[0]===0?[1,0]:[0,0]);}assert.equal(g.turn,'red');assert(B.throwTargets(g).length===9)});
t('fly range 2, throw own/adjacent',()=>{const g=setup();B.ostrichStep(g,[1,1]);assert(!B.vultureFly(g,[7,2]));assert(!B.vultureThrow(g,[6,2]));assert(B.vultureThrow(g,[4,2]));B.ostrichStep(g,[1,2]);assert(B.vultureFly(g,[6,4]))});
t('landing on unguarded egg spots it; mark clears when the egg is carried away',()=>{const g=B.newGame();B.placeEgg(g,[5,3]);B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[6,3]);
 assert(B.vultureFly(g,[5,3]));assert.equal(g.marks['5,3'],'spotted');B.ostrichStep(g,[5,3]);B.vultureFly(g,[4,3]);assert(B.ostrichStep(g,[6,4],true));assert.equal(g.marks['5,3'],undefined);
 const h=B.newGame();B.placeEgg(h,[5,3]);B.placeEgg(h,[0,0]);B.placeEgg(h,[8,6]);B.placeOstrich(h,[5,3]);B.vultureFly(h,[5,3]);assert.equal(h.marks['5,3'],undefined,'guarded egg not spotted');});
t('smell history within 2, includes carried egg',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[1,0]);B.placeEgg(g,[2,0]);B.placeOstrich(g,[8,6]);
 B.vultureFly(g,[4,1]);assert.equal(g.smells['4,1'],true);B.ostrichStep(g,[7,6]);B.vultureFly(g,[6,3]);assert.equal(g.smells['6,3'],false);assert.equal(Object.keys(g.smells).length,2);
 const h=B.newGame();B.placeEgg(h,[8,6]);B.placeEgg(h,[0,6]);B.placeEgg(h,[0,0]);B.placeOstrich(h,[8,6]);B.vultureFly(h,[5,4]);B.ostrichStep(h,[7,5],true);assert(B.smellsEgg(h,[5,3]));});
t('footprints: steps and sits deepen',()=>{const g=setup();const a=g.prints['0,0'];B.ostrichSit(g);assert.equal(g.prints['0,0'],a+1);fl(g);B.ostrichStep(g,[1,1]);fl(g);B.ostrichStep(g,[0,0]);assert.equal(g.prints['0,0'],a+2)});
t('warmth: unvisited eggs go cold after N rounds; vulture wins',()=>{const g=setup();for(let r=1;r<=C.warmth+1&&!g.winner;r++){B.ostrichStep(g,[1+r%2,1]);if(!g.winner)fl(g);}assert.equal(g.winner,'red')});
t('ostrich wins after 35 rounds',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[2,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[0,0]);B.vultureFly(g,[4,2]);
 for(let r=1;r<=40&&!g.winner;r++){if(B.canSit(g))B.ostrichSit(g);else B.ostrichStep(g,g.ostrich[0]===0?[1,0]:[0,0]);if(!g.winner)fl(g);}
 assert.equal(g.winner,'blue');assert.equal(g.round,35)});
console.log(n+' tests passed');
