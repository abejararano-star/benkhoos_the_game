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
        'creek_pond_v16': {'creek_pond': (4, 128, 2164, 474, 474)},
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
    # Bounds are measured on the opaque silhouette, leaving a transparent gutter
    # around each pose. Axes share a ground line within each source row.
    sequences = [
        ('actor_hero_torch_travel', 'torch_foot_motion_v16', 280, False,
         [184, 529, 886, 1242, 163, 509, 850, 1214, 165, 521, 870, 1207],
         [332, 332, 332, 332, 689, 689, 689, 689, 1048, 1048, 1048, 1048],
         [(114,11,300,332,281,52), (479,15,643,332,624,56), (838,12,996,331,977,51),
          (1187,13,1348,331,1330,52), (76,375,285,689,266,414), (457,375,634,689,617,414),
          (753,375,1008,684,989,415), (1124,376,1381,642,1362,416), (40,738,311,1044,292,776),
          (408,738,659,1048,639,777), (810,737,1014,1047,996,776), (1140,737,1368,1004,1350,777)],
         {'walk': [0, 1, 2, 4, 5, 3], 'run': [8, 9, 10, 7, 6, 11]}),
        ('actor_hero_mounted_torch_travel', 'torch_mount_motion_v16', 275, True,
         [176, 537, 898, 1258, 180, 540, 899, 1263, 179, 539, 904, 1265],
         [336, 336, 336, 336, 673, 673, 673, 673, 1033, 1033, 1033, 1033],
         [(39,31,315,336,266,59), (394,34,680,336,629,59), (759,34,1042,336,990,58),
          (1127,34,1406,335,1352,59), (15,401,343,669,286,427), (380,402,699,672,642,430),
          (749,402,1050,665,996,432), (1114,396,1415,669,1360,428), (18,759,345,1002,285,790),
          (378,761,703,1031,641,790), (744,760,1056,1029,1008,788), (1105,758,1417,1017,1373,785)],
         {'walk': [0, 1, 2, 3], 'run': [4, 5, 6, 7, 8, 9, 10, 11]}),
        ('actor_hero_torch', 'torch_foot_action_v16', 213, False,
         [187, 571, 944, 1337, 185, 568, 939, 1322, 174, 567, 937, 1313, 180, 564, 932, 1316],
         [245, 245, 245, 245, 501, 501, 501, 501, 757, 757, 757, 757, 1013, 1013, 1013, 1013],
         [(144,11,273,245,259,38), (527,11,657,245,643,38), (884,11,1026,245,1011,39),
          (1256,11,1408,245,1393,40), (120,265,274,500,259,292), (494,265,658,501,643,292),
          (853,266,1083,501,1030,292), (1237,265,1425,501,1410,293), (103,520,274,757,259,548),
          (509,516,658,757,643,543), (886,518,1040,757,1025,544), (1259,518,1425,757,1410,545),
          (109,782,276,1010,260,811), (488,791,658,1011,643,818), (877,775,1039,1011,1024,802),
          (1261,776,1416,1013,1401,804)],
         {'idle': [0, 1], 'hurt': [3, 2, 1], 'sword': [4, 5, 6, 7, 8, 9],
          'pay': [10, 11, 1], 'rest': [15, 12, 13], 'rise': [14, 15]}),
        ('actor_hero_mounted_torch', 'torch_mount_action_v16', 288, True,
         [169, 532, 898, 1263, 169, 532, 896, 1263, 169, 532, 897, 1261],
         [332, 332, 332, 332, 695, 695, 695, 695, 1057, 1057, 1057, 1057],
         [(31,8,310,332,249,38), (390,8,672,332,610,39), (756,8,1037,332,973,38),
          (1113,8,1407,332,1335,40), (28,370,310,695,249,400), (390,370,673,695,610,400),
          (749,370,1037,694,973,400), (1114,370,1397,695,1335,399), (29,732,311,1057,248,762),
          (390,732,673,1057,610,762), (750,732,1035,1057,972,763), (1114,732,1397,1057,1335,762)],
         {'idle': [0, 1], 'hurt': [3, 2, 0], 'sword': [4, 5, 6, 7, 8, 9],
          'pay': [10, 11], 'rest': [11, 0]}),
    ]
    for name, sheet, scale, mounted, axes, ground_lines, bounds, animations in sequences:
        filename = sheet + '.png'
        if output.resolve() != source:
            copyfile(source / filename, output / filename)
        frames = []
        for index, (left, top, right, bottom, fx, fy) in enumerate(bounds):
            x, y = left - 3, top - 3
            ax, ay = axes[index] - x, ground_lines[index] - y
            frames.append(dict(i=index, x=x, y=y, w=right-x+4, h=bottom-y+4, ax=ax, ay=ay,
                               flame=[fx-x, fy-y], torso=[ax + (-12 if mounted else 2),
                                                          ay - round(scale * (.68 if mounted else .59))]))
        sprites[name] = dict(sheet=sheet, ref=scale, contactFrame=2,
                             anims={action: [frames[index] for index in indices]
                                    for action, indices in animations.items()})
    return sprites
