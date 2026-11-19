"""Register the generated celebration sheets with planted feet and six-pose loops."""
from pathlib import Path
from shutil import copyfile

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def import_festivity(output):
    sprites = {}
    for sheet, columns, rows, names, reference in [
        ('festival_v27', 6, 4, ['festival_drummer', 'festival_shaker', 'festival_benkos', 'festival_amara'], 235),
        ('festival_couple_v27', 4, 2, ['festival_couple'], 412),
    ]:
        source = ROOT / 'art' / 'source' / (sheet + '.png')
        copyfile(source, output / source.name)
        image = Image.open(source)
        cell_w, cell_h = image.width // columns, image.height // rows
        alpha = image.getchannel('A')
        sequences = {}
        for row in range(rows):
            for column in range(columns):
                x, y = column * cell_w, row * cell_h
                cell = alpha.crop((x, y, x + cell_w, y + cell_h))
                # Ignore near-transparent edge noise; retain the original RGBA pixels.
                bounds = cell.point(lambda value: 255 if value >= 48 else 0).getbbox()
                if not bounds:
                    raise ValueError(f'{sheet}: empty pose {row}:{column}')
                left, top, right, bottom = bounds
                left, top = max(0, left - 2), max(0, top - 2)
                right, lower = min(cell_w, right + 2), min(cell_h, bottom + 2)
                name = names[row] if len(names) > 1 else names[0]
                frames = sequences.setdefault(name, [])
                frames.append(dict(i=len(frames), x=x + left, y=y + top, w=right-left, h=lower-top,
                                   ax=cell_w / 2-left, ay=bottom-top))
        for name, frames in sequences.items():
            action = 'kiss' if name == 'festival_couple' else 'dance' if name in ['festival_benkos', 'festival_amara'] else 'play'
            sprites[name] = dict(sheet=sheet, ref=reference, anims={action: frames, 'idle': frames[:1]})
    return sprites
