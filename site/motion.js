// Motion timing + drone engine for Cloud of Electrons. Consumes SignalFrame {energy,swirl,coherence,depth,attractor}.
export const T = { gather:2.4, scatter:5.0, perWord:0.6, holdBase:4, holdCap:24, gapMin:20, gapMax:60 };
export const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
export const smoothstep = (a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
export const holdFor = text => Math.min(T.holdCap, T.holdBase + T.perWord*text.trim().split(/\s+/).length);
// Poem phase scheduler: returns {phase, p} where p is 0..1 within phase.
// Per-section motion: passes = drifts while held, fast scatter; sticks = long anchored hold; circles = orbiting, returns sooner.
export const SECTIONS = {
  'What Passes Through': {gather:2.0, holdMul:0.8, scatter:3.2, drift:0.25, orbit:0,   repeatSooner:false},
  'What Sticks Around':  {gather:3.2, holdMul:1.4, scatter:7.0, drift:0,    orbit:0,   repeatSooner:false},
  'What Circles Back':   {gather:2.4, holdMul:1.0, scatter:5.0, drift:0,    orbit:0.08,repeatSooner:true},
};
export function poemTimeline(text, start, now, section){
  const S=SECTIONS[section]||{gather:T.gather,holdMul:1,scatter:T.scatter,drift:0,orbit:0};
  const h=Math.min(T.holdCap*S.holdMul, holdFor(text)*S.holdMul), e=now-start, x={drift:S.drift*e, orbit:S.orbit*e*2*Math.PI};
  if(e<S.gather) return {phase:'gather',p:easeInOut(e/S.gather),...x};
  if(e<S.gather+h) return {phase:'hold',p:(e-S.gather)/h,...x};
  if(e<S.gather+h+S.scatter) return {phase:'scatter',p:(e-S.gather-h)/S.scatter,...x};
  return {phase:'done',p:1};
}
export const nextGap = ()=> T.gapMin + Math.random()*(T.gapMax-T.gapMin);
// Shuffle bag so no poem repeats until most have shown.
// Shuffle bag; ids listed in `sooner` get a second slot per cycle so Circles Back poems return early.
export function shuffleBag(ids, sooner=[]){let bag=[];return ()=>{if(!bag.length){bag=[...ids,...sooner].sort(()=>Math.random()-.5);}return bag.pop();};}

// Intervals (semitones) per placeholder spot; ROOT is placeholder until J R's Spotify picks.
export const ROOT_HZ = 55; // A1 placeholder
export const INTERVALS = {'brain-fog':-12,'agenticubed':7,'preincarnation':9,'verbal-kombat':6,'habitat':4};
export class Drone {
  constructor(){this.ctx=null;}
  start(){ // call only from a user tap
    const c=this.ctx=new AudioContext(); const now=c.currentTime;
    this.master=c.createGain(); this.master.gain.value=0;
    const lim=c.createDynamicsCompressor(); lim.threshold.value=-6; lim.ratio.value=20; lim.attack.value=.003;
    this.filter=c.createBiquadFilter(); this.filter.type='lowpass'; this.filter.frequency.value=400;
    this.pan=c.createStereoPanner();
    this.filter.connect(this.pan).connect(this.master).connect(lim).connect(c.destination);
    this.partials=[1,2,3,4,5,6].map(n=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=ROOT_HZ*n;g.gain.value=.18/n;o.connect(g).connect(this.filter);o.start(now);return {o,n};});
    this.voices={}; for(const [id,st] of Object.entries(INTERVALS)){const o=c.createOscillator(),g=c.createGain();o.frequency.value=ROOT_HZ*2*Math.pow(2,st/12);g.gain.value=0;o.connect(g).connect(this.filter);o.start(now);this.voices[id]=g;}
    this.rot=0; this.master.gain.setTargetAtTime(Math.pow(10,-18/20),now,.5);
  }
  update(f,dt){ if(!this.ctx) return; const c=this.ctx,t=c.currentTime;
    const det=35*(1-smoothstep(.2,.85,f.coherence));
    this.partials.forEach(({o,n},i)=>o.detune.setTargetAtTime((i%2?1:-1)*det*(n>1?1:0),t,.3));
    this.filter.frequency.setTargetAtTime(200*Math.pow(20,f.energy),t,.08);
    this.master.gain.setTargetAtTime(Math.pow(10,(-30+18*f.energy)/20),t,.08);
    this.rot+=dt*2*Math.PI*(.02+.38*Math.sqrt(f.swirl)); this.pan.pan.setTargetAtTime(Math.sin(this.rot)*.6,t,.05);
    for(const [id,g] of Object.entries(this.voices)) g.gain.setTargetAtTime(id===f.attractor?.08*(1-f.depth):0,t,id===f.attractor?1.5:.7);
  }
  poemTone(){ if(!this.ctx) return; const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
    o.frequency.value=ROOT_HZ*4; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+1.2); g.gain.setTargetAtTime(0,t+4,1.2);
    o.connect(g).connect(this.filter); o.start(t); o.stop(t+10); }
  mute(on){ if(this.ctx) on?this.ctx.suspend():this.ctx.resume(); }
}
