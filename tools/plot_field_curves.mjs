// Renders the electric-field timing curves as SVG from the same math the prototype uses.
// Usage: node tools/plot_field_curves.mjs   -> docs/motion/img/field-*.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import { FIELD, LEVELS, PULSE, fieldMagnitude, capDisp, strengthStep, cubicBezier,
  createPulseGate, tryPulse, pulseState } from '../prototypes/electric-field/field.mjs';

const OUT = new URL('../docs/motion/img/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const W = 640, H = 360, M = { l: 62, r: 18, t: 40, b: 46 };
const COLORS = ['#6b9aff', '#f4e1bc', '#fad685', '#9be3c6', '#ff8a7a'];

function chart({ title, xlab, ylab, xmax, ymax, ymin = 0, series, marks = [], steps = false }) {
  const X = x => M.l + (x / xmax) * (W - M.l - M.r), Y = y => H - M.b - ((y - ymin) / (ymax - ymin)) * (H - M.t - M.b);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Georgia,serif" font-size="12">`;
  s += `<rect width="${W}" height="${H}" fill="#05070d"/><text x="${M.l}" y="22" fill="#EDE6D6" font-size="14">${title}</text>`;
  for (let i = 0; i <= 5; i++) {
    const xv = xmax * i / 5, yv = ymin + (ymax - ymin) * i / 5;
    s += `<line x1="${X(xv)}" y1="${M.t}" x2="${X(xv)}" y2="${H - M.b}" stroke="#ffffff14"/><text x="${X(xv)}" y="${H - M.b + 16}" fill="#9aa" text-anchor="middle">${+xv.toFixed(3)}</text>`;
    s += `<line x1="${M.l}" y1="${Y(yv)}" x2="${W - M.r}" y2="${Y(yv)}" stroke="#ffffff14"/><text x="${M.l - 6}" y="${Y(yv) + 4}" fill="#9aa" text-anchor="end">${+yv.toFixed(3)}</text>`;
  }
  s += `<text x="${(M.l + W - M.r) / 2}" y="${H - 8}" fill="#cbc" text-anchor="middle">${xlab}</text>`;
  s += `<text transform="translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)" fill="#cbc" text-anchor="middle">${ylab}</text>`;
  for (const m of marks) s += `<line x1="${X(m.x)}" y1="${M.t}" x2="${X(m.x)}" y2="${H - M.b}" stroke="${m.color || '#ff8a7a'}" stroke-dasharray="4 4"/><text x="${X(m.x) + 4}" y="${M.t + 12}" fill="${m.color || '#ff8a7a'}">${m.label}</text>`;
  series.forEach((se, k) => {
    const c = se.color || COLORS[k % COLORS.length];
    if (se.dots) for (const [x, y] of se.pts) s += `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${se.r || 2}" fill="${c}"/>`;
    else s += `<polyline fill="none" stroke="${c}" stroke-width="2" ${se.dash ? 'stroke-dasharray="5 4"' : ''} points="${se.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/>`;
    s += `<rect x="${W - M.r - 300}" y="${M.t + 4 + k * 16}" width="300" height="16" fill="#05070dcc"/><rect x="${W - M.r - 294}" y="${M.t + 6 + k * 16}" width="10" height="10" fill="${c}"/><text x="${W - M.r - 279}" y="${M.t + 15 + k * 16}" fill="#EDE6D6">${se.name}</text>`;
  });
  return s + '</svg>\n';
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
const save = (name, svg) => { writeFileSync(new URL(name, OUT), svg); console.log('wrote docs/motion/img/' + name); };

// 1. Force falloff
save('field-1-force-falloff.svg', chart({
  title: 'Pointer field: displacement vs distance (aspect-corrected ndc)', xlab: 'distance from pointer r', ylab: 'displacement',
  xmax: 0.4, ymax: 0.08, marks: [{ x: FIELD.EPS, label: 'EPS', color: '#9be3c6' }, { x: FIELD.R_CUT, label: 'R_CUT' }],
  series: [
    { name: 'raw K/(r²+EPS²)·window', pts: range(0, 0.4, 200).map(r => [r, Math.min(0.08, fieldMagnitude(r))]), dash: true },
    { name: 'used: MAX·tanh(F/MAX)', pts: range(0, 0.4, 200).map(r => [r, capDisp(fieldMagnitude(r))]) },
    { name: `cap MAX_DISP=${FIELD.MAX_DISP}`, pts: [[0, FIELD.MAX_DISP], [0.4, FIELD.MAX_DISP]], color: '#ff8a7a', dash: true },
  ] }));

// 2. Strength spring at 30/60/120 fps: on at t=0, off at t=1.0
const springRun = fps => { const pts = [[0, 0]]; let s = { x: 0, v: 0 }, t = 0; for (let i = 0; i < fps * 2.2; i++) { t += 1 / fps; s = strengthStep(s, t <= 1 + 1e-9, 1 / fps); pts.push([t, s.x]); } return pts; };
save('field-2-strength-spring.svg', chart({
  title: `Field strength: critically damped, on ω=${FIELD.W_ON}, off ω=${FIELD.W_OFF} rad/s`, xlab: 'seconds', ylab: 'field gain',
  xmax: 2.2, ymax: 1.1, marks: [{ x: 0, label: 'pointer enters', color: '#9be3c6' }, { x: 1, label: 'pointer leaves' }],
  series: [{ name: '120 fps', pts: springRun(120), color: '#6b9aff' }, { name: '60 fps', pts: springRun(60), dots: true, r: 2.2, color: '#fad685' }, { name: '30 fps', pts: springRun(30), dots: true, r: 3, color: '#ff8a7a' }] }));

// 3. Energy level transitions
const curve = (dur, ease) => range(0, 1.4, 280).map(t => [t, cubicBezier(...ease)(Math.min(1, t / dur))]);
save('field-3-level-transitions.svg', chart({
  title: 'Energy-level transitions (normalised progress)', xlab: 'seconds', ylab: 'progress n_from → n_to',
  xmax: 1.4, ymax: 1.05,
  series: [
    { name: `up/absorb ${LEVELS.UP_S}s cubic-bezier(${LEVELS.UP_EASE})`, pts: curve(LEVELS.UP_S, LEVELS.UP_EASE) },
    { name: `down/emit ${LEVELS.DOWN_S}s cubic-bezier(${LEVELS.DOWN_EASE})`, pts: curve(LEVELS.DOWN_S, LEVELS.DOWN_EASE) },
    { name: `reduced ${LEVELS.REDUCED_S}s linear (brightness only)`, pts: curve(LEVELS.REDUCED_S, [0, 0, 1, 1]), dash: true },
  ] }));

// 4. Photon pulse
const g = createPulseGate(); tryPulse(g, 0);
save('field-4-photon-pulse.svg', chart({
  title: `Photon pulse: ${PULSE.DUR}s, ring radius ease cubic-bezier(${PULSE.EASE}), gain (1-p)²`, xlab: 'seconds after a downward transition starts', ylab: 'value',
  xmax: 0.7, ymax: 1,
  series: [
    { name: `ring radius (ndc, R1=${PULSE.R1})`, pts: range(0, 0.7, 140).map(t => [t, pulseState(g, t).radius]) },
    { name: `brightness gain (peak ${PULSE.PEAK})`, pts: range(0, 0.7, 140).map(t => [t, pulseState(g, t).gain]) },
  ] }));

// 5. Flash-cap budget: a level-down request every 4 s for 180 s
const g2 = createPulseGate(), req = [], fired = [];
for (let t = 0; t < 180; t += 4) { req.push([t, 0.3]); if (tryPulse(g2, t)) fired.push([t, 0.7]); }
save('field-5-pulse-cap.svg', chart({
  title: 'Pulse budget shared with the lightning flash: max 1 per 60 s', xlab: 'seconds', ylab: '',
  xmax: 180, ymax: 1, marks: [{ x: 60, label: '60 s' }, { x: 120, label: '120 s' }],
  series: [{ name: 'level-down requests (every 4 s)', pts: req, dots: true, r: 3, color: '#6b9aff' }, { name: `pulses fired (${fired.length})`, pts: fired, dots: true, r: 5, color: '#fad685' }] }));
