import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { ensurePerson } from '../js/people.js';
import { requestBuilding, advanceConstruction, workConstruction, upgradeInfo, homeRecovery } from '../js/settlement.js';
import { makeSave, restoreSave } from '../js/save-system.js';

function world() {
  const state = createInitialState();
  state.units = [ensurePerson({ id: 1, role: 'CONSTRUCTOR', tier: 1, hp: 90, maxHp: 90, x: 100 })];
  return state;
}

function fund(state, kind, id) {
  const { coins } = upgradeInfo(state, kind, id);
  for (let i = 0; i < coins; i++) assert.equal(requestBuilding(state, kind, id).success, true);
}

test('one deposit pays one coin and the finished building unlocks home improvements', () => {
  const state = world();
  state.coins = 24;
  assert.equal(requestBuilding(state, 'home', 'home_inner').success, false);
  fund(state, 'hq');
  assert.equal(state.coins, 18);
  assert.equal(state.resources.wood, 8);
  assert.equal(state.settlement.level, 1);
  workConstruction(state.units[0], state, .1);
  assert.equal(state.settlement.projects[0].progress, 0);
  assert.ok(state.units[0].x < 100);
  advanceConstruction(state, 4);
  assert.equal(state.settlement.level, 1);
  advanceConstruction(state, 1);
  assert.equal(state.settlement.level, 2);
  fund(state, 'home', 'home_inner');
  assert.equal(requestBuilding(state, 'home', 'home_inner').success, false);
  advanceConstruction(state, 6);
  assert.equal(state.settlement.homes[1].level, 2);
  assert.ok(homeRecovery(state) > 1);
});

test('all five central-house stages are reachable without builders and the last cannot spend again', () => {
  const state = world();
  state.resources = { wood: 0, stone: 0 };
  state.units = [];
  for (let next = 2; next <= 5; next++) {
    state.coins = 24;
    fund(state, 'hq');
    advanceConstruction(state, 10);
    assert.equal(state.settlement.level, next);
  }
  assert.equal(state.altarTier, 1);
  const before = state.coins;
  assert.equal(requestBuilding(state, 'hq').success, false);
  assert.equal(state.coins, before);
});

test('saved deposits can be resumed when another coin becomes available', () => {
  const state = world();
  state.coins = 1;
  assert.equal(requestBuilding(state, 'hq').success, true);
  assert.equal(requestBuilding(state, 'hq').success, false);
  const loaded = restoreSave(makeSave(state, 100), createInitialState()).state;
  assert.equal(loaded.settlement.deposits.hq, 1);
  assert.equal(loaded.coins, 0);
  loaded.coins = 5;
  for (let i = 0; i < 5; i++) assert.equal(requestBuilding(loaded, 'hq').success, true);
  assert.equal(loaded.settlement.projects[0].targetLevel, 2);
});

test('cargo, materials and unfinished work survive saves; old worlds gain stations', () => {
  const state = world();
  fund(state, 'hq');
  advanceConstruction(state, 5);
  fund(state, 'home', 'home_inner');
  state.units[0].cargoWood = 5;
  state.settlement.projects[0].progress = .43;
  const loaded = restoreSave(makeSave(state, 100), createInitialState()).state;
  for (const key of ['resources', 'settlement', 'units']) assert.deepEqual(loaded[key], state[key]);
  const old = makeSave(state, 100);
  delete old.snapshot.state.resources;
  delete old.snapshot.state.settlement;
  old.snapshot.state.toolRacks = old.snapshot.state.toolRacks.filter(rack => rack.role !== 'CONSTRUCTOR');
  const migrated = restoreSave(old, createInitialState()).state;
  assert.equal(migrated.settlement.level, 1);
  assert.equal(migrated.resources.wood, 8);
  assert.ok(migrated.toolRacks.some(rack => rack.role === 'CONSTRUCTOR'));
});

test('legacy house and barracks merge at the highest finished level and keep an already paid upgrade', () => {
  const state = world();
  state.coins = 2;
  state.settlement.level = 2;
  state.settlement.barracks = { id: 'barracks', x: 245, level: 3 };
  state.settlement.projects.push({ id: 'barracks_4', kind: 'barracks', targetId: 'barracks', x: 245, targetLevel: 4, progress: .42, duration: 10 });
  const loaded = restoreSave(makeSave(state, 100), createInitialState()).state;
  assert.equal(loaded.settlement.level, 3);
  assert.equal(loaded.settlement.barracks, undefined);
  assert.equal(loaded.settlement.projects[0].x, 0);
  assert.equal(loaded.settlement.projects[0].progress, .42);
  advanceConstruction(loaded, 8);
  assert.equal(loaded.settlement.level, 4);
  assert.equal(loaded.coins, 2);
});

test('invalid unfinished projects cannot crash the live simulation on load', () => {
  for (const mutate of [
    state => state.settlement.projects.push({ kind: 'home', targetId: 'missing', x: 0, targetLevel: 2, progress: 0, duration: 10 }),
    state => state.resources = [],
    state => state.settlement.homes[1].id = state.settlement.homes[0].id
  ]) {
    const state = world();
    mutate(state);
    assert.throws(() => restoreSave(makeSave(state, 100), createInitialState()));
  }
});
