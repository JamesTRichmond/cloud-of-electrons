# Hand-over look acceptance (Art Director)

Serves the README goal: poems "condense out of the swirl one at a time, hold long enough to
read, then scatter back." A hand-over is the moment one group scatters and the next condenses.
This checklist is what the Art Director signs before any build with timed readings is offered
to J R. It judges the look only; timing rules are the Motion Designer's, copy and grouping are
the Story Writer's, code is the Builder's.

Tags: REPORTED = team decision, not re-checked in this repo. VERIFIED = read from this repo.

## Inputs the Builder supplies per hand-over
| Item | Why |
|---|---|
| Build file and commit | Only the build that would ship counts |
| Hand-over time on the audio clock (e.g. fs 38.51, 83.20, 114.82) | Names the test point |
| End time of the old group's last voiced word | For rule H3 |
| Time the old group reaches specks | For rule H2 |
| First frame where the new group is readable | For rule H2 |
| A clip at full swirl speed, about 1.5 s before to 2 s after | Judged by eye |
| Frame strip at native frame rate across the same window | Judged frame by frame |
| Real-hardware run with `?fbstats` | Smoothness (H6) |

## Rules (all REPORTED locked unless marked)
| # | Rule | Pass means |
|---|---|---|
| H1 | The break-apart reads through motion, not brightness | Old letters visibly scatter; they do not blink off, fade in place, or flash brighter |
| H2 | Old words are below readable by the first readable frame of the new group | On that frame, no old word can be read; old dots are specks |
| H3 | The old group does not start dissolving before the voice finishes its last word | Dissolve start >= end of the last word's cue |
| H4 | The new group is locked to its voice cue | Readable while its words are sung; never late by a whole verse |
| H5 | Released dots don't make a bright patch in the next group's letters | Released dots sit at cloud level where they cross new letters |
| H6 | Smoothness | Judged on real hardware with `?fbstats`; software renders never pass or fail smoothness |
| H7 | Swirl untouched | Swirl speed and hue blend match v23.5 through the hand-over |
| H8 | Dim stays legal | Streak dim position-only, feathered, 15% floor, at most 10%/s on the audio clock; no dim lift under visible letters |
| H9 | Groups as written | "with the" and "by the" appear as their own groups, not folded into neighbours |

H2 and H3 together set a window. If the old group cannot reach specks between the end of its
last word and the new group's first readable frame, the Builder stops and reports the numbers;
the Art Director does not loosen H2 or H3 to make a hand-over pass.

## Verdict format
One line per hand-over, then one overall line:

```
fs 38.51  | build <file>@<commit> | H1 P H2 P H3 P H4 P H5 P H6 P H7 P H8 P H9 P | PASS
overall   | look: PASS            (or: look: FAIL - H2 at 38.51, H9 at 38.51)
```

Each FAIL names the frame or clip judged and the reason. A metric gate is never accepted
without the file or log behind it.
