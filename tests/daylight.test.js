import assert from 'node:assert/strict';
import test from 'node:test';
import { daylightAt, NIGHT_START } from '../js/daylight.js';

test('night defense and the day rollover do not jump between lighting palettes', () => {
  for (const [before, after] of [
    [daylightAt(NIGHT_START - .0001), daylightAt(NIGHT_START + .0001, true)],
    [daylightAt(.9999, true), daylightAt(0)],
  ]) {
    assert.ok(Math.abs(before.shadow - after.shadow) < .01);
    for (const key of ['zenith', 'horizon', 'cloudLight', 'cloudShade']) {
      before[key].forEach((channel, i) => assert.ok(Math.abs(channel - after[key][i]) < 1));
    }
  }
  assert.ok(daylightAt(.61).shadow > daylightAt(.39).shadow);
  assert.ok(daylightAt(.80, true).red > .95);
});
