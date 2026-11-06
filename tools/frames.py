"""Phase 1: auto-detect frames in each reference sheet.
Bands (rows) come from horizontal white gaps; frames inside a band are split on empty vertical gaps
(ground-shadow line excluded), then corrected to the expected count when known."""
import numpy as np, json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from seg import load, background_mask, pill_boxes

HINTS = {
  'benkos': dict(scene=(10, 735, 655, 1010)),
  'guerrero_africano': dict(portrait=(0, 0, 272, 495), groups={2: [4, 4]}),
  'guerreros_retro': dict(ignore=[(0, 0, 140, 1024)]),
  'guerreros_elite': dict(ignore=[(0, 0, 145, 1024), (1055, 0, 1190, 1024)], seps=[183, 345, 503, 648, 800, 901]),

  'trabajador_colonial': dict(groups={0: [1, 3, 7], 1: [5, 5], 2: [4, 1, 1, 1, 1, 1], 3: [3, 1, 1, 1, 1, 3, 1]}),
  'jefe_general': dict(drop_pills=[(1250, 290, 1420, 345)]),
  'jefe_jinete_alado': dict(drop_pills=[(540, 600, 650, 645)]),
}

BAND_MODE = {  # 'top': label pill sits above its row; 'side': pill at left, row centred on it; None: horizontal gaps
  'benkos': 'top', 'trabajador_colonial': 'top', 'guerrero_africano': 'top',
  'enemigos_medievales': 'top', 'jefe_general': 'top', 'jefe_noble_jinete': 'top', 'jefe_jinete_alado': 'top',
  'guerreros_elite': 'side', 'guerreros_retro': None,
}

def cluster(vals, tol=30):
    vals = sorted(vals); out = []
    for v in vals:
        if out and abs(v - np.mean(out[-1])) <= tol: out[-1].append(v)
        else: out.append([v])
    return [float(np.mean(c)) for c in out]

def longest_run(col):
    best = cur = 0
    for v in col:
        cur = cur + 1 if v else 0
        if cur > best: best = cur
    return best

def runs_from_profile(prof, gap=5, minw=14):
    runs = []; s = None; g = 0; last = 0
    for x, v in enumerate(prof):
        if v:
            if s is None: s = x
            last = x; g = 0
        elif s is not None:
            g += 1
            if g >= gap:
                runs.append([s, last + 1]); s = None
    if s is not None: runs.append([s, last + 1])
    changed = True
    while changed and len(runs) > 1:
        changed = False
        for k, (a_, b_) in enumerate(runs):
            if b_ - a_ < minw:
                if k == 0: j = 1
                elif k == len(runs) - 1: j = k - 1
                else: j = k - 1 if (a_ - runs[k - 1][1]) <= (runs[k + 1][0] - b_) else k + 1
                lo, hi = min(k, j), max(k, j)
                runs[lo] = [runs[lo][0], runs[hi][1]]; del runs[hi]; changed = True; break
    return runs

def adjust_count(runs, profile_dense, expect):
    """split widest / merge closest until len(runs)==expect. profile_dense: column density (no ground)."""
    runs = [list(r) for r in runs]
    while len(runs) > expect and len(runs) > 1:
        widths = [r[1] - r[0] for r in runs]
        i = int(np.argmin(widths))
        if i == 0: j = 1
        elif i == len(runs) - 1: j = i - 1
        else: j = i - 1 if (runs[i][0] - runs[i - 1][1]) <= (runs[i + 1][0] - runs[i][1]) else i + 1
        lo, hi = min(i, j), max(i, j)
        runs[lo] = [runs[lo][0], runs[hi][1]]; del runs[hi]
    while len(runs) < expect:
        widths = [(r[1] - r[0]) for r in runs]
        k = int(np.argmax(widths))
        a_, b_ = runs[k]
        w = b_ - a_
        if w < 40: break
        lo, hi = a_ + int(w * 0.30), a_ + int(w * 0.70)
        cut = lo + int(np.argmin(profile_dense[lo:hi]))
        runs[k:k + 1] = [[a_, cut], [cut, b_]]
    return runs


