import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = async (p) => JSON.parse(await readFile(new URL('../site/' + p, import.meta.url), 'utf8'));
const cues = await load('word-cues.json');
const meta = await load('word-cues.meta.json');
const segs = (await load('poem-segments.json')).poems;
const manifest = await load('glyphs/manifest.json');
const byId = Object.fromEntries(manifest.poems.map((p) => [p.id, p]));
const TOL = 0.25;
const ids = Object.keys(cues);

test('word-cues.json has the consumer shape and no top-level metadata', () => {
  assert.ok(ids.length > 0);
  for (const id of ids) {
    assert.match(id, /^ttcem-/, `${id} is a poem id`);
    assert.deepEqual(Object.keys(cues[id]), ['groups']);
    for (const g of cues[id].groups) {
      assert.ok(Array.isArray(g.words) && g.words.length > 0);
      for (const w of g.words) {
        assert.equal(typeof w.w, 'string');
        assert.equal(typeof w.t0, 'number');
        assert.equal(typeof w.t1, 'number');
      }
    }
  }
});

test('excluded poems are absent', () => {
  const banned = /dinosaur-footprints|halloween-again|goliath|friends-til/;
  for (const id of ids) {
    assert.ok(!banned.test(id), `${id} must not be in word-cues.json`);
    assert.ok(!/Dinosaur Footprints|Halloween Again|Goliath|Friends Til/i.test(byId[id]?.title ?? ''));
  }
  for (const id of Object.keys(meta.poems)) assert.ok(!banned.test(id));
});

test('groups match poem-segments.json order and count', () => {
  for (const id of ids) {
    assert.ok(segs[id], `${id} has segments`);
    assert.equal(cues[id].groups.length, segs[id].segs.length, id);
  }
});

test('word text concatenation equals the page group text', () => {
  for (const id of ids) {
    byId[id].groups.forEach((g, gi) => {
      // site/index.html L253: text = g.lines.join(' '); words split on whitespace
      const page = g.lines.join(' ').split(/\s+/).filter(Boolean).join(' ');
      const got = cues[id].groups[gi].words.map((w) => w.w).join(' ');
      assert.equal(got, page, `${id} group ${gi}`);
    });
  }
});

test('times are monotonic per poem and within the clip', () => {
  for (const id of ids) {
    let prev = -Infinity;
    for (const g of cues[id].groups) for (const w of g.words) {
      assert.ok(w.t1 >= w.t0, `${id} "${w.w}" t1 >= t0`);
      assert.ok(w.t0 >= prev, `${id} "${w.w}" t0 ${w.t0} >= ${prev}`);
      assert.ok(w.t0 >= 0 && w.t1 <= segs[id].dur + TOL, `${id} "${w.w}" inside clip`);
      prev = w.t0;
    }
  }
});

test('every word sits inside its group segment (+/-0.25 s) except the reported violations', () => {
  const found = [];
  for (const id of ids) cues[id].groups.forEach((g, gi) => {
    const [s, e] = segs[id].segs[gi];
    g.words.forEach((w, wi) => {
      if (w.t0 < s - TOL || w.t1 > e + TOL) found.push(`${id}|${gi}|${wi}`);
    });
  });
  const reported = Object.entries(meta.poems).flatMap(([id, p]) => p.segment_violations.map((v) => `${id}|${v.g}|${v.w}`));
  // the meta file must list exactly the out-of-segment words, so none can hide
  assert.deepEqual(found.sort(), reported.sort());
  // and the list must stay small: these are segment-file issues to fix, not a licence to drift
  assert.ok(found.length <= 8, `${found.length} violations`);
});

test('interpolated share stays low per poem', () => {
  for (const id of ids) {
    const ws = cues[id].groups.flatMap((g) => g.words).filter((w) => !w.silent);
    const interp = ws.filter((w) => w.interp).length;
    assert.ok(interp / ws.length <= 0.05, `${id} interp ${interp}/${ws.length}`);
  }
});
