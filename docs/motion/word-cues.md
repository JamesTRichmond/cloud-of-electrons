# Word cues: `site/word-cues.json`

Per-word timings for the timed Hugh poem readings. They drive `?voicelight`, the Story Writer's screen-reader mirror and the voice-reactive motion, all through `window.coeCues`. This is data only: `site/index.html` is not modified.

## Metadata

| Key | Value |
|---|---|
| File | `site/word-cues.json` (data); `site/word-cues.meta.json` (method, stats, violations, skipped poems) |
| Format version | 1 |
| Built | 2026-11-14, by `tools/build_word_cues.py` |
| Model | faster-whisper `base.en` (open source, ctranslate2 4.9.0, faster-whisper 1.2.1), CPU, **float32**, beam 5, temperature 0, `word_timestamps=True`, `condition_on_previous_text=False`, no VAD |
| Audio | `site/voices/hugh-poems/<id>.mp3` (the same clips `index.html` plays) |
| Text and groups | `site/glyphs/manifest.json` groups. A group's text is `g.lines.join(' ')` split on whitespace, exactly as `index.html` L253 builds it |
| Segments | `site/poem-segments.json`, with groups in the same order |
| Cost | $0, with no paid APIs |

The int8 build of the same model produced corrupted tokens on the build machine, such as `innocentgovtrack702`, and dropped about 70% of the words in two poems. So the tool uses float32.

## Shape

```json
{ "<poemId>": { "groups": [ { "words": [ { "w": "Searching", "t0": 0.0, "t1": 0.4, "conf": 0.839 } ] } ] } }
```

- The top-level keys are poem ids only. There is no metadata at the top level.
- `groups[i]` is group `i` of the poem, in the same order as `poem-segments.json` `segs[i]` and the manifest groups.
- `w` is the word exactly as it appears on the page, punctuation included. `t0` and `t1` are seconds on the clip's audio clock.
- Optional keys, present only when they apply:
  - `conf`: Whisper word probability, 0 for interpolated or silent words.
  - `interp: true`: the word wasn't heard in the transcript, so its time is interpolated between its matched neighbours, weighted by character length, and clamped into its group's segment.
  - `clamped: true`: the start was moved forward to the group boundary. Whisper had stretched the word back over the pause before it.
  - `silent: true`: a punctuation or footnote mark (`*`, `†`, `‡`, `—`, `¹`) with nothing spoken. It has zero length at the previous word's end and is also flagged `interp`.
  - `refill: true`: the word was recovered by the second Whisper pass.

## Method

1. Transcribe the whole clip with word timestamps.
2. Align the recognised words to the canonical words using global Needleman-Wunsch alignment on normalised tokens (lowercase, a–z and 0–9 only). An exact match scores 2, a fuzzy match (difflib ratio ≥ 0.75) scores 1, and mismatches and gaps score −1. One canonical word may absorb two recognised tokens, for example `Two-Mississippi` heard as `Two` and `Mississippi`.
3. Zero-length matches are Whisper artefacts, so they are demoted to unmatched.
4. **Second pass:** each run of ≥ 2 unmatched spoken words is re-transcribed on just its window, from the previous anchor's start to the next anchor's start, and aligned again. This recovered most of *Fabulous*: Whisper had stretched "if" from 22.46 s to 29.98 s and skipped 16 words.
5. A matched word's end is trimmed so it never runs past the next matched word's start.
6. Clamp the starts of words that begin before their group boundary but end inside the group. The boundary is the segment start + 0.1 s, because the segment slices overlap by 0.2 s around each midpoint.
7. Interpolate the remaining unmatched words, then place the silent tokens.
8. Check every word against its group's `[s, e]` in `poem-segments.json` with ±0.25 s tolerance. Violations are listed in `word-cues.meta.json`, not hidden.

To reproduce:

```bash
pip install faster-whisper "av<16"   # av 19 breaks faster-whisper 1.2.1's decode_audio (metadata_errors kwarg)
python3 tools/build_word_cues.py                # optional: --cache DIR to keep raw Whisper output
node --test tests/*.test.mjs
```

## Per-poem results

