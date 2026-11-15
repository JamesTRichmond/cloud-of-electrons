// Electric-field cursor: pure motion math (Motion lane prototype).
// No DOM, no WebGL. The prototype and the tests both import this file, and the
// vertex shader in index.html mirrors fieldDisplacement() line for line.
// Units: the field acts in aspect-corrected NDC (screen space after projection),
// so it is independent of camera, depth and particle count.

export const FIELD = {
  K: 0.0012,      // field strength (ndc^3); peak before the cap ~ K/EPS^2 = 0.33
  EPS: 0.06,      // softening radius: no singularity under the pointer
  R_CUT: 0.35,    // hard cutoff radius (ndc); a smooth window takes the force to 0 here
  MAX_DISP: 0.06, // displacement cap (ndc) ~ 3% of screen height
  DT_MAX: 0.05,   // same capped scene step as site/index.html L1984
  W_ON: 14,       // critically damped spring rate (rad/s) when the pointer arrives
  W_OFF: 8,       // ... when the pointer leaves / finger lifts (slower, calmer return)
  W_POS: 20,      // pointer position smoothing
};

export const LEVELS = {
  N: 4,
  scale: n => 1 + 0.18 * (n - 1),      // cloud radius multiplier per level
  bright: n => 1 - 0.07 * (n - 1),     // brightness multiplier per level (reduced mode uses only this)
  UP_S: 0.9,  UP_EASE: [0.16, 1, 0.3, 1],     // absorb: quick lift, long settle
  DOWN_S: 1.2, DOWN_EASE: [0.65, 0, 0.35, 1], // emit: symmetric ease-in-out
  REDUCED_S: 0.4,                              // reduced: linear brightness cross-fade only
  WHEEL_STEP_PX: 120,                          // wheel distance per level
  LOCK_FRAC: 0.5,                              // ignore new steps until the running transition is half done
};

export const PULSE = {
  DUR: 0.6, R0: 0.03, R1: 0.75, WIDTH: 0.05, // screen-space ring (aspect-corrected ndc) around the cloud centre
  PEAK: 0.8,      // ring dots reach at most 1.8x their brightness (the current flash goes to 2.8x, L191)
  EASE: [0.33, 1, 0.68, 1], // ease-out cubic: the ring leaves fast and slows as it fades
  MIN_GAP_S: 60,  // shared budget with the lightning flash (docs/motion/flash-cap-spec.md)
};

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Softened Coulomb magnitude with a smooth window that reaches exactly 0 at R_CUT.
export function fieldMagnitude(r, o = FIELD) {
  if (r >= o.R_CUT) return 0;
  const win = 1 - (r * r) / (o.R_CUT * o.R_CUT);
  return (o.K / (r * r + o.EPS * o.EPS)) * win * win;
}

// Soft-saturating cap: MAX*tanh(F/MAX). Never exceeds MAX, ~linear for small F.
export const capDisp = (f, max = FIELD.MAX_DISP) => max * Math.tanh(f / max);

// Displacement of one particle at ndc (x,y) from pointer (px,py).
// gain: pointer strength spring (0..1) * reading guard; te: text weight (1 = letter dot).
// reduced: prefers-reduced-motion -> always zero travel.
export function fieldDisplacement(x, y, px, py, aspect, gain, te = 0, reduced = false, o = FIELD) {
  if (reduced || gain <= 0 || te >= 1) return [0, 0];
  const dx = (x - px) * aspect, dy = y - py, r = Math.hypot(dx, dy);
  if (r >= o.R_CUT || r < 1e-9) return [0, 0];
  const m = capDisp(fieldMagnitude(r, o), o.MAX_DISP) * gain * (1 - te);
  return [(dx / r) * m / aspect, (dy / r) * m]; // repulsive: pointer and electrons share a sign
}

// Reading guard: 1 far from the text rect, 0 inside it and in a margin around it.
// rect = [cx, cy, halfW, halfH] in ndc.
export function textGuard(x, y, rect, margin = 0.15) {
  if (!rect) return 1;
  const qx = Math.abs(x - rect[0]) - rect[2], qy = Math.abs(y - rect[1]) - rect[3];
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
  return smoothstep(0, margin, outside);
}

