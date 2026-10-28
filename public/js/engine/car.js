/**
 * Project CarTuneRacing - Modular Car Physics, Engine Diagnostics & Performance Math
 */

class CarSystem {
  // --- 1. ENGINE DIAGNOSTICS & STARTUP VALIDATION ---
  static validateEngine(carData) {
    const parts = carData.parts || {};
    const errors = [];
    const warnings = [];

    // Check 1: Engine Block
    if (!parts.engine_block || parts.engine_block === 'none' || parts.engine_block === 'eng_none') {
      errors.push('❌ ECU FAULT #00: ไม่มีบล็อกเครื่องยนต์ (No Engine Block Installed)');
    }

    // Check 2: Starter Motor & Battery
    const starterPart = CAR_PARTS.starter_battery.find(p => p.id === parts.starter_battery);
    if (!starterPart || !starterPart.canStart || parts.starter_battery === 'starter_none') {
      errors.push('❌ ECU FAULT #01: ไม่มีแบตเตอรี่ / ไดร์สตาร์ท เครื่องไม่หมุน (No Battery or Starter Motor)');
    }

    // Check 3: Ignition & Spark Plugs
    const ignPart = CAR_PARTS.ignition.find(p => p.id === parts.ignition);
    if (!ignPart || !ignPart.hasSpark || parts.ignition === 'ignition_none') {
      errors.push('❌ ECU FAULT #02: ไม่มีประกายไฟจุดระเบิด ขาดหัวเทียน/คอยล์ (No Spark Plugs / Ignition)');
    }

    // Check 4: Fuel System
    const fuelPart = CAR_PARTS.fuel_system.find(p => p.id === parts.fuel_system);
    if (!fuelPart || !fuelPart.hasFuel || parts.fuel_system === 'fuel_none') {
      errors.push('❌ ECU FAULT #03: ขาดระบบน้ำมันเชื้อเพลิง ไม่มีปั๊มติ๊ก/หัวฉีด (No Fuel Delivery System)');
    }

    // Check 5: Transmission
    if (!parts.transmission || parts.transmission === 'trans_none') {
      errors.push('❌ TRANS FAULT #04: ไม่มีชุดเกียร์ ไม่สามารถส่งกำลังลงล้อได้ (No Transmission Installed)');
    }

    // Check 6: Wheels
    if (!parts.tires) {
      errors.push('❌ CHASSIS FAULT #05: ไม่ได้ติดตั้งล้อและยาง (No Tires Installed)');
    }

    // --- WARNINGS (Engine will start, but with dangerous risks!) ---
    // Warning: Cooling
    const coolPart = CAR_PARTS.cooling.find(p => p.id === parts.cooling);
    if (!coolPart || coolPart.id === 'cool_none') {
      warnings.push('⚠️ คำเตือน ECU: ไม่มีหม้อน้ำหล่อเย็น! เครื่องจะโอเวอร์ฮีตและฝาโก่งในไม่กี่วินาที');
    }

    // Warning: Fuel support vs Calculated HP
    const stats = this.calculateStats(carData);
    if (fuelPart && fuelPart.maxFuelHp > 0 && stats.hp > fuelPart.maxFuelHp) {
      warnings.push(`⚠️ คำเตือน ECU: หัวฉีดจ่ายน้ำมันไม่ทัน! (ต้องการ ${stats.hp} HP แต่หัวฉีดรองรับแค่ ${fuelPart.maxFuelHp} HP) เสี่ยงส่วนผสมบางเครื่องเขกพัง!`);
    }

    // Warning: Rod / Piston limits
    const pistonPart = CAR_PARTS.pistons_rods.find(p => p.id === parts.pistons_rods);
    if (pistonPart && stats.hp > pistonPart.maxHpLimit) {
      warnings.push(`⚠️ คำเตือนวิกฤต: แรงม้า (${stats.hp} HP) เกินขีดจำกัดก้านสูบ (${pistonPart.maxHpLimit} HP)! เสี่ยงก้านสูบขาดทะลุเสื้อสูบ!`);
    }

    // Warning: Turbo boost vs Spark limit
    if (ignPart && stats.boostBar > ignPart.maxSparkBoost) {
      warnings.push(`⚠️ คำเตือน: บูสต์เทอร์โบ (${stats.boostBar.toFixed(1)} Bar) เกินกำลังหัวเทียน ประกายไฟจะดับกลางคัน!`);
    }

    const canStart = errors.length === 0;

    return {
      canStart,
      errors,
      warnings
    };
  }

