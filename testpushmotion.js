process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const assert=require('assert'),P=require('./public/push-motion'),S=require('./server'),{make}=require('./tests/hunter-fixtures');
const cfg={cols:9,rows:7};
assert.deepEqual(P.path(cfg,[8,3],[2,3],true,3),[[8,3],[0,3],[1,3],[2,3]]);
for(const mode of ['3p','Hunters','5p']){const f=make(S,mode),old={};for(const r of f.roles)old[r]=f.view(r);assert(f.catchBird());
 for(const r of f.roles){const v=f.view(r),ev=P.events(v,old[r]);if(v.role==='hunter')assert.deepEqual(ev,[],mode+' hunter never sees scramble');else if(v.h3.lastCatch.at&&v.h3.lastCatch.to)assert(ev.some(e=>e.key===f.bird),mode+' visible scramble');}
}
const before={cfg,phase:'play',ostrich:[1,1],vulture:[2,1],h3:{hunters:[{kind:'hyena',p:[3,3]},{kind:'badger',p:[4,3]}]} };
assert.equal(P.events({...before,vulture:[5,1],kick:{seq:1,to:[5,1],moved:3}},before)[0].points.length,4);
assert.equal(P.events({...before,h3:{hunters:[{kind:'hyena',p:[5,3]}],burst:{seq:1,to:[5,3]}}},before)[0].points.length,3);
assert.equal(P.events({...before,h3:{hunters:[{kind:'badger',p:[6,3]}],rival:{seq:1,by:'hyena',to:[6,3]}}},before)[0].points.length,3);
assert.equal(P.events({...before,h3:{hunters:[{kind:'hyena',p:[5,3]}]},stoneNote:{seq:1}},before)[0].points.length,3);
assert.deepEqual(P.events({...before,kick:{seq:1,to:null}},before),[]);
assert.deepEqual(P.events({...before,role:'hunter',h3:{lastCatch:{bird:'red',at:[2,1],to:[4,1],seq:1}}},before),[]);
assert.equal(P.events({...before,phase:'over',vulture:[5,1],kick:{seq:1,to:[5,1],moved:3}},before).length,1);
S.close();console.log('PASS pushes: actual catches, redaction, kick wrap, stone, meeting, burst');process.exit(0);
