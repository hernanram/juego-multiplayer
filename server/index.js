// ============================================================
// SERVER — Arena of Heroes
// Express + Socket.io, gestión de salas y eventos del juego
// ============================================================

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameRoom = require('./GameRoom');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

// Servir archivos estáticos del cliente
app.use(express.static(path.join(__dirname, '../client')));

// Ruta de salud para AWS health checks
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: Object.keys(rooms).length }));

const rooms = {}; // roomId -> GameRoom

function genRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ─── Socket.io ─────────────────────────────────────────────

io.on('connection', (socket) => {
  log(`Conectado: ${socket.id}`);

  // ── Crear sala ──────────────────────────────────────────
  socket.on('create_room', ({ playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      return socket.emit('error', { message: 'Nombre requerido' });
    }
    const roomId = genRoomId();
    rooms[roomId] = new GameRoom(roomId, io);
    const player = rooms[roomId].addPlayer(socket.id, playerName.trim());
    socket.join(roomId);
    socket.roomId = roomId;
    socket.emit('room_created', { roomId, player, room: rooms[roomId].getRoomInfo() });
    log(`Sala creada: ${roomId} por ${playerName}`);
  });

  // ── Unirse a sala ───────────────────────────────────────
  socket.on('join_room', ({ playerName, roomId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Sala no encontrada' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'La partida ya comenzó' });
    if (room.getPlayerCount() >= 4) return socket.emit('error', { message: 'Sala llena (máx 4)' });

    const player = room.addPlayer(socket.id, playerName.trim());
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('room_joined', { roomId, player, room: room.getRoomInfo() });
    socket.to(roomId).emit('player_joined', { room: room.getRoomInfo() });
    log(`${playerName} se unió a sala ${roomId}`);
  });

  // ── Selección de héroe ──────────────────────────────────
  socket.on('select_hero', ({ heroType }) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    const ok = room.selectHero(socket.id, heroType);
    if (ok) io.to(socket.roomId).emit('hero_selected', { room: room.getRoomInfo() });
  });

  // ── Iniciar partida (solo el host) ──────────────────────
  socket.on('start_game', () => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.hostId) return;

    const players = Object.values(room.players);
    if (players.length < 1) {
      return socket.emit('error', { message: 'Necesitas al menos 1 jugador' });
    }
    if (players.some(p => !p.heroType)) {
      return socket.emit('error', { message: 'Todos deben seleccionar héroe' });
    }

    room.startGame();
    io.to(socket.roomId).emit('game_started', { room: room.getRoomInfo() });
    log(`Juego iniciado en sala ${socket.roomId} con ${players.length} jugadores`);
  });

  // ── Comandos de juego ───────────────────────────────────
  socket.on('move_cmd', ({ tx, ty }) => {
    const room = rooms[socket.roomId];
    if (room) room.handleMove(socket.id, tx, ty);
  });

  socket.on('attack_cmd', ({ targetId }) => {
    const room = rooms[socket.roomId];
    if (room) room.handleAttack(socket.id, targetId);
  });

  socket.on('ability_cmd', ({ tx, ty }) => {
    const room = rooms[socket.roomId];
    if (room) room.handleAbility(socket.id, tx, ty);
  });

  socket.on('ultimate_cmd', ({ tx, ty }) => {
    const room = rooms[socket.roomId];
    if (room) room.handleUltimate(socket.id, tx, ty);
  });

  socket.on('add_bots', () => {
    const room = rooms[socket.roomId];
    if (room && socket.id === room.hostId && room.phase === 'lobby') {
      room.fillWithBots();
      io.to(socket.roomId).emit('hero_selected', { room: room.getRoomInfo() });
    }
  });

  // ── Chat ────────────────────────────────────────────────
  socket.on('chat_msg', ({ message }) => {
    const room = rooms[socket.roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    const text = message.trim().substring(0, 150);
    if (!text) return;
    io.to(socket.roomId).emit('chat_msg', {
      name: player.name,
      team: player.team,
      message: text,
      ts: Date.now()
    });
  });

  // ── Desconexión ─────────────────────────────────────────
  socket.on('disconnect', () => {
    log(`Desconectado: ${socket.id}`);
    const room = rooms[socket.roomId];
    if (!room) return;
    room.removePlayer(socket.id);
    io.to(socket.roomId).emit('player_left', {
      playerId: socket.id,
      room: room.getRoomInfo()
    });
    // Limpiar sala vacía
    if (room.getPlayerCount() === 0) {
      room.stopGame();
      delete rooms[socket.roomId];
      log(`Sala ${socket.roomId} eliminada (vacía)`);
    }
  });
});

// ─── Iniciar servidor ───────────────────────────────────────

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  log(`🎮 Arena of Heroes corriendo en http://localhost:${PORT}`);
  log(`Salas activas: ${Object.keys(rooms).length}`);
});
