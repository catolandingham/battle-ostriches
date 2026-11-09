process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const assert=require('assert'),S=require('./server'),{make}=require('./tests/hunter-fixtures');
for(const mode of ['3p','Hunters','5p']){
 const f=make(S,mode);assert(f.fly(),mode+' legal find');assert.equal(f.g.marks['2,1'],'spotted');
 assert.equal(f.view(f.red).marks['2,1'],'spotted',mode+' vulture retains found egg');assert(f.view(f.blue).eggs.some(e=>e.pos&&e.pos[0]===2&&e.pos[1]===1),mode+' ostrich retains own eggs');
 for(const r of f.roles.filter(r=>['hunter','hyena','badger'].includes(r))){
  for(const phase of ['play']){f.g.phase=phase;const v=f.view(r),wire=JSON.parse(JSON.stringify(v));assert(!wire.eggs,mode+' '+r+' no egg list');assert(!Object.values(wire.marks).includes('spotted'),mode+' no found positions');assert.equal(wire.lastAction,null);assert.equal(wire.sniff,null);}
  f.g.phase='over';const end=f.view(r);assert(end.eggs&&end.eggs.length,mode+' full end reveal');assert.equal(end.god,true);f.g.phase='play';
 }
 console.log('PASS hunter egg privacy '+mode);
}
S.close();process.exit(0);
