process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const A=require('assert'),S=require('./server'),{make}=require('./tests/hunter-fixtures'),T=require('./three'),H=require('./hunt'),TT=require('./team');
for(const mode of ['3p','Hunters','5p']){
 const f=make(S,mode),g=f.g;A(f.fly());
 g.marks['3,3']='hit';g.marks['4,3']='stone';
 for(const r of f.roles.filter(r=>['hunter','hyena','badger'].includes(r))){const v=f.view(r);A.equal(v.marks['3,3'],'stone');A.equal(v.marks['4,3'],'stone');A(!v.eggs);}
 if(mode==='3p')T.knockout(g,f.red,'caught');else if(mode==='Hunters')H.knockout(g,f.red,'caught','hyena');else TT.knockout(g,f.red,'caught');
 A.equal(g.phase,'play');const out=f.view(f.red);A(!out.god,mode+' no mid-game god view');A(!out.eggs,mode+' out vulture gets no unknown eggs');A.equal(out.myTurn,false);
 A(!out.h3.hunter,mode+' no hidden hunter');A(!out.h3.hunters||out.h3.hunters.length===0,mode+' no hidden hunters');
 g.phase='over';for(const r of f.roles){const v=f.view(r);A(v.god);A.equal(v.eggs.length,g.eggs.length,mode+' end reveal '+r);}
 console.log('PASS knockout privacy, indistinguishable wreckage and full end reveal '+mode);
 const o=make(S,mode);if(mode==='3p')T.knockout(o.g,o.blue,'caught');else if(mode==='Hunters')H.knockout(o.g,o.blue,'caught','hyena');else TT.knockout(o.g,o.blue,'caught');const ov=o.view(o.blue);A.equal(o.g.phase,'play');A(!ov.god);A(!ov.h3.hunter);A(!ov.h3.hunters||!ov.h3.hunters.length,mode+' out ostrich gets no hidden hunters');
 const k=make(S,mode),q=k.g;q.marks={};q.turn=k.blue;
 if(mode==='5p'){q.b.o1.pos=[3,3];q.b.o2.pos=[0,0];q.b.v1.pos=[8,6];q.b.v2.pos=[0,6];q.h.p=[4,3];A(TT.ostrichKick(q,k.blue,[4,3]));}
 else{q.ostrich=[3,3];q.vulture=[8,6];if(mode==='3p'){q.three.h=[4,3];A(T.ostrichKick3(q,[4,3]));}else{q.hunt.hs.hyena.p=[4,3];q.hunt.hs.badger.p=[8,0];A(H.ostrichKickH(q,[4,3]));}}
 const v=k.view(k.blue);A.equal(v.kick.to,null,mode+' kick landing hidden');A.equal(v.lastAction.to,null,mode+' move note landing hidden');A.equal(v.lastAction.type,'kick');
}
for(const n of [4,5]){const f=make(S,'5p');if(n===4){f.g.n=4;f.g.h=null;f.g.order=f.g.order.filter(r=>r!=='hunter');}A(f.fly());A.equal(f.view('v2').marks['2,1'],'spotted','vulture team shares exact found egg');for(const r of ['o1','o2'])A.equal(f.view(r).eggs.length,2,'ostrich team shares both nests');}
S.close();console.log('PASS team sharing retained in 2v2 and 5p');process.exit(0);