  // --- 2. CALCULATE FULL PERFORMANCE STATS & METRICS ---
  static calculateStats(carData) {
    const parts = carData.parts || {};
    const tuning = carData.tuning || DEFAULT_CAR.tuning;

    // Lookup Base Car Model
    const carModelId = carData.model || parts.model || 'car_porsche_911_turbo_s';
    const modelInfo = (typeof CAR_CATALOG !== 'undefined') ? CAR_CATALOG.find(c => c.id === carModelId) : null;
    const baseCarWeight = modelInfo ? modelInfo.weight : 1120;
    const baseCarCd = modelInfo ? modelInfo.dragCoeff : 0.29;

    // Lookup part objects
    const block = CAR_PARTS.engine_block.find(p => p.id === parts.engine_block) || CAR_PARTS.engine_block[0];
    const head = CAR_PARTS.head_cams.find(p => p.id === parts.head_cams) || CAR_PARTS.head_cams[0];
    const pistons = CAR_PARTS.pistons_rods.find(p => p.id === parts.pistons_rods) || CAR_PARTS.pistons_rods[0];
    const induction = CAR_PARTS.induction.find(p => p.id === parts.induction) || CAR_PARTS.induction[0];
    const intercooler = CAR_PARTS.intercooler.find(p => p.id === parts.intercooler) || CAR_PARTS.intercooler[0];
    const nitrous = CAR_PARTS.nitrous.find(p => p.id === parts.nitrous) || CAR_PARTS.nitrous[0];
    const exhaust = CAR_PARTS.exhaust.find(p => p.id === parts.exhaust) || CAR_PARTS.exhaust[0];
    const trans = CAR_PARTS.transmission.find(p => p.id === parts.transmission) || CAR_PARTS.transmission[1];
    const tires = CAR_PARTS.tires.find(p => p.id === parts.tires) || CAR_PARTS.tires[0];
    const cooling = CAR_PARTS.cooling.find(p => p.id === parts.cooling) || CAR_PARTS.cooling[1];
    const fuel = CAR_PARTS.fuel_system.find(p => p.id === parts.fuel_system) || CAR_PARTS.fuel_system[1];

    // Modular Body Parts (New System)
    const frontBumper = CAR_PARTS.front_bumper?.find(p => p.id === parts.front_bumper) || { weight: 10, dragBonus: 0 };
    const sideSkirts = CAR_PARTS.side_skirts?.find(p => p.id === parts.side_skirts) || { weight: 8, dragBonus: 0 };
    const rearWing = CAR_PARTS.rear_wing?.find(p => p.id === parts.rear_wing) || CAR_PARTS.aero?.find(p => p.id === parts.aero) || { weight: 0, dragBonus: 0 };

    // Total Weight (kg)
    const totalWeight =
      baseCarWeight +
      (block.weight || 150) +
      (trans.weight || 50) +
      (tires.weight || 40) +
      (cooling.weight || 10) +
      (intercooler.weight || 0) +
      (nitrous.weight || 0) +
      (exhaust.weight || 15) +
      (frontBumper.weight || 10) +
      (sideSkirts.weight || 8) +
      (rearWing.weight || 0) +
      75; // Driver weight

    if (block.id === 'none' || !parts.engine_block || parts.engine_block === 'none' || parts.engine_block === 'eng_none') {
      return {
        hp: 0,
        torque: 0,
        weight: totalWeight,
        topSpeed: 0,
        zeroToHundred: 99.9,
        quarterMileEst: 99.9,
        engineDesc: 'ไม่มีเครื่องยนต์',
        inductionDesc: 'NA',
        boostBar: 0,
        canStart: false,
        idleRpm: 0,
        maxRpm: 0,
        cd: baseCarCd,
        dragCoeff: baseCarCd,
        gearRatios: [],
        gearSpeeds: []
      };
    }

    // Boost Calculation (Uncapped Limitless Boost)
    let boostBar = 0;
    if (induction.type !== 'NA') {
      const tunedBoost = parseFloat(tuning.wastegateBoost);
      boostBar = !isNaN(tunedBoost) ? Math.max(0, tunedBoost) : (induction.baseBoost || 0.8);
    }

    // Intercooler temperature efficiency bonus
    const icBonusHp = intercooler.tempDrop ? (intercooler.tempDrop * 0.9) : 0;

    // Advanced Engine Tuning Multipliers:
    // 1. Displacement Stroker & Bore Scale (1.0x - 10.0x+)
    const dispScale = Math.max(0.2, parseFloat(tuning.displacementScale) || 1.0);
    const dispMult = Math.pow(dispScale, 0.95);

    // 2. Compression Ratio CR (7.0:1 - 18.0:1+)
    const compRatio = Math.max(5.0, parseFloat(tuning.compressionRatio) || 10.0);
    const crMult = 1.0 + (compRatio - 10.0) * 0.035;

    // 3. Camshaft Duration (240° - 360°+)
    const camDuration = Math.max(200, parseFloat(tuning.camDuration) || 272);
    const camMult = 1.0 + (camDuration - 260) * 0.003;

    // 4. ECU AFR Tuning: 12.5 gives 1.05x power. Below 11 is rich. Above 14 is lean.
    const afr = parseFloat(tuning.afr) || 12.5;
    let afrPowerMult = 1.0;
    if (afr >= 12.0 && afr <= 13.0) {
      afrPowerMult = 1.05; // Sweet spot
    } else if (afr < 12.0) {
      afrPowerMult = 0.95 - (12.0 - afr) * 0.04; // Rich
    } else {
      afrPowerMult = 1.02; // Lean power but hot
    }

    // 5. Ignition timing advance: +0° to +30°
    const timingAdv = parseFloat(tuning.ignitionAdvance) || 4;
    const timingMult = 1.0 + (timingAdv * 0.008);

    // Horsepower Calculation (Limitless Engine Scaling)
    let rawHp = block.baseHp * dispMult;
    rawHp *= (head.hpMultiplier || 1.0);
    rawHp *= camMult;
    rawHp *= crMult;

    if (boostBar > 0) {
      // Linear and consistent boost power scaling
      const boostMult = 1.0 + (boostBar * 0.80);
      rawHp *= boostMult;
      rawHp += icBonusHp;
    }

    rawHp += (exhaust.flowEfficiency ? (exhaust.flowEfficiency - 1.0) * 120 : 0);
    rawHp *= afrPowerMult;
    rawHp *= timingMult;

    // Torque Calculation (Nm)
    let rawTorque = block.baseTorque * Math.pow(dispScale, 1.10);
    rawTorque *= (head.torqMultiplier || 1.0);
    rawTorque *= crMult;
    if (boostBar > 0) {
      rawTorque *= (1.0 + boostBar * 0.88);
    }
    rawTorque *= afrPowerMult;

    const totalHp = Math.round(rawHp);
    const totalTorque = Math.round(rawTorque);

    // RPM Limits (Limitless Rev Limiter)
    const blockRedline = block.redlineRpm || 7500;
    const headBonus = head.rpmBonus || 0;
    const tunedLimiter = Math.max(3000, parseFloat(tuning.revLimiterRpm) || (blockRedline + headBonus));

    // Aerodynamics & Drag
    const baseCd = modelInfo ? modelInfo.dragCoeff : 0.32;
    const aeroCdBonus = (frontBumper.dragBonus || 0) + (sideSkirts.dragBonus || 0) + (rearWing.dragBonus || 0);
    const finalCd = Math.max(0.18, baseCd + aeroCdBonus);

    // Tires Launch Traction
    const tireGrip = (tires.gripCoeff || 1.0);
    // Tire pressure tuning: Optimal drag launch pressure ~18-22 PSI
    const psi = parseFloat(tuning.tirePressurePsi) || 26;
    let psiGripMult = 1.0;
    if (psi >= 16 && psi <= 22) {
      psiGripMult = 1.15; // Low pressure contact patch
    } else if (psi > 30) {
      psiGripMult = 0.90;
    }
    const totalGrip = tireGrip * psiGripMult;

    // Transmission & Gear Speeds
    const finalDrive = parseFloat(tuning.finalDrive) || trans.finalDrive || 3.9;
    const gearRatios = [];
    const gearSpeeds = []; // Max speed in km/h at redline for each gear

    const tireCircumferenceMeters = 2.05; // Standard 26-inch drag slick circumference
    for (let g = 1; g <= (trans.gears || 4); g++) {
      // Use transmission's authentic engineered gear ratios
      const r = (trans.ratios && trans.ratios[g - 1]) || (3.5 / g);
      gearRatios.push(r);

      // Speed (km/h) = (RPM * Circumference * 60) / (Ratio * FinalDrive * 1000)
      const maxGearSpeedKmh = Math.round((tunedLimiter * tireCircumferenceMeters * 60) / (r * finalDrive * 1000));
      gearSpeeds.push(maxGearSpeedKmh);
    }

    const topGearSpeed = gearSpeeds[gearSpeeds.length - 1] || 200;

    // Aerodynamic top speed limit: P = 0.5 * rho * v^3 * Cd * A
    const frontalArea = 1.9; // m^2
    const maxAeroSpeedMs = Math.pow((totalHp * 745.7) / (0.5 * GAME_CONSTANTS.AIR_DENSITY * finalCd * frontalArea), 1 / 3);
    const maxAeroSpeedKmh = Math.round(maxAeroSpeedMs * 3.6);
    const actualTopSpeed = Math.min(topGearSpeed, maxAeroSpeedKmh);

    // Quarter Mile & 0-100 km/h Estimations
    const powerToWeight = (totalHp / totalWeight) * 1000; // HP / ton
    // Realistic drag strip estimation formula
    let qMileEst = 5.825 * Math.pow(totalWeight / Math.max(50, totalHp), 1 / 3);
    // Traction factor
    qMileEst /= Math.pow(totalGrip, 0.28);
    qMileEst = Math.max(3.8, Math.round(qMileEst * 100) / 100);

    const zeroToHundred = Math.max(0.6, Math.round((2800 / (powerToWeight * totalGrip)) * 10) / 10);
    const trapSpeedKmh = Math.round(Math.min(actualTopSpeed, 225 * Math.pow(totalHp / totalWeight, 1 / 3) * 1.609));

    // Engine & Induction description
    let engineDesc = block.name;
    if (dispScale !== 1.0) {
      engineDesc += ` (${(block.displacement * dispScale).toFixed(1)}L Stroker)`;
    }
    let inductionDesc = induction.name;
    if (boostBar > 0) {
      inductionDesc += ` (${boostBar.toFixed(1)} Bar Boost)`;
    }
    const customNosHp = parseFloat(tuning.nitrousFlowHp) || nitrous.boostHp || 0;
    if (nitrous.shots > 0) {
      inductionDesc += ` + ${nitrous.name} [${customNosHp} HP Shot]`;
    }

    return {
      hp: totalHp,
      torque: totalTorque,
      weight: totalWeight,
      powerToWeight: Math.round(powerToWeight),
      topSpeed: actualTopSpeed,
      zeroToHundred,
      quarterMileEst: qMileEst,
      trapSpeedEst: trapSpeedKmh,
      boostBar,
      maxRpm: tunedLimiter,
      idleRpm: block.idleRpm || 900,
      gearRatios,
      gearSpeeds,
      cd: finalCd,
      grip: totalGrip,
      engineDesc,
      inductionDesc,
      pistonMaxHp: pistons.maxHpLimit,
      fuelMaxHp: fuel.maxFuelHp
    };
  }
}

