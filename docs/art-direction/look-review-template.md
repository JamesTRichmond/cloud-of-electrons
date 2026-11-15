# Look review template and gate ledger (Art Director)

Serves the README goal ("poems condense out of the swirl one at a time, hold long enough to
read, then scatter back") and its deploy rule: "Nothing reaches jamestrichmond.com without
J R's approval." Before Nimby puts a build in front of J R, every look item needs a written
PASS or FAIL with the file judged and the reason. This file is the form for that.

## How to judge
- At full swirl speed, by eye, against `site/style-frame.md`.
- Only fresh runs on the build that would ship count.
- Smoothness only from real hardware with `?fbstats`; software renders are for look and
  timing frames only.
- Never accept a number without the file or log behind it. Never loosen a locked call to make
  a metric pass.
- Tag every claim VERIFIED (seen in this review), REPORTED, or UNKNOWN.

## Review form (copy one block per item)

```
Item:            <short name>
Build:           <file>@<commit>   (must be the build that would ship)
Evidence:        <clip / still / frame strip / ?fbstats log path>
Time on audio:   <fs value(s)>
Judged against:  <style-frame section or handover rule id, e.g. H2>
Verdict:         PASS | FAIL | BLOCKED
Reason:          <one or two plain sentences>
What would change it: <the evidence that would flip the verdict>
Tag:             VERIFIED | REPORTED | UNKNOWN
```

## Gate ledger for the current candidate
Status as last REPORTED in the team room; none of it is re-checked in this repo, and `main`
still carries v23.6.1 (VERIFIED: the newest version comment in `site/index.html` is v23.6.1,
L2136). The ledger is filled in on the candidate's own PR, not here.

| # | Look item | Owner of the evidence | Status (REPORTED) |
|---|---|---|---|
| 1 | Hand-over at fs 38.51 reads as a dissolve, "with the" readable cleanly | Builder clips | open |
| 2 | Hand-over at fs 83.20, demon verse on its voice cue | Builder, after reading-2 audio-clock fix | open |
| 3 | Hand-over at fs 114.82 | Builder clips | open |
| 4 | Released dots not a bright patch in next group's letters | Builder still + crop | open |
| 5 | Panel option B look check (option A is the default) | Builder test clip | open |
| 6 | "I know" ring ratio at most 1.54 | Builder measurement, AD still if over | open |
| 7 | Group 1 letters with the 3+2 split, v23.6.1 position and tilt | Builder stills | open |
| 8 | Letter color: #F2F2EE vs #F4E1BC side by side | AD, then J R's pick | open |
| 9 | "with the" / "by the" stand alone | Story Writer + Builder | open (fold REPORTED in v23.6.2) |
| 10 | Smoothness on real hardware (`?fbstats`) | J R's hardware run | open |

The Art Director's part ends with one line on the candidate PR: `look: PASS` for that build,
or the exact blockers. Deploying is J R's step only.
