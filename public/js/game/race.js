/**
 * Project CarTuneRacing - Drag Strip Race Simulation & Telemetry HUD
 */

class RaceManager {
  constructor(game) {
    this.game = game;
    this.canvas = null;
    this.ctx = null;
    this.animFrame = null;

    // Race state
    this.isActive = false;
    this.mode = 'bot'; // 'bot' or 'multiplayer'
    this.botConfig = null;
    this.wager = 100;

    // Christmas Tree & Timing
    this.treeState = 'OFF'; // 'OFF', 'PRE_STAGE', 'STAGE', 'YELLOW_1', 'YELLOW_2', 'YELLOW_3', 'GREEN', 'RED'
    this.isGreen = false;
    this.greenTimestamp = 0;
    this.falseStart = false;

    // Racers
    this.playerCar = null;
    this.opponentCar = null;
    this.opponentCars = [];
    this.numOpponents = 1;

    // Controls & Progressive Throttle state
    this.keys = {
      throttleUp: false,
      throttleDown: false,
      twoStep: false
    };
    this.playerThrottle = 0; // 0.0 to 1.0 progressive throttle level

    // Camera
    this.cameraX = 0;

    // Sync timer for multiplayer
    this.lastSyncTime = 0;
    this.blownFinishTriggered = false;
    this.finishTimer = null;

    // Track Distance Selection
    this.selectedDistance = (typeof RACE_DISTANCES !== 'undefined' && RACE_DISTANCES[0])
      ? RACE_DISTANCES[0]
      : { id: '0.25', name: '1/4 ไมล์ (402m)', miles: 0.25, meters: 402.336, prizeMultiplier: 1.0, label: '1/4 MILE' };
  }

  init() {
    this.canvas = document.getElementById('raceCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.bindControls();
  }

  bindControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault(); // Prevent page scrolling
      }

      audio.ensureContext();

