"""Pack the generated 8x8 sheet into the game's existing atlas format (preserves alpha).
This is a deterministic game-asset import, not a second art-generation pipeline.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ROWS=['civil','woodcutter','farmer','miner','hunter','spearman','archer','messenger']
def import_people(output):
    from export_atlas import pack
    image=Image.open(ROOT/'art/source/palenque_people_v2.png').convert('RGBA')
    width,height=image.size; cw,ch=width//8,height//8
    items=[];meta={};sprites={}
    for row,name in enumerate(ROWS):
        cls='people_'+name;frames=[]
        for col in range(8):
            frame=image.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
            box=frame.getbbox()
            if not box:raise ValueError(f'Empty generated cell {row}/{col}')
            # Transparent color is kept as-is; bounds are based only on alpha.
            frame=frame.crop(box);alpha=np.array(frame)[:,:,3];ys,xs=np.where(alpha>128)
            low=ys>ys.max()-max(4,int(frame.height*.08))
            ax=int(np.median(xs[low]));ay=int(ys.max())+1
            key=(cls,col);items.append((key,frame));meta[key]=(ax,ay)
            frames.append({'i':col,'w':frame.width,'h':frame.height,'ax':ax,'ay':ay})
        sprites[cls]={'sheet':'palenque_people_v2','ref':int(np.median([f['h'] for f in frames[:3]])), 'anims':{},'_frames':frames}
    atlas,positions=pack(items)
    for cls,sp in sprites.items():
        frames=sp.pop('_frames')
        for col,f in enumerate(frames):f['x'],f['y']=positions[(cls,col)]
        def pick(indices):return [dict(frames[i],i=j) for j,i in enumerate(indices)]
        sp['anims']={'idle':pick([0]),'walk':pick([1,2]),'run':pick([6,1,6,2]),'work':pick([3,4]),'attack':pick([3,4]),'hurt':pick([5]),'rest':pick([7]),'carry':pick([1,2]),'escape':pick([6,1,6,2]),'plead':pick([0]),'die':pick([5,7])}
    output.mkdir(parents=True,exist_ok=True);atlas.save(output/'palenque_people_v2.png',optimize=True)
    return sprites
if __name__=='__main__':
    out=ROOT/'assets/atlas';p=out/'atlas.json';data=json.loads(p.read_text(encoding='utf-8'));data['sprites'].update(import_people(out));p.write_text(json.dumps(data,separators=(',',':')),encoding='utf-8');print('Imported 64 people frames.')
