#!/usr/bin/env python3
"""Rebuild per-word cue times for the timed Hugh poem readings -> site/word-cues.json
(+ site/word-cues.meta.json with method, model, date, per-poem stats and segment violations).

Method (mirrors the note in site/poem-segments.json):
  1. Canonical words = each manifest group's text exactly as the page builds it:
     g.lines.join(' ').split(/\\s+/)   (site/index.html L253)
  2. faster-whisper base.en (CPU, float32, beam 5, temperature 0, word_timestamps=True)
     (int8 was tried first and produced corrupted tokens on the build box, so float32 is used.)
     transcribes site/voices/hugh-poems/<id>.mp3.
  3. Global Needleman-Wunsch alignment of recognised words to canonical words on
     normalised tokens (lowercase, letters/digits only). Exact = match, fuzzy
     (difflib ratio >= 0.75) = match, otherwise substitution/gap.
  4. Matched words keep Whisper's start/end and word probability. Unmatched words
     are linearly interpolated (by character length) between the nearest matched
     neighbours, clamped into their own group's segment, and flagged interp:true.
     A matched word that starts before its group boundary but ends inside the group
     (Whisper stretching a word over the preceding pause) has its start moved to the
     boundary and is flagged clamped.
  4b. Runs of >= 2 unmatched spoken words get a second Whisper pass on just that
     window (previous anchor start -> next anchor start); words recovered there count
     as matched (stats.refilled). Punctuation-only tokens ("*", "\u2020", "\u2014") are
     silent: zero length, excluded from match rates.
  5. Every word is checked against its group's [s,e] in poem-segments.json (+/-0.25 s).

Poem text is never edited; poems not in poem-segments.json, without a clip, or in
EXCLUDE are skipped and recorded.

Usage:  python3 tools/build_word_cues.py [--cache DIR] [--out site/word-cues.json] [--meta site/word-cues.meta.json]
Needs:  pip install faster-whisper   (open source; model downloads from Hugging Face)
"""
import argparse, datetime, difflib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
MODEL = 'base.en'
TOL = 0.25
OVERLAP = 0.2  # poem-segments.json slices overlap by 0.2 s around each midpoint boundary
# Not ruled public by James (Dinosaur Footprints, Halloween Again); never included (Goliath, Friends Til the End).
EXCLUDE = {
    'ttcem-dinosaur-footprints': 'excluded: not ruled public by James',
    'ttcem-halloween-again': 'excluded: not ruled public by James',
    'ttcem-goliath': 'excluded: never included',
    'ttcem-friends-til-the-end': 'excluded: never included',
}
EXCLUDE_TITLE_RE = re.compile(r'dinosaur footprints|halloween again|goliath|friends til', re.I)


def norm(w):
    return re.sub(r'[^a-z0-9]', '', w.lower())


def sim(a, b):
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def align(canon, rec):
    """Needleman-Wunsch with one extra move: a canonical word may absorb two consecutive
    recognised tokens (e.g. 'Two-Mississippi' heard as 'Two' 'Mississippi').
    Returns list mapping canon index -> (first rec index, last rec index, kind) or None."""
    n, m = len(canon), len(rec)
    G = -1.0
    def sc(s):
        return 2.0 if s == 1.0 else (1.0 if s >= 0.75 else -1.0)
    NEG = -1e18
    H = [[0.0] * (m + 1) for _ in range(n + 1)]
    P = [[0] * (m + 1) for _ in range(n + 1)]  # 0 diag, 1 up (skip canon), 2 left (skip rec), 3 merge2
    for i in range(1, n + 1):
        H[i][0] = i * G; P[i][0] = 1
    for j in range(1, m + 1):
        H[0][j] = j * G; P[0][j] = 2
    for i in range(1, n + 1):
        Hi, Hp, c = H[i], H[i - 1], canon[i - 1]
        for j in range(1, m + 1):
            best, mv = Hp[j - 1] + sc(sim(c, rec[j - 1])), 0
            u = Hp[j] + G
            if u > best: best, mv = u, 1
            l = Hi[j - 1] + G
            if l > best: best, mv = l, 2
            if j >= 2 and len(c) > len(rec[j - 1]):
                s2 = sim(c, rec[j - 2] + rec[j - 1])
                if s2 >= 0.75:
                    v = Hp[j - 2] + sc(s2) + 0.5
                    if v > best: best, mv = v, 3
            Hi[j] = best; P[i][j] = mv
    out = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        p = P[i][j] if i > 0 and j > 0 else (1 if j == 0 else 2)
        if p == 0:
            s = sim(canon[i - 1], rec[j - 1])
            if s >= 0.75:
                out[i - 1] = (j - 1, j - 1, 'exact' if s == 1.0 else 'fuzzy')
            i, j = i - 1, j - 1
        elif p == 3:
            out[i - 1] = (j - 2, j - 1, 'merge')
            i, j = i - 1, j - 2
        elif p == 1:
            i -= 1
        else:
            j -= 1
    return out