def band_frames_cc(sub, by0, by1, expect, hint, bi):
    """2D connected components (ground strip removed) -> one frame each; pixels owned by nearest component."""
    Hh, Ww = sub.shape
    core = sub.copy()
    core[max(0, Hh - 12):] = False
    lab, n = ndi.label(ndi.binary_dilation(core, iterations=2))
    comps = []
    for i in range(1, n + 1):
        m = (lab == i) & core
        comps.append(dict(mask=m, area=int(m.sum())))
    # explicit merges (list of (band, i, j) component index pairs, x-sorted)
    for c in comps:
        ys, xs = np.where(c['mask']); c['cx'] = xs.mean() if len(xs) else 0
    comps.sort(key=lambda c: c['cx'])
    def merge(i, j):
        comps[i]['mask'] = comps[i]['mask'] | comps[j]['mask']; comps[i]['area'] += comps[j]['area']
        ys, xs = np.where(comps[i]['mask']); comps[i]['cx'] = xs.mean(); del comps[j]
        comps.sort(key=lambda c: c['cx'])
    for (mb, mi, mj) in sorted([m for m in hint.get('cmerge', []) if m[0] == bi], key=lambda m: -m[2]):
        if mj < len(comps) and mi < len(comps): merge(mi, mj)
    # debris merge: tiny areas into nearest neighbour
    while len(comps) > 1:
        areas = [c['area'] for c in comps]
        med = float(np.median(areas)); i = int(np.argmin(areas))
        if areas[i] >= 0.12 * med: break
        j = i - 1 if (i == len(comps) - 1 or (i > 0 and abs(comps[i]['cx'] - comps[i - 1]['cx']) <= abs(comps[i + 1]['cx'] - comps[i]['cx']))) else i + 1
        merge(min(i, j), max(i, j))
    if expect:
        while len(comps) > expect and len(comps) > 1:
            gaps = [comps[i + 1]['cx'] - comps[i]['cx'] for i in range(len(comps) - 1)]
            areas = [c['area'] for c in comps]
            i = int(np.argmin(areas)); j = i - 1 if (i == len(comps) - 1 or (i > 0 and gaps[i - 1] <= gaps[i])) else i + 1
            merge(min(i, j), max(i, j))
        if len(comps) != expect:
            print('  band %d: found %d comps, expected %d' % (bi, len(comps), expect))
    # ownership of every fg pixel (incl. ground strip) by nearest component core
    allcore = np.zeros(sub.shape, dtype=np.int32)
    for k, c in enumerate(comps, 1): allcore[c['mask']] = k
    dist, (iy, ix) = ndi.distance_transform_edt(allcore == 0, return_indices=True)
    owner = allcore[iy, ix]
    owner[~sub] = 0
    frames = []
    for k, c in enumerate(comps, 1):
        m = owner == k
        ys, xs = np.where(m)
        if len(xs) < 500: continue
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
        frames.append(dict(x0=x0, x1=x1, y0=by0 + y0, y1=by0 + y1, mask=m[y0:y1, x0:x1], mx=x0, my=by0 + y0))
    return frames

def split_even(run, n, dense_s):
    a_, b_ = run
    if n <= 1: return [[a_, b_]]
    w = b_ - a_; pitch = w / n; cuts = [a_]
    for k in range(1, n):
        t = a_ + k * pitch
        lo, hi = int(max(cuts[-1] + 8, t - pitch * 0.30)), int(min(b_ - 8, t + pitch * 0.30))
        cuts.append(lo + int(np.argmin(dense_s[lo:hi])) if hi > lo else int(t))
    cuts.append(b_)
    return [[cuts[i], cuts[i + 1]] for i in range(n)]

