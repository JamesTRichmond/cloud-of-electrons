# Spec: lightning flash cap and photosensitivity gate (Motion lane)

Status: proposal for the WebGL Builder. Docs only; nothing under `site/` changes in this PR.
Base: `main` at 790c6ed (v23.6.1 line). All line numbers are `site/index.html` on that commit.

## What the brief says
`site/style-frame.md` (Art Director, v1): "Lightning accent: #F4F7FF, used ONLY at peak coherence (the "FLASH!" moment), max 1 per 60 s."
(If `ad/style-frame-v3` changes this rule, that wins; this spec only covers rate and gating.)

## What main does (VERIFIED by reading the code)
- L1991: whenever the active poem goes from `gather` to `read`/`hold`, it sets `window.coeFlashT = t`. There is no rate check.
- L2003: `uFlash` = 1 → 0 over 0.25 s after `coeFlashT`.
- L191 (vertex shader): text dots brighten toward (0.96, 0.97, 1.0) by up to 2.8× and grow 35% while `uFlash > 0`.
- `uFlash` is not gated by `reduced` (`prefers-reduced-motion`, L86). Reduced users get every flash.

Effect: with audio-locked groups (`segTL`, groups of a few seconds each, see `site/poem-segments.json`), every group hand-over fires a flash. Example from the data: `ttcem-bound-ing` has 57 groups in 345 s, so up to 57 flashes, about 10 per minute, against a cap of 1 per minute. INFERENCE (high confidence): this assumes each group is its own `active` entry with a fresh gather; a 60 s `?` capture with a flash counter would confirm the real count.

## Proposed rule
1. **Cap:** fire a flash only if `t - lastFlashT >= 60` (scene seconds, using the same clock as `coeFlashT`). Otherwise skip it; don't queue it.
2. **Peak coherence only:** fire on the first group of a poem (or of a reading) reaching `read`, not on every group. Builder picks the cleanest hook; first-group-of-poem is the simplest.
3. **Reduced motion:** when `reduced` is true, no flash at all (`uFlash = 0`). The text simply reaches full brightness.
4. **Photosensitivity floor:** never more than 3 flashes in any 1 s window (WCAG 2.3.1). Rule 1 already guarantees this; keep it as an assert in the diagnostics.
5. Timing, gather/read/scatter lengths, audio slices and recruitment are untouched.

## Acceptance (for the Builder's PR)
- 120 s run of `ttcem-bound-ing`, counter on `coeFlashT` changes: ≤ 2 flashes.
- Same run with `prefers-reduced-motion: reduce` emulated: 0 frames with `uFlash > 0`.
- Diff touches only the flash trigger and the `uFlash` uniform; `poem-segments.json`, `segTL`, `capTL`, `motion.js` unchanged.
- Before/after canvas stills of the first group's read frame, same seed.
