import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { conquerHacienda, haciendaActive, updateHaciendas } from '../js/haciendas.js';
import { makeSave, restoreSave } from '../js/save-system.js';

test('haciendas release their own captives, then refill off screen without rolling back conquest', () => {
  const state = createInitialState();
  const spawn = x => {
    const unit = { id: state.units.length + 1, x, role: 'FUGITIVO', hp: 80, maxHp: 80 };
    state.units.push(unit);
    return unit;
  };
  updateHaciendas(state, spawn);
  updateHaciendas(state, spawn);
  assert.equal(state.units.length, 6);
  const [west] = state.haciendas;
  assert.equal(conquerHacienda(state, west).captives.length, 3);
  assert.equal(state.fugitivesFreed, 3);
  assert.equal(haciendaActive(west), false);
  state.day += 2;
  state.benkos.x = state.cameraX = west.x;
  updateHaciendas(state, spawn);
  assert.equal(haciendaActive(west), false);
  state.benkos.x = state.cameraX = 0;
  updateHaciendas(state, spawn);
  assert.equal(haciendaActive(west), true);
  assert.equal(west.destroyed, true);
  const loaded = restoreSave(makeSave(state, 100), createInitialState()).state;
  assert.equal(haciendaActive(loaded.haciendas[0]), true);
  assert.equal(conquerHacienda(loaded, loaded.haciendas[0]).first, false);
  assert.equal(loaded.fugitivesFreed, 6);
});
