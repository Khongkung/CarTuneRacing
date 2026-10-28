/**
 * Project CarTuneRacing - ECU Tuning Workshop & Dyno Simulator
 * Authentic Automotive Engine Calibration System
 */

class TunerUI {
  constructor(game) {
    this.game = game;
    this.dynoCanvas = null;
    this.dynoCtx = null;
    this.isDynoRunning = false;
    this.dynoProgress = 0;
  }

  init() {
    this.dynoCanvas = document.getElementById('dynoCanvas');
    if (this.dynoCanvas) {
      this.dynoCtx = this.dynoCanvas.getContext('2d');
    }
    this.bindSliders();
    this.drawDynoGraph();
  }

  bindSliders() {
    const tuning = this.game.playerCar.tuning || DEFAULT_CAR.tuning;

    // Helper for syncing slider with numeric input
    const linkParam = (sliderId, inputId, key, stepDecimals = 1) => {
      const slider = document.getElementById(sliderId);
      const input = document.getElementById(inputId);
      if (!slider || !input) return;

      const currentVal = (tuning[key] !== undefined) ? tuning[key] : DEFAULT_CAR.tuning[key];
      tuning[key] = currentVal;
      slider.value = currentVal;
      input.value = stepDecimals > 0 ? Number(currentVal).toFixed(stepDecimals) : Math.round(currentVal);

      const updateValue = (val) => {
        tuning[key] = val;
        this.game.playerCar.tuning[key] = val;
        this.game.saveData();

        // Update stats and redraw dyno
        this.game.garageUI.updateStatsHUD();
        this.drawDynoGraph();
      };

      // Slider dragging
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        input.value = stepDecimals > 0 ? val.toFixed(stepDecimals) : Math.round(val);
        updateValue(val);
      });