def band_frames_runs(sub, by0, by1, expect, hint, bi):
    dense = sub[:max(20, sub.shape[0] - 14)].sum(axis=0).astype(float)
    dense_s = np.convolve(dense, np.ones(5) / 5, mode='same')
    runs = runs_from_profile(dense > 0, gap=5, minw=14)
    def run_area(r): return int(sub[:, r[0]:r[1]].sum())
    groups = hint.get('groups', {}).get(bi)
    if groups is None:
        while len(runs) > 1:
            areas = [run_area(r) for r in runs]
            med_a = float(np.median(areas)); i = int(np.argmin(areas))
            if areas[i] >= 0.15 * med_a: break
            if i == 0: j = 1
            elif i == len(runs) - 1: j = i - 1
            else: j = i - 1 if (runs[i][0] - runs[i - 1][1]) <= (runs[i + 1][0] - runs[i][1]) else i + 1
            lo, hi = min(i, j), max(i, j)
            runs[lo] = [runs[lo][0], runs[hi][1]]; del runs[hi]
        if expect: runs = adjust_count(runs, dense_s, expect)
    else:
        if len(runs) != len(groups):
            print('  band %d: %d raw runs, groups expects %d' % (bi, len(runs), len(groups)))
        new = []
        for r, n in zip(runs, groups): new += split_even(r, n, dense_s)
        runs = new
    frames = []
    for a_, b_ in runs:
        s2 = sub[:, a_:b_]
        ys, xs = np.where(s2)
        if len(xs) < 500: continue
        frames.append(dict(x0=a_ + int(xs.min()), x1=a_ + int(xs.max()) + 1, y0=by0 + int(ys.min()), y1=by0 + int(ys.max()) + 1, cx0=a_, cx1=b_, by0=by0, by1=by1))
    return frames

