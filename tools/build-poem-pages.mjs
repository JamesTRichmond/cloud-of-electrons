#!/usr/bin/env node
/**
 * Generate plain, search-findable pages for the 19 public poems:
 *   site/poems/<slug>/index.html
 *   site/poems/index.html
 *   site/sitemap.xml
 *
 * Text comes only from story/poems.public.json. Slugs are the poem ids
 * already used in that file and in site/glyphs/manifest.json.
 * "See it form in the cloud" is emitted only when the id is in the live
 * manifest. site/robots.txt is not written: none exists in the repo, but
 * a Cloudflare-managed robots.txt is already served on the live site.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_ORIGIN = 'https://jamestrichmond.com';
export const SITE_NAME = 'Cloud of Electrons — James Richmond';
export const AUTHOR = 'James Richmond';

export const PATHS = {
  publicPoems: join(ROOT, 'story/poems.public.json'),
  manifest: join(ROOT, 'site/glyphs/manifest.json'),
  poemsDir: join(ROOT, 'site/poems'),
  sitemap: join(ROOT, 'site/sitemap.xml'),
  robots: join(ROOT, 'site/robots.txt'),
};

export const BANNED_IDS = Object.freeze([
  'ttcem-dinosaur-footprints',
  'ttcem-halloween-again',
]);
export const BANNED_TITLES = Object.freeze([
  'Dinosaur Footprints',
  'Halloween Again',
]);

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function publicPoems(raw) {
  return (raw ?? loadJson(PATHS.publicPoems)).filter(p => p && p.public === true);
}

export function liveManifestIds(manifest) {
  const man = manifest ?? loadJson(PATHS.manifest);
  return new Set((man.poems || []).map(p => p.id));
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** First line(s), collapsed to a single line, trimmed to ~150 characters at a word boundary. */
export function metaDescription(text, limit = 150) {
  const plain = String(text).replace(/\s+/g, ' ').trim();
  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  const trimmed = (sp >= 80 ? cut.slice(0, sp) : cut).trim();
  return trimmed;
}

export function stanzaLines(text) {
  const stanzas = [];
  let cur = [];
  for (const line of String(text).split('\n')) {
    if (line === '') {
      if (cur.length) {
        stanzas.push(cur);
        cur = [];
      }
    } else {
      cur.push(line);
    }
  }
  if (cur.length) stanzas.push(cur);
  return stanzas;
}

/** Reconstruct the source text from stanzaLines() (no trailing newline, matching poems.public.json). */
export function textFromStanzas(stanzas) {
  return stanzas.map(lines => lines.join('\n')).join('\n\n');
}

export function poemBodyHtml(text) {
  return stanzaLines(text)
    .map(lines => `<p>${lines.map(escapeHtml).join('<br>\n')}</p>`)
    .join('\n');
}

export function fontHref(depth) {
  return `${'../'.repeat(depth)}SourceSerif4.ttf`;
}

