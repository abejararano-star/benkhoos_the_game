import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../js/world-state.js';
import {ANIMAL_MATURITY,createAnimal,seedEcology,interactEcology,updateEcology,isHuntable,SPECIES} from '../js/ecology.js';
import {makeSave,restoreSave} from '../js/save-system.js';
import {seedFrontier} from '../js/exploration.js';
import {jaguarPose} from '../js/jaguar.js';
import {advanceAllyAction,strikeWildlife,threatensMilitia} from '../js/combat.js';
function world(species){const s=createInitialState();s.benkos.x=0;if(species)s.wildlife=[createAnimal(1,species,10)];return s;}
function step(state, frames, hooks) {
  for (let frame = 0; frame < frames; frame++) updateEcology(state, 1 / 60, hooks);
}

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
test('a turtle stays dry on the village bridge and enters water in an open creek', () => {
  const state = world('TURTLE');
  const turtle = state.wildlife[0];
  const bridge = state.ecology.streams.find(stream => stream.bridge);
  Object.assign(turtle, { x: bridge.x, y: 271, inWater: true, trapped: true });
  updateEcology(state, .1);
  assert.equal(turtle.inWater, false);
  assert.equal(turtle.y, state.benkos.y);
  turtle.x = state.ecology.streams.find(stream => !stream.bridge).x;
  updateEcology(state, .1);
  assert.equal(turtle.inWater, true);
  assert.equal(turtle.y, state.benkos.y + 3);
  let id = 200;
  seedFrontier(state, () => id++);
  turtle.x = state.ecology.streams.find(stream => stream.id === 'creek_mangrove').x;
  updateEcology(state, .1);
  assert.equal(turtle.inWater, false);
  assert.equal(turtle.y, state.benkos.y);
});
test('monkey gifts are limited to once a day and macaws report the incoming route',()=>{
  const s=world('MONKEY');interactEcology(s);assert.equal(s.coins,17);updateEcology(s,16);interactEcology(s);assert.equal(s.coins,17);
  const bird=world('MACAW');interactEcology(bird);bird.campaign.orders=[{side:1}];const food=bird.resources.food;
  assert.match(interactEcology(bird).message,/oriente/);assert.equal(bird.resources.food,food);
});
test('deer flee from running people, while feeding calms an aggressive jaguar',()=>{
  const deer=world('DEER');deer.benkos.vx=155;updateEcology(deer,.1);assert.equal(deer.wildlife[0].state,'FLEE');assert.ok(deer.wildlife[0].vx>0);
  const cat = world('JAGUAR');
  let hits = 0;
  const hooks = { damagePlayer: () => hits++ };
  step(cat, 3, hooks);
  assert.equal(cat.wildlife[0].state, 'SWIPE');
  assert.equal(hits, 0);
  interactEcology(cat);
  assert.equal(cat.resources.food, 3);
  step(cat, 140, hooks);
  assert.equal(hits, 0);
});
test('drinking has a cooldown and cannot reduce or mint spirit',()=>{
  const s=world();s.benkos.x=s.ecology.streams[0].x;s.benkos.spirit=60;interactEcology(s);assert.equal(s.benkos.spirit,78);
  interactEcology(s);assert.equal(s.benkos.spirit,78);updateEcology(s,16);interactEcology(s);assert.equal(s.benkos.spirit,96);
});
test('fishing requires time, is cancelled by movement, and consumes a replenishing fish stock',()=>{
  const s=world();s.benkos.x=s.ecology.streams[0].x;const creek=s.ecology.streams[0],initial=s.resources.food;
  interactEcology(s,{fish:true});updateEcology(s,.8);assert.equal(s.resources.food,initial);s.benkos.x+=12;updateEcology(s,.1);assert.equal(s.benkos.interaction,null);assert.equal(creek.fishStock,3);
  s.benkos.x=s.ecology.streams[0].x;for(let i=0;i<3;i++){interactEcology(s,{fish:true});updateEcology(s,1.7);}
  assert.equal(s.resources.food,initial+3);assert.equal(creek.fishStock,0);interactEcology(s,{fish:true});assert.equal(s.benkos.interaction,null);
  updateEcology(s,28);assert.ok(creek.fishStock>0);
});
test('forest fruit can only be collected once per stream each day',()=>{
  const s=world();s.benkos.x=s.ecology.streams[0].x+110;interactEcology(s);assert.equal(s.resources.food,6);interactEcology(s);assert.equal(s.resources.food,6);
  s.day++;interactEcology(s);assert.equal(s.resources.food,7);
});

