/**
 * Project CarTuneRacing - Garage & Modular Workshop Interface
 * Features:
 * - Car Roster Selection in Garage (< and > navigation, ownership, overview stats, bottom action bar)
 * - Workshop Customization with Smooth Dynamic Camera Focus:
 *   - Engine Bay Focus (Hood propped open live, internals visible)
 *   - Wheels & Suspension Focus
 *   - Modular Body Kit Focus (Front Bumper, Side Skirts, Rear Wing, Exhaust)
 *   - Full Overview
 */

class GarageUI {
  constructor(game) {
    this.game = game;
    this.currentCatalogIndex = 0;
    this.currentCategory = 'engine_block';
    this.showXRay = false;
    this.isEngineRunning = false;
    this.diagnosticStatus = null;

    // Camera Lerp System
    this.cameraMode = 'overview'; // 'overview' | 'engine' | 'wheel' | 'body'
    this.camX = 140;
    this.camY = 160;
    this.camScale = 3.6;

    // Rev & Throttle Testing state
    this.garageRpm = 950;
    this.garageThrottle = 0;
    this.garageBoost = 0;
    this.isRevving = false;
    this.isBackfire = false;
    this.lastLoopTime = performance.now();

    // Canvases & contexts
    this.garageCanvas = null;
    this.garageCtx = null;
    this.workshopCanvas = null;
    this.workshopCtx = null;
    this.animFrame = null;
    this.previewPart = null; // { category, partId } for try-before-you-buy
  }

  init() {
    this.garageCanvas = document.getElementById('garageCanvas');
    if (this.garageCanvas) {
      this.garageCtx = this.garageCanvas.getContext('2d');
    }

    this.workshopCanvas = document.getElementById('workshopCanvas');
    if (this.workshopCanvas) {
      this.workshopCtx = this.workshopCanvas.getContext('2d');
    }

    // Find index of current car model in CAR_CATALOG
    const model = this.game.playerCar?.model || 'car_porsche_911_turbo_s';
    const foundIdx = CAR_CATALOG.findIndex(c => c.id === model);
    if (foundIdx !== -1) {
      this.currentCatalogIndex = foundIdx;
    }

    this.bindEvents();
    this.bindRosterEvents();
    this.bindWorkshopEvents();

    this.updateRosterDisplay();
    this.setCameraMode('engine', false);
    this.renderCategoryList();
    this.renderPartsList();
    this.updateStatsHUD();
    this.startRenderLoop();
  }

