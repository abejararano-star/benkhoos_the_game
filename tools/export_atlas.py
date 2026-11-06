"""Phase 2: crop every detected frame, remove background, pack one atlas PNG per sheet + atlas.json"""
import json, os, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from frames import build, EXPECT, NAMES

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/atlas'
os.makedirs(OUT, exist_ok=True)

def band(spec):  # helper for readability
    return spec

ELITE = ['guerrero', 'arquero', 'lancero', 'espadachin', 'caballero', 'minero', 'agricultor']
ELITE_COUNTS = [(9, 5), (8, 4), (8, 4), (7, 4), (7, 4), (7, 3), (7, 3)]
elite_spec = []
for cls, (ne, nr) in zip(ELITE, ELITE_COUNTS):
    elite_spec.append([('elite_' + cls, 'portrait', 1), ('elite_' + cls, 'seq', ne), ('real_' + cls, 'portrait', 1), ('real_' + cls, 'seq', nr)])

NAMING = {
  'benkos': dict(special={'portrait': ('benkos', 'portrait'), 'scene': ('escenas', 'preview')}, bands=[
      [('benkos', 'idle', 5), ('benkos', 'walk', 6)],
      [('benkos', 'run', 6), ('benkos', 'work', 4)],
      [('benkos', 'rest', 4), ('benkos', 'interact', 2), ('benkos', 'hurt', 3)],
      [('benkos', 'expr', 5)]]),
  'trabajador_colonial': dict(special={'portrait': ('trabajador', 'portrait')}, bands=[
      [('trabajador', 'idle', 4), ('trabajador', 'walk', 7)],
      [('trabajador', 'carry', 5), ('trabajador', 'work', 5)],
      [('trabajador', 'escape', 5), ('trabajador', 'hurt', 4)],
      [('trabajador', 'die', 4), ('trabajador', 'plead', 3), ('props', 'saco', 1), ('props', 'cesta', 1), ('props', 'cajas', 1), ('props', 'cadena', 1)]]),
  'guerrero_africano': dict(special={'portrait': ('campeon', 'portrait')}, bands=[
      [('campeon', 'idle', 4), ('campeon', 'walk', 5)],
      [('campeon', 'run', 4), ('campeon', 'attack_sword', 4)],
      [('campeon', 'attack_spear', 4), ('campeon', 'hurt', 4)],
      [('campeon', 'die', 4), ('campeon', 'taunt', 3)]]),
  'guerreros_retro': dict(special={}, bands=[
      [('retro_guerrero', 'portrait', 1), ('retro_guerrero', 'seq', 9)],
      [('retro_arquero', 'portrait', 1), ('retro_arquero', 'seq', 8)],
      [('retro_cazador', 'portrait', 1), ('retro_cazador', 'seq', 8)],
      [('retro_minero', 'portrait', 1), ('retro_minero', 'seq', 8)],
      [('retro_agricultor', 'portrait', 1), ('retro_agricultor', 'seq', 8)],
      [('props', n, 1) for n in ['lanza', 'arco', 'carcaj', 'escudo', 'pico', 'azadon', 'saco2', 'canasto', 'trigo', 'caja', 'rocas']]]),
  'guerreros_elite': dict(special={}, bands=elite_spec),
  'enemigos_medievales': dict(special={'portrait': ('soldado', 'portrait')}, bands=[
      [('soldado', 'seq', 13)],
      [('arcabucero', 'seq', 11)],
      [('caballero_esp', 'seq', 6)],
      [('arquero_esp', 'seq', 4), ('piquero', 'seq', 4), ('campesino', 'seq', 7)],
      [('bandolero', 'seq', 7)] + [('props', n, 1) for n in ['caballo', 'bandera', 'barril', 'cajas_esp', 'fogata', 'empalizada']]]),
  'jefe_general': dict(special={'portrait': ('giron_general', 'portrait')}, bands=[
      [('giron_general', 'idle', 5), ('giron_general', 'walk', 7)],
      [('giron_general', 'run', 5), ('giron_general', 'attack', 5)],
      [('giron_general', 'hurt', 3), ('giron_general', 'die', 3), ('giron_general', 'taunt', 3)],
      [('giron_general', 'pose', 5), ('giron_general', 'montado', 1), ('giron_general', 'appear', 1)]]),
  'jefe_noble_jinete': dict(special={'portrait': ('giron_jinete', 'portrait')}, bands=[
      [('giron_jinete', 'idle', 5), ('giron_jinete', 'walk', 6)],
      [('giron_jinete', 'run', 4), ('giron_jinete', 'attack', 5)],
      [('giron_jinete', 'hurt', 4), ('giron_jinete', 'die', 3), ('giron_jinete', 'taunt', 1)],
      [('giron_jinete', 'appear', 2), ('giron_jinete', 'extra', 6)]]),
  'jefe_jinete_alado': dict(special={'portrait': ('heraldo', 'portrait')}, bands=[
      [('heraldo', 'idle', 4), ('heraldo', 'walk', 4)],
      [('heraldo', 'run', 4), ('heraldo', 'attack_horn', 4)],
      [('heraldo', 'attack_charge', 3), ('heraldo', 'hurt', 2), ('heraldo', 'die', 2)],
      [('heraldo', 'taunt', 3), ('heraldo', 'appear', 1), ('props', 'estandarte', 1), ('props', 'trompeta_ala', 1), ('props', 'casco', 1)]]),
}

