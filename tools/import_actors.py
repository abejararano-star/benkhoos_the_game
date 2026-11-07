"""Pack each actor's complete animation family from isolated alpha silhouettes."""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.optimize import linear_sum_assignment

ROOT = Path(__file__).resolve().parents[1]
GROUPS = {
    'villagers_a_v9': ['civil', 'woodcutter', 'farmer', 'miner'],
    'villagers_b_v9': ['hunter', 'builder', 'captive', 'messenger'],
    'guards_v9': ['spearman', 'archer', 'swordsman', 'champion'],
    'elite_guards_v9': ['elite_spearman', 'elite_archer', 'elite_swordsman', None],
    'royal_guards_v9': ['royal_spearman', 'royal_archer', 'royal_swordsman', None],
    'colonials_a_v9': ['CAMPESINO', 'BANDOLERO', 'SOLDADO_ESPANOL'],
    'colonials_b_v9': ['ARQUERO_COLONIAL', 'PIQUERO', 'ARCABUCERO'],
    'bosses_v9': ['HERALDO_ALADO', 'GOBERNADOR_GIRON', 'giron_mounted'],
    'mounted_v9': ['horse', 'hero_mounted', 'ally_mounted', 'CABALLERO'],
}


def silhouettes(sheet, rows, columns=6):
    """Assign connected bodies to poses before cropping, retaining their edge alpha."""
    path = ROOT / 'art' / 'source' / f'{sheet}.png'
    pixels = np.array(Image.open(path).convert('RGBA'))
    height, width = pixels.shape[:2]
    cell_w, cell_h = width / columns, height / rows
    connectivity = np.ones((3, 3), dtype=bool)
    # This supplemental source has a faint alpha matte in its gutters.
    cutoff = 185 if sheet == 'mounted_actions_v9' else 64
    labels, _ = ndimage.label(pixels[:, :, 3] >= cutoff, structure=connectivity)
    sizes = np.bincount(labels.ravel())
    bounds = ndimage.find_objects(labels)
    bodies = [index for index in range(1, len(sizes)) if sizes[index] >= cell_w * cell_h * .06]
    if len(bodies) != rows * columns:
        raise ValueError(f'{sheet}: expected {rows * columns} separate bodies, found {len(bodies)}')

    centers = []
    for body in bodies:
        ys, xs = bounds[body - 1]
        centers.append(((xs.start + xs.stop) / (2 * cell_w), (ys.start + ys.stop) / (2 * cell_h)))
    slots = np.array([(col + .5, row + .5) for row in range(rows) for col in range(columns)])
    distances = np.sum((slots[:, None] - np.array(centers)[None, :]) ** 2, axis=2)
    slot_indices, body_indices = linear_sum_assignment(distances)

    frames = []
    for slot, body_index in zip(slot_indices, body_indices):
        body = bodies[body_index]
        ys, xs = bounds[body - 1]
        if distances[slot, body_index] > .35 or xs.stop - xs.start > cell_w * 1.2 or ys.stop - ys.start > cell_h * 1.22:
            raise ValueError(f'{sheet}: silhouette outside expected pose {slot + 1}')
        y0, y1 = max(0, ys.start - 1), min(height, ys.stop + 1)
        x0, x1 = max(0, xs.start - 1), min(width, xs.stop + 1)
        local_labels = labels[y0:y1, x0:x1]
        body_mask = local_labels == body
        edges = ndimage.binary_dilation(body_mask, structure=connectivity) & (local_labels == 0)
        masked = pixels[y0:y1, x0:x1].copy()
        masked[~(body_mask | edges)] = 0
        # The median hip position ignores a hand or blade extended away from the body.
        yy, xx = np.where(body_mask)
        body_height = ys.stop - ys.start
        hips = (yy >= yy.max() - body_height * .56) & (yy <= yy.max() - body_height * .32)
        ax = float(np.median(xx[hips]))
        ay = int(yy.max() + 1)
        frames.append((Image.fromarray(masked), ax, ay, body_height))
    return frames


