process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const A=require('assert'),S=require('./server'),{make}=require('./tests/hunter-fixtures'),T=require('./three'),H=require('./hunt'),TT=require('./team');
function assertFull(f,role,label){const v=f.view(role),g=f.g;A.equal(v.god,true,label);A.equal(v.myTurn,false);A.deepEqual(v.eggs.map(e=>e.pos),g.eggs.map(e=>e.pos));A(!v.moves?.length&&!v.fly?.length&&!v.throw?.length&&!v.kickTargets?.length);
 if(g.three)A.deepEqual(v.h3.hunter,g.three.h);if(g.h)A.deepEqual(v.h3.hunter,g.h.p);if(g.hunt)for(const k of ['hyena','badger'])A.deepEqual(v.h3.hunters.find(x=>x.kind===k).p,g.hunt.hs[k].p);
 const h=g.three||g.h;if(h){h.kind='badger';h.burrowed=true;const buried=f.view(role);A.deepEqual(buried.h3.hunter,h.h||h.p,label+' buried badger position');A.equal(buried.h3.burrowed,true);}
 if(g.hunt){g.hunt.hs.badger.burrowed=true;const b=f.view(role).h3.hunters.find(x=>x.kind==='badger');A.deepEqual(b.p,g.hunt.hs.badger.p);A.equal(b.burrowed,true,label+' buried badger visible in god view');}
}
for(const mode of ['3p','Hunters','5p']){
 const f=make(S,mode),g=f.g;A(f.fly());
 g.marks['3,3']='hit';g.marks['4,3']='stone';
 for(const r of f.roles.filter(r=>['hunter','hyena','badger'].includes(r))){const v=f.view(r);A.equal(v.marks['3,3'],'stone');A.equal(v.marks['4,3'],'stone');A(!v.eggs);}
 if(mode==='3p')T.knockout(g,f.red,'caught');else if(mode==='Hunters')H.knockout(g,f.red,'caught','hyena');else TT.knockout(g,f.red,'caught');
 A.equal(g.phase,'play');assertFull(f,f.red,mode+' out vulture');
 g.phase='over';for(const r of f.roles){const v=f.view(r);A(v.god);A.equal(v.eggs.length,g.eggs.length,mode+' end reveal '+r);}
 console.log('PASS full knockout god view, indistinguishable live hunter wreckage and end reveal '+mode);
 const o=make(S,mode);if(mode==='3p')T.knockout(o.g,o.blue,'caught');else if(mode==='Hunters')H.knockout(o.g,o.blue,'caught','hyena');else TT.knockout(o.g,o.blue,'caught');A.equal(o.g.phase,'play');assertFull(o,o.blue,mode+' out ostrich');
 for(const blocker of ['none','wreck','animal']){const k=make(S,mode),q=k.g;q.marks=blocker==='wreck'?{'7,3':'stone'}:{};q.turn=k.blue;
 if(mode==='5p'){q.b.o1.pos=[3,3];q.b.o2.pos=[0,0];q.b.v1.pos=[8,6];q.b.v2.pos=blocker==='animal'?[7,3]:[0,6];q.h.p=[4,3];A(TT.ostrichKick(q,k.blue,[4,3]));}
 else{q.ostrich=[3,3];q.vulture=blocker==='animal'&&mode!=='Hunters'?[7,3]:[8,6];if(mode==='3p'){q.three.h=[4,3];A(T.ostrichKick3(q,[4,3]));}else{q.hunt.hs.hyena.p=[4,3];q.hunt.hs.badger.p=blocker==='animal'?[7,3]:[8,0];A(H.ostrichKickH(q,[4,3]));}}
 const B=require('./game'),v=k.view(k.blue),land=mode==='5p'?q.h.p:mode==='3p'?q.three.h:q.hunt.hs.hyena.p,n=q.lastKick.moved;
 A.deepEqual(v.kick.to,land,mode+' kicker actual landing '+blocker);A.deepEqual(v.lastAction.to,land,mode+' kicker move note actual landing');A.equal(v.kick.moved,n);A.equal(B.wrapDist(q.cfg, [4,3], land), n, mode+' full distance '+blocker);
 A.deepEqual(v.kick.trail,q.lastKick.points,mode+' kicker full path');
 const hit=k.view(mode==='Hunters'?'hyena':'hunter');A.deepEqual(hit.kick.to,land,mode+' every phone sees where the hunter lands');A.deepEqual(hit.kick.trail,q.lastKick.points,mode+' the shove path is the hunter squares only');
 A.deepEqual(hit.ostrich,[-99,-99],mode+' the kick still hides the ostrich');A.deepEqual(hit.vulture,[-99,-99],mode+' the kick still hides the vulture');
 if(blocker!=='animal'){const other=k.view(k.red);A.deepEqual(other.kick.to,land,mode+' a far bird sees the landing');A.deepEqual(other.kick.trail,q.lastKick.points);}
 if(mode==='5p'){const o2=k.view('o2');A.deepEqual(o2.kick.to,land);A.deepEqual(o2.kick.trail,q.lastKick.points);}
 }

}
for(const n of [4,5]){const f=make(S,'5p');if(n===4){f.g.n=4;f.g.h=null;f.g.order=f.g.order.filter(r=>r!=='hunter');}A(f.fly());A.equal(f.view('v2').marks['2,1'],'spotted','vulture team shares exact found egg');for(const r of ['o1','o2'])A.equal(f.view(r).eggs.length,2,'ostrich team shares both nests');}
for(const r of ['o1','v1']){const f=make(S,'5p');f.g.n=4;f.g.h=null;f.g.order=f.g.order.filter(x=>x!=='hunter');TT.knockout(f.g,r,'caught');A.equal(f.g.phase,'play');assertFull(f,r,'2v2 '+r);}
const B=require('./game'),f=make(S,'3p'),g=B.newGame();for(const p of [[2,1],[6,1],[2,5]])A(B.placeEgg(g,p));A(B.placeOstrich(g,[6,5]));g.turn='blue';g.hungerLeft=1;A(B.ostrichStep(g,[5,5]));A.equal(g.phase,'over');const room={...f.room,three:false,g};for(const r of ['blue','red']){const v=S.view(room,r);A(v.god);A.equal(v.eggs.length,3);}
console.log('PASS full view for 2v2 knockouts and Classic game-ending knockout');
S.close();console.log('PASS team sharing retained in 2v2 and 5p');process.exit(0);
