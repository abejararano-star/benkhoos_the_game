"""Pack the v7 art without altering generated colors or alpha."""
from pathlib import Path
import numpy as np
from PIL import Image
from import_expansion import grid_bounds

ROOT=Path(__file__).resolve().parents[1]
PROPS={
    'stations_v7':(3,3,['station_'+r for r in ['LENADOR','AGRICULTOR','MINERO','CAZADOR','CONSTRUCTOR','ARQUERO','GUERRERO','ESPADACHIN','CABALLERO_ALIADO']]),
    'walls_v7':(3,2,['fortification_'+str(i) for i in range(1,6)]+['fortification_ruin']),
    'forest_v7':(3,2,['forest_'+s for s in ['ceiba','hardwood','mangrove','palm','stump','sapling']]),
    'landmarks_v7':(3,2,['landmark_'+s for s in ['altar','totem','mine','farm','gate','fire']]),
}

def import_pixel_v7(output):
    from export_atlas import pack
    sprites={}
    specs=[('currency_v7',8,2)]+[(name,c,r) for name,(c,r,_) in PROPS.items()]
    for sheet,cols,rows in specs:
        image=Image.open(ROOT/'art/source'/f'{sheet}.png').convert('RGBA')
        mask=np.array(image)[:,:,3]>220
        ybounds=grid_bounds(mask,1,rows)
        items=[];classes={}
        for row in range(rows):
            # The generated forest uses different spacing in each row.
            xbounds=grid_bounds(mask[ybounds[row]:ybounds[row+1]],0,cols)
            for col in range(cols):
                cell=image.crop((xbounds[col],ybounds[row],xbounds[col+1],ybounds[row+1]))
                box=cell.getbbox()
                if box is None:raise ValueError(f'Empty {sheet}/{row}/{col}')
                frame=cell.crop(box);a=np.array(cell)[:,:,3];ys,xs=np.where(a>160)
                if not len(ys):raise ValueError('Invisible sprite')
                baseline=float(np.percentile(ys,99.8))+1
                if sheet=='currency_v7':
                    cls='currency_coin' if row==0 else 'currency_pouch' if col<5 else 'currency_chest'
                    index=col if row==0 or col<5 else col-5
                    ax=cell.width/2-box[0]
                else:
                    cls=PROPS[sheet][2][row*cols+col];index=0
                    ax=cell.width/2-box[0]
                key=(cls,index);items.append((key,frame))
                solid_y=np.where(a>220)[0]
                classes.setdefault(cls,[]).append(dict(i=index,w=frame.width,h=frame.height,ax=ax,ay=baseline-box[1],_solidH=int(solid_y.max()-solid_y.min()+1)))
        atlas,positions=pack(items);atlas.save(output/f'{sheet}.png',optimize=True)
        for cls,frames in classes.items():
            for f in frames:f['x'],f['y']=positions[(cls,f['i'])]
            heights=[f.pop('_solidH') for f in frames]
            ref=float(max(heights) if cls=='currency_pouch' else np.median(heights))
            if cls=='currency_coin':anims={'spin':frames,'idle':[frames[0]]}
            elif cls=='currency_pouch':anims={'fill':frames,'idle':[frames[0]]}
            elif cls=='currency_chest':anims={'open':frames,'idle':[frames[0]]}
            else:anims={'idle':frames}
            sprites[cls]=dict(sheet=sheet,ref=ref,anims=anims)
        print(sheet, 'cells',len(items),'atlas',atlas.size,'rows',ybounds)
    return sprites
