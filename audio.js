/* ============================================================
   B.A.D CARDS 2400 — WEB AUDIO SYNTHESIZER
   Zero external audio files — 100% crisp browser sound FX
   ============================================================ */

class BadCardsAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playCardFlip() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.14);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playPackCharge() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [146.83, 220.0, 293.66, 369.99, 440.0];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 0.35);
      filter.frequency.exponentialRampToValueAtTime(600, now + 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.11, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    });
  }

  playMythicFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1900;
      g.gain.setValueAtTime(0.001, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.65);
      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.68);
    });
  }

  playImpact(crit = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = crit ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(crit ? 220 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.24);
    g.gain.setValueAtTime(crit ? 0.36 : 0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playEvolve(level = 2) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = level === 3
      ? [293.66, 369.99, 440.0, 587.33, 739.99, 880.0]
      : [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = level === 3 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(level === 3 ? 2800 : 1800, now + i * 0.055);
      g.gain.setValueAtTime(0.001, now + i * 0.055);
      g.gain.linearRampToValueAtTime(level === 3 ? 0.14 : 0.10, now + i * 0.055 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.52);
      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.55);
    });
  }

  playFury() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  playShieldBreak() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [680, 420, 210].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + i * 0.04 + 0.16);
      g.gain.setValueAtTime(0.12, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    });
  }
}

window.badAudio = new BadCardsAudio();