def crop_rgba(a, fg, f, bg):
    x0, x1, y0, y1 = f['x0'], f['x1'], f['y0'], f['y1']
    if 'mask' in f:
        m = np.zeros_like(fg)
        mh, mw = f['mask'].shape
        m[f['my']:f['my'] + mh, f['mx']:f['mx'] + mw] = f['mask']
        mask = fg & m
    elif 'cx0' in f:
        m = np.zeros_like(fg)
        m[f['by0']:f['by1'], f['cx0']:f['cx1']] = True
        mask = fg & m
    else:
        mask = fg.copy()
    sub = mask[y0:y1, x0:x1]
    rgb = a[y0:y1, x0:x1].astype(np.uint8)
    # kill pale halo on silhouette edge
    edge = sub & ndi.binary_dilation(~sub, iterations=1)
    halo = edge & (rgb.min(axis=2) > 205)
    sub = sub & ~halo
    # Per-frame background keying: tiny enclosed white pockets used to survive the
    # size threshold and become visible white flecks at game scale.
    white = sub & (rgb.min(axis=2) >= 242) & (rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2) < 18)
    wl, wn = ndi.label(white)
    if wn:
        wsz = ndi.sum(white, wl, range(1, wn + 1))
        for i, sz in enumerate(wsz):
            sub = sub & ~(wl == i + 1)
    alpha = (sub * 255).astype(np.uint8)
    # keep only the biggest-ish connected pieces (drops stray speckle)
    lab, n = ndi.label(sub)
    if n > 1:
        sizes = ndi.sum(sub, lab, range(1, n + 1))
        keep = [i + 1 for i, sz in enumerate(sizes) if sz >= 40]
        alpha = (np.isin(lab, keep) * 255).astype(np.uint8)
    lab2, n2 = ndi.label(alpha > 0)
    for i, sl in enumerate(ndi.find_objects(lab2), 1):
        w_ = sl[1].stop - sl[1].start; h_ = sl[0].stop - sl[0].start
        if w_ <= 5 and h_ >= 30 and (lab2[sl] == i).sum() < 6 * h_:
            alpha[lab2 == i] = 0
    # main body = largest component; drop small ground debris sitting in the bottom 22% of the frame
    labm, nm = ndi.label(alpha > 0, structure=np.ones((3, 3)))
    if nm > 1:
        sizes = ndi.sum(alpha > 0, labm, range(1, nm + 1))
        main_i = int(np.argmax(sizes)) + 1
        msl = ndi.find_objects(labm)[main_i - 1]
        main_bottom = msl[0].stop
        hh0 = alpha.shape[0]
        for i, sl in enumerate(ndi.find_objects(labm), 1):
            if i == main_i: continue
            if sizes[i - 1] < 0.15 * sizes[main_i - 1] and sl[0].start >= main_bottom - 0.05 * hh0 and sl[0].start > 0.78 * hh0:
                alpha[labm == i] = 0
    img = np.dstack([rgb, alpha])
    # trim fully transparent borders so the box matches the visible sprite
    ys, xs = np.where(alpha > 0)
    if len(ys) == 0: return None
    y0t, y1t, x0t, x1t = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    img = img[y0t:y1t, x0t:x1t]; alpha = alpha[y0t:y1t, x0t:x1t]
    # anchor: feet = median x of opaque pixels in bottom 10% of the main body
    ys, xs = np.where(alpha > 0)
    hh = alpha.shape[0]
    low = ys > (ys.max() - max(6, int(0.10 * hh)))
    ax = int(np.median(xs[low]))
    ay = int(ys.max()) + 1
    return Image.fromarray(img, 'RGBA'), ax, ay

