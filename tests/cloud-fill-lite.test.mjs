import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const src = await readFile(new URL('../site/cloud-fill.js', import.meta.url), 'utf8');
function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}
// frameMs: simulated time between animation frames for the probe.
function load({ search, store, frameMs } = {}) {
  const timers = [];
  const window = {};
  if (store) window.localStorage = store;
  const sandbox = { window, URLSearchParams, setTimeout: f => timers.push(f) };
  if (search !== undefined) sandbox.location = { search };
  if (frameMs !== undefined) {
    let t = 0;
    sandbox.requestAnimationFrame = f => { t += frameMs; f(t); };
  }
  vm.runInNewContext(src, sandbox);
  timers.forEach(f => f());
  return { fill: JSON.parse(JSON.stringify(window.COE_FILL)), tier: window.COE_FILL_TIER, source: window.COE_FILL_TIER_SOURCE, probe: window.COE_FILL_PROBE_MS };
}
const total = f => f.reduce((s, l) => s + l.count, 0);

test('default URL keeps the full table', () => {
  const r = load({ search: '' });
  assert.equal(r.tier, 'full');
  assert.equal(total(r.fill), 297000);
});

test('no browser globals keeps the full table', () => {
  assert.equal(total(load().fill), 297000);
});

test('?fill=lite keeps near and mid, halves the rest, keeps shapes', () => {
  const full = load({ search: '' }).fill, r = load({ search: '?fill=lite' });
  assert.equal(r.tier, 'lite');
  r.fill.forEach((l, i) => {
    const want = (l.name === 'near' || l.name === 'mid') ? full[i].count : Math.round(full[i].count / 2);
    assert.equal(l.count, want, l.name);
    for (const f of ['inner', 'outer', 'size', 'brightness', 'swirl']) assert.equal(l[f], full[i][f], `${l.name}.${f}`);
  });
  assert.equal(total(r.fill), 199500);
});

test('URL choice is saved and beats a saved tier', () => {
  const store = memStore({ coe_fill_tier: 'lite' });
  const r = load({ search: '?fill=full', store });
  assert.equal(r.tier, 'full');
  assert.equal(store.getItem('coe_fill_tier'), 'full');
});

test('saved tier applies on the next visit', () => {
  const r = load({ search: '', store: memStore({ coe_fill_tier: 'lite' }) });
  assert.equal(r.tier, 'lite');
  assert.equal(r.source, 'saved');
  assert.equal(total(r.fill), 199500);
});

test('slow probe marks the device lite for next visit, current visit stays full', () => {
  const store = memStore();
  const r = load({ search: '', store, frameMs: 40 });
  assert.equal(r.tier, 'full');
  assert.equal(r.probe, 40);
  assert.equal(store.getItem('coe_fill_tier'), 'lite');
  assert.equal(load({ search: '', store }).tier, 'lite');
});

test('fast probe marks the device full', () => {
  const store = memStore();
  load({ search: '', store, frameMs: 16 });
  assert.equal(store.getItem('coe_fill_tier'), 'full');
});

test('probe does not run when a tier was already chosen', () => {
  const store = memStore({ coe_fill_tier: 'full' });
  const r = load({ search: '', store, frameMs: 40 });
  assert.equal(r.probe, undefined);
  assert.equal(store.getItem('coe_fill_tier'), 'full');
});

test('unknown fill values and junk saved values fall back to full', () => {
  assert.equal(load({ search: '?fill=ultra' }).tier, 'full');
  assert.equal(load({ search: '', store: memStore({ coe_fill_tier: 'x' }) }).tier, 'full');
});