// Exact critically damped spring step toward a constant target.
// Closed form, so the result after T seconds is the same at any frame rate.
export function springStep(state, target, w, dt) {
  dt = clamp(dt, 0, FIELD.DT_MAX);
  const y0 = state.x - target, v0 = state.v, e = Math.exp(-w * dt);
  const y = (y0 + (v0 + w * y0) * dt) * e;
  const v = (v0 - w * (v0 + w * y0) * dt) * e;
  return { x: target + y, v };
}

// Pointer strength: 1 while the field is on (mouse over canvas / finger down), 0 otherwise.
export function strengthStep(state, on, dt) {
  return springStep(state, on ? 1 : 0, on ? FIELD.W_ON : FIELD.W_OFF, dt);
}

// CSS cubic-bezier(x1,y1,x2,y2) as an easing function of t in [0,1].
export function cubicBezier(x1, y1, x2, y2) {
  const bx = s => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = s => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  return t => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 40; i++) { s = (lo + hi) / 2; if (bx(s) < t) lo = s; else hi = s; }
    return by(s);
  };
}

// Energy levels. Transitions are time-based (scene seconds), so they are frame-rate independent.
export function createLevels(reduced = false) {
  return { n: 1, from: 1, to: 1, t0: -1e9, dur: 0, ease: [0, 0, 1, 1], acc: 0, reduced };
}

export function levelProgress(L, t) {
  if (L.dur <= 0) return 1;
  return clamp((t - L.t0) / L.dur, 0, 1);
}

// Request a step of +1 (up/absorb) or -1 (down/emit). Returns 'up' | 'down' | null.
export function requestLevel(L, dir, t) {
  if (levelProgress(L, t) < LEVELS.LOCK_FRAC) return null;
  const target = clamp(L.to + dir, 1, LEVELS.N);
  if (target === L.to) return null;
  const cur = levelValue(L, t);
  L.from = cur; L.to = target; L.t0 = t; L.n = target;
  const up = dir > 0;
  if (L.reduced) { L.dur = LEVELS.REDUCED_S; L.ease = [0, 0, 1, 1]; }
  else { L.dur = up ? LEVELS.UP_S : LEVELS.DOWN_S; L.ease = up ? LEVELS.UP_EASE : LEVELS.DOWN_EASE; }
  return up ? 'up' : 'down';
}

// Wheel input -> level steps. deltaMode 0=px, 1=lines(16px), 2=pages(innerHeight).
export function wheelToLevel(L, deltaY, deltaMode, t, pageH = 800) {
  const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageH : 1);
  L.acc += px;
  if (Math.abs(L.acc) < LEVELS.WHEEL_STEP_PX) return null;
  const dir = L.acc > 0 ? 1 : -1; // scroll down = climb to a higher (larger) shell
  L.acc = 0;
  return requestLevel(L, dir, t);
}

// Continuous level value (fractional during a transition).
export function levelValue(L, t) {
  const p = levelProgress(L, t), e = cubicBezier(...L.ease)(p);
  return L.from + (L.to - L.from) * e;
}

// What the renderer needs this frame.
export function levelUniforms(L, t) {
  const v = levelValue(L, t), lerp = (f) => { const a = Math.floor(v), b = Math.min(LEVELS.N, a + 1); return f(a) + (f(b) - f(a)) * (v - a); };
  return { scale: L.reduced ? 1 : lerp(LEVELS.scale), bright: lerp(LEVELS.bright), value: v };
}

// Photon pulse gate: one budget shared with the lightning flash. Returns true if the pulse may fire.
export function createPulseGate() { return { lastT: -1e9, t0: -1e9 }; }
export function tryPulse(g, t, { reduced = false, reading = false } = {}) {
  if (reduced || reading) return false;
  if (t - g.lastT < PULSE.MIN_GAP_S) return false;
  g.lastT = t; g.t0 = t; return true;
}

// Pulse ring at scene time t: radius and gain (0 when idle).
export function pulseState(g, t) {
  const e = t - g.t0;
  if (e < 0 || e >= PULSE.DUR) return { radius: 0, gain: 0 };
  const p = e / PULSE.DUR, k = cubicBezier(...PULSE.EASE)(p);
  return { radius: PULSE.R0 + (PULSE.R1 - PULSE.R0) * k, gain: PULSE.PEAK * (1 - p) * (1 - p) };
}

// Brightness gain for a particle at screen distance d (aspect-corrected ndc) from the cloud centre.
export function pulseBrightness(d, ps) {
  if (ps.gain <= 0) return 0;
  const x = (d - ps.radius) / PULSE.WIDTH;
  return ps.gain * Math.exp(-x * x);
}
