#!/usr/bin/env node
// Motion lane: timing check for site/poem-segments.json (per-group audio slices).
// Read-only. Prints one line per poem and lists every slice that breaks a motion rule.
// Usage: node tools/check_segments.mjs [path/to/poem-segments.json] [--json]
import { readFile } from 'node:fs/promises';

// Rules (Motion spec). FORM_LEAD: a group starts forming this long before its cue.
// MAX_OVERLAP: the alignment tool writes a 0.2 s cross-fade between neighbours.
// MAX_SHOWING: at most two groups may be on screen at once.
export const RULES = { FORM_LEAD: 0.6, MAX_OVERLAP: 0.2, MAX_SHOWING: 2, EPS: 0.011 };

export function checkPoem(id, poem, rules = RULES) {
  const s = poem.segs || [];
  const issues = [];
  for (let i = 0; i < s.length; i++) {
    const [a, b] = s[i];
    if (!(b > a)) issues.push({ id, i, kind: 'non-positive', a, b });
    if (a < -rules.EPS || b > poem.dur + rules.EPS) issues.push({ id, i, kind: 'outside-clip', a, b });
    if (b - a < rules.FORM_LEAD) issues.push({ id, i, kind: 'shorter-than-form-lead', a, b, len: +(b - a).toFixed(3) });
    if (i > 0) {
      const [pa, pb] = s[i - 1];
      if (a < pa) issues.push({ id, i, kind: 'start-not-monotonic', a, prevStart: pa });
      if (pb - a > rules.MAX_OVERLAP + rules.EPS) issues.push({ id, i, kind: 'overlap-too-long', overlap: +(pb - a).toFixed(3) });
    }
    if (i >= rules.MAX_SHOWING) {
      const showing = s.slice(i - rules.MAX_SHOWING, i).filter(([, pb]) => pb > a + rules.EPS).length + 1;
      if (showing > rules.MAX_SHOWING) issues.push({ id, i, kind: 'too-many-showing', showing, a });
    }
  }
  return issues;
}

export function checkAll(doc, rules = RULES) {
  return Object.entries(doc.poems || {}).map(([id, p]) => ({ id, groups: (p.segs || []).length, dur: p.dur, match: p.match, issues: checkPoem(id, p, rules) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const path = args.find(a => !a.startsWith('--')) || new URL('../site/poem-segments.json', import.meta.url);
  const doc = JSON.parse(await readFile(path, 'utf8'));
  const res = checkAll(doc);
  if (args.includes('--json')) { console.log(JSON.stringify(res, null, 2)); }
  else for (const r of res) {
    console.log(`${r.id}: ${r.groups} groups, ${r.dur} s, match ${r.match}, ${r.issues.length} issue(s)`);
    for (const x of r.issues) console.log('  ', JSON.stringify(x));
  }
  process.exitCode = res.some(r => r.issues.length) ? 1 : 0;
}
