import test from 'node:test';
import assert from 'node:assert/strict';
import { createExercise, stepExercise } from '../js/prologue.js';

const advance = (stage, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) stepExercise(stage, 1 / 60, controls);
};

test('the first two nights teach movement, attacks and dodging before the third is lost', () => {
  for (const night of [1, 2]) {
    const stage = createExercise(night);
    advance(stage, .5, { right: true });
    assert.ok(stage.moves >= 12);
    if (night === 2) {
      advance(stage, .25, { dodge: true });
      assert.equal(stage.dodges, 1);
    }
    for (let i = 0; i < 25 && !stage.finished; i++) advance(stage, .45, { attack: true });
    assert.equal(stage.finished, true);
    assert.ok(stage.attacks.every(enemy => enemy.hp <= 0));
  }
  const stage = createExercise(3);
  for (const enemy of stage.attacks) enemy.hp = 0;
  advance(stage, 18);
  assert.equal(stage.finished, true);
  assert.ok(stage.ending >= 1.65);
  assert.ok(stage.attacks.some(enemy => enemy.hp > 0 && enemy.x < stage.hero.x));
  assert.ok(stage.attacks.some(enemy => enemy.hp > 0 && enemy.x > stage.hero.x));
});