// --- 3. REAL-TIME RACING PHYSICS ENGINE ---
class CarPhysics {
  constructor(carData, isBot = false, botConfig = null, targetDistance = GAME_CONSTANTS.TRACK_LENGTH_METERS) {
    this.carData = carData;
    this.isBot = isBot;
    this.botConfig = botConfig;
    this.targetDistance = targetDistance;

    this.stats = CarSystem.calculateStats(carData);
    if (this.isBot && this.botConfig?.stats) {
      const bStats = this.botConfig.stats;
      if (typeof bStats.hp === 'number') this.stats.hp = bStats.hp;
      if (typeof bStats.weight === 'number') this.stats.weight = bStats.weight;
      if (typeof bStats.grip === 'number') this.stats.grip = bStats.grip;
      if (typeof bStats.topSpeed === 'number') this.stats.topSpeed = bStats.topSpeed;
      this.stats.pistonMaxHp = Math.max(this.stats.pistonMaxHp || 500, Math.round(this.stats.hp * 1.6));
      this.stats.fuelMaxHp = Math.max(this.stats.fuelMaxHp || 500, Math.round(this.stats.hp * 1.6));
    }
    this.validation = CarSystem.validateEngine(carData);

    // Position & Movement
    this.distance = 0; // meters traveled
    this.speedMs = 0;  // m/s
    this.speedKmh = 0; // km/h
    this.acceleration = 0; // m/s^2

    // Engine Dynamics
    this.rpm = this.stats.idleRpm;
    this.gear = 1;
    this.isClutchEngaged = true;
    this.throttle = 0; // 0.0 to 1.0
    this.currentBoost = 0; // Bar

    // Two-Step & Launch Control
    this.isTwoStepActive = false;
    this.isStaging = true;

    // Nitrous
    const nosPart = CAR_PARTS.nitrous.find(p => p.id === carData.parts?.nitrous);
    this.nosActive = false;
    this.nosDuration = nosPart?.duration || 4.0;
    this.nosDurationRemaining = 0;
    this.nosShotsLeft = nosPart?.shots || 0;

    // Engine Health & Temperature
    this.coolantTemp = GAME_CONSTANTS.AMBIENT_TEMP + 45; // Start warmed up at 75°C
    this.isOverheating = false;
    this.isBlown = false;
    this.blownReason = '';
    this.limiterHoldTime = 0;
    this.botEngineLiftReason = '';

    // Visuals & Effects
    this.wheelSpin = false;
    this.isBackfire = false;
    this.wheelAngle = 0;
    this.wheelie = 0;

    // Timing Slip records
    this.time60ft = 0;
    this.time330ft = 0;
    this.time660ft = 0; // 1/8 mile
    this.timeQuarterMile = 0;
    this.finishTrapSpeed = 0;
    this.isFinished = false;
    this.blownBeforeFinish = false;
    this.raceTimer = 0;
    this.isBraking = false;
  }

