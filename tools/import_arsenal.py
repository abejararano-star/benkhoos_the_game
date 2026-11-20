"""Register siege architecture and feline motion; adapt existing troop families."""
from pathlib import Path
from shutil import copyfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def import_arsenal(output, existing):
    result = {}
    for sheet in ['ballista_tower_v28', 'allied_cats_v28']:
        source = ROOT / 'art/source' / (sheet + '.png')
        copyfile(source, output / source.name)
    image = Image.open(output / 'ballista_tower_v28.png')
    left, top, right, bottom = image.getchannel('A').point(lambda v: 255 if v >= 48 else 0).getbbox()
    frame = dict(i=0, x=left, y=top, w=right-left, h=bottom-top, ax=500-left, ay=1477-top)
    for level in [4, 5]:
        result[f'watchtower_level_{level}'] = dict(sheet='ballista_tower_v28', ref=787, anims={'idle':[frame]})
    image = Image.open(output / 'allied_cats_v28.png')
    cw, ch = image.width//6, image.height//3
    for row, name in enumerate(['animal_JAGUAR_armored','animal_PANTHER_armored','animal_PANTHER']):
        frames=[]
        for column in range(6):
            x,y=column*cw,row*ch
            cell=image.getchannel('A').crop((x,y,x+cw,y+ch))
            l,t,r,b=cell.point(lambda v:255 if v>=48 else 0).getbbox()
            frames.append(dict(i=column,x=x+l,y=y+t,w=r-l,h=b-t,ax=cw/2-l,ay=b-t))
        result[name]=dict(sheet='allied_cats_v28',ref=142,anims={
            'idle':[frames[0]],'walk':[frames[1],frames[0],frames[2],frames[0]],'run':[frames[1],frames[4],frames[2]],
            'crouch':[frames[3]],'pounce':[frames[3],frames[4]],'swipe':[frames[0],frames[5],frames[0]],
            'recover':[frames[3],frames[0]],'hurt':[frames[3]],'eat':[frames[3]]})
    sources={'ESCUDERO':'actor_swordsman','LANCERO':'actor_elite_spearman',
             'ARQUERO_COMPUESTO':'actor_identity_m','JAVALINERO':'actor_identity_m'}
    for role, source in sources.items():
        result['actor_'+role]=existing[source]
        female='actor_identity_f_archer' if role=='ARQUERO_COMPUESTO' else 'actor_identity_f_guard'
        result['actor_'+role+'_f']=existing[female]
        base={'ESCUDERO':'GUERRERO','LANCERO':'GUERRERO','ARQUERO_COMPUESTO':'ARQUERO','JAVALINERO':'CAZADOR'}[role]
        result['stock_item_'+role]=existing['stock_item_'+base]
    result['actor_MOSQUETERO']=existing['actor_ARCABUCERO']
    result['actor_CANONERO']=existing['actor_SOLDADO_ESPANOL']
    return result
