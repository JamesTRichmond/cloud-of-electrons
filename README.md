# Cloud of Electrons

<!-- portfolio summary -->
> **Portfolio summary.** The source of my personal site, **[jamestrichmond.com](https://jamestrichmond.com)**: a WebGL particle cloud where my published poems condense out of the swirl one at a time, then scatter back.
>
> **Stack:** WebGL · vanilla JavaScript · Python build tools (glyph sampling, standalone single-file packer)
>
> **Notable engineering:** poems become particle targets through a glyph-sampling pipeline; a packer emits one self-contained HTML file that runs from disk; a publish filter guarantees only poems marked `public: true` ever reach the repo.

A WebGL particle cloud where J R's public poems form out of the swirl, one at a time, then scatter back into it.

- `site/` is the static page. Serve it from any static host; open `index.html` through a web server, not from disk.
- `tools/pack_standalone.py` builds a single `cloud-of-electrons.html` that does run from disk (double-click).
- `tools/make_glyphs.py` turns a poems file into `site/glyphs/`. It only ever includes poems marked `public: true`. The full poems file is never committed.

Test shortcuts: add `#poem` to the address to form a poem right away; `?poem=<id>` shows one poem's first stanza.

Nothing here is deployed. Changes go through pull requests; nothing reaches jamestrichmond.com without J R's yes.
