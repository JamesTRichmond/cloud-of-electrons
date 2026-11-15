# Segment timing check (Motion lane)

`tools/check_segments.mjs` reads `site/poem-segments.json` (the per-group audio slices that v23.6.1 uses to lock each group to Hugh's clip) and checks every slice against the Motion rules:

| Rule | Value | Why |
| --- | --- | --- |
| Slice is inside the clip, end > start | `0 <= a < b <= dur` | a group can't play audio that doesn't exist |
| Starts are in order | `a[i] >= a[i-1]` | groups follow the voice |
| Neighbour overlap | <= 0.2 s | the aligner's cross-fade; more means two groups fight for the same words |
| Slice length | >= 0.6 s | a group forms 0.6 s before its cue; a shorter slice can't become readable |
| Groups showing at once | <= 2 | at most two groups on screen |

Run: `node tools/check_segments.mjs` (report) or `node --test tests/segments-timing.test.mjs` (CI-style).
Nothing under `site/` changes; this PR deploys nothing even after merge.

## Findings on `main` at 790c6ed (VERIFIED, Nov 14 2026)

| Poem | Slice | Time (s) | Problem |
| --- | --- | --- | --- |
| ttcem-bound-ing | 46 | 296.80–297.00 | 0.20 s slice (zero-length after the 0.2 s overlap), 3 groups on screen at 296.80 |
| ttcem-bound-ing | 50 | 309.80–310.00 | same pattern, 3 groups on screen at 309.80 |
| ttcem-jagged-rocks | 0 | 0.00–0.26 | 0.26 s slice; slice 1 starts at 0.06, so the two first groups overlap almost completely |

All other public poems pass. Low alignment confidence worth a listen (REPORTED by the file's own `match` field, not a rule failure): `ttcem-halloween-again` 0.79, `ttcem-fabulous` 0.85.

INFERENCE (medium confidence): the two bound-ing slices look like groups the aligner found no words for, so it wrote `[prevEnd-0.2, prevEnd]`. A listen against the poem text, or the aligner's word log, would confirm it. The fix belongs to whoever owns `story/build.py` / the alignment step; this PR only detects it. The test lists these as KNOWN so CI stays green and any new defect fails.
