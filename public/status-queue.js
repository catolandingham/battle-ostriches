// One status at a time. Each line stays up long enough to read: at least one second, and 0.3 seconds a word for a longer line (the same rule as SURPRISE.holdFor).
// Batch a frame so personal events go first.
(function(root){
 function create({show,hide,blocked=()=>false,schedule=setTimeout,cancel=clearTimeout,hold=1000,wordMs=300}){
  const words=t=>(String(t||'').trim().match(/\S+/g)||[]).length;
  const holdOf=item=>item.hold==null?Math.max(hold,words(item.text)*wordMs):item.hold;
  let pending=[],active=null,timer=null,serial=0,resumeN=0;
  function pump(){timer=null;if(active||!pending.length)return;if(blocked()){timer=schedule(pump,100);return;}
   pending.sort((a,b)=>(b.resume||0)-(a.resume||0)||b.priority-a.priority||a.order-b.order);active=pending.shift();show(active);
   timer=schedule(()=>{hide(active);active=null;timer=schedule(pump,0);},holdOf(active));
  }
  return {add(item){if(!item||!item.text)return;const key=item.key||item.text;
   if(active&&active.key===key||pending.some(x=>x.key===key))return;
   const entry={...item,key,priority:item.priority==null?50:item.priority,order:serial++};
   // A new big moment replaces whatever line is already up, so the words and the card start together.
   // Anything still waiting stays waiting. It must not cover this moment's line.
   // A big moment goes up at once. The line it covers is not thrown away: it waits and then plays for its full reading time.
   if(item.preempt){if(timer!=null)cancel(timer);timer=null;if(active){const back={...active,resume:++resumeN};delete back.node;pending.unshift(back);hide(active);}active=entry;show(active);
    timer=schedule(()=>{hide(active);active=null;timer=schedule(pump,0);},holdOf(entry));return;}
   pending.push(entry);
   if(!active&&timer==null)timer=schedule(pump,0);
  },drop(pred){if(typeof pred!=='function')return;pending=pending.filter(item=>!pred(item));
   if(active&&pred(active)){if(timer!=null)cancel(timer);timer=null;hide(active);active=null;if(pending.length)timer=schedule(pump,0);}
  },clear(){if(timer!=null)cancel(timer);timer=null;if(active)hide(active);active=null;pending=[];},state:()=>({active,pending:pending.slice()})};
 }
 if(typeof module!=='undefined')module.exports={create};
 if(typeof document==='undefined')return;
 root.STATUS_QUEUE=create({blocked:()=>{const c=document.getElementById('rolecard');return !!c&&!c.classList.contains('hidden');},show(item){
  const slot=document.getElementById('msgslot');if(!slot)return;
  if(item.id){const old=document.getElementById(item.id);if(old)old.remove();}
  const e=document.createElement('div');e.id=item.id||'';e.className=(item.className||'')+' status-active';e.textContent=item.text;
  e.setAttribute('role','status');e.setAttribute('aria-live','polite');item.node=e;slot.dataset.statusActive='1';slot.appendChild(e);
  const banner=document.getElementById('banner'),tip=document.getElementById('tipbar');
  if(banner)banner.classList.add('held');if(tip)tip.classList.add('held');
  if(root.BADGER_BUBBLE_PAUSE)root.BADGER_BUBBLE_PAUSE();
  const h=Math.max(44,e.scrollHeight||44);slot.style.minHeight=h+'px';
 },hide(item){if(item&&item.node)item.node.remove();const slot=document.getElementById('msgslot');
  if(slot&&!slot.querySelector('.status-active')){delete slot.dataset.statusActive;slot.style.minHeight='';
   const banner=document.getElementById('banner'),tip=document.getElementById('tipbar');
   if(banner)banner.classList.remove('held');if(tip)tip.classList.remove('held');
   if(root.BADGER_BUBBLE_RESUME)root.BADGER_BUBBLE_RESUME();
  }}});
})(typeof window==='undefined'?globalThis:window);
