import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Import site/motion.js byte-for-byte (same pattern as map-touch.test.mjs): no package manifest needed.
const src = await readFile(new URL('../site/motion.js', import.meta.url), 'utf8');
const M = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const { T, SECTIONS, poemTimeline, readFor, easeInOut } = M;

const POEM = 'one two three four five\nsix seven eight\nnine ten\neleven twelve thirteen\nfourteen';
const sections = [...Object.keys(SECTIONS), 'Unknown section'];

test('phases run gather -> read -> scatter -> done, in order and never backwards', () => {
  const order = ['gather', 'read', 'scatter', 'done'];
  for (const sec of sections) for (const seed of [0, 1.3, 4.7]) {
    let last = 0;
    for (let e = 0; e <= 60; e += 0.01) {
      const k = order.indexOf(poemTimeline(POEM, 0, e, sec, seed).phase);
      assert.ok(k >= last, `${sec} seed ${seed}: phase went backwards at ${e.toFixed(2)} s`);
      last = k;
    }
    assert.equal(last, 3, `${sec}: never reached done`);
  }
});

test('progress p stays in [0,1]', () => {
  for (const sec of sections) for (let e = 0; e <= 60; e += 0.05) {
    const { p } = poemTimeline(POEM, 0, e, sec, 0);
    assert.ok(p >= 0 && p <= 1, `${sec} p=${p} at ${e}`);
  }
});

test('drift speed never exceeds maxDriftFrac of poem width per second (no jerks)', () => {
  const dt = 1 / 120;
  for (const sec of sections) for (const seed of [0, 2.1]) {
    let prev = poemTimeline(POEM, 0, 0, sec, seed);
    for (let e = dt; e <= 60; e += dt) {
      const cur = poemTimeline(POEM, 0, e, sec, seed);
      const v = Math.hypot(cur.offsetX - prev.offsetX, cur.offsetY - prev.offsetY) / dt;
      assert.ok(v <= T.maxDriftFrac * 1.0001 * Math.hypot(1, 0.5 * 0.7), `${sec}: drift ${v.toFixed(4)}/s at ${e.toFixed(2)}`);
      assert.ok(Math.abs(cur.offsetX - prev.offsetX) / dt <= T.maxDriftFrac * 1.0001, `${sec}: x drift over cap at ${e.toFixed(2)}`);
      prev = cur;
    }
  }
});

test('sway never exceeds maxTiltRad (about 3.4 degrees), so the poem never spins', () => {
  for (const sec of sections) for (let e = 0; e <= 120; e += 0.05) {
    const { tilt } = poemTimeline(POEM, 0, e, sec, 3);
    assert.ok(Math.abs(tilt) <= T.maxTiltRad + 1e-12, `${sec} tilt ${tilt} at ${e}`);
  }
});

test('reading time follows 0.6 s/word + 4 s per 4 lines, capped at readCap', () => {
  assert.equal(readFor('a b c'), 0.6 * 3 + 4);
  assert.equal(readFor('a\nb\nc\nd\ne'), 0.6 * 5 + 8);
  assert.equal(readFor(Array(200).fill('w').join(' ')), T.readCap);
});

test('read phase length respects the section multiplier and the scaled cap', () => {
  for (const [name, S] of Object.entries(SECTIONS)) {
    const r = Math.min(T.readCap * S.readMul, readFor(POEM) * S.readMul);
    assert.equal(poemTimeline(POEM, 0, S.gather + r - 1e-6, name).phase, 'read');
    assert.equal(poemTimeline(POEM, 0, S.gather + r + 1e-6, name).phase, 'scatter');
  }
});

test('readOverride (audio-locked groups) replaces the computed reading time exactly', () => {
  const S = SECTIONS['What Passes Through'];
  assert.equal(poemTimeline(POEM, 10, 10 + S.gather + 7.25 - 1e-6, 'What Passes Through', 0, 7.25).phase, 'read');
  assert.equal(poemTimeline(POEM, 10, 10 + S.gather + 7.25 + 1e-6, 'What Passes Through', 0, 7.25).phase, 'scatter');
});

test('gather easing starts at 0, ends at 1, and is monotonic', () => {
  assert.equal(easeInOut(0), 0); assert.equal(easeInOut(1), 1);
  let prev = 0; for (let x = 0; x <= 1; x += 0.001) { const y = easeInOut(x); assert.ok(y >= prev - 1e-12); prev = y; }
});
