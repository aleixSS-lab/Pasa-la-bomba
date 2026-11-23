'use strict';
// Lógica del juego, sin nada de red: mapa aleatorio, movimiento, bomba, gadgets y victoria.

const CONFIG = require('./config');

const TILE = 40;          // tamaño de una casilla en píxeles
const COLS = 40;          // casillas de ancho
const ROWS = 30;          // casillas de alto
const RADIUS = 12;        // radio del jugador
const GADGET_RADIUS = 13;
const SPEED = 220;        // píxeles por segundo
const TICK_MS = 50;       // el servidor avanza 20 veces por segundo
const GADGET_TYPES = ['trap', 'gum', 'boost'];

const rand = (n) => Math.floor(Math.random() * n);

// Genera muros aleatorios y devuelve también las casillas libres alcanzables.
// Si el mapa queda demasiado partido, se descarta y se genera otro.
function generateMap() {
  for (;;) {
    const walls = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1));

    for (let i = 0; i < 45; i++) {
      const w = 1 + rand(3);
      const h = 1 + rand(3);
      const x0 = 1 + rand(COLS - 1 - w);
      const y0 = 1 + rand(ROWS - 1 - h);
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) walls[y][x] = true;
    }

    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!walls[y][x]) free.push([x, y]);

    // Relleno por inundación desde una casilla libre cualquiera.
    const start = free[rand(free.length)];
    const seen = new Set([start[1] * COLS + start[0]]);
    const reachable = [start];
    for (let i = 0; i < reachable.length; i++) {
      const [x, y] = reachable[i];
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const key = ny * COLS + nx;
        if (!walls[ny][nx] && !seen.has(key)) {
          seen.add(key);
          reachable.push([nx, ny]);
        }
      }
    }

    if (reachable.length >= free.length * 0.9) return { walls, reachable };
  }
}