  // Set throttle input
  setThrottle(val, isBraking = false) {
    if (this.isBlown) {
      this.throttle = 0;
      this.isBraking = false;
      return;
    }
    this.throttle = Math.max(0, Math.min(1, val));
    this.isBraking = isBraking;
  }

  // Trigger two-step anti-lag (holding handbrake at starting line)
  setTwoStep(active) {
    this.isTwoStepActive = active;
  }

  // Trigger nitrous
  triggerNos() {
    if (this.nosShotsLeft > 0 && !this.nosActive && !this.isBlown) {
      const nosPart = CAR_PARTS.nitrous.find(p => p.id === this.carData.parts?.nitrous);
      this.nosDuration = nosPart?.duration || 4.0;
      this.nosDurationRemaining = this.nosDuration;
      this.nosActive = true;
      this.nosShotsLeft--;
      this.setThrottle(1.0);
      audio.playNitrous();
      return true;
    }
    return false;
  }

  // Shift Up
  shiftUp() {
    const maxGears = this.stats.gearRatios.length;
    if (this.gear < maxGears && !this.isBlown) {
      this.gear++;
      audio.playShiftSound();
      if (this.stats.boostBar > 0) {
        audio.playBlowOff(this.carData.parts?.induction);
      }

      // Drop RPM based on gear ratio step
      const prevRatio = this.stats.gearRatios[this.gear - 2];
      const newRatio = this.stats.gearRatios[this.gear - 1];
      this.rpm = Math.max(this.stats.idleRpm, (this.rpm * (newRatio / prevRatio)));

      // Chance of backfire pop on shift
      if (Math.random() > 0.3) {
        this.isBackfire = true;
        audio.playBackfire();
        setTimeout(() => { this.isBackfire = false; }, 120);
      }
    }
  }

