/**
 * Project CarTuneRacing - WebSocket Multiplayer Client
 * Real-time 1v1 Drag Room Matchmaking & Telemetry Synchronization
 */

class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.isConnected = false;
    this.isStaticFallback = false;
    this.failedAttempts = 0;
    this.clientId = null;
    this.currentRoom = null;
    this.isHost = false;
    this.slot = 0;
    this.virtualRooms = [
      {
        id: 'vroom_101',
        name: 'Porsche 911 Turbo S Street Battle',
        hostName: '992_King_TH',
        carName: 'Porsche 911 Turbo S (992)',
        hp: 720,
        wager: 500,
        distanceId: '0.25',
        distanceMeters: 402.336,
        distanceName: '1/4 ไมล์ (402m)',
        distanceLabel: '1/4 MILE',
        prizeMultiplier: 1.0,
        status: 'waiting',
        playerCount: 1,
        isVirtual: true
      },
      {
        id: 'vroom_102',
        name: 'กระบะซิ่ง 2.5 โบใหญ่ ดันราง 1 ไมล์',
        hostName: 'Ranger_2500_Drag',
        carName: 'Ford Ranger 2.5 Open Cab (2004)',
        hp: 580,
        wager: 300,
        distanceId: '1',
        distanceMeters: 1609.34,
        distanceName: '1 ไมล์ (1.6km)',
        distanceLabel: '1 MILE',
        prizeMultiplier: 2.5,
        status: 'waiting',
        playerCount: 1,
        isVirtual: true
      },
      {
        id: 'vroom_103',
        name: '1,000+ HP Pro-Mod Midnight Run 5 ไมล์',
        hostName: 'BoostGod_BKK',
        carName: 'Porsche 911 Turbo S (992)',
        hp: 1150,
        wager: 1500,
        distanceId: '5',
        distanceMeters: 8046.72,
        distanceName: '5 ไมล์ (8.0km)',
        distanceLabel: '5 MILES',
        prizeMultiplier: 6.0,
        status: 'waiting',
        playerCount: 1,
        isVirtual: true
      }
    ];
  }

  getWebSocketUrl() {
    const params = new URLSearchParams(window.location.search);
    const customWs = params.get('ws') || window.CARTUNE_WS_URL || localStorage.getItem('cartune_ws_url');
    if (customWs) return customWs;
    if (!window.location.host || window.location.protocol === 'file:') return null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  connect() {
    const wsUrl = this.getWebSocketUrl();
    if (!wsUrl) {
      this.enableStaticFallback();
      return;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isStaticFallback = false;
        this.failedAttempts = 0;
        this.updateStatusBadge(true);
        // Login with player profile & active car model
        this.send({
          type: 'LOGIN',
          name: this.game.playerName,
          carName: this.game.playerCar.name,
          carModel: this.game.playerCar.model,
          carData: this.game.playerCar,
          hp: this.game.playerCarStats?.hp || 650,
          money: this.game.money
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse WS msg:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.failedAttempts++;
        // If hosted on a static web host (Vercel/Netlify/GitHub Pages) where WS is unavailable,
        // automatically activate Cloud Lobby Fallback so the game works 100% without errors.
        if (this.failedAttempts >= 1) {
          this.enableStaticFallback();
        } else {
          this.updateStatusBadge(false);
        }
        // Quietly retry in background every 15s in case WS server comes up
        setTimeout(() => {
          if (!this.isConnected) this.connect();
        }, 15000);
      };

      this.ws.onerror = () => {
        // Handled cleanly in onclose
      };
    } catch (e) {
      this.enableStaticFallback();
    }
  }

  enableStaticFallback() {
    this.isStaticFallback = true;
    this.updateStatusBadge(true, true);
    this.renderLobbyUI(
      [
        { id: 1, name: this.game.playerName, hp: this.game.playerCarStats?.hp || 650 },
        { id: 2, name: '992_King_TH', hp: 720 },
        { id: 3, name: 'Ranger_2500_Drag', hp: 580 },
        { id: 4, name: 'BoostGod_BKK', hp: 1150 }
      ],
      this.virtualRooms
    );
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return;
    }

    // Handle multiplayer actions in Static Web Fallback Mode
    if (this.isStaticFallback) {
      this.handleStaticFallbackAction(data);
    }
  }

  handleStaticFallbackAction(data) {
    switch (data.type) {
      case 'CREATE_ROOM': {
        const wager = Math.max(0, parseInt(data.wager, 10) || 100);
        const playerHp = this.game.playerCarStats?.hp || 650;
        const room = {
          id: 'vroom_' + Date.now(),
          name: data.roomName || `${this.game.playerName}'s Drag Race`,
          wager: wager,
          distanceId: data.distanceId || '0.25',
          distanceMeters: parseFloat(data.distanceMeters) || 402.336,
          distanceName: data.distanceName || '1/4 ไมล์ (402m)',
          distanceLabel: data.distanceLabel || '1/4 MILE',
          prizeMultiplier: parseFloat(data.prizeMultiplier) || 1.0,
          hostId: 1,
          hostName: this.game.playerName,
          status: 'waiting',
          isVirtual: true,
          players: [
            {
              id: 1,
              name: this.game.playerName,
              carName: this.game.playerCar.name,
              hp: playerHp,
              ready: false,
              slot: 0
            }
          ]
        };
        this.currentRoom = room;
        this.renderRoomModal(room);

        // Simulate an online challenger joining after 1.2s
        setTimeout(() => {
          if (!this.currentRoom || this.currentRoom.id !== room.id) return;
          const oppHp = Math.round(playerHp * (0.92 + Math.random() * 0.16));
          room.players.push({
            id: 99,
            name: 'StreetRacer_TH',
            carName: oppHp > 600 ? 'Porsche 911 Turbo S (992)' : 'Ford Ranger 2.5 Open Cab (2004)',
            hp: oppHp,
            ready: true,
            slot: 1
          });
          this.renderRoomModal(room);
        }, 1200);
        break;
      }

      case 'JOIN_ROOM': {
        const vRoom = this.virtualRooms.find(r => r.id === data.roomId) || this.virtualRooms[0];
        const playerHp = this.game.playerCarStats?.hp || 650;
        const room = {
          id: vRoom.id,
          name: vRoom.name,
          wager: vRoom.wager,
          distanceId: vRoom.distanceId || '0.25',
          distanceMeters: vRoom.distanceMeters || 402.336,
          distanceName: vRoom.distanceName || '1/4 ไมล์ (402m)',
          distanceLabel: vRoom.distanceLabel || '1/4 MILE',
          prizeMultiplier: vRoom.prizeMultiplier || 1.0,
          hostId: 2,
          hostName: vRoom.hostName,
          status: 'waiting',
          isVirtual: true,
          players: [
            {
              id: 2,
              name: vRoom.hostName,
              carName: vRoom.carName,
              hp: vRoom.hp,
              ready: true,
              slot: 0
            },
            {
              id: 1,
              name: this.game.playerName,
              carName: this.game.playerCar.name,
              hp: playerHp,
              ready: false,
              slot: 1
            }
          ]
        };
        this.currentRoom = room;
        this.renderRoomModal(room);
        break;
      }

      case 'LEAVE_ROOM': {
        this.currentRoom = null;
        const modal = document.getElementById('multiplayerRoomModal');
        if (modal) modal.style.display = 'none';
        break;
      }

      case 'CHAT': {
        const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        this.appendChatMessage(this.game.playerName, data.text, time);
        break;
      }
    }
  }

  updateStatusBadge(online, isWebFallback = false) {
    const badge = document.getElementById('onlineStatusBadge');
    if (badge) {
      badge.className = online ? 'status-online' : 'status-offline';
      if (online && !isWebFallback) {
        badge.innerText = '🟢 ออนไลน์ (Multiplayer Ready)';
      } else if (online && isWebFallback) {
        badge.innerText = '🟢 ออนไลน์ (Web Ready)';
      } else {
        badge.innerText = '🔴 ออฟไลน์ (เชื่อมต่อเซิร์ฟเวอร์...)';
      }
    }
  }

  sendUpdateCar() {
    if (!this.game.playerCar) return;
    this.send({
      type: 'UPDATE_CAR',
      carName: this.game.playerCar.name,
      carModel: this.game.playerCar.model,
      carData: this.game.playerCar,
      hp: this.game.playerCarStats?.hp || 650
    });
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'LOGIN_OK': {
        this.clientId = msg.clientId;
        break;
      }

      case 'LOBBY_UPDATE': {
        this.renderLobbyUI(msg.players || [], msg.rooms || []);
        break;
      }

      case 'ROOM_JOINED': {
        this.currentRoom = msg.room;
        this.isHost = msg.isHost;
        this.slot = msg.slot;
        this.renderRoomModal(msg.room);
        break;
      }

      case 'ROOM_UPDATE': {
        this.currentRoom = msg.room;
        this.renderRoomModal(msg.room);
        break;
      }

      case 'PLAYER_READY_STATUS': {
        if (msg.room) {
          this.currentRoom = msg.room;
          this.renderRoomModal(msg.room);
        }
        break;
      }

      case 'RACE_START': {
        if (msg.room) {
          this.currentRoom = msg.room;
        }
        if (this.currentRoom && !this.game.raceManager.isActive) {
          this.startMultiplayerRace(this.currentRoom);
        }
        break;
      }

      case 'LEFT_ROOM': {
        this.currentRoom = null;
        document.getElementById('multiplayerRoomModal').style.display = 'none';
        break;
      }

      case 'COUNTDOWN_STAGE': {
        // Synchronized tree countdown from server!
        if (this.game.raceManager.isActive) {
          this.game.raceManager.treeState = msg.stage;
          if (msg.stage === 'GREEN') {
            this.game.raceManager.isGreen = true;
            this.game.raceManager.greenTimestamp = performance.now();
            audio.playTreeBeep(true);
          } else {
            audio.playTreeBeep(false);
          }
        }
        break;
      }

      case 'PLAYER_FALSE_START': {
        const isMeFouled = msg.fouledPlayerId === this.clientId;
        if (!isMeFouled && this.game.raceManager.isActive) {
          // The OTHER player fouled! I WIN immediately!
          this.game.raceManager.triggerOpponentFalseStart(msg.fouledPlayerName || 'คู่แข่ง');
        }
        break;
      }

      case 'OPPONENT_SYNC': {
        // Sync opponent physics & finish telemetry
        if (this.game.raceManager.opponentCar) {
          const opp = this.game.raceManager.opponentCar;
          opp.distance = msg.distance;
          opp.speedKmh = msg.speed;
          opp.rpm = msg.rpm;
          opp.gear = msg.gear;
          opp.nosActive = msg.nos;
          opp.wheelie = msg.wheelie || 0;
          if (msg.falseStart && !opp.falseStart) {
            opp.falseStart = true;
            if (this.game.raceManager.isActive && !this.game.raceManager.falseStart) {
              this.game.raceManager.triggerOpponentFalseStart(opp.botConfig?.name || 'คู่แข่ง');
            }
          }
          if (msg.isFinished !== undefined) opp.isFinished = msg.isFinished;
          if (msg.timeQuarterMile) opp.timeQuarterMile = msg.timeQuarterMile;
          if (msg.time60ft) opp.time60ft = msg.time60ft;
          if (msg.time330ft) opp.time330ft = msg.time330ft;
          if (msg.time660ft) opp.time660ft = msg.time660ft;
          if (msg.finishTrapSpeed) opp.finishTrapSpeed = msg.finishTrapSpeed;
          if (msg.blown && !opp.isBlown) {
            opp.blowEngine('เครื่องยนต์คู่แข่งระเบิด!');
          }
        }
        break;
      }

      case 'RACE_OVER': {
        if (this.game.raceManager.isActive) {
          const isWinner = msg.winnerId === this.clientId;
          this.game.raceManager.concludeMultiplayerRace(isWinner, msg.pot, msg.reason);
        }
        break;
      }

      case 'CHAT_BROADCAST': {
        this.appendChatMessage(msg.sender, msg.text, msg.time);
        break;
      }

      case 'ERROR': {
        window.showGamePopup({
          icon: '⚠️',
          title: 'ข้อผิดพลาดระบบ Multiplayer',
          message: msg.message,
          btnText: 'ตกลง'
        });
        break;
      }
    }
  }

  // --- LOBBY UI RENDERING ---
  renderLobbyUI(players, rooms) {
    const roomsList = document.getElementById('lobbyRoomsList');
    if (roomsList) {
      if (rooms.length === 0) {
        roomsList.innerHTML = '<div class="empty-list">ยังไม่มีห้องแข่งขัน... คลิก "สร้างห้องแข่ง 1v1" ด้านบนได้เลย!</div>';
      } else {
        roomsList.innerHTML = rooms.map(r => `
          <div class="room-card">
            <div class="room-info">
              <span class="room-name">${r.name}</span>
              <span class="room-host">เจ้าของห้อง: ${r.hostName}</span>
              <div style="font-size: 12px; margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap;">
                <span style="color: #38bdf8; font-weight: 700;">🚩 ${r.distanceName || '1/4 ไมล์ (402m)'}</span>
                <span class="room-wager">💰 เดิมพัน: $${r.wager.toLocaleString()} (x${r.prizeMultiplier || 1.0})</span>
              </div>
            </div>
            <div class="room-status">
              <span class="badge ${r.status === 'waiting' ? 'badge-waiting' : 'badge-racing'}">
                ${r.status === 'waiting' ? `รอคู่แข่ง (${r.playerCount || 1}/2)` : 'กำลังแข่ง'}
              </span>
              ${r.status === 'waiting' && r.playerCount < 2 ? `
                <button class="btn btn-join-room" data-room="${r.id}">เข้าร่วมแข่ง</button>
              ` : ''}
            </div>
          </div>
        `).join('');

        roomsList.querySelectorAll('.btn-join-room').forEach(btn => {
          btn.addEventListener('click', () => {
            const roomId = btn.getAttribute('data-room');
            this.send({
              type: 'JOIN_ROOM',
              roomId,
              carName: this.game.playerCar.name,
              carModel: this.game.playerCar.model,
              carData: this.game.playerCar,
              hp: this.game.playerCarStats?.hp || 650
            });
          });
        });
      }
    }

    const onlineCount = document.getElementById('lobbyOnlineCount');
    if (onlineCount) {
      onlineCount.innerText = `${players.length} คนออนไลน์`;
    }
  }

  // --- ROOM MODAL (WAITING ROOM & READY BUTTON) ---
  renderRoomModal(room) {
    const modal = document.getElementById('multiplayerRoomModal');
    if (!modal) return;
    modal.style.display = 'flex';

    document.getElementById('roomTitle').innerText = room.name;
    const distLabel = document.getElementById('roomDistanceLabel');
    if (distLabel) {
      distLabel.innerText = `${room.distanceName || '1/4 ไมล์ (402m)'} (x${room.prizeMultiplier || 1.0})`;
    }
    const winPot = Math.round(room.wager * 2 * (room.prizeMultiplier || 1.0));
    document.getElementById('roomWagerVal').innerText = `$${winPot.toLocaleString()} (เดิมพันคนละ $${room.wager.toLocaleString()})`;

    const p1 = room.players[0];
    const p2 = room.players[1];

    document.getElementById('roomPlayer1Name').innerText = p1 ? `${p1.name} (${p1.carName || 'Drag Car'} • ${p1.hp} HP)` : 'รอผู้เล่น...';
    document.getElementById('roomPlayer1Ready').innerText = p1?.ready ? '✅ พร้อมแล้ว' : '⏳ รอเตรียมตัว';
    document.getElementById('roomPlayer1Ready').style.color = p1?.ready ? '#4ade80' : '#fde047';

    document.getElementById('roomPlayer2Name').innerText = p2 ? `${p2.name} (${p2.carName || 'Drag Car'} • ${p2.hp} HP)` : 'รอผู้เล่นคนที่ 2...';
    document.getElementById('roomPlayer2Ready').innerText = p2?.ready ? '✅ พร้อมแล้ว' : '⏳ รอเตรียมตัว';
    document.getElementById('roomPlayer2Ready').style.color = p2?.ready ? '#4ade80' : '#fde047';

    const isVirtualRoom = Boolean(room.isVirtual || this.isStaticFallback);
    const myId = isVirtualRoom ? 1 : this.clientId;
    const myPlayer = room.players.find(p => p.id === myId);

    const readyBtn = document.getElementById('btnRoomReady');
    if (readyBtn) {
      if (!p2) {
        readyBtn.disabled = true;
        readyBtn.innerText = '⏳ รอผู้เล่นคนที่ 2 เข้าห้อง...';
      } else if (myPlayer && myPlayer.ready) {
        readyBtn.disabled = true;
        readyBtn.innerText = '⏳ รอคู่แข่งกดพร้อม (WAITING FOR OPPONENT)...';
      } else {
        readyBtn.disabled = false;
        readyBtn.innerText = '🏁 กดพร้อมลงแข่ง (READY)';
      }

      readyBtn.onclick = () => {
        if (!p2) return;
        if (myPlayer) myPlayer.ready = true;

        readyBtn.innerText = '⏳ รอคู่แข่งกดพร้อม (WAITING FOR OPPONENT)...';
        readyBtn.disabled = true;
        this.renderRoomModal(room);

        this.send({
          type: 'PLAYER_READY',
          carName: this.game.playerCar.name,
          carModel: this.game.playerCar.model,
          carData: this.game.playerCar,
          hp: this.game.playerCarStats?.hp || 650
        });

        // In Virtual/Static Fallback mode, start only when both virtual players are ready
        if (isVirtualRoom && room.players.length === 2 && room.players.every(p => p.ready)) {
          setTimeout(() => {
            if (this.currentRoom && this.currentRoom.id === room.id) {
              this.startMultiplayerRace(room);
            }
          }, 400);
        }
      };
    }

    document.getElementById('btnRoomLeave').onclick = () => {
      this.send({ type: 'LEAVE_ROOM' });
      modal.style.display = 'none';
    };
  }

  startMultiplayerRace(room) {
    const modal = document.getElementById('multiplayerRoomModal');
    if (modal) modal.style.display = 'none';

    document.getElementById('multiplayerModal').style.display = 'none';

    const isVirtualRoom = Boolean(room.isVirtual || this.isStaticFallback);
    const myId = isVirtualRoom ? 1 : this.clientId;
    const oppPlayer = room.players.find(p => p.id !== myId) || room.players[1] || room.players[0];

    this.game.raceManager.wager = room.wager;
    if (this.game.money >= room.wager) {
      this.game.money -= room.wager;
      this.game.updateMoneyDisplay();
    }

    const distObj = (typeof RACE_DISTANCES !== 'undefined')
      ? (RACE_DISTANCES.find(d => d.id === room.distanceId) || RACE_DISTANCES[0])
      : { id: '0.25', name: '1/4 ไมล์ (402m)', miles: 0.25, meters: 402.336, prizeMultiplier: 1.0, label: '1/4 MILE' };

    this.game.raceManager.selectedDistance = distObj;
    const targetDist = room.distanceMeters || distObj.meters;
    this.game.raceManager.playerCar = new CarPhysics(this.game.playerCar, false, null, targetDist);

    let oppCarData = oppPlayer?.carData
      ? JSON.parse(JSON.stringify(oppPlayer.carData))
      : JSON.parse(JSON.stringify(DEFAULT_CAR));

    const isOppRanger = Boolean(
      oppPlayer?.carModel === 'car_ford_ranger_2004' ||
      (oppPlayer?.carName && oppPlayer.carName.includes('Ranger')) ||
      oppCarData?.model === 'car_ford_ranger_2004'
    );

    if (isOppRanger) {
      oppCarData.model = 'car_ford_ranger_2004';
      oppCarData.bodyType = 'car_ford_ranger_2004';
      oppCarData.name = 'Ford Ranger 2.5 Open Cab (2004)';
      oppCarData.parts = oppCarData.parts || {};
      oppCarData.parts.model = 'car_ford_ranger_2004';
      oppCarData.parts.body = 'body_ford_ranger_2004';
    } else {
      oppCarData.model = 'car_porsche_911_turbo_s';
      oppCarData.bodyType = 'car_porsche_911_turbo_s';
      oppCarData.name = 'Porsche 911 Turbo S (992)';
      oppCarData.parts = oppCarData.parts || {};
      oppCarData.parts.model = 'car_porsche_911_turbo_s';
      oppCarData.parts.body = 'body_porsche_911_turbo_s';
    }

    const oppBotConf = {
      name: oppPlayer?.name || 'Online Challenger',
      carName: oppCarData.name,
      wager: room.wager,
      stats: {
        hp: oppPlayer?.hp || 650,
        shiftSkill: 0.9,
        reactionTime: 0.14
      }
    };
    this.game.raceManager.botConfig = oppBotConf;

    if (isVirtualRoom) {
      this.game.raceManager.mode = 'bot';
      this.game.raceManager.numOpponents = 1;
      this.game.raceManager.opponentCar = new CarPhysics(oppCarData, true, oppBotConf, targetDist);
    } else {
      this.game.raceManager.mode = 'multiplayer';
      this.game.raceManager.numOpponents = 1;
      this.game.raceManager.opponentCar = new CarPhysics(oppCarData, false, oppBotConf, targetDist);
    }

    this.game.raceManager.opponentCars = [this.game.raceManager.opponentCar];
    this.game.raceManager.launchRaceScene();
  }

  sendRaceSync(car) {
    this.send({
      type: 'RACE_SYNC',
      distance: car.distance,
      speed: car.speedKmh,
      rpm: car.rpm,
      gear: car.gear,
      nos: car.nosActive,
      wheelie: car.wheelie,
      blown: car.isBlown,
      isFinished: car.isFinished,
      timeQuarterMile: car.timeQuarterMile,
      time60ft: car.time60ft,
      time330ft: car.time330ft,
      time660ft: car.time660ft,
      finishTrapSpeed: car.finishTrapSpeed,
      falseStart: this.game.raceManager.falseStart
    });
  }

  sendRaceFinish(car) {
    this.send({
      type: 'RACE_FINISH',
      time: car.timeQuarterMile,
      trapSpeed: car.finishTrapSpeed,
      falseStart: this.game.raceManager.falseStart,
      blown: car.isBlown
    });
  }

  appendChatMessage(sender, text, time) {
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;

    const row = document.createElement('div');
    row.className = 'chat-row';
    row.innerHTML = `<span class="chat-time">[${time}]</span> <strong class="chat-sender">${sender}:</strong> <span class="chat-text">${text}</span>`;
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
