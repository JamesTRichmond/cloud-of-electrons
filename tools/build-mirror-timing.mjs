#!/usr/bin/env node
/**
 * Build story/mirror-timing.json — per public poem, per group:
 * text from story/poems.public.json, and formStart / legible / scatter
 * on the group clock the page uses (seconds after active.t0).
 *
 * Never invents numbers. Times that cannot be derived from repo data
 * are null with a reason. Non-public poems (even if they appear in
 * site/glyphs/manifest.json) are excluded.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const PATHS = {
  publicPoems: join(ROOT, 'story/poems.public.json'),
  manifest: join(ROOT, 'site/glyphs/manifest.json'),
  segments: join(ROOT, 'site/poem-segments.json'),
  out: join(ROOT, 'story/mirror-timing.json'),
};

// site/index.html:2184-2186 (window.coeHughSeg, when a slice exists)
export const SEG_GATHER_D = 0.5;
export const SEG_SCATTER_D = 0.35;
export const SEG_READ_D_MIN = 0.4;

const NULL_NOT_ON_PAGE =
  'Poem is not in site/glyphs/manifest.json; site/index.html:215 loads only manifest poems (poems=man.poems), so this poem is never started and has no poem-segments.json slices.';

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function publicPoems(raw) {
  return raw.filter(p => p && p.public === true);
}

export function nonblankLines(text) {
  return String(text).split('\n').filter(l => l.trim() !== '');
}

/** Same grouping as tools/make_glyphs.py: stanzas, then chunks of at most 4 non-blank lines. No font wrapping, so every line stays verbatim public text. */
export function groupsFromPublicText(text) {
  const stanzas = String(text).split(/\n\s*\n/).filter(s => s.trim());
  const groups = [];
  for (const stanza of stanzas) {
    const lines = stanza.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i += 4) groups.push(lines.slice(i, i + 4));
  }
  return groups;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/** Nominal segTL times relative to active.t0, assuming dur = e - s (clip not ahead of the slice). */
export function nominalSegTimes(slice) {
  const [s, e] = slice;
  const dur = e - s;
  const gatherD = SEG_GATHER_D;
  const scatterD = SEG_SCATTER_D;
  const readD = Math.max(SEG_READ_D_MIN, dur - scatterD);
  return {
    formStart: 0,
    legible: gatherD,
    scatter: round3(gatherD + readD),
    gatherD,
    readD: round3(readD),
    scatterD,
    audioSlice: [s, e],
  };
}

