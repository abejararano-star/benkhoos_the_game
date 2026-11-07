import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { ensurePerson } from '../js/people.js';
import { updateCommunity, joinEncounter, relationshipsFor } from '../js/community.js';

function neighbors(first, second) {
  const state = createInitialState();
  state.units = [first, second].map((temperament, index) => {
    const unit = ensurePerson({ id: index + 1, role: 'ALDEANO', tier: 1, x: index * 28, hp: 90, maxHp: 90 });
    unit.temperament = temperament;
    return unit;
  });
  return state;
}

test('friendly neighbors form a lasting friendship and laugh together', () => {
  const state = neighbors('CARING', 'CALM');
  updateCommunity(state, 6);
  assert.equal(state.community.encounter.kind, 'CHAT');
  updateCommunity(state, 3.2);
  updateCommunity(state, 1 / 60);
  updateCommunity(state, 27);
  assert.equal(state.community.encounter.kind, 'LAUGH');
  for (const unit of state.units) assert.ok(joinEncounter(unit, state, 1 / 60));
  const save = makeSave(state, 3);
  const { state: loaded } = restoreSave(save, createInitialState());
  assert.equal(loaded.community.encounter, null);
  assert.equal(loaded.units[0].socialPose, undefined);
  assert.equal(relationshipsFor(loaded.units[0], loaded)[0].score, 3);
  assert.equal(relationshipsFor(loaded.units[1], loaded)[0].name, loaded.units[0].name);
});

test('a scuffle only costs its participants a little health once per day', () => {
  const state = neighbors('RESTLESS', 'CAUTIOUS');
  const bystander = ensurePerson({ id: 3, role: 'MINERO', tier: 1, x: 110, hp: 90, maxHp: 90 });
  state.units.push(bystander);
  const before = state.units.map(unit => unit.hp);
  updateCommunity(state, 6);
  assert.equal(state.community.encounter.kind, 'SCUFFLE');
  updateCommunity(state, 1.16);
  assert.ok(state.units.slice(0, 2).every((unit, i) => before[i] - unit.hp > 0 && before[i] - unit.hp <= 3));
  assert.equal(bystander.hp, before[2]);
  const after = state.units.map(unit => unit.hp);
  updateCommunity(state, .5);
  assert.deepEqual(state.units.map(unit => unit.hp), after);
  updateCommunity(state, .7);
  updateCommunity(state, 1 / 60);
  updateCommunity(state, 30);
  assert.equal(state.community.encounter.kind, 'CHAT');
});

test('nearby danger interrupts a scuffle before anyone loses health', () => {
  const state = neighbors('RESTLESS', 'BRAVE');
  const before = state.units.map(unit => unit.hp);
  updateCommunity(state, 6);
  assert.equal(state.community.encounter.kind, 'SCUFFLE');
  state.enemies.push({ x: 40, hp: 25 });
  updateCommunity(state, 1.2);
  assert.equal(state.community.encounter, null);
  assert.deepEqual(state.units.map(unit => unit.hp), before);
});
