// Unit tests: the words for a catch (public/catchtext.js) in every mode, for every viewer. node testcatch.js
process.env.PORT = 0;
const assert = require('assert'), CT = require('./public/catchtext.js'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'), HA = require('./huntai.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const lc=o=>Object.assign({bird:'blue',at:[1,1],to:[3,1],ko:false,seq:1,round:2},o);
ok('approved catch notices are viewer-specific and use the real distance',()=>{
 for(const kind of ['hyena','badger'])for(const bird of ['blue','red','o1','v2'])for(const flag of [{},{walked:true},{ambush:true}]){
  const c=lc({...flag,bird});assert.equal(CT.catchLine(c,bird,kind,1),'You were caught and fled 2 squares.');
  assert.equal(CT.catchLine(lc({...c,to:[2,1]}),bird,kind,1),'You were caught and fled 1 square.');
  for(const viewer of ['blue','red','o1','o2','v1','v2','hunter','hyena','badger'].filter(v=>v!==bird)){
   const k=kind==='badger'?'badger':'hyena',b=bird==='red'||bird[0]==='v'?'vulture':'ostrich';
   assert.equal(CT.catchLine({...c,to:null},viewer,kind,1),`The ${k} caught ${bird==='o1'?'Ostrich 1':'the '+b}!`);
  }
 }
 assert.equal(CT.catchLine(lc({ko:true,to:null}),'blue','hyena',0),'The hyena knocked you out.');
});
ok('"is out" banner names the bird; team seats say which', () => {
  assert.equal(CT.outLine('blue'), 'The ostrich is out.'); assert.equal(CT.outLine('red'), 'The vulture is out.');
  assert.equal(CT.outLine('o1'), 'Ostrich 1 is out.'); assert.equal(CT.outLine('o2'), 'Ostrich 2 is out.');
  assert.equal(CT.outLine('v1'), 'Vulture 1 is out.'); assert.equal(CT.outLine('v2'), 'Vulture 2 is out.'); });

// catchesLeft is read from the rules constants and the bird's catch count in the view, never typed into the words
const view3 = g => T.status3(g), viewT = g => TT.status(g), viewH = g => H.statusH(g);
ok('catchesLeft: 3-player view (hyena 2, badger 2) from T3.ko and the bird\'s catches', () => {
  const g = T.newGame3('hyena'); assert.equal(CT.catchesLeft(view3(g), lc({ bird: 'blue' })), T.T3.ko.hyena);
  g.three.birds.blue.catches = 1; assert.equal(CT.catchesLeft(view3(g), lc({ bird: 'blue' })), T.T3.ko.hyena - 1);
  assert.equal(CT.catchLine(lc(), 'blue', 'hyena', CT.catchesLeft(view3(g), lc())), "You were caught and fled 2 squares.");
  const b = T.newGame3('badger'); b.three.birds.red.catches = 1; assert.equal(CT.catchesLeft(view3(b), lc({ bird: 'red' })), T.T3.ko.badger - 1); b.three.birds.red.catches = 2; assert.equal(CT.catchesLeft(view3(b), lc({ bird: 'red' })), 0); });
ok('catchesLeft: changing the rules constants changes the words', () => {
  const was = T.T3.ko.hyena; try { T.T3.ko.hyena = 4; const g = T.newGame3('hyena'); g.three.birds.blue.catches = 1;
    assert.equal(CT.catchLine(lc(), 'blue', 'hyena', CT.catchesLeft(view3(g), lc())), "You were caught and fled 2 squares.");
    assert.equal(CT.catchLine(lc(), 'hunter', 'hyena', CT.catchesLeft(view3(g), lc())), 'The hyena caught the ostrich!'); } finally { T.T3.ko.hyena = was; }
  const wasT = TT.TM.ko.hyena; try { TT.TM.ko.hyena = 3; const g = TT.newTeam(5, 'hyena'); g.b.o1.catches = 1; assert.equal(CT.catchesLeft(viewT(g), lc({ bird: 'o1' })), 2); } finally { TT.TM.ko.hyena = wasT; }
  const wasH = H.TH.ko.badger; try { H.TH.ko.badger = 2; const g = H.newHunt(); g.hunt.birds.red.catches = 1; assert.equal(CT.catchesLeft(viewH(g), lc({ bird: 'red', by: 'badger' })), 1); } finally { H.TH.ko.badger = wasH; } });
ok('catchesLeft: Hunters view picks the knock-out count of the hunter that caught', () => {
  const g = H.newHunt(); g.hunt.birds.blue.catches = 1;
  assert.equal(CT.catchesLeft(viewH(g), lc({ by: 'hyena' })), H.TH.ko.hyena - 1); assert.equal(CT.catchesLeft(viewH(g), lc({ by: 'badger' })), H.TH.ko.badger - 1); });
ok('catchesLeft: 2 vs 2 + hunter view (team.js)', () => {
  const g = TT.newTeam(5, 'hyena'); g.b.v2.catches = 1; assert.equal(CT.catchesLeft(viewT(g), lc({ bird: 'v2' })), TT.TM.ko.hyena - 1);
  const k = TT.newTeam(5, 'badger'); k.b.v2.catches = 1; assert.equal(CT.catchesLeft(viewT(k), lc({ bird: 'v2' })), TT.TM.ko.badger - 1); k.b.v2.catches = 2; assert.equal(CT.catchesLeft(viewT(k), lc({ bird: 'v2' })), 0); });

// end to end through the rules: play a real catch, build the view the same way server.js does, read the words
const setup3 = (kind, h) => { const g = T.newGame3(kind, undefined, h); for (const p of [[2, 1], [6, 1], [2, 5]]) assert(B.placeEgg(g, p)); assert(T.placeOstrich3(g, [6, 5])); return g; };
ok('ambush: the flag comes out of the real rules and the server view in every mode', () => {
  const g = setup3('badger', [8, 3]); T.vultureFly3(g, [4, 1]); T.ostrichAct3(g, 'step', [7, 5]); T.hunterStay(g); T.vultureFly3(g, [4, 2]); T.ostrichAct3(g, 'step', [7, 4]); assert(T.hunterMove(g, [7, 4]));
  const l = g.three.lastCatch, s = view3(g); assert.equal(l.ambush, true); assert.equal(CT.catchLine(l, 'hunter', 'badger', CT.catchesLeft(s, l)), 'The badger caught the ostrich!'); });
console.log(n + ' catch-text tests passed'); process.exit(0);