  // Shift Down
  shiftDown() {
    if (this.gear > 1 && !this.isBlown) {
      this.gear--;
      audio.playShiftSound();
      const prevRatio = this.stats.gearRatios[this.gear];
      const newRatio = this.stats.gearRatios[this.gear - 1];
      this.rpm = Math.min(this.stats.maxRpm + 500, (this.rpm * (newRatio / prevRatio)));
    }
  }

  // Main physics tick (dt in seconds)
  update(dt, isRaceGreen) {
    if (!this.validation.canStart) {
      this.rpm = 0;
      return;
    }

    if (isRaceGreen && !this.isFinished) {
      this.raceTimer += dt;
    }

    // --- 0. BOT AI AUTOMATION (Decides throttle & shifting before physics/damage) ---
    if (this.isBot && isRaceGreen && !this.isBlown) {
      this.updateBotAi(dt);
    }

    // Handle Nitrous duration
    let nosHpBonus = 0;
    if (this.nosActive) {
      this.nosDurationRemaining -= dt;
      const nosPart = CAR_PARTS.nitrous.find(p => p.id === this.carData.parts?.nitrous);
      const customFlow = parseFloat(this.carData.tuning?.nitrousFlowHp);
      nosHpBonus = (!isNaN(customFlow) && customFlow > 0) ? customFlow : (nosPart?.boostHp || 60);
      if (this.nosDurationRemaining <= 0) {
        this.nosActive = false;
        this.nosDurationRemaining = 0;
      }
    }

    // --- 1. ENGINE BLOWN & OVERHEAT DAMAGE MODEL ---
    this.updateEngineDamage(dt, nosHpBonus);

    if (this.isBlown) {
      this.throttle = 0;
      this.speedMs = Math.max(0, this.speedMs - 12 * dt); // Coast to a stop
      this.speedKmh = this.speedMs * 3.6;
      this.distance += this.speedMs * dt;
      this.rpm = Math.max(0, this.rpm - 2500 * dt);
      const tireRadiusMeters = 0.32;
      this.wheelAngle += (this.speedMs / tireRadiusMeters) * dt;
      this.recordSplits();
      return;
    }

    // --- 2. RPM & BOOST SIMULATION ---
    const ratio = this.stats.gearRatios[this.gear - 1] || 1.0;
    const finalDrive = parseFloat(this.carData.tuning?.finalDrive) || 3.9;
    const totalGearRatio = ratio * finalDrive;
    const tireRadiusMeters = 0.32; // ~26" drag tire radius

    // Turbo spool buildup
    if (this.stats.boostBar > 0) {
      const targetBoost = this.throttle * this.stats.boostBar;
      const spoolRate = (this.rpm / 4000) * 2.5;
      this.currentBoost += (targetBoost - this.currentBoost) * Math.min(1, spoolRate * dt);
    }

    if (this.isTwoStepActive && !isRaceGreen) {
      // Staging two-step anti-lag: hold RPM at Launch RPM and spool boost!
      const launchRpm = parseFloat(this.carData.tuning?.launchRpm) || 4500;
      this.rpm = launchRpm + (Math.random() - 0.5) * 200;
      this.currentBoost = Math.min(this.stats.boostBar * 0.8, this.currentBoost + dt * 1.5);

      // Pop and bang on two-step
      if (Math.random() > 0.7) {
        this.isBackfire = true;
        audio.playBackfire();
        setTimeout(() => { this.isBackfire = false; }, 80);
      }
    } else {
      // Calculate RPM from wheel speed when clutch is engaged
      const wheelRps = this.speedMs / (Math.PI * 2 * tireRadiusMeters);
      const calculatedRpm = wheelRps * totalGearRatio * 60;

      if (this.speedMs < 2.0) {
        // Free revving off the line or in staging - target RPM directly follows throttle!
        const freeRevTargetRpm = this.stats.idleRpm + (this.stats.maxRpm - this.stats.idleRpm) * Math.pow(this.throttle, 1.25);
        const revRate = (this.rpm < freeRevTargetRpm) ? 9.5 : 6.5;
        this.rpm += (freeRevTargetRpm - this.rpm) * revRate * dt;
      } else {
        // Moving in gear:
        // When throttle is reduced, engine vacuum and clutch slip pull RPM down below rev limiter
        const throttleMaxRpm = this.stats.idleRpm + (this.stats.maxRpm - this.stats.idleRpm) * (0.15 + this.throttle * 0.85);
        const targetRpm = Math.max(this.stats.idleRpm, Math.min(calculatedRpm, throttleMaxRpm));
        this.rpm += (targetRpm - this.rpm) * 12.0 * dt;
      }
    }

    // Limiter bounce & damage (only occurs if holding throttle high >= 85% at max RPM)
    if (this.rpm >= this.stats.maxRpm && this.throttle > 0.85) {
      this.rpm = this.stats.maxRpm - (Math.random() * 250);
      this.limiterHoldTime += dt;
      if (Math.random() > 0.6) {
        this.isBackfire = true;
        audio.playBackfire();
        setTimeout(() => { this.isBackfire = false; }, 70);
      }
    } else {
      this.limiterHoldTime = Math.max(0, this.limiterHoldTime - dt * 3.5);
    }

    // --- 3. FORCES & ACCELERATION ---
    if (isRaceGreen && !this.isTwoStepActive) {
      const activeHp = (this.stats.hp + nosHpBonus) * Math.min(1.0, (this.rpm / 5000));
      // Tractive Force = (HP * 745.7) / speed
      const effectiveSpeed = Math.max(4.0, this.speedMs);
      let driveForce = (activeHp * 745.7 * this.throttle) / effectiveSpeed;

      // Tire Grip limit: Maximum force tire can transmit without spinning out
      const normalForce = this.stats.weight * GAME_CONSTANTS.GRAVITY;
      const maxTireForce = normalForce * this.stats.grip;

      if (driveForce > maxTireForce) {
        this.wheelSpin = true;
        driveForce = maxTireForce * 0.88; // Kinetic friction drop
      } else {
        this.wheelSpin = false;
      }

      // Aerodynamic Drag Force: Fd = 0.5 * rho * v^2 * Cd * A
      const frontalArea = 1.9;
      const dragForce = 0.5 * GAME_CONSTANTS.AIR_DENSITY * Math.pow(this.speedMs, 2) * this.stats.cd * frontalArea;

      // Rolling Resistance: Fr = Crr * m * g
      const rollForce = 0.015 * normalForce;

      // Active Brakes Force
      const brakePart = CAR_PARTS.brakes.find(p => p.id === this.carData.parts?.brakes) || CAR_PARTS.brakes[0];
      let brakeForce = 0;
      if (this.isBraking) {
        brakeForce = this.stats.weight * 9.8 * 0.85 * (brakePart.brakeForce || 1.0);
      }

      // Engine Braking Force (When throttle is lifted at high RPM/speed)
      const wheelRps = this.speedMs / (Math.PI * 2 * tireRadiusMeters);
      const calculatedRpm = wheelRps * totalGearRatio * 60;
      const throttleMaxRpm = this.stats.idleRpm + (this.stats.maxRpm - this.stats.idleRpm) * (0.15 + this.throttle * 0.85);
      let engineBrakingForce = 0;
      if (calculatedRpm > throttleMaxRpm) {
        const overRatio = (calculatedRpm - throttleMaxRpm) / this.stats.maxRpm;
        engineBrakingForce = overRatio * this.stats.weight * 5.5 * (1.0 - this.throttle);
      }

      const netForce = driveForce - dragForce - rollForce - brakeForce - engineBrakingForce;
      this.acceleration = netForce / this.stats.weight;

      this.speedMs = Math.max(0, this.speedMs + this.acceleration * dt);
      this.speedKmh = this.speedMs * 3.6;
      this.distance += this.speedMs * dt;

      // Wheelie effect at violent launches
      if (this.acceleration > 8.0 && this.speedKmh < 90) {
        this.wheelie = Math.min(6, (this.acceleration - 8.0) * 1.5);
      } else {
        this.wheelie = Math.max(0, this.wheelie - dt * 10);
      }

      // Wheels rotation angle
      this.wheelAngle += (this.speedMs / tireRadiusMeters) * dt;

      // Record Timing Splits
      this.recordSplits();
    }

  }

