const B=require('./game.js');const assert=require('assert');let n=0;const t=(name,f)=>{f();n++;console.log('ok',name)};
function setup(){const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeEgg(g,[0,6]);B.placeOstrich(g,[0,0]);B.vultureFly(g,[4,2]);return g;}
t('setup',()=>{const g=setup();assert.equal(g.phase,'play');assert.equal(g.sitEgg,0);assert(!B.placeEgg(B.newGame(),[4,3]))});
t('ostrich 8-dir step only adjacent',()=>{const g=setup();assert(!B.ostrichStep(g,[2,2]));assert(B.ostrichStep(g,[1,1]));assert.equal(g.turn,'red')});
t('sit max 3 then must leave',()=>{const g=setup();for(let i=0;i<3;i++){assert(B.ostrichSit(g));B.vultureFly(g,[4,4+(i%2?0:1)]===null?0:[4,i%2?3:4]);}assert(!B.canSit(g));assert(B.mustLeave(g));assert(!B.canCarryNow(g))});
t('pick up, carry, set down',()=>{const g=setup();assert(B.ostrichStep(g,[1,0],true));assert.equal(g.carrying,0);B.vultureFly(g,[4,4]);assert(B.ostrichMoves(g).length>0);assert(B.ostrichSetDown(g));assert.deepEqual(g.eggs[0].pos,[1,0]);assert.equal(g.sitEgg,0)});
t('carry cannot enter egg square',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[2,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[0,0]);B.vultureFly(g,[4,2]);B.ostrichStep(g,[1,0],true);B.vultureFly(g,[4,4]);assert(!B.ostrichStep(g,[2,0]))});
t('fly range 2, throw adjacent',()=>{const g=setup();B.ostrichStep(g,[1,1]);assert(!B.vultureFly(g,[7,2]));assert(!B.vultureThrow(g,[6,2]));assert(B.vultureFly(g,[6,4]))});
t('hit unguarded egg, miss, feather on guarded, repeat allowed',()=>{const g=B.newGame();B.config;B.placeEgg(g,[4,4]);B.placeEgg(g,[5,3]);B.placeEgg(g,[0,0]);B.placeOstrich(g,[0,1]);B.vultureFly(g,[4,3+1]);B.vultureFly; g.vulture=[4,3];
 B.ostrichStep(g,[0,0]);assert.equal(B.vultureThrow(g,[4,4]),'hit');B.ostrichStep(g,[1,1]);assert.equal(B.vultureThrow(g,[3,3]),'miss');B.ostrichStep(g,[0,0]);assert.equal(B.vultureThrow(g,[3,3]),'miss');
 const h=B.newGame();B.placeEgg(h,[4,4]);B.placeEgg(h,[0,0]);B.placeEgg(h,[8,0]);B.placeOstrich(h,[4,4]);B.vultureFly(h,[4,5]);B.ostrichSit(h);assert.equal(B.vultureThrow(h,[4,4]),'feather');assert(h.eggs[0].alive)});
t('carried egg guarded',()=>{const g=setup();B.ostrichStep(g,[1,1],true);B.vultureFly(g,[2,2]);B.ostrichStep(g,[2,1]);assert.equal(B.vultureThrow(g,[2,1]),'feather');assert(g.eggs[0].alive)});
t('footprints deepen',()=>{const g=setup();B.ostrichStep(g,[1,1]);B.vultureFly(g,[4,4]);B.ostrichStep(g,[0,0]);B.vultureFly(g,[4,3]);B.ostrichStep(g,[1,1]);assert.equal(g.prints['1,1'],2)});
t('warmth: unvisited eggs go cold after 6 rounds',()=>{const g=setup();let x=0;for(let r=1;r<=6;r++){B.ostrichStep(g,[r%2,1]);B.vultureFly(g,[4,r%2?4:3]);}assert(!g.eggs[1].alive&&!g.eggs[2].alive);});
t('vulture wins when all eggs lost',()=>{const g=setup();for(let r=1;r<=6;r++){B.ostrichStep(g,[r%2,1]);B.vultureFly(g,[4,r%2?4:3]);}assert.equal(g.winner,'red')});
t('ostrich wins after 40 rounds',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[2,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[1,0]);B.vultureFly(g,[4,2]);
 let a=[0,0],b=[2,0],cur=[1,0],nx=a;for(let r=1;r<=40&&!g.winner;r++){ if(B.canSit(g)&&r%3!==0)B.ostrichSit(g); else {nx=(g.ostrich[0]===0?[1,0]:g.ostrich[0]===2?[1,0]:(r%2?a:b));B.ostrichStep(g,nx);} B.vultureFly(g,[4,r%2?4:3]);}
 assert.equal(g.winner,'blue');assert.equal(g.round,40)});
console.log(n+' tests passed');
