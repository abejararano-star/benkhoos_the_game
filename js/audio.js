import { ScenarioSoundtrack } from './soundtrack.js?v=70b671881237';

export class AfroColombianAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.85;
    this.soundtrack = null;
  }
  init() {
    if (!this.enabled || this.volume <= 0) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && !this.soundtrack) {
      this.soundtrack = new ScenarioSoundtrack(this.ctx);
      this.soundtrack.setVolume(this.volume);
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.soundtrack?.setVolume(this.volume);
    if (!this.volume) this.stopWeatherAudio();
  }
  pauseSoundtrack() { this.soundtrack?.pause(); this.stopWeatherAudio(); }
  resetSoundtrack() { this.soundtrack?.reset(); this.stopWeatherAudio(); }
  updateSoundtrack(dt, state, playing) {
    this.soundtrack?.update(dt, state, playing && this.enabled);
    this.updateWeatherAudio(state, playing && this.enabled);
  }
  inspectSoundtrack() { return { ...(this.soundtrack?.inspect() ?? { playing: false, current: '', voices: [], buffered: [], errors: [] }), weatherSound: !!this.weatherSound }; }
  stopWeatherAudio() {
    if (!this.weatherSound) return;
    this.weatherSound.source.stop(); this.weatherSound.source.disconnect();
    this.weatherSound.filter.disconnect(); this.weatherSound.gain.disconnect();
    this.weatherSound = null;
  }
  updateWeatherAudio(state, playing) {
    const w = state.weather;
    if (!this.ctx || !playing || !this.volume || !w || w.rain < .02 && Math.abs(w.wind) < .28) {
      this.stopWeatherAudio(); return;
    }
    if (!this.weatherSound) {
      if (!this.weatherBuffer) {
        this.weatherBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const samples = this.weatherBuffer.getChannelData(0);
        let seed = 419;
        for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; samples[i] = seed / 2147483648; }
      }
      const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain();
      source.buffer = this.weatherBuffer; source.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = 2400; gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination); source.start();
      this.weatherSound = { source, filter, gain, updatedAt: -1 };
    }
    const sound = this.weatherSound, now = this.ctx.currentTime;
    if (now - sound.updatedAt < .12) return;
    const sheltered = w.playerSheltered;
    const volume = (w.rain * (sheltered ? .28 : 1) * .045 + Math.abs(w.wind) * .003) * this.volume;
    sound.gain.gain.setTargetAtTime(volume, now, .25);
    sound.filter.frequency.setTargetAtTime(sheltered ? 1200 : 2600, now, .35);
    sound.updatedAt = now;
  }
  playTamboraBass(freq = 75, duration = 0.16, vol = 0.22) {
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const effVol = vol * this.volume;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + duration);
    gain.gain.setValueAtTime(effVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + duration);
  }
  playAlegreSlap(vol = 0.11) {
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const effVol = vol * this.volume;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);
    gain.gain.setValueAtTime(effVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.07);
  }
  playGuacheShaker(vol = 0.035) {
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const effVol = vol * this.volume;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(effVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    noise.start();
  }
  playTrumpetHorn(baseFreq = 440, dur = 0.45) {
    this.init();
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const effVol = 0.14 * this.volume;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.25, now + dur * 0.35);
    gain.gain.setValueAtTime(effVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + dur);
  }
  playSlotDing(slotIndex = 0) {
    this.init();
    if (!this.enabled || !this.ctx || this.volume <= 0) return;
    const effVol = 0.16 * this.volume;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 720 + slotIndex * 145;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.045);
    g.gain.setValueAtTime(effVol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.22);
  }
  playSfx(type) {
    this.init();
    if (!this.enabled || !this.ctx) return;
    if (type === 'coinPickup') this.playSlotDing(2);
    else if(type==='cannon'){this.playTamboraBass(55,.48,.48);this.playGuacheShaker(.20);}
    else if(type==='ballista'){this.playTamboraBass(145,.12,.16);this.playGuacheShaker(.06);}
    else if (type === 'chainBreak') { this.playSlotDing(4); this.playGuacheShaker(0.15); }
    else if (type === 'pickaxe') { this.playSlotDing(1); }
    else if (type === 'splash') { this.playGuacheShaker(0.14); this.playTamboraBass(120, 0.12, 0.15); }
    else if (type === 'slash') { this.playAlegreSlap(0.2); this.playGuacheShaker(0.1); }
    else if (type === 'roar') this.playTamboraBass(135, 0.55, 0.42);
    else if (type === 'musket') { this.playTamboraBass(230, 0.12, 0.3); this.playGuacheShaker(0.22); }
    else if (type === 'trumpet') this.playTrumpetHorn(392, 0.55);
  }
  playFestival(festival, playerX) {
    const beat = Math.floor(festival.clock * 6);
    if (this.festivalBeat === beat) return;
    this.festivalBeat = beat;
    const near = Math.max(0, 1 - Math.abs(playerX - festival.x) / 480);
    if (!near) return;
    const s = beat % 6;
    if (s === 0 || s === 3) this.playTamboraBass(72, .17, .15 * near);
    if (s === 2 || s === 5) this.playAlegreSlap(.10 * near);
    this.playGuacheShaker((s % 2 ? .055 : .025) * near);
  }
  update(dt, phase, festival = null, playerX = Infinity) {
    if (!this.enabled || !this.ctx) return;
    if (festival?.mode === 'MUSIC' && Math.abs(playerX - festival.x) < 480) {
      this.playFestival(festival, playerX);
      return;
    }
  }
}
