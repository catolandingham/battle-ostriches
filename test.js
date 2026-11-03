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
t('fly onto unguarded egg spots it; ostrich can react; mark goes stale',()=>{const g=B.newGame();B.placeEgg(g,[5,3]);B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeOstrich(g,[6,3]);
 assert(B.vultureFly(g,[5,3]));assert.equal(g.marks['5,3'],'spotted');assert.deepEqual(g.lastAction.spotted,[5,3]);
 // ostrich reacts by stepping on it, then carries it away
 assert(B.ostrichStep(g,[5,3]));assert(B.vultureFly(g,[4,3]));assert(B.ostrichStep(g,[5,4],true));
 assert.equal(g.marks['5,3'],'spotted');assert.equal(B.vultureThrow(g,[5,3]),'miss');assert(g.eggs[0].alive);
 // guarded egg is not spotted
 const h=B.newGame();B.placeEgg(h,[5,3]);B.placeEgg(h,[0,0]);B.placeEgg(h,[8,6]);B.placeOstrich(h,[5,3]);assert(B.vultureFly(h,[5,3]));assert.equal(h.marks['5,3'],undefined);
 // unreacted: throw next turn smashes it
 const k=B.newGame();B.placeEgg(k,[5,3]);B.placeEgg(k,[0,0]);B.placeEgg(k,[8,6]);B.placeOstrich(k,[0,0]);B.vultureFly(k,[5,3]);B.ostrichSit(k);assert.equal(B.vultureThrow(k,[5,3]),'hit');});
t('fake nests: deep tracks, one per square, revealed by landing',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeEgg(g,[8,0]);B.placeOstrich(g,[3,3]);
 B.vultureFly(g,[4,1]);const before=g.prints['3,3'];assert(B.ostrichScrape(g));assert.equal(g.prints['3,3'],before+B.CONFIG.scrapeDepth);assert(!B.ostrichScrape(g),'not on vulture turn');
 assert(B.vultureFly(g,[3,3]));assert.equal(g.marks['3,3'],'fake');assert.deepEqual(g.lastAction.fake,[3,3]);
 assert(!B.canScrape(g),'already a fake here');assert(B.ostrichStep(g,[3,4]));});
t('fake nest limit from CONFIG; not on egg squares',()=>{const cfg={...B.CONFIG,warmth:99};const g=B.newGame(cfg);B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeEgg(g,[8,0]);B.placeOstrich(g,[3,3]);
 const steps=[[3,4],[3,5],[4,5]];let made=0,r=0;
 for(let i=0;i<8;i++){B.vultureFly(g,r++%2?[6,1]:[5,1]);if(B.ostrichScrape(g))made++;else B.ostrichStep(g,steps.shift()||[4,4]);}
 assert.equal(made,cfg.fakeNests);
 const h=B.newGame();B.placeEgg(h,[3,3]);B.placeEgg(h,[8,6]);B.placeEgg(h,[8,0]);B.placeOstrich(h,[3,3]);B.vultureFly(h,[5,1]);assert(!B.canScrape(h));});
t('throw at unguarded fake reveals fake',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[8,6]);B.placeEgg(g,[8,0]);B.placeOstrich(g,[4,4]);
 B.vultureFly(g,[4,2]);B.ostrichScrape(g);B.vultureFly(g,[4,3]);B.ostrichStep(g,[5,5]);assert.equal(B.vultureThrow(g,[4,4]),'fake');assert.equal(g.marks['4,4'],'fake');});
t('smell: yes/no within range after landing, includes carried eggs',()=>{const g=B.newGame();B.placeEgg(g,[0,0]);B.placeEgg(g,[1,0]);B.placeEgg(g,[2,0]);B.placeOstrich(g,[8,6]);
 B.vultureFly(g,[4,1]);assert.equal(g.lastAction.smell,true);assert.equal(g.smells['4,1'],true);
 B.ostrichStep(g,[7,6]);B.vultureFly(g,[6,3]);assert.equal(g.lastAction.smell,false);assert.equal(g.smells['6,3'],false);
 const h=B.newGame();B.placeEgg(h,[8,6]);B.placeEgg(h,[0,6]);B.placeEgg(h,[0,0]);B.placeOstrich(h,[8,6]);B.vultureFly(h,[5,4]);B.ostrichStep(h,[7,5],true);
 B.vultureFly(h,[5,3]);assert.equal(h.lastAction.smell,true,'carried egg 2 away');});
t('sitting deepens the nest tracks',()=>{const g=setup();const a=g.prints['0,0']||0;B.ostrichSit(g);assert.equal(g.prints['0,0'],a+1);});
t('set down only where no stone was ever thrown',()=>{const g=setup();B.ostrichStep(g,[1,1],true);
 B.vultureFly(g,[2,2]);assert(B.canSetDown(g));B.ostrichStep(g,[1,2]);
 assert.equal(B.vultureThrow(g,[2,3]),'miss');B.ostrichStep(g,[2,3]);B.vultureFly(g,[3,2]);assert.equal(g.turn,'blue');assert(!B.canSetDown(g),'stone square');assert(!B.ostrichSetDown(g));
 B.ostrichStep(g,[3,3]);B.vultureFly(g,[4,3]);assert(B.canSetDown(g));assert(!B.stoneFree(g,[2,3]));});
t('vulture landing tracks deepen; no signal when eggs move',()=>{const g=setup();B.ostrichStep(g,[1,1],true);
 assert.equal(g.vtracks['4,2'],1);B.vultureFly(g,[4,3]);B.ostrichStep(g,[1,2]);B.vultureFly(g,[4,2]);assert.equal(g.vtracks['4,2'],2);
 assert.deepEqual(Object.keys(g.lastAction).sort(),['smell','type']);});
console.log(n+' tests passed');
