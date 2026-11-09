// One status at a time, about one second each. Batch a frame so personal events go first.
(function(root){
 function create({show,hide,blocked=()=>false,schedule=setTimeout,cancel=clearTimeout,hold=1000}){
  let pending=[],active=null,timer=null,serial=0;
  function pump(){timer=null;if(active||!pending.length)return;if(blocked()){timer=schedule(pump,100);return;}
   pending.sort((a,b)=>b.priority-a.priority||a.order-b.order);active=pending.shift();show(active);
   timer=schedule(()=>{hide(active);active=null;timer=schedule(pump,0);},active.hold==null?hold:active.hold);
  }
  return {add(item){if(!item||!item.text)return;const key=item.key||item.text;
   if(active&&active.key===key||pending.some(x=>x.key===key))return;
   pending.push({...item,key,priority:item.priority==null?50:item.priority,order:serial++});
   if(!active&&timer==null)timer=schedule(pump,0);
  },clear(){if(timer!=null)cancel(timer);timer=null;if(active)hide(active);active=null;pending=[];},state:()=>({active,pending:pending.slice()})};
 }
 if(typeof module!=='undefined')module.exports={create};
 if(typeof document==='undefined')return;
 root.STATUS_QUEUE=create({blocked:()=>{const c=document.getElementById('rolecard');return !!c&&!c.classList.contains('hidden');},show(item){
  const slot=document.getElementById('msgslot');if(!slot)return;
  if(item.id){const old=document.getElementById(item.id);if(old)old.remove();}
  const e=document.createElement('div');e.id=item.id||'';e.className=(item.className||'')+' status-active';e.textContent=item.text;
  e.setAttribute('role','status');e.setAttribute('aria-live','polite');item.node=e;slot.dataset.statusActive='1';slot.appendChild(e);
 },hide(item){if(item&&item.node)item.node.remove();const slot=document.getElementById('msgslot');if(slot)delete slot.dataset.statusActive;}});
})(typeof window==='undefined'?globalThis:window);
