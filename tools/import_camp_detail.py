"""Register the transparent environment sprites and their gameplay anchors."""
from pathlib import Path
from shutil import copyfile


def import_camp_detail(output):
    source = Path(__file__).resolve().parents[1] / 'assets' / 'atlas'
    entries = {
        'open_shops_v20': {
            'stock_rack_workshop': (54, 114, 936, 508, 508),
            'stock_rack_armory': (1177, 132, 952, 492, 492),
        },
        'watchtowers_v20': {
            'watchtower_level_1': (153, 262, 333, 424, 323),
            'watchtower_level_2': (788, 24, 503, 662, 350),
            'watchtower_level_3': (1493, 67, 641, 619, 346),
        },
        'stock_rack_v19': {'stock_rack_frame': (24, 45, 1555, 910, 910)},
        'city_cartagena_v18': {'city_cartagena': (0, 43, 1983, 703, 695)},
        'city_marea_v18': {'city_marea': (2, 120, 1770, 651, 645)},
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
        'creek_eddy_v17': {'creek_eddy': (53, 313, 2066, 199, 199)},
        'grounded_creeks_v15': {
            'camp_creek_grounded': (0, 96, 990, 616, 610),
            'ravine_pool_grounded': (1060, 0, 1112, 724, 724),
        },
    }
    tower_anchors = {
        'watchtower_level_1': (310, 679),
        'watchtower_level_2': (1045, 678),
        'watchtower_level_3': (1768, 679),
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
            if name in tower_anchors:
                foot_x, ground_y = tower_anchors[name]
                frame.update(ax=foot_x - x, ay=ground_y - y)
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
    jaguar_sequences = [
        ('animal_jaguar_motion', 'jaguar_motion_v17',
         [196, 540, 891, 1250, 187, 547, 888, 1252, 196, 550, 891, 1251],
         [286] * 4 + [617] * 4 + [953] * 4,
         [(65,113,319,285), (410,113,660,285), (748,137,1023,282), (1110,145,1384,279),
          (50,456,322,616), (403,456,676,616), (748,464,1041,614), (1107,464,1402,614),
          (32,806,360,936), (398,809,689,952), (757,806,1025,951), (1111,793,1400,952)],
         {'idle': [0, 1], 'stalk': [2, 3], 'walk': [4, 5, 6, 7], 'run': [8, 9, 10, 11]}),
        ('animal_jaguar_combat', 'jaguar_combat_v17',
         [182, 528, 893, 1251, 175, 531, 890, 1245, 181, 529, 889, 1251],
         [299, 299, 266, 299] + [625] * 4 + [958] * 4,
         [(41,188,323,296), (388,141,664,297), (737,147,1075,264), (1111,169,1411,298),
          (39,454,291,623), (387,450,695,624), (745,477,1041,623), (1108,462,1378,623),
          (35,819,325,955), (391,783,665,956), (743,790,1035,956), (1107,813,1398,960)],
         {'crouch': [0], 'pounce': [1, 2, 3], 'swipe': [4, 5, 6, 7],
          'recover': [8, 9], 'hurt': [10], 'eat': [11]}),
    ]
    for name, sheet, axes, ground_lines, bounds, animations in jaguar_sequences:
        filename = sheet + '.png'
        if output.resolve() != source:
            copyfile(source / filename, output / filename)
        frames = []
        for index, (left, top, right, bottom) in enumerate(bounds):
            x, y = left - 4, top - 4
            frames.append(dict(i=index, x=x, y=y, w=right-x+5, h=bottom-y+5,
                               ax=axes[index]-x, ay=ground_lines[index]-y))
        sprites[name] = dict(sheet=sheet, ref=172,
                             anims={name: [frames[i] for i in indices] for name, indices in animations.items()})
    identities = 'captive_identity_v18'
    if output.resolve() != source:
        copyfile(source / (identities + '.png'), output / (identities + '.png'))
    for sex, ground, axes, bounds in [
        ('f', 430, [227, 652, 1080, 1507],
         [(154,12,288,429), (591,11,718,429), (966,11,1208,429), (1395,14,1629,429)]),
        ('m', 875, [221, 647, 1077, 1494],
         [(166,460,282,874), (587,454,698,874), (949,457,1193,874), (1368,458,1617,874)]),
    ]:
        frames = []
        for index, (left, top, right, bottom) in enumerate(bounds):
            x, y = left - 4, top - 4
            frames.append(dict(i=index, x=x, y=y, w=right-x+5, h=bottom-y+5, ax=axes[index]-x, ay=ground-y))
        captive, idle, *walk = frames
        sprites['actor_identity_' + sex] = dict(sheet=identities, ref=420, anims={
            'captive': [captive], 'idle': [idle], 'walk': [walk[0], idle, walk[1], idle],
            'release': [captive, idle], 'hurt': [captive], 'rest': [idle],
        })
    professions = 'identity_professions_v18'
    if output.resolve() != source:
        copyfile(source / (professions + '.png'), output / (professions + '.png'))
    bounds = [(174,12,309,430), (533,13,796,430), (950,48,1269,430), (1383,88,1667,430),
              (158,446,297,873), (472,496,872,872), (962,447,1240,873), (1339,452,1720,873)]
    axes = [239, 659, 1060, 1511, 219, 635, 1053, 1518]
    frames = []
    for index, (left, top, right, bottom) in enumerate(bounds):
        x, y = left - 4, top - 4
        frames.append(dict(i=index, x=x, y=y, w=right-x+5, h=bottom-y+5, ax=axes[index]-x,
                           ay=(431 if index < 4 else 874)-y))
    idle, walk, farm, build, guard, thrust, bow, rider = frames
    for name, animations in {
        'work': {'idle': [idle], 'walk': [idle, walk], 'farm': [farm], 'build': [build]},
        'guard': {'idle': [guard], 'walk': [guard, walk], 'action': [guard, thrust, guard], 'bow': [bow]},
        'rider': {'idle': [rider], 'action': [rider]},
    }.items():
        sprites['actor_identity_f_' + name] = dict(sheet=professions, ref=420, anims=animations)
    combat = 'identity_combat_v18'
    if output.resolve() != source:
        copyfile(source / (combat + '.png'), output / (combat + '.png'))
    axes = [210, 643, 1062, 1505, 221, 657, 1088, 1521]
    bounds = [(141,13,284,426), (490,9,795,426), (913,44,1302,426), (1410,11,1632,426),
              (31,455,422,872), (467,454,853,870), (894,455,1287,871), (1333,454,1731,873)]
    frames = []
    for index, (left, top, right, bottom) in enumerate(bounds):
        x, y = left - 4, top - 4
        frames.append(dict(i=index, x=x, y=y, w=right-x+5, h=bottom-y+5, ax=axes[index]-x,
                           ay=(427 if index < 4 else 874)-y))
    ready, windup, slash, bow_ready, *trot = frames
    for name, animations in {
        'sword': {'idle': [ready], 'action': [windup, slash, ready]},
        'archer': {'idle': [bow_ready], 'action': [bow_ready]},
        'trot': {'idle': [trot[0]], 'walk': trot, 'run': trot},
    }.items():
        sprites['actor_identity_f_' + name] = dict(sheet=combat, ref=420, anims=animations)
    return sprites