  // --- SMART BOT AI BEHAVIOR (Adaptive Throttle, Overheat & Rev-Limiter Protection) ---
  updateBotAi(dt) {
    if (this.isFinished) {
      this.throttle = 0;
      this.botEngineLiftReason = '';
      return;
    }

    const reactionDelay = this.botConfig?.stats?.reactionTime || 0;
    if (this.raceTimer < reactionDelay) {
      this.throttle = 0;
      return;
    }

    const shiftSkill = this.botConfig?.stats?.shiftSkill || 0.85;
    const maxGears = this.stats.gearRatios.length;
    const maxRpm = this.stats.maxRpm;
    const isTopGear = (this.gear >= maxGears);

    let targetThrottle = 1.0;
    this.botEngineLiftReason = '';

    // 1. GEAR SHIFTING LOGIC
    // Skill determines how close to max RPM the bot shifts
    const shiftRatio = Math.min(0.97, 0.90 + shiftSkill * 0.07);
    const shiftRpm = maxRpm * shiftRatio;

    if (!isTopGear && this.rpm >= shiftRpm) {
      this.shiftUp();
    }

    // 2. REV LIMITER & REDLINE OVER-REV PROTECTION (กันรอบตัด / Valve Float)
    if (isTopGear) {
      // In highest gear, feather throttle to avoid bouncing endlessly on redline
      if (this.rpm >= maxRpm - 200) {
        const overRatio = Math.max(0, (this.rpm - (maxRpm - 200)) / 200);
        const safeThrottle = Math.max(0.68, 0.88 - overRatio * 0.22);
        targetThrottle = Math.min(targetThrottle, safeThrottle);
        this.botEngineLiftReason = 'REDLINE_HOLD';
      }
    }

    // Emergency limiter relief across any gear if limiter bounce starts accumulating
    if (this.limiterHoldTime > 0.3) {
      targetThrottle = Math.min(targetThrottle, 0.60);
      this.botEngineLiftReason = 'LIMITER_RELIEF';
    }

    // 3. OVERHEATING & COOLANT TEMP PROTECTION (กันหม้อน้ำเดือด / Gasket Blown)
    // Normal temp is 80-100°C. 105°C+ begins overheating. 125°C explodes head gasket!
    const dangerThreshold = 108 + (1.0 - shiftSkill) * 4;
    if (this.coolantTemp >= dangerThreshold) {
      if (this.coolantTemp >= 120) {
        // Critical cooling lift! Drop throttle heavily so airflow cools radiator
        targetThrottle = Math.min(targetThrottle, 0.45);
        this.botEngineLiftReason = 'CRITICAL_OVERHEAT';
      } else if (this.coolantTemp >= 114) {
        targetThrottle = Math.min(targetThrottle, 0.65);
        this.botEngineLiftReason = 'COOLING_LIFT';
      } else {
        targetThrottle = Math.min(targetThrottle, 0.80);
        this.botEngineLiftReason = 'TEMP_WARNING';
      }
    }

    // 4. CONNECTING ROD & PISTON HP OVERLOAD PROTECTION (กันก้านสูบขาด)
    // Blown rod condition: currentHp > maxSafeHp * 1.15 && boost > 1.2 && throttle > 0.8
    const maxSafeHp = this.stats.pistonMaxHp;
    if (this.stats.hp > maxSafeHp * 1.05 && this.currentBoost > 1.15) {
      // Keep throttle below the 0.80 danger threshold to protect the bottom end
      targetThrottle = Math.min(targetThrottle, 0.76);
      this.botEngineLiftReason = 'ROD_PROTECTION';
    }

    // 5. TRACTION CONTROL & LAUNCH WHEELSPIN MODULATION
    if (this.wheelSpin && this.gear === 1 && this.speedKmh < 60) {
      const tractionFeather = 0.80 + shiftSkill * 0.08;
      targetThrottle = Math.min(targetThrottle, tractionFeather);
    }

    // 6. SMART NITROUS MANAGEMENT
    const willNosBlowRods = (this.stats.hp + 80 > maxSafeHp * 1.15);
    const isTempSafeForNos = (this.coolantTemp < 108);
    const isTractionSafeForNos = (this.gear >= 2 || (this.gear === 1 && this.speedKmh >= 40));

    if (isTractionSafeForNos && isTempSafeForNos && !willNosBlowRods) {
      if (!this.nosActive && this.nosShotsLeft > 0) {
        this.triggerNos();
      }
    }

    // Smooth throttle transition
    const throttleRate = 8.0 * (0.8 + shiftSkill * 0.4);
    if (this.throttle < targetThrottle) {
      this.throttle = Math.min(targetThrottle, this.throttle + throttleRate * dt);
    } else {
      this.throttle = Math.max(targetThrottle, this.throttle - throttleRate * dt);
    }
  }

