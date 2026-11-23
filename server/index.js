'use strict';
// Servidor: sirve la web, gestiona salas y partidas por WebSocket y expone la API REST.

const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const CONFIG = require('./config');
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

// Lo que ven los clientes de una sala.
function publicRoom(room) {
  return {
    code: room.code,
    theme: room.theme,
    hostId: room.hostId,
    status: room.status,
    players: [...room.players.values()],
  };
}

// Lo que devuelve la API REST. Los jugadores van ordenados por puesto: primero los vivos,
// después los eliminados empezando por el que más aguantó.
function summary(room) {
  const list = [...room.players.values()].map((p) => {
    const inGame = room.game && room.game.players.get(p.id);
    return { name: p.name, alive: inGame ? inGame.alive : true, out: inGame ? inGame.outOrder : 0 };
  });
  list.sort((a, b) => (b.alive - a.alive) || (b.out - a.out));
  return {
    id: room.code,
    status: room.status,  // lobby | playing | finished
    bombSeconds: CONFIG.BOMB_SECONDS,
    players: list.map((p, i) => ({ name: p.name, place: room.game ? i + 1 : null, eliminated: !p.alive })),
    eliminationOrder: list.filter((p) => !p.alive).sort((a, b) => a.out - b.out).map((p) => p.name),
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
  room.game = game.createGame([...room.players.values()], room.theme);
  room.status = 'playing';
  room.winner = null;

  io.to(room.code).emit('game_start', {
    tile: game.TILE,
    cols: game.COLS,
    rows: game.ROWS,
    radius: game.RADIUS,
    gadgetRadius: game.GADGET_RADIUS,
    theme: room.theme,
    landmark: room.game.landmark,
    bombSeconds: CONFIG.BOMB_SECONDS,
    sprintCooldown: CONFIG.SPRINT_SECONDS + CONFIG.SPRINT_COOLDOWN,
    walls: room.game.walls.map((row) => row.map((w) => (w ? '1' : '0')).join('')),
    gadgets: [...room.game.gadgets.values()],
    players: [...room.game.players.values()].map((p) => ({
      id: p.id, name: p.name, index: p.index, x: p.x, y: p.y, alive: true, fx: '',
    })),
  });

  room.timer = setInterval(() => tick(room), game.TICK_MS);
}

function tick(room) {
  const g = room.game;
  const { events, winnerId } = game.step(g, game.TICK_MS / 1000);
  for (const event of events) io.to(room.code).emit('game_event', event);

  io.to(room.code).emit('state', {
    players: [...g.players.values()].map((p) => ({
      id: p.id, x: Math.round(p.x), y: Math.round(p.y), alive: p.alive, fx: game.effectsOf(g, p),
      sw: game.sprintWait(g, p),   // segundos para poder esprintar otra vez
    })),
    bomb: {
      holder: g.bomb.holderId,
      left: Math.max(0, Math.round(g.bomb.left * 10) / 10),
      pause: Math.max(0, Math.round(g.bomb.pause * 10) / 10),
    },
  });

  if (winnerId !== null) {
    clearInterval(room.timer);
    room.status = 'finished';
    room.winner = g.players.get(winnerId).name;
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
    const theme = game.MAP_THEMES.includes(data && data.theme) ? data.theme : 'forest';
    const room = {
      code: newCode(), theme, hostId: socket.id, status: 'lobby',
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
    // El esprint es una petición: se guarda hasta que el bucle la atiende, aunque llegue otro mensaje antes.
    const sprint = !!data.sprint || player.input.sprint;
    player.input = { up: !!data.up, down: !!data.down, left: !!data.left, right: !!data.right, sprint };
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
    console.log(`\nPasa la bomba en marcha:`);
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