def pack(items, width=2048):
    x = y = rowh = 0; placed = []
    for key, im in items:
        w, h = im.size
        if x + w + 2 > width:
            x = 0; y += rowh + 2; rowh = 0
        placed.append((key, x, y)); x += w + 2; rowh = max(rowh, h)
    H = y + rowh + 2
    atlas = Image.new('RGBA', (width, H), (0, 0, 0, 0))
    for (key, im), (_, px, py) in zip(items, placed):
        atlas.paste(im, (px, py))
    return atlas, {k: (px, py) for k, px, py in placed}

def main():
    global OUT
    import argparse
    parser = argparse.ArgumentParser(description='Build the canonical Benkhoos sprite atlas.')
    parser.add_argument('--output', type=Path, default=OUT)
    args = parser.parse_args()
    OUT = args.output.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    sprites = {}
    for name in NAMES:
        nm = NAMING[name]
        a, fg, bg, special, rows = build(name, ROOT / 'art/source' / (name + '.png'), EXPECT.get(name))
        flat = []  # (cls, anim, idx, frame)
        # specials
        for s in special:
            cls, anim = nm['special'].get(s['kind'], (None, None))
            if cls: flat.append((cls, anim, 0, dict(s)))
        for bi, frames in enumerate(rows):
            spec = nm['bands'][bi] if bi < len(nm['bands']) else []
            need = sum(n for _, _, n in spec)
            if need != len(frames):
                print('WARN %s band %d: spec %d vs found %d' % (name, bi, need, len(frames)))
            seq = []
            for cls, anim, n in spec:
                for k in range(n): seq.append((cls, anim, k))
            for f, (cls, anim, k) in zip(frames, seq):
                flat.append((cls, anim, k, f))
        items = []; meta = {}
        for cls, anim, k, f in flat:
            r = crop_rgba(a, fg, f, bg)
            if not r: continue
            im, ax, ay = r
            if cls == 'props': cls = 'props_' + name
            key = (cls, anim, k)
            items.append((key, im)); meta[key] = (ax, ay, im.size)
        atlas, pos = pack(items)
        atlas.save('%s/%s.png' % (OUT, name), optimize=True)
        for (cls, anim, k), (px, py) in pos.items():
            ax, ay, (w, h) = meta[(cls, anim, k)]
            sp = sprites.setdefault(cls, dict(sheet=name, anims={}))
            sp['anims'].setdefault(anim, []).append(dict(i=k, x=px, y=py, w=w, h=h, ax=ax, ay=ay))
        print(name, 'frames', len(items), 'atlas', atlas.size)
    # drop fragment frames inside 'seq' and derive standard anims
    for cls, sp in sprites.items():
        if 'seq' not in sp['anims']: continue
        seq = sorted(sp['anims']['seq'], key=lambda d: d['i'])
        areas = [d['w'] * d['h'] for d in seq]
        med = float(np.median(areas))
        seq = [d for d in seq if d['w'] * d['h'] >= 0.22 * med]
        for k, d in enumerate(seq): d['i'] = k
        sp['anims']['seq'] = seq
        n = len(seq)
        pick = lambda idx: [dict(seq[i]) for i in idx if 0 <= i < n]
        a0 = max(2, int(round(n * 0.55)))
        sp['anims']['idle'] = pick(range(0, min(2, n)))
        sp['anims']['walk'] = pick(range(0, min(4, n)))
        sp['anims']['attack'] = pick(range(a0, max(a0 + 1, n - 2))) or pick([n - 2])
        sp['anims']['hurt'] = pick([n - 2])
        sp['anims']['die'] = pick([n - 2, n - 1])
    # reference height per class: tallest first idle/walk/portrait-less frame
    for cls, sp in sprites.items():
        for anim in sp['anims'].values(): anim.sort(key=lambda d: d['i'])
        ref_anim = sp['anims'].get('idle') or sp['anims'].get('seq') or list(sp['anims'].values())[0]
        sp['ref'] = int(np.median([d['h'] for d in ref_anim[:3]]))
    from build_people_atlas import import_people
    sprites.update(import_people(OUT))
    digest = hashlib.sha256()
    for sheet in sorted({sp['sheet'] for sp in sprites.values()}): digest.update((OUT / (sheet + '.png')).read_bytes())
    json.dump(dict(version=2, build=digest.hexdigest()[:16], sprites=sprites), open(OUT / 'atlas.json', 'w', encoding='utf-8'), separators=(',', ':'))
    print('classes:', len(sprites))

if __name__ == '__main__':
    main()
