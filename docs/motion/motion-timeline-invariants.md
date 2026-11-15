# motion.js invariants (Motion lane)

`tests/motion-timeline.test.mjs` imports `site/motion.js` byte-for-byte (same pattern as `tests/map-touch.test.mjs`) and pins the motion rules the file states in its own comments:

- Phases only move forward: gather → read → scatter → done.
- Progress `p` stays in [0, 1].
- Drift speed never exceeds `T.maxDriftFrac` (3% of poem width per second) on x.
- Sway never exceeds `T.maxTiltRad` (~3.4°): "no spinning".
- Reading time = 0.6 s/word + 4 s per 4 lines, capped at `T.readCap`, scaled per section.
- `readOverride` (audio-locked groups) replaces the computed read time exactly.
- `easeInOut` is monotonic from 0 to 1.

Run: `node --test tests/motion-timeline.test.mjs` (8/8 pass on 790c6ed, Node 22). No file under `site/` changes.

Not covered (needs page code, Builder-owned): `segTL`/`capTL` in `site/index.html`, and the text-plane angle (see `docs/motion/text-facing-clock.md` on `motion/text-facing-clock`). Wiring `node --test tests/` into `.github/workflows/ci.yml` is a separate call for the CI owner; the four existing `tests/*.mjs` files aren't in CI either (VERIFIED).
