import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD, LEVELS, PULSE, fieldMagnitude, fieldDisplacement, capDisp, textGuard, springStep, strengthStep,
  cubicBezier, createLevels, requestLevel, wheelToLevel, levelUniforms, levelProgress,
  createPulseGate, tryPulse, pulseState,
} from '../prototypes/electric-field/field.mjs';

test('force falls off with distance and is exactly zero at and beyond the cutoff', () => {
  let prev = Infinity;
  for (let r = FIELD.EPS; r < FIELD.R_CUT; r += 0.01) {
    const f = fieldMagnitude(r);
    assert.ok(f < prev, `not decreasing at r=${r.toFixed(2)}`);
    prev = f;
  }
  assert.equal(fieldMagnitude(FIELD.R_CUT), 0);
  assert.equal(fieldMagnitude(1), 0);
  // softened: finite under the pointer
  assert.ok(Number.isFinite(fieldMagnitude(0)));
  // roughly inverse-square in the middle band (window removed)
  const raw = r => fieldMagnitude(r) / (1 - (r * r) / FIELD.R_CUT ** 2) ** 2;
  const ratio = raw(0.1) / raw(0.2);
  assert.ok(ratio > 3 && ratio < 4, `inverse-square ratio ${ratio}`);
});

test('displacement never exceeds the cap and points away from the pointer', () => {
  let maxSeen = 0;
  for (let x = -0.4; x <= 0.4; x += 0.005) for (let y = -0.4; y <= 0.4; y += 0.005) {
    const [dx, dy] = fieldDisplacement(x, y, 0, 0, 1, 1);
    const m = Math.hypot(dx, dy);
    maxSeen = Math.max(maxSeen, m);
    if (m > 0) assert.ok(dx * x + dy * y > 0, 'repulsive');
  }
  assert.ok(maxSeen <= FIELD.MAX_DISP + 1e-12, `max ${maxSeen}`);
  assert.ok(maxSeen > 0.9 * FIELD.MAX_DISP, 'cap is actually reached near the pointer');
  assert.ok(capDisp(1e9) <= FIELD.MAX_DISP);
});

test('letter dots and the text margin are never displaced', () => {
  assert.deepEqual(fieldDisplacement(0.1, 0, 0, 0, 1, 1, 1), [0, 0]);
  const rect = [0, 0, 0.3, 0.1];
  assert.equal(textGuard(0, 0, rect), 0);
  assert.equal(textGuard(0.35, 0, rect) < 1, true);
  assert.equal(textGuard(0.6, 0, rect), 1);
  assert.equal(textGuard(0.6, 0, null), 1);
});

test('reduced motion yields zero displacement everywhere', () => {
  for (let x = -0.3; x <= 0.3; x += 0.01) {
    assert.deepEqual(fieldDisplacement(x, 0.05, 0, 0, 1.6, 1, 0, true), [0, 0]);
  }
  const L = createLevels(true);
  requestLevel(L, +1, 0);
  assert.equal(levelUniforms(L, 0.2).scale, 1, 'no size travel in reduced mode');
  assert.ok(levelUniforms(L, 1).bright < 1, 'level still shown by brightness');
  assert.equal(L.dur, LEVELS.REDUCED_S);
});

test('spring returns to rest without overshoot (critically damped)', () => {
  let s = { x: 1, v: 0 };
  let min = Infinity;
  for (let i = 0; i < 600; i++) { s = strengthStep(s, false, 1 / 120); min = Math.min(min, s.x); }
  assert.ok(min >= 0, `overshoot to ${min}`);
  assert.ok(s.x < 1e-3, `settled to ${s.x}`);
  // and the attack does not overshoot 1
  s = { x: 0, v: 0 };
  let max = -Infinity;
  for (let i = 0; i < 600; i++) { s = strengthStep(s, true, 1 / 120); max = Math.max(max, s.x); }
  assert.ok(max <= 1 + 1e-12, `overshoot to ${max}`);
});