  // --- ENGINE DAMAGE & OVERHEAT SIMULATION ---
  updateEngineDamage(dt, nosHpBonus) {
    const coolingPart = CAR_PARTS.cooling.find(p => p.id === this.carData.parts.cooling) || CAR_PARTS.cooling[0];
    const coolEff = coolingPart.coolingEfficiency || 0.1;

    // Heat generation based on RPM, Boost, and NOS
    const heatGen = (this.rpm / 6000) * (1.0 + (this.currentBoost * 0.8)) * (this.nosActive ? 2.2 : 1.0) * 18;
    // Heat dissipation through radiator & airflow
    const airflowCool = (coolEff * 10) * (1.0 + (this.speedKmh / 120));

    this.coolantTemp += (heatGen - airflowCool) * dt * 0.4;
    this.coolantTemp = Math.max(GAME_CONSTANTS.AMBIENT_TEMP + 30, this.coolantTemp);

    if (this.coolantTemp > 105) {
      this.isOverheating = true;
    }

    // 1. CATASTROPHIC OVERHEAT: Temp > 125°C -> Head gasket blown!
    if (this.coolantTemp >= GAME_CONSTANTS.MAX_COOLANT_TEMP) {
      this.blowEngine('ความร้อนหม้อน้ำทะลุ 125°C! ฝาสูบโก่งและประเก็นแตก (Overheated & Blown Head Gasket)');
      return;
    }

    // 2. EXCEEDING PISTON / ROD HP LIMIT (ก้านสูบขาดทะลุเสื้อสูบ!)
    const currentHp = this.stats.hp + nosHpBonus;
    const maxSafeHp = this.stats.pistonMaxHp;
    if (currentHp > maxSafeHp * GAME_CONSTANTS.BLOWN_ROD_THRESHOLD && this.currentBoost > 1.2 && this.throttle > 0.8) {
      // Random chance of rod failure under heavy boost stress
      if (Math.random() < dt * 0.4) {
        this.blowEngine(`แรงม้า (${currentHp} HP) เกินขีดจำกัดก้านสูบ (${maxSafeHp} HP)! ก้านสูบขาดทะลุเสื้อสูบ (Thrown Rod / Blown Block)`);
        return;
      }
    }

    // 3. REDLINE LIMITER DAMAGE: Holding rev limiter > 2.5s -> Valve float
    if (this.limiterHoldTime > 2.8) {
      this.blowEngine('แช่รอบเครื่องตัด Redline นานเกินไป! วาล์วลอยลูกสูบแตก (Over-Rev Valve Float)');
      return;
    }
  }

  blowEngine(reason) {
    if (this.isBlown) return;
    this.isBlown = true;
    this.blownBeforeFinish = !this.isFinished;
    this.blownReason = reason;
    this.throttle = 0;
    audio.playEngineBlown(this.isBot);
  }

  recordSplits() {
    const d = this.distance;
    const t = this.raceTimer;

    // 60 ft = 18.288m
    if (d >= 18.288 && this.time60ft === 0) {
      this.time60ft = Math.round(t * 1000) / 1000;
    }
    // 330 ft = 100.584m
    if (d >= 100.584 && this.time330ft === 0) {
      this.time330ft = Math.round(t * 1000) / 1000;
    }
    // 1/8 mile = 201.168m
    if (d >= 201.168 && this.time660ft === 0) {
      this.time660ft = Math.round(t * 1000) / 1000;
    }
    // FINISH LINE CHECK!
    const target = this.targetDistance || GAME_CONSTANTS.TRACK_LENGTH_METERS;
    if (d >= target && !this.isFinished) {
      this.isFinished = true;
      this.timeQuarterMile = Math.round(t * 1000) / 1000;
      this.finishTrapSpeed = Math.round(this.speedKmh);
    }
  }
}
