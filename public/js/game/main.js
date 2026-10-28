// --- GLOBAL CENTERED ARCADE POPUP NOTIFICATION ---
window.showGamePopup = function({
  title = 'แจ้งเตือน',
  message = '',
  icon = '🏁',
  btnText = 'ตกลง (OK)',
  onConfirm = null
} = {}) {
  const modal = document.getElementById('gameNotificationModal');
  if (!modal) {
    alert(message.replace(/<[^>]+>/g, ''));
    return;
  }
  document.getElementById('notifyIcon').innerText = icon;
  document.getElementById('notifyTitle').innerText = title;
  document.getElementById('notifyMessage').innerHTML = message;

  const btn = document.getElementById('btnNotifyOk');
  btn.innerText = btnText;
  btn.onclick = () => {
    modal.style.display = 'none';
    if (onConfirm) onConfirm();
    audio.playClick();
  };

  modal.style.display = 'flex';
  audio.playClick();
};

class Game {
  constructor() {
    this.playerName = 'Tuner Racer';
    this.money = 3500; // Starting money for building and racing
    this.inventory = [
      'chassis_tube',
      'chassis_pickup_ladder',
      'body_porsche_911_turbo_s',
      'body_ford_ranger_2004',
      'block_i4_vtec',
      'block_diesel_pickup',
      'head_stock',
      'pistons_cast',
      'starter_oem',
      'ignition_oem',
      'fuel_stock',
      'cool_oem',
      'ind_turbo_small',
      'ic_street',
      'nos_none',
      'exh_straight_3in',
      'trans_manual_4sp',
      'tires_street',
      'aero_stock',
      'brake_stock',
      'front_stock',
      'skirts_stock',
      'wing_none'
    ];

    this.ownedCarModels = ['car_porsche_911_turbo_s', 'car_ford_ranger_2004'];
    this.savedCars = {}; // modelId -> car data
    this.playerCar = JSON.parse(JSON.stringify(DEFAULT_CAR));
    this.playerCarStats = null;
    this.selectedDistanceId = '0.25';
    this.selectedBotCount = 1; // 1 (1v1), 2, 3, or 5 opponents

    // Subsystems
    this.garageUI = null;
    this.tunerUI = null;
    this.raceManager = null;
    this.multiplayer = null;
  }

  init() {
    this.loadData();

    // Initialize subsystems
    this.garageUI = new GarageUI(this);
    this.tunerUI = new TunerUI(this);
    this.raceManager = new RaceManager(this);
    this.multiplayer = new MultiplayerManager(this);

    this.garageUI.init();
    this.tunerUI.init();
    this.raceManager.init();
    this.multiplayer.connect();

    this.bindGlobalNavigation();
    this.bindSettingsModal();
    this.bindTitleScreen();
    this.updateMoneyDisplay();

    // Start on Title Screen
    this.showTitleScreen();
  }

  switchView(viewName) {
    // Close any open modals
    document.querySelectorAll('.game-modal').forEach(m => {
      m.style.display = 'none';
    });

    const title = document.getElementById('titleScreen');
    const garage = document.getElementById('garageView');
    const workshop = document.getElementById('workshopView');
    const race = document.getElementById('raceView');

    // First, strictly hide and add 'hidden' class to all 4 main views
    [title, garage, workshop, race].forEach(el => {
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    });

    // Next, display only the requested view
    if (viewName === 'title') {
      if (title) {
        title.classList.remove('hidden');
        title.style.display = 'flex';
      }
      if (this.garageUI) {
        this.garageUI.stopEngine();
      }
    } else if (viewName === 'garage') {
      if (garage) {
        garage.classList.remove('hidden');
        garage.style.display = 'flex';
      }
      if (this.garageUI) {
        this.garageUI.stopEngine();
        this.garageUI.setCameraMode('body', false);
        this.garageUI.updateRosterDisplay();
        this.garageUI.updateStatsHUD();
      }
    } else if (viewName === 'workshop') {
      if (workshop) {
        workshop.classList.remove('hidden');
        workshop.style.display = 'flex';
      }
      if (this.garageUI) {
        this.garageUI.setCameraMode('engine', false);
        this.garageUI.updateStatsHUD();
        this.garageUI.renderCategoryList();
        this.garageUI.renderPartsList();
      }
    } else if (viewName === 'race') {
      if (race) {
        race.classList.remove('hidden');
        race.style.display = 'block';
      }
      if (this.garageUI) {
        this.garageUI.stopEngine();
      }
    }

    // Always scroll to top so view doesn't start midway
    window.scrollTo(0, 0);
  }

