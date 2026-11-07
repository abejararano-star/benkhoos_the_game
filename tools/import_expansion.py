"""Import generated regular sprite grids, retaining alpha and shared ground anchors."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def grid_bounds(mask, axis, expected):
    """Find gutters in the generated layout, which may include uneven margins."""
    counts=mask.sum(axis=axis)
    active=counts>5
    edges=np.diff(np.pad(active.astype(int),(1,1)))
    starts=np.where(edges==1)[0];ends=np.where(edges==-1)[0]
    bands=[(a,b) for a,b in zip(starts,ends) if b-a>5]
    if len(bands)!=expected:
        return [round(i*len(counts)/expected) for i in range(expected+1)]
    return [0]+[round((bands[i-1][1]+bands[i][0])/2) for i in range(1,expected)]+[len(counts)]

def import_expansion(output):
    from export_atlas import pack

    sheet = 'settlement_v3'
    source = Image.open(ROOT / 'art' / 'source' / f'{sheet}.png').convert('RGBA')
    mask = np.array(source)[:, :, 3] > 220
    rows = grid_bounds(mask, 1, 3)
    cols = [round(i * source.width / 5) for i in range(6)]
    items, sprites = [], {}
    for row, kind in enumerate(['hq', 'home', 'barracks']):
        for col in range(5):
            cell = source.crop((cols[col], rows[row], cols[col + 1], rows[row + 1]))
            box = cell.getbbox()
            if box is None:
                raise ValueError(f'Empty {sheet} cell {row},{col}')
            frame = cell.crop(box)
            ys = np.where(np.array(cell)[:, :, 3] > 128)[0]
            name = f'building_{kind}_{col + 1}'
            items.append((name, frame))
            anchor = dict(i=0, w=frame.width, h=frame.height, ax=cell.width / 2 - box[0], top=int(ys.min() - box[1]),
                          ay=int(np.percentile(ys, 99.7)) + 1 - box[1])
            sprites[name] = dict(sheet=sheet, ref=source.height / 3, anims=dict(idle=[anchor]))
    atlas, positions = pack(items)
    atlas.save(output / f'{sheet}.png', optimize=True)
    for name, sprite in sprites.items():
        frame = sprite['anims']['idle'][0]
        frame['x'], frame['y'] = positions[name]
    return sprites
