process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const A=require('assert'),S=require('./server'),{make}=require('./tests/hunter-fixtures'),T=require('./three'),H=require('./hunt'),TT=require('./team'),CT=require('./public/catchtext');
for(const mode of ['3p','Hunters','5p']){const f=make(S,mode),g=f.g;g.turn=f.red;
 if(mode==='5p'){g.b.v1.pos=[3,3];g.h.p=[4,3];A(TT.vultureThrow(g,'v1',[4,3]));}
 else{g.vulture=[3,3];if(mode==='3p'){g.three.h=[4,3];A(T.vultureThrow3(g,[4,3]));A(!g.three.popout,'hyena was not a burrowed badger');}else{g.hunt.hs.hyena.p=[4,3];g.hunt.hs.badger.p=[8,0];A(H.vultureThrowH(g,[4,3]));}}
 A.deepEqual(g.lastStone.targets,['hyena']);A.equal(g.lastStone.text,"The vulture's stone hit the hyena.");
 const doer=f.view(f.red),target=f.view(mode==='Hunters'?'hyena':'hunter'),e={kind:'stone',text:g.lastStone.text};
 A.equal(CT.viewerEvent(e,doer),'Your stone hit the hyena!');A.equal(CT.viewerEvent(e,target),'A stone hit you!');A.deepEqual(doer.stoneNote.trails[0].points,[[4,3],[5,3],null]);A.equal(target.stoneNote.trails[0].points.filter(Boolean).length,3);
}
for(const mode of ['3p','Hunters','5p']){const f=make(S,mode),g=f.g;A(f.fly());g.turn=f.red;if(mode==='3p')A(T.vultureThrow3(g,[2,1]));else if(mode==='Hunters')A(H.vultureThrowH(g,[2,1]));else A(TT.vultureThrow(g,f.red,[2,1]));
 for(const r of f.roles){const v=f.view(r),e={kind:'smash',text:'The vulture smashed an egg.'};A.deepEqual(Object.keys(v.smashNote).sort(),['by','owner','seq']);if(v.role==='hunter'&&!v.god)A.equal(v.smashNote.owner,mode==='5p'?'o1':null);A.equal(CT.viewerEvent(e,v),r===f.red?'You smashed an egg!':r===f.blue?'The vulture smashed your egg!':mode==='5p'?"The vulture smashed Ostrich 1's egg!":'The vulture smashed an egg.');}
}
const kick={kind:'kick',text:''},kv={role:'blue',kick:{who:'hyena',by:'blue',target:'hyena',moved:3}};A.equal(CT.viewerEvent(kick,kv),'You kicked the hyena 3 squares!');A.equal(CT.viewerEvent(kick,{...kv,role:'hunter',kind:'hyena'}),'The ostrich kicked you 3 squares!');
A.equal(CT.viewerEvent(kick,{...kv,role:'hunter',kind:'hyena',h3:{mySeat:'hunter',team:true},kick:{...kv.kick,by:'o2'}}),'Ostrich 2 kicked you 3 squares!');
for(const owner of ['o1','o2']){const f=make(S,'5p'),g=f.g;g.turn='v1';g.b.v1.pos=[3,3];g.b.o1.pos=[0,0];g.b.o2.pos=[8,0];g.b[owner].pos=[4,3];g.h.p=[8,6];A(TT.vultureThrow(g,'v1',[4,3]));A.equal(g.lastStone.kicker,owner);A.equal(CT.viewerEvent({kind:'stone',text:g.lastStone.text},f.view('v2')),`${owner==='o1'?'Ostrich 1':'Ostrich 2'} kicked the stone right back!`);}
for(const by of ['v1','v2']){const s={phase:'play',role:'red',h3:{team:true,mySeat:by==='v1'?'v2':'v1'},lastAction:{seat:by,type:'fly',spotted:true}};A.equal(CT.newEvents({},s,{lastAction:null}).find(e=>e.kind==='teamFound').text,`${by==='v1'?'Vulture 1':'Vulture 2'} found an egg.`);}
for(const n of [0,1,2]){const b={kind:'burst',text:CT.burstLine({n})},suffix=`${n} square${n===1?'':'s'}!`;for(const [seat,prefix]of [['badger','You burst out and shoved the hyena '],['hyena','The badger burst out and shoved you '],['red','The badger burst out and shoved the hyena ']])A.equal(CT.viewerEvent(b,{role:seat,h3:{burst:{n}}}),prefix+suffix);}
for(const by of ['hyena','badger']){const other=by==='hyena'?'badger':'hyena';A.equal(CT.viewerEvent({kind:'rival'},{role:'red',h3:{rival:{by}}}),`The ${by} shoved the ${other}!`);}
for(const by of ['red','v1','v2'])A.equal(CT.viewerEvent({kind:'stone'},{role:'blue',h3:{},stoneNote:{by,targets:['hyena']}}),`${by==='red'?'The vulture':by==='v1'?'Vulture 1':'Vulture 2'}'s stone hit the hyena!`);
S.close();console.log('PASS actual stone hits name the actual hunter, never a false badger pop');process.exit(0);
