import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/world-state.js';
import {createAnimal,seedEcology,interactEcology,updateEcology,isHuntable,SPECIES} from '../js/ecology.js';
import {makeSave,restoreSave} from '../js/save-system.js';
import {seedFrontier} from '../js/exploration.js';
function world(species){const s=createInitialState();s.benkos.x=0;if(species)s.wildlife=[createAnimal(1,species,10)];return s;}

test('migration seeds seven species without duplicate animals or identifiers',()=>{
  const s=world();s.wildlife=[createAnimal(1,'CAPYBARA',-560)];let id=2;seedEcology(s,()=>id++);
  const count=s.wildlife.length;seedEcology(s,()=>id++);assert.equal(s.wildlife.length,count);
  assert.equal(new Set(s.wildlife.map(a=>a.id)).size,count);assert.equal(new Set(s.wildlife.map(a=>a.species)).size,Object.keys(SPECIES).filter(key=>key!=='SNAKE').length);
});
test('feeding spends food once, builds trust, and protects a familiar animal from hunters',()=>{
  const s=world('CAPYBARA');interactEcology(s);assert.equal(s.resources.food,4);assert.equal(s.wildlife[0].trust,1);assert.equal(isHuntable(s.wildlife[0]),false);
  interactEcology(s);assert.equal(s.resources.food,4);updateEcology(s,16);interactEcology(s);assert.equal(s.wildlife[0].trust,2);assert.equal(s.resources.food,3);
});
test('rescuing a turtle grants its reward only once',()=>{
  const s=world('TURTLE');s.wildlife[0].trapped=true;interactEcology(s);assert.equal(s.score,25);assert.equal(s.wildlife[0].trapped,false);
  interactEcology(s);assert.equal(s.score,25);
});
test('monkey gifts are limited to once a day and macaws report the incoming route',()=>{
  const s=world('MONKEY');interactEcology(s);assert.equal(s.coins,17);updateEcology(s,16);interactEcology(s);assert.equal(s.coins,17);
  const bird=world('MACAW');interactEcology(bird);bird.campaign.orders=[{side:1}];const food=bird.resources.food;
  assert.match(interactEcology(bird).message,/oriente/);assert.equal(bird.resources.food,food);
});
test('deer flee from running people, while feeding calms an aggressive jaguar',()=>{
  const deer=world('DEER');deer.benkos.vx=155;updateEcology(deer,.1);assert.equal(deer.wildlife[0].state,'FLEE');assert.ok(deer.wildlife[0].vx>0);
  const cat=world('JAGUAR');let hits=0;updateEcology(cat,.1,{damagePlayer:()=>hits++});assert.equal(hits,1);
  interactEcology(cat);assert.equal(cat.resources.food,3);updateEcology(cat,.5,{damagePlayer:()=>hits++});assert.equal(hits,1);
});
test('drinking has a cooldown and cannot reduce or mint spirit',()=>{
  const s=world();s.benkos.x=-850;s.benkos.spirit=60;interactEcology(s);assert.equal(s.benkos.spirit,78);
  interactEcology(s);assert.equal(s.benkos.spirit,78);updateEcology(s,16);interactEcology(s);assert.equal(s.benkos.spirit,96);
});
test('fishing requires time, is cancelled by movement, and consumes a replenishing fish stock',()=>{
  const s=world();s.benkos.x=-850;const creek=s.ecology.streams[0],initial=s.resources.food;
  interactEcology(s,{fish:true});updateEcology(s,.8);assert.equal(s.resources.food,initial);s.benkos.x+=12;updateEcology(s,.1);assert.equal(s.benkos.interaction,null);assert.equal(creek.fishStock,3);
  s.benkos.x=-850;for(let i=0;i<3;i++){interactEcology(s,{fish:true});updateEcology(s,1.7);}
  assert.equal(s.resources.food,initial+3);assert.equal(creek.fishStock,0);interactEcology(s,{fish:true});assert.equal(s.benkos.interaction,null);
  updateEcology(s,28);assert.ok(creek.fishStock>0);
});
test('forest fruit can only be collected once per stream each day',()=>{
  const s=world();s.benkos.x=-740;interactEcology(s);assert.equal(s.resources.food,6);interactEcology(s);assert.equal(s.resources.food,6);
  s.day++;interactEcology(s);assert.equal(s.resources.food,7);
});

test('jaguars strike colonial enemies and culebras warn before biting or retreat from light', () => {
  const jaguar = world('JAGUAR');
  jaguar.wildlife[0].trust = 2;
  jaguar.enemies.push({x: 29, hp: 40});
  let bites = 0;
  updateEcology(jaguar, .1, {damagePlayer: () => bites++});
  assert.equal(jaguar.enemies[0].hp, 16);
  assert.equal(bites, 0);
  const snake = world('SNAKE');
  updateEcology(snake, .3, {damagePlayer: () => bites++});
  assert.equal(snake.wildlife[0].state, 'WARN');
  assert.equal(bites, 0);
  updateEcology(snake, .3, {damagePlayer: () => bites++});
  assert.equal(bites, 1);
  const lit = world('SNAKE');
  updateEcology(lit, .6, {torchLit: true, damagePlayer: () => bites++});
  assert.equal(lit.wildlife[0].state, 'FLEE');
  assert.equal(bites, 1);
});
test('animals, trust, food and water stocks survive saves; old attacks do not deal damage twice on migration',()=>{
  const s=world('TURTLE');s.ecology.seeded=true;s.wildlife[0].trust=2;s.ecology.streams[0].fishStock=1;
  let id=80;seedFrontier(s,()=>id++);
  const restored=restoreSave(makeSave(s,100),createInitialState()).state;
  assert.deepEqual(restored.wildlife,s.wildlife);assert.deepEqual(restored.ecology,s.ecology);assert.equal(restored.resources.food,5);
  const old=makeSave(s,100);delete old.snapshot.state.ecology;delete old.snapshot.state.resources.food;delete old.snapshot.state.benkos.attackDuration;old.snapshot.state.benkos.attackTimer=.2;
  const migrated=restoreSave(old,createInitialState()).state;assert.equal(migrated.benkos.attackTimer,0);assert.equal(migrated.resources.food,5);assert.ok(migrated.wildlife.some(a=>a.species==='MONKEY'));
});
