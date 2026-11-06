"""Validate all atlas references using only Python's standard library.
Optional contact sheets: python tools/check_atlas.py --preview (requires Pillow).
"""
import argparse, json, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--atlas',type=Path,default=ROOT/'assets/atlas');args=parser.parse_args()
    atlas_dir=args.atlas.resolve()
    sprites=json.loads((atlas_dir/'atlas.json').read_text(encoding='utf-8-sig'))['sprites']
    errors=[]; sizes={}; count=0
    for name,sp in sprites.items():
        path=atlas_dir/(sp['sheet']+'.png')
        if not path.is_file(): errors.append(f'{name}: missing sheet');continue
        if sp['sheet'] not in sizes: sizes[sp['sheet']]=struct.unpack('>II',path.read_bytes()[16:24])
        width,height=sizes[sp['sheet']]
        for anim,frames in sp['anims'].items():
            if not frames: errors.append(f'{name}/{anim}: empty animation')
            for f in frames:
                count+=1
                if min(f['x'],f['y'])<0 or min(f['w'],f['h'])<=0 or f['x']+f['w']>width or f['y']+f['h']>height: errors.append(f'{name}/{anim}: invalid frame')
                if not all(k in f for k in ['ax','ay']):errors.append(f'{name}/{anim}: missing anchor')
    if errors: raise SystemExit('\n'.join(errors))
    print(f'Atlas OK: {len(sprites)} classes, {count} frame references, {len(sizes)} sheets.')
    if args.preview:
        from PIL import Image, ImageDraw
        out=ROOT/'tools/previews';out.mkdir(exist_ok=True)
        for name in ['benkos','trabajador','campeon']:
            sp=sprites[name];sheet=Image.open(atlas_dir/(sp['sheet']+'.png'))
            rows=[]
            for anim,frames in sp['anims'].items():
                if anim=='portrait':continue
                h=max(f['h'] for f in frames)//2+24
                rows.append((anim,frames,h))
            im=Image.new('RGB',(1500,sum(h for _,_,h in rows)),(39,65,51));d=ImageDraw.Draw(im);y=0
            for anim,frames,h in rows:
                d.text((5,y),name+'/'+anim,fill='#e6c486');x=5
                for f in frames:
                    frame=sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                    frame=frame.resize((max(1,f['w']//2),max(1,f['h']//2)))
                    if x+frame.width>1500:break
                    im.paste(frame,(x,y+20),frame);x+=frame.width+10
                y+=h
            im.save(out/(name+'.png'))
        print('Contact sheets written to tools/previews/.')
if __name__=='__main__':main()
