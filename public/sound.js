// Battle Ostriches sound effects, synthesized with WebAudio (no audio files).
// Sound stays off until the speaker button. A later tap resumes it only if that choice is still on.
(function(){
let ctx=null,master=null;
const saved=()=>{try{return localStorage.getItem('bo_muted');}catch(e){return null;}};
const enabled=()=>saved()==='0';
let muted=!enabled();
const ON='<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const OFF='<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function silentWav(){const n=800,b=new Uint8Array(44+n),v=new DataView(b.buffer),w=(o,t)=>{for(let i=0;i<t.length;i++)b[o+i]=t.charCodeAt(i);};
 w(0,'RIFF');v.setUint32(4,36+n,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);
 v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,'data');v.setUint32(40,n,true);b.fill(128,44);
 let bin='';b.forEach(x=>bin+=String.fromCharCode(x));return 'data:audio/wav;base64,'+btoa(bin);}
let tag=null;
function session(){try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}}
function level(v){if(!ctx||!master)return;const t=ctx.currentTime;try{master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(v,t);}catch(e){}}
function bus(){if(!ctx)return null;if(!master||master.context!==ctx){master=ctx.createGain();master.connect(ctx.destination);}level(muted?0:1);return master;}
function clip(){if(tag)return tag;tag=document.createElement('audio');tag.src=silentWav();tag.loop=true;tag.setAttribute('playsinline','');tag.setAttribute('x-webkit-airplay','deny');tag.preload='auto';tag.setAttribute('aria-hidden','true');(document.body||document.documentElement).appendChild(tag);return tag;}
function boot(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
 session();
 if(ctx&&(ctx.state==='closed'||ctx.state==='interrupted')){try{ctx.close();}catch(e){}ctx=null;master=null;}
 if(!ctx)ctx=new A();
 const out=bus();
 if(ctx.state!=='running')ctx.resume().catch(()=>{});
 try{const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(out);s.start(0);}catch(e){}
 const a=clip();if(muted)a.pause();else if(a.paused){const p=a.play();p&&p.catch(()=>{});}}
function resumeIfOn(){if(!enabled())return;muted=false;boot();}
['touchend','click'].forEach(e=>document.addEventListener(e,resumeIfOn,{capture:true,passive:false}));
function paint(){const on=enabled(),label=on?'Sound on':'Sound off',html=on?ON:OFF;
 ['soundBtn','lobbySound','muteBtn'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=html;el.setAttribute('aria-label',label);el.setAttribute('aria-pressed',on?'true':'false');});
 ['menuSound','muteBtn2'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.textContent=label;el.setAttribute('aria-label',label);});}
function start(){try{localStorage.setItem('bo_muted','0');}catch(e){}muted=false;boot();paint();}
function stop(){try{localStorage.setItem('bo_muted','1');}catch(e){}muted=true;level(0);if(tag)tag.pause();paint();}
function tone(f,dur,{type='sine',vol=.25,at=0,to=null}={}){const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(bus());o.start(t);o.stop(t+dur+.02);}
function noise(dur,{vol=.3,at=0,freq=1000,q=1,type='bandpass'}={}){const t=ctx.currentTime+at,n=ctx.sampleRate*dur|0,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource();s.buffer=b;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
 const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(bus());s.start(t);}
const FX={
 thud(){tone(110,.25,{to:45,vol:.5});noise(.12,{freq:300,vol:.35});},
 crack(){FX.thud();noise(.08,{freq:3500,q:3,vol:.4,at:.06});noise(.1,{freq:2200,q:4,vol:.35,at:.12});tone(900,.12,{type:'square',vol:.08,at:.08,to:300});},
 whoosh(){noise(.45,{freq:1400,q:1.5,vol:.12});tone(500,.4,{vol:.04,to:250});},
 smash(){FX.crack();noise(.3,{freq:600,type:'lowpass',vol:.35,at:.1});tone(180,.25,{type:'triangle',vol:.12,at:.12,to:90});noise(.06,{freq:4500,q:5,vol:.3,at:.2});},
 miss(){noise(.25,{freq:500,type:'lowpass',vol:.18});},
 feather(){FX.thud();noise(.35,{freq:6000,q:.7,vol:.12,at:.08});},
 fly(){for(let i=0;i<3;i++)noise(.13,{freq:700,q:.8,vol:.3,at:i*.16});},
 step(){noise(.06,{freq:250,vol:.3});noise(.06,{freq:220,vol:.25,at:.14});},
 place(){tone(300,.1,{vol:.2});tone(450,.12,{vol:.18,at:.08});},
 scrape(){noise(.18,{freq:900,q:.6,vol:.3});noise(.18,{freq:700,q:.6,vol:.25,at:.2});},
 sniffYes(){noise(.08,{freq:2500,q:2,vol:.2});noise(.08,{freq:2500,q:2,vol:.2,at:.12});tone(880,.2,{vol:.12,at:.25,to:1320});},
 sniffNo(){noise(.08,{freq:2000,q:2,vol:.15});tone(330,.25,{vol:.1,at:.12,to:220});},
 turn(){tone(784,.18,{vol:.18});tone(1175,.3,{vol:.15,at:.12});},
 warn(){tone(660,.12,{type:'triangle',vol:.2});tone(660,.12,{type:'triangle',vol:.2,at:.18});},
 cold(){tone(880,.5,{type:'triangle',vol:.18,to:220});noise(.4,{freq:5000,q:.5,vol:.06});},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,.35,{type:'triangle',vol:.2,at:i*.12}));},
 lose(){[392,330,262,196].forEach((f,i)=>tone(f,.4,{type:'sawtooth',vol:.08,at:i*.18}));},
};
window.SFX={play(n){if(!enabled()||!ctx||ctx.state!=='running'||!FX[n])return;try{FX[n]();}catch(e){}},get state(){return ctx?ctx.state:'none'},
 get muted(){return !enabled();},start,stop,toggle(){if(enabled())stop();else start();return !enabled();},
 icon(id){const on=enabled();return `<button type="button" id="${id}" class="soundbtn" aria-pressed="${on?'true':'false'}" aria-label="${on?'Sound on':'Sound off'}">${on?ON:OFF}</button>`;},
 paint,names:Object.keys(FX)};
paint();
})();