export function buildMirrorTiming({ publicRaw, manifest, segments } = {}) {
  const pubs = publicPoems(publicRaw ?? loadJson(PATHS.publicPoems));
  const man = manifest ?? loadJson(PATHS.manifest);
  const segsDoc = segments ?? loadJson(PATHS.segments);

  const manById = Object.fromEntries((man.poems || []).map(p => [p.id, p]));
  const segsById = segsDoc.poems || {};

  const manifestIds = (man.poems || []).map(p => p.id);
  const publicIds = pubs.map(p => p.id);
  const publicSet = new Set(publicIds);

  const drift = {
    inManifestNotPublic: manifestIds.filter(id => !publicSet.has(id)),
    publicNotInManifest: publicIds.filter(id => !manById[id]),
    inSegmentsNotPublic: Object.keys(segsById).filter(id => !publicSet.has(id)),
    note:
      'site/glyphs/manifest.json, site/poem-segments.json, site/voices/hugh-poems/, and the KEEP list at site/index.html:2191 include ttcem-dinosaur-footprints (Dinosaur Footprints) and ttcem-halloween-again (Halloween Again). Those two are not in story/poems.public.json and are excluded from this map. Eleven public poems have glyph .bin files but are omitted from the live manifest, so the page never starts them.',
  };

  const poems = pubs.map(pub => {
    const manPoem = manById[pub.id];
    const segs = segsById[pub.id];
    const onPage = !!manPoem;

    let groupLines;
    let grouping;
    if (onPage) {
      groupLines = manPoem.groups.map(g => g.lines);
      grouping = 'site/glyphs/manifest.json groups; each line equals a non-blank line of story/poems.public.json';
    } else {
      groupLines = groupsFromPublicText(pub.text);
      grouping = 'tools/make_glyphs.py stanza split, max 4 lines (poem is not on the live page; timings are null)';
    }

    const pubLines = new Set(nonblankLines(pub.text));
    for (const lines of groupLines) {
      for (const line of lines) {
        if (!pubLines.has(line)) {
          throw new Error(`${pub.id}: group line not verbatim in poems.public.json: ${JSON.stringify(line)}`);
        }
      }
    }

    const groups = groupLines.map((lines, index) => {
      const text = lines.join('\n');
      const base = {
        index,
        lines,
        text,
        formStart: null,
        legible: null,
        scatter: null,
      };

      if (!onPage) {
        return { ...base, timingSource: null, nullReason: NULL_NOT_ON_PAGE };
      }

      const slice = segs && Array.isArray(segs.segs) ? segs.segs[index] : undefined;
      if (!slice) {
        return {
          ...base,
          timingSource: null,
          nullReason:
            'No poem-segments.json slice for this group, so scatter cannot be derived. formStart/legible would be 0/0.5 under coeHughSeg only if the poem were in window.coeHughSegs; without a slice, start() does not set active.seg (site/index.html:254) and poemTimeline in site/motion.js would apply instead — not written here because a missing slice is a data gap, not a number we should invent.',
        };
      }

      const times = nominalSegTimes(slice);
      return {
        ...base,
        formStart: times.formStart,
        legible: times.legible,
        scatter: times.scatter,
        timingSource: 'segTL',
        gatherD: times.gatherD,
        readD: times.readD,
        scatterD: times.scatterD,
        audioSlice: times.audioSlice,
        scatterAssumption:
          'scatter = gatherD + max(0.4, (e-s) - 0.35) with [s,e] from poem-segments.json. Actual readD at runtime is max(0.4, (e - hughAu.currentTime) - 0.35) when the clip is playing (site/index.html:2177-2185). Times are seconds after active.t0, not Hugh-clip currentTime.',
      };
    });

    return {
      id: pub.id,
      title: pub.title,
      section: pub.section,
      public: true,
      onPage,
      grouping,
      groups,
    };
  });

  return {
    version: 1,
    generatedBy: 'tools/build-mirror-timing.mjs',
    clock: {
      name: 'group-t0',
      unit: 'seconds after active.t0',
      t0: 'active.t0 = performance.now()/1000 in start() (site/index.html:253)',
      phaseEval:
        'frame(nowMs) sets t = nowMs/1000 (site/index.html:1984) and calls segTL(t) when active.seg is set, else poemTimeline(...) (site/index.html:1989). segTL is site/index.html:295.',
      phases:
        'formStart = 0 (gather begins). legible = gatherD (phase becomes read; letters are settled, wt=1). scatter = gatherD + readD (phase becomes scatter).',
      audio:
        'audioSlice [s,e] is Hugh-clip currentTime from site/poem-segments.json (loaded at site/index.html:2138 into window.coeHughSegs). This is not the phase clock.',
      hiddenTab:
        'Poem phases use wall-clock t (rAF nowMs/1000), not the clamped scene clock window.__ST (site/index.html:1984). A hidden tab pauses rAF; on return, t - active.t0 can jump and skip phases in one frame.',
    },
    constants: {
      segGatherD: SEG_GATHER_D,
      segScatterD: SEG_SCATTER_D,
      segReadDMin: SEG_READ_D_MIN,
      source: 'site/index.html:2184-2186 window.coeHughSeg',
    },
    drift,
    poems,
  };
}

export function assertMirrorSafe(doc, publicRaw) {
  const pubs = publicPoems(publicRaw);
  const pubById = Object.fromEntries(pubs.map(p => [p.id, p]));
  const seen = new Set();
  const problems = [];

  for (const poem of doc.poems) {
    if (seen.has(poem.id)) problems.push(`duplicate poem id ${poem.id}`);
    seen.add(poem.id);
    const pub = pubById[poem.id];
    if (!pub) problems.push(`non-public or unknown poem in mirror: ${poem.id}`);
    else {
      const allowed = new Set(nonblankLines(pub.text));
      for (const g of poem.groups) {
        for (const line of g.lines) {
          if (!allowed.has(line)) problems.push(`${poem.id}: line not verbatim in poems.public.json: ${JSON.stringify(line)}`);
        }
        if (g.text !== g.lines.join('\n')) problems.push(`${poem.id} group ${g.index}: text !== lines.join('\\n')`);
      }
    }
  }

  for (const p of pubs) {
    if (!seen.has(p.id)) problems.push(`public poem missing from mirror: ${p.id}`);
  }

  return problems;
}

function main() {
  const publicRaw = loadJson(PATHS.publicPoems);
  const doc = buildMirrorTiming({ publicRaw });
  const problems = assertMirrorSafe(doc, publicRaw);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  writeFileSync(PATHS.out, JSON.stringify(doc, null, 2) + '\n');
  const onPage = doc.poems.filter(p => p.onPage).length;
  const timed = doc.poems.reduce((n, p) => n + p.groups.filter(g => g.legible != null).length, 0);
  const nulled = doc.poems.reduce((n, p) => n + p.groups.filter(g => g.legible == null).length, 0);
  console.log(`wrote ${PATHS.out}`);
  console.log(`${doc.poems.length} public poems (${onPage} on-page); ${timed} groups with times, ${nulled} with null times`);
  console.log('drift inManifestNotPublic:', doc.drift.inManifestNotPublic.join(', '));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
