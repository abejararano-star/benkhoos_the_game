import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { ensurePerson } from '../js/people.js';
import { seedFrontier } from '../js/exploration.js';

test('v3 restores the complete world, including zero values, tier 3, damage and unlocks', () => {
  const s = createInitialState();
  Object.assign(s, { day: 7, armyTier: 3, coins: 0, treasuryCoins: 0, timeOfDay: 0, armorUnlocked: true, bossesDefeated: 1, politicalEventSeen: true });
  s.benkos.x = 0; s.benkos.spirit = 0; s.benkos.mounted = true;
  s.walls[0].hp = 23; s.farms[0].cropProgress = .73; s.haciendas[0].destroyed = true; s.trees[0].chopped = true;
  s.skills[1].unlocked = true;
  s.units = [{ id: 77, role:'GUERRERO', tier:3, x:12, hp:13, maxHp:213, carryingSack:false }];
  s.units.forEach(ensurePerson);
  let id = 80;
  seedFrontier(s, () => id++);
  const loaded = restoreSave(JSON.parse(JSON.stringify(makeSave(s, 93))), createInitialState());
  assert.equal(loaded.nextEntityId, 93);
  for (const key of ['day','armyTier','coins','treasuryCoins','timeOfDay','armorUnlocked','bossesDefeated','politicalEventSeen','walls','farms','haciendas','trees','skills','units','horses']) assert.deepEqual(loaded.state[key], s[key], key);
  assert.equal(loaded.state.benkos.spirit, 0); assert.equal(loaded.state.benkos.x, 0); assert.equal(loaded.state.benkos.mounted, true);
});
test('legacy save migration preserves zero, empty armies and damaged walls', () => {
  const loaded = restoreSave({dia_actual:2, tiempo_dia:0, monedas_bolsa:0, monedas_cofre:0, salud_benkos:0, posicion_benkos_x:0, tropas:[], construcciones:[{tipo_nodo:'MURALLA', posicion_x:-355, nivel:2, salud_actual:12}]}, createInitialState()).state;
  assert.equal(loaded.timeOfDay,0); assert.equal(loaded.coins,0); assert.equal(loaded.benkos.spirit,0); assert.equal(loaded.benkos.x,0);
  assert.deepEqual(loaded.units,[]); assert.equal(loaded.walls[0].hp,12); assert.equal(loaded.walls[0].level,2);
});
test('legacy troops keep health and establish tier 3', () => {
  const s = restoreSave({tropas:[{tipo_unidad:'LANCERO',tier:3,salud_actual:7,posicion_x:0}]},createInitialState()).state;
  assert.equal(s.armyTier,3); assert.equal(s.units[0].hp,7); assert.equal(s.units[0].role,'GUERRERO'); assert.equal(s.armorUnlocked,true);
});
test('reject future, incomplete or invalid saves without touching current state', () => {
  const defaults = createInitialState(), before = JSON.stringify(defaults);
  assert.throws(() => restoreSave({save_version:99},defaults));
  assert.throws(() => restoreSave({save_version:2},defaults));
  const save = makeSave(defaults,1); save.snapshot.state.units = [{role:'UNKNOWN'}];
  assert.throws(() => restoreSave(save,defaults));
  assert.equal(JSON.stringify(defaults),before);
});
test('damaged snapshots with missing positions cannot replace the live world', () => {
  const save=makeSave(createInitialState(),1);save.snapshot.state.walls=[{hp:2,maxHp:100}];
  assert.throws(()=>restoreSave(save,createInitialState()),/Entidades dañadas/);
});
