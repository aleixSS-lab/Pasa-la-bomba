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
    mode: room.mode || 'bomb',
    hostId: room.hostId,
    status: room.status,
    players: [...room.players.values()],
  };
}

// Lo que devuelve la API REST. Los jugadores van ordenados por puesto: primero los vivos,
// después los eliminados empezando por el que más aguantó.
function summary(room) {
  const mode = room.mode || 'bomb';
  const list = [...room.players.values()].map((p) => {
    const inGame = room.game && room.game.players.get(p.id);
    const raw = inGame ? inGame.stats : {};
    return {
      id: p.id,
      name: p.name,
      alive: inGame ? inGame.alive : true,
      out: inGame ? inGame.outOrder : 0,
      coins: inGame ? inGame.coins : 0,
      stats: {
        survivalTime: Math.round((raw.survivalTime || 0) * 10) / 10,
        boosts: raw.boosts || 0,
        teleports: raw.teleports || 0,
        traps: raw.traps || 0,
        bombsPassed: raw.bombsPassed || 0,
        bombsReceived: raw.bombsReceived || 0,
        eliminations: raw.eliminations || 0,
        distance: Math.round((raw.distance || 0) / game.TILE),
        coins: inGame ? inGame.coins : 0,
        wins: p.wins || 0,
      },
    };
  });
  list.sort((a, b) => mode === 'coinRush'
    ? (b.coins - a.coins) || (b.stats.distance - a.stats.distance)
    : (Number(b.alive) - Number(a.alive)) || (b.out - a.out));
  let previousScore = null;
  let place = 0;
  const ranked = list.map((p, index) => {
    const score = mode === 'coinRush' ? p.coins : (p.alive ? Infinity : p.out);
    if (index === 0 || score !== previousScore) place = index + 1;
    previousScore = score;
    return { name: p.name, place, eliminated: !p.alive, coins: p.coins, stats: p.stats };
  });
  const awards = [];
  const awardMost = (key, getter) => {
    const eligible = list.filter((p) => getter(p) > 0);
    if (!eligible.length) return;
    const max = Math.max(...eligible.map(getter));
    eligible.filter((p) => getter(p) === max).forEach((p) => awards.push({ key, player: p.name }));
  };
  awardMost('fastest', (p) => p.stats.survivalTime > 0 ? p.stats.distance / p.stats.survivalTime : 0);
  awardMost('boostCollector', (p) => p.stats.boosts);
  awardMost('longestSurvival', (p) => p.stats.survivalTime);
  awardMost('teleporter', (p) => p.stats.teleports);
  awardMost('trapper', (p) => p.stats.traps);
  if (mode === 'bomb') {
    awardMost('bombMagnet', (p) => p.stats.bombsReceived);
    const unlucky = list.filter((p) => !p.alive && p.out > 0).sort((a, b) => a.out - b.out)[0];
    if (unlucky) awards.push({ key: 'unlucky', player: unlucky.name });
  }
  return {
    id: room.code,
    status: room.status,  // lobby | playing | finished
    mode,
    theme: room.theme,
    bombSeconds: CONFIG.BOMB_SECONDS,
    modeSeconds: CONFIG.COIN_RUSH_SECONDS,
    players: room.game ? ranked.map((p) => ({ name: p.name, place: p.place, eliminated: p.eliminated }))
      : list.map((p) => ({ name: p.name, place: null, eliminated: false })),
    statistics: room.game ? list.map((p) => ({ name: p.name, coins: p.coins, eliminated: !p.alive, place: ranked.find((r) => r.name === p.name).place, ...p.stats })) : [],
    eliminationOrder: list.filter((p) => !p.alive).sort((a, b) => a.out - b.out).map((p) => p.name),
    winner: room.winner,
    winners: room.winners || [],
    awards,
  };
}

