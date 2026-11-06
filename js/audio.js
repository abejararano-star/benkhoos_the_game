export class AfroColombianAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.85;
    this.step = 0;
    this.accum = 0;
  }
  init() {
    if (!this.enabled || this.volume <= 0) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
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
    else if (type === 'chainBreak') { this.playSlotDing(4); this.playGuacheShaker(0.15); }
    else if (type === 'pickaxe') { this.playSlotDing(1); }
    else if (type === 'splash') { this.playGuacheShaker(0.14); this.playTamboraBass(120, 0.12, 0.15); }
    else if (type === 'slash') { this.playAlegreSlap(0.2); this.playGuacheShaker(0.1); }
    else if (type === 'roar') this.playTamboraBass(135, 0.55, 0.42);
    else if (type === 'musket') { this.playTamboraBass(230, 0.12, 0.3); this.playGuacheShaker(0.22); }
    else if (type === 'trumpet') this.playTrumpetHorn(392, 0.55);
  }
  update(dt, phase) {
    if (!this.enabled || !this.ctx) return;
    const stepInterval = phase === 'DAY_EXPLORE' ? 0.29 : (phase === 'RED_NIGHT' ? 0.13 : 0.17);
    this.accum += dt;
    if (this.accum >= stepInterval) {
      this.accum -= stepInterval;
      const s = this.step % 8;
      if (phase === 'DAY_EXPLORE') {
        if (s === 0 || s === 4) this.playTamboraBass(68, 0.15, 0.10);
        if (s === 2 || s === 6) this.playGuacheShaker(0.025);
        if (s === 3 || s === 7) this.playAlegreSlap(0.06);
      } else {
        if (s === 0 || s === 3 || s === 6) this.playTamboraBass(88, 0.14, 0.2);
        if (s === 2 || s === 4 || s === 7) this.playAlegreSlap(0.13);
        if (s % 2 === 1) this.playGuacheShaker(0.045);
      }
      this.step++;
    }
  }
}
