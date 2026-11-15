# `?voicelight` look spec (Art Director)

Status: look spec for the WebGL Builder. Docs only; nothing under `site/` changes here.
Owners: the Builder implements it. The Motion Designer owns the attack, hold and decay curves.
The Art Director owns the look targets below and judges the result. J R decides whether it
ships. The look sits behind `?voicelight`; with the flag off, the page must be unchanged.

Tags: VERIFIED = read from the repo on Nov 14 2026 (`main` @ 790c6ed unless stated).
REPORTED = said in the team room and not re-checked here. UNKNOWN = not known yet.
This file contains no poem text.

## 1. The look
While the voice sings a word, that word's letters warm slightly toward a warm white in the
same colour family, then settle back. The poem becomes readable on the beat of the voice.
The swirl, the cloud and the rest of the frame don't change.

**Word-level only (AD ruling).** The lift follows single words. Lighting a whole group at once
is **not** an accepted look: it is just a brightness pulse on the group, and every group
already brightens when it forms. With no word cues, `?voicelight` stays off. There is no group
fallback.

### Cue sources in the repo
| Source | What it holds | Status |
|---|---|---|
| `site/poem-segments.json` | `poems.<id>.segs` = list of `[start, end]` pairs in Hugh-clip seconds, one per group; `dur`, `match`; the `note` says they came from word-level forced alignment (faster-whisper base.en), with each boundary at the midpoint between groups | VERIFIED. 10 poems, 144 group slices in total (`ttcem-bound-ing` has 57). **No per-word times are stored.** |
| `site/index.html` L2138 | loads that file into `window.coeHughSegs` | VERIFIED |
| `site/index.html` L2184-2186 (`window.coeHughSeg`) | per group: `gatherD=0.5`, `readD=max(0.4, dur-0.35)`, `scatterD=0.35` | VERIFIED |
| `site/index.html` L1991 | gather → read/hold change; sets `window.coeFlashT` | VERIFIED |
| `story/mirror-timing.json` on `copy/accessible-mirror` @ f36495a (read-only) | `clock` (`group-t0`), `constants` (`segGatherD`, `segScatterD`, `segReadDMin`), `drift`, `poems[].groups[]` with `index`, `lines`, `text`, `formStart`, `legible`, `scatter`, `audioSlice`, `gatherD`, `readD`, `scatterD`, `timingSource` | VERIFIED on that commit. Group-level, with no word times. |
| A word-cue file | per-word onset and offset on the Hugh-clip clock | **Doesn't exist yet** (VERIFIED absent). REPORTED: the Motion Designer is writing a generator that reruns the alignment. |
| `window.coeCues` on `builder/voicelight` | the shared cue object | REPORTED. The branch wasn't on the remote when this was written (UNKNOWN content). |

### One shared cue source (endorsed)
I endorse the Story Writer's proposal: one cue source drives `?voicelight`, the screen-reader
mirror (`window.coeMirrorOnLegible`) and any voice-reactive motion. Today that is the
Builder's `window.coeCues`, fed by the new word-cue file. Look requirements on it:
- Each group keeps the `mirror-timing.json` fields (`audioSlice`, `legible`, `scatter`) and adds
  `words[]` with one entry per printed word, each with an onset and an offset on the **same
  clock as `audioSlice`** (Hugh-clip `currentTime`).
- Voicelight is driven by the audio clock, never the wall-clock phase clock
  (`mirror-timing.json` `clock.hiddenTab` explains why the two drift apart).
- The words in the cue source must equal the printed glyph words one for one. The Story Writer
  checks them against the public poems. If any word doesn't match, voicelight is off for that
  group.

## 2. Look targets at both letter colours
The rest state is today's letter look: `TEXT_TINT` × `TEXT_LUM` (`site/index.html` L263),
blended in by `wt` at L1982 (VERIFIED). v23.5 (`01cf73a2`) uses the same `TEXT_TINT`
#F4E1BC (VERIFIED, recovered build L108). The letter colour is still J R's pick, so both are
specified.

| | Rest (= current look) | Peak tint (hue target) | Max luminance lift at peak | Reduced motion |
|---|---|---|---|---|
| **#F2F2EE** letters | `TEXT_TINT` = #F2F2EE | **#F8F2E6** (50% toward warm white #FFF3DE; CIELAB hue 110°→91°, C* 2.0→6.7, ΔE2000 4.2 from rest) | **+15% relative**. The tint alone adds +0.5%, so the gain is ≤ ×1.144 | rest tint, ≤ +8% |
| **#F4E1BC** letters | `TEXT_TINT` = #F4E1BC | **#FAEACD** (same mix; hue stays 88°, C* 20.5→16.0, ΔE2000 3.1) | **+15% relative**. The tint alone adds +3.9%, so the gain is ≤ ×1.107 | rest tint, ≤ +8% |

