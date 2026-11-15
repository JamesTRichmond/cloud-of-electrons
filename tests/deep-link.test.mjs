import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_POEM_IDS,
  BANNED_IDS,
  parseDeepLink,
  resolveDeepLink,
  hashForPoem,
  sharePath,
} from '../site/deep-link.js';

const publicRaw = JSON.parse(await readFile(new URL('../story/poems.public.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../site/glyphs/manifest.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(manifest.poems.map(p => [p.id, p]));
const publicIds = publicRaw.filter(p => p.public).map(p => p.id);
const html = await readFile(new URL('../site/index.html', import.meta.url), 'utf8');

test('allowlist matches the 19 public poem ids and excludes non-public glyphs', () => {
  assert.deepEqual([...PUBLIC_POEM_IDS], publicIds);
  assert.equal(PUBLIC_POEM_IDS.length, 19);
  for (const id of BANNED_IDS) {
    assert.equal(PUBLIC_POEM_IDS.includes(id), false);
    assert.equal(publicIds.includes(id), false);
    assert.ok(byId[id], 'banned id is in the live manifest');
  }
});

test('parseDeepLink reads #poem, #poem=slug, &line=N, and ?poem=&group=', () => {
  assert.deepEqual(parseDeepLink('#poem', ''), {
    poem: null, line: null, flag: true, fromQuery: false, fromHash: true,
  });
  assert.equal(parseDeepLink('#poem=ttcem-flying-around', '').poem, 'ttcem-flying-around');
  assert.equal(parseDeepLink('#poem=ttcem-flying-around&line=3', '').line, 3);
  assert.equal(parseDeepLink('#poem=ttcem-flying-around&line=3', '').flag, true);
  const q = parseDeepLink('', '?poem=ttcem-fabulous&group=2');
  assert.equal(q.poem, 'ttcem-fabulous');
  assert.equal(q.line, 2);
  assert.equal(q.fromQuery, true);
  assert.equal(parseDeepLink('#other', '').flag, false);
  assert.equal(parseDeepLink('#poem=ttcem-flying-around&line=nope', '').line, null);
  assert.equal(parseDeepLink(hashForPoem('ttcem-jagged-rocks', 1), '').poem, 'ttcem-jagged-rocks');
});

test('unknown or non-public slugs resolve to null so the page falls back to normal', () => {
  assert.equal(resolveDeepLink(parseDeepLink('#poem=not-a-poem', ''), byId), null);
  assert.equal(resolveDeepLink(parseDeepLink('#poem=ttcem-goliath', ''), byId), null); // public, not in live manifest
  assert.equal(resolveDeepLink(parseDeepLink('#poem=ttcem-halloween-again', ''), byId), null);
  assert.equal(resolveDeepLink(parseDeepLink('#poem=ttcem-dinosaur-footprints', ''), byId), null);
  assert.equal(resolveDeepLink(parseDeepLink('#poem', ''), byId), null);
});

test('a live public slug resolves, and line is a group index clamped to the poem', () => {
  const id = 'ttcem-flying-around';
  const n = byId[id].groups.length;
  const r = resolveDeepLink(parseDeepLink(`#poem=${id}&line=3`), byId);
  assert.equal(r.id, id);
  assert.equal(r.p, byId[id]);
  assert.equal(r.gi, 3);
  const over = resolveDeepLink(parseDeepLink(`#poem=${id}&line=${n + 5}`), byId);
  assert.equal(over.gi, 0);
  const bare = resolveDeepLink(parseDeepLink(`#poem=${id}`), byId);
  assert.equal(bare.gi, 0);
});

test('hashForPoem / sharePath stay shareable and parse back', () => {
  const h = hashForPoem('ttcem-fabulous', 0);
  assert.equal(h, '#poem=ttcem-fabulous&line=0');
  assert.equal(sharePath('/', '', 'ttcem-fabulous', 0), '/#poem=ttcem-fabulous&line=0');
  assert.equal(sharePath('/', '?x=1', 'ttcem-fabulous', 2), '/?x=1#poem=ttcem-fabulous&line=2');
  const parsed = parseDeepLink(h, '');
  assert.equal(parsed.poem, 'ttcem-fabulous');
  assert.equal(parsed.line, 0);
});

test('index.html imports the parser and hooks hash / start / beginPoem / replaceState', () => {
  assert.match(html, /from '\.\/deep-link\.js'/);
  assert.match(html, /parseDeepLink\(location\.hash,location\.search\)/);
  assert.match(html, /history\.replaceState/);
  assert.match(html, /addEventListener\('hashchange'/);
  assert.match(html, /pendingDeep/);
  assert.match(html, /syncPoemHash/);
  // must not add a new audio-unlock UI
  assert.equal(/click to (enable|start|unlock) (audio|sound)/i.test(html), false);
});