  showTitleScreen() {
    this.switchView('title');
  }

  showGarage() {
    this.switchView('garage');
  }

  showWorkshop() {
    this.switchView('workshop');
  }

  normalizeCarModelData(carObj, modelId) {
    const cat = CAR_CATALOG.find(c => c.id === modelId) || CAR_CATALOG[0];
    const resolvedId = cat.id;
    const isRanger = resolvedId === 'car_ford_ranger_2004';
    const expectedBody = isRanger ? 'body_ford_ranger_2004' : 'body_porsche_911_turbo_s';
    const defaultChassis = isRanger ? 'chassis_pickup_ladder' : 'chassis_tube';

    const baseParts = {
      ...DEFAULT_CAR.parts,
      ...(cat.defaultParts || {}),
      ...(carObj?.parts || {})
    };

    baseParts.model = resolvedId;
    if (baseParts.body !== 'body_none') {
      baseParts.body = expectedBody;
    }
    if (!baseParts.chassis || (isRanger && baseParts.chassis === 'chassis_tube') || (!isRanger && baseParts.chassis === 'chassis_pickup_ladder')) {
      baseParts.chassis = defaultChassis;
    }

    return {
      ...DEFAULT_CAR,
      ...(carObj || {}),
      model: resolvedId,
      bodyType: resolvedId,
      name: cat.name,
      parts: baseParts,
      tuning: { ...DEFAULT_CAR.tuning, ...(carObj?.tuning || {}) }
    };
  }

  selectCar(modelId) {
    if (this.playerCar && this.playerCar.model) {
      this.savedCars[this.playerCar.model] = this.normalizeCarModelData(this.playerCar, this.playerCar.model);
    }

    const cat = CAR_CATALOG.find(c => c.id === modelId) || CAR_CATALOG[0];
    if (this.savedCars[cat.id]) {
      this.playerCar = this.normalizeCarModelData(this.savedCars[cat.id], cat.id);
    } else {
      this.playerCar = this.normalizeCarModelData(null, cat.id);
    }
    this.savedCars[cat.id] = JSON.parse(JSON.stringify(this.playerCar));

    if (this.garageUI) {
      const idx = CAR_CATALOG.findIndex(c => c.id === cat.id);
      if (idx !== -1) this.garageUI.currentCatalogIndex = idx;
      this.garageUI.updateStatsHUD();
      this.garageUI.updateRosterDisplay();
    } else if (typeof CarSystem !== 'undefined') {
      this.playerCarStats = CarSystem.calculateStats(this.playerCar);
    }

    if (this.multiplayer) {
      this.multiplayer.sendUpdateCar();
    }
    this.saveData();
  }

  buyCar(catalogCar) {
    if (this.money < catalogCar.price) return false;
    this.money -= catalogCar.price;
    if (!this.ownedCarModels.includes(catalogCar.id)) {
      this.ownedCarModels.push(catalogCar.id);
    }
    this.selectCar(catalogCar.id);
    this.updateMoneyDisplay();
    this.saveData();
    audio.playSuccess();
    return true;
  }

  bindSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const btnClose = document.getElementById('btnCloseSettings');
    const btnSave = document.getElementById('btnSaveSettings');
    const btnTest = document.getElementById('btnTestSound');

    const sMaster = document.getElementById('sliderMasterVol');
    const sEngine = document.getElementById('sliderEngineVol');
    const sSfx = document.getElementById('sliderSfxVol');

