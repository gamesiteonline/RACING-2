/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio synthesizer for engine sounds, nitro boosts, drifts, crashes, and background music loops.
class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Track active synthesized nodes
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicInterval: any = null;
  private musicBpm: number = 125;
  private isMusicPlaying: boolean = false;

  // Master Gain for easy control
  private masterGain: GainNode | null = null;

  constructor() {
    // Initialized lazily on first user interaction to comply with autoplay guidelines.
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio is not supported in this browser.", e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  // --- ENGINE SYNTH ---
  public startEngine() {
    this.initContext();
    if (!this.ctx || this.engineOsc || this.isMuted) return;

    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start(0);

      this.engineOsc = osc;
      this.engineGain = gain;
    } catch (err) {
      console.error(err);
    }
  }

  public updateEngineSound(speedKmh: number, isNitroActive: boolean, nitroLevel: number) {
    if (!this.ctx || !this.engineOsc) return;

    const ctx = this.ctx;
    // Map speed 0-350 to frequency 50Hz-220Hz
    let baseFreq = 50 + (speedKmh / 350) * 170;
    if (isNitroActive) {
      baseFreq += 40 * nitroLevel; // Higher pitch when boosting
    }

    this.engineOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.1);

    if (this.engineGain) {
      // Map speed to engine volume
      const volume = 0.04 + (speedKmh / 350) * 0.08 + (isNitroActive ? 0.05 : 0);
      this.engineGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
    }
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    this.engineGain = null;
  }

  // --- SOUND EFFECTS ---

  // Countdown beep (beep-beep-BEEP!)
  public playBeep(isHigh: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 880 : 440, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isHigh ? 0.4 : 0.2));

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + (isHigh ? 0.5 : 0.3));
  }

  // Activated nitro boost sound (Orange, Blue, Purple)
  public playNitroBoost(level: number) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const duration = level === 1 ? 0.5 : level === 2 ? 0.8 : 1.2;
    const pitch = level === 1 ? 250 : level === 2 ? 350 : 500;

    // Filtered noise synthesis
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, ctx.currentTime);
    filter.Q.setValueAtTime(3.0, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);

    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  // Tire Squeal Drift Squeak
  public playDriftSqueal() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    // Drift vibration pitch mapping
    osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  // Crash hit (Thud, scraping, explosions)
  public playCrash(isHeavy: boolean = false) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const duration = isHeavy ? 0.8 : 0.3;

    // Create a low thud oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + duration);

    oscGain.gain.setValueAtTime(isHeavy ? 0.35 : 0.15, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Create noise for mechanical impact and gravel sound
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(isHeavy ? 300 : 700, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isHeavy ? 0.3 : 0.1, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(oscGain);
    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);

    if (this.masterGain) {
      oscGain.connect(this.masterGain);
      noiseGain.connect(this.masterGain);
    } else {
      oscGain.connect(ctx.destination);
      noiseGain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + duration);

    noiseSource.start();
    noiseSource.stop(ctx.currentTime + duration);
  }

  // Stunt bonus sound (Ding! Success!)
  public playStuntDing() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
    osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.1); // C6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);

    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + 0.55);
    osc2.stop(ctx.currentTime + 0.55);
  }

  // Standard Button UI Taps
  public playClick() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  // Career Upgrade Success Fanfare!
  public playUpgradeDing() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const ctx = this.ctx;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

      gain.gain.setValueAtTime(0.1, ctx.currentTime + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.3);

      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start(ctx.currentTime + index * 0.1);
      osc.stop(ctx.currentTime + index * 0.1 + 0.35);
    });
  }

  // --- CHROMATIC TECHNO-SYNTH CHIP MUSIC SOUNDTRACK ---
  public startMusic() {
    this.initContext();
    if (!this.ctx || this.isMusicPlaying || this.isMuted) return;

    this.isMusicPlaying = true;
    const intervalSecs = 60 / this.musicBpm / 2; // Eighth notes
    let step = 0;

    // A driving cybernetic bassline loop
    const bassline = [
      110.00, 110.00, 130.81, 110.00,
      146.83, 146.83, 110.00, 164.81,
      110.00, 110.00, 130.81, 110.00,
      146.83, 164.81, 196.00, 220.00
    ]; // A2, C3, D3, E3, G3, A3

    const synthChordArp = [
      440.00, 523.25, 587.33, 659.25,
      523.25, 587.33, 659.25, 783.99
    ];

    this.musicInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const ctx = this.ctx;

      try {
        // --- 1. Bass Synthesizer step ---
        if (step % 2 === 0) {
          const bassNote = bassline[Math.floor(step / 2) % bassline.length];
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bassNote / 2, ctx.currentTime); // Lower pitch for deep bassline

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + intervalSecs * 1.8);

          osc.connect(gain);
          if (this.masterGain) gain.connect(this.masterGain);
          else gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + intervalSecs * 1.9);
        }

        // --- 2. High Cyber Arpeggios step ---
        if (step % 4 === 1 || step % 7 === 3) {
          const arpNote = synthChordArp[step % synthChordArp.length];
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(arpNote, ctx.currentTime);

          const bpFilter = ctx.createBiquadFilter();
          bpFilter.type = 'bandpass';
          bpFilter.frequency.setValueAtTime(1000 + Math.sin(step) * 400, ctx.currentTime);

          gain2.gain.setValueAtTime(0.02, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

          osc2.connect(bpFilter);
          bpFilter.connect(gain2);

          if (this.masterGain) gain2.connect(this.masterGain);
          else gain2.connect(ctx.destination);

          osc2.start();
          osc2.stop(ctx.currentTime + 0.18);
        }

        // --- 3. Synthesized hi-hat clicks ---
        if (step % 4 === 2 || step % 4 === 0) {
          const noiseOsc = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noiseOsc.type = 'sine';
          noiseOsc.frequency.setValueAtTime(10000, ctx.currentTime);

          noiseGain.gain.setValueAtTime(0.012, ctx.currentTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

          noiseOsc.connect(noiseGain);
          if (this.masterGain) noiseGain.connect(this.masterGain);
          else noiseGain.connect(ctx.destination);

          noiseOsc.start();
          noiseOsc.stop(ctx.currentTime + 0.06);
        }

        step++;
      } catch (err) {}
    }, intervalSecs * 1000);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }
}

export const audioSynth = new AudioSynthManager();
