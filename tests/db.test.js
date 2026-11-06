import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
function client(fetch, broken = false) {
  const values = new Map();
  const context = { window:{}, document:{baseURI:'http://localhost/benkhoos/'}, URL, AbortController, setTimeout, clearTimeout, fetch,
    localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(broken)throw Error('quota');values.set(k,v);}} };
  vm.runInNewContext(code,context);
  return {db:context.window.BenkosDB, values};
}
const response = data => ({ok:true,json:async()=>data});
test('offline save is explicitly local and storage failures do not claim success',async()=>{
  const offline=async()=>{throw Error('offline');};
  assert.equal((await client(offline).db.saveGame({coins:0})).storage,'local');
  assert.equal((await client(offline,true).db.saveGame({coins:0})).success,false);
});
test('successful server save retains its id for updates',async()=>{
  const requests=[];
  const {db}=client(async(url,options)=>{requests.push(JSON.parse(options.body));return response({success:true,partida_id:12});});
  assert.equal((await db.saveGame({})).storage,'server'); await db.saveGame({}); assert.equal(requests[1].partida_id,12);
});
test('a newer offline snapshot wins over the remote snapshot',async()=>{
  const {db,values}=client(async()=>response({success:true,partida:{id:1,saved_at:'2026-11-06T10:00:00Z',coins:4}}));
  values.set('benkhoos_save_backup',JSON.stringify({saved_at:'2026-11-06T11:00:00Z',coins:0}));
  assert.equal((await db.loadGame()).coins,0); assert.equal(db.lastLoadStorage,'local');
});
test('settings merge and tolerate inaccessible local storage',async()=>{
  const {db}=client(async()=>{throw Error();});
  await db.saveConfig({audio_enabled:false});await db.saveConfig({audio_volume:0});
  const cfg=await db.loadConfig(); assert.equal(cfg.audio_enabled,false);assert.equal(cfg.audio_volume,0);
});
