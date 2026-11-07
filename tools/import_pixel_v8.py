"""Import the jungle, wildlife and creek scenery."""
from pathlib import Path
import numpy as np
from PIL import Image
from import_expansion import grid_bounds

ROOT=Path(__file__).resolve().parents[1]
ANIMALS=['CAPYBARA','DEER','BOAR','MONKEY','MACAW','TURTLE','JAGUAR']
HABITATS=['cascade','bridge','log','fruit','fishing','water']

def import_pixel_v8(output):
    from export_atlas import pack
    sprites={}
    for sheet,cols,rows in [('jungle_layers_v8',1,2),('wildlife_v8',8,7),('habitat_v8',3,2)]:
        source=Image.open(ROOT/'art/source'/f'{sheet}.png').convert('RGBA')
        mask=np.array(source)[:,:,3]>220
        ybounds=[0,source.height//2,source.height] if sheet=='jungle_layers_v8' else grid_bounds(mask,1,rows)
        items=[];classes={};refs={}
        for row in range(rows):
            xbounds=grid_bounds(mask[ybounds[row]:ybounds[row+1]],0,cols)
            for col in range(cols):
                cell=source.crop((xbounds[col],ybounds[row],xbounds[col+1],ybounds[row+1]))
                box=cell.getbbox()
                if not box:raise ValueError(f'Empty {sheet}/{row}/{col}')
                frame=cell.crop(box);a=np.array(cell)[:,:,3];ys,xs=np.where(a>220)
                if sheet=='jungle_layers_v8':cls=['jungle_far','jungle_near'][row]
                elif sheet=='habitat_v8':cls='habitat_'+HABITATS[row*cols+col]
                else:cls='animal_'+ANIMALS[row]
                index=0 if sheet in ['habitat_v8','jungle_layers_v8'] else col
                center=cell.width/2
                baseline=float(np.percentile(ys,99.8))+1
                f=dict(i=index,w=frame.width,h=frame.height,ax=center-box[0],ay=baseline-box[1])
                classes.setdefault(cls,[]).append(f);items.append(((cls,index),frame))
                if col==0 or sheet=='habitat_v8':
                    refs[cls]=float(ys.max()-ys.min()+1)
                if sheet=='jungle_layers_v8':refs[cls]=cell.height;f['ax']=frame.width/2;f['ay']=frame.height
        width=max(2048,max(im.width for _,im in items)+2)
        atlas,positions=pack(items,width=width);atlas.save(output/f'{sheet}.png',optimize=True)
        for cls,frames in classes.items():
            for f in frames:f['x'],f['y']=positions[(cls,f['i'])]
            def pick(indices):return [dict(frames[i],i=k) for k,i in enumerate(indices)]
            if sheet=='wildlife_v8':anims={'idle':pick([0,1]),'walk':pick([2,3,4,5]),'eat':pick([6]),'hurt':pick([7])}
            else:anims={'idle':pick([0])}
            sprites[cls]=dict(sheet=sheet,ref=refs[cls],anims=anims)
        print(sheet,'cells',len(items),'atlas',atlas.size)
    return sprites
