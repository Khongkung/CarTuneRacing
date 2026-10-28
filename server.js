/**
 * Project CarTuneRacing - Zero-Dependency Game Server
 * HTTP Static File Server & RFC 6455 WebSocket Multiplayer Engine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// --- HTTP SERVER ---
const server = http.createServer((req, res) => {
  // CORS headers for cross-origin WebSocket / API checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = '/';
  try {
    reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    reqPath = '/';
  }

  // Cloud health-check endpoints (Render, Railway, Fly.io, Docker, etc.)
  if (reqPath === '/health' || reqPath === '/healthz' || reqPath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      game: 'CarTuneRacing 2D',
      uptime: Math.floor(process.uptime()),
      playersOnline: clients.size,
      activeRooms: rooms.size
    }));
    return;
  }

  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safeRelPath = reqPath.replace(/^\/+/, '');
  const filePath = path.resolve(PUBLIC_DIR, safeRelPath);

  // Prevent directory traversal outside PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback to index.html for unknown non-asset routes
      const extReq = path.extname(filePath).toLowerCase();
      if (!extReq) {
        const indexFile = path.join(PUBLIC_DIR, 'index.html');
        fs.stat(indexFile, (idxErr, idxStats) => {
          if (!idxErr && idxStats.isFile()) {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache'
            });
            fs.createReadStream(indexFile).pipe(res);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found - CarTuneRacing');
          }
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - CarTuneRacing');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(ext);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isImage ? 'public, max-age=3600' : 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// --- WEBSOCKET RFC 6455 IMPLEMENTATION ---
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Connected clients and multiplayer rooms
const clients = new Map(); // socket -> clientData
const rooms = new Map();   // roomId -> roomData
let nextClientId = 1;
let nextRoomId = 100;

function sendWSFrame(socket, data) {
  if (socket.destroyed || !socket.writable) return;
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const payload = Buffer.from(jsonStr, 'utf8');
  const length = payload.length;

  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode (1)
    header[1] = length;
  } else if (length <= 0xFFFF) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function broadcastLobbyState() {
  const playerList = [];
  for (const [s, c] of clients.entries()) {
    playerList.push({
      id: c.id,
      name: c.name,
      carName: c.carName,
      hp: c.hp,
      inRoom: !!c.roomId
    });
  }

  const roomList = [];
  for (const [rId, room] of rooms.entries()) {
    roomList.push({
      id: rId,
      name: room.name,
      hostName: room.hostName,
      wager: room.wager,
      status: room.status,
      playerCount: room.players.length
    });
  }

  const msg = { type: 'LOBBY_UPDATE', players: playerList, rooms: roomList };
  for (const [s, c] of clients.entries()) {
    if (!c.roomId) {
      sendWSFrame(s, msg);
    }
  }
}

// WebSocket Frame Parser
function handleWebSocketConnection(socket) {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const isFin = (firstByte & 0x80) !== 0;
      const opcode = firstByte & 0x0F;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7F;

      let offset = 2;
      if (payloadLength === 126) {
        if (buffer.length < 4) return;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) return;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) return;
        maskKey = buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLength) return; // Wait for full frame

      const payload = buffer.slice(offset, offset + payloadLength);
      buffer = buffer.slice(offset + payloadLength);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      if (opcode === 0x08) {
        // Close frame
        socket.end();
        return;
      } else if (opcode === 0x09) {
        // Ping -> Pong
        const pongHeader = Buffer.from([0x8A, 0x00]);
        socket.write(pongHeader);
      } else if (opcode === 0x01) {
        // Text message
        try {
          const text = payload.toString('utf8');
          const data = JSON.parse(text);
          handleClientMessage(socket, data);
        } catch (e) {
          console.error('Failed to parse WS JSON:', e);
        }
      }
    }
  });

  socket.on('close', () => {
    handleClientDisconnect(socket);
  });

  socket.on('error', (err) => {
    console.log('Socket error:', err.message);
    handleClientDisconnect(socket);
  });
}

function handleClientMessage(socket, data) {
  const client = clients.get(socket);
  if (!client) return;

  switch (data.type) {
    case 'LOGIN': {
      client.name = (data.name || 'Racer #' + client.id).substring(0, 16);
      client.carName = data.carName || 'Porsche 911 Turbo S (992)';
      client.carModel = data.carModel || 'car_porsche_911_turbo_s';
      client.carData = data.carData || null;
      client.hp = data.hp || 650;
      client.money = data.money || 3500;
      sendWSFrame(socket, {
        type: 'LOGIN_OK',
        clientId: client.id,
        name: client.name
      });
      broadcastLobbyState();
      break;
    }

    case 'UPDATE_CAR': {
      client.carName = data.carName || client.carName;
      client.carModel = data.carModel || client.carModel;
      if (data.carData) client.carData = data.carData;
      client.hp = data.hp || client.hp;
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          for (const p of room.players) {
            sendWSFrame(p.socket, {
              type: 'ROOM_UPDATE',
              room: serializeRoom(room)
            });
          }
        }
      }
      broadcastLobbyState();
      break;
    }

    case 'CREATE_ROOM': {
      if (client.roomId) leaveCurrentRoom(socket);
      if (data.carName) client.carName = data.carName;
      if (data.carModel) client.carModel = data.carModel;
      if (data.carData) client.carData = data.carData;
      if (data.hp) client.hp = data.hp;
      client.ready = false;

      const roomId = 'room_' + (++nextRoomId);
      const wager = Math.max(0, parseInt(data.wager, 10) || 100);
      const room = {
        id: roomId,
        name: data.roomName || `${client.name}'s Drag Battle`,
        wager: wager,
        hostId: client.id,
        hostName: client.name,
        players: [client],
        status: 'waiting',
        readyCount: 0,
        raceStartTime: 0,
        results: []
      };

      rooms.set(roomId, room);
      client.roomId = roomId;

      sendWSFrame(socket, {
        type: 'ROOM_JOINED',
        room: serializeRoom(room),
        isHost: true,
        slot: 0 // Lane 1
      });
      broadcastLobbyState();
      break;
    }

    case 'JOIN_ROOM': {
      const room = rooms.get(data.roomId);
      if (!room) {
        sendWSFrame(socket, { type: 'ERROR', message: 'ห้องนี้ไม่มีอยู่หรือปิดไปแล้ว' });
        return;
      }
      if (room.players.length >= 2) {
        sendWSFrame(socket, { type: 'ERROR', message: 'ห้องเต็มแล้ว (แข่ง 1v1)' });
        return;
      }
      if (room.status !== 'waiting') {
        sendWSFrame(socket, { type: 'ERROR', message: 'การแข่งขันกำลังดำเนินอยู่' });
        return;
      }

      if (client.roomId) leaveCurrentRoom(socket);
      if (data.carName) client.carName = data.carName;
      if (data.carModel) client.carModel = data.carModel;
      if (data.carData) client.carData = data.carData;
      if (data.hp) client.hp = data.hp;
      client.ready = false;

      room.players.push(client);
      client.roomId = room.id;

      sendWSFrame(socket, {
        type: 'ROOM_JOINED',
        room: serializeRoom(room),
        isHost: false,
        slot: 1 // Lane 2
      });

      // Notify both players that opponent joined
      for (const p of room.players) {
        sendWSFrame(p.socket, {
          type: 'ROOM_UPDATE',
          room: serializeRoom(room)
        });
      }
      broadcastLobbyState();
      break;
    }

    case 'LEAVE_ROOM': {
      leaveCurrentRoom(socket);
      break;
    }

    case 'PLAYER_READY': {
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room || room.players.length < 2) return;

      if (data.carName) client.carName = data.carName;
      if (data.carModel) client.carModel = data.carModel;
      if (data.carData) client.carData = data.carData;
      if (data.hp) client.hp = data.hp;

      client.ready = true;
      const allReady = room.players.length === 2 && room.players.every(p => p.ready);
      const serialized = serializeRoom(room);

      for (const p of room.players) {
        sendWSFrame(p.socket, {
          type: 'ROOM_UPDATE',
          room: serialized
        });
        sendWSFrame(p.socket, {
          type: 'PLAYER_READY_STATUS',
          playerId: client.id,
          ready: true,
          allReady: allReady,
          room: serialized
        });
      }

      if (allReady && room.status === 'waiting') {
        for (const p of room.players) {
          sendWSFrame(p.socket, {
            type: 'RACE_START',
            room: serialized
          });
        }
        startRaceSequence(room);
      }
      break;
    }

    case 'RACE_SYNC': {
      // Telemetry relay between racers
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room) return;

      // Broadcast telemetry to opponent
      for (const p of room.players) {
        if (p.id !== client.id) {
          sendWSFrame(p.socket, {
            type: 'OPPONENT_SYNC',
            distance: data.distance,
            speed: data.speed,
            rpm: data.rpm,
            gear: data.gear,
            nos: data.nos,
            wheelie: data.wheelie,
            blown: data.blown,
            isFinished: data.isFinished,
            timeQuarterMile: data.timeQuarterMile,
            time60ft: data.time60ft,
            time330ft: data.time330ft,
            time660ft: data.time660ft,
            finishTrapSpeed: data.finishTrapSpeed,
            falseStart: data.falseStart
          });
        }
      }
      break;
    }

    case 'RACE_FINISH': {
      if (!client.roomId) return;
      const room = rooms.get(client.roomId);
      if (!room || room.status !== 'racing') return;

      // Register finish time
      room.results.push({
        id: client.id,
        name: client.name,
        time: parseFloat(data.time) || 99.99,
        trapSpeed: parseFloat(data.trapSpeed) || 0,
        falseStart: !!data.falseStart,
        blown: !!data.blown
      });

      if (room.results.length >= room.players.length) {
        finalizeRace(room);
      }
      break;
    }

    case 'CHAT': {
      const chatMsg = {
        type: 'CHAT_BROADCAST',
        sender: client.name,
        text: (data.text || '').substring(0, 100),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
      for (const [s] of clients.entries()) {
        sendWSFrame(s, chatMsg);
      }
      break;
    }
  }
}

function startRaceSequence(room) {
  room.status = 'countdown';
  room.results = [];

  // 1. Stage lights on
  for (const p of room.players) {
    sendWSFrame(p.socket, { type: 'COUNTDOWN_STAGE', stage: 'STAGE' });
  }

  // 2. Yellow 1 (after 1s)
  setTimeout(() => {
    if (room.status !== 'countdown') return;
    for (const p of room.players) {
      sendWSFrame(p.socket, { type: 'COUNTDOWN_STAGE', stage: 'YELLOW_1' });
    }
  }, 1000);

  // 3. Yellow 2 (after 1.5s)
  setTimeout(() => {
    if (room.status !== 'countdown') return;
    for (const p of room.players) {
      sendWSFrame(p.socket, { type: 'COUNTDOWN_STAGE', stage: 'YELLOW_2' });
    }
  }, 1500);

  // 4. Yellow 3 (after 2s)
  setTimeout(() => {
    if (room.status !== 'countdown') return;
    for (const p of room.players) {
      sendWSFrame(p.socket, { type: 'COUNTDOWN_STAGE', stage: 'YELLOW_3' });
    }
  }, 2000);

  // 5. GREEN! (after 2.5s)
  setTimeout(() => {
    if (room.status !== 'countdown') return;
    room.status = 'racing';
    room.raceStartTime = Date.now();
    for (const p of room.players) {
      sendWSFrame(p.socket, { type: 'COUNTDOWN_STAGE', stage: 'GREEN', startTime: room.raceStartTime });
    }
  }, 2500);
}

function finalizeRace(room) {
  room.status = 'finished';

  // Determine winner
  const validRacers = room.results.filter(r => !r.falseStart);
  validRacers.sort((a, b) => a.time - b.time);

  let winnerId = null;
  if (validRacers.length > 0) {
    winnerId = validRacers[0].id;
  } else if (room.results.length > 0) {
    winnerId = room.results[0].id; // Fallback if both false started
  }

  const pot = room.wager * 2;

  for (const p of room.players) {
    sendWSFrame(p.socket, {
      type: 'RACE_OVER',
      results: room.results,
      winnerId: winnerId,
      pot: pot
    });
    p.ready = false;
  }

  // Reset room back to waiting
  setTimeout(() => {
    room.status = 'waiting';
    room.results = [];
    for (const p of room.players) {
      sendWSFrame(p.socket, { type: 'ROOM_UPDATE', room: serializeRoom(room) });
    }
    broadcastLobbyState();
  }, 4000);
}

function leaveCurrentRoom(socket) {
  const client = clients.get(socket);
  if (!client || !client.roomId) return;

  const room = rooms.get(client.roomId);
  if (room) {
    room.players = room.players.filter(p => p.id !== client.id);
    if (room.players.length === 0) {
      rooms.delete(room.id);
    } else {
      // Transfer host if host left
      if (room.hostId === client.id && room.players[0]) {
        room.hostId = room.players[0].id;
        room.hostName = room.players[0].name;
      }
      for (const p of room.players) {
        p.ready = false;
        sendWSFrame(p.socket, {
          type: 'ROOM_UPDATE',
          room: serializeRoom(room),
          message: `${client.name} ออกจากห้องแล้ว`
        });
      }
    }
  }

  client.roomId = null;
  client.ready = false;
  sendWSFrame(socket, { type: 'LEFT_ROOM' });
  broadcastLobbyState();
}

function handleClientDisconnect(socket) {
  const client = clients.get(socket);
  if (!client) return;

  leaveCurrentRoom(socket);
  clients.delete(socket);
  broadcastLobbyState();
}

function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    wager: room.wager,
    hostId: room.hostId,
    hostName: room.hostName,
    status: room.status,
    players: room.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      carName: p.carName,
      carModel: p.carModel || 'car_porsche_911_turbo_s',
      carData: p.carData || null,
      hp: p.hp,
      ready: !!p.ready,
      slot: idx
    }))
  };
}

// Upgrade HTTP to RFC-6455 WebSocket
server.on('upgrade', (req, socket, head) => {
  const wsKey = req.headers['sec-websocket-key'];
  if (!wsKey) {
    socket.destroy();
    return;
  }

  const hash = crypto.createHash('sha1').update(wsKey + WS_GUID).digest('base64');
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${hash}`,
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));

  const clientId = nextClientId++;
  const clientData = {
    id: clientId,
    socket: socket,
    name: 'Racer #' + clientId,
    carName: 'Porsche 911 Turbo S (992)',
    carModel: 'car_porsche_911_turbo_s',
    carData: null,
    hp: 650,
    money: 3500,
    roomId: null,
    ready: false
  };

  clients.set(socket, clientData);
  handleWebSocketConnection(socket);
});

// Keepalive Ping every 25s so cloud load balancers (Render/Railway/Cloudflare) keep WS alive
setInterval(() => {
  const pingFrame = Buffer.from([0x89, 0x00]);
  for (const [socket] of clients.entries()) {
    if (!socket.destroyed && socket.writable) {
      try {
        socket.write(pingFrame);
      } catch (e) {}
    }
  }
}, 25000);

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚗💨 CarTuneRacing 2D Server Started!`);
  console.log(`🌐 Web Game URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`⚡ WebSocket Multiplayer ready on same port!`);
  console.log(`=======================================================`);
});
