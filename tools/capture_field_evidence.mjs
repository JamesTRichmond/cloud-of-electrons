// Headless-Chrome evidence for prototypes/electric-field (Motion lane).
// Usage: python3 -m http.server 8790 &   (from the repo root)
//        CHROME=/usr/bin/google-chrome OUT=/tmp/ef-evidence node tools/capture_field_evidence.mjs
// Follows the CDP pattern of test_cdp_*.js. Writes PNG stills and evidence.json to OUT.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = process.env.OUT || './ef-evidence';
const BASE = process.env.BASE || 'http://127.0.0.1:8790/prototypes/electric-field/index.html';
const PORT = 9581;
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-sandbox', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--window-size=1280,800', '--user-data-dir=/tmp/ef-chrome-profile', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const cb = new Map();
for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); const j = await r.json(); const pg = j.find(x => x.type === 'page'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && cb.has(m.id)) { const { res, rej } = cb.get(m.id); cb.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; cb.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64')); return `${OUT}/${name}.png`; };
const load = async (q, media = []) => {
  await send('Emulation.setEmulatedMedia', { features: media });
  await send('Page.navigate', { url: BASE + q }); await sleep(2500);
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
const result = { base: BASE, stills: {}, notes: [] };

// 1. before: idle cloud, no pointer
await load('?n=120000');
result.stills.before_idle = await shot('01_before_idle');
// 2. after: pointer field on at (0.35, 0.1) ndc, settled
await ev(`__efApi.pointer(0.35,0.1,true)`); await sleep(1200);
result.gainSettled = await ev(`__ef.gain`);
result.stills.after_field = await shot('02_after_field_on');
// 3. reading guard: text visible, pointer over the text, field must not move letters
await ev(`__efApi.setReading(true); __efApi.pointer(0.05,0.0,true)`); await sleep(1200);
result.stills.reading_guard = await shot('03_reading_guard_pointer_on_text');
await ev(`__efApi.setReading(false); __efApi.pointer(0,0,false)`); await sleep(1500);
result.gainReleased = await ev(`__ef.gain`);
// 4. level up twice, then down: pulse ring mid-flight
await ev(`__efApi.step(1)`); await sleep(1000); await ev(`__efApi.step(1)`); await sleep(1100);
result.levelAfterUp = await ev(`({level:__ef.level, scale:__ef.scale})`);
result.stills.level3 = await shot('04_level3');
await ev(`__efApi.step(-1)`); await sleep(60);
result.pulseFired = await ev(`__ef.pulses`);
// screenshots take ~0.3 s here, longer than the ring's visible life, so pin the ring's elapsed time for the stills
for (const [e, name] of [[0.06, '05a_pulse_t060ms'], [0.15, '05b_pulse_t150ms'], [0.3, '05c_pulse_t300ms']]) {
  await ev(`__efApi.pinPulse(${e})`); await sleep(150);
  result['pulse_' + name] = await ev(`__ef.pulse`); result.stills[name] = await shot(name);
}
await ev(`__efApi.pinPulse(null)`);
await sleep(1500);
await ev(`__efApi.step(-1)`); await sleep(200);
result.secondDownWithin60s = await ev(`({pulses:__ef.pulses, gain:__ef.pulse.gain})`);
// 5. frame time over 5 s (swiftshader software GL, so not a GPU number)
await ev(`__efApi.pointer(0.2,0.0,true)`); await sleep(5000);
result.frameMs = await ev(`(()=>{const a=__ef.frameMs.slice(-240).sort((x,y)=>x-y);return {n:a.length, avg:a.reduce((s,x)=>s+x,0)/a.length, p50:a[a.length>>1], p95:a[Math.floor(a.length*.95)], particles:__ef.particles}})()`);
// 6. reduced motion (emulated media): pointer + level change -> no travel, no pulse
await load('?n=120000', [{ name: 'prefers-reduced-motion', value: 'reduce' }]);
result.stills.reduced_before = await shot('06_reduced_no_pointer');
await ev(`__efApi.pointer(0.35,0.1,true)`); await sleep(1200);
result.stills.reduced_pointer = await shot('07_reduced_pointer_on');
await ev(`__efApi.step(1)`); await sleep(600);
result.reduced = await ev(`({reduced:__ef.reduced, gain:__ef.gain, scale:__ef.scale, bright:__ef.bright, level:__ef.level})`);
await ev(`__efApi.step(-1)`); await sleep(200);
result.reducedPulses = await ev(`__ef.pulses`);
result.stills.reduced_level2 = await shot('08_reduced_level2_after_down');
writeFileSync(`${OUT}/evidence.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
ws.close(); chrome.kill();
