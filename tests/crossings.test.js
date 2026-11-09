import assert from 'node:assert/strict';
import test from 'node:test';
import { CROSSINGS, crossingFeet, stepCrossings } from '../js/crossings.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { createInitialState } from '../js/world-state.js';

test('a mounted rider weighs more on the rope deck, and the fixed bridge stays level', () => {
  const [fixed, rope] = CROSSINGS;
  const measure = (site, mounted) => {
    const state = createInitialState();
    Object.assign(state.benkos, { x: site.x, mounted });
    for (let step = 0; step < 180; step++) stepCrossings(state, 1 / 60, {});
    return crossingFeet(state, state.benkos);
  };
  assert.ok(measure(rope, true) > measure(rope, false));
  assert.equal(measure(fixed, true), measure(fixed, false));
});

test('a cut bridge and a villager falling into the current survive save and load', () => {
  const state = createInitialState();
  const rope = CROSSINGS[1];
  state.crossings[rope.id].cut = true;
  state.units.push({ id: 30, role: 'ALDEANO', hp: 80, maxHp: 80, x: rope.x, vx: 12 });
  stepCrossings(state, 1 / 60, {});
  const loaded = restoreSave(makeSave(state, 50), createInitialState()).state;
  assert.equal(loaded.crossings[rope.id].cut, true);
  assert.equal(loaded.units[0].waterFall.site, rope.id);
  let splashes = 0;
  const splash = () => splashes++;
  for (let step = 0; step < 130; step++) stepCrossings(loaded, 1 / 60, { splash });
  assert.equal(loaded.units[0].hp, 0);
  assert.equal(splashes, 1);
});
