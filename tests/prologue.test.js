import test from 'node:test';
import assert from 'node:assert/strict';
import { createExercise, stepExercise } from '../js/prologue.js';
import { createStoryMedia } from '../js/story-media.js';
import { PROLOGUE } from '../js/chronicle.js';

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

test('source clips never replace a playable night and skipped pages cannot start narration late', async t => {
  assert.deepEqual([...new Set(Object.values(PROLOGUE.clips).map(clip => clip.id))].sort(), ['abuelo', 'fuga', 'mapa', 'matuna']);
  for (const page of Object.keys(PROLOGUE.exercises)) assert.equal(PROLOGUE.clips[page], undefined);
  let serveManifest;
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { serveManifest = resolve; }));
  function element() {
    const classes = new Set();
    const listeners = {};
    return { src: '', currentTime: 0, duration: 30, readyState: 2,
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      getAttribute(name) { return name === 'src' ? this.src || null : null; },
      removeAttribute(name) { this[name] = ''; },
      pause() { this.playing = false; },
      load() {},
      play() { this.playing = true; this.onplaying?.(); return Promise.resolve(); },
      addEventListener(name, fn) { listeners[name] = fn; },
      dispatch(name) { listeners[name]?.(); } };
  }
  const video = element(), voice = element(), replay = element();
  const media = createStoryMedia({ video, voice, replay, settings: { audio_enabled: true, audio_volume: .55 } });
  const skipped = media.show(PROLOGUE.clips[0], PROLOGUE.voice[0]);
  media.clear();
  serveManifest({ ok: true, json: async () => ({ videos: ['abuelo'], voices: ['abuelo-marea', 'benkos-nino-barcos'] }) });
  await skipped;
  assert.equal(video.src, '');
  assert.equal(voice.src, '');
  await media.show(PROLOGUE.clips[1], PROLOGUE.voice[1]);
  video.onloadedmetadata();
  assert.equal(video.currentTime, 15);
  assert.equal(voice.volume, .55);
  assert.equal(voice.playing, true);
  media.clear();
  assert.equal(video.playing, false);
  assert.equal(voice.playing, false);
  assert.equal(video.classList.contains('hidden'), true);
});
