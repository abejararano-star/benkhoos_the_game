"""Give the entire local client graph one content-derived release URL."""
import hashlib
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
modules=sorted((ROOT/'js').glob('*.js'))
pattern=re.compile(r"(from\s*['\"])(\.{1,2}/[^'\"]+?\.js)(?:\?v=[^'\"]*)?(['\"])")
contents={p:pattern.sub(r'\1\2\3',p.read_text(encoding='utf-8')) for p in modules}
html_path=ROOT/'index.html'
html=re.sub(r'((?:src|href)="(?:js/[^"?]+\.js|css/[^"?]+\.css))(?:\?v=[^"]*)?(\")',r'\1\2',html_path.read_text(encoding='utf-8'))
digest=hashlib.sha256()
for p,content in contents.items():digest.update(p.name.encode());digest.update(content.encode())
digest.update(html.encode());digest.update((ROOT/'css/game.css').read_bytes());digest.update((ROOT/'assets/atlas/atlas.json').read_bytes())
build=digest.hexdigest()[:12]
for p,content in contents.items():p.write_text(pattern.sub(lambda m:m[1]+m[2]+'?v='+build+m[3],content),encoding='utf-8')
html=re.sub(r'((?:src|href)="(?:js/[^"?]+\.js|css/[^"?]+\.css))(\")',lambda m:m[1]+'?v='+build+m[2],html)
html_path.write_text(html,encoding='utf-8')
print('Client release:',build)
