import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { ensurePerson } from '../js/people.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { festivalProgram, heraldLines, freeForFestival, updateFestivity, joinFestivity } from '../js/festivity.js';
import { AfroColombianAudioEngine } from '../js/audio.js';
import { PLAZA } from '../js/config.js';

function world() {
  const s = createInitialState();
  s.day = 1; s.timeOfDay = .32;
  return s;
}
function person(id, role = 'CONSTRUCTOR', x = 210) {
  return ensurePerson({ id, role, x, tier: 1, hp: 90, maxHp: 90, vx: 0, facing: -1 });
}
function advance(s, seconds, controls = {}) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    updateFestivity(s, 1 / 60, controls);
    for (const u of s.units) joinFestivity(u, s, 1 / 60);
  }
}

test('music follows its three-day calendar, pregones reflect actual feats and alarms stop the gathering', () => {
  const s = world();
  assert.equal(festivalProgram(s), 'MUSIC');
  s.timeOfDay = .47; assert.equal(festivalProgram(s), 'PROCLAIM');
  s.day = 2; s.timeOfDay = .8; s.phase = 'NIGHT_DEFENSE';
  assert.equal(festivalProgram(s), 'MUSIC');
  s.day = 3; assert.equal(festivalProgram(s), 'PROCLAIM');
  s.timeOfDay = .1; assert.equal(festivalProgram(s), 'REST');
  s.fugitivesFreed = 9; s.enemiesDefeated = 13;
  assert.ok(heraldLines(s).some(line => line.includes('9 personas')));
  assert.ok(heraldLines(s).some(line => line.includes('13 enemigos')));
  s.timeOfDay = .8; s.phase = 'RED_NIGHT'; assert.equal(festivalProgram(s), 'SHELTER');
  s.phase = 'NIGHT_DEFENSE'; s.enemies = [{ x: 900, hp: 80 }];
  assert.equal(festivalProgram(s), 'SHELTER');
  s.enemies = []; s.wildlife = [{ species: 'JAGUAR', hp: 70, state: 'STALK', x: 300 }];
  assert.equal(festivalProgram(s), 'SHELTER');
  s.wildlife[0].bonded = true;
  assert.equal(festivalProgram(s), 'PROCLAIM');
});

test('idle civilians gather without consuming population or tools, and return to urgent work', () => {
  const s = world(), builder = person(80);
  s.units = [builder];
  const stock = s.toolRacks.map(rack => rack.stock);
  advance(s, 1);
  assert.equal(builder.activity, 'DANCE');
  assert.equal(s.units.length, 1);
  assert.deepEqual(s.toolRacks.map(rack => rack.stock), stock);
  s.settlement.projects.push({ targetId: 'hq' });
  updateFestivity(s, 1 / 60);
  assert.equal(joinFestivity(builder, s, 1 / 60), false);
  assert.equal(s.festivity.attendees.length, 0);
  for (const role of ['GUERRERO', 'ARQUERO', 'MINERO', 'CURANDERO', 'BRUJO']) {
    assert.equal(freeForFestival(person(90, role), s), false);
  }
  s.settlement.projects = [];
  assert.equal(freeForFestival(person(82, 'ALDEANO'), s), false);
  for (const rack of s.toolRacks) rack.stock = 0;
  assert.equal(freeForFestival(person(82, 'ALDEANO'), s), true);
  for (const change of [{ wound: 1 }, { carryingSack: true }, { escortHome: true }, { requestedRole: 'MINERO' }, { hp: 1 }]) {
    assert.equal(freeForFestival(Object.assign(person(81), change), s), false);
  }
});

test('Benkos waits, dances alongside Amara and receives an occasional kiss only as her partner', () => {
  const s = world(), amara = person(18, 'ALDEANO', 290);
  Object.assign(amara, { namedAmara: true, sex: 'F' });
  Object.assign(s.amara, { id: 18, leads: true, bond: 'partners' });
  Object.assign(s.benkos, { x: 265, vx: 0, facing: -1 });
  s.units = [amara];
  advance(s, 3.9); assert.equal(s.benkos.festivalDance, false);
  advance(s, .2); assert.equal(s.benkos.festivalDance, true);
  assert.equal(amara.activity, 'DANCE');
  advance(s, 12.2); assert.ok(s.festivity.kiss > 0);
  advance(s, 1 / 60, { busy: true });
  assert.equal(s.benkos.festivalDance, false); assert.equal(s.festivity.kiss, 0);
  s.amara.bond = 'friends'; s.festivity.kissCooldown = 0;
  advance(s, 20); assert.equal(s.benkos.festivalDance, true); assert.equal(s.festivity.kiss, 0);
  s.enemies = [{ x: 200, hp: 80 }];
  advance(s, .1); assert.equal(s.benkos.festivalDance, false);
  assert.equal(s.festivity.attendees.length, 0);
});

test('load clears ephemeral festivities and moves paid works with the new town layout', () => {
  const s = world(), builder = person(80);
  s.units = [builder];
  advance(s, 1);
  s.settlement.homes[1].x = -150;
  s.settlement.projects = [{ id: 'home_inner_2', kind: 'home', targetId: 'home_inner', x: -150,
    targetLevel: 2, duration: 5, progress: .4 }];
  const saved = makeSave(s, 200);
  saved.snapshot.state.settlement.towers[0].x = -985;
  saved.snapshot.state.settlement.projects.push({ id: 'tower_west_1', kind: 'tower', targetId: 'tower_west',
    x: -985, targetLevel: 1, duration: 5, progress: .6 });
  delete saved.snapshot.state.festivity;
  const loaded = restoreSave(saved, createInitialState()).state;
  assert.equal(loaded.festivity.mode, 'REST');
  assert.equal(loaded.units[0].activity, 'IDLE');
  assert.equal(loaded.settlement.projects[0].x, loaded.settlement.homes[1].x);
  assert.equal(loaded.settlement.projects[0].progress, .4);
  assert.equal(loaded.settlement.projects[1].x, loaded.settlement.towers[0].x);
  assert.equal(loaded.settlement.projects[1].progress, .6);
  for (const rack of loaded.toolRacks) {
    const half = (20 + rack.maxStock * 17) / 2 + 3;
    assert.ok(rack.x + half < PLAZA.left || rack.x - half > PLAZA.right);
  }
});

test('local percussion is muted by distance and never creates extra beats at high frame rates', () => {
  const audio = new AfroColombianAudioEngine();
  audio.ctx = {};
  let hits = 0;
  audio.playTamboraBass = audio.playAlegreSlap = audio.playGuacheShaker = () => hits++;
  const f = { mode: 'MUSIC', clock: 0, x: 153 };
  audio.update(1 / 60, 'DAY_EXPLORE', f, 153);
  const firstBeat = hits;
  audio.update(1 / 144, 'DAY_EXPLORE', f, 153);
  assert.equal(hits, firstBeat);
  f.clock += .2; audio.playFestival(f, 1000); assert.equal(hits, firstBeat);
  f.clock += .2; audio.playFestival(f, 153); assert.ok(hits > firstBeat);
});
