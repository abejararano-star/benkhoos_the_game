import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ScenarioSoundtrack, SOUNDTRACK, soundtrackScene } from '../js/soundtrack.js';
import { createInitialState } from '../js/world-state.js';
import { CAMP_EDGE } from '../js/config.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function context() {
  const ctx = { currentTime: 0, destination: {}, sources: [] };
  const node = () => ({ connect() {}, disconnect() {}, gain: { value: 1,
    cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; },
    linearRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; } } });
  ctx.createGain = node;
  ctx.createBufferSource = () => {
    const source = { ...node(), buffer: null, loop: false,
      start(when, offset) { this.offset = offset; ctx.sources.push(this); },
      stop() { assert.equal(this.stopped, undefined); this.stopped = true; } };
    return source;
  };
  return ctx;
}

test('the four supplied audio tracks ship intact and match their measured processing manifest', () => {
  const root = new URL('../assets/audio/music/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.tracks.length, 4);
  for (const track of manifest.tracks) {
    assert.ok(SOUNDTRACK[track.id]);
    const bytes = fs.readFileSync(new URL(track.file, root));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), track.sha256);
    assert.equal(bytes.length, track.bytes);
    assert.ok(track.integrated_lufs > -23 && track.integrated_lufs < -19);
    assert.ok(track.true_peak_dbtp < -1);
    assert.ok(track.loop_duration > 50 && track.loop_duration < 65);
  }
});

test('the score follows day, night, the settlement, danger and expeditions without gate jitter', () => {
  const s = createInitialState(); s.timeOfDay = .3;
  assert.deepEqual(soundtrackScene(s), { id: 'palenque', reason: 'settlement' });
  s.benkos.x = CAMP_EDGE + 20;
  assert.equal(soundtrackScene(s, 'palenque').id, 'palenque');
  assert.equal(soundtrackScene(s, 'morning').id, 'morning');
  s.benkos.x = CAMP_EDGE + 100;
  assert.equal(soundtrackScene(s, 'palenque').id, 'morning');
  s.timeOfDay = .8; assert.equal(soundtrackScene(s).id, 'night');
  s.phase = 'RED_NIGHT'; assert.equal(soundtrackScene(s).id, 'resistance'); s.phase = 'NIGHT_DEFENSE';
  s.enemies = [{ x: s.benkos.x + 100, hp: 80, appearTimer: 0 }];
  assert.equal(soundtrackScene(s).reason, 'combat');
  s.enemies = []; s.story.expedition = { stage: 'march' };
  assert.equal(soundtrackScene(s).reason, 'expedition');
  s.story.expedition = null;
  s.wildlife = [{ species: 'JAGUAR', x: s.benkos.x, hp: 95, state: 'POUNCE' }];
  assert.equal(soundtrackScene(s).reason, 'combat');
});

test('crossfades retain playback positions, respect mute and pause, and bound active sources and buffers', async () => {
  const ctx = context(), s = createInitialState(); s.timeOfDay = .3;
  const score = new ScenarioSoundtrack(ctx, { load: async () => ({ duration: 60 }) });
  const step = dt => { ctx.currentTime += dt; score.update(dt, s); };
  step(0); await flush(); step(0);
  assert.equal(score.inspect().current, 'palenque');
  step(3); assert.equal(score.inspect().voices[0].weight, 1);
  s.benkos.x = CAMP_EDGE + 200;
  step(0); await flush(); step(0);
  assert.equal(score.voices.size, 2);
  step(1.2);
  assert.ok(score.inspect().voices.every(v => Math.abs(v.weight - .5) < .001));
  step(1.3); assert.equal(score.voices.size, 1);
  assert.equal(score.current, 'morning');
  score.pause(); assert.equal(score.voices.size, 0);
  const offset = score.offsets.get('morning');
  ctx.currentTime += 10; score.update(0, s, false); assert.equal(score.voices.size, 0);
  step(0); assert.equal(score.voices.get('morning').source.offset, offset);
  score.setVolume(0); step(1); assert.equal(score.voices.size, 0);
  score.setVolume(.4); step(0); assert.equal(score.master.gain.value, .4);
  s.timeOfDay = .8; step(0); await flush(); step(0); step(3);
  assert.equal(score.current, 'night');
  assert.ok(score.voices.size <= 2 && score.buffers.size <= 2);
  score.reset(); assert.equal(score.offsets.size, 0); assert.equal(score.current, '');
});

test('finishing an old download while paused cannot start stale music', async () => {
  const ctx = context(), s = createInitialState(); s.timeOfDay = .3;
  const pending = {};
  const score = new ScenarioSoundtrack(ctx, { load: (_, track) => new Promise(resolve => { pending[track.title] = resolve; }) });
  score.update(0, s); await flush();
  s.benkos.x = CAMP_EDGE + 200;
  score.update(0, s); await flush(); score.pause();
  pending[SOUNDTRACK.palenque.title]({ duration: 60 });
  pending[SOUNDTRACK.morning.title]({ duration: 60 });
  await flush();
  assert.equal(ctx.sources.length, 0);
  score.update(0, s, false); assert.equal(ctx.sources.length, 0);
  score.update(0, s, true); assert.equal(score.current, 'morning');
  assert.equal(ctx.sources.length, 1);
});

test('combat lingers briefly and the score ducks around the musicians and town crier', async () => {
  const ctx = context(), s = createInitialState(); s.timeOfDay = .3;
  const score = new ScenarioSoundtrack(ctx, { load: async () => ({ duration: 60 }) });
  s.enemies = [{ x: 100, hp: 80 }]; score.update(0, s);
  await flush(); score.update(0, s);
  assert.equal(score.current, 'resistance');
  s.enemies = []; score.update(3, s); assert.equal(score.desired, 'resistance');
  score.update(3.1, s); assert.equal(score.desired, 'palenque');
  s.festivity = { mode: 'MUSIC', x: 100 }; score.update(0, s); assert.equal(score.duck, .25);
  s.festivity.mode = 'PROCLAIM'; score.update(0, s); assert.equal(score.duck, .65);
  s.benkos.x = 2000; score.update(0, s); assert.equal(score.duck, 1);
});

test('an unavailable audio file fails quietly and retries with backoff', async () => {
  const ctx = context(), s = createInitialState(); s.timeOfDay = .3;
  let calls = 0;
  const score = new ScenarioSoundtrack(ctx, { load: async () => { calls++; throw Error('Audio HTTP 404'); } });
  score.update(0, s); await flush();
  for (let i = 0; i < 60; i++) score.update(1 / 60, s);
  await flush(); assert.equal(calls, 1); assert.equal(score.voices.size, 0);
  assert.match(score.inspect().errors[0].message, /404/);
  ctx.currentTime = 31; score.update(0, s); await flush(); assert.equal(calls, 2);
});
