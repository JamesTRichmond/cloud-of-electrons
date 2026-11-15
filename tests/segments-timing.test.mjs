import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { checkAll } from '../tools/check_segments.mjs';

const doc = JSON.parse(await readFile(new URL('../site/poem-segments.json', import.meta.url), 'utf8'));
const res = checkAll(doc);
const key = x => `${x.id}#${x.i}:${x.kind}`;

// Issues present on main at 790c6ed (Motion lane review, Nov 14 2026). Each one is a real
// timing defect waiting on a decision; listing them here keeps CI green while making any NEW
// defect fail. Remove an entry when its slice is fixed.
const KNOWN = new Set([
  'ttcem-bound-ing#46:shorter-than-form-lead', // 296.80-297.00, zero-word slice
  'ttcem-bound-ing#47:too-many-showing',       // 3 groups on screen at 296.80
  'ttcem-bound-ing#50:shorter-than-form-lead', // 309.80-310.00, zero-word slice
  'ttcem-bound-ing#51:too-many-showing',       // 3 groups on screen at 309.80
  'ttcem-jagged-rocks#0:shorter-than-form-lead', // 0.00-0.26
]);

test('every poem has slices inside its clip, in order, with at most a 0.2 s overlap', () => {
  for (const r of res) for (const x of r.issues) {
    assert.ok(['shorter-than-form-lead', 'too-many-showing'].includes(x.kind), `${key(x)} ${JSON.stringify(x)}`);
  }
});

test('no new short slices or 3-group overlaps beyond the known list', () => {
  const found = res.flatMap(r => r.issues.map(key));
  const added = found.filter(k => !KNOWN.has(k));
  assert.deepEqual(added, [], 'new timing defects: ' + added.join(', '));
});

test('known defects are still present (remove fixed ones from KNOWN)', () => {
  const found = new Set(res.flatMap(r => r.issues.map(key)));
  const gone = [...KNOWN].filter(k => !found.has(k));
  assert.deepEqual(gone, [], 'fixed, please drop from KNOWN: ' + gone.join(', '));
});
