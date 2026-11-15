# Spec: keep the poem facing the viewer (text angle vs. scene clock) (Motion lane)

Status: root-cause note and proposal for the WebGL Builder. Docs only; nothing under `site/` changes in this PR.
Base: `main` at 790c6ed. Line numbers are `site/index.html` on that commit.
Related: `TODO_POETRY_TEXT_ANGLE.md` (James, 2026-10-29: text "hard to read due to the angle", "does not need to be fixed now"). Look criteria live on the Art Director's `ad/text-angle-look-criteria`; this note covers only the motion/clock cause. James decides whether and when the fix ships.

## What the code does (VERIFIED by reading it)
- L1984: `dt = min(0.05, frame gap)`; `t = nowMs/1000` (wall clock). The scene clock `st` (`window.__ST`) advances only by the clamped `dt`, so a stall or hidden tab doesn't jump the camera.
- L1996: the poem plane is rotated about Y by `ang = t * 0.04` (**wall clock**).
- L1996–1997: the camera/world yaw is `ra = st * 0.04` (**scene clock**). L2001 also feeds `st` to the shader as `t`.
- So the text's angle relative to the view is `(t − st) × 0.04` rad. `t − st` grows by every frame gap above 50 ms and never comes back.
- `site/motion.js` says the readable poem is "facing the viewer" with sway capped at `maxTiltRad` 0.06 rad (~3.4°), "no spinning".
- `TODO_POETRY_TEXT_ANGLE.md` cites lines 790–805; that code now lives at L1978/L1996 (the TODO's line numbers are stale).

## Size of the effect (arithmetic from the code, not measured)
| Accumulated stall (t − st) | Text yaw vs. view | vs. 0.06 rad sway cap |
| --- | --- | --- |
| 1.5 s | 0.06 rad (3.4°) | at the cap |
| 10 s | 0.40 rad (23°) | 7× |
| 39 s | 1.57 rad (90°) | edge-on, unreadable |

A hidden tab for a minute, or a slow device dropping below 20 fps, builds this up. `prefers-reduced-motion` users are not affected (both angles are 0).
INFERENCE (medium confidence): this is at least part of what James saw on 10-29. Logging `t - window.__ST` next to a still of a badly angled poem would confirm or rule it out.

## Proposed fix (Builder's call on exact form)
Drive the text plane from the same clock as the camera: `ang = reduced ? 0 : st * 0.04` (or reuse `ra`). One token; no change to audio, slices, gather/read/scatter, recruitment or density.
The full billboard rework in the TODO stays deferred unless James asks for it.

## Acceptance
- Throttle to ~10 fps for 30 s, then read a poem: `|ang − ra| < 1e-6` every frame, and the text stays within the ±0.06 rad sway.
- Unthrottled stills before/after are identical within noise (the two clocks match when nothing stalls).
- No timing diff: `segTL`/`capTL`/`poem-segments.json`/`motion.js` unchanged.