test('jaguars strike colonial enemies and culebras warn before biting or retreat from light', () => {
  const jaguar = world('JAGUAR');
  jaguar.wildlife[0].trust = 2;
  jaguar.enemies.push({id: 20, x: 29, hp: 40});
  let bites = 0;
  step(jaguar, 28, {damagePlayer: () => bites++});
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
test('a jaguar telegraphs its pounce, moves through the air and can be dodged', () => {
  for (const dodge of [false, true]) {
    const state = world('JAGUAR');
    const jaguar = state.wildlife[0];
    state.benkos.x = 62;
    let hits = 0;
    const hooks = { damagePlayer: () => hits++ };
    step(state, 12, hooks);
    assert.equal(jaguar.state, 'CROUCH');
    assert.equal(hits, 0);
    step(state, 12, hooks);
    assert.equal(jaguar.state, 'POUNCE');
    assert.ok(jaguar.x > 10 && jaguarPose(jaguar).lift > 0);
    if (dodge) state.benkos.x = -50;
    step(state, 18, hooks);
    assert.equal(jaguar.state, 'RECOVER');
    assert.equal(jaguarPose(jaguar).lift, 0);
    assert.equal(hits, dodge ? 0 : 1);
  }
});
test('a jaguar retreats from a crowd, injury or a torch', () => {
  for (const danger of ['crowd', 'injury', 'torch']) {
    const state = world('JAGUAR');
    const jaguar = state.wildlife[0];
    state.benkos.x = 38;
    if (danger === 'injury') jaguar.hp = 20;
    if (danger === 'crowd') state.enemies = [50, 60, 65].map((x, id) => ({ x, id, hp: 40 }));
    let hits = 0;
    step(state, 30, { torchLit: danger === 'torch', damagePlayer: () => hits++ });
    assert.equal(jaguar.state, 'FLEE');
    assert.ok(jaguar.x < -30);
    assert.equal(hits, 0);
  }
});
test('saving a jaguar mid-pounce preserves whether it already landed its hit', () => {
  const state = world('JAGUAR');
  state.benkos.x = 62;
  let hits = 0;
  const hooks = { damagePlayer: () => hits++ };
  step(state, 33, hooks);
  assert.equal(state.wildlife[0].state, 'POUNCE');
  assert.equal(hits, 1);
  const {state: restored} = restoreSave(makeSave(state, 100), createInitialState());
  step(restored, 12, hooks);
  assert.equal(restored.wildlife[0].state, 'RECOVER');
  assert.equal(hits, 1);
});
test('a wild jaguar eats prey without paying a hunting reward to the player', () => {
  const state = world('JAGUAR');
  state.benkos.x = 1000;
  state.ecology.time = 32;
  state.wildlife.push(createAnimal(20, 'CAPYBARA', 20, { hp: 15 }));
  let drops = 0;
  step(state, 43, { dropCoin: () => drops++ });
  const jaguar = state.wildlife[0];
  assert.equal(jaguar.state, 'EAT');
  assert.ok(jaguar.lastMeal > 32);
  assert.equal(state.wildlife.length, 1);
  assert.equal(state.resources.food, 5);
  assert.equal(drops, 0);
});
test('a wild pair can have a juvenile that persists and grows up', () => {
  const state = world();
  state.benkos.x = 1000;
  state.ecology.time = 32.9;
  state.wildlife = [createAnimal(7, 'DEER', -550, { sex: 'F' }), createAnimal(8, 'DEER', -532, { sex: 'M' })];
  let id = 100;
  step(state, 30, { nextId: () => id++ });
  assert.equal(state.wildlife.length, 3);
  const fawn = state.wildlife[2];
  assert.equal(fawn.motherId, 7);
  assert.ok(fawn.maxHp < SPECIES.DEER.hp);
  const {state: saved} = restoreSave(makeSave(state, id), createInitialState());
  const restored = saved.wildlife.find(animal => animal.id === fawn.id);
  assert.equal(restored.bornAt, fawn.bornAt);
  assert.equal(restored.sex, fawn.sex);
  updateEcology(saved, ANIMAL_MATURITY);
  assert.equal(restored.bornAt, undefined);
  assert.equal(restored.maxHp, SPECIES.DEER.hp);
});
test('the altar can bond one fed jaguar which follows Benkos beyond ordinary trust range', () => {
  const state = world('JAGUAR');
  const jaguar = state.wildlife[0];
  interactEcology(state);
  state.benkos.jaguarTimer = 10;
  assert.equal(interactEcology(state).message.includes('seguirá'), false);
  state.skills.find(skill => skill.id === 'jaguar').unlocked = true;
  assert.match(interactEcology(state).message, /seguirá/);
  assert.equal(jaguar.bonded, true);
  const other = createAnimal(12, 'JAGUAR', 2, { trust: 1 });
  state.wildlife.push(other);
  assert.match(interactEcology(state).message, /un solo jaguar/);
  state.benkos.x = 620;
  state.benkos.vx = 180;
  step(state, 10);
  assert.equal(jaguar.state, 'FOLLOW');
  assert.ok(jaguar.vx > state.benkos.vx);
  assert.equal(threatensMilitia(jaguar), false);
  assert.equal(threatensMilitia(jaguar, true), true);
});
test('allied melee, colonial damage and hunter nets work on a dangerous animal', () => {
  const state = world('JAGUAR');
  const jaguar = state.wildlife[0];
  jaguar.state = 'SWIPE';
  const ally = { x: 0, hp: 50, pendingStrike: { targetId: jaguar.id, wildlife: true, reach: 25, facing: 1, damage: 12, eta: .1 } };
  advanceAllyAction(ally, state, .11);
  assert.equal(jaguar.hp, 83);
  assert.equal(strikeWildlife(jaguar, 13, { colonial: true }), true);
  assert.equal(jaguar.hp, 70);
  assert.equal(strikeWildlife(jaguar, 4, { net: true }), true);
  assert.equal(jaguar.nettedTimer, 4);
  assert.equal(threatensMilitia(jaguar, true), false);
});
test('animals, trust, food and water stocks survive saves; old attacks do not deal damage twice on migration',()=>{
  const s=world('TURTLE');s.ecology.seeded=true;s.wildlife[0].trust=2;s.ecology.streams[0].fishStock=1;
  let id=80;seedFrontier(s,()=>id++);
  const restored=restoreSave(makeSave(s,100),createInitialState()).state;
  assert.deepEqual(restored.wildlife,s.wildlife);assert.deepEqual(restored.ecology,s.ecology);assert.equal(restored.resources.food,5);
  const old=makeSave(s,100);delete old.snapshot.state.ecology;delete old.snapshot.state.resources.food;delete old.snapshot.state.benkos.attackDuration;old.snapshot.state.benkos.attackTimer=.2;
  const migrated=restoreSave(old,createInitialState()).state;assert.equal(migrated.benkos.attackTimer,0);assert.equal(migrated.resources.food,5);assert.ok(migrated.wildlife.some(a=>a.species==='MONKEY'));
});
