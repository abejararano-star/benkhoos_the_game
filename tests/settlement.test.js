import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/world-state.js';
import {ensurePerson} from '../js/people.js';
import {requestBuilding,workConstruction,upgradeInfo,homeRecovery} from '../js/settlement.js';
import {makeSave,restoreSave} from '../js/save-system.js';

function world(){const s=createInitialState();const u={id:1,role:'CONSTRUCTOR',tier:1,hp:90,maxHp:90,x:100};ensurePerson(u);s.units=[u];return s;}
test('construction charges once, needs a builder at the site and unlocks later materials',()=>{
  const s=world(),u=s.units[0];s.coins=24;s.resources={wood:100,stone:100};
  assert.equal(requestBuilding(s,'home','home_inner').success,false);
  assert.equal(requestBuilding(s,'hq').success,true);assert.equal(s.coins,18);assert.equal(s.resources.wood,96);
  assert.equal(requestBuilding(s,'hq').success,false);assert.equal(s.coins,18);
  workConstruction(u,s,.1);assert.equal(s.settlement.projects[0].progress,0);assert.ok(u.x<100);
  for(let i=0;i<900;i++)workConstruction(u,s,1/60);
  assert.equal(s.settlement.level,2);assert.equal(s.settlement.projects.length,0);
  assert.equal(requestBuilding(s,'home','home_inner').success,true);
  u.x=-245;for(let i=0;i<900;i++)workConstruction(u,s,1/60);
  assert.equal(s.settlement.homes[1].level,2);assert.ok(homeRecovery(s)>1);
});
test('all five central-house stages are reachable and the last stage cannot spend again',()=>{
  const s=world();s.resources={wood:1000,stone:1000};
  for(let next=2;next<=5;next++){s.coins=24;s.units[0].x=0;assert.equal(requestBuilding(s,'hq').success,true);for(let i=0;i<2500;i++)workConstruction(s.units[0],s,1/60);assert.equal(s.settlement.level,next);}
  const before=s.coins;assert.equal(requestBuilding(s,'hq').success,false);assert.equal(s.coins,before);
});
test('no builder or missing resources cannot create or partially pay for an upgrade',()=>{
  const s=world();s.units=[];const before=structuredClone(s.resources);assert.equal(requestBuilding(s,'hq').success,false);assert.deepEqual(s.resources,before);
  s.units=world().units;s.resources.wood=0;assert.equal(requestBuilding(s,'hq').success,false);assert.equal(s.coins,16);
  assert.ok(upgradeInfo(s,'hq').reason);
});
test('materials, cargo, buildings and unfinished work survive saves; old v3 worlds gain stations',()=>{
  const s=world();requestBuilding(s,'hq');s.units[0].cargoWood=5;s.settlement.projects[0].progress=.43;
  const loaded=restoreSave(makeSave(s,100),createInitialState()).state;
  for(const key of ['resources','settlement','units'])assert.deepEqual(loaded[key],s[key]);
  const old=makeSave(s,100);delete old.snapshot.state.resources;delete old.snapshot.state.settlement;old.snapshot.state.toolRacks=old.snapshot.state.toolRacks.filter(r=>r.role!=='CONSTRUCTOR');
  const migrated=restoreSave(old,createInitialState()).state;assert.equal(migrated.settlement.level,1);assert.equal(migrated.resources.wood,8);assert.ok(migrated.toolRacks.some(r=>r.role==='CONSTRUCTOR'));
});

test('invalid unfinished projects cannot crash the live simulation on load',()=>{
  for(const mutate of [s=>s.settlement.projects.push({kind:'home',targetId:'missing',x:0,targetLevel:2,progress:0,duration:10}),s=>s.resources=[],s=>s.settlement.homes[1].id=s.settlement.homes[0].id]){
    const s=world();mutate(s);assert.throws(()=>restoreSave(makeSave(s,100),createInitialState()));
  }
});