function jsonLdScript(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

function headTags({ title, description, canonical, ogType, fontDepth, jsonLd }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="${escapeHtml(ogType)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<style>
@font-face{font-family:"Source Serif 4";src:url(${fontHref(fontDepth)})}
html,body{margin:0;background:#05070D;color:#F4E1BC;font:1.05rem/1.55 "Source Serif 4",serif}
main{max-width:40ch;margin:0 auto;padding:2rem 1.25rem 4rem}
nav{margin:0 0 1.75rem;font-size:.95rem}
h1{font-weight:600;font-size:1.65rem;line-height:1.25;margin:0 0 1.25rem}
article .poem p{margin:0 0 1.15em}
a{color:#F4E1BC}
a:focus-visible{outline:1px solid #F4E1BC;outline-offset:2px}
.cloud-link{margin:2rem 0 0}
</style>
${jsonLdScript(jsonLd)}`;
}

export function poemPageHtml(poem, { liveIds }) {
  const slug = poem.id;
  const title = `${poem.title} — ${AUTHOR}`;
  const description = metaDescription(poem.text);
  const canonical = `${SITE_ORIGIN}/poems/${slug}/`;
  const live = liveIds.has(slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    genre: 'Poetry',
    name: poem.title,
    headline: title,
    author: { '@type': 'Person', name: AUTHOR },
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    url: canonical,
    description,
  };
  const cloud = live
    ? `<p class="cloud-link"><a href="/#poem=${encodeURIComponent(slug)}">See it form in the cloud</a></p>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
${headTags({ title, description, canonical, ogType: 'article', fontDepth: 2, jsonLd })}
</head>
<body>
<main>
<nav><a href="/poems/">All poems</a></nav>
<article>
<h1>${escapeHtml(poem.title)}</h1>
<div class="poem">
${poemBodyHtml(poem.text)}
</div>
</article>
${cloud}
</main>
</body>
</html>
`;
}

export function indexPageHtml(poems) {
  const title = `Poems — ${AUTHOR}`;
  const description = 'Nineteen poems by James Richmond.';
  const canonical = `${SITE_ORIGIN}/poems/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    inLanguage: 'en',
    author: { '@type': 'Person', name: AUTHOR },
    url: canonical,
    description,
    hasPart: poems.map(p => ({
      '@type': 'CreativeWork',
      genre: 'Poetry',
      name: p.title,
      url: `${SITE_ORIGIN}/poems/${p.id}/`,
      author: { '@type': 'Person', name: AUTHOR },
    })),
  };
  const items = poems
    .map(p => `<li><a href="/poems/${encodeURIComponent(p.id)}/">${escapeHtml(p.title)}</a></li>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
${headTags({ title, description, canonical, ogType: 'website', fontDepth: 1, jsonLd })}
</head>
<body>
<main>
<nav><a href="/">Cloud of Electrons</a></nav>
<article>
<h1>Poems</h1>
<ul>
${items}
</ul>
</article>
</main>
</body>
</html>
`;
}

export function sitemapXml(poems) {
  const urls = [
    `${SITE_ORIGIN}/`,
    `${SITE_ORIGIN}/poems/`,
    ...poems.map(p => `${SITE_ORIGIN}/poems/${p.id}/`),
  ];
  const body = urls
    .map(u => `  <url>\n    <loc>${escapeHtml(u)}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function assertPublicOnly(poems) {
  const problems = [];
  for (const p of poems) {
    if (!p.public) problems.push(`not marked public: ${p.id}`);
    if (BANNED_IDS.includes(p.id)) problems.push(`banned id: ${p.id}`);
    if (BANNED_TITLES.includes(p.title)) problems.push(`banned title: ${p.title}`);
  }
  return problems;
}

export function buildPoemPages({ publicRaw, manifest, write = true } = {}) {
  const poems = publicPoems(publicRaw);
  if (poems.length !== 19) {
    throw new Error(`expected 19 public poems, got ${poems.length}`);
  }
  const problems = assertPublicOnly(poems);
  if (problems.length) throw new Error(problems.join('\n'));
  const liveIds = liveManifestIds(manifest);
  const files = {
    [join(PATHS.poemsDir, 'index.html')]: indexPageHtml(poems),
    [PATHS.sitemap]: sitemapXml(poems),
  };
  for (const poem of poems) {
    files[join(PATHS.poemsDir, poem.id, 'index.html')] = poemPageHtml(poem, { liveIds });
  }
  if (write) {
    mkdirSync(PATHS.poemsDir, { recursive: true });
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
    }
  }
  const robotsExistsInRepo = existsSync(PATHS.robots);
  return { poems, liveIds, files, robotsExistsInRepo };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const result = buildPoemPages();
  const n = Object.keys(result.files).length;
  console.log(`Wrote ${n} files (${result.poems.length} poems + index + sitemap) under site/poems/ and site/sitemap.xml`);
  const livePublic = result.poems.filter(p => result.liveIds.has(p.id)).map(p => p.id);
  console.log(`Cloud links on ${livePublic.length} live public poems: ${livePublic.join(', ')}`);
  if (result.robotsExistsInRepo) {
    console.log('site/robots.txt already exists in the repo; left unchanged.');
  } else {
    console.log('No site/robots.txt in the repo; not writing one. The live site already serves a Cloudflare-managed robots.txt (no Sitemap line).');
  }
}
