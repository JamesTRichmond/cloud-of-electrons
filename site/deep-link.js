/** Shareable poem deep links: /#poem=<slug> and optional &line=N (group index). */
export const PUBLIC_POEM_IDS = Object.freeze([
  'ttcem-flying-around',
  'ttcem-midnight-orgy',
  'ttcem-don-t-shit-in-my-christmas-spirit',
  'ttcem-i-love-my-dog',
  'ttcem-the-day-the-cat-got-lost',
  'ttcem-metta-in-vermont',
  'ttcem-sunshine',
  'ttcem-goliath',
  'ttcem-dragon-camp',
  'ttcem-machines-are-fighting-for-our-freedom',
  'ttcem-the-mothership',
  'ttcem-jagged-rocks',
  'ttcem-on-guard',
  'ttcem-bound-ing',
  'ttcem-suicide-party',
  'ttcem-damien-s-public-gournal-1',
  'ttcem-fabulous',
  'ttcem-i-loved-my-country-and-you-loved-your-cat',
  'ttcem-now-i-don-t-throw-dirt-in-people-s-soup',
]);

export const BANNED_IDS = Object.freeze([
  'ttcem-dinosaur-footprints',
  'ttcem-halloween-again',
]);

function parseLine(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const n = Number.parseInt(s, 10);
  return Number.isInteger(n) && n >= 0 && String(n) === s ? n : null;
}

/**
 * Parse #poem, #poem=<slug>, #poem=<slug>&line=N, and the older ?poem=&group= query.
 * Does not resolve whether the slug is live or public.
 */
export function parseDeepLink(hash = '', search = '') {
  const result = { poem: null, line: null, flag: false, fromQuery: false, fromHash: false };
  const searchStr = String(search || '');
  const q = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  const raw = String(hash || '');
  const h = raw.startsWith('#') ? raw.slice(1) : raw;
  if (h === 'poem') {
    result.flag = true;
    result.fromHash = true;
  } else if (h) {
    const hp = new URLSearchParams(h);
    if (hp.has('poem')) {
      result.flag = true;
      result.fromHash = true;
      const v = hp.get('poem');
      if (v) result.poem = v;
      result.line = parseLine(hp.get('line'));
    }
  }
  if (q.has('poem')) {
    result.flag = true;
    result.fromQuery = true;
    if (!result.poem && q.get('poem')) result.poem = q.get('poem');
    if (result.line == null) result.line = parseLine(q.get('line') ?? q.get('group'));
  }
  return result;
}

/**
 * Return the live public poem and group index, or null (caller falls back to normal).
 * allowedIds defaults to the 19 public poems; byId is the loaded manifest map.
 */
export function resolveDeepLink(parsed, byId, allowedIds = PUBLIC_POEM_IDS) {
  if (!parsed || !parsed.poem) return null;
  if (BANNED_IDS.includes(parsed.poem)) return null;
  if (!(allowedIds instanceof Set ? allowedIds : new Set(allowedIds)).has(parsed.poem)) return null;
  const p = byId?.[parsed.poem];
  if (!p) return null;
  const n = Array.isArray(p.groups) ? p.groups.length : 0;
  let gi = parsed.line;
  if (!Number.isInteger(gi) || gi < 0 || gi >= Math.max(n, 1)) gi = 0;
  if (n && gi >= n) gi = 0;
  return { p, gi, id: p.id };
}

export function hashForPoem(id, line) {
  let h = `#poem=${encodeURIComponent(id)}`;
  if (Number.isInteger(line) && line >= 0) h += `&line=${line}`;
  return h;
}

export function sharePath(pathname, search, id, line) {
  return `${pathname || '/'}${search || ''}${hashForPoem(id, line)}`;
}
