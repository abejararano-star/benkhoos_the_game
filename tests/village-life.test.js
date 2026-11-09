import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { ensurePerson, personMaxHp, proficiency } from '../js/people.js';
import { orderEquipment, collectEquipment, armyRequirement } from '../js/equipment.js';
import { updateCommunity } from '../js/community.js';
import { recordLoss, updateGrief, takeLeisure } from '../js/daily-life.js';
import { ensureCrop, advanceCrops, GROW_SECONDS, needsCropCare, tendCrop } from '../js/crops.js';

const person = (id, role, x) => ensurePerson({ id, role, tier: 1, x, hp: 80, maxHp: 80 });

test('a purchased weapon survives reload and only changes when its owner reaches the armory', () => {
  const state = createInitialState();
  const unit = person(8, 'ESPADACHIN', 100);
  state.units = [unit];
  assert.match(armyRequirement(state), /Casa del Cuartel/);
  assert.equal(orderEquipment(unit, 'weapon', state).success, false);
  state.settlement.level = 2;
  assert.equal(armyRequirement(state), '');
  state.armyTier = 2;
  const originalHealth = unit.maxHp;
  assert.equal(orderEquipment(unit, 'weapon', state).success, true);
  assert.equal(state.coins, 12);
  assert.deepEqual(unit.equipment, { weapon: 1, armor: 1 });
  assert.equal(orderEquipment(unit, 'armor', state).success, false);
  const loaded = restoreSave(makeSave(state, 100), createInitialState()).state;
  const soldier = loaded.units[0];
  assert.equal(soldier.kitOrder.remaining, 3);
  soldier.kitOrder.remaining = 0;
  loaded.enemies = [{ hp: 40, x: 180 }];
  assert.equal(collectEquipment(soldier, loaded, 1 / 60, personMaxHp), false);
  loaded.enemies = [];
  for (let frame = 0; frame < 240; frame++) collectEquipment(soldier, loaded, 1 / 60, personMaxHp);
  assert.deepEqual(soldier.equipment, { weapon: 2, armor: 1 });
  assert.equal(soldier.maxHp, originalHealth);
  assert.equal(loaded.coins, 12);
  assert.ok(orderEquipment(soldier, 'armor', loaded).success);
  soldier.kitOrder.remaining = 0;
  collectEquipment(soldier, loaded, 1 / 60, personMaxHp);
  assert.deepEqual(soldier.equipment, { weapon: 2, armor: 2 });
  assert.ok(soldier.maxHp > originalHealth);
});

test('a pair can form a bond and a survivor grieves, then recovers their proficiency', () => {
  const state = createInitialState();
  const a = person(1, 'AGRICULTOR', 0);
  const b = person(2, 'MINERO', 28);
  a.gender = 'man'; b.gender = 'woman'; a.traits.charm = b.traits.charm = 4;
  state.units = [a, b];
  state.community.relations = [{ key: '1:2', people: [1, 2], score: 4, meetings: 3, lastAt: -30 }];
  updateCommunity(state, 6);
  assert.equal(state.community.encounter.kind, 'ROMANCE');
  const before = proficiency(a);
  b.hp = 0;
  recordLoss(b, state);
  state.units.pop();
  assert.equal(a.grief.name, b.name);
  assert.ok(proficiency(a) < before);
  const loaded = restoreSave(makeSave(state, 90), createInitialState()).state;
  assert.equal(loaded.community.memorial[0].name, b.name);
  updateGrief(loaded.units[0], 140);
  assert.equal(proficiency(loaded.units[0]), before);
});

test('planting needs labor, growth needs daylight and a ripe crop can only be harvested once', () => {
  const state = createInitialState();
  const farm = state.farms[0];
  farm.cropProgress = 0;
  ensureCrop(farm);
  advanceCrops(state, GROW_SECONDS);
  assert.equal(farm.stage, 'PLANT');
  assert.equal(tendCrop(farm, state, 3, 1), null);
  assert.equal(farm.stage, 'GROW');
  state.phase = 'NIGHT_DEFENSE';
  advanceCrops(state, 90);
  assert.equal(farm.cropProgress, 0);
  state.phase = 'DAY_EXPLORE';
  for (const checkpoint of [.30, .65]) {
    advanceCrops(state, GROW_SECONDS);
    assert.equal(farm.cropProgress, checkpoint);
    assert.equal(needsCropCare(farm), true);
    advanceCrops(state, GROW_SECONDS);
    assert.equal(farm.cropProgress, checkpoint);
    assert.equal(tendCrop(farm, state, 2.4, 1), null);
    assert.equal(needsCropCare(farm), false);
  }
  advanceCrops(state, GROW_SECONDS * .18);
  assert.equal(farm.stage, 'GROW');
  advanceCrops(state, GROW_SECONDS * .18);
  assert.deepEqual(tendCrop(farm, state, 3.5, 1), { food: 5, coins: 2 });
  assert.equal(tendCrop(farm, state, 10, 1), null);
  state.day++;
  advanceCrops(state, 1);
  assert.equal(farm.stage, 'PLANT');
});

test('civilians can rest while sentries and hunters keep their duty', () => {
  const state = createInitialState();
  state.community.time = 20;
  for (const role of ['GUERRERO', 'ARQUERO', 'CAZADOR']) {
    const unit = person(2, role, 0);
    unit.nextLeisure = 0;
    assert.equal(takeLeisure(unit, state, 1 / 60), false);
  }
  const worker = person(2, 'AGRICULTOR', 550);
  worker.nextLeisure = 0;
  assert.ok(takeLeisure(worker, state, 1 / 60));
  assert.equal(worker.activity, 'LEAVE');
  state.enemies.push({ hp: 40, x: 535 });
  assert.equal(takeLeisure(worker, state, 1 / 60), false);
  assert.equal(worker.leisure, null);
});

test('a civilian gathers water at the bridge and brings it back to camp', () => {
  const state = createInitialState();
  const bridge = state.ecology.streams.find(stream => stream.bridge);
  const worker = person(4, 'AGRICULTOR', bridge.x - 25);
  worker.nextLeisure = 0;
  const morale = state.morale;
  takeLeisure(worker, state, 2);
  assert.equal(worker.activity, 'FETCH_WATER');
  assert.equal(state.morale, morale);
  takeLeisure(worker, state, .1);
  assert.equal(worker.activity, 'CARRY_WATER');
  assert.ok(worker.x < bridge.x - 25);
  worker.x = 78;
  takeLeisure(worker, state, 1);
  takeLeisure(worker, state, .1);
  assert.equal(state.morale, morale + 1);
  assert.equal(worker.leisure, null);
});