| Poem | Groups | Words (spoken) | Matched | Refilled | Match rate | Interpolated | % interp | Clamped starts | Mean conf | Group-level match (segments file) | Segment violations |
|---|---|---|---|---|---|---|---|---|---|---|---|
| The Choice and the Lesson (`ttcem-bound-ing`) | 57 | 806 (802) | 788 | 3 | 0.983 | 14 | 1.7% | 4 | 0.944 | 0.96 | 2 |
| Don't Shit in My Christmas Spirit (`ttcem-don-t-shit-in-my-christmas-spirit`) | 6 | 50 (50) | 50 | 0 | 1.000 | 0 | 0.0% | 0 | 0.962 | 0.96 | 0 |
| Fabulous (`ttcem-fabulous`) | 5 | 119 (119) | 117 | 17 | 0.983 | 2 | 1.7% | 0 | 0.960 | 0.85 | 0 |
| Flying Around (`ttcem-flying-around`) | 13 | 241 (236) | 234 | 0 | 0.992 | 2 | 0.8% | 1 | 0.940 | 0.97 | 0 |
| Jagged Rocks (`ttcem-jagged-rocks`) | 11 | 140 (140) | 136 | 1 | 0.971 | 4 | 2.9% | 2 | 0.944 | 0.95 | 0 |
| Machines Are Fighting for Our Freedom (`ttcem-machines-are-fighting-for-our-freedom`) | 9 | 131 (131) | 130 | 0 | 0.992 | 1 | 0.8% | 1 | 0.942 | 0.94 | 6 |
| Midnight Orgy (`ttcem-midnight-orgy`) | 17 | 303 (303) | 302 | 0 | 0.997 | 1 | 0.3% | 4 | 0.942 | 0.98 | 0 |
| Now I Don't Throw Dirt in People's Soup (`ttcem-now-i-don-t-throw-dirt-in-people-s-soup`) | 11 | 249 (249) | 248 | 0 | 0.996 | 1 | 0.4% | 0 | 0.956 | 0.99 | 0 |

The match rate and % interp are over spoken words, so silent marks are excluded.

### Excluded or skipped

- `ttcem-dinosaur-footprints` and `ttcem-halloween-again` are excluded because James hasn't ruled them public. Halloween Again was also the weakest at group level (0.79).
- Goliath and *Friends Til the End* are never included. Neither has a timed reading in `poem-segments.json`, and the tool also blocks them by id and title.
- The other manifest poems have no timed clip in `poem-segments.json` and `voices/hugh-poems/`, so they get no word cues.

## Known weak spots

- **Fabulous:** the first pass matched only 0.85, the same as the group-level figure. The second pass raised it to 0.983. Two words are still interpolated: "I'll" at about 29.1 s and "I'll" at about 40.1 s. Whisper transcribed both as "I", so they don't match.
- **The Choice and the Lesson:** the typographic splits "Float / ing", "do / w / n", "Do / w / n" and "re / bound." are heard as single words, so the fragments are interpolated, several with near-zero length. In the scat section, "Daa-da-da" and two "da" words are zero length (t1 = t0) after overlap trimming. Voicelight should give any word with `t1 - t0 < 0.08` a minimum visible duration.
- **Segment-file violations (reported, not fixed).** In these cases the word times look right and `poem-segments.json` appears to cut a group in the wrong place. Confidence is medium-high: the transcript order is consistent. It would change if listening to the clip contradicts it.
  - `ttcem-machines-are-fighting-for-our-freedom`, group 6: "Soldiers' names sound so noble when" is heard at 48.72–51.46 s, but group 6's slice starts at 51.56 s. The transcript of the refrain before it has 4 × "Machines" against 3 in the text (not checked by ear), which likely threw off the original alignment. On the live page these six words are spoken while group 5's refrain text is still showing. To check, listen from 48.5 to 51.8 s.
  - `ttcem-bound-ing`, group 2: "Two-Mississippi" is heard at 19.50–20.06 s, but group 2 ends at 18.87 s, so it is spoken during group 3 ("CRASH!").
  - `ttcem-bound-ing`, group 46: "do" runs 296.90–297.28 s against a 0.2 s slice (296.8–297.0). This is a typographic fragment.
  - Regenerating `poem-segments.json` from these word cues is a Builder decision. It changes the live reading's timing, so it needs James.
- The word times have **not** been checked by ear or against a screen reader. Whisper word timestamps are typically within about 0.1–0.3 s of the true onset (estimate, medium confidence).

## How `window.coeCues` should consume it

```js
const cues = await fetch('word-cues.json').then(r => r.ok ? r.json() : null).catch(() => null);
// cues?.[poemId]?.groups[gi].words -> [{w, t0, t1, conf?, interp?, clamped?, silent?, refill?}]
```

- **Clock:** compare against the playing clip's `currentTime` (`window.coeHughAu`). The audio clock stays master, and cue times are never rescaled.
- **Discrete events:** fire `word` when `currentTime` crosses `t0`. Fire `group` from `poem-segments.json` as today. Skip `silent` words for lighting and the mirror, and still render them as text.
- **Per-frame `coeCues.at(t)`:** binary-search a flattened `t0` array per poem. Progress within a word is `(t - t0) / max(0.08, t1 - t0)`.
- **Low confidence:** words with `interp` or `conf < 0.5` should use the gentler voicelight ramp, or just the group pulse. Their timing is an estimate.
- **Missing poem:** if a poem has no entry (excluded or no timed reading), fall back to group-level behaviour, and keep `?voicelight` off for that poem per the Art Director's ruling.
- Word order inside each group equals the on-screen word order, so `wi` maps directly to the glyph word index.
