'use strict';
// Servidor: sirve la web, gestiona salas y partidas por WebSocket y expone la API REST.

const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const game = require('./game');

const PORT = process.env.PORT || 3000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const rooms = new Map();    // código -> sala activa
const results = new Map();  // código -> resultado de la última partida terminada

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

// Endpoint que devuelve el estado de una partida y quién ha ganado.
app.get('/api/games/:id', (req, res) => {
  const id = String(req.params.id).toUpperCase();
  const room = rooms.get(id);
  const data = room ? summary(room) : results.get(id);
  if (!data) return res.status(404).json({ error: 'game_not_found' });
  res.json(data);
});

// ---------- Utilidades de sala ----------

function newCode() {
  let code;
  do {
    code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12);
  return name || null;
}

function scoreOf(room, id) {
  const p = room.game && room.game.players.get(id);
  return p ? p.score : 0;
}

// Lo que ven los clientes de una sala.
function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    players: [...room.players.values()].map((p) => ({ ...p, score: scoreOf(room, p.id) })),
  };
}

// Lo que devuelve la API REST.
function summary(room) {
  return {
    id: room.code,
    status: room.status,  // lobby | playing | finished
    goal: game.GOAL,
    totalCoins: game.COIN_COUNT,
    coinsLeft: room.game ? room.game.coins.size : game.COIN_COUNT,
    players: [...room.players.values()]
      .map((p) => ({ name: p.name, score: scoreOf(room, p.id) }))
      .sort((a, b) => b.score - a.score),
    winner: room.winner,
  };
}

function addPlayer(room, socket, name) {
  const used = new Set([...room.players.values()].map((p) => p.index));
  let index = 0;
  while (used.has(index)) index++;
  room.players.set(socket.id, { id: socket.id, name, index });
  socket.join(room.code);
  socket.data.code = room.code;
  io.to(room.code).emit('room_update', publicRoom(room));
}

function removePlayer(socket) {
  const room = rooms.get(socket.data.code);
  if (!room) return;
  socket.leave(room.code);
  socket.data.code = null;
  room.players.delete(socket.id);
  if (room.game) room.game.players.delete(socket.id);

  if (room.players.size === 0) {
    clearInterval(room.timer);
    rooms.delete(room.code);
    return;
  }
  // Si se va el máster, lo es el siguiente jugador.
  if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
  io.to(room.code).emit('room_update', publicRoom(room));
}

// ---------- Partida ----------

function startGame(room) {
  room.game = game.createGame([...room.players.values()]);
  room.status = 'playing';
  room.winner = null;

  io.to(room.code).emit('game_start', {
    tile: game.TILE,
    cols: game.COLS,
    rows: game.ROWS,
    goal: game.GOAL,
    radius: game.RADIUS,
    coinRadius: game.COIN_RADIUS,
    walls: room.game.walls.map((row) => row.map((w) => (w ? '1' : '0')).join('')),
    coins: [...room.game.coins.values()],
    players: playerStates(room),
  });

  room.timer = setInterval(() => tick(room), game.TICK_MS);
}

function playerStates(room) {
  return [...room.game.players.values()].map((p) => ({
    id: p.id, name: p.name, index: p.index,
    x: Math.round(p.x), y: Math.round(p.y), score: p.score,
  }));
}

function tick(room) {
  const { collected, winnerId } = game.step(room.game, game.TICK_MS / 1000);
  for (const coin of collected) io.to(room.code).emit('coin_collected', coin);
  io.to(room.code).emit('state', playerStates(room));

  if (winnerId !== null) {
    clearInterval(room.timer);
    room.status = 'finished';
    room.winner = room.game.players.get(winnerId).name;
    results.set(room.code, summary(room));
    if (results.size > 100) results.delete(results.keys().next().value);
    io.to(room.code).emit('game_over', { ...summary(room), winnerId });
    io.to(room.code).emit('room_update', publicRoom(room));
  }
}

// ---------- Eventos de los clientes ----------

io.on('connection', (socket) => {
  const reply = (ack, data) => typeof ack === 'function' && ack(data);
  const myRoom = () => rooms.get(socket.data.code);

  socket.on('create_room', (data, ack) => {
    const name = cleanName(data && data.name);
    if (!name) return reply(ack, { ok: false, error: 'invalid_name' });
    removePlayer(socket);
    const room = {
      code: newCode(), hostId: socket.id, status: 'lobby',
      players: new Map(), game: null, timer: null, winner: null,
    };
    rooms.set(room.code, room);
    addPlayer(room, socket, name);
    reply(ack, { ok: true, code: room.code });
  });

  socket.on('join_room', (data, ack) => {
    const name = cleanName(data && data.name);
    if (!name) return reply(ack, { ok: false, error: 'invalid_name' });
    const code = typeof (data && data.code) === 'string' ? data.code.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room) return reply(ack, { ok: false, error: 'room_not_found' });
    if (room.players.has(socket.id)) return reply(ack, { ok: true, code });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'game_in_progress' });
    if (room.players.size >= MAX_PLAYERS) return reply(ack, { ok: false, error: 'room_full' });
    const taken = [...room.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (taken) return reply(ack, { ok: false, error: 'name_taken' });
    removePlayer(socket);
    addPlayer(room, socket, name);
    reply(ack, { ok: true, code });
  });

  socket.on('start_game', (ack) => {
    const room = myRoom();
    if (!room) return reply(ack, { ok: false, error: 'room_not_found' });
    if (room.hostId !== socket.id) return reply(ack, { ok: false, error: 'not_host' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'game_in_progress' });
    if (room.players.size < MIN_PLAYERS) return reply(ack, { ok: false, error: 'need_players' });
    startGame(room);
    reply(ack, { ok: true });
  });

  socket.on('back_to_lobby', () => {
    const room = myRoom();
    if (!room || room.hostId !== socket.id || room.status !== 'finished') return;
    room.status = 'lobby';
    room.game = null;
    io.to(room.code).emit('room_update', publicRoom(room));
  });

  socket.on('input', (data) => {
    const room = myRoom();
    const player = room && room.status === 'playing' && room.game.players.get(socket.id);
    if (!player || !data || typeof data !== 'object') return;
    player.input = { up: !!data.up, down: !!data.down, left: !!data.left, right: !!data.right };
  });

  socket.on('leave_room', () => removePlayer(socket));
  socket.on('disconnect', () => removePlayer(socket));
});

// ---------- Arranque ----------

function start(port = PORT) {
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  start().then(() => {
    console.log(`\nCoin Rush en marcha:`);
    console.log(`  En este portátil:  http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list) {
        if (net.family === 'IPv4' && !net.internal) console.log(`  En la red local:   http://${net.address}:${PORT}`);
      }
    }
    console.log('\nPulsa Ctrl+C para parar el servidor.\n');
  });
}

module.exports = { start, io };