_model = None
_audio = {}


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(MODEL, device='cpu', compute_type='float32')
    return _model


def run_whisper(audio):
    segs, info = get_model().transcribe(audio, language='en', beam_size=5, temperature=0.0,
                                        word_timestamps=True, condition_on_previous_text=False,
                                        vad_filter=False)
    words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3), 'p': round(w.probability, 3)}
             for s in segs for w in (s.words or [])]
    return words, round(info.duration, 3)


def load_cache(cache_dir, name):
    cp = os.path.join(cache_dir, name) if cache_dir else None
    return (json.load(open(cp)) if cp and os.path.exists(cp) else None), cp


def save_cache(cp, obj):
    if cp:
        os.makedirs(os.path.dirname(cp), exist_ok=True)
        json.dump(obj, open(cp, 'w'))


def transcribe(path, cache_dir, pid):
    res, cp = load_cache(cache_dir, pid + '.whisper.json')
    if res:
        return res
    words, dur = run_whisper(path)
    res = {'duration': dur, 'words': words}
    save_cache(cp, res)
    return res


def transcribe_window(path, cache_dir, pid, t0, t1):
    """Second pass on a short window where the full-clip pass dropped words
    (Whisper sometimes stretches one word over several seconds and skips the rest)."""
    cache, cp = load_cache(cache_dir, pid + '.refill.json')
    cache = cache or {}
    key = f'{t0:.3f}-{t1:.3f}'
    if key not in cache:
        if path not in _audio:
            from faster_whisper import decode_audio
            _audio[path] = decode_audio(path, sampling_rate=16000)
        clip = _audio[path][int(t0 * 16000):int(t1 * 16000)]
        words, _ = run_whisper(clip)
        cache[key] = [dict(w, s=round(w['s'] + t0, 3), e=round(w['e'] + t0, 3)) for w in words]
        save_cache(cp, cache)
    return cache[key]


