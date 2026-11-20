import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/world-state.js';
import {ensurePerson, requestProfession, completeProfession, reactToDamage} from '../js/people.js';
import {SPECIALISTS, WATER_LINE_Y, ENEMY_CATALOG} from '../js/config.js';
import {TOWER_TIERS, refillTower, requestBuilding, upgradeInfo, workConstruction, advanceConstruction} from '../js/settlement.js';
import {towerAssignments, stepTowerWeapons, stepCannon, explodeCannon} from '../js/siege.js';
import {createAnimal, updateEcology} from '../js/ecology.js';
import {orderEquipment} from '../js/equipment.js';
import {strikeEnemy, strikeWildlife} from '../js/combat.js';
import {makeSave, restoreSave} from '../js/save-system.js';

function world(level=4) {
  const s=createInitialState();
  Object.assign(s,{phase:'DAY_EXPLORE',coins:24,enemies:[],units:[],wildlife:[]});
  s.settlement.level=5;s.armyTier=3;s.resources={wood:100,stone:100,food:10};
  const tower=s.settlement.towers[1];tower.level=level;tower.ammo=TOWER_TIERS[level].ammo??0;
  return s;
}
function crew(s,count) {
  const t=s.settlement.towers[1];
  s.units=Array.from({length:count},(_,i)=>ensurePerson({id:i+1,role:i%2?'ARQUERO_COMPUESTO':'ARQUERO',
    x:t.x+i,hp:85,maxHp:85,assignedSide:1,tier:1}));
  const assignments=towerAssignments(s);
  for(const u of s.units){const slot=assignments.get(u.id);if(slot)Object.assign(u,{x:slot.x,towerId:t.id,towerHeight:TOWER_TIERS[t.level].height,towerSlot:slot.slot});}
  return t;
}

test('tower capacity expands to four real archers, excluding expedition and recovering units',()=>{
  for(let level=1;level<=5;level++){
    const s=world(level);crew(s,6);
    s.units[0].hp=1;
    const assigned=towerAssignments(s,new Map([[2,1600]]));
    assert.equal(assigned.size,Math.min(4,TOWER_TIERS[level].capacity));
    assert.equal(assigned.has(1),false);assert.equal(assigned.has(2),false);
    assert.equal(new Set([...assigned.values()].map(t=>t.x)).size,assigned.size);
  }
});

test('ballista requires two operators; repeater fires a bounded four-bolt burst and consumes stock',()=>{
  const s=world(),t=crew(s,1);
  s.enemies=[{id:90,x:t.x+230,hp:500,appearTimer:0}];
  stepTowerWeapons(s,.1);assert.equal(s.projectiles.length,0);
  crew(s,2);stepTowerWeapons(s,.1);
  assert.equal(s.projectiles.length,1);assert.equal(t.ammo,7);
  assert.equal(s.projectiles[0].pierce,2);assert.equal(s.projectiles[0].armorPierce,.5);
  stepTowerWeapons(s,.2);assert.equal(s.projectiles.length,1);
  t.level=5;t.ammo=24;t.siegeCooldown=0;crew(s,3);s.projectiles=[];
  for(let i=0;i<60;i++)stepTowerWeapons(s,1/60);
  assert.equal(s.projectiles.length,4);assert.equal(t.ammo,20);
  t.ammo=0;t.siegeCooldown=0;stepTowerWeapons(s,4);
  assert.equal(s.projectiles.length,4);
  t.ammo=1;stepTowerWeapons(s,.1);assert.equal(s.projectiles.length,5);assert.equal(t.ammo,0);
});

test('archers retain their assigned slot while crossing toward a broad tower deck',()=>{
  const s=world(),t=s.settlement.towers[1];
  s.units=[1,2,3].map((id,i)=>ensurePerson({id,role:'ARQUERO',x:t.x-27+i*18,hp:80,maxHp:80,assignedSide:1}));
  const initial=towerAssignments(s);
  for(let frame=0;frame<180;frame++){
    const slots=towerAssignments(s);
    for(const u of s.units){
      const slot=slots.get(u.id);assert.equal(slot.slot,initial.get(u.id).slot);
      Object.assign(u,{towerId:t.id,towerSlot:slot.slot});
      u.x+=Math.sign(slot.x-u.x)*Math.min(Math.abs(slot.x-u.x),64/60);
    }
  }
  assert.ok(s.units.every(u=>Math.abs(u.x-initial.get(u.id).x)<.01));
});

