const A=require('assert'),{create}=require('./public/status-queue');let now=0,timers=[],id=0,shown=[],hidden=[];
const q=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
function tick(ms){const end=now+ms;while(timers.some(t=>t.at<=end)){timers.sort((a,b)=>a.at-b.at||a.id-b.id);const t=timers.shift();now=t.at;t.fn();}now=end;}
q.add({text:'Bird near.',priority:10});q.add({text:'The hyena caught the vulture!',priority:50});q.add({text:'You were caught! You fled 2 squares.',priority:100});tick(0);A.equal(shown[0][0],'You were caught! You fled 2 squares.');tick(999);A.equal(shown.length,1);tick(1);A.equal(hidden[0][1]-shown[0][1],1000);A.equal(shown[1][0],'The hyena caught the vulture!');tick(1000);A.equal(shown[2][0],'Bird near.');tick(1000);A.equal(q.state().active,null);A.equal(q.state().pending.length,0);
// A new moment's line replaces the one already on screen and stays for its own full hold. The old line does not finish, and does not come back.
const q2=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
q2.add({text:'The vulture hunts eggs. The hyena hunts birds.',priority:20,hold:1000});tick(0);
A.equal(q2.state().active.text,'The vulture hunts eggs. The hyena hunts birds.');
tick(400);
q2.add({text:'You kicked the vulture 3 squares!',priority:100,hold:2000,preempt:true});
A.equal(q2.state().active.text,'You kicked the vulture 3 squares!','the new line is up at once');
A.equal(hidden.filter(x=>x[0].startsWith('The vulture hunts')).length,1,'the previous line was taken down');
tick(1999);A.equal(q2.state().active.text,'You kicked the vulture 3 squares!','it stays for the whole moment');
tick(1);A.equal(q2.state().active,null);A.ok(!q2.state().pending.some(x=>/hunts eggs/.test(x.text)),'the old line does not return');
q2.add({text:'You kicked the hyena 3 squares!',priority:100,hold:2000,preempt:true});tick(0);
tick(1000);q2.add({text:'You were caught! You fled 2 squares.',priority:100,hold:2000,preempt:true});
A.equal(q2.state().active.text,'You were caught! You fled 2 squares.');
q2.add({text:'The hyena caught the ostrich.',priority:90});
tick(400);q2.add({text:'The ostrich kicked the hyena 3 squares!',priority:50,hold:2000,preempt:true});
A.equal(q2.state().active.text,'The ostrich kicked the hyena 3 squares!','a line already waiting does not cover the new moment');
tick(2000);A.equal(q2.state().active.text,'The hyena caught the ostrich.');
console.log('PASS status queue: personal first, one at a time, one second each; a new moment replaces the line already up');