def import_actors(output):
    from export_atlas import pack

    sprites = {}

    def fit_poses(poses, reference, standing):
        scale = np.median([pose[3] for pose in reference[:3]]) / np.median([poses[index][3] for index in standing])
        return [(im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.NEAREST),
                 ax * scale, ay * scale, h * scale) for im, ax, ay, h in poses]

    def save_family(sheet, actors):
        items = [((name, index), pose[0]) for name, (poses, _) in actors.items() for index, pose in enumerate(poses)]
        atlas, positions = pack(items)
        atlas.save(output / f'{sheet}.png', optimize=True)
        for name, (poses, animations) in actors.items():
            frames = []
            for index, (image, ax, ay, _) in enumerate(poses):
                x, y = positions[name, index]
                frames.append(dict(x=x, y=y, w=image.width, h=image.height, ax=ax, ay=ay))
                if index in animations.get('fish', []):
                    yy, xx = np.where(np.array(image)[:, :, 3] > 128)
                    frames[-1]['rod'] = [int(xx.max()), float(np.median(yy[xx >= xx.max() - 2]))]
            animations = {key: [dict(frames[index], i=i) for i, index in enumerate(indices)] for key, indices in animations.items()}
            sprites[f'actor_{name}'] = dict(sheet=sheet, ref=float(np.median([p[3] for p in poses[:3]])), anims=animations)
        print(sheet, 'isolated poses:', len(items))

    interactions = silhouettes('hero_interact_v9', 2)
    for index, (sheet, name) in enumerate([('hero_v9', 'hero'), ('royal_hero_v9', 'hero_royal')]):
        poses = silhouettes(sheet, 4)
        poses += fit_poses(interactions[index * 6:(index + 1) * 6], poses, range(6))
        save_family(sheet, {name: (poses, dict(idle=[0, 1, 2], walk=[3, 4, 5, 6], run=[7, 8, 9, 10],
            rest=[11], sword=[12, 13, 14, 15, 16, 17], spear=[18, 19, 20, 21, 22, 0],
            hurt=[23, 1], pay=[24, 26, 27], fish=[28, 29, 28]))})

    poses = silhouettes('mounted_royal_v9', 3)
    save_family('mounted_royal_v9', {'hero_mounted_royal': (poses, dict(idle=[0, 1, 2], walk=[3, 4, 5, 6],
        run=[7, 8, 9, 10], hurt=[11, 1], sword=[12, 13, 14], spear=[15, 16, 17]))})

    for sheet, names in GROUPS.items():
        poses = silhouettes(sheet, len(names) * 2)
        actors = {}
        for index, name in enumerate(names):
            if name is None:
                continue
            frames = poses[index * 12:(index + 1) * 12]
            animations = dict(idle=[0, 1, 2], walk=[3, 4, 5, 6], hurt=[10, 1], rest=[11],
                              action=[7, 8, 9], windup=[0, 7], strike=[8, 9, 0], die=[10, 11])
            if sheet == 'mounted_v9':
                animations = dict(idle=[0, 1, 2], walk=[3, 4, 5, 6], run=[7, 8, 9, 10], hurt=[11, 0], die=[11])
            actors[name] = (frames, animations)
        if sheet == 'mounted_v9':
            actions = silhouettes('mounted_actions_v9', 2)
            for name, extra, sequences in [
                ('hero_mounted', actions[:6], dict(sword=[13, 14, 12], spear=[15, 16, 17])),
                ('ally_mounted', actions[6:9], dict(action=[13, 14, 12])),
                ('CABALLERO', actions[9:], dict(windup=[0, 12], strike=[13, 14, 0])),
            ]:
                walk_poses, animations = actors[name]
                # Supplemental poses share the apparent size of the rider and horse.
                # Their source sheet can use a different physical pixel density.
                resized = fit_poses(extra, walk_poses, range(len(extra)))
                actors[name] = (walk_poses + resized, {**animations, **sequences})
        save_family(sheet, actors)
    return sprites
