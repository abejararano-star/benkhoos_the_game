import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES } from '../js/config.js';
const root=fileURLToPath(new URL('../',import.meta.url));
test('the PC interface has unique ids and all local dependencies exist',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
    if(url.startsWith('#'))continue;
    assert.ok(!url.startsWith('http'),'No CDN or remote dependency is required');
    assert.ok(fs.existsSync(path.join(root,url.split(/[?#]/)[0])),url);
  }
  for(const file of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js'))){
    const code=fs.readFileSync(path.join(root,'js',file),'utf8');
    for(const [,url] of code.matchAll(/from ['"]([^'"]+)['"]/g))assert.ok(fs.existsSync(path.resolve(root,'js',url)),file+' -> '+url);
  }
});
test('every role and enemy draws from the real atlas, with stable foot anchors',async()=>{
  const atlas=JSON.parse(fs.readFileSync(path.join(root,'assets/atlas/atlas.json'),'utf8'));
  const logs=[];
  class ImageMock {set src(value){queueMicrotask(()=>this.onload());}}
  const sandbox={window:{},Image:ImageMock,console:{log(){},warn(){}},fetch:async()=>({ok:true,json:async()=>atlas})};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/sprite_manager.js'),'utf8'),sandbox);
  const manager=sandbox.window.SpriteManager;
  for(let i=0;i<20&&!manager.ready;i++)await Promise.resolve();
  assert.equal(manager.ready,true);
  const gradient={addColorStop(){}};
  const ctx=new Proxy({drawImage:(...args)=>logs.push(args),createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
  for(const tier of [1,2,3])for(const role of ROLES){
    const unit={role,tier,vx:0,animSeed:0,facing:1};
    assert.equal(manager.drawAlly(ctx,0,246,1,unit,0),true,`${role} tier ${tier}`);
  }
  for(const type of ['CAMPESINO','BANDOLERO','SOLDADO_ESPANOL','ARQUERO_COLONIAL','PIQUERO','ARCABUCERO','CABALLERO','HERALDO_ALADO','GOBERNADOR_GIRON']){
    assert.equal(manager.drawEnemy(ctx,0,246,1,{type,phase:1,isMoving:false,animTime:0},0),true,type);
  }
  assert.ok(logs.length>35);
  for(const args of logs){assert.equal(args.length,9);assert.ok(args.slice(1).every(Number.isFinite));}
  logs.length=0;manager.draw(ctx,'benkos',['idle'],100,246,1,42,0);
  const f=atlas.sprites.benkos.anims.idle[0], scale=42/atlas.sprites.benkos.ref;
  assert.equal(logs[0][5],Math.round(-f.ax*scale));assert.equal(logs[0][6],Math.round(-f.ay*scale));
});