      // Direct number input (Allows infinite uncapped typing!)
      input.addEventListener('change', (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = DEFAULT_CAR.tuning[key] || 0;
        input.value = stepDecimals > 0 ? val.toFixed(stepDecimals) : Math.round(val);
        slider.value = val;
        updateValue(val);
      });
    };

    // 1. Boost Wastegate
    linkParam('tuneBoost', 'tuneBoostInput', 'wastegateBoost', 1);

    // 2. Displacement / Stroker Scale
    linkParam('tuneDisp', 'tuneDispInput', 'displacementScale', 1);

    // 3. Compression Ratio
    linkParam('tuneCr', 'tuneCrInput', 'compressionRatio', 1);

    // 4. Cam Duration
    linkParam('tuneCam', 'tuneCamInput', 'camDuration', 0);

    // 5. Rev Limiter RPM
    linkParam('tuneLimiter', 'tuneLimiterInput', 'revLimiterRpm', 0);

    // 6. Two-Step Launch RPM
    linkParam('tuneLaunch', 'tuneLaunchInput', 'launchRpm', 0);

    // 7. Nitrous Flow Rate (HP)
    linkParam('tuneNosFlow', 'tuneNosFlowInput', 'nitrousFlowHp', 0);

    // 8. Target AFR
    linkParam('tuneAfr', 'tuneAfrInput', 'afr', 1);

    // 9. Ignition Advance
    linkParam('tuneIgnition', 'tuneIgnitionInput', 'ignitionAdvance', 0);

    // 10. Final Drive Ratio
    linkParam('tuneFinalDrive', 'tuneFinalDriveInput', 'finalDrive', 2);

    // 11. Tire Pressure PSI
    linkParam('tuneTirePressure', 'tuneTirePressureInput', 'tirePressurePsi', 0);

    // Reset Button
    const btnReset = document.getElementById('btnResetTuning');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.game.playerCar.tuning = JSON.parse(JSON.stringify(DEFAULT_CAR.tuning));
        this.game.saveData();
        this.bindSliders();
        this.game.garageUI.updateStatsHUD();
        this.drawDynoGraph();
      });
    }

    // Dyno Run Button
    const runDynoBtn = document.getElementById('runDynoBtn');
    if (runDynoBtn) {
      runDynoBtn.addEventListener('click', () => {
        this.runDynoPull();
      });
    }
  }

  // --- RUN DYNO TEST SIMULATION ---
  runDynoPull() {
    if (this.isDynoRunning) return;
    audio.ensureContext();
    const stats = CarSystem.calculateStats(this.game.playerCar);
    const valid = CarSystem.validateEngine(this.game.playerCar);

    if (!valid.canStart) {
      window.showGamePopup({
        icon: '⚠️',
        title: 'ไม่สามารถขึ้นแท่นไดโน่ได้',
        message: `${valid.errors[0]}<br><br>กรุณาตรวจสอบและประกอบเครื่องยนต์ในโรงรถให้ครบถ้วนก่อนทดสอบ`,
        btnText: 'ตกลง'
      });
      return;
    }

    this.isDynoRunning = true;
    this.dynoProgress = 0;
    audio.startEngineSound(stats.idleRpm, this.game.playerCar);

    const runBtn = document.getElementById('runDynoBtn');
    if (runBtn) runBtn.innerText = '📈 กำลังเร่งรอบบนแท่นไดโน่...';

    const startTime = performance.now();
    const duration = 2800; // 2.8s pull

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      this.dynoProgress = progress;

      const currentRpm = stats.idleRpm + (stats.maxRpm - stats.idleRpm) * Math.pow(progress, 1.2);
      audio.updateEngineRpm(currentRpm, 1.0, progress > 0.96);

      this.drawDynoGraph(progress);

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        // Finished pull
        audio.playBlowOff();
        setTimeout(() => {
          audio.stopEngineSound();
          this.isDynoRunning = false;
          if (runBtn) runBtn.innerText = '⚡ ทดสอบบนไดโน่ (RUN DYNO)';
          this.drawDynoGraph(1.0);
        }, 600);
      }
    };

    requestAnimationFrame(step);
  }

  // --- DRAW DYNO GRAPH (HP & TORQUE CURVES WITH DYNAMIC AUTO-SCALING) ---
  drawDynoGraph(animProgress = 1.0) {
    if (!this.dynoCtx || !this.dynoCanvas) return;
    const ctx = this.dynoCtx;
    const w = this.dynoCanvas.width;
    const h = this.dynoCanvas.height;

    const stats = CarSystem.calculateStats(this.game.playerCar);

    // Background & Grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const paddingLeft = 52;
    const paddingRight = 24;
    const paddingTop = 42;
    const paddingBottom = 30;

    const graphW = w - paddingLeft - paddingRight;
    const graphH = h - paddingTop - paddingBottom;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Dynamic HP Scale (Adapts from 300 HP up to 50,000+ HP!)
    const targetPeak = Math.max(stats.hp, stats.torque);
    const hpStepSize = targetPeak > 15000 ? 5000 : (targetPeak > 5000 ? 2000 : (targetPeak > 2000 ? 500 : 200));
    const maxGraphHp = Math.max(500, Math.ceil((targetPeak * 1.15) / hpStepSize) * hpStepSize);
    const hpSteps = 5;

    for (let i = 0; i <= hpSteps; i++) {
      const y = paddingTop + (graphH / hpSteps) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      const hpVal = Math.round(maxGraphHp - (maxGraphHp / hpSteps) * i);
      const hpLabel = hpVal >= 1000 ? `${(hpVal / 1000).toFixed(hpVal % 1000 === 0 ? 0 : 1)}k` : `${hpVal}`;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(hpLabel, paddingLeft - 6, y + 3);
    }

    // Dynamic RPM Scale (Adapts from 7,000 RPM up to 35,000+ RPM!)
    const minRpm = 1000;
    const maxGraphRpm = Math.max(8000, Math.ceil((stats.maxRpm * 1.08) / 2000) * 2000);
    const rpmRange = maxGraphRpm - minRpm;
    const rpmSteps = 6;

    ctx.textAlign = 'center';
    for (let i = 0; i <= rpmSteps; i++) {
      const x = paddingLeft + (graphW / rpmSteps) * i;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();

      const rpmVal = Math.round(minRpm + (rpmRange / rpmSteps) * i);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`${(rpmVal / 1000).toFixed(0)}k`, x, h - 14);
    }

    if (stats.hp <= 0) return;

    // Draw HP Curve (RED)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const points = 50;
    const maxPoints = Math.floor(points * animProgress);

    for (let i = 0; i <= maxPoints; i++) {
      const frac = i / points;
      const rpm = minRpm + frac * rpmRange;
      const x = paddingLeft + frac * graphW;

      let hpCurve = 0;
      if (rpm >= stats.idleRpm && rpm <= stats.maxRpm) {
        const peakRatio = rpm / (stats.maxRpm * 0.88);
        hpCurve = stats.hp * Math.sin(Math.min(Math.PI / 2, peakRatio * (Math.PI / 2)));
      }

      const y = paddingTop + graphH - (hpCurve / maxGraphHp) * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Torque Curve (BLUE)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    for (let i = 0; i <= maxPoints; i++) {
      const frac = i / points;
      const rpm = minRpm + frac * rpmRange;
      const x = paddingLeft + frac * graphW;

      let torqCurve = 0;
      if (rpm >= stats.idleRpm && rpm <= stats.maxRpm) {
        const peakRpm = stats.maxRpm * 0.55;
        const peakFactor = Math.exp(-Math.pow((rpm - peakRpm) / (stats.maxRpm * 0.4), 2));
        torqCurve = stats.torque * (0.6 + 0.4 * peakFactor);
      }

      const y = paddingTop + graphH - (torqCurve / maxGraphHp) * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Boost Curve (GREEN) if turbo
    if (stats.boostBar > 0) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= maxPoints; i++) {
        const frac = i / points;
        const rpm = minRpm + frac * rpmRange;
        const x = paddingLeft + frac * graphW;

        // Boost spool ramp
        let boostCurve = 0;
        const spoolRpm = Math.min(stats.maxRpm * 0.35, 3000);
        if (rpm > spoolRpm) {
          boostCurve = Math.min(stats.boostBar, ((rpm - spoolRpm) / (spoolRpm * 0.8)) * stats.boostBar);
        }

        const boostScaledToGraph = (boostCurve / Math.max(stats.boostBar, 1.0)) * (stats.hp * 0.55);
        const y = paddingTop + graphH - (boostScaledToGraph / maxGraphHp) * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // --- TOP LEGEND CARDS (Non-overlapping fixed grid columns) ---
    const topBarY = 8;
    const topBarH = 22;
    const leftMargin = 14;
    const rightMargin = 14;
    const cardGap = 8;
    const availW = w - leftMargin - rightMargin;
    const numCards = 3;
    const cardW = (availW - (numCards - 1) * cardGap) / numCards;

    // Helper for drawing clean pill cards
    const drawPillCard = (colIdx, borderColor, dotColor, labelText, valueText) => {
      const cx = leftMargin + colIdx * (cardW + cardGap);

      // Card Background & Border
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(cx, topBarY, cardW, topBarH);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, topBarY, cardW, topBarH);

      // Indicator Dot
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(cx + 8, topBarY + topBarH / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label (Left)
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(labelText, cx + 15, topBarY + 14);

      // Value (Right)
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(valueText, cx + cardW - 6, topBarY + 14);
    };

    // 1. HP Badge (Red)
    drawPillCard(0, '#7f1d1d', '#ef4444', 'HP', `${stats.hp.toLocaleString()}`);

    // 2. Torque Badge (Blue)
    drawPillCard(1, '#0c4a6e', '#38bdf8', 'แรงบิด', `${stats.torque.toLocaleString()} Nm`);

    // 3. Boost Badge (Green)
    const boostStr = stats.boostBar > 0 ? `${stats.boostBar.toFixed(1)} Bar` : 'NA (0 Bar)';
    drawPillCard(2, '#14532d', '#22c55e', 'บูสต์', boostStr);
  }
}
