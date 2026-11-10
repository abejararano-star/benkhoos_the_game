import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePerson, affinity, proficiency, reactToDamage, requestProfession, completeProfession, updatePerson, toggleMountedEscort, mountedEscortPosts } from '../js/people.js';
import { chooseToolRack } from '../js/ai.js';
import { createInitialState } from '../js/world-state.js';
import { makeSave, restoreSave } from '../js/save-system.js';
function person(id=4,role='AGRICULTOR',x=0){return ensurePerson({id,role,tier:1,x,y:268,vx:0,assignedSide:1,hp:80,maxHp:80,animSeed:0});}
test('two riders can escort Benkos in formation, and keep the assignment across a save', () => {
  const state = createInitialState();
  state.benkos.x = 6700;
  state.benkos.facing = -1;
  state.units = [1, 2, 3].map(id => person(id, 'CABALLERO_ALIADO'));
  assert.match(toggleMountedEscort(state.units[0], state), /cabalgará/);
  assert.match(toggleMountedEscort(state.units[1], state), /cabalgará/);
  assert.match(toggleMountedEscort(state.units[2], state), /dos jinetes/);
  const {state: loaded} = restoreSave(makeSave(state, 20), createInitialState());
  assert.deepEqual([...mountedEscortPosts(loaded)], [[1, 6772], [2, 6637]]);
  assert.match(toggleMountedEscort(loaded.units[0], loaded), /vuelve/);
  assert.deepEqual([...mountedEscortPosts(loaded).keys()], [2]);
});
test('identity, gift and personality are stable, with a genuine effect on efficacy',()=>{
  const a=person(4),b=person(4);assert.deepEqual(a,b);
  a.attributes={strength:5,endurance:5,perception:1,dexterity:1,cultivation:1};
  assert.ok(affinity(a,'GUERRERO')>affinity(a,'CAZADOR'));
  a.experience.GUERRERO=1200;assert.ok(proficiency(a,'GUERRERO')>1.3);
});
test('a wounded farmer retreats and a healthy spearman holds his ground',()=>{
  const state=createInitialState();state.enemies=[{x:60,hp:80,appearTimer:0}];
  const farmer=person(4,'AGRICULTOR'),soldier=person(5,'GUERRERO');state.units=[farmer,soldier];
  assert.equal(updatePerson(farmer,state,.1),true);assert.equal(farmer.activity,'FLEE');assert.ok(farmer.x<0);
  assert.equal(updatePerson(soldier,state,.1),false);assert.equal(soldier.activity,'GUARD');
  reactToDamage(soldier,15,-1);assert.equal(soldier.activity,'HURT');assert.ok(soldier.hurtTimer>0);assert.ok(soldier.fear>0);
});
test('hunter backs away from a nearby enemy and an injured soldier retreats',()=>{
  const state=createInitialState();state.enemies=[{x:45,hp:80,appearTimer:0}];
  const hunter=person(7,'CAZADOR');updatePerson(hunter,state,.1);assert.equal(hunter.activity,'KITE');assert.ok(hunter.x<0);
  const soldier=person(9,'GUERRERO');soldier.hp=5;updatePerson(soldier,state,.1);assert.equal(soldier.activity,'FLEE');
});
test('a worker does not jitter back toward an enemy blocking the path home',()=>{
  const state=createInitialState(),u=person(6,'LENADOR',125);state.enemies=[{x:50,hp:80,appearTimer:0}];
  let previous=u.x;
  for(let i=0;i<120;i++){updatePerson(u,state,1/60);assert.ok(u.x>=previous);previous=u.x;}
  assert.ok(u.x>220);
});
test('changing soldier to hunter keeps identity and wounds, consumes and returns tools',()=>{
  const s=createInitialState(),u=person(8,'GUERRERO',-95);s.units=[u];u.hp=u.maxHp/2;
  u.experience.GUERRERO=75;const identity=u.name,gift=u.gift;
  assert.equal(requestProfession(u,'CAZADOR',s).success,true);assert.equal(u.role,'GUERRERO');
  const rack=s.toolRacks.find(r=>r.role==='CAZADOR'),old=s.toolRacks.find(r=>r.role==='GUERRERO'),stock=old.stock;
  assert.equal(completeProfession(u,rack,s),true);assert.equal(u.role,'CAZADOR');assert.equal(u.name,identity);assert.equal(u.gift,gift);
  assert.equal(rack.stock,0);assert.equal(old.stock,stock+1);assert.equal(u.experience.GUERRERO,75);assert.ok(Math.abs(u.hp/u.maxHp-.5)<.02);
});
test('a strong farmer can become a soldier but unavailable elite roles are gated',()=>{
  const s=createInitialState(),u=person(3);s.units=[u];u.attributes.strength=5;u.attributes.endurance=5;
  assert.equal(requestProfession(u,'ESPADACHIN',s).success,false);
  assert.equal(requestProfession(u,'GUERRERO',s).success,true);
  const rack=s.toolRacks.find(r=>r.role==='GUERRERO');u.x=rack.x;updatePerson(u,s,.02);assert.equal(u.role,'GUERRERO');
});
test('people choose available tools in line with their talents and wishes',()=>{
  const s=createInitialState(),u=person(20,'ALDEANO');s.units=[u];u.preferredRole='CAZADOR';
  u.attributes={strength:1,endurance:2,perception:5,dexterity:5,cultivation:1};
  assert.equal(chooseToolRack(u,s).role,'CAZADOR');
});
test('a new save preserves people, retraining, letters and pending arrivals',()=>{
  const s=createInitialState(),u=person(3);s.units=[u];requestProfession(u,'GUERRERO',s);
  s.campaign.orders.push({id:'boss',type:'HERALDO_ALADO',side:1,eta:25,kind:'boss'});
  s.campaign.letters.push({id:'first',title:'Carta',text:'Una patrulla se aproxima',day:1});
  const restored=restoreSave(makeSave(s,100),createInitialState()).state;
  assert.deepEqual(restored.units,s.units);assert.deepEqual(restored.campaign,s.campaign);
});
test('v2 saves migrate without dropping their damaged troops or inventing arrivals',()=>{
  const s=createInitialState();delete s.messengers;delete s.campaign;s.units=[{id:11,role:'MINERO',tier:1,x:20,y:268,hp:12,maxHp:80}];
  s.toolRacks=s.toolRacks.filter(r=>r.role!=='LENADOR');
  const save={save_version:2,snapshot:{state:s,nextEntityId:20}};
  const restored=restoreSave(save,createInitialState()).state;
  assert.ok(restored.units[0].name);assert.ok(restored.units[0].hp<20);assert.deepEqual(restored.campaign.orders,[]);assert.deepEqual(restored.messengers,[]);
  assert.ok(restored.toolRacks.some(r=>r.role==='LENADOR'));
});