def build(name, path, expect=None):
    a = load(path)
    H, W = a.shape[:2]
    bg = background_mask(a)
    fg = ~bg
    hint = HINTS.get(name, {})
    for (x0, y0, x1, y1) in hint.get('ignore', []):
        fg[y0:y1, x0:x1] = False
    cand = np.array([longest_run(fg[:, x]) > 0.40 * H for x in range(W)])
    x = 0
    while x < W:
        if cand[x]:
            x2 = x
            while x2 + 1 < W and cand[x2 + 1]: x2 += 1
            if x2 - x + 1 <= 6: fg[:, max(0, x - 2):x2 + 3] = False
            x = x2 + 1
        else: x += 1
    tan, pills = pill_boxes(a)
    for (dx0, dy0, dx1, dy1) in hint.get('drop_pills', []):
        pills = [p for p in pills if not (p[0] < dx1 and p[2] > dx0 and p[1] < dy1 and p[3] > dy0)]
    for (x0, y0, x1, y1) in pills:
        fg[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3] = False
    special = []
    for key in ('scene', 'portrait'):
        if key in hint:
            x0, y0, x1, y1 = hint[key]
            sub = fg[y0:y1, x0:x1]; ys, xs = np.where(sub)
            special.append(dict(kind=key, x0=x0 + int(xs.min()), x1=x0 + int(xs.max()) + 1, y0=y0 + int(ys.min()), y1=y0 + int(ys.max()) + 1))
            fg[y0:y1, x0:x1] = False
    # tiny blobs (text, arrows) out
    lab0, n0 = ndi.label(ndi.binary_dilation(fg, iterations=2))
    for i, sl in enumerate(ndi.find_objects(lab0), 1):
        if int((fg[sl] & (lab0[sl] == i)).sum()) < 700:
            fg[sl] &= ~(lab0[sl] == i)
    # palette swatch strips (tall, thin, left side)
    lab_s, n_s = ndi.label(ndi.binary_dilation(fg, iterations=2))
    for i, sl in enumerate(ndi.find_objects(lab_s), 1):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if w < 40 and h > 3.0 * w and sl[1].start < 0.25 * W and h > 90:
            fg[sl] &= ~(lab_s[sl] == i)
    # auto portrait (tall comp at left)
    if 'portrait' not in hint:
        lab1, n1 = ndi.label(ndi.binary_dilation(fg, iterations=3))
        objs = ndi.find_objects(lab1)
        hs = sorted(sl[0].stop - sl[0].start for sl in objs)
        med = hs[len(hs) // 2]
        for i, sl in enumerate(objs, 1):
            h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
            if h > 1.9 * med and sl[1].start < 0.2 * W and w < 320:
                m = (lab1[sl] == i) & fg[sl]; ys, xs = np.where(m)
                special.append(dict(kind='portrait', x0=sl[1].start + int(xs.min()), x1=sl[1].start + int(xs.max()) + 1,
                                    y0=sl[0].start + int(ys.min()), y1=sl[0].start + int(ys.max()) + 1))
                fg[sl] &= ~(lab1[sl] == i)
    # bands by horizontal projection
    rowp = fg.sum(axis=1) > 0
    mode = BAND_MODE.get(name)
    if 'seps' in hint:
        cuts = [0] + hint['seps'] + [H]
        bands = [(cuts[i], cuts[i + 1]) for i in range(len(cuts) - 1)]
        bands = [(b0, b1) for b0, b1 in bands if fg[b0:b1].any()]
    elif mode == 'top':
        mids = cluster([(p[1] + p[3]) / 2 for p in pills], 30)
        seps = [int(m) for m in mids] + [H]
        bands = [(seps[i], seps[i + 1]) for i in range(len(mids))]
    else:
        bands = runs_from_profile(rowp, gap=9, minw=30)
    out_rows = []
    for bi, (by0, by1) in enumerate(bands):
        sub = fg[by0:by1]
        frames = band_frames_runs(sub, by0, by1, (expect[bi] if expect and bi < len(expect) else None), hint, bi)
        frames = [f for f in frames if not ((f['x1'] - f['x0']) < 45 and (f['y1'] - f['y0']) > 3.2 * (f['x1'] - f['x0']))]
        out_rows.append(frames)
    return a, fg, bg, special, out_rows

EXPECT = {
  'guerreros_retro': [10, 9, 9, 9, 9, 11],
  'guerreros_elite': [16, 14, 14, 13, 13, 12, 12],
  'benkos': [11, 10, 9, 5],
  'trabajador_colonial': [11, 10, 9, 11],
  'guerrero_africano': [9, 8, 8, 7],
  'enemigos_medievales': [13, 11, 6, 15, 13],
  'jefe_general': [12, 10, 9, 7],
  'jefe_noble_jinete': [11, 9, 8, 8],
  'jefe_jinete_alado': [8, 8, 7, 7],
}

NAMES = ['benkos','trabajador_colonial','guerrero_africano','guerreros_retro','guerreros_elite',
         'enemigos_medievales','jefe_general','jefe_noble_jinete','jefe_jinete_alado']

def render(name, a, special, rows):
    im = Image.fromarray(a.astype('uint8')); d = ImageDraw.Draw(im)
    for s in special:
        d.rectangle([s['x0'], s['y0'], s['x1'], s['y1']], outline=(0, 160, 0), width=3)
        d.text((s['x0'] + 4, s['y0'] + 4), s['kind'], fill=(0, 120, 0))
    for r, frames in enumerate(rows):
        for i, f in enumerate(frames):
            d.rectangle([f['x0'], f['y0'], f['x1'], f['y1']], outline=(255, 0, 0), width=2)
            d.text((f['x0'] + 3, f['y0'] + 2), '%d.%d' % (r, i), fill=(0, 0, 255))
    out = ROOT / 'tools/previews'
    out.mkdir(exist_ok=True)
    im.save(out / ('frames_%s.png' % name))

if __name__ == '__main__':
    for name in NAMES:
        a, fg, bg, special, rows = build(name, ROOT / 'art/source' / (name + '.png'), EXPECT.get(name))
        render(name, a, special, rows)
        print(name, [len(r) for r in rows], [s['kind'] for s in special])