def build_poem(p, seg, rec, clip=None, cache_dir=None):
    groups = [' '.join(g['lines']).split() for g in p['groups']]
    segs = seg['segs']
    if len(groups) != len(segs):
        raise ValueError(f"{p['id']}: {len(groups)} manifest groups vs {len(segs)} segments")
    flat = [(gi, wi, t) for gi, g in enumerate(groups) for wi, t in enumerate(g)]
    rw = [w for w in rec['words'] if norm(w['w'])]
    amap = align([norm(t) for _, _, t in flat], [norm(w['w']) for w in rw])
    words = []
    for k, (gi, wi, t) in enumerate(flat):
        a = amap[k]
        w = {'g': gi, 'w': wi, 'text': t, 'start': None, 'end': None, 'p': 0.0, 'matched': False,
             'interp': True, 'clamped': False, 'silent': not norm(t), 'refill': False}
        if a:
            r0, r1 = rw[a[0]], rw[a[1]]
            w.update(start=r0['s'], end=r1['e'], p=min(r0['p'], r1['p']), matched=True, interp=False)
        words.append(w)
    # zero-length matches (start == end) are Whisper artefacts, usually right after a
    # dropped stretch; treat them as unmatched so the second pass can retime them
    for w in words:
        if w['matched'] and w['end'] - w['start'] < 0.02:
            w.update(start=None, end=None, p=0.0, matched=False, interp=True)
    # second pass: re-transcribe the window around each run of >= 2 unmatched spoken words
    if clip:
        n = len(words); k = 0
        while k < n:
            if words[k]['matched'] or words[k]['silent']:
                k += 1; continue
            j = k
            while j < n and not words[j]['matched']:
                j += 1
            run = [x for x in range(k, j) if not words[x]['silent']]
            ia = k - 1 if k > 0 else None
            t0 = words[ia]['start'] if ia is not None else 0.0
            t1 = words[j]['start'] if j < n else rec['duration']
            if len(run) >= 2 and t1 - t0 >= 0.5:
                rr = [w for w in transcribe_window(clip, cache_dir, p['id'], t0, t1) if norm(w['w'])]
                idx = ([ia] if ia is not None else []) + run
                sub = align([norm(words[x]['text']) for x in idx], [norm(w['w']) for w in rr])
                for x, aa in zip(idx, sub):
                    if not aa:
                        continue
                    r0, r1 = rr[aa[0]], rr[aa[1]]
                    if x == ia:
                        words[x]['end'] = min(words[x]['end'], r1['e'])  # trims a stretched anchor
                    else:
                        words[x].update(start=r0['s'], end=r1['e'], p=min(r0['p'], r1['p']),
                                        matched=True, interp=False, refill=True)
            k = j
    # no matched word may run past the next matched word's start (stretched-word artefact)
    nxt = None
    for w in reversed(words):
        if w['matched']:
            if nxt is not None and w['end'] > nxt:
                w['end'] = max(w['start'], nxt)
            nxt = w['start']
    # enforce monotonic anchors: drop matched words that go backwards
    last = -1.0
    for w in words:
        if w['matched']:
            if w['start'] < last - 1e-6:
                w.update(matched=False, interp=True, start=None, end=None, p=0.0)
            else:
                last = w['start']
    # Whisper often stretches the first word after a pause back over the silence.
    # If a matched word starts before its group's boundary but ends inside the group,
    # move its start to the boundary (the midpoint the segment file was cut at) and flag it.
    for w in words:
        if w['matched']:
            s, e = segs[w['g']]
            b = s + OVERLAP / 2 if w['g'] > 0 else s
            if w['start'] < b and w['end'] > b + 0.05:
                w['start'] = round(b, 3); w['clamped'] = True
    # interpolate runs of unmatched words between anchors
    n = len(words); k = 0
    while k < n:
        if not words[k]['interp'] or words[k]['silent']:
            k += 1; continue
        j = k
        while j < n and words[j]['interp'] and not words[j]['silent']:
            j += 1
        pa = next((x for x in range(k - 1, -1, -1) if words[x]['end'] is not None), None)
        na = next((x for x in range(j, n) if words[x]['start'] is not None), None)
        t0 = words[pa]['end'] if pa is not None else segs[words[k]['g']][0]
        t1 = words[na]['start'] if na is not None else min(segs[words[j - 1]['g']][1], rec['duration'])
        if t1 < t0:
            t1 = t0
        lens = [max(1, len(words[x]['text'])) for x in range(k, j)]
        tot = sum(lens); acc = 0
        for x in range(k, j):
            a = t0 + (t1 - t0) * acc / tot
            acc += lens[x - k]
            b = t0 + (t1 - t0) * acc / tot
            s, e = segs[words[x]['g']]
            words[x]['start'] = round(min(max(a, s), e), 3)
            words[x]['end'] = round(min(max(b, s), e), 3)
        k = j
    # silent tokens (punctuation / footnote marks, nothing to hear): zero length at the
    # previous word's end, kept inside their group
    prev_end = 0.0
    for w in words:
        if w['silent']:
            s0, e0 = segs[w['g']]
            t = round(min(max(prev_end, s0), e0), 3)
            w.update(start=t, end=t, matched=False, interp=True)
        prev_end = w['end']
    # final monotonic pass (clamping can reorder at group edges)
    prev = 0.0
    for w in words:
        if w['start'] < prev:
            w['start'] = prev
        if w['end'] < w['start']:
            w['end'] = w['start']
        prev = w['start']
    viol = []
    for w in words:
        s, e = segs[w['g']]
        if w['start'] < s - TOL or w['end'] > e + TOL:
            viol.append({'g': w['g'], 'w': w['w'], 'text': w['text'], 'start': w['start'], 'end': w['end'], 'seg': [s, e]})
    nm = sum(w['matched'] for w in words)
    ncl = sum(w['clamped'] for w in words)
    nsil = sum(w['silent'] for w in words)
    sp = n - nsil
    stats = {'words': n, 'silent_tokens': nsil, 'spoken_words': sp, 'matched': nm,
             'refilled': sum(w['refill'] for w in words), 'match_rate': round(nm / sp, 3),
             'interp': sp - nm, 'interp_pct': round(100 * (sp - nm) / sp, 1), 'recognized_words': len(rw), 'clamped_starts': ncl,
             'mean_p_matched': round(sum(w['p'] for w in words if w['matched']) / max(1, nm), 3),
             'group_match_in_segments_json': seg.get('match'), 'violations': len(viol)}
    return words, stats, viol


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=None, help='dir to cache raw Whisper output (optional)')
    ap.add_argument('--out', default=os.path.join(SITE, 'word-cues.json'))
    ap.add_argument('--meta', default=os.path.join(SITE, 'word-cues.meta.json'))
    a = ap.parse_args()
    man = json.load(open(os.path.join(SITE, 'glyphs', 'manifest.json')))
    segj = json.load(open(os.path.join(SITE, 'poem-segments.json')))
    out = {'version': 1, 'note': '', 'poems': {}, 'skipped': {}}
    report = {}
    cues = {}
    by_id = {p['id']: p for p in man['poems']}
    ids = list(dict.fromkeys(list(segj['poems']) + list(by_id)))
    for pid in ids:
        p = by_id.get(pid)
        title = (p or {}).get('title', '')
        if pid in EXCLUDE or EXCLUDE_TITLE_RE.search(title or ''):
            out['skipped'][pid] = EXCLUDE.get(pid, 'excluded by title')
            continue
        if pid not in segj['poems']:
            out['skipped'][pid] = 'no timed reading in poem-segments.json'
            continue
        if not p:
            out['skipped'][pid] = 'no poem text in glyphs/manifest.json'
            continue
        clip = os.path.join(SITE, 'voices', 'hugh-poems', pid + '.mp3')
        if not os.path.exists(clip):
            out['skipped'][pid] = 'no audio clip in site/voices/hugh-poems/'
            continue
        print('aligning', pid, file=sys.stderr)
        rec = transcribe(clip, a.cache, pid)
        words, stats, viol = build_poem(p, segj['poems'][pid], rec, clip, a.cache)
        out['poems'][pid] = {'title': title, 'dur': segj['poems'][pid]['dur'], 'groups': len(p['groups']),
                             'stats': stats, 'segment_violations': viol}
        gl = [[] for _ in p['groups']]
        for w in words:
            o = {'w': w['text'], 't0': w['start'], 't1': w['end'], 'conf': w['p']}
            # optional flags only when true, to keep the file small
            if w['interp']: o['interp'] = True
            if w['clamped']: o['clamped'] = True
            if w['silent']: o['silent'] = True
            if w['refill']: o['refill'] = True
            gl[w['g']].append(o)
        cues[pid] = {'groups': [{'words': g} for g in gl]}
        report[pid] = {'stats': stats, 'violations': viol}
    meta = {
        'file': 'site/word-cues.json', 'version': 1, 'built': datetime.date.today().isoformat(),
        'tool': 'tools/build_word_cues.py', 'model': f'faster-whisper {MODEL}',
        'decode': 'CPU float32, beam 5, temperature 0, word_timestamps, condition_on_previous_text off, no VAD',
        'method': ('full-clip transcript of site/voices/hugh-poems/<id>.mp3, Needleman-Wunsch aligned to the manifest '
                   'group text (normalised lowercase alphanumerics, fuzzy >= 0.75, one word may absorb two recognised '
                   'tokens); second Whisper pass on windows with >= 2 dropped words; unmatched words interpolated '
                   'between matched neighbours and clamped to their group segment.'),
        'shape': '{ "<poemId>": { "groups": [ { "words": [ { "w", "t0", "t1", "conf", "interp?", "clamped?", "silent?", "refill?" } ] } ] } }',
        'flags': {'conf': 'Whisper word probability (0 for interpolated/silent words)',
                  'interp': 'not heard in the transcript; time interpolated between neighbours',
                  'clamped': 'start moved forward to the group boundary (Whisper stretched the word over the preceding pause)',
                  'silent': 'punctuation / footnote mark with nothing spoken; zero length at previous word end',
                  'refill': 'recovered by the second Whisper pass on a short window'},
        'groups_source': 'site/glyphs/manifest.json groups (text = lines.join(" ").split(/\\s+/), as site/index.html L253)',
        'segments_source': 'site/poem-segments.json (same group order)',
        'tolerance_s': TOL, 'skipped': out['skipped'], 'poems': out['poems'],
    }
    with open(a.out, 'w') as f:
        f.write('{\n' + ',\n'.join(f'{json.dumps(pid)}:{json.dumps(c, ensure_ascii=False, separators=(",", ":"))}'
                                     for pid, c in cues.items()) + '\n}\n')
    with open(a.meta, 'w') as f:
        json.dump(meta, f, indent=1, ensure_ascii=False); f.write('\n')
    json.dump(report, sys.stdout, indent=1)
    print()


if __name__ == '__main__':
    main()
