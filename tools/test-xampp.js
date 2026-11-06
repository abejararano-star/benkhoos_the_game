import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInitialState } from '../js/world-state.js';
import { makeSave } from '../js/save-system.js';
import { ensurePerson } from '../js/people.js';

const base = process.env.BENKHOOS_TEST_URL ?? 'http://localhost/benkhoos/api/';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Integration tests are restricted to local XAMPP.');
const player = `Benkhoos_QA_${Date.now()}`;
async function request(path,payload,headers={}) {
  const res=await fetch(new URL(path,base),{...(payload ? {method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json',...headers}}:{}),signal:AbortSignal.timeout(5000)});
  return {status:res.status,data:await res.json()};
}
const before=(await request('status.php')).data.stats;
try {
  const s=createInitialState();s.armyTier=3;s.armorUnlocked=true;s.coins=0;s.treasuryCoins=0;s.benkos.x=0;s.benkos.spirit=0;
  s.walls[0].level=2;s.walls[0].hp=12;s.haciendas[0].destroyed=true;s.skills[2].unlocked=true;s.trees[0].chopped=true;
  s.units=[{id:44,role:'GUERRERO',tier:3,hp:17,maxHp:213,x:0,y:268}];
  s.units.push({id:45,role:'LENADOR',tier:1,hp:40,maxHp:95,x:-405,y:268});s.units.forEach(ensurePerson);
  s.units[0].requestedRole='CAZADOR';
  s.campaign.orders.push({id:'warning',type:'HERALDO_ALADO',side:1,eta:25,kind:'boss'});
  s.campaign.letters.push({id:'message',day:1,title:'Un mensajero',text:'La patrulla viene del camino este.',read:false});
  const payload={jugador_nombre:player,...makeSave(s,80)};
  const first=await request('save.php',payload);assert.equal(first.status,200);assert.equal(first.data.success,true);
  const id=first.data.partida_id;assert.ok(id>0);
  const loaded=await request(`load.php?jugador=${player}&partida_id=${id}`);
  assert.equal(loaded.data.partida.save_version,3);assert.deepEqual(loaded.data.partida.snapshot,payload.snapshot);
  payload.partida_id=id;payload.snapshot.state.walls[0].hp=0;
  const update=await request('save.php',payload);assert.equal(update.data.partida_id,id);
  const reload=await request(`load.php?jugador=${player}&partida_id=${id}`);assert.equal(reload.data.partida.snapshot.state.walls[0].hp,0);
  const other=await request(`load.php?jugador=Other_QA&partida_id=${id}`);assert.equal(other.data.success,false);
  const invalid=await request('save.php',{jugador_nombre:player,save_version:2});assert.equal(invalid.status,400);
  const origin=await request('save.php',payload,{Origin:'https://example.org'});assert.equal(origin.status,403);
  const legacy=await request('save.php',{jugador_nombre:player,dia_actual:2,tropas:[],construcciones:[]});assert.equal(legacy.data.success,true);
  const legacyLoad=await request(`load.php?jugador=${player}&partida_id=${legacy.data.partida_id}`);assert.equal(legacyLoad.data.partida.save_version,1);
  console.log('XAMPP OK: full snapshot, zero values, tier 3, damage, update ID, profile isolation, input validation, origin checks and legacy saves.');
} finally {
  const cleanup=fileURLToPath(new URL('./test-db-cleanup.php',import.meta.url));
  execFileSync(process.env.BENKHOOS_PHP ?? 'C:/xampp/php/php.exe',[cleanup,player],{stdio:'inherit'});
  const after=(await request('status.php')).data.stats;
  assert.equal(after.partidas_guardadas,before.partidas_guardadas);assert.equal(after.jugadores_registrados,before.jugadores_registrados);
  console.log(`Existing saves preserved: ${after.partidas_guardadas}. QA rows removed.`);
}
