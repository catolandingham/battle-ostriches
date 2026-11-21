const A=require('assert'),{create}=require('./public/status-queue');let now=0,timers=[],id=0,shown=[],hidden=[];
const q=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
function tick(ms){const end=now+ms;while(timers.some(t=>t.at<=end)){timers.sort((a,b)=>a.at-b.at||a.id-b.id);const t=timers.shift();now=t.at;t.fn();}now=end;}
q.add({text:'Bird near.',priority:10});q.add({text:'The hyena caught the vulture!',priority:50});q.add({text:'You were caught! You fled 2 squares.',priority:100});tick(0);A.equal(shown[0][0],'You were caught! You fled 2 squares.');tick(2099);A.equal(shown.length,1,'7 words: up for 2.1s');tick(1);A.equal(hidden[0][1]-shown[0][1],2100);A.equal(shown[1][0],'The hyena caught the vulture!');tick(1499);A.equal(shown.length,2,'5 words: up for 1.5s');tick(1);A.equal(shown[2][0],'Bird near.');tick(1000);A.equal(q.state().active,null,'2 words: the 1s floor');A.equal(q.state().pending.length,0);
// A new moment's line goes up at once and stays for its own full hold. The line it covered waits, then plays whole.
const q2=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
q2.add({text:'The vulture hunts eggs. The hyena hunts birds.',priority:20,hold:1000});tick(0);
A.equal(q2.state().active.text,'The vulture hunts eggs. The hyena hunts birds.');
tick(400);
q2.add({text:'You kicked the vulture 3 squares!',priority:100,hold:2000,preempt:true});
A.equal(q2.state().active.text,'You kicked the vulture 3 squares!','the new line is up at once');
A.equal(hidden.filter(x=>x[0].startsWith('The vulture hunts')).length,1,'the previous line was taken down');
A.ok(q2.state().pending.some(x=>/hunts eggs/.test(x.text)),'the covered line waits');
tick(1999);A.equal(q2.state().active.text,'You kicked the vulture 3 squares!','it stays for the whole moment');
tick(1);A.equal(q2.state().active.text,'The vulture hunts eggs. The hyena hunts birds.','the covered line comes back whole');
tick(1000);A.equal(q2.state().active,null);
q2.add({text:'You kicked the hyena 3 squares!',priority:100,hold:2000,preempt:true});tick(0);
tick(1000);q2.add({text:'You were caught! You fled 2 squares.',priority:100,hold:2000,preempt:true});
A.equal(q2.state().active.text,'You were caught! You fled 2 squares.');
A.equal(q2.state().pending[0].text,'You kicked the hyena 3 squares!','the line that was up waits its turn');
q2.add({text:'The hyena caught the ostrich.',priority:90});
tick(400);q2.add({text:'The ostrich kicked the hyena 3 squares!',priority:50,hold:2000,preempt:true});
A.equal(q2.state().active.text,'The ostrich kicked the hyena 3 squares!','a line already waiting does not cover the new moment');
tick(2000);A.equal(q2.state().active.text,'You were caught! You fled 2 squares.');
// A near warning waiting behind Look out! is dropped, so it cannot replace the beat.
const q3=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
const near=item=>/\bnear[!.]?$/i.test((item.text||'').trim());
q3.add({text:'Hyena near!',priority:10,hold:1000});tick(0);
A.equal(q3.state().active.text,'Hyena near!');
q3.drop(near);
q3.add({text:'Look out!',priority:120,hold:1000,preempt:true});
A.equal(q3.state().active.text,'Look out!');
q3.add({text:'Hyena near!',priority:10,hold:1000});
A.equal(q3.state().pending.length,1);
q3.drop(near);
A.equal(q3.state().pending.length,0,'a near line waiting during the beat is dropped');
tick(1000);
A.equal(q3.state().active,null);
A.ok(!shown.some(x=>x[0]==='Hyena near!'&&x[1]>shown.find(y=>y[0]==='Look out!')[1]),'Hyena near! does not follow Look out!');
// A near line already on screen is taken down when Look out! starts, so the two cannot stack.
const q4=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
q4.add({text:'Hyena near!',priority:10,hold:1000});tick(0);
A.equal(q4.state().active.text,'Hyena near!');
q4.drop(near);
A.equal(q4.state().active,null,'the near line that was up is removed');
q4.add({text:'Look out!',priority:120,hold:1000,preempt:true});
A.equal(q4.state().active.text,'Look out!');
A.equal(q4.state().pending.length,0);
// A line with no hold of its own stays up 1s, or 0.3s a word when longer: a 24-word badger quote is not a one-second flash.
const q5=create({show:x=>shown.push([x.text,now]),hide:x=>hidden.push([x.text,now]),schedule:(fn,ms)=>{timers.push({fn,at:now+ms,id:++id});return id;},cancel:i=>timers=timers.filter(t=>t.id!==i)});
const quote='The badger has been referred to by the Guinness Book of World Records as the most fearless animal in all of the animal kingdom.';
q5.add({text:quote,priority:0});tick(0);A.equal(q5.state().active.text,quote);tick(7199);A.equal(q5.state().active.text,quote,'24 words: up for 7.2s');tick(1);A.equal(q5.state().active,null);
q5.add({text:'Badger popped up!',priority:0});tick(0);tick(999);A.ok(q5.state().active,'3 words: still the 1s floor');tick(1);A.equal(q5.state().active,null);
console.log('PASS status queue: personal first, one at a time, each line up long enough to read (1s, or 0.3s a word); a new moment goes up at once and the covered line comes back');
