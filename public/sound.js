// Battle Ostriches sound effects, synthesized with WebAudio (no audio files). Mute persists in localStorage.
(function(){
let ctx=null,muted=localStorage.getItem('bo_muted')==='1';
function unlock(){if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ctx=new A();}
 if(ctx.state==='suspended')ctx.resume();
 const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0);}
['touchend','click','keydown'].forEach(e=>document.addEventListener(e,unlock,{capture:true,passive:true}));
function tone(f,dur,{type='sine',vol=.25,at=0,to=null}={}){const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+.02);}
function noise(dur,{vol=.3,at=0,freq=1000,q=1,type='bandpass'}={}){const t=ctx.currentTime+at,n=ctx.sampleRate*dur|0,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource();s.buffer=b;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
 const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(ctx.destination);s.start(t);}
const FX={
 thud(){tone(110,.25,{to:45,vol:.5});noise(.12,{freq:300,vol:.35});},
 crack(){FX.thud();noise(.08,{freq:3500,q:3,vol:.4,at:.06});noise(.1,{freq:2200,q:4,vol:.35,at:.12});tone(900,.12,{type:'square',vol:.08,at:.08,to:300});},
 miss(){noise(.25,{freq:500,type:'lowpass',vol:.18});},
 feather(){FX.thud();noise(.35,{freq:6000,q:.7,vol:.12,at:.08});},
 fly(){for(let i=0;i<3;i++)noise(.13,{freq:700,q:.8,vol:.3,at:i*.16});},
 step(){noise(.06,{freq:250,vol:.3});noise(.06,{freq:220,vol:.25,at:.14});},
 place(){tone(300,.1,{vol:.2});tone(450,.12,{vol:.18,at:.08});},
 turn(){tone(784,.18,{vol:.18});tone(1175,.3,{vol:.15,at:.12});},
 warn(){tone(660,.12,{type:'triangle',vol:.2});tone(660,.12,{type:'triangle',vol:.2,at:.18});},
 cold(){tone(880,.5,{type:'triangle',vol:.18,to:220});noise(.4,{freq:5000,q:.5,vol:.06});},
 win(){[523,659,784,1047].forEach((f,i)=>tone(f,.35,{type:'triangle',vol:.2,at:i*.12}));},
 lose(){[392,330,262,196].forEach((f,i)=>tone(f,.4,{type:'sawtooth',vol:.08,at:i*.18}));},
};
window.SFX={play(n){if(muted||!ctx||!FX[n])return;try{if(ctx.state==='suspended')ctx.resume();FX[n]();}catch(e){}},
 get muted(){return muted},toggle(){muted=!muted;localStorage.setItem('bo_muted',muted?'1':'0');return muted;},names:Object.keys(FX)};
})();
