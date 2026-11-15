import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  PATHS,
  buildMirrorTiming,
  assertMirrorSafe,
  publicPoems,
  nonblankLines,
} from '../tools/build-mirror-timing.mjs';

const publicRaw = JSON.parse(await readFile(PATHS.publicPoems, 'utf8'));
const published = publicPoems(publicRaw);
const mirror = JSON.parse(await readFile(PATHS.out, 'utf8'));

test('mirror includes every public poem and no other poem', () => {
  const ids = mirror.poems.map(p => p.id);
  assert.deepEqual(ids.sort(), published.map(p => p.id).sort());
  assert.equal(mirror.poems.length, 19);
  for (const p of mirror.poems) assert.equal(p.public, true);
});

test('every mirror line appears verbatim in poems.public.json', () => {
  const problems = assertMirrorSafe(mirror, publicRaw);
  assert.deepEqual(problems, []);
  for (const poem of mirror.poems) {
    const pub = published.find(p => p.id === poem.id);
    const allowed = new Set(nonblankLines(pub.text));
    for (const g of poem.groups) {
      for (const line of g.lines) {
        assert.equal(allowed.has(line), true, `${poem.id}: ${JSON.stringify(line)}`);
      }
    }
  }
});

test('non-public glyph poems are not in the timing map', () => {
  const banned = new Set(['ttcem-dinosaur-footprints', 'ttcem-halloween-again']);
  for (const p of mirror.poems) {
    assert.equal(banned.has(p.id), false, `non-public poem present: ${p.id}`);
    assert.notEqual(p.title, 'Dinosaur Footprints');
    assert.notEqual(p.title, 'Halloween Again');
    const blob = JSON.stringify(p);
    assert.equal(blob.includes('Dinosaur Footprints'), false);
    assert.equal(blob.includes('Halloween Again'), false);
  }
  assert.deepEqual(mirror.drift.inManifestNotPublic, [
    'ttcem-dinosaur-footprints',
    'ttcem-halloween-again',
  ]);
});

test('builder output matches the committed timing map', () => {
  const fresh = buildMirrorTiming({ publicRaw });
  assert.deepEqual(fresh, mirror);
  assert.deepEqual(assertMirrorSafe(fresh, publicRaw), []);
});

test('on-page groups keep formStart 0, legible 0.5, and a derived scatter', () => {
  const onPage = mirror.poems.filter(p => p.onPage);
  assert.equal(onPage.length, 8);
  for (const p of onPage) {
    for (const g of p.groups) {
      assert.equal(g.formStart, 0);
      assert.equal(g.legible, 0.5);
      assert.equal(typeof g.scatter, 'number');
      assert.ok(g.scatter >= 0.9);
      assert.equal(g.timingSource, 'segTL');
      assert.equal(g.audioSlice.length, 2);
    }
  }
});

test('public poems not in the live manifest have null timings and a reason', () => {
  const off = mirror.poems.filter(p => !p.onPage);
  assert.equal(off.length, 11);
  for (const p of off) {
    assert.ok(p.groups.length > 0);
    for (const g of p.groups) {
      assert.equal(g.formStart, null);
      assert.equal(g.legible, null);
      assert.equal(g.scatter, null);
      assert.ok(g.nullReason && g.nullReason.length > 0);
    }
  }
});
