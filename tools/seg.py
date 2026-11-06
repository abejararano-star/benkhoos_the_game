import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def load(path):
    return np.array(Image.open(path).convert('RGB')).astype(np.int16)

def background_mask(a, thr=236):
    near = a.min(axis=2) >= thr
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    edge.discard(0)
    return np.isin(lab, list(edge))

def pill_boxes(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tan = (abs(r - 224) < 22) & (abs(g - 204) < 24) & (abs(b - 172) < 30) & (r > g) & (g > b)
    tan = ndi.binary_closing(tan, iterations=2)
    lab, n = ndi.label(tan)
    boxes = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        area = (lab[sl] == i).sum()
        if area > 500 and w > 40 and 14 < h < 60 and w > h * 1.8:
            boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    return tan, boxes

def components(path, dil=5, min_area=250):
    a = load(path)
    bg = background_mask(a)
    fg = ~bg
    tan, pills = pill_boxes(a)
    # erase pills (incl. text) from fg
    for (x0, y0, x1, y1) in pills:
        fg[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3] &= ~(tan[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3] | True) if False else fg[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3]
    # remove tan pixels and then small text blobs inside pill boxes
    fg &= ~tan
    lab0, n0 = ndi.label(fg)
    for i, sl in enumerate(ndi.find_objects(lab0), 1):
        cx = (sl[1].start + sl[1].stop) / 2; cy = (sl[0].start + sl[0].stop) / 2
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        for (x0, y0, x1, y1) in pills:
            if x0 - 4 <= sl[1].start and sl[1].stop <= x1 + 4 and y0 - 4 <= sl[0].start and sl[0].stop <= y1 + 4:
                fg[lab0 == i] = False
    merged = ndi.binary_dilation(fg, iterations=dil)
    lab, n = ndi.label(merged)
    comps = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        area = int(m.sum())
        if area < min_area: continue
        ys, xs = np.where(m)
        comps.append(dict(x0=sl[1].start + int(xs.min()), y0=sl[0].start + int(ys.min()),
                          x1=sl[1].start + int(xs.max()) + 1, y1=sl[0].start + int(ys.max()) + 1, area=area, id=i))
    return a, fg, lab, comps, pills


def split_wide(fg, comp, ratio_ref, max_ratio=1.45):
    """Split a merged component at the emptiest vertical valleys."""
    w = comp['x1'] - comp['x0']
    if ratio_ref <= 0 or w < ratio_ref * max_ratio:
        return [comp]
    n = int(round(w / ratio_ref))
    if n < 2:
        return [comp]
    sub = fg[comp['y0']:comp['y1'], comp['x0']:comp['x1']]
    col = sub.sum(axis=0).astype(float)
    col = np.convolve(col, np.ones(5) / 5, mode='same')
    cuts = [0]
    for k in range(1, n):
        target = int(k * w / n)
        lo, hi = max(cuts[-1] + 10, target - int(ratio_ref * 0.35)), min(w - 10, target + int(ratio_ref * 0.35))
        if hi <= lo: continue
        cuts.append(lo + int(np.argmin(col[lo:hi])))
    cuts.append(w)
    out = []
    for a_, b_ in zip(cuts[:-1], cuts[1:]):
        s = sub[:, a_:b_]
        ys, xs = np.where(s)
        if len(xs) < 200: continue
        out.append(dict(x0=comp['x0'] + a_ + int(xs.min()), x1=comp['x0'] + a_ + int(xs.max()) + 1,
                        y0=comp['y0'] + int(ys.min()), y1=comp['y0'] + int(ys.max()) + 1, area=int(s.sum()), id=comp['id']))
    return out or [comp]