test('tower upgrades need builders; cannon damage is repaired without replenishing free ammunition',()=>{
  const s=world(3),t=s.settlement.towers[1];
  const pay=()=>{const n=upgradeInfo(s,'tower',t.id).coins;for(let i=0;i<n;i++)assert.equal(requestBuilding(s,'tower',t.id).success,true);};
  pay();advanceConstruction(s,30);assert.equal(t.level,3);
  s.units=[ensurePerson({id:100,role:'CONSTRUCTOR',x:t.x,hp:90,maxHp:90})];
  workConstruction(s.units[0],s,0);advanceConstruction(s,18);
  assert.equal(t.level,4);assert.equal(t.ammo,8);
  t.integrity=0;t.ammo=2;s.coins=24;
  pay();workConstruction(s.units[0],s,0);advanceConstruction(s,6);
  assert.equal(t.integrity,100);assert.equal(t.level,4);assert.equal(t.ammo,2);
  const coins=s.coins,wood=s.resources.wood;
  assert.equal(refillTower(s,t.id).success,true);
  assert.equal(s.coins,coins-3);assert.equal(s.resources.wood,wood-2);assert.equal(t.ammo,8);
  assert.equal(refillTower(s,t.id).success,false);assert.equal(s.coins,coins-3);
  t.level=5;t.ammo=17;t.integrity=64;t.siegeCooldown=2.6;t.burst={left:2,next:.08};
  const loaded=restoreSave(makeSave(s,200),createInitialState()).state.settlement.towers[1];
  assert.equal(loaded.level,5);assert.equal(loaded.ammo,17);assert.equal(loaded.integrity,64);
  assert.equal(loaded.siegeCooldown,2.6);assert.deepEqual(loaded.burst,{left:2,next:.08});
});

test('specialists pay once and collect real equipment from their shared stand without changing identity',()=>{
  for(const [role,spec] of Object.entries(SPECIALISTS)){
    const s=world(),u=ensurePerson({id:55,role:'ALDEANO',sex:'M',x:0,hp:40,maxHp:80});
    s.units=[u];const identity=JSON.stringify([u.name,u.sex,u.physique,u.traits]);
    const rack=s.toolRacks.find(r=>r.role===spec.base);rack.stock=2;
    assert.equal(requestProfession(u,role,s).success,true);assert.equal(s.coins,24-spec.fee);
    requestProfession(u,role,s);assert.equal(s.coins,24-spec.fee);
    assert.equal(completeProfession(u,rack,s),true);assert.equal(u.role,role);assert.equal(rack.stock,1);
    assert.equal(JSON.stringify([u.name,u.sex,u.physique,u.traits]),identity);
    assert.ok(Math.abs(u.hp/u.maxHp-.5)<.01);
    assert.equal(restoreSave(makeSave(s,200),createInitialState()).state.units[0].role,role);
  }
});

test('a shield blocks frontal arrows but not attacks from behind or full cannon splash',()=>{
  const hit=(direction,projectile)=>{
    const u=ensurePerson({id:1,role:'ESCUDERO',x:0,facing:1,hp:155,maxHp:155});
    reactToDamage(u,40,direction,projectile);return 155-u.hp;
  };
  assert.ok(Math.abs(hit(-1,true)-15.2)<.001);assert.equal(hit(1,true),40);
  assert.ok(hit(-1,{splash:true})>30);
  const armored={hp:100,armor:.3};strikeEnemy(armored,40,1,.5);assert.equal(armored.hp,66);
});

test('a cannon telegraphs its shot, reloads and damages walls and tower integrity on impact',()=>{
  const s=world(),t=s.settlement.towers[1];s.benkos.x=t.x;
  const en={...ENEMY_CATALOG.CANONERO,id:99,type:'CANONERO',x:t.x+300,facing:-1,attackCooldown:0};
  stepCannon(en,s,.1);assert.ok(en.windupTimer>1);assert.equal(s.projectiles.length,0);
  for(let i=0;i<90;i++)stepCannon(en,s,1/60);
  assert.equal(s.projectiles.length,1);assert.equal(s.projectiles[0].explosive,true);
  stepCannon(en,s,1);assert.equal(s.projectiles.length,1);assert.ok(en.attackCooldown>5);
  const wall=s.walls[3]??s.walls.at(-1);wall.x=t.x;wall.level=3;wall.hp=200;
  let damage=0;explodeCannon(s,{x:t.x,y:WATER_LINE_Y-18,vx:-225,dmg:28},n=>damage+=n,reactToDamage);
  assert.equal(wall.hp,140);assert.equal(t.integrity,76);assert.equal(damage,28);
});

test('allied feline armor and claws are forged, collected and saved; a dead pet cannot collect gear',()=>{
  const s=world();s.benkos.x=0;
  const cat=createAnimal(200,'PANTHER',0,{bonded:true,trust:2});s.wildlife=[cat];
  assert.equal(orderEquipment(cat,'armor',s,2).success,true);assert.equal(s.coins,14);
  updateEcology(s,1);assert.equal(cat.equipment.armor,0);
  for(let i=0;i<240;i++)updateEcology(s,1/60);
  assert.equal(cat.equipment.armor,2);assert.equal(cat.maxHp,136);
  strikeWildlife(cat,50,{colonial:true});assert.equal(cat.hp,102);
  s.coins=24;orderEquipment(cat,'weapon',s,2);
  for(let i=0;i<300;i++)updateEcology(s,1/60);
  assert.equal(cat.equipment.weapon,2);
  const restored=restoreSave(makeSave(s,300),createInitialState()).state.wildlife.find(a=>a.id===cat.id);
  assert.deepEqual(restored.equipment,{weapon:2,armor:2});assert.equal(restored.maxHp,136);
  const dead=createAnimal(201,'JAGUAR',0,{bonded:true,trust:2,hp:0});
  dead.kitOrder={piece:'armor',rank:1,cost:7,remaining:0};s.wildlife=[dead];updateEcology(s,1);
  assert.equal(s.wildlife.length,0);
});
