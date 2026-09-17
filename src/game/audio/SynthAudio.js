/**
 * SynthAudio.js
 * 
 * Pure Web Audio API atmospheric electronic soundscape and reactive SFX engine.
 * Generates cinematic dark synth drones, rhythmic arpeggios, laser hums,
 * shift warning klaxons, and reality-warp sound effects with zero external asset files.
 */

export class SynthAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.filter = null;
    this.isMusicRunning = false;
    this.arpTimer = null;
    this.arpStep = 0;

    // Pentatonic cyber scale frequencies for procedural arpeggiator
    this.arpNotes = [
      130.81, // C3
      155.56, // Eb3
      174.61, // F3
      196.00, // G3
      233.08, // Bb3
      261.63, // C4
      311.13, // Eb4
      392.00  // G4
    ];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Music sub-bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // SFX sub-bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  startMusic() {
    if (!this.ensureContext()) return;
    if (this.isMusicRunning) return;
    this.isMusicRunning = true;

    const t = this.ctx.currentTime;

    // Create dual detuned sub-bass drone oscillators
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.filter = this.ctx.createBiquadFilter();

    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(65.41, t); // C2

    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.setValueAtTime(65.91, t); // Detuned slight beat

    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(280, t);
    this.filter.Q.setValueAtTime(3.5, t);

    this.droneOsc1.connect(this.filter);
    this.droneOsc2.connect(this.filter);
    this.filter.connect(this.musicGain);

    this.droneOsc1.start();
    this.droneOsc2.start();

    // Start atmospheric rhythmic arpeggiator
    this.scheduleArp();
  }

  scheduleArp() {
    if (!this.isMusicRunning) return;
    const interval = 220; // ms per step

    this.arpTimer = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      this.playArpNote();
    }, interval);
  }

  playArpNote() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const noteIdx = (this.arpStep * 3) % this.arpNotes.length;
    const freq = this.arpNotes[noteIdx];
    this.arpStep++;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(2.0, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  // ==========================================
  // SOUND EFFECTS
  // ==========================================

  playJump() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  playLand() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  playSilhouetteBounce() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  playShiftWarning(countdown) {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch rises as countdown approaches 0
    const freq = 600 + (3 - countdown) * 200;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  playRealityShift() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Sub-bass impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.7);

    // Filter sweep on ambient drone
    if (this.filter) {
      this.filter.frequency.setValueAtTime(1200, t);
      this.filter.frequency.exponentialRampToValueAtTime(280, t + 1.2);
    }
  }

  playLaserBurn() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(220, t + 0.05);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  playOrbCollect() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const delay = idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + delay);
      osc.stop(t + delay + 0.4);
    });
  }

  playLevelComplete() {
    if (!this.ensureContext() || this.isMuted) return;
    const t = this.ctx.currentTime;
    const chord = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  destroy() {
    if (this.arpTimer) clearInterval(this.arpTimer);
    if (this.droneOsc1) {
      try { this.droneOsc1.stop(); } catch (e) {}
    }
    if (this.droneOsc2) {
      try { this.droneOsc2.stop(); } catch (e) {}
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isMusicRunning = false;
  }
}
