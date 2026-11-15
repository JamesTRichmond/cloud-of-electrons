# Accessible poem mirror

A visually hidden copy of the poem that stays in step with the particle text, so a screen-reader user hears each group at the moment it becomes legible on screen. Uses only the 19 poems in `story/poems.public.json`. The Builder owns `site/index.html`; this spec does not edit it.

## What the page already does

- Groups, not single lines, form as one unit (`start()` at `site/index.html:248-253`, from `p.groups` in `site/glyphs/manifest.json`).
- The phase clock is seconds after `active.t0`. `start()` sets `active.t0 = performance.now()/1000` (`site/index.html:253`). `frame(nowMs)` evaluates phases with `t = nowMs/1000` (`site/index.html:1984, 1989`).
- Sequenced readings (`beginPoem`, `site/index.html:2195-2208`) play Hugh's clip and, when slices exist, set `active.seg` and call `window.coeHughSeg` (`site/index.html:254, 2168-2188`). Phases then come from `segTL` (`site/index.html:295`): gather `0.5s`, read `max(0.4, dur-0.35)`, scatter `0.35s`. `dur` is the slice length `e-s` from `poem-segments.json`, or `e - hughAu.currentTime` if the clip is already in the slice.
- A group is settled (legible) when `segTL` / `poemTimeline` enters `phase === 'read'` and `wt = 1`. That transition is already detected at `site/index.html:1991` (`if(active.lastPhase==='gather'){ window.coeFlashT=t }`).
- `#coe-live` (`site/index.html:67`) is a polite live region, but `start()` writes `live.textContent` at gather start (`site/index.html:253`), not at the settled time. Meditation captions also write that same node (`capStart`, `site/index.html:289`).

## Draft markup

Visually hidden with the existing clip style (`#coe-live` at `site/index.html:55`). The transcript stays *outside* the live region so reviewing it does not re-announce the poem.

```html
<div id="coe-poem-mirror" role="region" aria-label="Poem text"
     style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">
  <div id="coe-live" aria-live="polite" aria-atomic="true"></div>
  <h2 id="coe-transcript-heading"></h2>
  <ol id="coe-transcript"></ol>
</div>
```

Replace the current bare `#coe-live` node with this region. `aria-atomic="true"` so the whole group is spoken, not a diff.

## Hook (Builder)

Call `window.coeMirrorOnLegible(active)` at `site/index.html:1991`, inside the existing `if(active.lastPhase==='gather')` branch, the same moment `window.coeFlashT=t` is set. That is when the letters are settled. Do not announce from `start()` at line 253.

Also call `window.coeMirrorLoadPoem(p)` from `beginPoem` (`site/index.html:2205`) and from `start()` when `p` is first known (`site/index.html:248`), to rebuild the static transcript for the current poem. Skip `active.cap` (meditation captions).

`story/mirror-timing.json` has the group text and the nominal times. Announcements should follow the live phase hook, not a precomputed timeout, because `readD` can shrink when `hughAu.currentTime` is already inside the slice (`site/index.html:2177-2185`).

## Timing map (excerpt)

Times are seconds after that group's `active.t0`. `audioSlice` is Hugh-clip `currentTime` from `poem-segments.json`. *Don't Shit in My Christmas Spirit*:

| group | formStart | legible | scatter | audioSlice | text (first line) |
|------:|----------:|--------:|--------:|------------|-------------------|
| 0 | 0 | 0.5 | 5.77 | [0, 5.62] | Shrouded in darkness, |
| 1 | 0 | 0.5 | 1.96 | [5.42, 7.23] | of the innocent. |
| 2 | 0 | 0.5 | 7.44 | [7.03, 14.32] | Shrouded in darkness, |

`scatter` is nominal: `0.5 + max(0.4, (e-s)-0.35)`. See `story/mirror-timing.json` for every public group.

Eleven public poems are not in the live manifest, so their `formStart`, `legible`, and `scatter` are `null` (the page never starts them). Rebuild with `node tools/build-mirror-timing.mjs`.

## Behaviour

- **One announcement per group.** Key on `poemId + groupIndex`. If the hook fires again for the same group, do nothing. Debounce ~100ms in case `lastPhase` flickers. Clear `#coe-live` only when a *new* group is ready to announce, never every frame.
- **Reduced motion.** `prefers-reduced-motion` (`site/index.html:86`) removes drift, tilt, and camera motion, but the phase times are unchanged (`site/index.html:1990`). Announce at the same legible moment.
- **Sound off.** Follow the visual phase hook, not the audio element. If `play()` fails, `coeHughSeg` still uses `dur = e-s` (`site/index.html:2178`) and the letters still settle. Silence (`#of-sil`, `site/index.html:2222`) calls `stopPoetry()` and should stop further announcements; the transcript stays so the reader can review.
- **Hidden tab / pause.** Poem phases use wall-clock `t`, not the clamped scene clock `window.__ST` (`site/index.html:1984`). A hidden tab pauses rAF; on return, `t - active.t0` can jump past read or scatter. On `visibilitychange` to visible: if the current group is already in `read` and has not been announced, announce once; if it is already past scatter and was never announced, skip it (the transcript still has the lines). Do not dump a burst of missed groups into the live region.
- **Poem change / End.** `coeMirrorLoadPoem` replaces the transcript. `stopPoetry()` (`site/index.html:2189`) should not leave a stale live message; clear `#coe-live` and `aria-current` on the transcript.

## Drift (do not ship these in the mirror)

`site/glyphs/manifest.json`, `site/poem-segments.json`, `site/voices/hugh-poems/`, and the `KEEP` list at `site/index.html:2191` include **Dinosaur Footprints** (`ttcem-dinosaur-footprints`) and **Halloween Again** (`ttcem-halloween-again`). Neither is in `story/poems.public.json`. They are excluded here. The other eleven public poems have `.bin` glyph files but are omitted from the live manifest.

## Untested

No real screen-reader run (VoiceOver, NVDA, TalkBack, or Safari/Chrome/Firefox VoiceOver/NVDA). No check that browsers honor `aria-live` updates while WebGL is animating, or that a mid-session reduced-motion switch keeps a single announcement. The unit test only checks that every mirror line is verbatim public text and that non-public poems are absent (`tests/mirror-timing.test.mjs`).
