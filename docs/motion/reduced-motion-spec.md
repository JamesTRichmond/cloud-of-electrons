# Reduced-motion path: audit and spec (Motion lane)

Status: audit of `main` at 790c6ed plus a proposed rule set. Docs only; nothing under `site/` changes in this PR. Code changes are the WebGL Builder's.
README goal: "`prefers-reduced-motion` is honored".

## What main does today (VERIFIED, `site/index.html`)
| Area | Line | Reduced behaviour |
| --- | --- | --- |
| Detection | L86 | `matchMedia('(prefers-reduced-motion: reduce)').matches`, read once at load |
| Camera drift | L90 | fixed camera |
| Cloud rotation | L1967, L1996–1997, L2001 | no yaw (`da=0`, `ra=0`, shader `t=0`) |
| Mouse wake | L1968 | off |
| Poem gather/scatter | L1990 | phase still runs, text weight ramps linearly |
| Poem sway/drift | L1992–1994 | tilt 0, drift 0 |
| Poem plane yaw | L1996 | 0 |
| Particle damping | L1996 | `k = 0.3` |
| Flight speed | L1197, L1727 | 14 instead of 46 |
| Fall / void entry | L1737, L1877–1879 | 1 s fade, no camera plunge |
| Void scene time | L1888–1889 | 10% speed, funnel spin off |
| UI fades | L2129, L2216 | no CSS transition |

## Gaps (VERIFIED unless marked)
1. **Flash not gated.** `uFlash` (L2003, shader L191) fires for reduced users on every gather→read. Spec: `docs/motion/flash-cap-spec.md` (branch `motion/flash-cap-spec`).
2. **Read once.** No `change` listener on the media query, so switching the OS setting needs a reload. Spec: listen for `change` and ramp between modes over ≥ 0.5 s (no snap).
3. **Void scene still moves** at 10% (`vt = t*.1`, L1888). UNKNOWN whether that is felt as motion; propose a still frame with only brightness changes, Art Director to judge.
4. **Gather/scatter still move dots.** In reduced mode dots still travel to glyph targets. Proposed: cross-fade (text dots fade in at their targets over the same gather time, fade out over scatter), no travel.
5. **No test.** Nothing checks the reduced path. Proposed: a headless run with `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion',value:'reduce'}]})` that asserts `uFlash==0`, camera fixed and text tilt 0 over a full poem (fits the existing `test_cdp_*.js` pattern).

## Rules that must hold in both modes
- Audio is the master clock; visuals never pause or stretch the voice.
- Reduced mode changes how things move, never when: gather/read/scatter start and end at the same times as full motion.
- No new flashing, strobing or rapid brightness change in either mode (WCAG 2.3.1: ≤ 3 flashes/s; target is 0 in reduced mode).
