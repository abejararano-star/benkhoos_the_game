"""Import combat, jungle and wildlife art with body-based scale and clean foot anchors."""
from pathlib import Path
import numpy as np
from PIL import Image
from import_expansion import grid_bounds

ROOT=Path(__file__).resolve().parents[1]
ENEMIES=['CAMPESINO','BANDOLERO','SOLDADO_ESPANOL','ARQUERO_COLONIAL','PIQUERO','ARCABUCERO']
ALLIES=['hero_sword','hero_spear','levy_spearman','levy_archer','elite_spearman','elite_archer','elite_swordsman','royal_spearman','royal_archer','royal_swordsman']
ANIMALS=['CAPYBARA','DEER','BOAR','MONKEY','MACAW','TURTLE','JAGUAR']
HABITATS=['cascade','bridge','log','fruit','fishing','water']

def import_pixel_v8(output):
    from export_atlas import pack
    sprites={}
    for sheet,cols,rows in [('enemy_gait_v8',8,6),('enemy_actions_v8',8,6),('combat_allies_v8',8,10),('jungle_layers_v8',1,2),('wildlife_v8',8,7),('habitat_v8',3,2)]:
        source=Image.open(ROOT/'art/source'/f'{sheet}.png').convert('RGBA')
        mask=np.array(source)[:,:,3]>220
        ybounds=[0,source.height//2,source.height] if sheet=='jungle_layers_v8' else grid_bounds(mask,1,rows)
        items=[];classes={};refs={};roots={}
        for row in range(rows):
            xbounds=grid_bounds(mask[ybounds[row]:ybounds[row+1]],0,cols)
            for col in range(cols):
                cell=source.crop((xbounds[col],ybounds[row],xbounds[col+1],ybounds[row+1]))
                box=cell.getbbox()
                if not box:raise ValueError(f'Empty {sheet}/{row}/{col}')
                frame=cell.crop(box);a=np.array(cell)[:,:,3];ys,xs=np.where(a>220)
                if sheet=='jungle_layers_v8':cls=['jungle_far','jungle_near'][row]
                elif sheet=='habitat_v8':cls='habitat_'+HABITATS[row*cols+col]
                elif sheet=='wildlife_v8':cls='animal_'+ANIMALS[row]
                elif sheet=='combat_allies_v8':cls='battle_'+ALLIES[row]
                else:cls=('enemy_gait_' if sheet=='enemy_gait_v8' else 'enemy_act_')+ENEMIES[row]
                index=0 if sheet in ['habitat_v8','jungle_layers_v8'] else col
                # Center on the body rather than on an extended weapon.
                middle=(ys>ys.min()+(ys.max()-ys.min())*.35)&(ys<ys.min()+(ys.max()-ys.min())*.68)
                center=float(np.median(xs[middle])) if sheet.startswith(('enemy_','combat_')) else cell.width/2
                if sheet in ['enemy_actions_v8','combat_allies_v8']:
                    if col==0:roots[row]=center/cell.width
                    else:center=roots[row]*cell.width
                baseline=float(np.percentile(ys,99.8))+1
                f=dict(i=index,w=frame.width,h=frame.height,ax=center-box[0],ay=baseline-box[1])
                classes.setdefault(cls,[]).append(f);items.append(((cls,index),frame))
                if col==0 or sheet=='habitat_v8':
                    core=abs(xs-center)<cell.width*.13
                    body=ys[core] if core.any() else ys
                    refs[cls]=float(ys.max()-body.min()+1) if sheet.startswith(('enemy_','combat_')) else float(ys.max()-ys.min()+1)
                if sheet=='jungle_layers_v8':refs[cls]=cell.height;f['ax']=frame.width/2;f['ay']=frame.height
        width=max(2048,max(im.width for _,im in items)+2)
        atlas,positions=pack(items,width=width);atlas.save(output/f'{sheet}.png',optimize=True)
        for cls,frames in classes.items():
            for f in frames:f['x'],f['y']=positions[(cls,f['i'])]
            def pick(indices):return [dict(frames[i],i=k) for k,i in enumerate(indices)]
            if sheet=='enemy_gait_v8':anims={'walk':pick(range(8))}
            elif sheet=='enemy_actions_v8':anims={'idle':pick([0]),'windup':pick([1,2]),'attack':pick([3,4,5]),'hurt':pick([6]),'die':pick([6,7])}
            elif sheet=='combat_allies_v8':anims={'idle':pick([0,6]),'attack':pick(range(7)),'hurt':pick([7])}
            elif sheet=='wildlife_v8':anims={'idle':pick([0,1]),'walk':pick([2,3,4,5]),'eat':pick([6]),'hurt':pick([7])}
            else:anims={'idle':pick([0])}
            sprites[cls]=dict(sheet=sheet,ref=refs[cls],anims=anims)
        print(sheet,'cells',len(items),'atlas',atlas.size)
    return sprites
