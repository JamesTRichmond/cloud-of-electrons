// Motion timing for Cloud of Electrons: poem phases, gaps between poems, and shuffle order.
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

