"""Pack the riverbank materials, biome backdrops and isolated trail props."""
from pathlib import Path

from PIL import Image

from import_actors import silhouettes

ROOT = Path(__file__).resolve().parents[1]


def import_trail(output):
    from export_atlas import pack

    sprites = {}
    specs = {
        'bank_v11': ['bank_camp', 'bank_forest', 'bank_ruin'],
        'jungle_paths_v11': ['biome_ravine', 'biome_mangrove'],
        'trail_props_v11': ['trail_arch', 'trail_stones', 'trail_fern', 'trail_reeds', 'trail_terrace', 'trail_sign'],
    }
    for sheet, names in specs.items():
        if sheet == 'trail_props_v11':
            frames = silhouettes(sheet, 2, 3, max_width=1.48)
        else:
            source = Image.open(ROOT / 'art' / 'source' / f'{sheet}.png').convert('RGBA')
            frames = []
            row_height = source.height / len(names)
            for row in range(len(names)):
                start, end = (.07, .84) if sheet == 'bank_v11' else (0, 1)
                image = source.crop((0, round((row + start) * row_height), source.width, round((row + end) * row_height)))
                frames.append((image, image.width / 2, image.height, image.height))
        atlas, positions = pack([(name, frame[0]) for name, frame in zip(names, frames)], width=2304)
        atlas.save(output / f'{sheet}.png', optimize=True)
        for name, (image, ax, ay, height) in zip(names, frames):
            x, y = positions[name]
            sprites[name] = dict(sheet=sheet, ref=height, anims={'idle': [dict(i=0, x=x, y=y, w=image.width, h=image.height, ax=ax, ay=ay)]})
    return sprites
