# Spec: the cursor as an electric field (Motion lane)

Status: proposal + prototype for the WebGL Builder. Nothing under `site/` changes on this branch.
Base: `main` at 790c6ed. Line numbers are `site/index.html` on that commit (VERIFIED by reading it).
Prototype: `prototypes/electric-field/` (outside `site/`, so the Cloudflare deploy of `site/` never ships it).
Math: `prototypes/electric-field/field.mjs` is the single source of every constant below; `tests/electric-field.test.mjs` pins them.

## What main does today
| Area | Where | Behaviour |
| --- | --- | --- |
| Reduced-motion detection | L86 | `reduced = matchMedia('(prefers-reduced-motion: reduce)').matches`, read once at load |
| Pointer input | L1717-L1723 | `pointermove` stores `VD.mx/my` (ndc) and a smoothed velocity `VD.mvx/mvy` |
| Mouse wake | L1968, L1973 | CPU, per particle, inside `sim()`: a velocity-driven swirl impulse on cloud dots within `md2<1.2`; off when `reduced` or `mSpeed<=.06` |
| Scene step | L1984 | `dt = min(.05, frame delta)`; scene clock `__ST` advances by `dt` only |
| Flash trigger | L1991 | `coeFlashT = t` on every gather→read; no rate check |
| Flash envelope | L2003, L2005 | `uFlash` 1→0 over 0.25 s |
| Flash look | L191-L192 (shader) | text dots go up to 2.8x brightness, +35% size; not gated by `reduced` |
| Screen-space offsets | L194 (shader) | already nudges `gl_Position.xy` by an ndc offset `*(1.-te)*gl_Position.w`; the field uses the same pattern |
| Wheel | L1724 (fly mode only), L1375 (galaxy map) | front mode has no wheel handler, so scroll is free for energy levels |

## 1. Force model (screen space, vertex shader)
Per vertex, after projection: `ndc = gl_Position.xy / gl_Position.w`, `d = ((ndc.x - P.x)*asp, ndc.y - P.y)`, `r = |d|`.
- Softened Coulomb: `F(r) = K / (r² + EPS²) · (1 − r²/R_CUT²)²`, `K = 0.0012`, `EPS = 0.06`, `R_CUT = 0.35`. The window makes F exactly 0 at the cutoff (no visible edge).
- Cap: `m = MAX·tanh(F/MAX)`, `MAX_DISP = 0.06` ndc (≈3% of screen height). Never exceeds MAX, linear for small F.
- Repulsive (pointer and electrons share a sign): `offset = d/r · m · gain · (1 − te) · guard`, x divided back by `asp`.
- No per-particle state. The "spring return" lives on one scalar, `gain`, a critically damped spring (exact closed form, so 30/60/120 fps match to 1e-6):
  `y(t+dt) = (y + (v + ωy)dt)e^(−ωdt)`, `v(t+dt) = (v − ω(v + ωy)dt)e^(−ωdt)`, with `dt ≤ 0.05` (same cap as L1984).
  ω = 14 rad/s when the field turns on (95% in 0.34 s), ω = 8 rad/s when it turns off (95% in 0.59 s, 99% in 0.83 s). No overshoot from rest.
- Pointer position is smoothed the same way (ω = 20). If `gain < 0.01` the smoothed position snaps to the pointer, so re-entry never sweeps a hole across the cloud.
- Curves: `docs/motion/img/field-1-force-falloff.svg`, `field-2-strength-spring.svg`.

## 2. Pointer and touch
- Mouse/pen hover: field on while the pointer is over the canvas, off on `pointerleave`.
- Touch: field on only between `pointerdown` and `pointerup`/`pointercancel`. A vertical flick (>80 px in <350 ms) steps one level (flick up = climb). Canvas needs `touch-action:none` only while `?field` is on.
- Keyboard: PageDown/ArrowDown = climb, PageUp/ArrowUp = descend (skipped when a button has focus). No pointer = no field; nothing is lost for keyboard users.