  // --- GLOBAL & REV EVENTS ---
  bindEvents() {
    // X-Ray toggle buttons (both in garage and workshop)
    const xrayBtn = document.getElementById('toggleXrayBtn');
    if (xrayBtn) {
      xrayBtn.addEventListener('click', () => {
        this.showXRay = !this.showXRay;
        xrayBtn.classList.toggle('active', this.showXRay);
        const wsXray = document.getElementById('toggleWorkshopXrayBtn');
        if (wsXray) wsXray.classList.toggle('active', this.showXRay);
        audio.playClick();
      });
    }

    const wsXrayBtn = document.getElementById('toggleWorkshopXrayBtn');
    if (wsXrayBtn) {
      wsXrayBtn.addEventListener('click', () => {
        this.showXRay = !this.showXRay;
        wsXrayBtn.classList.toggle('active', this.showXRay);
        if (xrayBtn) xrayBtn.classList.toggle('active', this.showXRay);
        audio.playClick();
      });
    }

    // Engine Start / Stop toggle button
    const testStartBtn = document.getElementById('testEngineBtn');
    if (testStartBtn) {
      testStartBtn.addEventListener('click', () => {
        this.toggleEngine();
      });
    }

    // Rev Throttle button (Hold to rev)
    const revBtn = document.getElementById('btnRevThrottle');
    if (revBtn) {
      const start = (e) => {
        e.preventDefault();
        this.startRev();
      };
      const stop = (e) => {
        e.preventDefault();
        this.stopRev();
      };
      revBtn.addEventListener('mousedown', start);
      revBtn.addEventListener('mouseup', stop);
      revBtn.addEventListener('mouseleave', stop);
      revBtn.addEventListener('touchstart', start);
      revBtn.addEventListener('touchend', stop);
    }

    // Keyboard Revving [Space / W / ArrowUp]
    window.addEventListener('keydown', (e) => {
      const wsView = document.getElementById('workshopView');
      const gView = document.getElementById('garageView');
      const isVisible = (wsView && wsView.style.display !== 'none') || (gView && gView.style.display !== 'none');
      if (!isVisible) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (!this.isEngineRunning) return;

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!this.isRevving) this.startRev();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.stopRev();
      }
    });
  }

  // --- GARAGE ROSTER SELECTION EVENTS ---
  bindRosterEvents() {
    // Navigation arrows
    const btnPrev = document.getElementById('btnPrevCar');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.prevCar();
      });
    }

    const btnNext = document.getElementById('btnNextCar');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.nextCar();
      });
    }

    // Select or Buy Button
    const btnAction = document.getElementById('btnSelectOrBuyCar');
    if (btnAction) {
      btnAction.addEventListener('click', () => {
        this.handleRosterAction();
      });
    }

    // Bottom Toolbar Buttons
    const btnWorkshop = document.getElementById('btnOpenWorkshop');
    if (btnWorkshop) {
      btnWorkshop.addEventListener('click', () => {
        const catCar = CAR_CATALOG[this.currentCatalogIndex] || CAR_CATALOG[0];
        const isOwned = this.game.ownedCarModels && this.game.ownedCarModels.includes(catCar.id);
        if (!isOwned) {
          if (typeof window.showGamePopup === 'function') {
            window.showGamePopup({
              icon: '🔒',
              title: 'ยังไม่ได้ซื้อรถคันนี้!',
              message: `คุณต้องซื้อรถ <strong>${catCar.name}</strong> ก่อนจึงจะสามารถนำเข้าห้องแต่งรถได้!<br><br>กรุณากดปุ่ม <em>"💰 ซื้อรถคันนี้"</em> ด้านบนเพื่อเป็นเจ้าของก่อนครับ`
            });
          } else {
            alert(`🔒 คุณต้องซื้อรถ ${catCar.name} ก่อนจึงจะสามารถเข้าห้องแต่งรถได้!`);
          }
          return;
        }

        // If owned but not currently equipped, select it first
        if (this.game.playerCar.model !== catCar.id) {
          this.game.selectCar(catCar.id);
        }

        this.game.showWorkshop();
        audio.playClick();
      });
    }

    const btnRaceBots = document.getElementById('btnGarageRaceBots');
    if (btnRaceBots) {
      btnRaceBots.addEventListener('click', () => {
        const modal = document.getElementById('botsModal');
        if (modal) {
          this.game.renderBotsList();
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }

    const btnRaceMulti = document.getElementById('btnGarageRaceMultiplayer');
    if (btnRaceMulti) {
      btnRaceMulti.addEventListener('click', () => {
        const modal = document.getElementById('multiplayerModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }

    const btnRaceFarm = document.getElementById('btnGarageRaceFarm');
    if (btnRaceFarm) {
      btnRaceFarm.addEventListener('click', () => {
        const activeDist = (typeof RACE_DISTANCES !== 'undefined')
          ? (RACE_DISTANCES.find(d => d.id === this.game.selectedDistanceId) || RACE_DISTANCES[0])
          : null;
        this.game.raceManager.startTimeTrialRace(activeDist);
        audio.playClick();
      });
    }

    const btnDyno = document.getElementById('btnGarageDyno');
    if (btnDyno) {
      btnDyno.addEventListener('click', () => {
        const modal = document.getElementById('tunerModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }

    const btnSettings = document.getElementById('btnGarageSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }

    const btnTitle = document.getElementById('btnGarageTitle');
    if (btnTitle) {
      btnTitle.addEventListener('click', () => {
        this.game.showTitleScreen();
        audio.playClick();
      });
    }
  }

  // --- WORKSHOP NAVIGATION & CAMERA EVENTS ---
  bindWorkshopEvents() {
    // Back to garage button
    const btnBack = document.getElementById('btnWorkshopBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.clearPreviewPart();
        this.game.showGarage();
        audio.playClick();
      });
    }

    // Camera focus tabs
    const camButtons = [
      { id: 'btnCamEngine', mode: 'engine' },
      { id: 'btnCamWheel', mode: 'wheel' },
      { id: 'btnCamBody', mode: 'body' },
      { id: 'btnCamOverview', mode: 'overview' }
    ];

    camButtons.forEach(({ id, mode }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.setCameraMode(mode);
          audio.playClick();
        });
      }
    });

    const btnDyno = document.getElementById('btnWorkshopDyno');
    if (btnDyno) {
      btnDyno.addEventListener('click', () => {
        const modal = document.getElementById('tunerModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }
  }

  // --- CAR ROSTER CAROUSEL NAVIGATION ---
  prevCar() {
    this.currentCatalogIndex = (this.currentCatalogIndex - 1 + CAR_CATALOG.length) % CAR_CATALOG.length;
    this.updateRosterDisplay();
    audio.playClick();
  }

  nextCar() {
    this.currentCatalogIndex = (this.currentCatalogIndex + 1) % CAR_CATALOG.length;
    this.updateRosterDisplay();
    audio.playClick();
  }

  updateRosterDisplay() {
    const catCar = CAR_CATALOG[this.currentCatalogIndex] || CAR_CATALOG[0];
    const isOwned = this.game.ownedCarModels.includes(catCar.id);
    const isActive = this.game.playerCar.model === catCar.id;

    // Header Info
    const nameEl = document.getElementById('rosterCarName');
    const badgeEl = document.getElementById('rosterCarBadge');
    const catEl = document.getElementById('rosterCarCategory');
    if (nameEl) nameEl.innerText = catCar.name;
    if (badgeEl) badgeEl.innerText = catCar.desc || catCar.badge;
    if (catEl) catEl.innerText = catCar.category;

    // Overview Stats (High-level clean specs)
    const hpEl = document.getElementById('overviewHp');
    const speedEl = document.getElementById('overviewTopSpeed');
    const weightEl = document.getElementById('overviewWeight');
    const dragEl = document.getElementById('overviewDrag');
    const ownEl = document.getElementById('overviewOwnership');

    if (isActive && this.game.playerCarStats) {
      const stats = this.game.playerCarStats;
      if (hpEl) hpEl.innerText = `${stats.hp.toLocaleString()} HP`;
      if (speedEl) speedEl.innerText = `${stats.topSpeed.toLocaleString()} km/h`;
      if (weightEl) weightEl.innerText = `${stats.weight.toLocaleString()} kg`;
      if (dragEl) dragEl.innerText = (stats.dragCoeff ?? stats.cd ?? 0.32).toFixed(2);
    } else {
      if (hpEl) hpEl.innerText = `${catCar.baseHp.toLocaleString()} HP`;
      if (speedEl) speedEl.innerText = `${catCar.topSpeed.toLocaleString()} km/h`;
      if (weightEl) weightEl.innerText = `${catCar.weight.toLocaleString()} kg`;
      if (dragEl) dragEl.innerText = catCar.dragCoeff.toFixed(2);
    }

    if (ownEl) {
      if (isActive) {
        ownEl.innerText = '✅ ใช้งานอยู่ (CURRENT)';
        ownEl.style.color = '#38bdf8';
      } else if (isOwned) {
        ownEl.innerText = 'มีในครอบครอง (OWNED)';
        ownEl.style.color = '#4ade80';
      } else {
        ownEl.innerText = `ราคา $${catCar.price.toLocaleString()}`;
        ownEl.style.color = '#f59e0b';
      }
    }

    // Action Button
    const btnAction = document.getElementById('btnSelectOrBuyCar');
    if (btnAction) {
      if (isActive) {
        btnAction.className = 'btn-car-action btn-action-owned';
        btnAction.innerText = '✅ ใช้งานคันนี้อยู่ (CURRENT CAR)';
        btnAction.disabled = true;
      } else if (isOwned) {
        btnAction.className = 'btn-car-action btn-action-select';
        btnAction.innerText = '🏁 เลือกรถคันนี้ (SELECT CAR)';
        btnAction.disabled = false;
      } else {
        const canAfford = this.game.money >= catCar.price;
        btnAction.className = 'btn-car-action btn-action-buy' + (canAfford ? '' : ' btn-action-cant-afford');
        btnAction.innerText = `💰 ซื้อรถคันนี้ราคา $${catCar.price.toLocaleString()} (BUY CAR)`;
        btnAction.disabled = false; // Always enabled so click triggers informative modal!
      }
    }

    // Update Workshop badge to reflect active equipped car
    const wsBadge = document.getElementById('workshopCarBadge');
    if (wsBadge) {
      const activeCar = CAR_CATALOG.find(c => c.id === this.game.playerCar.model);
      wsBadge.innerText = (activeCar ? activeCar.name : this.game.playerCar.name) || 'S-Coupe Turbo JDM';
    }
  }

  handleRosterAction() {
    const catCar = CAR_CATALOG[this.currentCatalogIndex];
    if (!catCar) return;

    const isOwned = this.game.ownedCarModels.includes(catCar.id);
    const isActive = this.game.playerCar.model === catCar.id;

    if (isActive) return;

    if (isOwned) {
      // Select Car
      this.game.selectCar(catCar.id);
      audio.playSuccess();
      this.updateRosterDisplay();
      if (typeof window.showGamePopup === 'function') {
        window.showGamePopup({
          icon: '🚗',
          title: 'เปลี่ยนรถสำเร็จ!',
          message: `คุณได้เลือกรถ <strong>${catCar.name}</strong> เป็นรถแข่งหลักเรียบร้อยแล้ว!`
        });
      }
    } else {
      // Buy Car
      if (this.game.money < catCar.price) {
        const shortage = catCar.price - this.game.money;
        if (typeof window.showGamePopup === 'function') {
          window.showGamePopup({
            icon: '⚠️',
            title: 'เงินไม่เพียงพอ!',
            message: `คุณมีเงิน <strong>$${this.game.money.toLocaleString()}</strong> แต่รถคันนี้ราคา <strong>$${catCar.price.toLocaleString()}</strong> (ยังขาดอีก <strong>$${shortage.toLocaleString()}</strong>)<br><br>🏁 คุณสามารถกดปุ่ม <strong>"🏆 โหมดแข่ง BOT"</strong> หรือ <strong>"วิ่งซ้อมฟาร์มเงิน"</strong> ด้านล่างเพื่อสะสมเงินรางวัลได้ครับ!`
          });
        } else {
          alert(`⚠️ เงินไม่เพียงพอ! คุณมีเงิน $${this.game.money.toLocaleString()} ต้องการ $${catCar.price.toLocaleString()}`);
        }
        return;
      }

      const bought = this.game.buyCar(catCar);
      if (bought !== false) {
        this.updateRosterDisplay();
        if (typeof window.showGamePopup === 'function') {
          window.showGamePopup({
            icon: '🎉',
            title: 'ซื้อรถใหม่สำเร็จ!',
            message: `ยินดีด้วย! คุณได้เป็นเจ้าของ <strong>${catCar.name}</strong> และได้ติดตั้งเป็นรถหลักเรียบร้อยแล้ว!`
          });
        }
      }
    }
  }

  // --- DYNAMIC CAMERA ANGLE SWITCHING ---
  setCameraMode(mode, playSound = true) {
    if (this.cameraMode === 'engine' && mode !== 'engine') {
      this.camX = 220;
      this.camY = 175;
      this.camScale = 3.6;
    }
    this.cameraMode = mode;

    // Update camera buttons UI
    document.querySelectorAll('.cam-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cam') === mode);
    });

    // Update Indicator text
    const indEl = document.getElementById('cameraModeIndicator');
    const headerEl = document.getElementById('workshopCatHeader');

    if (mode === 'engine') {
      if (indEl) indEl.innerText = '📷 ห้องเครื่องยนต์ (มุมมองตรงหน้ารถ เปิดฝากระโปรง LIVE)';
      if (headerEl) headerEl.innerText = '🔧 ชิ้นส่วนเครื่องยนต์ (ENGINE)';
      this.currentCategory = 'engine_block';
    } else if (mode === 'wheel') {
      if (indEl) indEl.innerText = '📷 ล้อ ช่วงล่าง และระบบเบรก';
      if (headerEl) headerEl.innerText = '🛞 ล้อ ช่วงล่าง และเบรก';
      this.currentCategory = 'tires';
    } else if (mode === 'body') {
      if (indEl) indEl.innerText = '📷 บอดี้คิท (กันชนหน้า/สเกิร์ต/วิงหลัง)';
      if (headerEl) headerEl.innerText = '🏎️ ชุดแต่งบอดี้คิท (BODY KIT)';
      this.currentCategory = 'front_bumper';
    } else {
      if (indEl) indEl.innerText = '📷 มุมมองเต็มคัน (FULL VIEW)';
      if (headerEl) headerEl.innerText = '🔩 หมวดหมู่อะไหล่ทั้งหมด';
    }

    if (playSound) audio.playClick();
    this.previewPart = null;
    this.renderCategoryList();
    this.renderPartsList();
  }

  // --- CATEGORY TABS (FILTERED BY CAMERA MODE) ---
  renderCategoryList() {
    let categories = [];

    if (this.cameraMode === 'engine') {
      categories = [
        { id: 'engine_block', name: 'บล็อกเครื่องยนต์ (Block)', icon: '⚙️' },
        { id: 'head_cams', name: 'ฝาสูบ & แคมชาร์ฟท์ (Head)', icon: '🔧' },
        { id: 'pistons_rods', name: 'ลูกสูบ & ก้านสูบ (Pistons)', icon: '💥' },
        { id: 'induction', name: 'ระบบเทอร์โบ / อัดอากาศ', icon: '🌀' },
        { id: 'intercooler', name: 'อินเตอร์คูลเลอร์ (FMIC)', icon: '🧊' },
        { id: 'cooling', name: 'หม้อน้ำหล่อเย็น (Radiator)', icon: '❄️' },
        { id: 'starter_battery', name: 'แบตเตอรี่ & สตาร์ทเตอร์', icon: '🔋' },
        { id: 'ignition', name: 'หัวเทียน & คอยล์ไฟ', icon: '⚡' },
        { id: 'fuel_system', name: 'ปั๊มติ๊ก & หัวฉีดน้ำมัน', icon: '⛽' },
        { id: 'nitrous', name: 'ถังไนตรัสออกไซด์ (NOS)', icon: '🚀' }
      ];
    } else if (this.cameraMode === 'wheel') {
      categories = [
        { id: 'tires', name: 'ล้อและยาง (Tires & Rims)', icon: '🏁' },
        { id: 'brakes', name: 'ระบบเบรก & ร่มชูชีพ', icon: '🛑' },
        { id: 'transmission', name: 'ชุดเกียร์ (Transmission)', icon: '🕹️' }
      ];
    } else if (this.cameraMode === 'body') {
      categories = [
        { id: 'front_bumper', name: 'กันชนหน้า / ลิ้นหน้า (Front)', icon: '🏎️' },
        { id: 'side_skirts', name: 'สเกิร์ตข้าง (Side Skirts)', icon: '📐' },
        { id: 'rear_wing', name: 'วิงหลัง / สปอยเลอร์ (Spoiler)', icon: '🦅' },
        { id: 'exhaust', name: 'ท่อไอเสีย (Exhaust System)', icon: '💨' }
      ];
    } else {
      // All categories
      categories = [
        { id: 'engine_block', name: 'บล็อกเครื่องยนต์ (Engine)', icon: '⚙️' },
        { id: 'induction', name: 'ระบบเทอร์โบ / บูสต์', icon: '🌀' },
        { id: 'front_bumper', name: 'กันชนหน้า (Front Bumper)', icon: '🏎️' },
        { id: 'side_skirts', name: 'สเกิร์ตข้าง (Side Skirts)', icon: '📐' },
        { id: 'rear_wing', name: 'วิงหลัง (Rear Wing)', icon: '🦅' },
        { id: 'exhaust', name: 'ท่อไอเสีย (Exhaust)', icon: '💨' },
        { id: 'tires', name: 'ล้อและยาง (Tires)', icon: '🏁' },
        { id: 'brakes', name: 'ระบบเบรก (Brakes)', icon: '🛑' },
        { id: 'transmission', name: 'ชุดเกียร์ (Transmission)', icon: '🕹️' }
      ];
    }

    // Ensure currentCategory is valid
    if (!categories.some(c => c.id === this.currentCategory)) {
      this.currentCategory = categories[0].id;
    }

    const container = document.getElementById('garageCategories');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
      <button class="cat-btn ${cat.id === this.currentCategory ? 'active' : ''}" data-cat="${cat.id}">
        <span class="cat-icon">${cat.icon}</span>
        <span class="cat-text">${cat.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat');
        if (this.currentCategory !== catId) {
          this.previewPart = null;
        }
        this.currentCategory = catId;
        audio.playClick();
        this.renderCategoryList();
        this.renderPartsList();
        this.updateStatsHUD();
      });
    });
  }

  // --- HELPER: GET CURRENT CAR STATE (APPLYING PREVIEW IF ACTIVE) ---
  getEffectiveCar() {
    const wsView = document.getElementById('workshopView');
    const isWorkshop = wsView && wsView.style.display !== 'none';
    if (isWorkshop && this.previewPart) {
      return {
        ...this.game.playerCar,
        parts: {
          ...this.game.playerCar.parts,
          [this.previewPart.category]: this.previewPart.partId
        }
      };
    }
    return this.game.playerCar;
  }

  // --- TRY-BEFORE-YOU-BUY PREVIEW METHODS ---
  setPreviewPart(category, partId) {
    this.previewPart = { category, partId };
    audio.playClick();

    const effectiveCar = this.getEffectiveCar();
    const validation = CarSystem.validateEngine(effectiveCar);
    const hasEngine = effectiveCar.parts?.engine_block && effectiveCar.parts.engine_block !== 'none' && effectiveCar.parts.engine_block !== 'eng_none';

    // If engine was running and previewed part invalidates engine or removes engine -> shut it down immediately!
    if (this.isEngineRunning && (!validation.canStart || !hasEngine)) {
      this.stopEngine(true, '🛑 เครื่องยนต์ดับ: ชิ้นส่วนที่ทดลองใส่ทำให้เครื่องยนต์ไม่สามารถทำงานได้ (ไม่มีเครื่องยนต์ / ขาดระบบสำคัญ)');
    } else if (this.isEngineRunning && hasEngine) {
      const stats = CarSystem.calculateStats(effectiveCar);
      audio.startEngineSound(stats.idleRpm, effectiveCar);
    }

    this.renderPartsList();
    this.updateStatsHUD();
  }

  clearPreviewPart() {
    this.previewPart = null;
    audio.playClick();

    const effectiveCar = this.getEffectiveCar();
    const validation = CarSystem.validateEngine(effectiveCar);
    const hasEngine = effectiveCar.parts?.engine_block && effectiveCar.parts.engine_block !== 'none' && effectiveCar.parts.engine_block !== 'eng_none';

    if (this.isEngineRunning && (!validation.canStart || !hasEngine)) {
      this.stopEngine(true, '🛑 เครื่องยนต์ดับ: รถของคุณยังไม่ได้ติดตั้งเครื่องยนต์!');
    }

    this.renderPartsList();
    this.updateStatsHUD();
  }

  // --- PARTS LIST ---
  renderPartsList() {
    const container = document.getElementById('garagePartsList');
    if (!container) return;

    const parts = CAR_PARTS[this.currentCategory] || [];
    const equippedPartId = this.game.playerCar.parts[this.currentCategory];
    const previewingPartId = (this.previewPart && this.previewPart.category === this.currentCategory) ? this.previewPart.partId : null;

    let bannerHtml = '';
    if (this.previewPart) {
      const pCat = this.previewPart.category;
      const pPart = (CAR_PARTS[pCat] || []).find(p => p.id === this.previewPart.partId);
      const isOwned = this.game.inventory.includes(this.previewPart.partId) || (pPart && pPart.price === 0);
      const canAfford = pPart && (this.game.money >= pPart.price);

      bannerHtml = `
        <div class="preview-active-banner">
          <div class="preview-banner-text">
            👁️ <strong>กำลังทดลองใส่:</strong> ${pPart ? pPart.name : this.previewPart.partId}
            <span style="opacity:0.85; font-size:0.75rem; margin-left: 6px;">(ยังไม่เสียเงิน — สามารถสตาร์ทเร่งเครื่องทดสอบได้เลย!)</span>
          </div>
          <div class="preview-banner-actions">
            <button class="btn btn-cancel-preview" id="btnCancelActivePreview">❌ ยกเลิกการลอง</button>
            ${!isOwned ? `
              <button class="btn btn-buy ${canAfford ? '' : 'btn-disabled'}" id="btnBuyActivePreview" ${canAfford ? '' : 'disabled'}>
                💰 ซื้อและติดตั้งเลย $${pPart?.price?.toLocaleString() || 0}
              </button>
            ` : `
              <button class="btn btn-equip" id="btnEquipActivePreview">
                ⚙️ ยืนยันการติดตั้ง
              </button>
            `}
          </div>
        </div>
      `;
    }

    const cardsHtml = parts.map(part => {
      const isEquipped = equippedPartId === part.id;
      const isPreviewing = previewingPartId === part.id;
      const isOwned = this.game.inventory.includes(part.id) || part.price === 0;
      const canAfford = this.game.money >= part.price;

      let statBadges = '';
      if (part.hpBonus) statBadges += `<span class="badge hp">+${part.hpBonus} HP</span>`;
      if (part.torqueBonus) statBadges += `<span class="badge torque">+${part.torqueBonus} Nm</span>`;
      if (part.maxBoost) statBadges += `<span class="badge boost">บูสต์ ${part.maxBoost} Bar</span>`;
      if (part.dragBonus) statBadges += `<span class="badge aero">Cd ${part.dragBonus > 0 ? '+' : ''}${part.dragBonus}</span>`;
      if (part.downforce) statBadges += `<span class="badge downforce">Downforce +${part.downforce}kg</span>`;
      if (part.weight) statBadges += `<span class="badge weight">${part.weight} kg</span>`;

      return `
        <div class="part-item-card ${isEquipped ? 'equipped' : ''} ${isPreviewing ? 'previewing-card' : ''}">
          <div class="part-main-info">
            <div class="part-title-row">
              <span class="part-name">${part.name}</span>
              ${isEquipped ? '<span class="badge-equipped">กำลังติดตั้ง</span>' : ''}
              ${isPreviewing ? '<span class="badge-equipped" style="background:#0284c7; border-color:#38bdf8;">👁️ กำลังลองใส่อยู่</span>' : ''}
            </div>
            <div class="part-desc">${part.desc}</div>
            <div class="part-badges">${statBadges}</div>
          </div>
          <div class="part-action">
            ${!isEquipped ? `
              <button class="btn btn-preview ${isPreviewing ? 'active' : ''}" data-cat="${this.currentCategory}" data-part="${part.id}">
                ${isPreviewing ? '👁️ ยกเลิกการลอง' : '👁️ ทดลองใส่ (TEST)'}
              </button>
            ` : ''}
            ${isEquipped ? `
              <button class="btn btn-disabled" disabled>ติดตั้งแล้ว</button>
            ` : isOwned ? `
              <button class="btn btn-equip" data-part="${part.id}">ติดตั้ง (EQUIP)</button>
            ` : `
              <button class="btn btn-buy ${canAfford ? '' : 'btn-disabled'}" data-part="${part.id}" ${canAfford ? '' : 'disabled'}>
                ซื้อ $${part.price.toLocaleString()}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = bannerHtml + cardsHtml;

    // Banner buttons
    const btnCancelPreview = document.getElementById('btnCancelActivePreview');
    if (btnCancelPreview) {
      btnCancelPreview.addEventListener('click', () => {
        this.clearPreviewPart();
      });
    }

    const btnBuyPreview = document.getElementById('btnBuyActivePreview');
    if (btnBuyPreview && this.previewPart) {
      btnBuyPreview.addEventListener('click', () => {
        const pId = this.previewPart.partId;
        this.buyPart(pId);
      });
    }

    const btnEquipPreview = document.getElementById('btnEquipActivePreview');
    if (btnEquipPreview && this.previewPart) {
      btnEquipPreview.addEventListener('click', () => {
        const pId = this.previewPart.partId;
        this.equipPart(pId);
      });
    }

    // Item card preview buttons
    container.querySelectorAll('.btn-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        const partId = btn.getAttribute('data-part');
        if (this.previewPart && this.previewPart.partId === partId && this.previewPart.category === cat) {
          this.clearPreviewPart();
        } else {
          this.setPreviewPart(cat, partId);
        }
      });
    });

    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', () => {
        const partId = btn.getAttribute('data-part');
        this.equipPart(partId);
      });
    });

    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', () => {
        const partId = btn.getAttribute('data-part');
        this.buyPart(partId);
      });
    });
  }

  equipPart(partId) {
    this.previewPart = null;
    this.game.playerCar.parts[this.currentCategory] = partId;
    audio.playShiftSound();
    this.game.saveData();

    if (this.isEngineRunning) {
      this.stopEngine(false);
    }

    this.renderPartsList();
    this.updateStatsHUD();
    this.updateRosterDisplay();
  }

  buyPart(partId) {
    const part = CAR_PARTS[this.currentCategory].find(p => p.id === partId);
    if (!part || this.game.money < part.price) return;

    this.previewPart = null;
    this.game.money -= part.price;
    this.game.inventory.push(part.id);
    this.equipPart(partId);
    this.game.updateMoneyDisplay();
  }

  startRev() {
    const effectiveCar = this.getEffectiveCar();
    const validation = CarSystem.validateEngine(effectiveCar);
    const hasEngine = effectiveCar.parts?.engine_block && effectiveCar.parts.engine_block !== 'none' && effectiveCar.parts.engine_block !== 'eng_none';

    if (!this.isEngineRunning || !validation.canStart || !hasEngine) {
      this.isRevving = false;
      if (this.isEngineRunning) {
        this.stopEngine(true, 'ไม่สามารถเบิ้นเครื่องได้: ไม่มีเครื่องยนต์ติดตั้งอยู่!');
      }
      return;
    }

    this.isRevving = true;
    document.getElementById('btnRevThrottle')?.classList.add('active');
  }

  stopRev() {
    this.isRevving = false;
    document.getElementById('btnRevThrottle')?.classList.remove('active');
  }

  startRenderLoop() {
    const loop = () => {
      this.drawGarageScene();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  // --- DRAW SCENE WITH DYNAMIC CAMERA LERP ---
  drawGarageScene() {
    // 1. Check active view
    const wsView = document.getElementById('workshopView');
    const isWorkshop = wsView && wsView.style.display !== 'none';
    const canvas = isWorkshop ? this.workshopCanvas : this.garageCanvas;
    const ctx = isWorkshop ? this.workshopCtx : this.garageCtx;

    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Background workshop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Workshop wall
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h * 0.7);

    // Checkered banner
    for (let bx = 0; bx < w; bx += 24) {
      ctx.fillStyle = (bx / 24) % 2 === 0 ? '#334155' : '#1e293b';
      ctx.fillRect(bx, 0, 24, 16);
    }

    // Tool racks
    ctx.fillStyle = '#475569';
    ctx.fillRect(40, h * 0.45, 120, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(50, h * 0.38, 25, 20);

    // Hydraulic lift posts
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(w * 0.20, h * 0.35, 12, h * 0.45);
    ctx.fillRect(w * 0.76, h * 0.35, 12, h * 0.45);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(w * 0.20, h * 0.5, 12, 10);
    ctx.fillRect(w * 0.76, h * 0.5, 12, 10);

    // Epoxy floor
    const floorY = h * 0.7;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#334155');
    floorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Floor lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < w; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, floorY);
      ctx.lineTo(gx - 40, h);
      ctx.stroke();
    }

    // Calculate rev dynamics
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastLoopTime) / 1000);
    this.lastLoopTime = now;

    const effectiveCar = this.getEffectiveCar();
    const validation = CarSystem.validateEngine(effectiveCar);
    const hasEngine = effectiveCar.parts?.engine_block && effectiveCar.parts.engine_block !== 'none' && effectiveCar.parts.engine_block !== 'eng_none';

    // If engine is currently flagged as running, but has no engine or cannot start -> EMERGENCY CUT OFF
    if (this.isEngineRunning && (!hasEngine || !validation.canStart)) {
      this.stopEngine(true, '🛑 เครื่องยนต์ดับกะทันหัน: ไม่มีบล็อกเครื่องยนต์ติดตั้งอยู่!');
    }

    const stats = this.game.playerCarStats || CarSystem.calculateStats(effectiveCar);
    const idleRpm = hasEngine ? (stats.idleRpm ?? 900) : 0;
    const maxRpm = hasEngine ? (stats.maxRpm ?? 8500) : 0;
    const maxBoost = hasEngine ? (stats.boostBar ?? 0) : 0;

    if (this.isEngineRunning && hasEngine) {
      if (this.isRevving) {
        this.garageThrottle = Math.min(1.0, this.garageThrottle + dt * 4.8);
        this.garageRpm = Math.min(maxRpm + 120, this.garageRpm + (maxRpm * 1.55) * this.garageThrottle * dt);
        if (maxBoost > 0) {
          this.garageBoost = Math.min(maxBoost * 0.75, this.garageBoost + dt * 1.3);
        }

        if (this.garageRpm >= maxRpm - 120 && maxRpm > 0) {
          this.garageRpm = maxRpm - 240 + (Math.random() - 0.5) * 120;
          if (Math.random() > 0.42) {
            audio.playBackfire();
            this.isBackfire = true;
            setTimeout(() => { this.isBackfire = false; }, 65);
          }
        }
      } else {
        const prevBoost = this.garageBoost;
        this.garageThrottle = Math.max(0, this.garageThrottle - dt * 5.5);

        if (prevBoost > 0.15) {
          const indPart = effectiveCar?.parts?.induction;
          audio.playBlowOff(indPart);
          this.garageBoost = 0;
        }

        this.garageRpm = Math.max(idleRpm, this.garageRpm - (Math.max(1000, maxRpm) * 0.85) * dt);
      }

      audio.updateEngineRpm(this.garageRpm, this.garageThrottle, maxRpm > 0 && this.garageRpm >= maxRpm - 130);

      const rpmEl = document.getElementById('garageRpmVal');
      if (rpmEl) {
        rpmEl.innerText = Math.round(this.garageRpm) + ' RPM';
        rpmEl.style.color = (maxRpm > 0 && this.garageRpm >= maxRpm - 250) ? '#ef4444' : '#38bdf8';
      }

      const barEl = document.getElementById('garageRpmBar');
      if (barEl) {
        const range = Math.max(1, maxRpm - idleRpm);
        const pct = Math.min(100, Math.max(0, ((this.garageRpm - idleRpm) / range) * 100));
        barEl.style.width = pct + '%';
      }

      const boostEl = document.getElementById('garageBoostVal');
      if (boostEl) {
        if (maxBoost > 0) {
          boostEl.style.display = 'inline-block';
          boostEl.innerText = 'BOOST: ' + this.garageBoost.toFixed(1) + ' Bar';
        } else {
          boostEl.style.display = 'none';
        }
      }
    } else {
      this.garageRpm = 0;
      this.garageThrottle = 0;
      this.garageBoost = 0;
      this.isRevving = false;
      audio.stopEngineSound();

      const rpmEl = document.getElementById('garageRpmVal');
      if (rpmEl) rpmEl.innerText = '0 RPM';

      const barEl = document.getElementById('garageRpmBar');
      if (barEl) barEl.style.width = '0%';

      const boostEl = document.getElementById('garageBoostVal');
      if (boostEl) boostEl.style.display = 'none';
    }

    // Determine Target Camera Position
    let targetX = 220;
    let targetY = 175;
    let targetScale = 3.6;
    let isHoodOpen = false;

    if (isWorkshop) {
      if (this.cameraMode === 'engine') {
        // Zoom into Front Engine Bay with hood opened!
        targetX = -190;
        targetY = -40;
        targetScale = 6.2;
        isHoodOpen = true;
      } else if (this.cameraMode === 'wheel') {
        // Zoom into Wheels & Brakes
        targetX = -40;
        targetY = -65;
        targetScale = 5.8;
        isHoodOpen = false;
      } else if (this.cameraMode === 'body') {
        // Full Exterior Body Focus
        targetX = 220;
        targetY = 175;
        targetScale = 3.6;
        isHoodOpen = false;
      } else {
        // Overview
        targetX = 220;
        targetY = 175;
        targetScale = 3.6;
        isHoodOpen = false;
      }
    } else {
      // Garage Car Selection View - Dead Centered
      targetX = 220;
      targetY = 175;
      targetScale = 3.6;
      isHoodOpen = false;
    }

    // Smooth Lerp Camera
    const lerpSpeed = 0.12;
    this.camX += (targetX - this.camX) * lerpSpeed;
    this.camY += (targetY - this.camY) * lerpSpeed;
    this.camScale += (targetScale - this.camScale) * lerpSpeed;

    const shake = (this.isEngineRunning && hasEngine) ? (0.6 + (this.garageRpm / Math.max(1, maxRpm)) * 3.5) : 0;
    const shakeY = (Math.random() - 0.5) * shake;

    // Pick car to draw:
    // If in workshop -> player active car (including previewed parts)
    // If in garage -> previewed catalog car
    let carToDraw = isWorkshop ? effectiveCar : this.game.playerCar;
    if (!isWorkshop) {
      const previewCatCar = CAR_CATALOG[this.currentCatalogIndex];
      if (previewCatCar && previewCatCar.id !== this.game.playerCar.model) {
        // If player already owns this car with custom parts, use their saved build
        const savedBuild = this.game.savedCars?.[previewCatCar.id];
        if (savedBuild) {
          carToDraw = savedBuild;
        } else {
          carToDraw = {
            ...DEFAULT_CAR,
            model: previewCatCar.id,
            bodyType: previewCatCar.id,
            parts: { ...DEFAULT_CAR.parts, ...(previewCatCar.defaultParts || {}) }
          };
        }
      }
    }

    // 🌟 REAR-PERSPECTIVE OPEN ENGINE BAY VIEW IN WORKSHOP
    if (isWorkshop && this.cameraMode === 'engine') {
      pixelRenderer.renderFrontEngineBay(ctx, w, h, carToDraw, {
        isEngineRunning: this.isEngineRunning && hasEngine,
        rpm: hasEngine ? this.garageRpm : 0,
        maxRpm: maxRpm,
        throttle: hasEngine ? this.garageThrottle : 0,
        boost: hasEngine ? this.garageBoost : 0,
        isBackfire: this.isBackfire && hasEngine,
        isOverheating: this.diagnosticStatus && !this.diagnosticStatus.canStart
      });
      return;
    }

    // 🌟 PORSCHE 911 TURBO S (992) 2D PIXEL SIDE GARAGE SCENE
    pixelRenderer.renderGarageCarScene(ctx, w, h, carToDraw, {
      cameraMode: isWorkshop ? this.cameraMode : 'overview',
      showXRay: this.showXRay,
      isEngineRunning: this.isEngineRunning && hasEngine,
      rpm: hasEngine ? this.garageRpm : 0,
      maxRpm: maxRpm,
      boost: hasEngine ? this.garageBoost : 0,
      isBackfire: this.isBackfire && hasEngine,
      isOverheating: this.diagnosticStatus && !this.diagnosticStatus.canStart
    });
  }

  toggleEngine() {
    if (this.isEngineRunning) {
      this.stopEngine();
    } else {
      this.startEngine();
    }
  }

  stopEngine(isStall = false, customReason = null) {
    this.isEngineRunning = false;
    this.isRevving = false;
    this.garageRpm = 0;
    this.garageThrottle = 0;
    this.garageBoost = 0;
    this.diagnosticStatus = null;
    audio.stopEngineSound();
    audio.playClick();

    const testBtn = document.getElementById('testEngineBtn');
    if (testBtn) {
      testBtn.classList.remove('engine-running');
      testBtn.innerText = '🔑 สตาร์ทเครื่องยนต์ (TEST CRANK)';
    }

    const revControls = document.getElementById('garageRevControls');
    if (revControls) {
      revControls.style.display = 'none';
    }

    const diagBox = document.getElementById('ecuDiagBox');
    const diagList = document.getElementById('ecuDiagMessages');
    if (diagBox) {
      diagBox.className = isStall ? 'diag-box error-state' : 'diag-box';
    }
    if (diagList) {
      if (isStall) {
        diagList.innerHTML = `
          <div class="diag-header error-title">🛑 เครื่องยนต์ดับ (Engine Cut-off / Stalled)</div>
          <div class="diag-item error">${customReason || 'เครื่องยนต์ดับกะทันหันเนื่องจากไม่มีเครื่องยนต์ หรือขาดชิ้นส่วนสำคัญในการจุดระเบิด!'}</div>
          <div class="diag-item" style="color: #94a3b8; font-size: 11px;">ต้องติดตั้งเครื่องยนต์และระบบน้ำมัน/ไฟให้ครบก่อน จึงจะสามารถสตาร์ทได้</div>
        `;
      } else {
        diagList.innerHTML = `
          <div class="diag-header">⚡ ระบบวิเคราะห์เครื่องยนต์ (ECU DIAGNOSTICS)</div>
          <div class="diag-item" style="color: #38bdf8;">🛑 ดับเครื่องยนต์เรียบร้อยแล้ว (Engine Off)</div>
          <div class="diag-item" style="color: #94a3b8; font-size: 11px;">กดปุ่มสตาร์ทด้านบนเพื่อเริ่มสตาร์ทและตรวจสอบเครื่องยนต์ใหม่อีกครั้ง</div>
        `;
      }
    }
  }

  startEngine() {
    audio.ensureContext();
    const effectiveCar = this.getEffectiveCar();
    const result = CarSystem.validateEngine(effectiveCar);
    this.diagnosticStatus = result;

    const hasEngine = effectiveCar.parts?.engine_block && effectiveCar.parts.engine_block !== 'none' && effectiveCar.parts.engine_block !== 'eng_none';
    const diagBox = document.getElementById('ecuDiagBox');
    const diagList = document.getElementById('ecuDiagMessages');
    const testBtn = document.getElementById('testEngineBtn');

    if (!result.canStart || !hasEngine) {
      this.isEngineRunning = false;
      this.isRevving = false;
      this.garageRpm = 0;
      this.garageThrottle = 0;
      this.garageBoost = 0;
      audio.stopEngineSound();
      audio.playCrankSound();

      const revControls = document.getElementById('garageRevControls');
      if (revControls) {
        revControls.style.display = 'none';
      }

      if (diagBox) {
        diagBox.className = 'diag-box error-state';
      }
      if (diagList) {
        const errorMessages = [...result.errors];
        if (!hasEngine && !errorMessages.some(e => e.includes('บล็อกเครื่องยนต์'))) {
          errorMessages.unshift('❌ ECU FAULT #00: ไม่มีบล็อกเครื่องยนต์ (No Engine Block Installed)');
        }
        diagList.innerHTML = `
          <div class="diag-header error-title">❌ ECU ตรวจพบข้อผิดพลาด: สตาร์ทเครื่องยนต์ไม่ติด!</div>
          ${errorMessages.map(err => `<div class="diag-item error">${err}</div>`).join('')}
          ${result.warnings.map(warn => `<div class="diag-item warning">${warn}</div>`).join('')}
        `;
      }
      if (testBtn) {
        testBtn.classList.remove('engine-running');
        testBtn.innerText = '❌ สตาร์ทไม่ติด (ไม่มีเครื่องยนต์ / อะไหล่ไม่ครบ)';
      }
      return;
    }

    const effectiveStats = CarSystem.calculateStats(effectiveCar);
    this.isEngineRunning = true;
    this.garageRpm = effectiveStats.idleRpm || 900;
    this.garageThrottle = 0;
    this.garageBoost = 0;
    audio.playCrankSound();
    setTimeout(() => {
      if (this.isEngineRunning) {
        audio.startEngineSound(this.garageRpm, effectiveCar);
      }
    }, 400);

    const revControls = document.getElementById('garageRevControls');
    if (revControls) {
      revControls.style.display = 'block';
      const rpmEl = document.getElementById('garageRpmVal');
      if (rpmEl) rpmEl.innerText = `${this.garageRpm} RPM`;
      const barEl = document.getElementById('garageRpmBar');
      if (barEl) barEl.style.width = '12%';
    }

    if (diagBox) {
      diagBox.className = 'diag-box success-state';
    }
    if (diagList) {
      diagList.innerHTML = `
        <div class="diag-header success-title">✅ ระบบเครื่องยนต์ทำงานสมบูรณ์ (Engine Running)</div>
        <div class="diag-item success">รอบเดินเบา: ${effectiveStats.idleRpm} RPM | แรงดันน้ำมันเครื่อง: ปกติ</div>
        <div class="diag-item" style="color: #facc15; font-weight: 700;">🔥 สามารถกดค้างปุ่มเบิ้นเครื่องด้านบนเพื่อทดสอบสุ้มเสียงและบูสต์เทอร์โบได้เลย!</div>
        ${result.warnings.length > 0 ? `
          <div class="diag-header warning-title">⚠️ คำเตือนการทำงาน:</div>
          ${result.warnings.map(warn => `<div class="diag-item warning">${warn}</div>`).join('')}
        ` : ''}
      `;
    }
    if (testBtn) {
      testBtn.classList.add('engine-running');
      testBtn.innerText = '🛑 ดับเครื่องยนต์ (STOP ENGINE)';
    }
  }

  updateStatsHUD() {
    const baseStats = CarSystem.calculateStats(this.game.playerCar);
    const effectiveCar = this.getEffectiveCar();
    const isPreviewing = Boolean(this.previewPart);
    const stats = isPreviewing ? CarSystem.calculateStats(effectiveCar) : baseStats;
    this.game.playerCarStats = stats;

    const hp = document.getElementById('hudHp');
    const torque = document.getElementById('hudTorque');
    const weight = document.getElementById('hudWeight');
    const z100 = document.getElementById('hudZeroToHundred');
    const qm = document.getElementById('hudQuarterMile');
    const top = document.getElementById('hudTopSpeed');

    const formatDiff = (curr, base, unit = '', invertColor = false) => {
      if (!isPreviewing || curr === base) return '';
      const diff = curr - base;
      const isPositive = diff > 0;
      const isGood = invertColor ? !isPositive : isPositive;
      const sign = isPositive ? '+' : '';
      const cls = isGood ? 'pos' : 'neg';
      const formattedDiff = typeof diff === 'number' && !Number.isInteger(diff) ? diff.toFixed(1) : Math.round(diff);
      return ` <span class="stat-diff ${cls}">(${sign}${formattedDiff}${unit})</span>`;
    };

    if (hp) hp.innerHTML = `${stats.hp.toLocaleString()} HP${formatDiff(stats.hp, baseStats.hp, ' HP')}`;
    if (torque) torque.innerHTML = `${stats.torque.toLocaleString()} Nm${formatDiff(stats.torque, baseStats.torque, ' Nm')}`;
    if (weight) weight.innerHTML = `${stats.weight.toLocaleString()} kg${formatDiff(stats.weight, baseStats.weight, ' kg', true)}`;
    if (z100) z100.innerHTML = `${stats.zeroToHundred}s${formatDiff(parseFloat(stats.zeroToHundred), parseFloat(baseStats.zeroToHundred), 's', true)}`;
    if (qm) qm.innerHTML = `${stats.quarterMileEst}s${formatDiff(parseFloat(stats.quarterMileEst), parseFloat(baseStats.quarterMileEst), 's', true)}`;
    if (top) top.innerHTML = `${stats.topSpeed.toLocaleString()} km/h${formatDiff(stats.topSpeed, baseStats.topSpeed, ' km/h')}`;

    const engineBadge = document.getElementById('hudEngineBadge');
    if (engineBadge) {
      engineBadge.innerText = stats.engineDesc + (isPreviewing && stats.engineDesc !== baseStats.engineDesc ? ' (TEST)' : '');
    }

    const indBadge = document.getElementById('hudInductionBadge');
    if (indBadge) {
      indBadge.innerText = stats.inductionDesc + (isPreviewing && stats.inductionDesc !== baseStats.inductionDesc ? ' (TEST)' : '');
    }

    const gearList = document.getElementById('hudGearSpeeds');
    if (gearList && stats.gearSpeeds) {
      gearList.innerHTML = stats.gearSpeeds.map((spd, idx) => `
        <span class="gear-pill">G${idx + 1}: ${spd} km/h</span>
      `).join(' ');
    }
  }
}