test('frame-rate independence: 30, 60 and 120 fps reach the same state', () => {
  const run = fps => {
    let s = { x: 0, v: 0 }, t = 0; const dt = 1 / fps;
    for (let i = 0; i < fps * 2; i++) { t += dt; s = strengthStep(s, t <= 1 + 1e-9, dt); }
    return s.x;
  };
  const a = run(30), b = run(60), c = run(120);
  assert.ok(Math.abs(a - b) < 1e-6 && Math.abs(b - c) < 1e-6, `${a} ${b} ${c}`);
  // displacement inherits it: same gain -> same offset
  const d = fps => fieldDisplacement(0.12, 0.05, 0, 0, 1.5, run(fps))[0];
  assert.ok(Math.abs(d(30) - d(120)) < 1e-6);
});

test('a stalled frame is capped at the scene step (dt <= 0.05)', () => {
  const big = springStep({ x: 1, v: 0 }, 0, FIELD.W_OFF, 2.0);
  const capped = springStep({ x: 1, v: 0 }, 0, FIELD.W_OFF, FIELD.DT_MAX);
  assert.deepEqual(big, capped);
});

test('cubic-bezier easing hits its endpoints and is monotonic for the level curves', () => {
  for (const c of [LEVELS.UP_EASE, LEVELS.DOWN_EASE, PULSE.EASE]) {
    const f = cubicBezier(...c);
    assert.equal(f(0), 0); assert.equal(f(1), 1);
    let prev = -1; for (let t = 0; t <= 1; t += 0.01) { const y = f(t); assert.ok(y >= prev - 1e-9); prev = y; }
  }
  assert.ok(Math.abs(cubicBezier(0.65, 0, 0.35, 1)(0.5) - 0.5) < 1e-6, 'symmetric curve passes 0.5');
});

test('levels: scroll steps clamp to 1..N and lock until half done', () => {
  const L = createLevels(false);
  assert.equal(wheelToLevel(L, 60, 0, 0), null, 'below the wheel step');
  assert.equal(wheelToLevel(L, 60, 0, 0), 'up');
  assert.equal(requestLevel(L, +1, 0.1), null, 'locked mid-transition');
  assert.equal(requestLevel(L, +1, LEVELS.UP_S * 0.6), 'up');
  requestLevel(L, +1, 10); assert.equal(L.to, LEVELS.N);
  assert.equal(requestLevel(L, +1, 20), null, 'clamped at N');
  assert.equal(levelProgress(L, 100), 1);
  assert.ok(Math.abs(levelUniforms(L, 100).scale - LEVELS.scale(LEVELS.N)) < 1e-9);
  assert.equal(wheelToLevel(L, -3, 1, 30), null, 'lines mode: 48 px');
  assert.equal(wheelToLevel(L, -5, 1, 30), 'down');
});

test('photon pulse: at most one per 60 s, never in reduced mode or while reading', () => {
  const g = createPulseGate();
  let fired = 0;
  for (let t = 0; t < 180; t += 0.25) if (tryPulse(g, t)) fired++;
  assert.equal(fired, 3, '180 s of constant requests -> 3 pulses');
  const g2 = createPulseGate();
  assert.equal(tryPulse(g2, 100, { reduced: true }), false);
  assert.equal(tryPulse(g2, 100, { reading: true }), false);
  // WCAG 2.3.1: never more than 3 in any 1 s window (trivially, never 2 in 60 s)
  const times = []; const g3 = createPulseGate();
  for (let t = 0; t < 120; t += 1 / 60) if (tryPulse(g3, t)) times.push(t);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= PULSE.MIN_GAP_S - 1e-9);
});

test('pulse ring expands, fades to zero and stays under its peak', () => {
  const g = createPulseGate(); tryPulse(g, 0);
  let prevR = 0;
  for (let t = 0; t < PULSE.DUR; t += 0.02) {
    const s = pulseState(g, t);
    assert.ok(s.radius >= prevR); prevR = s.radius;
    assert.ok(s.gain <= PULSE.PEAK + 1e-12);
  }
  assert.equal(pulseState(g, PULSE.DUR).gain, 0);
});
