// Motion timing for Cloud of Electrons. No audio here: the background drone was removed in v18;
// sound belongs to Open Field only.
// Readable stage: letters' dots are locked to their glyphs; the whole poem drifts/sways slowly as one
// rigid piece, facing the viewer. Jitter only during gather (forming) and scatter (breaking apart).
export const T = { gather:2.4, scatter:5.0, perWord:0.6, readBase:4, readCap:24, gapMin:20, gapMax:60,
  maxDriftFrac:0.03,   // max drift speed: 3% of the poem's width per second
  maxTiltRad:0.06 };   // max sway angle, ~3.4 degrees; no spinning
export const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
export const smoothstep = (a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// Reading time: 0.6 s per word + 4 s per group of up to 4 lines, capped at 24 s. This is how long the
// poem stays readable while it drifts, not a still hold.
export const readFor = text => { const words=text.trim().split(/\s+/).length, lines=text.split('\n').filter(l=>l.trim()).length;
  return Math.min(T.readCap, T.perWord*words + T.readBase*Math.max(1,Math.ceil(lines/4))); };
export const holdFor = readFor; // legacy name
// Per-section feel. drift/sway are 0..1 fractions of the caps above; every section moves while readable.
export const SECTIONS = {
  'What Passes Through': {gather:2.0, readMul:0.9, scatter:3.2, drift:1.0, sway:0.6, repeatSooner:false},
  'What Sticks Around':  {gather:3.2, readMul:1.3, scatter:7.0, drift:0.4, sway:0.3, repeatSooner:false},
  'What Circles Back':   {gather:2.4, readMul:1.0, scatter:5.0, drift:0.6, sway:1.0, repeatSooner:true},
};
const DEF={gather:T.gather,readMul:1,scatter:T.scatter,drift:0.6,sway:0.5};
// Returns {phase:'gather'|'read'|'scatter'|'done', p, offsetX, offsetY (fractions of poem width), tilt (rad)}.
// Offsets are smooth sines, so speed never exceeds maxDriftFrac*drift and there are no jerks.
export function poemTimeline(text, start, now, section, seed=0){
  const S=SECTIONS[section]||DEF, r=Math.min(T.readCap*S.readMul, readFor(text)*S.readMul), e=now-start;
  const w=0.25, A=T.maxDriftFrac*S.drift/w; // amplitude so peak speed A*w == cap
  const m={offsetX:A*Math.sin(w*e+seed), offsetY:0.5*A*Math.sin(0.7*w*e+seed*1.7), tilt:T.maxTiltRad*S.sway*Math.sin(0.18*e+seed*0.6)};
  if(e<S.gather) return {phase:'gather',p:easeInOut(e/S.gather),...m};
  if(e<S.gather+r) return {phase:'read',p:(e-S.gather)/r,...m};
  if(e<S.gather+r+S.scatter) return {phase:'scatter',p:(e-S.gather-r)/S.scatter,...m};
  return {phase:'done',p:1,...m};
}
export const nextGap = ()=> T.gapMin + Math.random()*(T.gapMax-T.gapMin);
// Shuffle bag; ids in `sooner` get a second slot per cycle so Circles Back poems return early.
export function shuffleBag(ids, sooner=[]){let bag=[];return ()=>{if(!bag.length){bag=[...ids,...sooner].sort(()=>Math.random()-.5);}return bag.pop();};}
