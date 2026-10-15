# Cloud of Electrons

A WebGL particle cloud where J R's public poems form out of the swirl, one at a time, then scatter back into it.

- `site/` is the static page. Serve it from any static host; open `index.html` through a web server, not from disk.
- `tools/pack_standalone.py` builds a single `cloud-of-electrons.html` that does run from disk (double-click).
- `tools/make_glyphs.py` turns a poems file into `site/glyphs/`. It only ever includes poems marked `public: true`. The full poems file is never committed.

Test shortcuts: add `#poem` to the address to form a poem right away; `?poem=<id>` shows one poem's first stanza.

Nothing here is deployed. Changes go through pull requests; nothing reaches jamestrichmond.com without J R's yes.