    const lblMaster = document.getElementById('labelMasterVol');
    const lblEngine = document.getElementById('labelEngineVol');
    const lblSfx = document.getElementById('labelSfxVol');

    if (sMaster && lblMaster) {
      sMaster.value = Math.round(audio.masterVolume * 100);
      lblMaster.innerText = sMaster.value + '%';
      sMaster.addEventListener('input', () => {
        const val = parseInt(sMaster.value, 10);
        lblMaster.innerText = val + '%';
        audio.setMasterVolume(val / 100);
      });
    }

    if (sEngine && lblEngine) {
      sEngine.value = Math.round(audio.engineVolume * 100);
      lblEngine.innerText = sEngine.value + '%';
      sEngine.addEventListener('input', () => {
        const val = parseInt(sEngine.value, 10);
        lblEngine.innerText = val + '%';
        audio.setEngineVolume(val / 100);
      });
    }

    if (sSfx && lblSfx) {
      sSfx.value = Math.round(audio.sfxVolume * 100);
      lblSfx.innerText = sSfx.value + '%';
      sSfx.addEventListener('input', () => {
        const val = parseInt(sSfx.value, 10);
        lblSfx.innerText = val + '%';
        audio.setSfxVolume(val / 100);
      });
    }

    if (btnTest) {
      btnTest.addEventListener('click', () => {
        audio.playTestSound();
      });
    }

    const close = () => {
      if (modal) modal.style.display = 'none';
      audio.playClick();
    };

