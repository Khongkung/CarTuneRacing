/**
 * Project CarTuneRacing - High-Definition Web Audio Engine Synthesizer & Sample Player
 * Features:
 * - Aggressive WaveShaper Tube Overdrive & Harmonic Distortion
 * - Sub-Bass Chest-Thumping Resonance (20-80 Hz)
 * - Acoustic Exhaust Header Throat Resonance (Peaking Formant Filter)
 * - Exhaust Grit / Mechanical Noise Texture
 * - Dynamic Load & Rev-Limiter Spark-Cut Crackle (ตับๆๆๆ)
 * - Seamless Custom Audio File Support (/sounds/engine_[type].mp3/wav)
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.isMuted = false;

    // Volume levels (0.0 to 1.0)
    this.masterVolume = 0.8;
    this.engineVolume = 0.85;
    this.sfxVolume = 0.85;

    // Bus Gain Nodes
    this.masterGainNode = null;
    this.engineBus = null;
    this.sfxBus = null;

    // Procedural Engine sound nodes
    this.engineOsc = null;
    this.subOsc = null;
    this.subGain = null;
    this.subBassOsc = null;
    this.subBassGain = null;
    this.gritNoise = null;
    this.gritGain = null;
    this.throatFilter = null;
    this.engineFilter = null;
    this.distortionNode = null;
    this.engineGain = null;
    this.engineRunning = false;
    this.targetPitch = 100;

    // Turbo / Supercharger sound nodes
    this.turboOsc = null;
    this.turboHarmonicOsc = null;
    this.turboGain = null;
    this.turboFilter = null;

    // Custom sample audio support
    this.sampleBuffers = {};
    this.sampleSource = null;
    this.sampleGain = null;
    this.usingCustomSample = false;

    // Sound profile based on parts
    this.soundProfile = {
      engineType: 'i4',
      exhaustType: 'exh_oem',
      inductionType: 'NA',
      inductionPartId: 'ind_na'
    };

    this.loadVolumeSettings();
  }

  loadVolumeSettings() {
    try {
      const saved = localStorage.getItem('cartuneracing_audio_vol');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.master !== undefined) this.masterVolume = parseFloat(parsed.master);
        if (parsed.engine !== undefined) this.engineVolume = parseFloat(parsed.engine);
        if (parsed.sfx !== undefined) this.sfxVolume = parseFloat(parsed.sfx);
      }
    } catch (e) {}
  }

  saveVolumeSettings() {
    try {
      localStorage.setItem('cartuneracing_audio_vol', JSON.stringify({
        master: this.masterVolume,
        engine: this.engineVolume,
        sfx: this.sfxVolume
      }));
    } catch (e) {}
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGainNode.connect(this.ctx.destination);

      // Engine Bus
      this.engineBus = this.ctx.createGain();
      this.engineBus.gain.setValueAtTime(this.engineVolume, this.ctx.currentTime);
      this.engineBus.connect(this.masterGainNode);

      // SFX Bus
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxBus.connect(this.masterGainNode);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(val)));
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    this.saveVolumeSettings();
  }

  setEngineVolume(val) {
    this.engineVolume = Math.max(0, Math.min(1, parseFloat(val)));
    if (this.engineBus && this.ctx) {
      this.engineBus.gain.setTargetAtTime(this.engineVolume, this.ctx.currentTime, 0.05);
    }
    this.saveVolumeSettings();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
    this.saveVolumeSettings();
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- NON-LINEAR WAVESHAPER CURVE FOR RAW EXHAUST DISTORTION & BITE ---
  makeDistortionCurve(amount = 28) {
    const k = typeof amount === 'number' ? amount : 28;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // --- CONFIGURE SOUND PROFILE ACCORDING TO CAR PARTS ---
  configureSound(carData) {
    if (!carData || !carData.parts) return;
    const parts = carData.parts;

    const engineId = parts.engine_block || 'block_i4_vtec';
    const exhaustId = parts.exhaust || 'exh_oem';
    const inductionId = parts.induction || 'ind_na';

    let engineType = 'i4';
    if (engineId === 'block_i6_2jz') engineType = 'i6';
    else if (engineId === 'block_v6_tt') engineType = 'v6';
    else if (engineId === 'block_v8_big' || engineId === 'block_nascar_v8') engineType = 'v8';
    else if (engineId === 'block_diesel_pickup') engineType = 'diesel';
    else if (engineId === 'block_v10_gt3') engineType = 'v10';
    else if (engineId === 'block_v12_quad_turbo') engineType = 'v12';
    else if (engineId === 'block_f1_hybrid_v6') engineType = 'f1';

    let inductionType = 'NA';
    if (inductionId === 'ind_turbo_small' || inductionId === 'ind_turbo_massive' || inductionId === 'ind_promod_twin_billet') {
      inductionType = 'TURBO';
    } else if (inductionId === 'ind_twin_turbo' || inductionId === 'ind_quad_turbo_hyper') {
      inductionType = 'TWIN_TURBO';
    } else if (inductionId === 'ind_supercharger' || inductionId === 'ind_top_fuel_supercharger') {
      inductionType = 'SUPERCHARGER';
    }

    this.soundProfile = {
      engineType,
      exhaustType: exhaustId,
      inductionType,
      inductionPartId: inductionId
    };

    // Pre-check for custom sample in background
    this.checkCustomSample(engineType);
  }

  // Check if real recorded audio sample file exists in /sounds/
  async checkCustomSample(engineType) {
    if (!this.ctx) return;
    const targets = [
      { key: engineType, file: `engine_${engineType}` },
      { key: 'blowoff', file: 'blowoff' },
      { key: 'backfire', file: 'backfire' }
    ];

    for (const item of targets) {
      if (this.sampleBuffers[item.key] !== undefined) continue;
      const formats = ['mp3', 'wav', 'ogg'];
      let loaded = false;
      for (const fmt of formats) {
        try {
          const url = `sounds/${item.file}.${fmt}`;
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(buf);
            this.sampleBuffers[item.key] = decoded;
            console.log(`[AudioEngine] 🎵 Loaded custom audio: ${url}`);
            loaded = true;
            break;
          }
        } catch (e) {}
      }
      if (!loaded) this.sampleBuffers[item.key] = null;
    }
  }

  // --- START FEROCIOUS ENGINE SOUND ---
  startEngineSound(baseRpm = 900, carData = null) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || this.engineRunning) return;

    if (carData) {
      this.configureSound(carData);
    }

    try {
      const t = this.ctx.currentTime;
      const profile = this.soundProfile;

      // 1. Check if custom recorded audio sample is available
      if (this.sampleBuffers[profile.engineType]) {
        this.startSampleEngine(baseRpm, profile.engineType);
        return;
      }

      this.usingCustomSample = false;

      // ==========================================
      // NEXT-GEN PROCEDURAL BEAST ENGINE SYNTHESIS
      // ==========================================

      // 1. PRIMARY COMBUSTION OSCILLATOR
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';

      // 2. SECONDARY / HARMONIC OVERTONE OSCILLATOR
      this.subOsc = this.ctx.createOscillator();
      this.subGain = this.ctx.createGain();

      // 3. SUB-BASS CHEST-THUMP OSCILLATOR (Deep 20-80 Hz rumble)
      this.subBassOsc = this.ctx.createOscillator();
      this.subBassOsc.type = 'triangle';
      this.subBassGain = this.ctx.createGain();

      // Configure harmonics per engine personality
      if (profile.engineType === 'v8') {
        // V8 Big-Block & NASCAR: Massive sub-bass rumble, throaty growl
        this.subOsc.type = 'sawtooth';
        this.subOsc.detune.setValueAtTime(-12, t);
        this.subGain.gain.setValueAtTime(0.09, t);
        this.subBassGain.gain.setValueAtTime(0.14, t);
      } else if (profile.engineType === 'i6') {
        // 2JZ: Iconic singing straight-6 metallic roar with ±8 cent chorus
        this.subOsc.type = 'sawtooth';
        this.subOsc.detune.setValueAtTime(9, t);
        this.subGain.gain.setValueAtTime(0.08, t);
        this.subBassGain.gain.setValueAtTime(0.08, t);
      } else if (profile.engineType === 'diesel') {
        // Commonrail Drag Diesel: Heavy low-frequency thump and compression knock
        this.subOsc.type = 'sawtooth';
        this.subOsc.detune.setValueAtTime(-28, t);
        this.subGain.gain.setValueAtTime(0.12, t);
        this.subBassGain.gain.setValueAtTime(0.18, t);
      } else if (profile.engineType === 'v10') {
        // GT3 V10: Screaming exotic howl
        this.subOsc.type = 'sawtooth';
        this.subOsc.detune.setValueAtTime(16, t);
        this.subGain.gain.setValueAtTime(0.09, t);
        this.subBassGain.gain.setValueAtTime(0.07, t);
      } else if (profile.engineType === 'v12') {
        // V12: Quad-turbo hypercar symphony
        this.subOsc.type = 'sawtooth';
        this.subOsc.detune.setValueAtTime(7, t);
        this.subGain.gain.setValueAtTime(0.08, t);
        this.subBassGain.gain.setValueAtTime(0.11, t);
      } else if (profile.engineType === 'f1') {
        // Formula 1: 15,000 RPM supersonic razor-sharp turbine scream
        this.subOsc.type = 'square';
        this.subOsc.detune.setValueAtTime(24, t);
        this.subGain.gain.setValueAtTime(0.06, t);
        this.subBassGain.gain.setValueAtTime(0.03, t);
      } else {
        // I4 VTEC: High-RPM screaming VTEC cam
        this.subOsc.type = 'square';
        this.subGain.gain.setValueAtTime(0.05, t);
        this.subBassGain.gain.setValueAtTime(0.06, t);
      }

      // 4. ACOUSTIC EXHAUST THROAT RESONANCE (Peaking Formant Filter)
      this.throatFilter = this.ctx.createBiquadFilter();
      this.throatFilter.type = 'peaking';
      const throatFreqMap = { v8: 420, i6: 540, diesel: 320, v10: 680, v12: 580, f1: 950, i4: 480 };
      this.throatFilter.frequency.setValueAtTime(throatFreqMap[profile.engineType] || 480, t);
      this.throatFilter.Q.value = 2.2;
      this.throatFilter.gain.setValueAtTime(7.5, t); // +7.5 dB throaty header resonance

      // 5. TUBE DISTORTION / WAVESHAPER OVERDRIVE (Raw aggressive exhaust bite)
      this.distortionNode = this.ctx.createWaveShaper();
      const distAmount = (profile.exhaustType === 'exh_hood_exit') ? 42 : (profile.exhaustType === 'exh_straight_3in' ? 32 : 18);
      this.distortionNode.curve = this.makeDistortionCurve(distAmount);
      this.distortionNode.oversample = '2x';

      // 6. EXHAUST CHARACTERISTIC LOWPASS FILTER
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      if (profile.exhaustType === 'exh_hood_exit') {
        this.engineFilter.frequency.setValueAtTime(1600, t);
        this.engineFilter.Q.value = 2.8;
      } else if (profile.exhaustType === 'exh_straight_3in') {
        this.engineFilter.frequency.setValueAtTime(950, t);
        this.engineFilter.Q.value = 2.0;
      } else {
        this.engineFilter.frequency.setValueAtTime(520, t);
        this.engineFilter.Q.value = 1.2;
      }

      // 7. MASTER ENGINE GAIN
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.075, t);

      // Connect Synthesis Chain:
      // [EngineOsc] ------------+
      // [SubOsc -> SubGain] ----+-> [ThroatFilter] -> [Distortion] -> [EngineFilter] -> [EngineGain] -> Master
      // [SubBass -> BassGain] --+
      this.engineOsc.connect(this.throatFilter);
      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.throatFilter);
      this.subBassOsc.connect(this.subBassGain);
      this.subBassGain.connect(this.throatFilter);

      this.throatFilter.connect(this.distortionNode);
      this.distortionNode.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.engineBus || this.ctx.destination);

      // 8. TURBO SPOOL & JET TURBINE SYNTHESIS
      if (profile.inductionType === 'TURBO' || profile.inductionType === 'TWIN_TURBO' || profile.inductionType === 'SUPERCHARGER') {
        this.turboOsc = this.ctx.createOscillator();
        this.turboHarmonicOsc = this.ctx.createOscillator();
        this.turboFilter = this.ctx.createBiquadFilter();
        this.turboGain = this.ctx.createGain();

        if (profile.inductionType === 'SUPERCHARGER') {
          this.turboOsc.type = 'triangle';
          this.turboHarmonicOsc.type = 'sawtooth';
          this.turboFilter.type = 'bandpass';
          this.turboFilter.frequency.setValueAtTime(1400, t);
          this.turboFilter.Q.value = 4.5;
        } else {
          this.turboOsc.type = 'sine';
          this.turboHarmonicOsc.type = 'triangle';
          this.turboFilter.type = 'bandpass';
          this.turboFilter.frequency.setValueAtTime(2200, t);
          this.turboFilter.Q.value = 7.0;
        }

        this.turboGain.gain.setValueAtTime(0.0001, t);

        this.turboOsc.connect(this.turboFilter);
        this.turboHarmonicOsc.connect(this.turboFilter);
        this.turboFilter.connect(this.turboGain);
        this.turboGain.connect(this.engineBus || this.ctx.destination);

        this.turboOsc.start(t);
        this.turboHarmonicOsc.start(t);
      }

      // Calculate initial idle frequency based on cylinder pulse multiplier
      const pulseMap = { v8: 4.0, i6: 3.0, v6: 3.0, diesel: 2.0, v10: 5.0, v12: 6.0, f1: 3.5, i4: 2.0 };
      const pulseMult = pulseMap[profile.engineType] || 2.0;
      const freq = (baseRpm / 60) * pulseMult;

      this.engineOsc.frequency.setValueAtTime(Math.max(26, freq), t);
      this.subOsc.frequency.setValueAtTime(Math.max(22, freq * 1.5), t);
      this.subBassOsc.frequency.setValueAtTime(Math.max(16, freq * 0.5), t);

      this.engineOsc.start(t);
      this.subOsc.start(t);
      this.subBassOsc.start(t);
      this.engineRunning = true;
    } catch (e) {
      console.warn('Audio start failed', e);
    }
  }

  getSfxDestination() {
    return this.sfxBus || this.ctx.destination;
  }

  // --- START CUSTOM AUDIO SAMPLE (IF LOADED FROM /sounds/) ---
  startSampleEngine(baseRpm, engineType) {
    const buf = this.sampleBuffers[engineType];
    if (!buf || !this.ctx) return;

    this.usingCustomSample = true;
    this.sampleSource = this.ctx.createBufferSource();
    this.sampleSource.buffer = buf;
    this.sampleSource.loop = true;

    this.sampleGain = this.ctx.createGain();
    this.sampleGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.sampleSource.connect(this.sampleGain);
    this.sampleGain.connect(this.engineBus || this.ctx.destination);

    this.sampleSource.start();
    this.engineRunning = true;
  }

  // --- UPDATE ENGINE RPM & ACOUSTIC LOAD (PITCH, THROAT ROAR & CRACKLE) ---
  updateEngineRpm(rpm, load = 0.5, isLimiter = false) {
    if (!this.ctx || !this.engineRunning) return;

    const t = this.ctx.currentTime;

    // If using custom audio file: modulate sample playback pitch
    if (this.usingCustomSample && this.sampleSource) {
      const baseRpm = 3000;
      const rate = Math.max(0.35, Math.min(3.2, rpm / baseRpm));
      this.sampleSource.playbackRate.setTargetAtTime(rate, t, 0.04);
      if (this.sampleGain) {
        const gain = isLimiter ? 0.12 : (0.12 + load * 0.14);
        this.sampleGain.gain.setTargetAtTime(this.isMuted ? 0 : gain, t, 0.03);
      }
      return;
    }

    if (!this.engineOsc) return;

    const profile = this.soundProfile;
    const pulseMap = { v8: 4.0, i6: 3.0, v6: 3.0, diesel: 2.0, v10: 5.0, v12: 6.0, f1: 3.5, i4: 2.0 };
    const pulseMult = pulseMap[profile.engineType] || 2.0;

    // Calculate base frequency from RPM
    let targetFreq = (rpm / 60) * pulseMult;

    // V8 crossplane cam loping chop at idle (< 1150 RPM)
    if (profile.engineType === 'v8' && rpm < 1150 && !isLimiter) {
      const lopeMod = Math.sin(performance.now() * 0.026) * 0.12;
      targetFreq *= (1.0 + lopeMod);
    }

    // Limiter bounce spark-cut (ตับๆๆๆๆ)
    if (isLimiter) {
      if (Math.random() > 0.32) {
        targetFreq *= 0.82; // Rapid spark cut drop
      }
    }

    this.engineOsc.frequency.setTargetAtTime(Math.max(24, targetFreq), t, 0.03);

    // Sub-harmonic oscillator
    if (this.subOsc) {
      let subMult = 1.5;
      if (profile.engineType === 'v8') subMult = 0.5;
      else if (profile.engineType === 'i4') subMult = rpm > 5800 ? 2.4 : 1.8; // VTEC crossover
      else if (profile.engineType === 'v10' || profile.engineType === 'v12') subMult = 1.6;
      else if (profile.engineType === 'f1') subMult = 2.2;

      this.subOsc.frequency.setTargetAtTime(Math.max(18, targetFreq * subMult), t, 0.03);
    }

    // Sub-bass thumper (deep rumble)
    if (this.subBassOsc) {
      this.subBassOsc.frequency.setTargetAtTime(Math.max(14, targetFreq * 0.5), t, 0.03);
    }

    // Throat resonance filter dynamic frequency sweep
    if (this.throatFilter) {
      const baseThroat = profile.engineType === 'v8' ? 420 : (profile.engineType === 'i6' ? 540 : 480);
      const throatSweep = baseThroat + (rpm / 8000) * 450 + (load * 220);
      this.throatFilter.frequency.setTargetAtTime(throatSweep, t, 0.04);
      // Higher throat gain under wide-open throttle (raw roar!)
      this.throatFilter.gain.setTargetAtTime(6.0 + load * 7.5, t, 0.04);
    }

    // Exhaust pipe lowpass filter opening
    if (this.engineFilter) {
      let baseCutoff = 480;
      let maxCutoff = 1800;
      let gainMult = 1.0;

      if (profile.exhaustType === 'exh_hood_exit') {
        baseCutoff = 1100;
        maxCutoff = 4200;
        gainMult = 1.45;
      } else if (profile.exhaustType === 'exh_straight_3in') {
        baseCutoff = 720;
        maxCutoff = 3200;
        gainMult = 1.25;
      }

      const filterFreq = baseCutoff + (rpm / 8500) * maxCutoff + (load * 850);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.04);

      // Master volume with throttle load punch
      const targetGain = (0.055 + (load * 0.095)) * gainMult;
      this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : targetGain, t, 0.035);
    }

    // Turbocharger Spool & Supercharger Whine
    if (this.turboOsc && this.turboGain) {
      if (profile.inductionType === 'SUPERCHARGER') {
        const whineFreq = 900 + (rpm / 8500) * 3600;
        this.turboOsc.frequency.setTargetAtTime(whineFreq, t, 0.03);
        if (this.turboHarmonicOsc) {
          this.turboHarmonicOsc.frequency.setTargetAtTime(whineFreq * 1.5, t, 0.03);
        }
        const whineGain = 0.018 + (rpm / 8500) * 0.08;
        this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : whineGain, t, 0.04);
      } else {
        // High boost turbo spool
        const spoolPitch = 1800 + (rpm / 8500) * 1600 + (load * 1800);
        this.turboOsc.frequency.setTargetAtTime(spoolPitch, t, 0.05);
        if (this.turboHarmonicOsc) {
          this.turboHarmonicOsc.frequency.setTargetAtTime(spoolPitch * 1.65, t, 0.05);
        }

        const whistleVol = load > 0.12 ? ((load - 0.12) * 0.11 * (rpm / 3800)) : 0.0001;
        this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : Math.min(0.12, whistleVol), t, 0.07);
      }
    }
  }

  // --- STOP ENGINE SOUND ---
  stopEngineSound() {
    if (this.sampleSource) {
      try {
        this.sampleSource.stop();
        this.sampleSource.disconnect();
      } catch (e) {}
      this.sampleSource = null;
    }
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    if (this.subOsc) {
      try {
        this.subOsc.stop();
        this.subOsc.disconnect();
      } catch (e) {}
      this.subOsc = null;
    }
    if (this.subBassOsc) {
      try {
        this.subBassOsc.stop();
        this.subBassOsc.disconnect();
      } catch (e) {}
      this.subBassOsc = null;
    }
    if (this.turboOsc) {
      try {
        this.turboOsc.stop();
        this.turboOsc.disconnect();
      } catch (e) {}
      this.turboOsc = null;
    }
    if (this.turboHarmonicOsc) {
      try {
        this.turboHarmonicOsc.stop();
        this.turboHarmonicOsc.disconnect();
      } catch (e) {}
      this.turboHarmonicOsc = null;
    }
    this.engineRunning = false;
  }

  // --- STARTER CRANK (ติดเครื่อง) ---
  playCrankSound() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, t + i * 0.14);
      osc.frequency.exponentialRampToValueAtTime(30, t + i * 0.14 + 0.08);

      gain.gain.setValueAtTime(0.15, t + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.11);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.12);
    }
  }

  // --- TURBO BLOW-OFF VALVE & WASTEGATE FLUTTER ---
  playBlowOff(partId = null) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.sampleBuffers['blowoff']) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.sampleBuffers['blowoff'];
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      src.connect(gain);
      gain.connect(this.getSfxDestination());
      src.start();
      return;
    }

    const indId = partId || this.soundProfile?.inductionPartId;
    if (indId === 'ind_turbo_massive' || indId === 'ind_promod_twin_billet' || indId === 'ind_quad_turbo_hyper') {
      // Big turbo compressor surge flutter (sutututu!)
      this.playTurboFlutter();
      return;
    }

    // Standard atmospheric blow-off valve (ฟ่อออว์!)
    const bufferSize = this.ctx.sampleRate * 0.38;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.38);
    filter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination());

    noise.start();
  }

  // --- TURBO COMPRESSOR SURGE / FLUTTER (เสียงสับเทอร์โบลมย้อน ซู-ทู-ทู-ทู) ---
  playTurboFlutter() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const flutterCount = 5;
    const pulseInterval = 0.055;

    for (let i = 0; i < flutterCount; i++) {
      const startTime = t + i * pulseInterval;
      const duration = 0.045;

      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = 2900 - i * 260;
      const endFreq = 1600 - i * 180;
      filter.frequency.setValueAtTime(startFreq, startTime);
      filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
      filter.Q.value = 6;

      const gain = this.ctx.createGain();
      const peakVol = 0.22 * Math.pow(0.72, i);
      gain.gain.setValueAtTime(peakVol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      noise.start(startTime);
      noise.stop(startTime + duration);
    }
  }

  // --- TWO-STEP / BACKFIRE POP (เสียงปังๆ ระเบิดท่อไอเสีย) ---
  playBackfire() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.sampleBuffers['backfire']) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.sampleBuffers['backfire'];
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      src.connect(gain);
      gain.connect(this.getSfxDestination());
      src.start();
      return;
    }

    const t = this.ctx.currentTime;

    // 1. Acoustic low-end combustion shockwave
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.11);

    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(oscGain);
    oscGain.connect(this.getSfxDestination());

    osc.start(t);
    osc.stop(t + 0.11);

    // 2. High-energy flame crackle burst
    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.08), this.ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < nData.length; i++) {
      nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.018));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, t);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.getSfxDestination());

    noiseSrc.start(t);
  }

  // --- NITROUS HISS (เสียงฉีดไนตรัส) ---
  playNitrous() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination());

    noise.start();
  }

  // --- GEAR SHIFT CLUNK (เสียงเข้าเกียร์) ---
  playShiftSound() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    osc.start(t);
    osc.stop(t + 0.06);
  }

  // --- TIRE BURNOUT SCREECH (เสียงล้อฟรีเอี๊ยด) ---
  playBurnoutScreech() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.value = 8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination());

    noise.start();
  }

  // --- CATASTROPHIC ENGINE BLOW ---
  playEngineBlown(isBot = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.6);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());
    osc.start(t);
    osc.stop(t + 0.7);

    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getSfxDestination());
    noise.start(t);

    if (!isBot) {
      this.stopEngineSound();
    }
  }

  // --- CHRISTMAS TREE BEEPS ---
  playTreeBeep(isGreen = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGreen ? 1040 : 620, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGreen ? 0.35 : 0.15));

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    osc.start();
    osc.stop(this.ctx.currentTime + (isGreen ? 0.35 : 0.15));
  }

  // --- BUTTON CLICK ---
  playClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // --- TEST AUDIO FEEDBACK ---
  playTestSound() {
    this.ensureContext();
    this.playClick();
    setTimeout(() => {
      this.playBlowOff();
    }, 100);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

const audio = new SoundEngine();
