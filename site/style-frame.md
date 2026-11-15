# Cloud of Electrons: Style Frame v3 (Art Director, Nov 14 2026)

Replaces Style Frame v1 in this file. v1 is out of date: its text color (#EDE6D6) and its
42-character wrap rule no longer match J R's calls or the page. Claims are tagged
VERIFIED (read from this repo on Nov 14 2026), REPORTED (team decision, not re-checked here)
or PENDING (waiting on J R).

The page's goal, from the README: "poems condense out of the swirl one at a time, hold long
enough to read, then scatter back." Everything below serves that line.

## Mood
Late night after a storm. Dark, wet, electric, a little profane, never slick.
The cloud is the star; the poem is a guest that condenses out of it and leaves.

## The bar
- v23.5's swirl, which J R called "literally mesmerizing", is the reference for any swirl
  change (REPORTED). A new swirl ships only if J R prefers it to v23.5 side by side.
- The swirl is never slowed or altered to help a poem read (REPORTED). Slowing the swirl at
  the edges was tried and rejected.
- The swirl's blue-to-orange hue blend, including its yellow-green midtones, is part of that
  bar and not a defect (REPORTED; the formula
  `hsl(220+(hue-220)*hw, min(.7,.15+.4*hw), .33+.12*hw)` is VERIFIED at `site/index.html` L1133).

## Palette
| Role | Value | Status |
|---|---|---|
| Ground | #05070D near-black blue. No pure black, no background gradients. | VERIFIED (`BG0`, L329) |
| Poem letters | #F2F2EE soft white, full opacity | REPORTED locked default ("o2f") |
| Poem letters, alternative | #F4E1BC warm cream | PENDING J R's pick; this is what `main` uses today (`TEXT_TINT`, L263, VERIFIED) |
| UI / panel text | #EDE6D6 | VERIFIED (Open Field CSS, L9-50) |
| Swirl | the v23.5 hue blend above | REPORTED bar, VERIFIED formula |
| Lightning accent | #F4F7FF only at a peak moment, at most once per 60 s | carried from v1 |

Judge letters in both #F2F2EE and #F4E1BC until J R picks. Letters must always read brighter
than the cloud around them, through motion and contrast, never through a halo.

## Letters and type
- One serif family: Source Serif 4 (VERIFIED, `@font-face`, L4). J R's line breaks and
  capitalization are kept exactly; copy and line breaks belong to the Story Writer.
- No wrapping. A poem scales so its longest line fits the open space; long prose splits only
  at sentence ends or commas (J R, Oct 14; REPORTED).
- Crispness comes from dots, not size: a smaller poem gets smaller dots, never fewer dots per
  letter (REPORTED).
- While readable, every dot stays locked to its letter. The poem may drift and sway slowly as
  one piece; words need not hold still, but must be crisp enough to read while moving
  (J R, Oct 14; REPORTED). Text facing is tracked in `TODO_POETRY_TEXT_ANGLE.md`.
- "with the" and "by the" stand alone as their own groups (REPORTED, Story Writer).

## Streak dim (calm area behind letters)
- Depends only on position, with a feathered edge and a 15% floor. No per-dot easing or lag
  (REPORTED locked).
- Dim changes at most 10%/s on the audio clock, measured on the whole cloud and the whole near
  layer; 7%/s is only a sizing target (REPORTED locked).
- An area holds at full dim until its group's dots have fully dissolved; no dim lifts under
  visible letters (REPORTED).
- No dark backing, halo, box, or darker zone behind text, ever (J R, Oct 14; REPORTED).
- Superseded: v2's "streaks slow to ~20% speed" inside the calm zone. The swirl is not slowed;
  only brightness is dimmed, as above.

## Hand-overs between groups
- The break-apart reads through motion, not brightness.
- Old words fall below readable, down to specks, by the first frame the new group is readable,
  at every hand-over.
- The old group may not start dissolving before the voice finishes its last word.
- Full checklist: `docs/art-direction/handover-look-acceptance.md` (separate PR).

## Readings
- The poem is read twice with a pause of about 2 s, then the page returns to the start; each
  group is locked to its voice cue (REPORTED; J R's v23.6.2 ask). Timing rules belong to the
  Motion Designer; this frame only requires that what is seen matches what is heard.

## Texture and motion
- Particles drift like rain-lit dust, never sparkles or confetti.
- Haze is fog after rain: low, wet, slow.

## How looks are judged
- At full swirl speed, by eye, against this frame.
- Smoothness is judged on real hardware with `?fbstats`, never on software renders (REPORTED).
  `?fbstats` is not in `main`'s `site/index.html` as of Nov 14 2026 (VERIFIED); it is REPORTED
  in candidate builds. The Builder owns adding it.

## Don'ts
- No stock "AI brain" imagery, circuit boards, or human faces in the poem scene.
- No neon cyberpunk palette.
- No text over a bright spot core.
- No glow or halo used to make letters read.

## Spots (placeholders, unchanged from v1)
Brain Fog 270 violet, AgentiCubed 190 cyan, Preincarnation 150 marble green-gray,
Verbal Kombat 5 red, Habitat/Aural 38 amber. Each spot's saturation stays under 0.7, so the poem
text always reads brighter than the spot around it.