    if (btnClose) btnClose.addEventListener('click', close);
    if (btnSave) btnSave.addEventListener('click', close);
  }

  bindTitleScreen() {
    const btnStart = document.getElementById('btnTitleStart');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this.showGarage();
        audio.playClick();
      });
    }

    const btnSettings = document.getElementById('btnTitleSettings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }

    const btnFarm = document.getElementById('btnTitleFarm');
    if (btnFarm) {
      btnFarm.addEventListener('click', () => {
        const title = document.getElementById('titleScreen');
        if (title) title.style.display = 'none';
        const activeDist = (typeof RACE_DISTANCES !== 'undefined')
          ? (RACE_DISTANCES.find(d => d.id === this.selectedDistanceId) || RACE_DISTANCES[0])
          : null;
        this.raceManager.startTimeTrialRace(activeDist);
        audio.playClick();
      });
    }

    const navTitle = document.getElementById('navTitle');
    if (navTitle) {
      navTitle.addEventListener('click', () => {
        this.showTitleScreen();
        audio.playClick();
      });
    }

    const navSettings = document.getElementById('navSettings');
    if (navSettings) {
      navSettings.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) {
          modal.style.display = 'flex';
          audio.playClick();
        }
      });
    }
  }

  bindGlobalNavigation() {
    // Top Nav Buttons
    const btnGarage = document.getElementById('navGarage');
    const btnTuner = document.getElementById('navTuner');
    const btnBots = document.getElementById('navBots');
    const btnMultiplayer = document.getElementById('navMultiplayer');
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const btnFarmMoney = document.getElementById('navFarmMoney');
    const btnEmergencyCash = document.getElementById('btnEmergencyCash');

    const showModal = (modalId) => {
      if (this.garageUI && this.garageUI.isEngineRunning) {
        this.garageUI.stopEngine();
      }
      document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
      const target = document.getElementById(modalId);
      if (target) target.style.display = 'flex';
      audio.playClick();
    };

    if (btnGarage) {
      btnGarage.addEventListener('click', () => {
        this.showGarage();
        audio.playClick();
      });
    }

    if (btnFarmMoney) {
      btnFarmMoney.addEventListener('click', () => {
        document.querySelectorAll('.game-modal').forEach(m => m.style.display = 'none');
        const activeDist = (typeof RACE_DISTANCES !== 'undefined')
          ? (RACE_DISTANCES.find(d => d.id === this.selectedDistanceId) || RACE_DISTANCES[0])
          : null;
        this.raceManager.startTimeTrialRace(activeDist);
        audio.playClick();
      });
    }

    if (btnEmergencyCash) {
      btnEmergencyCash.addEventListener('click', () => {
        this.money += 1000;
        this.updateMoneyDisplay();
        window.showGamePopup({
          icon: '🎁',
          title: 'สปอนเซอร์มอบเงินช่วยเหลือฉุกเฉิน!',
          message: 'คุณได้รับเงินสนับสนุนฉุกเฉิน <strong>+$1,000</strong> เข้ากระเป๋าเรียบร้อยแล้ว!<br><br>พร้อมนำไปอัปเกรดชิ้นส่วนรถ หรือลงแข่งกอบกู้ชื่อเสียงได้ทันที!',
          btnText: 'ลุยกันต่อเลย! 🚀'
        });
      });
    }

    if (btnTuner) {
      btnTuner.addEventListener('click', () => {
        showModal('tunerModal');
        this.tunerUI.drawDynoGraph();
      });
    }

    if (btnBots) {
      btnBots.addEventListener('click', () => {
        this.renderBotList();
        showModal('botsModal');
      });
    }

    if (btnMultiplayer) {
      btnMultiplayer.addEventListener('click', () => {
        showModal('multiplayerModal');
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.game-modal').style.display = 'none';
        audio.playClick();
      });
    });

    // Sound Mute Toggle
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        const muted = audio.toggleMute();
        btnSoundToggle.innerText = muted ? '🔇 เปิดเสียง' : '🔊 ปิดเสียง';
      });
    }

    // Multiplayer Create Room Button
    const btnCreateRoom = document.getElementById('btnOpenCreateRoomModal');
    if (btnCreateRoom) {
      btnCreateRoom.addEventListener('click', () => {
        const roomName = prompt('ตั้งชื่อห้องแข่งขัน 1v1:', `${this.playerName}'s Drag Race`);
        if (!roomName) return;
        const wagerStr = prompt('จำนวนเงินเดิมพัน ($):', '500');
        const wager = parseInt(wagerStr, 10) || 100;

        if (this.money < wager) {
          window.showGamePopup({
            icon: '💰',
            title: 'เงินเดิมพันไม่เพียงพอ',
            message: `เงินในกระเป๋าของคุณมีเพียง <strong>$${this.money.toLocaleString()}</strong> ไม่พอวางเดิมพัน <strong>$${wager.toLocaleString()}</strong><br><br>คุณสามารถกดปุ่ม <em>"🌾 วิ่งซ้อมฟาร์มเงิน (FREE)"</em> ด้านบนเพื่อหาเงินเพิ่มได้ฟรี!`,
            btnText: 'เข้าใจแล้ว'
          });
          return;
        }

        this.multiplayer.send({
          type: 'CREATE_ROOM',
          roomName: roomName,
          wager: wager,
          carName: this.playerCar.name,
          carModel: this.playerCar.model,
          carData: this.playerCar,
          hp: this.playerCarStats?.hp || 650
        });
      });
    }

    // Chat Send
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const sendChat = () => {
      const text = chatInput?.value?.trim();
      if (text) {
        this.multiplayer.send({ type: 'CHAT', text: text });
        if (chatInput) chatInput.value = '';
      }
    };
    if (btnSendChat) btnSendChat.addEventListener('click', sendChat);
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
      });
    }
  }

  // --- BOT OPPONENTS LIST ---
  renderBotList() {
    const container = document.getElementById('botsListContainer');
    if (!container) return;

    const activeDist = (typeof RACE_DISTANCES !== 'undefined')
      ? (RACE_DISTANCES.find(d => d.id === this.selectedDistanceId) || RACE_DISTANCES[0])
      : { id: '0.25', name: '1/4 ไมล์ (402m)', miles: 0.25, meters: 402.336, prizeMultiplier: 1.0, label: '1/4 MILE' };

    if (this.raceManager) {
      this.raceManager.selectedDistance = activeDist;
    }

    // Render Distance Selection Pills
    const distSelector = document.getElementById('raceDistanceSelector');
    if (distSelector && typeof RACE_DISTANCES !== 'undefined') {
      distSelector.innerHTML = RACE_DISTANCES.map(d => `
        <div class="dist-pill ${d.id === this.selectedDistanceId ? 'active' : ''}" data-dist-id="${d.id}">
          <span class="dist-pill-name">🏁 ${d.label}</span>
          <span class="dist-pill-mult">รางวัล x${d.prizeMultiplier}</span>
        </div>
      `).join('');

      distSelector.querySelectorAll('.dist-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.selectedDistanceId = pill.getAttribute('data-dist-id');
          const newDist = RACE_DISTANCES.find(d => d.id === this.selectedDistanceId) || RACE_DISTANCES[0];
          if (this.raceManager) {
            this.raceManager.selectedDistance = newDist;
          }
          audio.playClick();
          this.renderBotList();
        });
      });
    }

    // Render Bot Count Selector Pills (1, 2, 3, 5 Opponents)
    const botCountSelector = document.getElementById('raceBotCountSelector');
    if (botCountSelector) {
      const counts = [
        { count: 1, label: '1v1 ดวลเดี่ยว', desc: 'คู่แข่ง 1 คัน' },
        { count: 2, label: 'ศึก 3 คัน',     desc: 'คู่แข่ง 2 คัน' },
        { count: 3, label: 'กริด 4 คัน',     desc: 'คู่แข่ง 3 คัน' },
        { count: 5, label: 'กริด 6 คัน (Battle)', desc: 'คู่แข่ง 5 คัน' }
      ];

      botCountSelector.innerHTML = counts.map(c => `
        <div class="dist-pill ${c.count === this.selectedBotCount ? 'active' : ''}" data-bot-count="${c.count}">
          <span class="dist-pill-name">👥 ${c.label}</span>
          <span class="dist-pill-mult">${c.desc}</span>
        </div>
      `).join('');

      botCountSelector.querySelectorAll('.dist-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.selectedBotCount = parseInt(pill.getAttribute('data-bot-count'), 10) || 1;
          audio.playClick();
          this.renderBotList();
        });
      });
    }

    // Time Trial / Farm Money Card
    const minReward = Math.round(250 * activeDist.prizeMultiplier);
    const maxReward = Math.round(2500 * activeDist.prizeMultiplier);

    let html = `
      <div class="bot-card" style="background: #064e3b33; border: 2px solid #10b981; margin-bottom: 8px;">
        <div class="bot-avatar">⏱️</div>
        <div class="bot-details">
          <div class="bot-name" style="color: #34d399;">สนามซ้อมจับเวลา & ฟาร์มเงิน (${activeDist.label})</div>
          <div class="bot-dialogue">"วิ่งซ้อมระยะทาง ${activeDist.name} ฟรีไม่มีค่าสมัคร ยิ่งเวลาดียิ่งได้เงินรางวัลสปอนเซอร์มาก!"</div>
          <div class="bot-specs">
            <span>⚡ ไม่มีค่าเดิมพัน (FREE ENTRY)</span>
            <span>💰 รางวัล: $${minReward.toLocaleString()} - $${maxReward.toLocaleString()} (x${activeDist.prizeMultiplier})</span>
          </div>
        </div>
        <div class="bot-actions">
          <button class="btn btn-buy" id="btnStartFarmRaceFromModal" style="padding: 10px 18px; font-weight: 700; background: #059669;">
            🌾 วิ่งฟาร์มเงินฟรี (${activeDist.label})
          </button>
        </div>
      </div>
    `;

    const totalCarsInRace = this.selectedBotCount + 1;

    html += BOT_ROSTER.map((bot, idx) => {
      const canAfford = this.money >= bot.wager;
      const totalPrizePot = Math.round(bot.wager * totalCarsInRace * activeDist.prizeMultiplier);
      return `
        <div class="bot-card">
          <div class="bot-avatar">🤖</div>
          <div class="bot-details">
            <div class="bot-name">${bot.name}</div>
            <div class="bot-dialogue">"${bot.dialogue}"</div>
            <div class="bot-specs">
              <span>🚗 ${bot.carName}</span>
              <span>⚡ ${bot.stats.hp} HP</span>
              <span>💰 เดิมพัน: $${bot.wager.toLocaleString()} (ชนะเลิศรับ $${totalPrizePot.toLocaleString()})</span>
            </div>
          </div>
          <div class="bot-actions">
            <button class="btn btn-race ${canAfford ? '' : 'btn-disabled'}" data-bot-idx="${idx}" ${canAfford ? '' : 'disabled'}>
              ท้าแข่ง ${totalCarsInRace} คัน ($${bot.wager.toLocaleString()})
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    const farmBtn = document.getElementById('btnStartFarmRaceFromModal');
    if (farmBtn) {
      farmBtn.addEventListener('click', () => {
        document.getElementById('botsModal').style.display = 'none';
        this.raceManager.startTimeTrialRace(activeDist);
      });
    }

    container.querySelectorAll('.btn-race').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-bot-idx'), 10);
        document.getElementById('botsModal').style.display = 'none';
        this.raceManager.startBotRace(idx, activeDist, this.selectedBotCount);
      });
    });
  }

  updateMoneyDisplay() {
    const el = document.getElementById('playerMoneyDisplay');
    if (el) {
      el.innerText = `$${this.money.toLocaleString()}`;
    }

    // Show emergency sponsor cash bailout button if money < 150
    const bailoutBtn = document.getElementById('btnEmergencyCash');
    if (bailoutBtn) {
      bailoutBtn.style.display = this.money < 150 ? 'inline-block' : 'none';
    }

    this.saveData();
  }

  saveData() {
    try {
      const saveState = {
        name: this.playerName,
        money: this.money,
        inventory: this.inventory,
        car: this.playerCar,
        ownedCarModels: this.ownedCarModels,
        savedCars: this.savedCars
      };
      localStorage.setItem('cartuneracing_save', JSON.stringify(saveState));
    } catch (e) {}
  }

  loadData() {
    try {
      const saved = localStorage.getItem('cartuneracing_save');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.name) this.playerName = data.name;
        if (data.money !== undefined) this.money = data.money;
        if (data.inventory && Array.isArray(data.inventory)) this.inventory = data.inventory;
        const validCatalogIds = CAR_CATALOG.map(c => c.id);
        if (data.ownedCarModels && Array.isArray(data.ownedCarModels)) {
          this.ownedCarModels = data.ownedCarModels.filter(id => validCatalogIds.includes(id));
        }
        if (!this.ownedCarModels.includes('car_porsche_911_turbo_s')) {
          this.ownedCarModels.unshift('car_porsche_911_turbo_s');
        }
        if (!this.ownedCarModels.includes('car_ford_ranger_2004')) {
          this.ownedCarModels.push('car_ford_ranger_2004');
        }
        ['chassis_pickup_ladder', 'body_ford_ranger_2004', 'block_diesel_pickup'].forEach(item => {
          if (!this.inventory.includes(item)) this.inventory.push(item);
        });
        if (data.savedCars && typeof data.savedCars === 'object') {
          this.savedCars = {};
          for (const [k, v] of Object.entries(data.savedCars)) {
            if (validCatalogIds.includes(k)) {
              this.savedCars[k] = this.normalizeCarModelData(v, k);
            }
          }
        }
        if (data.car && data.car.parts) {
          const loadedTuning = { ...DEFAULT_CAR.tuning, ...(data.car.tuning || {}) };
          // Clean legacy hardcoded gear ratios from previous saves
          for (let i = 1; i <= 8; i++) {
            delete loadedTuning['gear' + i];
          }
          const resolvedModel = validCatalogIds.includes(data.car.model)
            ? data.car.model
            : 'car_porsche_911_turbo_s';
          this.playerCar = this.normalizeCarModelData(
            { ...data.car, tuning: loadedTuning },
            resolvedModel
          );
          this.savedCars[resolvedModel] = JSON.parse(JSON.stringify(this.playerCar));
        }
      }
    } catch (e) {
      console.warn('Failed to load save, using defaults', e);
    }
  }
}

// Start Game on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
  window.gameInstance.init();
});
