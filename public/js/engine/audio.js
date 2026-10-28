/**
 * Project CarTuneRacing - Realistic Multi-Layer Automotive Acoustic Synthesizer
 * Tailored Car & Engine Sound Profiles:
 * - Porsche 911 Turbo S (992): 3.8L Twin-Turbo Flat-6 Boxer (Deep boxer burble -> Metallic flat-6 howl + VTG Twin-Turbo whistle & Sport Exhaust overrun crackles)
 * - Ford Ranger 2.5 Open Cab (2004): 2.5L/3.0L Turbo Diesel Drag Pickup (Direct-injection diesel clatter, deep 4-cyl exhaust thump, Thai drag idle lope "เดินเบาหอบ", big turbo whistle & "ซู-ทู-ทู-ทู" compressor surge flutter)
 * - Swapped Engines: 2JZ-GTE Inline-6, V6 Twin-Turbo, Crossplane V8 Big-Block, NASCAR V8, 5.2L V10 GT3, 6.5L Quad-Turbo V12, 1.6L 15,000 RPM F1 V6
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

    // Multi-Layer Procedural Engine Nodes
    this.engineOsc = null;       // Bank A: Primary cylinder firing PeriodicWave
    this.subOsc = null;          // Bank B: Secondary cylinder bank / phased harmonic PeriodicWave
    this.subGain = null;
    this.subBassOsc = null;      // Crankcase / tailpipe sub-bass thump (25-110 Hz)
    this.subBassGain = null;

    // Exhaust Gas Turbulence & Combustion Pulse Layer
    this.gritNoise = null;       // Looping pink/brown exhaust turbulence buffer source
    this.gritFilter = null;      // Exhaust pipe airflow bandpass filter
    this.gritGain = null;        // Modulated exhaust gas chug / roar gain
    this.pulseModGain = null;    // Cylinder-pulse AM modulator for exhaust gas bursts

    // Mechanical Valvetrain / Diesel Direct-Injection Knock Layer
    this.knockOsc = null;        // High-pressure injector / valvetrain impulse oscillator
    this.knockFilter = null;     // Metallic clatter formant filter (1,300 - 2,600 Hz)
    this.knockGain = null;

    // Acoustic Formant & Cabinet Filters
    this.throatFilter = null;    // Primary exhaust collector formant (peaking)
    this.bodyFormant = null;     // Secondary muffler / engine bay resonance (peaking)
    this.engineFilter = null;    // Dynamic load & RPM lowpass filter
    this.distortionNode = null;  // Warm harmonic tube saturation
    this.engineGain = null;

    // Forced Induction (Turbocharger / Supercharger) Nodes
    this.turboOsc = null;
    this.turboHarmonicOsc = null;
    this.turboAirNoise = null;
    this.turboAirFilter = null;
    this.turboAirGain = null;
    this.turboGain = null;
    this.turboFilter = null;

    // Cached buffers & PeriodicWaves
    this.periodicWaves = {};
    this.pinkNoiseBuffer = null;

    // Runtime state tracking
    this.engineRunning = false;
    this.lastRpm = 900;
    this.lastLoad = 0;
    this.lastOverrunTime = 0;

    // Custom sample audio support
    this.sampleBuffers = {};
    this.sampleSource = null;
    this.sampleGain = null;
    this.usingCustomSample = false;

    // Active Car & Engine Acoustic Profile
    this.soundProfile = {
      carModel: 'car_porsche_911_turbo_s',
      engineType: 'flat6',
      exhaustType: 'exh_straight_3in',
      camType: 'head_stock',
      inductionType: 'TWIN_TURBO',
      inductionPartId: 'ind_turbo_small',
      roughIdle: false
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

      this.buildPeriodicWaves();
      this.buildPinkNoiseBuffer();
    }
  }

  // --- BUILD CUSTOM FOURIER PERIODIC WAVES FOR REALISTIC CYLINDER FIRING SPECTRA ---
  buildPeriodicWaves() {
    if (!this.ctx) return;

    const createWave = (harmonics) => {
      const n = harmonics.length + 1;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      real[0] = 0;
      imag[0] = 0;
      for (let i = 0; i < harmonics.length; i++) {
        const h = harmonics[i];
        const phase = (i * 0.37) % (Math.PI * 2);
        real[i + 1] = h * Math.cos(phase);
        imag[i + 1] = h * Math.sin(phase);
      }
      return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    };

    // 1. Porsche 911 Turbo S (3.8L Flat-6 Boxer): Deep hollow boxer pulse + rich 3rd/6th metallic overtones
    this.periodicWaves.flat6 = createWave([
      1.00, 0.86, 0.92, 0.48, 0.34, 0.68, 0.25, 0.20, 0.38, 0.14, 0.10, 0.22, 0.08, 0.06, 0.11
    ]);

    // 2. Ford Ranger 2.5 Open Cab (Turbo Diesel 4-Cyl): Heavy low-compression thump + sharp combustion edge
    this.periodicWaves.diesel = createWave([
      1.00, 0.95, 0.78, 0.62, 0.48, 0.36, 0.28, 0.22, 0.16, 0.12, 0.09, 0.07, 0.05, 0.04
    ]);

    // 3. 2JZ-GTE 3.0L Inline-6: Smooth, balanced 6-cylinder harmonic sing
    this.periodicWaves.i6 = createWave([
      0.90, 0.75, 1.00, 0.52, 0.38, 0.74, 0.28, 0.20, 0.42, 0.15, 0.12, 0.24, 0.09, 0.07
    ]);

    // 4. V6 Twin-Turbo: 60-degree V6 growl with strong 2nd & 3rd order harmonics
    this.periodicWaves.v6 = createWave([
      0.95, 0.88, 0.84, 0.55, 0.42, 0.58, 0.30, 0.22, 0.32, 0.16, 0.11, 0.18
    ]);

    // 5. Crossplane V8 Big-Block / NASCAR V8: Heavy sub-fundamental rumble & uneven firing growl
    this.periodicWaves.v8 = createWave([
      1.00, 0.92, 0.68, 0.85, 0.45, 0.38, 0.30, 0.52, 0.20, 0.15, 0.10, 0.22
    ]);

    // 6. 5.2L GT3 V10: Even/odd firing exotic howl (strong 5th & 10th harmonics)
    this.periodicWaves.v10 = createWave([
      0.85, 0.70, 0.62, 0.55, 1.00, 0.42, 0.35, 0.28, 0.24, 0.65, 0.18, 0.15, 0.12, 0.10, 0.32
    ]);

    // 7. 6.5L Quad-Turbo V12: Silky multi-cylinder symphony (strong 6th & 12th harmonics)
    this.periodicWaves.v12 = createWave([
      0.88, 0.72, 0.85, 0.50, 0.38, 1.00, 0.30, 0.24, 0.48, 0.18, 0.14, 0.62, 0.10, 0.08, 0.25
    ]);

    // 8. 1.6L Formula 1 V6 Hybrid (15,000 RPM): Razor-sharp high-revving harmonic scream
    this.periodicWaves.f1 = createWave([
      0.80, 0.75, 1.00, 0.68, 0.55, 0.88, 0.45, 0.38, 0.62, 0.30, 0.25, 0.45, 0.20, 0.18, 0.30
    ]);

    // 9. Inline-4 DOHC VTEC: Punchy 2nd-order 4-cylinder bark
    this.periodicWaves.i4 = createWave([
      1.00, 0.88, 0.64, 0.72, 0.40, 0.34, 0.22, 0.30, 0.15, 0.12, 0.08, 0.10
    ]);
  }

  // --- BUILD LOOPING PINK/BROWN EXHAUST TURBULENCE BUFFER ---
  buildPinkNoiseBuffer() {
    if (!this.ctx || this.pinkNoiseBuffer) return;
    const duration = 2.5;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kellet's pink noise filter for warm, natural exhaust gas airflow
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buffer;
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

  // --- SMOOTH ASYMMETRIC TUBE SATURATION CURVE (Warm analog harmonics, no harsh digital buzz) ---
  makeDistortionCurve(amount = 16) {
    const k = typeof amount === 'number' ? amount : 16;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const drive = 1 + k / 18;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Asymmetric soft-clipping tanh transfer function for realistic even + odd exhaust harmonics
      curve[i] = Math.tanh(x * drive + 0.08 * x * x) / Math.tanh(drive);
    }
    return curve;
  }

  // --- CONFIGURE SOUND PROFILE ACCORDING TO CAR MODEL & INSTALLED PARTS ---
  configureSound(carData) {
    const activeCar = carData || (typeof window !== 'undefined' && window.gameInstance?.playerCar) || null;
    if (!activeCar || !activeCar.parts) return;
    const parts = activeCar.parts;

    const carModel = activeCar.model || parts.model || (parts.body === 'body_ford_ranger_2004' ? 'car_ford_ranger_2004' : 'car_porsche_911_turbo_s');
    const isRangerCar = carModel === 'car_ford_ranger_2004' || parts.body === 'body_ford_ranger_2004';
    const isPorscheCar = !isRangerCar;

    const engineId = parts.engine_block || (isRangerCar ? 'block_diesel_pickup' : 'block_i4_vtec');
    const exhaustId = parts.exhaust || 'exh_straight_3in';
    const inductionId = parts.induction || 'ind_turbo_small';
    const camId = parts.head_cams || 'head_stock';

    let engineType = 'flat6';
    if (engineId === 'block_diesel_pickup') {
      engineType = 'diesel';
    } else if (engineId === 'block_i4_vtec') {
      // On Porsche 911 Turbo S, the default stock block ('block_i4_vtec') represents the stock 3.8L Flat-6 Boxer!
      engineType = isPorscheCar ? 'flat6' : 'i4';
    } else if (engineId === 'block_i6_2jz') {
      engineType = 'i6';
    } else if (engineId === 'block_v6_tt') {
      engineType = 'v6';
    } else if (engineId === 'block_v8_big' || engineId === 'block_nascar_v8') {
      engineType = 'v8';
    } else if (engineId === 'block_v10_gt3') {
      engineType = 'v10';
    } else if (engineId === 'block_v12_quad_turbo') {
      engineType = 'v12';
    } else if (engineId === 'block_f1_hybrid_v6') {
      engineType = 'f1';
    }

    let inductionType = 'NA';
    if (inductionId === 'ind_turbo_small' || inductionId === 'ind_turbo_massive' || inductionId === 'ind_promod_twin_billet') {
      inductionType = 'TURBO';
    } else if (inductionId === 'ind_twin_turbo' || inductionId === 'ind_quad_turbo_hyper') {
      inductionType = 'TWIN_TURBO';
    } else if (inductionId === 'ind_supercharger' || inductionId === 'ind_top_fuel_supercharger') {
      inductionType = 'SUPERCHARGER';
    }

    const roughIdle = camId !== 'head_stock' || engineType === 'v8' || engineType === 'diesel';

    this.soundProfile = {
      carModel,
      isRangerCar,
      isPorscheCar,
      engineType,
      exhaustType: exhaustId,
      camType: camId,
      inductionType,
      inductionPartId: inductionId,
      roughIdle
    };

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
            loaded = true;
            break;
          }
        } catch (e) {}
      }
      if (!loaded) this.sampleBuffers[item.key] = null;
    }
  }

  // --- START MULTI-LAYER REALISTIC ENGINE SOUND ---
  startEngineSound(baseRpm = 900, carData = null) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.engineRunning) {
      this.stopEngineSound();
    }

    this.configureSound(carData);

    try {
      const t = this.ctx.currentTime;
      const profile = this.soundProfile;
      this.lastRpm = baseRpm;
      this.lastLoad = 0.1;

      // 1. Check if custom recorded audio sample is available
      if (this.sampleBuffers[profile.engineType]) {
        this.startSampleEngine(baseRpm, profile.engineType);
        return;
      }

      this.usingCustomSample = false;
      if (!this.periodicWaves[profile.engineType]) {
        this.buildPeriodicWaves();
      }
      if (!this.pinkNoiseBuffer) {
        this.buildPinkNoiseBuffer();
      }

      const customWave = this.periodicWaves[profile.engineType] || this.periodicWaves.flat6;

      // =========================================================================
      // LAYER 1: DUAL-BANK CUSTOM PERIODIC-WAVE CYLINDER COMBUSTION CORE
      // =========================================================================
      this.engineOsc = this.ctx.createOscillator();
      this.subOsc = this.ctx.createOscillator();
      this.subGain = this.ctx.createGain();

      if (customWave) {
        this.engineOsc.setPeriodicWave(customWave);
        this.subOsc.setPeriodicWave(customWave);
      } else {
        this.engineOsc.type = 'sawtooth';
        this.subOsc.type = 'sawtooth';
      }

      // =========================================================================
      // LAYER 2: CRANKCASE & TAILPIPE SUB-BASS THUMP (Deep 25 - 110 Hz physical feel)
      // =========================================================================
      this.subBassOsc = this.ctx.createOscillator();
      this.subBassOsc.type = 'sine';
      this.subBassGain = this.ctx.createGain();

      // Configure Bank B detune & sub-bass weight per car/engine
      if (profile.engineType === 'flat6') {
        // Porsche 911 Turbo S 3.8L Flat-6 Boxer: Opposing cylinder banks with deep boxer burble
        this.subOsc.detune.setValueAtTime(11, t);
        this.subGain.gain.setValueAtTime(0.65, t);
        this.subBassGain.gain.setValueAtTime(0.42, t);
      } else if (profile.engineType === 'diesel') {
        // Ford Ranger 2.5 Open Cab Turbo Diesel: Heavy compression thump & deep torque pulse
        this.subOsc.detune.setValueAtTime(-16, t);
        this.subGain.gain.setValueAtTime(0.75, t);
        this.subBassGain.gain.setValueAtTime(0.58, t);
      } else if (profile.engineType === 'v8') {
        // V8 Crossplane Big-Block / NASCAR: Iconic uneven bank rumble
        this.subOsc.detune.setValueAtTime(-19, t);
        this.subGain.gain.setValueAtTime(0.80, t);
        this.subBassGain.gain.setValueAtTime(0.55, t);
      } else if (profile.engineType === 'i6') {
        // 2JZ-GTE 3.0L Inline-6: Smooth chorus harmonic howl
        this.subOsc.detune.setValueAtTime(8, t);
        this.subGain.gain.setValueAtTime(0.60, t);
        this.subBassGain.gain.setValueAtTime(0.36, t);
      } else if (profile.engineType === 'v10' || profile.engineType === 'v12') {
        // Exotic V10 / V12: Dual-bank harmonic choir
        this.subOsc.detune.setValueAtTime(14, t);
        this.subGain.gain.setValueAtTime(0.68, t);
        this.subBassGain.gain.setValueAtTime(0.34, t);
      } else if (profile.engineType === 'f1') {
        // Formula 1 15,000 RPM V6
        this.subOsc.detune.setValueAtTime(18, t);
        this.subGain.gain.setValueAtTime(0.55, t);
        this.subBassGain.gain.setValueAtTime(0.22, t);
      } else {
        // Inline-4 DOHC VTEC
        this.subOsc.detune.setValueAtTime(-9, t);
        this.subGain.gain.setValueAtTime(0.55, t);
        this.subBassGain.gain.setValueAtTime(0.32, t);
      }

      // =========================================================================
      // LAYER 3: PULSED EXHAUST GAS TURBULENCE (Chugging exhaust air bursts)
      // =========================================================================
      if (this.pinkNoiseBuffer) {
        this.gritNoise = this.ctx.createBufferSource();
        this.gritNoise.buffer = this.pinkNoiseBuffer;
        this.gritNoise.loop = true;

        this.gritFilter = this.ctx.createBiquadFilter();
        this.gritFilter.type = 'bandpass';
        this.gritFilter.frequency.setValueAtTime(profile.engineType === 'diesel' ? 260 : 340, t);
        this.gritFilter.Q.value = 1.4;

        this.gritGain = this.ctx.createGain();
        this.gritGain.gain.setValueAtTime(profile.engineType === 'diesel' ? 0.55 : 0.38, t);

        this.gritNoise.connect(this.gritFilter);
        this.gritFilter.connect(this.gritGain);
      }

      // =========================================================================
      // LAYER 4: DIRECT-INJECTION DIESEL CLATTER / MECHANICAL VALVETRAIN LAYER
      // =========================================================================
      this.knockOsc = this.ctx.createOscillator();
      this.knockOsc.type = 'sawtooth';
      this.knockFilter = this.ctx.createBiquadFilter();
      this.knockFilter.type = 'bandpass';
      // Diesel direct-injection clatter sits around 1,650 Hz; Porsche flat-6 mechanical chain/valvetrain around 2,100 Hz
      const knockFreq = profile.engineType === 'diesel' ? 1650 : (profile.engineType === 'flat6' ? 2100 : 1850);
      this.knockFilter.frequency.setValueAtTime(knockFreq, t);
      this.knockFilter.Q.value = profile.engineType === 'diesel' ? 5.5 : 3.5;

      this.knockGain = this.ctx.createGain();
      const baseKnockVol = profile.engineType === 'diesel' ? 0.042 : 0.012;
      this.knockGain.gain.setValueAtTime(baseKnockVol, t);

      this.knockOsc.connect(this.knockFilter);
      this.knockFilter.connect(this.knockGain);

      // =========================================================================
      // LAYER 5: ACOUSTIC HEADER & MUFFLER RESONANCE FILTER BANK
      // =========================================================================
      // Primary Exhaust Header Formant
      this.throatFilter = this.ctx.createBiquadFilter();
      this.throatFilter.type = 'peaking';
      const throatFreqMap = {
        flat6: 240,  // Deep Porsche boxer collector resonance
        diesel: 165, // Heavy Ford Ranger 2.5/3.0L diesel exhaust chest thump
        v8: 190,
        i6: 310,
        v6: 280,
        v10: 440,
        v12: 390,
        f1: 620,
        i4: 290
      };
      this.throatFilter.frequency.setValueAtTime(throatFreqMap[profile.engineType] || 260, t);
      this.throatFilter.Q.value = 1.6;
      this.throatFilter.gain.setValueAtTime(7.0, t);

      // Secondary Engine Bay / Tailpipe Metallic Formant
      this.bodyFormant = this.ctx.createBiquadFilter();
      this.bodyFormant.type = 'peaking';
      const bodyFreqMap = {
        flat6: 720,  // Iconic Porsche flat-6 metallic wail band
        diesel: 420, // Thick diesel straight-pipe midrange ("ท่อหน้าเพลา")
        v8: 520,
        i6: 780,
        v6: 650,
        v10: 1050,
        v12: 960,
        f1: 1450,
        i4: 680
      };
      this.bodyFormant.frequency.setValueAtTime(bodyFreqMap[profile.engineType] || 680, t);
      this.bodyFormant.Q.value = 2.0;
      this.bodyFormant.gain.setValueAtTime(5.0, t);

      // Warm Tube Saturation (WaveShaper)
      this.distortionNode = this.ctx.createWaveShaper();
      const distAmount = (profile.exhaustType === 'exh_hood_exit') ? 26 : (profile.exhaustType === 'exh_straight_3in' ? 18 : 10);
      this.distortionNode.curve = this.makeDistortionCurve(distAmount);
      this.distortionNode.oversample = '2x';

      // Dynamic Exhaust Lowpass Filter (Removes harsh high-frequency synth buzz!)
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      const initialCutoff = profile.engineType === 'diesel' ? 360 : (profile.engineType === 'flat6' ? 440 : 420);
      this.engineFilter.frequency.setValueAtTime(initialCutoff, t);
      this.engineFilter.Q.value = 1.1;

      // Master Engine Gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.11, t);

      // Connect Main Engine Audio Graph:
      this.engineOsc.connect(this.throatFilter);
      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.throatFilter);

      if (this.gritGain) {
        this.gritGain.connect(this.throatFilter);
      }

      this.throatFilter.connect(this.bodyFormant);
      this.bodyFormant.connect(this.distortionNode);
      this.distortionNode.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);

      // Connect Sub-Bass & Mechanical Knock directly to Engine Gain so sub-bass stays clean & deep
      this.subBassOsc.connect(this.subBassGain);
      this.subBassGain.connect(this.engineGain);
      this.knockGain.connect(this.engineGain);

      this.engineGain.connect(this.engineBus || this.ctx.destination);

      // =========================================================================
      // LAYER 6: TURBOCHARGER WHISTLE & PRESSURIZED AIR SPOOL
      // =========================================================================
      if (profile.inductionType === 'TURBO' || profile.inductionType === 'TWIN_TURBO' || profile.inductionType === 'SUPERCHARGER') {
        this.turboOsc = this.ctx.createOscillator();
        this.turboHarmonicOsc = this.ctx.createOscillator();
        this.turboFilter = this.ctx.createBiquadFilter();
        this.turboGain = this.ctx.createGain();

        if (profile.inductionType === 'SUPERCHARGER') {
          this.turboOsc.type = 'triangle';
          this.turboHarmonicOsc.type = 'sawtooth';
          this.turboFilter.type = 'bandpass';
          this.turboFilter.frequency.setValueAtTime(1350, t);
          this.turboFilter.Q.value = 5.0;
        } else {
          // Real turbocharger compressor blade whistle (Ford Ranger big diesel turbo whistle / Porsche VTG twin-turbo)
          this.turboOsc.type = 'sine';
          this.turboHarmonicOsc.type = 'sine';
          this.turboFilter.type = 'bandpass';
          this.turboFilter.frequency.setValueAtTime(profile.engineType === 'diesel' ? 2400 : 2800, t);
          this.turboFilter.Q.value = 8.5;
        }

        // Idle turbo whistle (Ranger diesel straight-pipe has a distinct faint turbo whistle even near idle!)
        const idleTurboVol = profile.engineType === 'diesel' ? 0.008 : 0.0005;
        this.turboGain.gain.setValueAtTime(idleTurboVol, t);

        this.turboOsc.connect(this.turboFilter);
        this.turboHarmonicOsc.connect(this.turboFilter);
        this.turboFilter.connect(this.turboGain);
        this.turboGain.connect(this.engineBus || this.ctx.destination);

        this.turboOsc.start(t);
        this.turboHarmonicOsc.start(t);
      }

      // Calculate initial cylinder firing frequency
      // 4-stroke firing pulses per revolution = cylinders / 2
      const pulseMap = {
        flat6: 3.0,  // 6-cyl Boxer = 3 firing pulses/rev
        diesel: 2.0, // 4-cyl Turbo Diesel = 2 firing pulses/rev
        i4: 2.0,
        i6: 3.0,
        v6: 3.0,
        v8: 4.0,
        v10: 5.0,
        v12: 6.0,
        f1: 3.0
      };
      const pulseMult = pulseMap[profile.engineType] || 3.0;
      const freq = Math.max(22, (baseRpm / 60) * pulseMult);

      // Cold-start ignition flare! (Starts slightly higher as cylinders catch fire, then settles to idle)
      const flareFreq = freq * 1.48;
      this.engineOsc.frequency.setValueAtTime(flareFreq, t);
      this.engineOsc.frequency.exponentialRampToValueAtTime(freq, t + 0.38);

      this.subOsc.frequency.setValueAtTime(flareFreq * 0.5, t);
      this.subOsc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.38);

      this.subBassOsc.frequency.setValueAtTime(Math.max(18, flareFreq * 0.5), t);
      this.subBassOsc.frequency.exponentialRampToValueAtTime(Math.max(18, freq * 0.5), t + 0.38);

      this.knockOsc.frequency.setValueAtTime(flareFreq * 2.0, t);
      this.knockOsc.frequency.exponentialRampToValueAtTime(freq * 2.0, t + 0.38);

      this.engineOsc.start(t);
      this.subOsc.start(t);
      this.subBassOsc.start(t);
      this.knockOsc.start(t);
      if (this.gritNoise) {
        this.gritNoise.start(t);
      }

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

  // --- UPDATE ENGINE RPM & ACOUSTIC LOAD IN REAL TIME ---
  updateEngineRpm(rpm, load = 0.5, isLimiter = false) {
    if (!this.ctx || !this.engineRunning) return;

    const t = this.ctx.currentTime;
    const nowMs = performance.now();

    // Detect sudden throttle lift-off from high RPM for realistic Porsche Sport Exhaust burbles!
    if (this.lastLoad > 0.45 && load < 0.12 && rpm > 3200 && nowMs - this.lastOverrunTime > 420) {
      this.lastOverrunTime = nowMs;
      if (this.soundProfile.engineType === 'flat6' || this.soundProfile.engineType === 'v8' || this.soundProfile.engineType === 'v10' || this.soundProfile.engineType === 'i6') {
        this.playOverrunBurbles();
      }
    }
    this.lastRpm = rpm;
    this.lastLoad = load;

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
    const pulseMap = {
      flat6: 3.0,
      diesel: 2.0,
      i4: 2.0,
      i6: 3.0,
      v6: 3.0,
      v8: 4.0,
      v10: 5.0,
      v12: 6.0,
      f1: 3.0
    };
    const pulseMult = pulseMap[profile.engineType] || 3.0;

    // Calculate fundamental cylinder firing frequency (Hz)
    let targetFreq = (rpm / 60) * pulseMult;

    // 1. REALISTIC IDLE LOPE & CAMSHAFT CHOP
    if (rpm < 1200 && !isLimiter) {
      if (profile.engineType === 'diesel') {
        // Ford Ranger 2.5/3.0L Thai Drag Diesel rhythmic governor idle lope ("หอบๆ")
        const lopeDepth = profile.camType !== 'head_stock' ? 0.13 : 0.065;
        const dieselLope = Math.sin(nowMs * 0.032) * lopeDepth + Math.sin(nowMs * 0.064) * (lopeDepth * 0.4);
        targetFreq *= (1.0 + dieselLope);
      } else if (profile.engineType === 'v8') {
        // Crossplane V8 lumpy cam chop
        const v8Lope = (Math.sin(nowMs * 0.038) + 0.5 * Math.cos(nowMs * 0.082)) * 0.11;
        targetFreq *= (1.0 + v8Lope);
      } else if (profile.engineType === 'flat6') {
        // Porsche 911 Turbo S Boxer rhythmic flat-6 idle pulse
        const boxerPulse = Math.sin(nowMs * 0.045) * (profile.camType !== 'head_stock' ? 0.08 : 0.03);
        targetFreq *= (1.0 + boxerPulse);
      } else if (profile.roughIdle) {
        const camLope = Math.sin(nowMs * 0.040) * 0.08;
        targetFreq *= (1.0 + camLope);
      }
    }

    // 2. REV-LIMITER HARD SPARK-CUT / DIESEL GOVERNOR CUT (ตับๆๆๆๆ)
    let limiterGainCut = 1.0;
    if (isLimiter) {
      const cutCycle = Math.sin(nowMs * 0.18);
      if (cutCycle > 0.1) {
        targetFreq *= (profile.engineType === 'diesel' ? 0.88 : 0.80);
        limiterGainCut = 0.35;
      } else {
        limiterGainCut = 1.25;
      }
    }

    this.engineOsc.frequency.setTargetAtTime(Math.max(20, targetFreq), t, 0.025);

    // 3. SECONDARY CYLINDER BANK OSCILLATOR (Gives 3D multi-cylinder depth)
    if (this.subOsc) {
      let subRatio = 0.5; // Half-order crank/bank cadence for deep throaty tone
      if (profile.engineType === 'flat6') {
        // Transitions from deep 0.5x boxer burble at low RPM to 1.0x twin-bank flat-6 howl at high RPM
        subRatio = rpm > 4200 ? 1.0 : 0.5;
      } else if (profile.engineType === 'diesel') {
        subRatio = 0.5; // Heavy 4-stroke half-order diesel thump
      } else if (profile.engineType === 'v8') {
        subRatio = 0.75; // Crossplane uneven 90-degree bank cadence
      } else if (profile.engineType === 'i6') {
        subRatio = 1.0; // Unison detuned straight-6 chorus
      } else if (profile.engineType === 'v10' || profile.engineType === 'v12') {
        subRatio = 1.5; // Fifth harmonic exotic wail
      } else if (profile.engineType === 'f1') {
        subRatio = 2.0;
      } else if (profile.engineType === 'i4') {
        subRatio = rpm > 5600 ? 1.5 : 0.5; // VTEC cam crossover!
      }
      this.subOsc.frequency.setTargetAtTime(Math.max(16, targetFreq * subRatio), t, 0.025);
    }

    // 4. CRANKCASE SUB-BASS THUMP (Kept in the chest-thumping 28 - 95 Hz zone)
    if (this.subBassOsc) {
      const subBassFreq = Math.min(105, Math.max(24, targetFreq * 0.5));
      this.subBassOsc.frequency.setTargetAtTime(subBassFreq, t, 0.03);
    }

    // 5. DIRECT-INJECTION DIESEL CLATTER / MECHANICAL VALVETRAIN
    if (this.knockOsc && this.knockGain) {
      this.knockOsc.frequency.setTargetAtTime(Math.max(40, targetFreq * 2.0), t, 0.025);
      if (profile.engineType === 'diesel') {
        // Diesel injector knock is loud at idle/low RPM and under load, blending into roar at high RPM
        const rpmFade = Math.max(0.35, 1.0 - (rpm / 7500) * 0.55);
        const knockVol = (0.038 + load * 0.045) * rpmFade * limiterGainCut;
        this.knockGain.gain.setTargetAtTime(knockVol, t, 0.03);
      } else {
        // Petrol valvetrain / timing chain whirr increases with RPM
        const mechVol = (0.008 + (rpm / 9000) * 0.022 + load * 0.010) * limiterGainCut;
        this.knockGain.gain.setTargetAtTime(mechVol, t, 0.03);
      }
    }

    // 6. EXHAUST GAS TURBULENCE ROAR (Air rushing out of tailpipe)
    if (this.gritFilter && this.gritGain) {
      const gritCenter = profile.engineType === 'diesel'
        ? (220 + (rpm / 5500) * 650 + load * 320)
        : (300 + (rpm / 8500) * 1100 + load * 450);
      this.gritFilter.frequency.setTargetAtTime(gritCenter, t, 0.04);

      const gritLevel = profile.engineType === 'diesel'
        ? (0.35 + load * 0.65 + (rpm / 5500) * 0.35)
        : (0.24 + load * 0.52 + (rpm / 8500) * 0.30);
      this.gritGain.gain.setTargetAtTime(gritLevel * limiterGainCut, t, 0.035);
    }

    // 7. DYNAMIC EXHAUST COLLECTOR & METALLIC HOWL FORMANTS
    if (this.throatFilter) {
      const baseThroat = profile.engineType === 'diesel' ? 160 : (profile.engineType === 'flat6' ? 235 : 250);
      const throatSweep = baseThroat + (rpm / 8500) * 320 + (load * 140);
      this.throatFilter.frequency.setTargetAtTime(throatSweep, t, 0.04);
      this.throatFilter.gain.setTargetAtTime(5.5 + load * 6.5, t, 0.04);
    }

    if (this.bodyFormant) {
      if (profile.engineType === 'flat6') {
        // Porsche 911 Flat-6 metallic howl swells above 4,000 RPM
        const howlFreq = 640 + (rpm / 8500) * 980;
        const howlBoost = rpm > 3800 ? 7.5 + load * 4.5 : 4.0 + load * 2.5;
        this.bodyFormant.frequency.setTargetAtTime(howlFreq, t, 0.04);
        this.bodyFormant.gain.setTargetAtTime(howlBoost, t, 0.04);
      } else if (profile.engineType === 'diesel') {
        // Ford Ranger straight-pipe midrange punch
        const dieselPipeFreq = 380 + (rpm / 5500) * 480;
        this.bodyFormant.frequency.setTargetAtTime(dieselPipeFreq, t, 0.04);
        this.bodyFormant.gain.setTargetAtTime(6.0 + load * 5.5, t, 0.04);
      } else {
        const bodyFreq = 580 + (rpm / 8500) * 850;
        this.bodyFormant.frequency.setTargetAtTime(bodyFreq, t, 0.04);
        this.bodyFormant.gain.setTargetAtTime(4.5 + load * 4.5, t, 0.04);
      }
    }

    // 8. EXHAUST LOWPASS FILTER (Warm at idle, opens up into a ferocious roar under throttle & RPM)
    if (this.engineFilter && this.engineGain) {
      let baseCutoff = profile.engineType === 'diesel' ? 310 : 390;
      let rpmCutoffSpan = profile.engineType === 'diesel' ? 1450 : 2300;
      let gainMult = 1.0;

      if (profile.exhaustType === 'exh_hood_exit') {
        baseCutoff *= 1.35;
        rpmCutoffSpan *= 1.45;
        gainMult = 1.32;
      } else if (profile.exhaustType === 'exh_straight_3in') {
        baseCutoff *= 1.15;
        rpmCutoffSpan *= 1.20;
        gainMult = 1.16;
      }

      const normRpm = Math.min(1.3, rpm / (profile.engineType === 'diesel' ? 5600 : 8500));
      const filterFreq = baseCutoff + Math.pow(normRpm, 1.15) * rpmCutoffSpan + (load * 680);
      this.engineFilter.frequency.setTargetAtTime(Math.min(5500, filterFreq), t, 0.035);

      const targetGain = (0.085 + (load * 0.115)) * gainMult * limiterGainCut;
      this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : targetGain, t, 0.03);
    }

    // 9. TURBOCHARGER SPOOL WHISTLE & SUPERCHARGER WHINE
    if (this.turboOsc && this.turboGain) {
      if (profile.inductionType === 'SUPERCHARGER') {
        const whineFreq = 750 + (rpm / 8500) * 3200;
        this.turboOsc.frequency.setTargetAtTime(whineFreq, t, 0.03);
        if (this.turboHarmonicOsc) {
          this.turboHarmonicOsc.frequency.setTargetAtTime(whineFreq * 1.5, t, 0.03);
        }
        if (this.turboFilter) {
          this.turboFilter.frequency.setTargetAtTime(whineFreq, t, 0.03);
        }
        const whineGain = 0.014 + (rpm / 8500) * 0.055 + load * 0.025;
        this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : whineGain, t, 0.04);
      } else {
        // Turbocharger turbine whistle:
        // Ford Ranger 2.5/3.0L Diesel has a very distinct singing turbo whistle ("โบหวีด")
        // Porsche 911 Turbo S has a high-pitched VTG twin-turbo jet spool
        const isDiesel = profile.engineType === 'diesel';
        const spoolBase = isDiesel ? 1950 : 2300;
        const spoolRpmScale = isDiesel ? (rpm / 5200) * 1850 : (rpm / 8500) * 2100;
        const spoolPitch = spoolBase + spoolRpmScale + (load * 1100);

        this.turboOsc.frequency.setTargetAtTime(spoolPitch, t, 0.05);
        if (this.turboHarmonicOsc) {
          this.turboHarmonicOsc.frequency.setTargetAtTime(spoolPitch * 1.42, t, 0.05);
        }
        if (this.turboFilter) {
          this.turboFilter.frequency.setTargetAtTime(spoolPitch, t, 0.05);
        }

        const idleWhistle = isDiesel ? 0.008 : 0.001;
        const spoolFactor = Math.max(0, (rpm - 1300) / (isDiesel ? 3200 : 4500));
        const whistleVol = idleWhistle + (load > 0.06 ? (load * (isDiesel ? 0.068 : 0.048) * Math.min(1.3, spoolFactor)) : 0);
        this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : Math.min(0.085, whistleVol), t, 0.06);
      }
    }
  }

  // --- PORSCHE 911 SPORT EXHAUST DECELERATION OVERRUN BURBLES (เสียงถอนคันเร่งตดปุ้งปั้ง) ---
  playOverrunBurbles() {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const popCount = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < popCount; i++) {
      const delay = 0.04 + i * (0.065 + Math.random() * 0.035);
      const startTime = t + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const startFreq = 135 - i * 14 + Math.random() * 20;
      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(32, startTime + 0.075);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, startTime);

      const peakVol = 0.16 * Math.pow(0.78, i);
      gain.gain.setValueAtTime(peakVol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(startTime);
      osc.stop(startTime + 0.085);
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
    const nodesToStop = [
      'engineOsc',
      'subOsc',
      'subBassOsc',
      'knockOsc',
      'gritNoise',
      'turboOsc',
      'turboHarmonicOsc'
    ];
    for (const key of nodesToStop) {
      if (this[key]) {
        try {
          this[key].stop();
          this[key].disconnect();
        } catch (e) {}
        this[key] = null;
      }
    }
    this.engineRunning = false;
  }

  // --- REALISTIC STARTER MOTOR CRANK (เสียงไดสตาร์ทชึ่งๆ ตามคาแรคเตอร์รถ) ---
  playCrankSound() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.configureSound();
    const isDiesel = this.soundProfile?.engineType === 'diesel';
    const t = this.ctx.currentTime;

    // Diesel starter has heavy high-compression cranking pulses; Porsche flat-6 has a fast high-torque starter whine
    const crankPulses = isDiesel ? 3 : 4;
    const pulseStep = isDiesel ? 0.125 : 0.095;

    for (let i = 0; i < crankPulses; i++) {
      const start = t + i * pulseStep;
      const dur = pulseStep * 0.85;

      // 1. Compression stroke resistance thump
      const compOsc = this.ctx.createOscillator();
      const compGain = this.ctx.createGain();
      compOsc.type = 'sawtooth';
      const baseHz = isDiesel ? 52 : 74;
      compOsc.frequency.setValueAtTime(baseHz + i * 6, start);
      compOsc.frequency.exponentialRampToValueAtTime(baseHz * 0.58, start + dur);

      compGain.gain.setValueAtTime(0.16, start);
      compGain.gain.exponentialRampToValueAtTime(0.005, start + dur);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(isDiesel ? 280 : 420, start);

      compOsc.connect(lp);
      lp.connect(compGain);
      compGain.connect(this.getSfxDestination());

      compOsc.start(start);
      compOsc.stop(start + dur + 0.01);

      // 2. Electric starter gear whine harmonic
      const gearOsc = this.ctx.createOscillator();
      const gearGain = this.ctx.createGain();
      gearOsc.type = 'triangle';
      const gearHz = isDiesel ? 420 : 640;
      gearOsc.frequency.setValueAtTime(gearHz + i * 25, start);
      gearOsc.frequency.linearRampToValueAtTime(gearHz * 0.85, start + dur);

      gearGain.gain.setValueAtTime(0.045, start);
      gearGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      gearOsc.connect(gearGain);
      gearGain.connect(this.getSfxDestination());

      gearOsc.start(start);
      gearOsc.stop(start + dur + 0.01);
    }
  }

  // --- TURBO BLOW-OFF VALVE & DIESEL / BIG-TURBO FLUTTER ---
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
    const isDiesel = this.soundProfile?.engineType === 'diesel';

    // Ford Ranger Turbo Diesel & Big Turbo setups produce the iconic "ซู-ทู-ทู-ทู" compressor surge flutter!
    if (
      isDiesel ||
      indId === 'ind_turbo_massive' ||
      indId === 'ind_promod_twin_billet' ||
      indId === 'ind_quad_turbo_hyper'
    ) {
      this.playTurboFlutter();
      return;
    }

    // Porsche 911 Turbo S / Street Turbo: Crisp pneumatic diverter/blow-off valve whoosh ("ฟ่อออว์!")
    const duration = 0.36;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + duration);
    filter.Q.value = 3.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination());

    noise.start();
  }

  // --- TURBO COMPRESSOR SURGE / FLUTTER (เสียงสับโบ ซู-ทู-ทู-ทู) ---
  playTurboFlutter() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const flutterCount = 6;
    const pulseInterval = 0.052;

    for (let i = 0; i < flutterCount; i++) {
      const startTime = t + i * pulseInterval;
      const duration = 0.046;

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
      const startFreq = 2800 - i * 210;
      const endFreq = 1550 - i * 140;
      filter.frequency.setValueAtTime(startFreq, startTime);
      filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
      filter.Q.value = 6.5;

      const gain = this.ctx.createGain();
      const peakVol = 0.24 * Math.pow(0.76, i);
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

    // 1. Acoustic low-end combustion shockwave thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.11);

    const oscLp = this.ctx.createBiquadFilter();
    oscLp.type = 'lowpass';
    oscLp.frequency.setValueAtTime(520, t);

    oscGain.gain.setValueAtTime(0.42, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(oscLp);
    oscLp.connect(oscGain);
    oscGain.connect(this.getSfxDestination());

    osc.start(t);
    osc.stop(t + 0.11);

    // 2. High-energy tailpipe gunshot crack
    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.075), this.ctx.sampleRate);
    const nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < nData.length; i++) {
      nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.016));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(950, t);
    noiseFilter.Q.value = 1.4;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.34, t);

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

  // --- GEAR SHIFT MECHANICAL CLUNK / PDK FART (เสียงสับเกียร์) ---
  playShiftSound() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const isPorsche = this.soundProfile?.engineType === 'flat6';

    // Mechanical dog-box / PDK shift thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isPorsche ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isPorsche ? 210 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.055);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    osc.start(t);
    osc.stop(t + 0.065);
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

  // --- SUCCESS / PURCHASE / VICTORY CHIME ---
  playSuccess() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = t + idx * 0.065;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(start);
      osc.stop(start + 0.17);
    });
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

  // --- TEST AUDIO FEEDBACK (Plays realistic rev preview of current car!) ---
  playTestSound() {
    this.ensureContext();
    const wasRunning = this.engineRunning;
    const car = (typeof window !== 'undefined' && window.gameInstance?.playerCar) || null;
    if (!wasRunning) {
      this.startEngineSound(900, car);
      let step = 0;
      const timer = setInterval(() => {
        step++;
        if (step <= 10) {
          const rpm = 950 + step * 480;
          this.updateEngineRpm(rpm, 0.85, false);
        } else if (step <= 16) {
          const rpm = 5750 - (step - 10) * 750;
          this.updateEngineRpm(rpm, 0.0, false);
          if (step === 11) this.playBlowOff();
        } else {
          clearInterval(timer);
          if (!wasRunning) this.stopEngineSound();
        }
      }, 45);
    } else {
      this.playBlowOff();
    }
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
