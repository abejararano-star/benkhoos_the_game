import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { ALTAR_X, discoverAltar, seedFrontier, torchIsLit } from '../js/exploration.js';
import { recoverCoins } from '../js/coins.js';
import { WATER_LINE_Y } from '../js/config.js';

test('the remote sanctuary is discovered once, and older offerings are refunded on relocation', () => {
  const state = createInitialState();
  assert.equal(discoverAltar(state), false);
  state.benkos.x = ALTAR_X + 25;
  assert.equal(discoverAltar(state), true);
  assert.equal(discoverAltar(state), false);
  state.altarTier = 3;
  state.altarSlotsFilled = 3;
  const save = makeSave(state, 100);
  delete save.snapshot.state.exploration;
  const loaded = restoreSave(save, createInitialState());
  assert.equal(loaded.state.altarTier, 3);
  assert.equal(loaded.state.exploration.altarFound, true);
  assert.equal(loaded.state.altarSlotsFilled, 0);
  assert.equal(loaded.state.treasuryCoins, state.treasuryCoins + 3);
  assert.equal(loaded.state.ecology.streams.length, 7);
  const count = loaded.state.wildlife.length;
  seedFrontier(loaded.state, () => { throw new Error('Duplicate spawn'); });
  assert.equal(loaded.state.wildlife.length, count);
});

test('safe civilians carry spilled coins to the chest without collecting ransom money', () => {
  const state = createInitialState();
  const worker = { id: 8, role: 'MINERO', x: 100, hp: 80, fear: 0 };
  state.units = [worker];
  state.droppedCoins = [
    { id: 10, x: 96, y: WATER_LINE_Y, pickupDelay: 0 },
    { id: 11, x: 106, y: WATER_LINE_Y, pickupDelay: 0, recoverable: true },
    { id: 12, x: 106, y: WATER_LINE_Y, pickupDelay: 0, recoverable: true, fallsInRiver: true }
  ];
  state.enemies = [{ x: 130, hp: 60 }];
  assert.equal(recoverCoins(worker, state, 1 / 60), false);
  state.enemies = [];
  recoverCoins(worker, state, 1 / 60);
  assert.equal(worker.recoveredCoins, 1);
  assert.equal(state.treasuryCoins, 12);
  for (let i = 0; i < 90; i++) recoverCoins(worker, state, 1 / 60);
  assert.equal(state.treasuryCoins, 13);
  assert.equal(worker.recoveredCoins, 0);
  assert.deepEqual(state.droppedCoins.map(coin => coin.id), [10, 12]);
});

test('the torch lights automatically at night and supports a manual override', () => {
  const state = createInitialState();
  assert.equal(torchIsLit(state), false);
  state.phase = 'NIGHT_DEFENSE';
  assert.equal(torchIsLit(state), true);
  state.benkos.torchOff = true;
  assert.equal(torchIsLit(state), false);
  state.benkos.torchManual = true;
  assert.equal(torchIsLit(state), true);
});
