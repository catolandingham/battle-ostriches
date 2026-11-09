process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const A=require('assert'),S=require('./server'),{make}=require('./tests/hunter-fixtures'),T=require('./three'),H=require('./hunt'),TT=require('./team'),CT=require('./public/catchtext');
for(const mode of ['3p','Hunters','5p']){const f=make(S,mode),g=f.g;g.turn=f.red;
 if(mode==='5p'){g.b.v1.pos=[3,3];g.h.p=[4,3];A(TT.vultureThrow(g,'v1',[4,3]));}
 else{g.vulture=[3,3];if(mode==='3p'){g.three.h=[4,3];A(T.vultureThrow3(g,[4,3]));A(!g.three.popout,'hyena was not a burrowed badger');}else{g.hunt.hs.hyena.p=[4,3];g.hunt.hs.badger.p=[8,0];A(H.vultureThrowH(g,[4,3]));}}
 A.deepEqual(g.lastStone.targets,['hyena']);A.equal(g.lastStone.text,"The vulture's stone hit the hyena.");
 const doer=f.view(f.red),target=f.view(mode==='Hunters'?'hyena':'hunter'),e={kind:'stone',text:g.lastStone.text};
 A.equal(CT.viewerEvent(e,doer),mode==='5p'?'You, the vulture 1, hit the hyena with a stone.':'You, the vulture, hit the hyena with a stone.');A.equal(CT.viewerEvent(e,target),"The vulture's stone hit you, the hyena.");
}
S.close();console.log('PASS actual stone hits name the actual hunter, never a false badger pop');process.exit(0);
