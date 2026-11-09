"""Build the active Benkhoos atlas from its source sheets."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


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
    from import_expansion import import_expansion
    from import_pixel_v7 import import_pixel_v7
    from import_pixel_v8 import import_pixel_v8
    from import_actors import import_actors
    from import_trail import import_trail
    from import_camp_detail import import_camp_detail

    parser = argparse.ArgumentParser(description='Build the canonical Benkhoos sprite atlas.')
    parser.add_argument('--output', type=Path, default=ROOT / 'assets' / 'atlas')
    output = parser.parse_args().output.resolve()
    output.mkdir(parents=True, exist_ok=True)

    sprites = {}
    for importer in [import_expansion, import_pixel_v7, import_pixel_v8, import_actors, import_trail, import_camp_detail]:
        sprites.update(importer(output))
    digest = hashlib.sha256()
    for sheet in sorted({sprite['sheet'] for sprite in sprites.values()}):
        digest.update((output / (sheet + '.png')).read_bytes())
    manifest = dict(version=2, build=digest.hexdigest()[:16], sprites=sprites)
    (output / 'atlas.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
    print('classes:', len(sprites))


if __name__ == '__main__':
    main()
