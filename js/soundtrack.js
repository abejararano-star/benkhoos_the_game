import { CAMP_EDGE } from './config.js?v=ee79ef434f2b';
import { threatensMilitia } from './combat.js?v=ee79ef434f2b';

const asset = name => `assets/audio/music/${name}.mp3?v=ambient-20261119`;
export const SOUNDTRACK = Object.freeze({
  night: { title: 'Mangrove Night Drift', src: asset('mangrove-night-drift') },
  morning: { title: 'La Matuna Morning Canopy', src: asset('la-matuna-morning-canopy') },
  palenque: { title: 'Maroon Kingdom Harmony', src: asset('maroon-kingdom-harmony') },
  resistance: { title: 'Forest Resistance', src: asset('forest-resistance') }
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const FADE_SECONDS = 2.4;

export function soundtrackScene(state, previous = '') {
  const b = state.benkos;
  const near = actor => Math.abs(actor.x - b.x) < 380;
  const combat = b.hurtTimer > 0 || b.waterFall ||
    state.enemies.some(e => e.hp > 0 && !(e.appearTimer > 0) && !e.waterFall && near(e)) ||
    state.wildlife.some(a => near(a) && threatensMilitia(a));
  if (combat) return { id: 'resistance', reason: 'combat' };
  if (state.phase === 'RED_NIGHT') return { id: 'resistance', reason: 'red-night' };
  if (state.story.expedition && Math.abs(b.x) > CAMP_EDGE) return { id: 'resistance', reason: 'expedition' };
  if (state.timeOfDay >= .68 || state.timeOfDay < .10) return { id: 'night', reason: 'night' };
  // Separate entry/exit edges prevent rapid changes when standing at the gate.
  const edge = CAMP_EDGE + (previous === 'palenque' ? 45 : -45);
  return Math.abs(b.x) <= edge ? { id: 'palenque', reason: 'settlement' } : { id: 'morning', reason: 'forest' };
}

async function decodeTrack(ctx, track) {
  const response = await fetch(track.src);
  if (!response.ok) throw Error(`Audio HTTP ${response.status}`);
  return ctx.decodeAudioData(await response.arrayBuffer());
}

export class ScenarioSoundtrack {
  constructor(ctx, { tracks = SOUNDTRACK, load = decodeTrack } = {}) {
    this.ctx = ctx;
    this.tracks = tracks;
    this.load = load;
    this.buffers = new Map();
    this.loading = new Map();
    this.failures = new Map();
    this.offsets = new Map();
    this.voices = new Map();
    this.current = '';
    this.desired = '';
    this.reason = '';
    this.running = false;
    this.combatGrace = 0;
    this.volume = .65;
    this.duck = 1;
    this.master = ctx.createGain();
    this.duckBus = ctx.createGain();
    this.duckBus.connect(this.master);
    this.master.connect(ctx.destination);
    this.master.gain.value = this.volume;
  }

  setVolume(value) {
    this.volume = clamp(Number(value) || 0, 0, 1);
    this.master.gain.value = this.volume;
    if (!this.volume) this.pause();
  }

  weight(voice) {
    const progress = clamp((this.ctx.currentTime - voice.since) / FADE_SECONDS, 0, 1);
    return voice.from + (voice.target - voice.from) * progress;
  }

  ramp(voice, target) {
    if (voice.target === target) return;
    const now = this.ctx.currentTime;
    const from = this.weight(voice);
    const parameter = voice.gain.gain;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(from, now);
    parameter.linearRampToValueAtTime(target, now + FADE_SECONDS);
    Object.assign(voice, { from, target, since: now });
  }

  stopVoice(id) {
    const voice = this.voices.get(id);
    if (!voice) return;
    this.offsets.set(id, (voice.offset + this.ctx.currentTime - voice.startedAt) % voice.source.buffer.duration);
    voice.source.stop();
    voice.source.disconnect();
    voice.gain.disconnect();
    this.voices.delete(id);
  }

  pause() {
    this.running = false;
    for (const id of this.voices.keys()) this.stopVoice(id);
    this.current = '';
  }

  reset() {
    this.pause();
    this.combatGrace = 0;
    this.desired = '';
    this.offsets.clear();
  }

  trimBuffers() {
    for (const id of this.buffers.keys()) {
      if (this.buffers.size <= 2) break;
      if (!this.voices.has(id) && id !== this.desired) this.buffers.delete(id);
    }
  }

  request(id) {
    if (this.loading.has(id) || (this.failures.get(id)?.retryAt ?? 0) > this.ctx.currentTime) return;
    const job = Promise.resolve().then(() => this.load(this.ctx, this.tracks[id])).then(buffer => {
      if (!(buffer.duration > 1)) throw Error('Audio vacío');
      this.buffers.delete(id);
      this.buffers.set(id, buffer);
      this.failures.delete(id);
      this.trimBuffers();
    }).catch(error => {
      this.failures.set(id, { retryAt: this.ctx.currentTime + 30, message: String(error.message) });
    }).finally(() => this.loading.delete(id));
    this.loading.set(id, job);
  }

  activate(id) {
    if (!this.voices.has(id)) {
      if (this.voices.size >= 2) {
        const quietest = [...this.voices].sort((a, b) => this.weight(a[1]) - this.weight(b[1]))[0][0];
        this.stopVoice(quietest);
      }
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      source.buffer = this.buffers.get(id);
      source.loop = true;
      source.connect(gain); gain.connect(this.duckBus);
      gain.gain.value = 0;
      const offset = (this.offsets.get(id) ?? 0) % source.buffer.duration;
      source.start(0, offset);
      this.voices.set(id, { source, gain, offset, startedAt: this.ctx.currentTime,
        from: 0, target: 0, since: this.ctx.currentTime });
    }
    for (const [key, voice] of this.voices) this.ramp(voice, key === id ? 1 : 0);
    this.current = id;
    this.trimBuffers();
  }

  update(dt, state, running = true) {
    if (!running || !this.volume) { this.pause(); return; }
    this.running = true;
    const scene = soundtrackScene(state, this.desired);
    this.combatGrace = scene.reason === 'combat' ? 6 : Math.max(0, this.combatGrace - dt);
    const id = this.combatGrace > 0 ? 'resistance' : scene.id;
    this.reason = this.combatGrace > 0 ? 'combat' : scene.reason;
    this.desired = id;
    for (const [key, voice] of this.voices) {
      if (!voice.target && this.ctx.currentTime - voice.since >= FADE_SECONDS) this.stopVoice(key);
    }
    const f = state.festivity;
    const nearBard = f && Math.abs(f.x - state.benkos.x) < 480;
    const duck = nearBard && f.mode === 'MUSIC' ? .25 : nearBard && f.mode === 'PROCLAIM' ? .65 : 1;
    if (duck !== this.duck) {
      this.duck = duck;
      this.duckBus.gain.setTargetAtTime(duck, this.ctx.currentTime, .22);
    }
    if (this.buffers.has(id)) this.activate(id);
    else this.request(id);
  }

  inspect() {
    return { playing: this.running, desired: this.desired, current: this.current,
      title: this.tracks[this.current]?.title ?? '', reason: this.reason, volume: this.volume, duck: this.duck,
      voices: [...this.voices].map(([id, voice]) => ({ id, weight: this.weight(voice) })),
      buffered: [...this.buffers.keys()], loading: [...this.loading.keys()],
      errors: [...this.failures].map(([id, failure]) => ({ id, message: failure.message })) };
  }
}
