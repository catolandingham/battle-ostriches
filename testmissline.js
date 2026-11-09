// A vulture stone that hits the badger or hyena is not a miss: nobody is told "Missed." / "Miss." and the right square does not pulse.
// A stone on an empty square is still a miss.
process.env.PORT='0';process.env.BO_NOSTORE='1';process.env.BO_BOTMS='900000';
const A=require('assert'),fs=require('fs'),S=require('./server'),{make}=require('./tests/hunter-fixtures'),T=require('./three'),H=require('./hunt'),TT=require('./team');
const src=fs.readFileSync(__dirname+'/public/ui.js','utf8');
const fn=src.match(/function stoneHitAnimal\(S,prev,la\)\{.*\}\n/);A(fn,'ui.js has stoneHitAnimal');
const stoneHitAnimal=new Function(fn[0]+';return stoneHitAnimal;')();
// the two miss lines go through it, and the right-square pulse only follows a miss line
A(/'Egg smashed\.':stoneHitAnimal\(S,prev,la\)\?'':'Missed\.'/.test(src),'the ostrich line checks for a hit animal');
A(/:stoneHitAnimal\(S,prev,la\)\?'':'Miss\.';/.test(src),'the vulture line checks for a hit animal');
A(/if\(\/\^\(Missed\\\.\|Miss\\\.\)\/\.test\(ev\)\)setTimeout\(\(\)=>flashRight\(\)/.test(src),'the pulse only follows a miss line');
const lineFor=(v,prev)=>{const la=v.lastAction;if(!la||la.type!=='throw')return null;return la.result==='bounce'?'bounce':la.result==='hit'?'hit':stoneHitAnimal(v,prev,la)?'':'Missed.';};
const thr=(mode,f,p)=>{const g=f.g;if(mode==='5p'){g.turn='v1';g.b.v1.pos=[3,3];return TT.vultureThrow(g,'v1',p);}g.turn='red';g.vulture=[3,3];return mode==='3p'?T.vultureThrow3(g,p):H.vultureThrowH(g,p);};
for(const mode of ['3p','Hunters','5p']){
 // hit the hyena: no one gets a miss line
 let f=make(S,mode),g=f.g;if(mode==='5p')g.h.p=[4,3];else if(mode==='3p')g.three.h=[4,3];else{g.hunt.hs.hyena.p=[4,3];g.hunt.hs.badger.p=[8,0];}
 let before={};for(const r of f.roles)before[r]=JSON.parse(JSON.stringify(f.view(r)));
 A(thr(mode,f,[4,3]));A.deepEqual(g.lastStone.targets,['hyena']);
 let seen=0;for(const r of f.roles){const v=f.view(r),l=lineFor(v,before[r]);if(l===null)continue;seen++;A.equal(l,'',mode+' '+r+': a stone that pushed the hyena is not a miss');}
 A(seen>0,mode+': someone saw the throw');
 // a real miss on an empty square stays a miss
 f=make(S,mode);g=f.g;before={};for(const r of f.roles)before[r]=JSON.parse(JSON.stringify(f.view(r)));
 const prevSeq=g.stoneSeq;A(thr(mode,f,[4,4]));A.equal(g.stoneSeq,prevSeq,'nothing was pushed');
 seen=0;for(const r of f.roles){const v=f.view(r),l=lineFor(v,before[r]);if(l===null)continue;seen++;A.equal(l,'Missed.',mode+' '+r+': an empty square is a miss');}
 A(seen>0);
 // an old stone note from an earlier throw does not hide a new miss
 f=make(S,mode);g=f.g;if(mode==='5p')g.h.p=[4,3];else if(mode==='3p')g.three.h=[4,3];else{g.hunt.hs.hyena.p=[4,3];g.hunt.hs.badger.p=[8,0];}
 A(thr(mode,f,[4,3]));before={};for(const r of f.roles)before[r]=JSON.parse(JSON.stringify(f.view(r)));
 if(mode==='5p'){g.b.v1.stones=1;}else g.stones=1;
 A(thr(mode,f,[4,4]));for(const r of f.roles){const v=f.view(r),l=lineFor(v,before[r]);if(l===null)continue;A.equal(l,'Missed.',mode+' '+r+': a later empty throw is a miss again');}
}
console.log('PASS miss line: a stone that hits the badger or hyena says no "Missed." and pulses nothing; an empty square is still a miss');
process.exit(0);
