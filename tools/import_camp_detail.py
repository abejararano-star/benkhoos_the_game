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
        'estates_v14': {
            'estate_local': (20, 101, 810, 350, 350),
            'estate_major': (874, 0, 900, 452, 452),
            'estate_ruin': (0, 525, 854, 362, 362),
            'bridge_abutment': (1048, 489, 532, 395, 395),
        },
        'river_detail_v14': {
            'bridge_fixed_span': (12, 132, 719, 307, 307),
            'bridge_rope_span': (823, 140, 655, 285, 285),
            'hand_torch_shaft': (320, 663, 101, 311, 311),
            'hand_torch_flame': (320, 545, 97, 125, 125),
            'mine_cliff': (792, 529, 735, 446, 446),
        },
        'grounded_creeks_v15': {
            'camp_creek_grounded': (0, 96, 990, 616, 610),
            'ravine_pool_grounded': (1060, 0, 1112, 724, 724),
        },
    }
    sprites = {}
    for sheet, items in entries.items():
        filename = sheet + '.png'
        if output.resolve() != source:
            copyfile(source / filename, output / filename)
        for name, (x, y, width, height, scale) in items.items():
            frame = dict(i=0, x=x, y=y, w=width, h=height, ax=width / 2, ay=height - 3)
            if name == 'camp_creek_grounded':
                frame.update(ax=572, ay=376)
            sprites[name] = dict(sheet=sheet, ref=scale, anims={'idle': [frame]})
    for name, sheet, anchors in [
        ('actor_hero_torch', 'hero_torch_v15', [
            (245, 461, 83, 373, 74, 239, 213),
            (751, 461, 91, 875, 74, 746, 216),
            (1235, 458, 82, 1390, 74, 1231, 209),
            (239, 974, 612, 383, 594, 249, 740),
            (723, 970, 600, 871, 592, 732, 735),
            (1215, 971, 608, 1398, 592, 1224, 741),
        ]),
        ('actor_hero_mounted_torch', 'mounted_torch_v15', [
            (245, 437, 94, 351, 84, 234, 181),
            (753, 437, 94, 864, 84, 747, 183),
            (1265, 438, 94, 1377, 84, 1263, 181),
            (246, 949, 606, 351, 597, 235, 693),
            (758, 949, 606, 864, 598, 750, 693),
            (1261, 949, 606, 1378, 598, 1262, 690),
        ]),
    ]:
        filename = sheet + '.png'
        if output.resolve() != source:
            copyfile(source / filename, output / filename)
        frames = []
        for index, (ax, ay, head, fx, fy, tx, ty) in enumerate(anchors):
            x, y = index % 3 * 512, index // 3 * 512
            frames.append(dict(i=index, x=x, y=y, w=512, h=512, ax=ax-x, ay=ay-y,
                               ref=ay-head, flame=[fx-x, fy-y], torso=[tx-x, ty-y]))
        sprites[name] = dict(sheet=sheet, ref=frames[0]['ref'], anims={
            'idle': [frames[0]], 'walk': frames[1:5],
            'sword': [frames[0], frames[5], frames[0]],
        })
    return sprites