      // Throttle INCREASE (W / ↑)
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.keys.throttleUp = true;
        this.checkFalseStart();
      }
      // Throttle DECREASE (S / ↓)
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.throttleDown = true;
      }
      // Gear Shift UP (Space / E)
      if (e.code === 'Space' || e.code === 'KeyE') {
        this.playerCar?.shiftUp();
      }
      // Gear Shift DOWN (Q / ShiftLeft / ShiftRight)
      if (e.code === 'KeyQ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.playerCar?.shiftDown();
      }
      // Nitrous (NOS) - support N key, KeyN, and Thai keyboard layout 'ื'
      if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N' || e.key === 'ื') {
        this.playerCar?.triggerNos();
      }
      if (e.code === 'KeyB') {
        this.keys.twoStep = true;
        this.playerCar?.setTwoStep(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.keys.throttleUp = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.keys.throttleDown = false;
      }
      if (e.code === 'KeyB') {
        this.keys.twoStep = false;
        this.playerCar?.setTwoStep(false);
      }
    });

    // On-screen Touch & Click Buttons
    const gasBtn = document.getElementById('pedalGas');
    if (gasBtn) {
      const startGas = (e) => {
        e.preventDefault();
        this.keys.throttleUp = true;
        this.checkFalseStart();
      };
      const stopGas = (e) => {
        e.preventDefault();
        this.keys.throttleUp = false;
      };
      gasBtn.addEventListener('mousedown', startGas);
      gasBtn.addEventListener('mouseup', stopGas);
      gasBtn.addEventListener('mouseleave', stopGas);
      gasBtn.addEventListener('touchstart', startGas);
      gasBtn.addEventListener('touchend', stopGas);
    }

    const brakeBtn = document.getElementById('pedalBrake');
    if (brakeBtn) {
      const startBrake = (e) => {
        e.preventDefault();
        this.keys.throttleDown = true;
      };
      const stopBrake = (e) => {
        e.preventDefault();
        this.keys.throttleDown = false;
      };
      brakeBtn.addEventListener('mousedown', startBrake);
      brakeBtn.addEventListener('mouseup', stopBrake);
      brakeBtn.addEventListener('mouseleave', stopBrake);
      brakeBtn.addEventListener('touchstart', startBrake);
      brakeBtn.addEventListener('touchend', stopBrake);
    }

    const shiftUpBtn = document.getElementById('btnShiftUp');
    if (shiftUpBtn) {
      shiftUpBtn.addEventListener('click', () => this.playerCar?.shiftUp());
    }

    const shiftDownBtn = document.getElementById('btnShiftDown');
    if (shiftDownBtn) {
      shiftDownBtn.addEventListener('click', () => this.playerCar?.shiftDown());
    }

    const nosBtn = document.getElementById('btnNos');
    if (nosBtn) {
      nosBtn.addEventListener('click', () => this.playerCar?.triggerNos());
    }

    const launchBtn = document.getElementById('btnLaunchTwoStep');
    if (launchBtn) {
      const startLaunch = (e) => {
        e.preventDefault();
        this.keys.twoStep = true;
        this.playerCar?.setTwoStep(true);
      };
      const stopLaunch = (e) => {
        e.preventDefault();
        this.keys.twoStep = false;
        this.playerCar?.setTwoStep(false);
      };
      launchBtn.addEventListener('mousedown', startLaunch);
      launchBtn.addEventListener('mouseup', stopLaunch);
      launchBtn.addEventListener('touchstart', startLaunch);
      launchBtn.addEventListener('touchend', stopLaunch);
    }
  }

  checkFalseStart() {
    if (!this.isGreen && this.treeState !== 'OFF' && this.treeState !== 'RED' && !this.keys.twoStep && this.isActive && this.playerThrottle > 0.08) {
      // Player accelerated before green light!
      this.falseStart = true;
      this.treeState = 'RED';
      audio.playTreeBeep(false);

      const alertBox = document.getElementById('raceBlownBanner');
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#dc2626';
        alertBox.innerText = '🚨 ฟาวล์! ออกตัวก่อนไฟเขียว (RED LIGHT / FALSE START)!';
      }

      // Automatically conclude the race after 1.8s so player is NOT stuck!
      setTimeout(() => {
        if (this.isActive) {
          this.concludeRace();
        }
      }, 1800);
    }
  }

  // --- START TIME TRIAL / MONEY FARMING RACE (FREE ENTRY) ---
  startTimeTrialRace(distObj = null) {
    const valid = CarSystem.validateEngine(this.game.playerCar);
    if (!valid.canStart) {
      window.showGamePopup({
        icon: '⚠️',
        title: 'เครื่องยนต์ยังไม่พร้อมสตาร์ท',
        message: `${valid.errors[0]}<br><br>กรุณากลับไปที่โรงรถ (GARAGE) เพื่อตรวจสอบและติดตั้งชิ้นส่วนที่ขาดหาย`,
        btnText: 'กลับไปโรงรถ'
      });
      return;
    }

    if (distObj) {
      this.selectedDistance = distObj;
    } else if (!this.selectedDistance) {
      this.selectedDistance = RACE_DISTANCES[0];
    }

    this.mode = 'timetrial';
    this.wager = 0; // Free entry!
    this.botConfig = {
      name: 'รถทดสอบเวลา (Pace Car)',
      stats: { shiftSkill: 0.85 }
    };

    const targetDist = this.selectedDistance.meters;
    this.playerCar = new CarPhysics(this.game.playerCar, false, null, targetDist);

    // Pace Car in upper lane
    const paceCarData = JSON.parse(JSON.stringify(DEFAULT_CAR));
    paceCarData.parts.body = 'body_hatchback';
    paceCarData.parts.engine_block = 'block_i4_vtec';
    this.opponentCar = new CarPhysics(paceCarData, true, this.botConfig, targetDist);
    this.opponentCars = [this.opponentCar];

    this.launchRaceScene();
  }

  // --- START A SINGLE PLAYER BOT RACE (SUPPORTS MULTI-BOT GRIDS) ---
  startBotRace(botIndex = 0, distObj = null, botCount = 1) {
    const valid = CarSystem.validateEngine(this.game.playerCar);
    if (!valid.canStart) {
      window.showGamePopup({
        icon: '⚠️',
        title: 'เครื่องยนต์ยังไม่พร้อมสตาร์ท',
        message: `${valid.errors[0]}<br><br>กรุณากลับไปที่โรงรถ (GARAGE) เพื่อตรวจสอบและติดตั้งชิ้นส่วนที่ขาดหาย`,
        btnText: 'กลับไปโรงรถ'
      });
      return;
    }

    if (distObj) {
      this.selectedDistance = distObj;
    } else if (!this.selectedDistance) {
      this.selectedDistance = RACE_DISTANCES[0];
    }

    this.mode = 'bot';
    this.numOpponents = botCount;
    this.botConfig = BOT_ROSTER[botIndex] || BOT_ROSTER[0];
    this.wager = this.botConfig.wager;

    if (this.game.money < this.wager) {
      window.showGamePopup({
        icon: '💰',
        title: 'เงินเดิมพันไม่เพียงพอ',
        message: `เงินในกระเป๋าของคุณมีเพียง <strong>$${this.game.money.toLocaleString()}</strong> ไม่พอวางเดิมพันสำหรับคู่แข่งนี้ (ต้องการ <strong>$${this.wager.toLocaleString()}</strong>)<br><br>💡 คุณสามารถกดปุ่ม <strong>"🌾 วิ่งซ้อมฟาร์มเงิน (FREE)"</strong> เพื่อหาเงินทุนเพิ่มได้ฟรี!`,
        btnText: 'ไปฟาร์มเงินฟรี',
        onConfirm: () => {
          this.startTimeTrialRace(this.selectedDistance);
        }
      });
      return;
    }

    // Deduct wager
    this.game.money -= this.wager;
    this.game.updateMoneyDisplay();

    // Setup racers with chosen target distance
    const targetDist = this.selectedDistance.meters;
    this.playerCar = new CarPhysics(this.game.playerCar, false, null, targetDist);

    // Helper to generate tailored car specs based on bot roster config
    const buildBotCarData = (bConf) => {
      const bData = JSON.parse(JSON.stringify(DEFAULT_CAR));
      bData.name = bConf.carName || bConf.name;
      if (bConf.bodyType) bData.parts.body = bConf.bodyType;
      if (bConf.engineType) bData.parts.engine_block = bConf.engineType;
      const hp = bConf.stats?.hp || 200;
      if (hp >= 1500) {
        bData.parts.pistons_rods = 'pistons_titanium_drag';
        bData.parts.induction = 'ind_quad_turbo_hyper';
        bData.parts.tires = 'tires_topfuel_giant';
        bData.parts.transmission = 'trans_f1_seamless';
        bData.parts.fuel_system = 'fuel_quad_methanol';
        bData.parts.cooling = 'cool_cryogenic_f1';
        bData.parts.nitrous = 'nos_hyper_quad_500';
        bData.parts.aero = 'aero_f1_drs_package';
        bData.parts.brakes = 'brake_dual_chute_hyper';
      } else if (hp >= 800) {
        bData.parts.pistons_rods = 'pistons_billet_race';
        bData.parts.induction = 'ind_promod_twin_billet';
        bData.parts.tires = 'tires_drag_slick';
        bData.parts.transmission = 'trans_dogbox_drag';
        bData.parts.fuel_system = 'fuel_twin_race';
        bData.parts.cooling = 'cool_drag_race';
        bData.parts.nitrous = 'nos_drag_150';
        bData.parts.aero = 'aero_drag_wing';
        bData.parts.brakes = 'brake_parachute';
      } else if (hp >= 400) {
        bData.parts.pistons_rods = 'pistons_forged';
        bData.parts.induction = 'ind_twin_turbo';
        bData.parts.tires = 'tires_semislick';
        bData.parts.transmission = 'trans_manual_6sp';
        bData.parts.fuel_system = 'fuel_highflow';
        bData.parts.cooling = 'cool_aluminum_dual';
        bData.parts.nitrous = 'nos_street_50';
      }
      return bData;
    };

    // 1. Primary selected bot
    this.opponentCars = [];
    const primaryBot = BOT_ROSTER[botIndex] || BOT_ROSTER[0];
    const primaryCarData = buildBotCarData(primaryBot);
    const primaryOpp = new CarPhysics(primaryCarData, true, primaryBot, targetDist);
    this.opponentCars.push(primaryOpp);

    // 2. Additional bots if botCount > 1
    if (botCount > 1) {
      const chosenIndices = [botIndex];
      for (let i = 1; i < botCount; i++) {
        let nextIdx = (botIndex + i) % BOT_ROSTER.length;
        if (chosenIndices.includes(nextIdx)) {
          for (let k = 0; k < BOT_ROSTER.length; k++) {
            if (!chosenIndices.includes(k)) {
              nextIdx = k;
              break;
            }
          }
        }
        chosenIndices.push(nextIdx);
        const nextBot = BOT_ROSTER[nextIdx];
        const nextCarData = buildBotCarData(nextBot);
        const nextOpp = new CarPhysics(nextCarData, true, nextBot, targetDist);
        this.opponentCars.push(nextOpp);
      }
    }

    this.opponentCar = this.opponentCars[0];

    this.launchRaceScene();
  }

  // --- LAUNCH RACE SCENE ---
  launchRaceScene() {
    this.isActive = true;
    this.falseStart = false;
    this.isGreen = false;
    this.cameraX = 0;
    this.treeState = 'PRE_STAGE';
    this.blownFinishTriggered = false;
    this.playerThrottle = 0;
    this.keys.throttleUp = false;
    this.keys.throttleDown = false;
    this.keys.twoStep = false;
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }

    this.game.switchView('race');

    const banner = document.getElementById('raceBlownBanner');
    if (banner) {
      banner.style.display = 'none';
      banner.innerText = '';
    }

    audio.startEngineSound(this.playerCar.stats.idleRpm, this.playerCar.carData);

    // Start Christmas tree countdown sequence
    this.runTreeSequence();

    // Start main race render loop
    let lastTime = performance.now();
    const raceLoop = (now) => {
      if (!this.isActive) return;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      this.update(dt);
      this.render();

      this.animFrame = requestAnimationFrame(raceLoop);
    };
    this.animFrame = requestAnimationFrame(raceLoop);
  }

  // --- CHRISTMAS TREE SEQUENCE ---
  runTreeSequence() {
    setTimeout(() => {
      if (!this.isActive) return;
      this.treeState = 'STAGE';
      audio.playTreeBeep(false);

      setTimeout(() => {
        if (!this.isActive) return;
        this.treeState = 'YELLOW_1';
        audio.playTreeBeep(false);

        setTimeout(() => {
          if (!this.isActive) return;
          this.treeState = 'YELLOW_2';
          audio.playTreeBeep(false);

          setTimeout(() => {
            if (!this.isActive) return;
            this.treeState = 'YELLOW_3';
            audio.playTreeBeep(false);

            setTimeout(() => {
              if (!this.isActive) return;
              if (!this.falseStart) {
                this.treeState = 'GREEN';
                this.isGreen = true;
                this.greenTimestamp = performance.now();
                audio.playTreeBeep(true);
              }
            }, 500);
          }, 500);
        }, 500);
      }, 500);
    }, 1000);
  }

  // --- MAIN PHYSICS & LOGIC UPDATE ---
  update(dt) {
    if (!this.playerCar || !this.opponentCar) return;

    // Apply progressive throttle input: W / Up raises throttle, S / Down lowers throttle
    let isBraking = false;
    if (this.keys.throttleUp) {
      this.playerThrottle = Math.min(1.0, this.playerThrottle + dt * 3.0);
      this.checkFalseStart();
    } else if (this.keys.throttleDown) {
      // Rapid throttle reduction to quickly save engine from rev limiter & redline
      this.playerThrottle = Math.max(0.0, this.playerThrottle - dt * 4.5);
      if (this.playerThrottle <= 0.05) {
        isBraking = true;
      }
    }

    if (this.playerCar.isFinished || this.playerCar.isBlown) {
      this.playerThrottle = 0;
      if (this.playerCar.isFinished) isBraking = true;
    }

    this.playerCar.setThrottle(this.playerThrottle, isBraking);

    // Step physics for all cars (allow movement if green or if false start triggered)
    const canMove = this.isGreen || this.falseStart;
    this.playerCar.update(dt, canMove);
    const oppList = (this.opponentCars && this.opponentCars.length > 0) ? this.opponentCars : (this.opponentCar ? [this.opponentCar] : []);
    for (const opp of oppList) {
      opp.update(dt, canMove);
    }

    // Audio RPM update
    audio.updateEngineRpm(
      this.playerCar.rpm,
      this.playerCar.throttle,
      this.playerCar.rpm >= this.playerCar.stats.maxRpm - 200
    );

    // Camera follows player smoothly
    const pxPerMeter = 20;
    const targetCameraX = Math.max(0, this.playerCar.distance * pxPerMeter - 120);
    this.cameraX += (targetCameraX - this.cameraX) * 0.12;

    // Update In-Race Cockpit HUD
    this.updateHUD();

    // 1. If player's engine blew before finish line, auto-conclude after 1.8s
    if (this.playerCar.isBlown && this.playerCar.blownBeforeFinish && !this.blownFinishTriggered) {
      this.blownFinishTriggered = true;
      const alertBox = document.getElementById('raceBlownBanner');
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#dc2626';
        alertBox.innerText = `💥 เครื่องยนต์พังกลางทาง: ${this.playerCar.blownReason} (DNF)!`;
      }
      setTimeout(() => {
        if (this.isActive) {
          this.concludeRace();
        }
      }, 1800);
    }

    // 2. Race finish conditions (never get stuck!)
    const pDone = this.playerCar.isFinished || (this.playerCar.isBlown && this.playerCar.speedMs <= 0.2);
    const allOppDone = oppList.length > 0 && oppList.every(opp => opp.isFinished || (opp.isBlown && opp.speedMs <= 0.2));

    if (pDone && allOppDone) {
      if (!this.finishTimer) {
        this.finishTimer = setTimeout(() => {
          this.concludeRace();
        }, 800);
      }
    } else if (pDone && !allOppDone) {
      // Player crossed line! Give opponents up to 2.8s or conclude
      if (!this.finishTimer) {
        this.finishTimer = setTimeout(() => {
          this.concludeRace();
        }, 2800);
      }
    } else if (allOppDone && !pDone && !this.playerCar.isBlown) {
      // Opponents crossed line, give player up to 4s or conclude
      if (!this.finishTimer) {
        this.finishTimer = setTimeout(() => {
          this.concludeRace();
        }, 4000);
      }
    }

    // Relay sync in multiplayer
    if (this.mode === 'multiplayer' && performance.now() - this.lastSyncTime > 40) {
      this.lastSyncTime = performance.now();
      this.game.multiplayer?.sendRaceSync(this.playerCar);
    }
  }

  // --- UPDATE TELEMETRY HUD ---
  updateHUD() {
    if (!this.playerCar) return;
    const p = this.playerCar;

    // Digital Speed & RPM
    document.getElementById('raceSpeedKmh').innerText = Math.round(p.speedKmh);
    document.getElementById('raceRpm').innerText = Math.round(p.rpm);
    document.getElementById('raceGear').innerText = p.gear;

    // Throttle Percentage Gauge
    const throttleDisplay = document.getElementById('raceThrottleVal');
    if (throttleDisplay) {
      const pct = Math.round((this.playerThrottle || 0) * 100);
      throttleDisplay.innerText = pct + '%';
      if (pct >= 90) {
        throttleDisplay.style.color = '#ef4444';
      } else if (pct >= 60) {
        throttleDisplay.style.color = '#eab308';
      } else {
        throttleDisplay.style.color = '#22c55e';
      }
    }

    // Turbo Boost Gauge
    const boostDisplay = document.getElementById('raceBoostVal');
    if (boostDisplay) {
      boostDisplay.innerText = p.currentBoost.toFixed(1) + ' Bar';
    }

    // Engine Temp Gauge
    const tempDisplay = document.getElementById('raceTempGauge');
    if (tempDisplay) {
      tempDisplay.innerText = Math.round(p.coolantTemp) + '°C';
      tempDisplay.style.color = p.coolantTemp > 110 ? '#ef4444' : '#22c55e';
    }

    // Shift Light indicator
    const shiftLight = document.getElementById('shiftLightIndicator');
    if (shiftLight) {
      const nearRedline = p.rpm >= p.stats.maxRpm * 0.94;
      shiftLight.classList.toggle('active', nearRedline);
    }

    // Distance Progress Bar & Label
    const targetMeters = this.selectedDistance?.meters || GAME_CONSTANTS.TRACK_LENGTH_METERS;
    const progress = Math.min(100, (p.distance / targetMeters) * 100);
    const progBar = document.getElementById('raceProgressBar');
    if (progBar) {
      progBar.style.width = progress + '%';
    }
    const distText = document.getElementById('raceDistMeters');
    if (distText) {
      if (targetMeters >= 1000) {
        const currKm = (p.distance / 1000).toFixed(2);
        const totalKm = (targetMeters / 1000).toFixed(2);
        distText.innerText = `${currKm} km / ${totalKm} km (${this.selectedDistance.label})`;
      } else {
        distText.innerText = `${Math.min(Math.round(targetMeters), Math.round(p.distance))}m / ${Math.round(targetMeters)}m (${this.selectedDistance.label})`;
      }
    }

    // NOS Button State
    const nosBtn = document.getElementById('btnNos');
    if (nosBtn) {
      if (p.nosActive) {
        nosBtn.innerText = `🚀 NOS กำลังฉีด... (${p.nosDurationRemaining.toFixed(1)}s)`;
        nosBtn.style.boxShadow = '0 0 14px #38bdf8';
      } else {
        nosBtn.innerText = `🚀 ไนตรัส NOS (${p.nosShotsLeft} ถัง) [N]`;
        nosBtn.style.boxShadow = '';
      }
      nosBtn.disabled = p.nosShotsLeft <= 0 || p.nosActive;
    }

    // Engine Blown Alert in Race
    if (p.isBlown) {
      const alertBox = document.getElementById('raceBlownBanner');
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.innerText = '💥 เครื่องยนต์ระเบิดพัง: ' + p.blownReason;
      }
    }
  }

  // --- RENDER DRAG STRIP CANVAS SCENE ---
  // --- RENDER DRAG STRIP CANVAS SCENE ---
  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Render Track & Parallax Background with dynamic distance
    const targetMeters = this.selectedDistance?.meters || 402.336;
    const targetLabel = this.selectedDistance?.label || '1/4 MILE';
    pixelRenderer.renderDragTrack(ctx, w, h, this.cameraX, true, this.treeState, targetMeters, targetLabel);

    const pxPerMeter = 20;
    const trackY = h * 0.65;
    const oppList = (this.opponentCars && this.opponentCars.length > 0) ? this.opponentCars : (this.opponentCar ? [this.opponentCar] : []);

    // 2. Render Opponents
    if (oppList.length <= 1) {
      // Classic 1v1 Top Lane
      if (this.opponentCar) {
        const oppScreenX = 180 + this.opponentCar.distance * pxPerMeter - this.cameraX;
        const oppScreenY = trackY + 15;

        // Label above bot car in 1v1
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        let oppLabel = this.opponentCar.botConfig?.name || 'OPPONENT';
        if (this.opponentCar.botEngineLiftReason) {
          if (this.opponentCar.botEngineLiftReason === 'CRITICAL_OVERHEAT' || this.opponentCar.botEngineLiftReason === 'COOLING_LIFT') {
            oppLabel += ' 🌡️[ลดคันเร่งคูลลิ่ง]';
          } else if (this.opponentCar.botEngineLiftReason === 'REDLINE_HOLD' || this.opponentCar.botEngineLiftReason === 'LIMITER_RELIEF') {
            oppLabel += ' ⚙️[คุมรอบไม่ให้ตัด]';
          } else if (this.opponentCar.botEngineLiftReason === 'ROD_PROTECTION') {
            oppLabel += ' 🛡️[เซฟก้านสูบ]';
          }
        }
        ctx.fillText(oppLabel, Math.max(10, oppScreenX + 8), oppScreenY - 14);

        pixelRenderer.renderCar(ctx, oppScreenX, oppScreenY, 2.4, this.opponentCar.carData, {
          isRacing: true,
          speed: this.opponentCar.speedKmh,
          wheelAngle: this.opponentCar.wheelAngle,
          isNosActive: this.opponentCar.nosActive,
          isBackfire: this.opponentCar.isBackfire,
          isOverheating: this.opponentCar.isOverheating,
          isBlown: this.opponentCar.isBlown,
          hasParachute: this.opponentCar.isFinished && (this.opponentCar.carData.parts.brakes === 'brake_parachute' || this.opponentCar.carData.parts.brakes === 'brake_dual_chute_hyper')
        });
      }
    } else {
      // Staggered multi-bot racing grid!
      const count = oppList.length;
      const laneStep = Math.min(20, 62 / count);
      for (let idx = 0; idx < count; idx++) {
        const opp = oppList[idx];
        const oppScreenX = 180 + opp.distance * pxPerMeter - this.cameraX;
        const oppScreenY = trackY + 8 + idx * laneStep;
        const oppScale = 2.0 + (idx / count) * 0.35;

        // Label above bot car with smart engine lift tag
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        let oppLabel = opp.botConfig?.name || `BOT #${idx + 1}`;
        if (opp.botEngineLiftReason) {
          if (opp.botEngineLiftReason === 'CRITICAL_OVERHEAT' || opp.botEngineLiftReason === 'COOLING_LIFT') {
            oppLabel += ' 🌡️[คูลลิ่ง]';
          } else if (opp.botEngineLiftReason === 'REDLINE_HOLD' || opp.botEngineLiftReason === 'LIMITER_RELIEF') {
            oppLabel += ' ⚙️[คุมรอบ]';
          } else if (opp.botEngineLiftReason === 'ROD_PROTECTION') {
            oppLabel += ' 🛡️[เซฟเครื่อง]';
          }
        }
        ctx.fillText(oppLabel, Math.max(10, oppScreenX + 8), oppScreenY - 14);

        pixelRenderer.renderCar(ctx, oppScreenX, oppScreenY, oppScale, opp.carData, {
          isRacing: true,
          speed: opp.speedKmh,
          wheelAngle: opp.wheelAngle,
          isNosActive: opp.nosActive,
          isBackfire: opp.isBackfire,
          isOverheating: opp.isOverheating,
          isBlown: opp.isBlown,
          hasParachute: opp.isFinished && (opp.carData.parts.brakes === 'brake_parachute' || opp.carData.parts.brakes === 'brake_dual_chute_hyper')
        });
      }
    }

    // 3. Render Player Car (Bottom Lane)
    if (this.playerCar) {
      const playerScreenX = 180 + this.playerCar.distance * pxPerMeter - this.cameraX;
      const playerScreenY = (oppList.length > 1 ? trackY + 92 : trackY + 85) - this.playerCar.wheelie * 2;

      if (oppList.length > 1) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('⭐ YOU (คุณ)', Math.max(10, playerScreenX + 12), playerScreenY - 15);
      }

      pixelRenderer.renderCar(ctx, playerScreenX, playerScreenY, 2.6, this.playerCar.carData, {
        isRacing: true,
        speed: this.playerCar.speedKmh,
        wheelAngle: this.playerCar.wheelAngle,
        isNosActive: this.playerCar.nosActive,
        isBackfire: this.playerCar.isBackfire,
        isOverheating: this.playerCar.isOverheating,
        isBlown: this.playerCar.isBlown,
        hasParachute: this.playerCar.isFinished && (this.playerCar.carData.parts.brakes === 'brake_parachute' || this.playerCar.carData.parts.brakes === 'brake_dual_chute_hyper')
      });
    }

    // 4. Render Top Track Minimap / Live Position Radar
    this.renderTrackMinimap(ctx, w, h);
  }

  // --- TOP TRACK MINIMAP / RADAR HUD (LIVE POSITION & GAP DISPLAY) ---
  renderTrackMinimap(ctx, w, h) {
    if (!this.playerCar) return;

    const targetMeters = this.selectedDistance?.meters || GAME_CONSTANTS.TRACK_LENGTH_METERS;
    const targetLabel = this.selectedDistance?.label || '1/4 MILE';
    const oppList = (this.opponentCars && this.opponentCars.length > 0) ? this.opponentCars : (this.opponentCar ? [this.opponentCar] : []);

    // Gather and sort all racers by distance
    const racers = [
      {
        name: 'YOU (คุณ)',
        shortName: 'YOU',
        isPlayer: true,
        distance: this.playerCar.distance,
        speed: this.playerCar.speedKmh,
        isBlown: this.playerCar.isBlown,
        isFinished: this.playerCar.isFinished,
        color: '#38bdf8'
      }
    ];

    const botColors = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];
    oppList.forEach((opp, i) => {
      const bName = opp.botConfig?.name || `BOT #${i + 1}`;
      const short = bName.split(' ')[0].substring(0, 8);
      racers.push({
        name: bName,
        shortName: short,
        isPlayer: false,
        distance: opp.distance,
        speed: opp.speedKmh,
        isBlown: opp.isBlown,
        isFinished: opp.isFinished,
        color: botColors[i % botColors.length]
      });
    });

    // Sort to determine current live positions
    const sortedRacers = [...racers].sort((a, b) => b.distance - a.distance);
    const playerRank = sortedRacers.findIndex(r => r.isPlayer) + 1;

    // Minimap Container Geometry
    const mapX = 40;
    const mapY = 12;
    const mapW = w - 80;
    const mapH = 54;
    const mapRadius = 8;

    // Draw Sleek Cyber HUD Background Box
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(mapX, mapY, mapW, mapH, mapRadius);
    } else {
      ctx.rect(mapX, mapY, mapW, mapH);
    }
    ctx.fill();
    ctx.stroke();

    // Header bar strip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(mapX + 2, mapY + 2, mapW - 4, 16);

    // 1. Header Text (Left: Radar Title & Track Distance, Right: Dynamic Gap Info)
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#38bdf8';
    const distStr = targetMeters >= 1000 ? `${(targetMeters / 1000).toFixed(1)} km` : `${Math.round(targetMeters)}m`;
    ctx.fillText(`📡 เรดาร์แทร็กสด (TRACK RADAR) | ระยะ: ${distStr} (${targetLabel})`, mapX + 10, mapY + 13);

    // Dynamic Overtake / Gap status on the right of header
    let gapText = '';
    let gapColor = '#94a3b8';

    if (playerRank === 1) {
      if (sortedRacers.length > 1) {
        const lead = Math.max(0, Math.round(this.playerCar.distance - sortedRacers[1].distance));
        gapText = `👑 อันดับ 1 ผู้นำ! (ทิ้งห่าง ${sortedRacers[1].shortName} +${lead}m)`;
        gapColor = '#facc15'; // Gold
      } else {
        gapText = '👑 อันดับ 1 (วิ่งเดี่ยว)';
        gapColor = '#facc15';
      }
    } else {
      const ahead = sortedRacers[playerRank - 2];
      const gap = Math.max(0, Math.round(ahead.distance - this.playerCar.distance));
      if (gap <= 4) {
        gapText = `⚔️ อันดับ ${playerRank} ตีคู่สูสี ${ahead.shortName}! (ห่าง ${gap}m)`;
        gapColor = '#f43f5e'; // Hot pink / red
      } else if (gap <= 25) {
        gapText = `⚡ อันดับ ${playerRank} จี้ท้าย ${ahead.shortName} เหลือ ${gap}m (กำลังจะแซง!)`;
        gapColor = '#38bdf8'; // Cyan
      } else {
        gapText = `🚩 อันดับ ${playerRank} ตามหลัง ${ahead.shortName} ${gap}m`;
        gapColor = '#e2e8f0';
      }
    }

    ctx.fillStyle = gapColor;
    ctx.textAlign = 'right';
    ctx.fillText(gapText, mapX + mapW - 12, mapY + 13);
    ctx.textAlign = 'left'; // Reset alignment

    // 2. Track Line Geometry
    const trackPaddingX = 35;
    const trackX = mapX + trackPaddingX;
    const trackY = mapY + 31;
    const trackW = mapW - (trackPaddingX * 2);
    const trackH = 6;

    // Track asphalt groove
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(trackX, trackY, trackW, trackH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX, trackY, trackW, trackH);

    // Center dash line
    ctx.fillStyle = '#fef08a';
    for (let dx = trackX; dx < trackX + trackW; dx += 16) {
      ctx.fillRect(dx, trackY + 2.5, 8, 1);
    }

    // Milestones (Start, 25%, 50%, 75%, Finish)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(trackX, trackY - 3, 2, trackH + 6); // Start tick
    ctx.fillRect(trackX + trackW * 0.25, trackY - 1, 1, trackH + 2);
    ctx.fillRect(trackX + trackW * 0.50, trackY - 2, 1, trackH + 4);
    ctx.fillRect(trackX + trackW * 0.75, trackY - 1, 1, trackH + 2);
    ctx.fillRect(trackX + trackW - 2, trackY - 3, 2, trackH + 6); // Finish tick

    // Start / Finish Text labels
    ctx.font = '8px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('START', mapX + 4, trackY + 6);

    ctx.fillStyle = '#22c55e';
    ctx.fillText('FINISH🏁', mapX + mapW - 32, trackY + 6);

    // 3. Render Racer Blips on the Track
    const renderBlip = (r, isPlayerCar, staggerAlt) => {
      const ratio = Math.max(0, Math.min(1, r.distance / targetMeters));
      const bx = trackX + ratio * trackW;

      if (isPlayerCar) {
        // --- PLAYER CAR BLIP (Bright Cyan glowing indicator) ---
        // Glow aura
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.arc(bx, trackY + 3, 8, 0, Math.PI * 2);
        ctx.fill();

        // Main diamond/circle icon
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(bx, trackY + 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tag below track
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#38bdf8';
        const pLabel = r.isBlown ? '💥 YOU (DNF)' : `▲ YOU (${Math.round(r.distance)}m)`;
        const textW = ctx.measureText(pLabel).width;
        const tagX = Math.max(mapX + 10, Math.min(mapX + mapW - textW - 10, bx - textW / 2));
        ctx.fillText(pLabel, tagX, trackY + 18);
      } else {
        // --- OPPONENT BLIP ---
        if (r.isBlown) {
          ctx.font = '9px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.fillText('💥', bx - 5, trackY + 6);
        } else {
          // Circle blip
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(bx, trackY + 3, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Tag above track (alternating height to prevent label overlap when close)
          const tagY = staggerAlt ? trackY - 11 : trackY - 5;
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = r.color;
          const oLabel = r.shortName;
          const textW = ctx.measureText(oLabel).width;
          const tagX = Math.max(mapX + 10, Math.min(mapX + mapW - textW - 10, bx - textW / 2));
          ctx.fillText(oLabel, tagX, tagY);
        }
      }
    };

    // Render opponents with alternating stagger to prevent text collision
    let oppIdx = 0;
    for (const r of racers) {
      if (!r.isPlayer) {
        renderBlip(r, false, oppIdx % 2 === 0);
        oppIdx++;
      }
    }

    // Render player on top
    const playerRacer = racers.find(r => r.isPlayer);
    if (playerRacer) {
      renderBlip(playerRacer, true, false);
    }

    ctx.restore();
  }

  // --- CONCLUDE RACE & DISPLAY OFFICIAL TIME SLIP ---
  concludeRace() {
    if (!this.isActive) return;
    this.isActive = false;
    audio.stopEngineSound();

    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }

    const p = this.playerCar;
    const opp = this.opponentCar;
    const oppList = (this.opponentCars && this.opponentCars.length > 0) ? this.opponentCars : (opp ? [opp] : []);
    const distName = this.selectedDistance?.name || '1/4 ไมล์';
    const distMult = this.selectedDistance?.prizeMultiplier || 1.0;

    let isPlayerWinner = false;
    let winReason = '';
    let prizeMoney = 0;
    const totalRacers = oppList.length + 1;
    const totalPot = Math.round(this.wager * totalRacers * distMult);

    if (this.mode === 'timetrial') {
      if (this.falseStart) {
        isPlayerWinner = false;
        winReason = 'ฟาวล์ออกตัวก่อนไฟเขียว! (ไม่ได้รับเงินรางวัล)';
      } else if (p.isBlown && p.blownBeforeFinish) {
        // Blown before crossing target distance = FAILED (DNF)
        isPlayerWinner = false;
        winReason = `เครื่องยนต์พังก่อนเข้าเส้นชัย (DNF: ${p.blownReason})! ไม่ได้รับเงินรางวัล`;
      } else if (p.isFinished || (p.isBlown && p.distance >= (this.selectedDistance?.meters || GAME_CONSTANTS.TRACK_LENGTH_METERS))) {
        isPlayerWinner = true;
        winReason = `ซ้อมวิ่งผ่าน ${distName} สำเร็จ! รับเงินสปอนเซอร์ x${distMult}`;

        // Time trial payout tiers
        let basePrize = 250;
        const et = p.timeQuarterMile || 12.0;
        if (et < 12.0) basePrize += 150;
        if (et < 10.0) basePrize += 350;
        if (et < 8.5) basePrize += 650;
        if (et < 7.5) basePrize += 1100;

        prizeMoney = Math.round(basePrize * distMult);
        this.game.money += prizeMoney;
      } else {
        isPlayerWinner = false;
        winReason = `วิ่งไม่ถึงเส้นชัย ${distName}!`;
      }
    } else {
      // Build standings list for all cars
      const standings = [
        { isPlayer: true, name: this.game.playerName || 'คุณ (YOU)', car: p, config: null }
      ];
      for (let i = 0; i < oppList.length; i++) {
        const o = oppList[i];
        standings.push({
          isPlayer: false,
          name: o.botConfig?.name || `คู่แข่ง #${i + 1}`,
          car: o,
          config: o.botConfig
        });
      }

      standings.sort((a, b) => {
        const aFoul = a.isPlayer && this.falseStart;
        const bFoul = b.isPlayer && this.falseStart;
        if (aFoul !== bFoul) return aFoul ? 1 : -1;

        const aBlown = a.car.isBlown && a.car.blownBeforeFinish;
        const bBlown = b.car.isBlown && b.car.blownBeforeFinish;
        if (aBlown !== bBlown) return aBlown ? 1 : -1;

        const aEt = a.car.timeQuarterMile > 0 ? a.car.timeQuarterMile : 9999;
        const bEt = b.car.timeQuarterMile > 0 ? b.car.timeQuarterMile : 9999;
        return aEt - bEt;
      });

      this.raceStandings = standings;
      const playerRank = standings.findIndex(r => r.isPlayer) + 1;

      if (this.falseStart) {
        isPlayerWinner = false;
        winReason = 'คุณฟาวล์ออกตัวก่อนไฟเขียว (RED LIGHT FOUL)!';
      } else if (p.isBlown && p.blownBeforeFinish) {
        isPlayerWinner = false;
        winReason = `เครื่องยนต์ระเบิดพังก่อนเข้าเส้นชัย (DNF: ${p.blownReason})!`;
      } else if (playerRank === 1) {
        isPlayerWinner = true;
        prizeMoney = totalPot;
        winReason = oppList.length > 1
          ? `🏆 ชนะเลิศอันดับ 1 ในศึก ${totalRacers} คัน! กวาดเงินเดิมพันทั้งหมด`
          : `คุณเข้าเส้นชัย ${distName} ก่อนคู่แข่ง!`;
        this.game.money += prizeMoney;
      } else if (playerRank === 2 && oppList.length >= 2) {
        isPlayerWinner = false;
        prizeMoney = Math.round(this.wager * 1.5 * distMult);
        winReason = `🥈 คว้าอันดับ 2 ในศึก ${totalRacers} คัน! ได้รับเงินรางวัลปลอบใจ`;
        this.game.money += prizeMoney;
      } else {
        isPlayerWinner = false;
        winReason = oppList.length > 1
          ? `คุณจบอันดับที่ ${playerRank} จากทั้งหมด ${totalRacers} คัน`
          : `คู่แข่งแตะเส้นชัย ${distName} ก่อน!`;
      }
    }

    this.game.updateMoneyDisplay();

    // Show Time Slip Modal
    this.showTimeSlip(isPlayerWinner, winReason, prizeMoney);
  }

  showTimeSlip(isWinner, winReason, prizeMoney) {
    const p = this.playerCar;
    const opp = this.opponentCar;
    const oppList = (this.opponentCars && this.opponentCars.length > 0) ? this.opponentCars : (opp ? [opp] : []);

    const modal = document.getElementById('timeSlipModal');
    if (!modal) return;

    modal.style.display = 'flex';

    const subEl = document.getElementById('slipSubDistance');
    if (subEl) {
      subEl.innerText = `${(this.selectedDistance?.name || '402 METERS').toUpperCase()} (${this.selectedDistance?.label || '1/4 MILE'}) SPEED TRIAL`;
    }

    const etLabel = document.getElementById('slipEtDistanceLabel');
    if (etLabel) {
      etLabel.innerText = `${this.selectedDistance?.label || '1/4 MILE'} ET (เวลา)`;
    }

    if (this.mode === 'timetrial') {
      document.getElementById('slipWinnerBanner').innerText = isWinner ? '🏁 ซ้อมวิ่งสำเร็จ! (COMPLETED)' : '⚠️ วิ่งไม่สำเร็จ (FAILED DNF)';
      document.getElementById('slipWinnerBanner').style.color = isWinner ? '#22c55e' : '#ef4444';
      document.getElementById('slipReason').innerText = winReason;
      document.getElementById('slipPrize').innerText = isWinner ? `+$${prizeMoney.toLocaleString()}` : '$0';
    } else {
      document.getElementById('slipWinnerBanner').innerText = isWinner ? '🏆 คุณชนะการแข่งขัน! (WINNER)' : '💀 คุณแพ้การแข่งขัน! (LOSER)';
      document.getElementById('slipWinnerBanner').style.color = isWinner ? '#22c55e' : '#ef4444';
      document.getElementById('slipReason').innerText = winReason;
      document.getElementById('slipPrize').innerText = isWinner ? `+$${prizeMoney.toLocaleString()}` : (prizeMoney > 0 ? `+$${prizeMoney.toLocaleString()}` : `-$${this.wager.toLocaleString()}`);
    }

    const singleTable = document.getElementById('slipTableSingle');
    const multiContainer = document.getElementById('slipMultiContainer');
    const multiBody = document.getElementById('slipMultiLeaderboardBody');

    if (oppList.length > 1 && this.raceStandings) {
      // Show Multi-Car Leaderboard
      if (singleTable) singleTable.style.display = 'none';
      if (multiContainer) multiContainer.style.display = 'block';

      if (multiBody) {
        multiBody.innerHTML = this.raceStandings.map((r, rankIdx) => {
          const rankNum = rankIdx + 1;
          const medal = rankNum === 1 ? '🥇 1st' : (rankNum === 2 ? '🥈 2nd' : (rankNum === 3 ? '🥉 3rd' : `${rankNum}th`));
          const isMe = r.isPlayer;
          const c = r.car;
          const isBlown = c.isBlown && c.blownBeforeFinish;
          const isFoul = isMe && this.falseStart;
          const etStr = isFoul ? 'FOUL' : (isBlown ? `DNF (${Math.round(c.distance)}m)` : (c.timeQuarterMile > 0 ? c.timeQuarterMile.toFixed(3) + 's' : '-'));
          const speedStr = (isBlown || isFoul) ? '-' : (c.finishTrapSpeed > 0 ? c.finishTrapSpeed + ' km/h' : '-');
          let statusStr = rankNum === 1 ? '<span style="color:#22c55e;font-weight:800;">WINNER 🏆</span>' : (rankNum === 2 ? '<span style="color:#facc15;">2nd Place</span>' : '<span style="color:#94a3b8;">Finish</span>');
          if (isBlown) statusStr = '<span style="color:#ef4444;">DNF เครื่องพัง</span>';
          if (isFoul) statusStr = '<span style="color:#ef4444;">ออกตัวฟาวล์</span>';

          return `
            <tr style="${isMe ? 'background: #0284c733; font-weight: 800;' : ''}">
              <td style="font-weight: 800;">${medal}</td>
              <td style="${isMe ? 'color: #38bdf8;' : ''}">${r.name}</td>
              <td>${c.carData?.name || 'Drag Racer'}</td>
              <td style="color: #fef08a;">${etStr}</td>
              <td>${speedStr}</td>
              <td>${statusStr}</td>
            </tr>
          `;
        }).join('');
      }
    } else {
      // Classic 1v1 Table
      if (singleTable) singleTable.style.display = 'table';
      if (multiContainer) multiContainer.style.display = 'none';

      // Player stats
      document.getElementById('slipPlayerName').innerText = this.game.playerName || 'YOU';
      document.getElementById('slipPlayer60ft').innerText = p.time60ft > 0 ? (p.time60ft.toFixed(3) + 's') : '-';
      document.getElementById('slipPlayer330ft').innerText = p.time330ft > 0 ? (p.time330ft.toFixed(3) + 's') : '-';
      document.getElementById('slipPlayer660ft').innerText = p.time660ft > 0 ? (p.time660ft.toFixed(3) + 's') : '-';
      document.getElementById('slipPlayerET').innerText = (p.isBlown && p.blownBeforeFinish)
        ? `DNF (${Math.round(p.distance)}m)`
        : (p.timeQuarterMile > 0 ? (p.timeQuarterMile.toFixed(3) + 's') : '-');
      document.getElementById('slipPlayerTrap').innerText = (p.isBlown && p.blownBeforeFinish)
        ? 'DNF'
        : (p.finishTrapSpeed > 0 ? (p.finishTrapSpeed + ' km/h') : '-');

      // Opponent stats
      if (opp) {
        document.getElementById('slipOppName').innerText = this.botConfig?.name || 'OPPONENT';
        document.getElementById('slipOpp60ft').innerText = opp.time60ft > 0 ? (opp.time60ft.toFixed(3) + 's') : '-';
        document.getElementById('slipOpp330ft').innerText = opp.time330ft > 0 ? (opp.time330ft.toFixed(3) + 's') : '-';
        document.getElementById('slipOpp660ft').innerText = opp.time660ft > 0 ? (opp.time660ft.toFixed(3) + 's') : '-';
        document.getElementById('slipOppET').innerText = (opp.isBlown && opp.blownBeforeFinish)
          ? `DNF (${Math.round(opp.distance)}m)`
          : (opp.timeQuarterMile > 0 ? (opp.timeQuarterMile.toFixed(3) + 's') : '-');
        document.getElementById('slipOppTrap').innerText = (opp.isBlown && opp.blownBeforeFinish)
          ? 'DNF'
          : (opp.finishTrapSpeed > 0 ? (opp.finishTrapSpeed + ' km/h') : '-');
      }
    }

    // Bind Rematch & Garage Buttons
    document.getElementById('btnSlipRematch').onclick = () => {
      modal.style.display = 'none';
      if (this.mode === 'timetrial') {
        this.startTimeTrialRace(this.selectedDistance);
      } else if (this.mode === 'bot') {
        const botIdx = BOT_ROSTER.findIndex(b => b.id === this.botConfig.id);
        this.startBotRace(botIdx >= 0 ? botIdx : 0, this.selectedDistance, this.numOpponents || 1);
      }
    };

    document.getElementById('btnSlipGarage').onclick = () => {
      modal.style.display = 'none';
      this.game.showGarage();
    };
  }
}
