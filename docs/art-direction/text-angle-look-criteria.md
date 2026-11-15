# Poem text angle: look criteria (Art Director)

Companion to `TODO_POETRY_TEXT_ANGLE.md` (P3, deferred). That file quotes J R (Oct 29 2026):
"the only issue is the text is hard to read due to the angle at which it appears. its an
extremely minor issue and it does not need to be fixed now". It also says the audio timeline,
stanza delays and recruitment math are locked. This file does not schedule the fix; it says
what a fix must look like, so whoever builds it later knows when it is done.

Root cause per the TODO (VERIFIED as written there; line numbers may have moved): poem targets
rotate by `ang = t * 0.04`, which tilts the text plane away from the camera at some points in
the orbit.

## Look criteria for any fix
| # | Criterion | How judged |
|---|---|---|
| A1 | Every line is readable at every point in the orbit; no line foreshortens to the point a word cannot be read | Frame strip across one full orbit at full swirl speed |
| A2 | The poem still drifts and sways slowly as one piece and keeps facing the viewer; it is not frozen flat like a caption | Clip, by eye |
| A3 | Dots stay locked to their letters while readable; any depth curvature is gentle and shared by the whole poem | Clip + close crop |
| A4 | No halo, glow, dark backing or box appears to aid reading | Still |
| A5 | Swirl untouched: speed and v23.5 hue blend unchanged | Side by side with v23.5 |
| A6 | Audio timeline, stanza delays, recruitment count unchanged | Builder's timing diff, which must show no change |
| A7 | Group 1 keeps v23.6.1's position and tilt at mid-group unless J R asks otherwise | Still at mid-group, side by side |
| A8 | Reduced motion: with `prefers-reduced-motion`, text is flat to the viewer and still readable | Run with the media setting on |

A7 and the TODO's "camera-facing" plan can conflict. If they do, the Art Director raises it
once to Nimby for J R's call rather than picking.
