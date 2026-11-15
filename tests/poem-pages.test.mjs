import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  PATHS,
  SITE_ORIGIN,
  BANNED_IDS,
  BANNED_TITLES,
  publicPoems,
  liveManifestIds,
  metaDescription,
  stanzaLines,
  textFromStanzas,
  poemBodyHtml,
  buildPoemPages,
  assertPublicOnly,
} from '../tools/build-poem-pages.mjs';

const publicRaw = JSON.parse(readFileSync(PATHS.publicPoems, 'utf8'));
const published = publicPoems(publicRaw);
const built = buildPoemPages({ publicRaw, write: true });

function read(path) {
  return readFileSync(path, 'utf8');
}

function poemPath(id) {
  return join(PATHS.poemsDir, id, 'index.html');
}

function decodeHtml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function visiblePoemText(html) {
  const m = html.match(/<div class="poem">([\s\S]*?)<\/div>/);
  assert.ok(m, 'missing .poem');
  const stanzas = [...m[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(p =>
    [...p[1].matchAll(/<span class="l">([\s\S]*?)<\/span>/g)].map(l => decodeHtml(l[1]))
  );
  return textFromStanzas(stanzas);
}

function jsonLd(html) {
  const m = html.match(/<script type="application\/ld\+json">\n?([\s\S]*?)<\/script>/);
  assert.ok(m, 'missing JSON-LD');
  return JSON.parse(m[1]);
}

function meta(html, attr, valueNeedle) {
  const re = new RegExp(`<meta [^>]*${attr}="${valueNeedle}"[^>]*>`);
  return html.match(re);
}

test('builder emits exactly the 19 public poems and no others', () => {
  assert.equal(published.length, 19);
  assert.deepEqual(assertPublicOnly(published), []);
  assert.equal(built.poems.length, 19);
  assert.deepEqual(built.poems.map(p => p.id), published.map(p => p.id));
});

test("each generated page's poem text matches poems.public.json verbatim", () => {
  for (const poem of published) {
    assert.deepEqual(textFromStanzas(stanzaLines(poem.text)), poem.text, poem.id);
    const html = read(poemPath(poem.id));
    assert.equal(visiblePoemText(html), poem.text, poem.id);
  }
});

test('no non-public ids or titles appear in generated pages or the sitemap', () => {
  const blobs = [
    read(join(PATHS.poemsDir, 'index.html')),
    read(PATHS.sitemap),
    ...published.map(p => read(poemPath(p.id))),
  ];
  for (const blob of blobs) {
    for (const id of BANNED_IDS) {
      assert.equal(blob.includes(id), false, id);
    }
    for (const title of BANNED_TITLES) {
      assert.equal(blob.includes(title), false, title);
    }
  }
  const live = liveManifestIds();
  for (const id of BANNED_IDS) assert.equal(live.has(id), true, `expected ${id} in manifest only`);
  assert.ok(!existsSync(join(PATHS.poemsDir, BANNED_IDS[0])));
  assert.ok(!existsSync(join(PATHS.poemsDir, BANNED_IDS[1])));
});

test('sitemap lists home, the poem index, and every public poem', () => {
  const xml = read(PATHS.sitemap);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const expected = [
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/poems/`,
    ...published.map(p => `${SITE_ORIGIN}/poems/${p.id}/`),
  ];
  assert.deepEqual(locs, expected);
  assert.equal(locs.length, 21);
});

test('every page has canonical, title, description, and valid JSON-LD', () => {
  const pages = [
    {
      path: join(PATHS.poemsDir, 'index.html'),
      title: 'Poems — James Richmond',
      canonical: `${SITE_ORIGIN}/poems/`,
    },
    ...published.map(p => ({
      path: poemPath(p.id),
      title: `${p.title} — James Richmond`,
      canonical: `${SITE_ORIGIN}/poems/${p.id}/`,
      description: metaDescription(p.text),
    })),
  ];
  for (const page of pages) {
    const html = read(page.path);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
    assert.match(html, new RegExp(`<link rel="canonical" href="${page.canonical}">`));
    const desc = html.match(/<meta name="description" content="([^"]*)">/);
    assert.ok(desc, page.path);
    const descText = decodeHtml(desc[1]);
    assert.ok(descText.length > 0 && descText.length <= 150, `${page.path} description length ${descText.length}`);
    if (page.description) assert.equal(descText, page.description);
    assert.ok(meta(html, 'property', 'og:title'));
    assert.ok(meta(html, 'name', 'twitter:card'));
    assert.equal(html.includes('og:image'), false);
    const ld = jsonLd(html);
    assert.ok(ld['@type']);
    if (page.path !== join(PATHS.poemsDir, 'index.html')) {
      assert.equal(ld['@type'], 'CreativeWork');
      assert.equal(ld.genre, 'Poetry');
      assert.equal(ld.author?.name, 'James Richmond');
      assert.equal(ld.inLanguage, 'en');
      assert.equal(ld.isPartOf?.name, 'Cloud of Electrons — James Richmond');
      assert.equal(ld.isPartOf?.url, `${SITE_ORIGIN}/`);
      assert.equal(ld.url, page.canonical);
    }
  }
});

test('cloud link appears only for public poems in the live manifest', () => {
  const live = liveManifestIds();
  const hrefRe = /See it form in the cloud/;
  for (const poem of published) {
    const html = read(poemPath(poem.id));
    const should = live.has(poem.id);
    assert.equal(hrefRe.test(html), should, poem.id);
    if (should) {
      assert.match(html, new RegExp(`href="/#poem=${poem.id}"`));
    } else {
      assert.equal(html.includes('/#poem='), false, poem.id);
    }
  }
});

test('rebuilding is deterministic', () => {
  const again = buildPoemPages({ publicRaw, write: false });
  assert.deepEqual(Object.keys(again.files).sort(), Object.keys(built.files).sort());
  for (const path of Object.keys(built.files)) {
    assert.equal(again.files[path], built.files[path], path);
    assert.equal(read(path), built.files[path], path);
  }
});

test('footnotes sit in an aside after the poem; lines are hanging-indent blocks; font swaps', () => {
  for (const poem of published) {
    const html = read(poemPath(poem.id));
    assert.ok(!html.includes('<br'), poem.id);
    assert.match(html, /font-display:swap/, poem.id);
    const hasFn = /(^|\n\n)Footnotes\n/.test(poem.text);
    assert.equal(html.includes('<aside class="footnotes">'), hasFn, poem.id);
    if (hasFn) {
      const poemDiv = html.match(/<div class="poem">([\s\S]*?)<\/div>/)[1];
      const before = poemDiv.split('<aside class="footnotes">')[0];
      assert.ok(!before.includes('>Footnotes<'), poem.id);
    }
  }
});
