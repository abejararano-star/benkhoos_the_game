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
    sprites = {}
    specs = [
        ('hero_v3', 8, ['hero'], ['idle','walk','run','spear','sword','hurt','pay','rest']),
        ('workers_v3', 16, ['civil','woodcutter','farmer','miner','hunter','builder','archer','messenger'], None),
        ('military_v3', 12, ['elite_spearman','royal_spearman','elite_archer','royal_archer','elite_swordsman','royal_swordsman'], None),
        ('settlement_v3', 5, ['hq','home','barracks'], None),
    ]
    for sheet, cols, names, hero_anims in specs:
        path=ROOT / 'art/source' / ('hero_v4.png' if sheet=='hero_v3' and (ROOT/'art/source/hero_v4.png').exists() else sheet+'.png')
        source = Image.open(path).convert('RGBA')
        rows = 8 if hero_anims else len(names)
        mask=np.array(source)[:,:,3]>220
        ybounds=grid_bounds(mask,1,rows)
        xbounds=grid_bounds(mask[:ybounds[1]],0,cols) if hero_anims else [round(i*source.width/cols) for i in range(cols+1)]
        items, frames_by_class = [], {}
        for row in range(rows):
            for col in range(cols):
                cell = source.crop((xbounds[col],ybounds[row],xbounds[col+1],ybounds[row+1]))
                box = cell.getbbox()
                if box is None: raise ValueError(f'Empty {sheet} cell {row},{col}')
                frame = cell.crop(box)
                cls = 'motion_hero' if hero_anims else ('building_'+names[row]+'_'+str(col+1) if sheet=='settlement_v3' else 'motion_'+names[row])
                index = row*cols+col if hero_anims else (0 if sheet=='settlement_v3' else col)
                # Anchor to the same cell center and baseline, not to a swinging weapon.
                anchor_x = cell.width/2-box[0]
                if hero_anims:
                    idle_mask=mask[:ybounds[1],xbounds[col]:xbounds[col+1]]
                    iy,ix=np.where(idle_mask)
                    low=iy>iy.max()-8
                    anchor_x=float(np.median(ix[low]))-box[0]
                alpha=np.array(cell)[:,:,3]
                ys=np.where(alpha>128)[0]
                baseline=int(np.percentile(ys,99.7))+1
                info=dict(i=index,w=frame.width,h=frame.height,ax=anchor_x,ay=baseline-box[1])
                frames_by_class.setdefault(cls,[]).append(info)
                items.append(((cls,index),frame))
        atlas,positions=pack(items)
        atlas.save(output/(sheet+'.png'),optimize=True)
        for cls,frames in frames_by_class.items():
            for f in frames:f['x'],f['y']=positions[(cls,f['i'])]
            def pick(indices):return [dict(frames[i],i=j) for j,i in enumerate(indices)]
            if hero_anims:
                anims={name:pick(range(row*8,row*8+8)) for row,name in enumerate(hero_anims)}
            elif sheet=='workers_v3':
                anims={name:pick(indices) for name,indices in dict(idle=[0,1],walk=[2,3,4,5],work=[6,7,8,9],attack=[6,7,8,9],hurt=[10,11],carry=[12,13],run=[14,15],escape=[14,15]).items()}
            elif sheet=='military_v3':
                anims={name:pick(indices) for name,indices in dict(idle=[0,1],walk=[2,3,4,5],run=[2,3,4,5],attack=[6,7,8,9],hurt=[10,11]).items()}
            else:anims={'idle':pick([0])}
            ref=source.height/rows if sheet=='settlement_v3' else float(np.median([f['h'] for f in frames[:2]]))
            sprites[cls]=dict(sheet=sheet,ref=ref,anims=anims)
        print(sheet, 'cells', len(items), 'atlas', atlas.size)
    return sprites