- The lift is measured as Rec.709 luma of the rendered letter colour (the same formula
  `TEXT_LUM` uses at L263), peak ÷ rest ≤ 1.15. The peak and reduced-motion limits come from
  the Motion Designer's figures (REPORTED) and are accepted here as **look limits**.
- **No new hue.** The peak moves toward warm white within the letter's own family. No Balmer,
  spot or accent colour is used.
- Peak colour = `mix(TEXT_TINT, peakTint, a) × TEXT_LUM × g`, where `a` and `g` follow the
  Motion Designer's curve from 0 to 1 and back. Peak hexes were computed in sRGB with
  colour-science 0.4.7; the method is reproducible.
- Settle-back ends exactly at rest, never below it, and never below the 15% dim floor.
- INFERENCE (medium confidence): letters on the canvas render far darker than their hex (a
  software render measured the brightest text pixels near #898A96 at #F2F2EE), so a +15%
  relative lift is a small absolute change, well under WCAG 2.3.1's general-flash luminance
  step. A real-hardware `?fbstats` run would confirm it.

## 3. Guards (all must hold)
1. **Swirl untouched.** The hue blend `hsl(220+(hue-220)*hw, …)` at L1133 and the cloud colour
   path at L1981 don't change. Voicelight only touches the text-dot branch (`mark[i]&&wt>0`, L1982).
2. **No full-screen brightness change.** Only the dots of the word being sung change. Mean
   whole-frame luminance stays within ±1% between a lit frame and the same frame unlit.
3. **Inside the flash cap (#22).** Voicelight is not a flash. It never sets `window.coeFlashT`,
   never drives `uFlash` (L2003), and never adds to the 1-per-60 s lightning budget
   (`builder/flash-cap`, `docs/motion/flash-cap-spec.md`). It doesn't change when the lightning fires.
4. **Hand-over rules still hold** (`docs/art-direction/handover-look-acceptance.md`, H1–H9):
   no lift during gather or scatter; dissolving dots are never brighter than rest, so the
   break-apart still reads through motion, not brightness; the lit word never delays the
   dissolve or the next group's cue; "with the" and "by the" groups light word by word like any other.
5. **Reduced motion** (`prefers-reduced-motion`, L86): no tint shift, no attack/decay animation,
   no pulsing. Allowed: each word, once sung, steps to at most +8% and **stays** there until its
   group scatters, so the poem fills in and nothing blinks. This is an AD look proposal; the
   Motion Designer owns the exact transition. The alternative is voicelight off. Either passes.
6. **Flag off = unchanged.** Without `?voicelight`, frames match `main` with the same seed.

## 4. Acceptance checklist (judged against v23.5 `01cf73a2` stills)
Evidence: same-seed stills (seed `Math.random` in an init script so the poem and cloud are
identical between runs) of v23.5 and of the voicelight build at both letter colours. Include a
short clip at full swirl speed, plus a real-hardware `?fbstats` run for smoothness.

| # | Check | Pass means |
|---|---|---|
| VL1 | Rest equals the current look | Between words and with the flag off, letter pixels match the v23.5 still (ΔE2000 ≤ 1 on letter pixels, same seed) |
| VL2 | Word-level only | One lit word at a time, aligned to the word cues. With no word cues the flag does nothing; no whole-group pulse anywhere |
| VL3 | Peak within limits | Peak luma ≤ 1.15× rest; peak tint within ΔE2000 ≤ 5 of the table value; no new hue |
| VL4 | Lit word matches the voice | On the clip, the lit word is the sung word for every word in a group; no lag a viewer can see |
| VL5 | Swirl untouched | L1133 and L1981 unchanged in the diff; swirl region of the still matches v23.5 |
| VL6 | No full-screen change, not a flash | Mean frame luminance within ±1%; `coeFlashT`/`uFlash` behaviour identical to the #22 build |
| VL7 | Hand-overs hold | H1–H9 pass at the team's test points; no lift in gather or scatter frames |
| VL8 | Reduced motion | Brightness only, ≤ +8%, no pulsing or decay (or off), still readable |

Verdict line format: as in `docs/art-direction/look-review-template.md`. J R decides whether it ships.

## 5. Next: focus-pull look spec (stub)
Status: **next**, after voicelight lands. Not for build yet.
- The group being read stays sharp. The swirl softens with depth behind it, so the text
  separates from the cloud through **focus, not brightness**.
- The swirl's hue, speed and brightness stay exactly v23.5. Softening may change only dot
  sharpness or size with depth, never the colour or the 15% dim floor.
- No dark backing, halo or box behind text. No full-screen brightness change.
- The softening follows the reading group, cuts in on the gather and lets go on the scatter,
  within the hand-over rules. Motion owns the ease.
- Reduced motion: a static depth softening, or none.
- Acceptance to be written as FP1… once voicelight passes, judged the same way against v23.5 stills.