const center = ([x, y]) => ({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
const alivePlayers = (game) => [...game.players.values()].filter((p) => p.alive);

function addGadget(game, type, pos) {
  const gadget = { id: game.nextGadgetId++, type, x: pos.x, y: pos.y };
  game.gadgets.set(gadget.id, gadget);
  return gadget;
}

// Coloca un gadget nuevo en una casilla sin otro gadget y lejos de los jugadores.
function respawnGadget(game, type) {
  let pos = null;
  for (let i = 0; i < 30; i++) {
    pos = center(game.reachable[rand(game.reachable.length)]);
    const taken = [...game.gadgets.values()].some((g) => g.x === pos.x && g.y === pos.y);
    const near = alivePlayers(game).some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < TILE * 3);
    if (!taken && !near) break;
  }
  return addGadget(game, type, pos);
}

// Crea una partida nueva para la lista de jugadores [{id, name, index}].
function createGame(playerList) {
  const { walls, reachable } = generateMap();

  // Barajar las casillas alcanzables: las primeras son gadgets, el resto posibles apariciones.
  for (let i = reachable.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [reachable[i], reachable[j]] = [reachable[j], reachable[i]];
  }

  const game = {
    walls, reachable,
    gadgets: new Map(), nextGadgetId: 0,
    players: new Map(),
    time: 0,
    outCount: 0,
    // Sin portador y con una pausa: al terminar la pausa se reparte la bomba al azar.
    bomb: { holderId: null, left: 0, pause: CONFIG.START_COUNTDOWN },
  };

  const gadgetCount = GADGET_TYPES.length * CONFIG.GADGETS_PER_TYPE;
  reachable.slice(0, gadgetCount).forEach((cell, i) => addGadget(game, GADGET_TYPES[i % GADGET_TYPES.length], center(cell)));
  const spawnCells = reachable.slice(gadgetCount);

  // Cada jugador aparece lo más lejos posible de los que ya están colocados.
  const spawns = [];
  for (const info of playerList) {
    let best = null;
    let bestDist = -1;
    for (let i = 0; i < 30; i++) {
      const pos = center(spawnCells[rand(spawnCells.length)]);
      const dist = Math.min(Infinity, ...spawns.map((s) => Math.hypot(s.x - pos.x, s.y - pos.y)));
      if (dist > bestDist) {
        best = pos;
        bestDist = dist;
      }
    }
    spawns.push(best);
    game.players.set(info.id, {
      id: info.id, name: info.name, index: info.index,
      x: best.x, y: best.y,
      alive: true, outOrder: 0,       // outOrder: 1 para el primer eliminado, 2 para el segundo...
      frozenUntil: 0, slowUntil: 0, boostUntil: 0, immuneUntil: 0,
      sprintUntil: 0, sprintReadyAt: 0,   // esprint: hasta cuándo dura y desde cuándo se puede repetir
      input: { up: false, down: false, left: false, right: false, sprint: false },
    });
  }

  return game;
}

// ¿Choca con un muro un jugador centrado en (x, y)?
function hitsWall(walls, x, y) {
  const x0 = Math.floor((x - RADIUS) / TILE);
  const x1 = Math.floor((x + RADIUS) / TILE);
  const y0 = Math.floor((y - RADIUS) / TILE);
  const y1 = Math.floor((y + RADIUS) / TILE);
  return walls[y0][x0] || walls[y0][x1] || walls[y1][x0] || walls[y1][x1];
}

// Esprint: se pide con una pulsación (input.sprint) y se gasta aunque no se pueda usar,
// para que mantener la tecla no lo dispare solo al terminar la recarga.
function trySprint(game, p, events) {
  if (!p.input.sprint) return;
  p.input.sprint = false;
  if (game.time < p.frozenUntil || game.time < p.sprintReadyAt) return;
  p.sprintUntil = game.time + CONFIG.SPRINT_SECONDS;
  p.sprintReadyAt = p.sprintUntil + CONFIG.SPRINT_COOLDOWN;
  events.push({ type: 'sprint', by: p.id });
}

function movePlayer(game, p, dt) {
  if (game.time < p.frozenUntil) return;
  const dx = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
  const dy = (p.input.down ? 1 : 0) - (p.input.up ? 1 : 0);
  if (!dx && !dy) return;

  let speed = SPEED;
  if (game.bomb.holderId === p.id) speed *= CONFIG.BOMB_SPEED;
  if (game.time < p.slowUntil) speed *= CONFIG.GUM_FACTOR;
  if (game.time < p.boostUntil) speed *= CONFIG.BOOST_FACTOR;
  if (game.time < p.sprintUntil) speed *= CONFIG.SPRINT_FACTOR;

  // Movimiento en pasos pequeños y por ejes, para deslizarse a lo largo de los muros.
  const dist = speed * dt;
  const steps = Math.ceil(dist / 2);
  const len = Math.hypot(dx, dy);
  const sx = (dx / len) * (dist / steps);
  const sy = (dy / len) * (dist / steps);
  for (let i = 0; i < steps; i++) {
    if (!hitsWall(game.walls, p.x + sx, p.y)) p.x += sx;
    if (!hitsWall(game.walls, p.x, p.y + sy)) p.y += sy;
  }
}

function useGadgets(game, p, events) {
  for (const g of game.gadgets.values()) {
    if (Math.hypot(g.x - p.x, g.y - p.y) >= RADIUS + GADGET_RADIUS) continue;
    game.gadgets.delete(g.id);
    if (g.type === 'trap') p.frozenUntil = game.time + CONFIG.TRAP_SECONDS;
    if (g.type === 'gum') p.slowUntil = game.time + CONFIG.GUM_SECONDS;
    if (g.type === 'boost') p.boostUntil = game.time + CONFIG.BOOST_SECONDS;
    events.push({ type: 'gadget', kind: g.type, by: p.id, removed: g.id, added: respawnGadget(game, g.type) });
  }
}

function updateBomb(game, dt, events) {
  const bomb = game.bomb;
  const alive = alivePlayers(game);

  // Nadie tiene la bomba: se espera la pausa y se le da a un jugador vivo al azar.
  if (bomb.holderId === null) {
    bomb.pause -= dt;
    if (bomb.pause <= 0 && alive.length > 1) {
      bomb.holderId = alive[rand(alive.length)].id;
      bomb.left = CONFIG.BOMB_SECONDS;
      events.push({ type: 'bomb', holder: bomb.holderId });
    }
    return;
  }

  const holder = game.players.get(bomb.holderId);
  if (!holder || !holder.alive) {  // el portador se ha desconectado
    bomb.holderId = null;
    bomb.pause = 1;
    return;
  }

  bomb.left -= dt;
  if (bomb.left <= 0) {
    holder.alive = false;
    holder.outOrder = ++game.outCount;
    bomb.holderId = null;
    bomb.pause = CONFIG.EXPLOSION_PAUSE;
    events.push({ type: 'explosion', id: holder.id, x: Math.round(holder.x), y: Math.round(holder.y) });
    return;
  }

  // Pasar la bomba al tocar a otro jugador que no sea inmune.
  const target = alive.find((p) => p.id !== holder.id
    && game.time >= p.immuneUntil
    && Math.hypot(p.x - holder.x, p.y - holder.y) < RADIUS * 2 + 2);
  if (target) {
    holder.immuneUntil = game.time + CONFIG.PASS_IMMUNITY;
    target.frozenUntil = Math.max(target.frozenUntil, game.time + CONFIG.RECEIVE_STUN);
    bomb.holderId = target.id;
    events.push({ type: 'pass', from: holder.id, to: target.id });
  }
}

// Avanza la partida dt segundos. Devuelve lo que ha pasado y, si la hay, el id del ganador.
function step(game, dt) {
  game.time += dt;
  const events = [];
  for (const p of alivePlayers(game)) {
    trySprint(game, p, events);
    movePlayer(game, p, dt);
    useGadgets(game, p, events);
  }
  updateBomb(game, dt, events);
  return { events, winnerId: findWinner(game) };
}

// Gana el último jugador vivo. (Si los vivos se desconectan todos, el último eliminado.)
function findWinner(game) {
  const all = [...game.players.values()];
  const alive = all.filter((p) => p.alive);
  if (alive.length > 1 || all.length === 0) return null;
  if (alive.length === 1) return alive[0].id;
  return all.sort((a, b) => b.outOrder - a.outOrder)[0].id;
}

// Efectos activos de un jugador, para que el cliente los dibuje: t = trampa, g = chicle, b = acelerador, s = esprint.
function effectsOf(game, p) {
  return (game.time < p.frozenUntil ? 't' : '') + (game.time < p.slowUntil ? 'g' : '') + (game.time < p.boostUntil ? 'b' : '')
    + (game.time < p.sprintUntil ? 's' : '');
}

// Segundos que faltan para poder volver a esprintar (0 = listo).
function sprintWait(game, p) {
  return Math.max(0, Math.ceil((p.sprintReadyAt - game.time) * 10) / 10);
}

module.exports = { createGame, step, effectsOf, sprintWait, TILE, COLS, ROWS, RADIUS, GADGET_RADIUS, SPEED, TICK_MS };
