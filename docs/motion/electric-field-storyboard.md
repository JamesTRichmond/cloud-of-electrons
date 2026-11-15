# Storyboard: electric-field cursor

Times are scene seconds from the first frame. Values come from `prototypes/electric-field/field.mjs`; curves are rendered by `node tools/plot_field_curves.mjs` into `docs/motion/img/`.

## Full motion
| t (s) | Input | State | On screen |
| --- | --- | --- | --- |
| 0.00 | none | n=1, gain 0 | Idle cloud at scale 1.00, slow rotation (0.04 rad/s, same as the site) |
| 2.00 | pointer enters at right of centre | gain springs 0→1 (ω=14) | A soft hole opens around the pointer, 95% open by 2.34 |
| 2.00-4.00 | pointer moves | gain 1, pointer smoothed (ω=20) | The hole follows with a slight lag; dots at the edge lean outward, never more than 0.06 ndc |
| 4.00 | pointer leaves | gain springs 1→0 (ω=8) | Dots drift back with no bounce; 95% closed by 4.59, gone by 4.83 |
| 5.00 | scroll down 120 px | n 1→2, up curve 0.9 s | Cloud swells to 1.18x, dims to 0.93; fast lift, long settle (done 5.90) |
| 6.50 | scroll down 120 px | n 2→3 | Swells to 1.36x, dims to 0.86 (done 7.40) |
| 8.00 | scroll up 120 px | n 3→2, down curve 1.2 s; pulse fires (budget free) | One white ring leaves the centre: r 0.22 at 8.06, 0.45 at 8.15, 0.66 at 8.30, gone at 8.60. Cloud contracts over 1.2 s (done 9.20) |
| 10.00 | scroll up 120 px | n 2→1; pulse blocked (next allowed at 68.00) | Cloud contracts, no ring |
| 12.00 | poem starts gathering | reading guard springs to 1 | Field fades to 0 over the text box + 0.15 margin; letters never move; no pulse until the poem leaves read |
| 68.00+ | next level-down | pulse allowed again | One ring, then another 60 s cooldown (shared with the lightning flash) |

## Reduced motion (prefers-reduced-motion or the toggle)
| t (s) | Input | State | On screen |
| --- | --- | --- | --- |
| 0.00 | none | n=1, gain held at 0 | Still cloud, no rotation, no camera drift |
| 2.00 | pointer enters / finger down | gain 0 | Nothing moves (evidence: canvas pixel-identical to the no-pointer still, max diff 0) |
| 5.00 | scroll down 120 px | n 1→2, linear 0.4 s | Brightness cross-fades 1.00→0.93; size unchanged |
| 8.00 | scroll up 120 px | n 2→1 | Brightness cross-fades back; no ring, ever |

## Curves
| File | Shows |
| --- | --- |
| `img/field-1-force-falloff.svg` | Displacement vs distance: softened 1/r², smooth window to 0 at 0.35, tanh cap at 0.06 |
| `img/field-2-strength-spring.svg` | Field gain on/off at 30, 60 and 120 fps (the samples overlap) |
| `img/field-3-level-transitions.svg` | Up 0.9 s `cubic-bezier(0.16,1,0.3,1)`, down 1.2 s `cubic-bezier(0.65,0,0.35,1)`, reduced 0.4 s linear |
| `img/field-4-photon-pulse.svg` | Ring radius and brightness gain over 0.6 s |
| `img/field-5-pulse-cap.svg` | A level-down every 4 s for 180 s fires 3 pulses |

## Try it
```sh
python3 -m http.server 8000   # from the repo root
# open http://localhost:8000/prototypes/electric-field/  (add ?reduced=1, ?reading=1, ?n=60000)
```