## 3. Energy levels on scroll
- `n = 1..4`. Wheel distance accumulates (deltaMode lines ×16, pages ×innerHeight); every 120 px = one step; scroll down = climb. New steps are ignored until the running transition is 50% done.
- Cloud radius `scale(n) = 1 + 0.18(n−1)` (1.00, 1.18, 1.36, 1.54), brightness `bright(n) = 1 − 0.07(n−1)`. Tint per level is the Art Director's call (Balmer palette); hook is one `uLevelTint` uniform.
- Up/absorb: 0.9 s, `cubic-bezier(0.16, 1, 0.3, 1)` (same curve as the void door, L1201). Down/emit: 1.2 s, `cubic-bezier(0.65, 0, 0.35, 1)`.
- Scale applies only to cloud dots around the cloud centre `cw` (`w = cw + (w − cw)·mix(uLevelScale, 1, te)`), never to letters. Camera does not move in either mode: text placement depends on `cam` (L1993, L1995), so a dolly would shift the poem.
- Curve: `field-3-level-transitions.svg`.

## 4. Photon pulse (replaces the gather→read flash)
- Fires at the start of a downward (emit) transition only. One screen-space ring from the projected cloud centre: radius 0.03→0.75 ndc ×scale, `cubic-bezier(0.33, 1, 0.68, 1)`, width 0.05, 0.6 s. Ring dots brighten by `gain = 0.8·(1−p)²`, i.e. at most 1.8x (today's flash: 2.8x). Letters (`te=1`) are never brightened.
- Budget: shares the lightning flash's cap from `docs/motion/flash-cap-spec.md` (branch `motion/flash-cap-spec`): at most 1 per 60 s, skipped not queued. That alone keeps it far under WCAG 2.3.1 (≤3 flashes in any 1 s). A level-down inside the cooldown still changes level, just without a pulse.
- No pulse while a poem is in `gather`/`read`/`hold` (the lightning flash owns that moment). Curves: `field-4-photon-pulse.svg`, `field-5-pulse-cap.svg`.

## 5. Poem reading
- `te = 1` dots: zero offset, always. Around the active text box (ndc rect from `active.box`/`calmAt`, L248) the field fades to 0 over a 0.15 ndc margin (`smoothstep(0, .15, sdBox)`), ramped in by a spring when a poem starts gathering.
- The field writes only `gl_Position`; it never touches `P`/`V`, `segTL`, `capTL`, `poemTimeline`, `poem-segments.json` or the audio clock. Cue timing cannot change.

## 6. Reduced motion
- `gain = 0` (zero travel, tested), no level scaling, no idle rotation, no camera move, no pulse.
- Level is still shown: brightness (and later tint) cross-fades linearly over 0.4 s. Should also follow the live `change` listener from `builder/reduced-motion-live` when that lands.

## 7. Performance
- GPU: about 25 ALU ops per vertex (one `exp`, one `sqrt`, a `tanh` via `exp`) — ESTIMATE, not measured on a phone. CPU: three scalar springs + 6 uniforms per frame, no per-particle JS.
- Under `?field`, the CPU mouse wake at L1968/L1973 is skipped, which removes a per-particle branch from `sim()`.
- Prototype, 122,128 points, headless Chrome with SwiftShader (software GL): p50 16.7 ms, p95 33-67 ms across runs. That is a software rasteriser number, not a GPU or phone number.

## Builder hand-off (behind `?field`, draft PR only)
1. Shader L149: add `uniform vec2 uPtr; uniform float uGain, uLevelScale, uLevelBright, uPulseR, uPulseG; uniform vec4 uRect;` and copy the field block from `prototypes/electric-field/index.html` after L194.
2. Frame (after L2003): step `gain`, pointer, level and pulse with `field.mjs`; set uniforms. Gate the L1991 flash and the pulse through one shared `lastFlashT`.
3. Front-mode wheel/keys/touch handlers as in §2-§3, only when `VD.mode==='front'` and `?field`.
4. Acceptance: no letter moves (te=1 offset 0) during a full poem; `reduced` emulated → 0 frames with `uGain>0` or `uPulseG>0`; ≤1 pulse per 60 s over 180 s of scrolling; `poem-segments.json`, `motion.js`, `segTL` unchanged; 39 existing tests + the 11 here pass.