function addPlayer(room, socket, name) {
  const used = new Set([...room.players.values()].map((p) => p.index));
  let index = 0;
  while (used.has(index)) index++;
  room.players.set(socket.id, {
    id: socket.id,
    name,
    index,
    wins: 0,
    shape: game.SHAPES[index % game.SHAPES.length],
    color: game.SKIN_COLORS[index % game.SKIN_COLORS.length],
  });
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
  room.game = game.createGame([...room.players.values()], room.theme, room.mode);
  room.status = 'playing';
  room.winner = null;
  room.winners = [];

  io.to(room.code).emit('game_start', {
    tile: game.TILE,
    cols: game.COLS,
    rows: game.ROWS,
    radius: game.RADIUS,
    gadgetRadius: game.GADGET_RADIUS,
    theme: room.theme,
    mode: room.mode,
    modeSeconds: CONFIG.COIN_RUSH_SECONDS,
    coins: [...room.game.coins.values()],
    landmark: room.game.landmark,
    ponds: room.game.ponds,
    bombSeconds: CONFIG.BOMB_SECONDS,
    sprintCooldown: CONFIG.SPRINT_SECONDS + CONFIG.SPRINT_COOLDOWN,
    walls: room.game.walls.map((row) => row.map((w) => (w ? '1' : '0')).join('')),
    gadgets: [...room.game.gadgets.values()],
    players: [...room.game.players.values()].map((p) => ({
      id: p.id, name: p.name, index: p.index, shape: p.shape, color: p.color,
      x: p.x, y: p.y, alive: true, fx: '',
    })),
  });

  room.timer = setInterval(() => tick(room), game.TICK_MS);
}

function tick(room) {
  const g = room.game;
  const { events, winnerId, winnerIds } = game.step(g, game.TICK_MS / 1000);
  for (const event of events) io.to(room.code).emit('game_event', event);

  io.to(room.code).emit('state', {
    mode: g.mode,
    timeLeft: g.mode === 'coinRush' ? Math.max(0, Math.ceil(CONFIG.COIN_RUSH_SECONDS - g.time)) : null,
    players: [...g.players.values()].map((p) => ({
      id: p.id, x: Math.round(p.x), y: Math.round(p.y), alive: p.alive, fx: game.effectsOf(g, p),
      sw: game.sprintWait(g, p),   // segundos para poder esprintar otra vez
      coins: p.coins,
    })),
    bomb: {
      holder: g.bomb.holderId,
      type: g.bomb.type,
      left: Math.max(0, Math.round(g.bomb.left * 10) / 10),
      pause: Math.max(0, Math.round(g.bomb.pause * 10) / 10),
    },
  });

  if (winnerId !== null) {
    clearInterval(room.timer);
    room.status = 'finished';
    room.winners = (winnerIds || [winnerId]).map((id) => g.players.get(id)).filter(Boolean).map((p) => p.name);
    room.winners.forEach((name) => {
      const player = [...room.players.values()].find((p) => p.name === name);
      if (player) player.wins++;
    });
    room.winner = room.winners.length > 1 ? room.winners.join(', ') : (room.winners[0] || '');
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
    const mode = game.GAME_MODES.includes(data && data.mode) ? data.mode : 'bomb';
    const room = {
      code: newCode(), theme, mode, hostId: socket.id, status: 'lobby',
      players: new Map(), game: null, timer: null, winner: null, winners: [],
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

  socket.on('set_theme', (data, ack) => {
    const room = myRoom();
    if (!room) return reply(ack, { ok: false, error: 'room_not_found' });
    if (room.hostId !== socket.id) return reply(ack, { ok: false, error: 'not_host' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'game_in_progress' });
    if (!game.MAP_THEMES.includes(data && data.theme)) return reply(ack, { ok: false, error: 'invalid_theme' });
    room.theme = data.theme;
    io.to(room.code).emit('room_update', publicRoom(room));
    reply(ack, { ok: true });
  });

  socket.on('set_game_mode', (data, ack) => {
    const room = myRoom();
    if (!room) return reply(ack, { ok: false, error: 'room_not_found' });
    if (room.hostId !== socket.id) return reply(ack, { ok: false, error: 'not_host' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'game_in_progress' });
    if (!game.GAME_MODES.includes(data && data.mode)) return reply(ack, { ok: false, error: 'invalid_mode' });
    room.mode = data.mode;
    io.to(room.code).emit('room_update', publicRoom(room));
    reply(ack, { ok: true });
  });

  socket.on('customize_player', (data, ack) => {
    const room = myRoom();
    if (!room) return reply(ack, { ok: false, error: 'room_not_found' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'game_in_progress' });
    const player = room.players.get(socket.id);
    const shape = data && data.shape;
    const color = typeof (data && data.color) === 'string' ? data.color.toLowerCase() : '';
    if (!player || !game.SHAPES.includes(shape) || !/^#[0-9a-f]{6}$/.test(color)) {
      return reply(ack, { ok: false, error: 'invalid_skin' });
    }
    player.shape = shape;
    player.color = color;
    io.to(room.code).emit('room_update', publicRoom(room));
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
