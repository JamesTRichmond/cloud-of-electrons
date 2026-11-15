# Color and type tokens: spec vs `main` (Art Director)

Purpose: one place where the look's colors and type are named, with where each lives in the
code today, so the Builder, Modeler and Motion Designer work from the same values. This file
changes no code. Where the code and the locked spec disagree, the row is flagged for the
Builder and for J R's pick.

Read from `main` @ 790c6ed on Nov 14 2026 (VERIFIED). Spec values are REPORTED team decisions.

| Token | Spec | `main` today (VERIFIED) | Match? | Owner of any change |
|---|---|---|---|---|
| Ground | #05070D | `BG0=[5/255,7/255,13/255]`, `site/index.html` L329 | yes | - |
| Poem letters | #F2F2EE at full opacity (locked default, "o2f") | `TEXT_TINT=[0xF4,0xE1,0xBC]` = #F4E1BC, L263, scaled by `TEXT_LUM` | **no** | J R picks; Builder applies |
| Poem letters, alt | #F4E1BC (PENDING J R) | as above | is current | J R |
| Letter comment | - | L263 comment says the tint makes text "read as #EDE6D6" | stale | Builder, if the tint changes |
| UI / panel text | #EDE6D6 | `CRM=hex('#EDE6D6')` L329; Open Field CSS L9-50 | yes | - |
| UI accent | amber | `AMBER=hex('#fad685')` L329 | yes | - |
| Cool accent | blue | `COOL=hex('#6b8cb8')` L329 | yes | - |
| Swirl hue blend | v23.5 formula, never altered | `hsl(220+(hue-220)*hw, min(.7,.15+.4*hw), .33+.12*hw)` L1133 | yes | nobody; locked |
| Typeface | Source Serif 4, one family | `@font-face` L4, `site/SourceSerif4.ttf` | yes | - |
| Style frame text | must match the above | `site/style-frame.md` v1 says #EDE6D6 letters | **no** | Art Director (style-frame v3 PR) |

## Rules for using these tokens
- Letters must read brighter than the cloud around them through contrast and motion, never
  through a halo, glow or dark backing.
- Nothing may tint, desaturate or re-time the swirl to help letters read.
- Any new scene element (nebula text, v23.7, v24) gets its colors added to this table in its
  style brief before build work starts.

## Open decision for J R (via Nimby)
Letters: #F2F2EE (team default) or #F4E1BC (on `main` now). The Art Director judges both on the
same build and the same hand-overs; the Builder changes `TEXT_TINT` only after J R picks.
