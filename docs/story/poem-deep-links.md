# Poem deep links

Shareable URLs of the form `https://jamestrichmond.com/#poem=<slug>` and optional `&line=N`, where `<slug>` is a public poem id and `N` is a group index in `site/glyphs/manifest.json`. Parser and helpers live in `site/deep-link.js`. The Builder owns `site/index.html`; the hook below is the smallest wiring for review.

Only the 19 ids in `story/poems.public.json` may be written into the hash. Two non-public ids that are in the live manifest and in the `KEEP` list (`site/index.html:2192`) are refused by `resolveDeepLink` (`ttcem-dinosaur-footprints`, `ttcem-halloween-again`). Eleven public poems are not in the live manifest (`site/index.html:214-216` loads only `glyphs/manifest.json`); those slugs also resolve to null.

## Behaviour

- **Parse on load and on hashchange.** `parseDeepLink(location.hash, location.search)` runs at boot (`site/index.html:248`) and on `hashchange` (`site/index.html:2195`). Supported forms: `#poem` (bare flag, existing), `#poem=<slug>`, `#poem=<slug>&line=N`, and the older query `?poem=<slug>&group=N` (or `?line=N`).
- **Unknown slug falls back to normal.** `resolveDeepLink` returns null when the slug is missing, not public, or not in the loaded `byId` map. A boot hash of `#poem=unknown` does not turn poetry on and does not queue a poem; `start()` then uses `pick()` only after poetry is started some other way, same as a visit with no hash. Bare `#poem` (no slug) and `?poem` still set `POEMS_ON` as before. A valid live public slug sets `pendingDeep` and `POEMS_ON=true` with `next=0`, so the first `start()` uses that poem and group.
- **`line=N` is a group index**, not a typographic line. Out-of-range or invalid `line` becomes `0`. After `start()` consumes `pendingDeep`, later groups in an unsequenced loop use `pick()` as they do today. A sequenced reading (`beginPoem`, `site/index.html:2198-2215`) starts at the requested group (`gi: req?req.gi:0` at `:2211`) and then walks the rest of the poem.
- **Audio requires a user gesture. Show nothing new.** No new unlock banner or button. Brown-noise / `AudioContext` already resume on the first pointer, key, or touch (`site/index.html:2224-2227`). The forming-breath sample already waits for `soundOK` from the first pointer or key (`site/index.html:247`). Hugh's reading is still started only from `beginPoem` → `playHughPoem` (`site/index.html:2213`, `:2158`). A deep link does not call `playHughPoem` by itself; it only queues the requested poem so the first playback — visual `start()` when `POEMS_ON` is set, or `beginPoem` when the visitor presses Begin — starts that poem first. If `play()` is rejected, `playHughPoem` already swallows the error (`site/index.html:2162-2165`).
- **Update the hash as poems change.** `syncPoemHash` (`site/index.html:248`) calls `history.replaceState` with `#poem=<id>&line=<gi>` after a poem/group is chosen in `start()` (`site/index.html:249`). `replaceState` does not fire `hashchange`. Non-public ids are never written. The URL stays shareable for whatever public group is on screen, including a bare `#poem` visit once the first group is picked.
- **hashchange of a valid link** re-queues `pendingDeep`, selects the Open Field dropdown if that id is in `KEEP`, sets `POEMS_ON` and `next=0`, and scatters an already-forming group so `start()` can run the new request (`site/index.html:2195`). An unknown hash is ignored (the current poem is left alone).
- **Open Field.** If the requested id is in the `KEEP` dropdown, it is selected at boot (`site/index.html:2193`). `beginPoem` prefers `pendingDeep` or the current hash over the dropdown (`site/index.html:2205-2211`). Begin still starts a sequenced reading when poetry is only in the unsequenced `POEMS_ON` loop; End still calls `stopPoetry` when `window.coePoetrySeq.on` is true (`site/index.html:2223`). That keeps Begin from turning off a deep-linked group before Hugh can start.
- **Reduced motion.** `prefers-reduced-motion` is already read at `site/index.html:87`. It still removes camera drift (`:91` area), tilt and offsets (`:1993-1994` area), and speeds gather/scatter through `wt` (`:1991`). Deep links do not add motion, change phase times, or bypass `reduced`. Announce and form on the same clocks as a normal start.

## Insertion points

Line numbers are on this branch, after the hook. `790c6ed` equivalents are one line earlier for anything that sat after the new import (`site/index.html:73`).

| Where | What to do |
|---|---|
| `site/index.html:73` | Import `parseDeepLink`, `resolveDeepLink`, `hashForPoem`, `PUBLIC_POEM_IDS` from `./deep-link.js`. |
| `site/index.html:248` | Parse the boot hash; set `pendingDeep`; define `syncPoemHash`; set `POEMS_ON` / `next` from a resolved slug, bare `#poem`, or `?poem`. Replaces the old the old `#poem` / `?poem` test test. |
| `site/index.html:249` `start()` | Use `pendingDeep` once for `p` and `gi` when a sequence is not already on, then `syncPoemHash(p.id, gi)`. Replaces the old `URLSearchParams(location.search)` `?poem` / `?group` pick. |
| `site/index.html:2193-2195` | After the `KEEP` dropdown is filled (`:2192`), select the pending id; listen for `hashchange`. |
| `site/index.html:2198-2215` `beginPoem` | Resolve pending/hash, start the sequenced reading at that group, play Hugh as before. |
| `site/index.html:2223` | Stop only when a sequenced reading is on, so Begin can still start Hugh after a deep-linked group is already forming. |

`start()` is still only scheduled from the frame loop at `site/index.html:1988` (`VD.mode==='front' && POEMS_ON && !active && nowMs>=next`).

## Not in this diff

- No new audio unlock UI.
- No change to reduced-motion curves.
- The `KEEP` list and live manifest are left as they are, including the two non-public ids; only resolution and hash writing refuse them.
- Public poems that are not in the live manifest cannot be started from a hash (same as the Open Field dropdown). Their plain text pages still exist on the `copy/poem-pages` branch.

Rebuild nothing. Unit tests: `node --test tests/deep-link.test.mjs`.
