# Cloud of Electrons

A WebGL2 particle field where poems condense out of the swirl one at a time, hold long enough to read, then scatter back. It runs at [jamestrichmond.com](https://jamestrichmond.com).

## What's in it

- **Poem forming.** Each public poem is pre-sampled into glyph point clouds (`site/glyphs/`). Particles are attracted to those points, settle into readable lines, then release.
- **Scale.** About 190,000 particles in near, mid and far shells, plus a 3D spiral galaxy to explore past the cloud.
- **Open Field panel.** Pick poetry or meditation, choose a poem, set a timer, volume and brown noise. Everything is reachable by keyboard.
- **Guided meditation.** Sessions are assembled from a graph of recorded clips. Pacing modes take different paths through it while the scheduler holds the total length, and `test_meditation_scheduler.js` checks the timing.
- **A restoration puzzle.** Align three anchor nodes to bring a dormant constellation back to full form and reopen the return path.
- **Sound.** Web Audio forming cues, a brown-noise bed, and voiced passages.

## How it's built

| Area | Choice |
| --- | --- |
| Rendering | Hand-written WebGL2 and GLSL in one static page. No framework, no bundler |
| Modules | Small decoupled scripts (`events.js`, `motion.js`, `meditation/`, `puzzle/`) that talk over a shared event bus |
| Content pipeline | Python tools turn a poems file into glyph data. Only poems marked `public: true` are included, and the full poems file is never committed |
| Portability | `tools/pack_standalone.py` packs everything into one HTML file that runs from disk |
| Accessibility | `prefers-reduced-motion` is honored, and controls carry ARIA labels and live-region status |
| Verification | Headless Chrome (CDP) scripts check rendering states and timing, with screenshots committed alongside |

## Run it

Serve `site/` from any static server. It has to be a server, not `file://`:

```sh
python3 -m http.server -d site 8000
```

Then open http://localhost:8000. Shortcuts: add `#poem` to the URL to form a poem right away, or `?poem=<id>` to show one poem's first stanza.

To build the single-file version:

```sh
python3 tools/pack_standalone.py
```

## Deploys

Changes land through pull requests. Nothing reaches jamestrichmond.com without J R's approval.
