import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../js/world-state.js';
import { advanceWeather, rainAt, weatherShelters, rainCeiling, isSheltered, leafPose, leafSources } from '../js/weather.js';
import { makeSave, restoreSave } from '../js/save-system.js';
import { festivalProgram } from '../js/festivity.js';
import { AfroColombianAudioEngine } from '../js/audio.js';
import { weatherAir } from '../js/weather-renderer.js';
import { daylightAt } from '../js/daylight.js';

function advance(state, seconds, fps = 60) {
  for (let i = 0; i < seconds * fps; i++) advanceWeather(state, 1 / fps);
}

test('showers develop gradually, wet exposed actors and leave puddles that dry after the rain', () => {
  const s = createInitialState(); s.timeOfDay = .54; s.benkos.x = 2500;
  s.units = [{ id: 801, role: 'ALDEANO', hp: 80, x: s.toolRacks[0].x, weatherWetness: 0 }];
  assert.ok(rainAt(1, .54) > .8);
  advance(s, 1); assert.ok(s.weather.rain > 0 && s.weather.rain < .3);
  advance(s, 35);
  assert.ok(s.weather.wetness > .8 && s.weather.puddles > .2);
  assert.ok(s.benkos.weatherWetness > .9);
  assert.equal(s.units[0].weatherWetness, 0);
  s.timeOfDay = .4;
  advance(s, 25);
  assert.ok(s.weather.rain < .04 && s.weather.wetness > .7);
  const wet = s.weather.wetness, puddles = s.weather.puddles;
  advance(s, 100);
  assert.ok(s.weather.wetness < wet && s.weather.puddles < puddles);
  assert.ok(s.weather.wetness >= 0 && s.weather.puddles >= 0);
});

test('porches protect people, entry into the river wets them and the weather never changes health or coins', () => {
  const s = createInitialState(); s.timeOfDay = .54;
  const roofs = weatherShelters(s), rack = s.toolRacks[0];
  assert.equal(isSheltered(roofs, rack.x), true);
  assert.ok(rainCeiling(roofs, rack.x, 268) < 230);
  assert.equal(rainCeiling(roofs, 2500, 268), 268);
  s.haciendas[0].destroyed = true;
  assert.equal(isSheltered(weatherShelters(s), s.haciendas[0].x), false);
  s.benkos.x = rack.x;
  advance(s, 20); assert.equal(s.benkos.weatherWetness, 0); assert.equal(s.weather.playerSheltered, true);
  s.benkos.inStream = true;
  advance(s, 1); assert.equal(s.benkos.weatherWetness, 1);
  assert.equal(s.benkos.spirit, 100); assert.equal(s.coins, 16);
  s.day = 1; s.timeOfDay = .32;
  assert.equal(festivalProgram(s), 'SHELTER');
});

test('wetness and atmospheric time survive loading while old saves acquire a clean weather state', () => {
  const s = createInitialState(); s.timeOfDay = .54; s.benkos.x = 2500;
  advance(s, 30);
  const save = makeSave(s, 200);
  const loaded = restoreSave(save, createInitialState()).state;
  for (const key of ['time', 'rain', 'clouds', 'wetness', 'puddles', 'wind']) assert.equal(loaded.weather[key], s.weather[key]);
  assert.equal(loaded.benkos.weatherWetness, s.benkos.weatherWetness);
  delete save.snapshot.state.weather;
  delete save.snapshot.state.benkos.weatherWetness;
  const legacy = restoreSave(save, createInitialState()).state;
  assert.equal(legacy.weather.rain, 0); assert.equal(legacy.weather.wetness, 0);
  assert.equal(legacy.benkos.weatherWetness, 0);
});

test('weather remains stable at different frame rates and leaf sources stay planted while the camera moves', () => {
  const states = [30, 60, 144].map(fps => { const s = createInitialState(); s.timeOfDay = .54; s.benkos.x = 2500; advance(s, 20, fps); return s; });
  assert.ok(Math.abs(states[0].weather.wetness - states[2].weather.wetness) < .003);
  assert.ok(Math.abs(states[0].benkos.weatherWetness - states[2].benkos.weatherWetness) < .02);
  const s = createInitialState();
  const first = leafSources(s, -1650, 700, true), second = leafSources(s, -1660, 700, true);
  for (const source of first) {
    const other = second.find(entry => entry.id === source.id);
    if (other) assert.deepEqual(other, source);
  }
  const poses = Array.from({ length: 1000 }, (_, i) => leafPose(51, i * .04, .4, .8, 100, true));
  assert.ok(poses.some(p => p.landed && Math.abs(p.y) < .01));
  assert.ok(poses.some(p => p.washed && p.y > 0));
  assert.ok(poses.every(p => Number.isFinite(p.x) && p.alpha >= 0 && p.alpha <= 1));
  const night = daylightAt(.85), cloudy = weatherAir(night, { clouds: 1 });
  assert.ok(cloudy.zenith.every((channel, i) => channel <= night.zenith[i]));
});

test('the rain bed is bounded, muffles under shelter and stops when muted or paused', () => {
  const parameter = () => ({ value: 0, setTargetAtTime(v) { this.value = v; } });
  const node = () => ({ connect() {}, disconnect() {}, gain: parameter(), frequency: parameter() });
  let starts = 0, stops = 0;
  const ctx = { sampleRate: 1000, currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(2000) }),
    createBufferSource: () => ({ ...node(), start() { starts++; }, stop() { stops++; } }) };
  const audio = new AfroColombianAudioEngine(); audio.ctx = ctx;
  const s = createInitialState(); s.weather.rain = .8;
  audio.updateWeatherAudio(s, true); const exposed = audio.weatherSound.gain.gain.value;
  s.weather.playerSheltered = true; ctx.currentTime = .2;
  audio.updateWeatherAudio(s, true);
  assert.ok(audio.weatherSound.gain.gain.value < exposed);
  assert.equal(starts, 1);
  audio.pauseSoundtrack(); assert.equal(stops, 1); assert.equal(audio.weatherSound, null);
  audio.updateWeatherAudio(s, true); audio.setVolume(0);
  assert.equal(starts, 2); assert.equal(stops, 2);
});
