"""Register the transparent environment sprites and their gameplay anchors."""
from pathlib import Path
from shutil import copyfile


def import_camp_detail(output):
    source = Path(__file__).resolve().parents[1] / 'assets' / 'atlas'
    entries = {
        'camp_detail_v13': {
            'crop_bed': (42, 353, 698, 62, 62),
            'crop_young': (42, 226, 698, 189, 189),
            'crop_ripe': (798, 77, 704, 338, 338),
            'enclosure_wood': (34, 674, 706, 285, 285),
            'watchtower_detail': (974, 521, 351, 486, 379),
        },
        'crossings_v13': {
            'enclosure_stone': (39, 195, 690, 199, 199),
            'enclosure_battlements': (807, 165, 691, 229, 229),
            'crossing_boards': (60, 731, 650, 171, 171),
            'crossing_splash': (828, 637, 644, 292, 292),
        },
    }
    sprites = {}
    for sheet, items in entries.items():
        filename = sheet + '.png'
        if output.resolve() != source:
            copyfile(source / filename, output / filename)
        for name, (x, y, width, height, scale) in items.items():
            frame = dict(i=0, x=x, y=y, w=width, h=height, ax=width / 2, ay=height - 3)
            sprites[name] = dict(sheet=sheet, ref=scale, anims={'idle': [frame]})
    return sprites
