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
const MAP_THEMES = ['forest', 'desert', 'ruins'];
const GAME_MODES = ['bomb', 'coinRush'];
const LANDMARK_CLEARANCE = 4;
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'cross', 'pentagon'];
const SKIN_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#f783ac', '#da77f2', '#ff922b', '#38d9a9', '#f1f3f5'];

const POND_LAYOUTS = {
  forest: [
    { x: 8, y: 7, rx: 50, ry: 34, shape: 'oval' },
    { x: 32, y: 7, rx: 72, ry: 44, shape: 'lobed' },
    { x: 8, y: 23, rx: 42, ry: 42, shape: 'round' },
    { x: 32, y: 23, rx: 62, ry: 32, shape: 'bean' },
  ],
  desert: [
    { x: 8, y: 7, rx: 38, ry: 29, shape: 'round' },
    { x: 32, y: 7, rx: 68, ry: 35, shape: 'bean' },
    { x: 8, y: 23, rx: 55, ry: 30, shape: 'oval' },
    { x: 32, y: 23, rx: 42, ry: 42, shape: 'lobed' },
  ],
  ruins: [
    { x: 8, y: 7, rx: 62, ry: 36, shape: 'stepped' },
    { x: 32, y: 7, rx: 44, ry: 44, shape: 'round' },
    { x: 8, y: 23, rx: 74, ry: 34, shape: 'oval' },
    { x: 32, y: 23, rx: 48, ry: 30, shape: 'bean' },
  ],
};

const rand = (n) => Math.floor(Math.random() * n);

// Genera muros aleatorios y devuelve también las casillas libres alcanzables.
// Si el mapa queda demasiado partido, se descarta y se genera otro.
function generateMap(theme) {
  const layouts = {
    forest: { blocks: 45, minSize: 1, sizeRange: 3 },
    desert: { blocks: 52, minSize: 2, sizeRange: 3 },
    ruins: { blocks: 58, minSize: 1, sizeRange: 2 },
  };
  const layout = layouts[theme] || layouts.forest;
  const landmarkCellX = Math.floor(COLS / 2);
  const landmarkCellY = Math.floor(ROWS / 2);
  const outerPonds = (POND_LAYOUTS[theme] || POND_LAYOUTS.forest).map((pond, i) => ({
    id: `pond-${i}`,
    x: (pond.x + 0.5) * TILE,
    y: (pond.y + 0.5) * TILE,
    rx: pond.rx,
    ry: pond.ry,
    shape: pond.shape,
  }));
  const centerPond = {
    id: 'pond-center',
    x: (landmarkCellX + 0.5) * TILE,
    y: (landmarkCellY + 0.5) * TILE,
    rx: theme === 'desert' ? 67 : (theme === 'ruins' ? 57 : 65),
    ry: theme === 'desert' ? 38 : (theme === 'ruins' ? 37 : 42),
    shape: 'oval',
    landmark: true,
  };
  const ponds = [centerPond, ...outerPonds];
  const nearPond = (x, y) => ponds.some((pond) =>
    Math.abs(x - pond.x / TILE + 0.5) <= Math.ceil(pond.rx / TILE) + 1
    && Math.abs(y - pond.y / TILE + 0.5) <= Math.ceil(pond.ry / TILE) + 1);
  for (;;) {
    const walls = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1));

    for (let i = 0; i < layout.blocks; i++) {
      const w = layout.minSize + rand(layout.sizeRange);
      const h = layout.minSize + rand(layout.sizeRange);
      const x0 = 1 + rand(COLS - 1 - w);
      const y0 = 1 + rand(ROWS - 1 - h);
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const nearLandmark = Math.abs(x - landmarkCellX) <= LANDMARK_CLEARANCE
          && Math.abs(y - landmarkCellY) <= LANDMARK_CLEARANCE;
        if (!nearLandmark && !nearPond(x, y)) walls[y][x] = true;
      }
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

    const everyPondReachable = ponds.every((pond) => {
      const x = Math.floor(pond.x / TILE);
      const y = Math.floor(pond.y / TILE);
      return seen.has(y * COLS + x);
    });
    if (reachable.length >= free.length * 0.9 && everyPondReachable) {
      const placementCells = reachable.filter(([x, y]) =>
        (Math.abs(x - landmarkCellX) > LANDMARK_CLEARANCE || Math.abs(y - landmarkCellY) > LANDMARK_CLEARANCE)
        && !nearPond(x, y));
      return {
        walls,
        reachable: placementCells,
        landmark: { x: (landmarkCellX + 0.5) * TILE, y: (landmarkCellY + 0.5) * TILE },
        ponds,
      };
    }
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
function createGame(playerList, theme = 'forest', mode = 'bomb') {
  if (!MAP_THEMES.includes(theme)) theme = 'forest';
  if (!GAME_MODES.includes(mode)) mode = 'bomb';
  const { walls, reachable, landmark, ponds } = generateMap(theme);

  // Barajar las casillas alcanzables: las primeras son gadgets, el resto posibles apariciones.
  for (let i = reachable.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [reachable[i], reachable[j]] = [reachable[j], reachable[i]];
  }

  const game = {
    walls, reachable, theme, landmark, ponds, mode,
    gadgets: new Map(), nextGadgetId: 0,
    coins: new Map(), nextCoinId: 0, pendingCoins: [],
    players: new Map(),
    time: 0,
    outCount: 0,
    // Sin portador y con una pausa: al terminar la pausa se reparte la bomba al azar.
    bomb: { holderId: null, left: 0, pause: CONFIG.START_COUNTDOWN, type: null },
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
      shape: SHAPES.includes(info.shape) ? info.shape : SHAPES[info.index % SHAPES.length],
      color: /^#[0-9a-fA-F]{6}$/.test(info.color || '') ? info.color.toLowerCase() : SKIN_COLORS[info.index % SKIN_COLORS.length],
      x: best.x, y: best.y,
      alive: true, outOrder: 0, inPond: false, teleportReadyAt: 0, // eliminación y salto de estanque
      frozenUntil: 0, slowUntil: 0, boostUntil: 0, immuneUntil: 0,
      sprintUntil: 0, sprintReadyAt: 0,   // esprint: hasta cuándo dura y desde cuándo se puede repetir
      coins: 0,
      wins: Number.isInteger(info.wins) ? info.wins : 0,
      stats: {
        survivalTime: 0, boosts: 0, teleports: 0, traps: 0, bombsPassed: 0,
        bombsReceived: 0, distance: 0, coins: 0, eliminations: 0,
      },
      input: { up: false, down: false, left: false, right: false, sprint: false },
    });
  }

  if (mode === 'coinRush') {
    const coinCells = [...spawnCells];
    for (let i = 0; i < CONFIG.COINS_ON_MAP && coinCells.length; i++) {
      const cellIndex = rand(coinCells.length);
      const pos = center(coinCells.splice(cellIndex, 1)[0]);
      const coin = { id: game.nextCoinId++, x: pos.x, y: pos.y };
      game.coins.set(coin.id, coin);
    }
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

  const startX = p.x;
  const startY = p.y;
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
  p.stats.distance += Math.hypot(p.x - startX, p.y - startY);
}

function pondAt(game, x, y) {
  return game.ponds.find((pond) => {
    const dx = (x - pond.x) / pond.rx;
    const dy = (y - pond.y) / pond.ry;
    return dx * dx + dy * dy <= 1;
  });
}

// Al entrar en cualquier estanque, salta a una zona libre lejana del mapa.
function usePonds(game, p, events) {
  const pond = pondAt(game, p.x, p.y);
  if (!pond) {
    p.inPond = false;
    return;
  }
  if (p.inPond || game.time < p.teleportReadyAt) {
    p.inPond = true;
    return;
  }

  const from = { x: p.x, y: p.y };
  let destinations = game.reachable.map((cell) => {
    const pos = center(cell);
    return { ...pos, distance: Math.hypot(pos.x - from.x, pos.y - from.y) };
  }).filter((pos) => pos.distance >= Math.min(COLS, ROWS) * TILE * 0.55);
  if (!destinations.length) {
    destinations = game.reachable.map((cell) => {
      const pos = center(cell);
      return { ...pos, distance: Math.hypot(pos.x - from.x, pos.y - from.y) };
    });
  }
  const farthest = Math.max(...destinations.map((pos) => pos.distance));
  let options = destinations.filter((pos) => pos.distance >= farthest * 0.8);
  const unoccupied = options.filter((pos) => alivePlayers(game).every((other) =>
    other.id === p.id || Math.hypot(other.x - pos.x, other.y - pos.y) >= TILE * 2));
  if (unoccupied.length) options = unoccupied;
  const to = options[rand(options.length)];
  if (!to) return;

  p.x = to.x;
  p.y = to.y;
  p.inPond = false;
  p.teleportReadyAt = game.time + CONFIG.POND_TELEPORT_COOLDOWN;
  p.stats.teleports++;
  events.push({ type: 'teleport', by: p.id, from, to: { x: p.x, y: p.y } });
}

function useGadgets(game, p, events) {
  for (const g of game.gadgets.values()) {
    if (Math.hypot(g.x - p.x, g.y - p.y) >= RADIUS + GADGET_RADIUS) continue;
    game.gadgets.delete(g.id);
    if (g.type === 'trap') p.frozenUntil = game.time + CONFIG.TRAP_SECONDS;
    if (g.type === 'gum') p.slowUntil = game.time + CONFIG.GUM_SECONDS;
    if (g.type === 'boost') p.boostUntil = game.time + CONFIG.BOOST_SECONDS;
    if (g.type === 'boost') p.stats.boosts++;
    if (g.type === 'trap') p.stats.traps++;
    events.push({ type: 'gadget', kind: g.type, by: p.id, removed: g.id, added: respawnGadget(game, g.type) });
  }
}

function randomBombType() {
  return CONFIG.BOMB_TYPES[rand(CONFIG.BOMB_TYPES.length)];
}

function explodeBomb(game, holder, events) {
  const bombType = game.bomb.type;
  const effectType = bombType === 'mystery'
    ? ['standard', 'frozen', 'explosive'][rand(3)]
    : bombType;
  const radius = effectType === 'explosive' ? CONFIG.EXPLOSIVE_RADIUS
    : (effectType === 'frozen' ? CONFIG.FROZEN_RADIUS : 0);
  const affected = [];
  const slowed = [];

  for (const p of alivePlayers(game)) {
    const distance = Math.hypot(p.x - holder.x, p.y - holder.y);
    if (effectType === 'explosive' && distance <= radius) {
      p.alive = false;
      p.outOrder = ++game.outCount;
      affected.push(p.id);
      if (p.id !== holder.id) holder.stats.eliminations++;
    } else if (p.id === holder.id) {
      p.alive = false;
      p.outOrder = ++game.outCount;
      affected.push(p.id);
    } else if (effectType === 'frozen' && distance <= radius) {
      p.slowUntil = Math.max(p.slowUntil, game.time + CONFIG.FROZEN_SECONDS);
      slowed.push(p.id);
    }
  }

  game.bomb.holderId = null;
  game.bomb.left = 0;
  game.bomb.type = null;
  game.bomb.pause = CONFIG.EXPLOSION_PAUSE;
  events.push({
    type: 'explosion', id: holder.id, x: Math.round(holder.x), y: Math.round(holder.y),
    bombType, effectType, radius, affected, slowed,
  });
}

function updateCoins(game, events) {
  const pending = [];
  for (const item of game.pendingCoins) {
    if (item.at > game.time) {
      pending.push(item);
      continue;
    }
    const occupied = new Set([...game.coins.values()].map((coin) => `${coin.x},${coin.y}`));
    const available = game.reachable.filter(([x, y]) => {
      const pos = center([x, y]);
      return !occupied.has(`${pos.x},${pos.y}`)
        && ![...game.gadgets.values()].some((g) => g.x === pos.x && g.y === pos.y);
    });
    if (!available.length) {
      pending.push({ ...item, at: game.time + 1 });
      continue;
    }
    const coin = { id: game.nextCoinId++, ...center(available[rand(available.length)]) };
    game.coins.set(coin.id, coin);
    events.push({ type: 'coin_spawn', coin });
  }
  game.pendingCoins = pending;

  for (const p of alivePlayers(game)) {
    for (const coin of game.coins.values()) {
      if (Math.hypot(coin.x - p.x, coin.y - p.y) > RADIUS + 10) continue;
      game.coins.delete(coin.id);
      p.coins++;
      p.stats.coins++;
      game.pendingCoins.push({ id: coin.id, at: game.time + CONFIG.COIN_RESPAWN_SECONDS });
      events.push({ type: 'coin', by: p.id, id: coin.id, x: coin.x, y: coin.y });
      break;
    }
  }
}

function findCoinWinners(game) {
  if (game.time < CONFIG.COIN_RUSH_SECONDS) return [];
  const players = [...game.players.values()];
  if (!players.length) return [];
  const highest = Math.max(...players.map((p) => p.coins));
  return players.filter((p) => p.coins === highest).map((p) => p.id);
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
      bomb.type = randomBombType();
      game.players.get(bomb.holderId).stats.bombsReceived++;
      events.push({ type: 'bomb', holder: bomb.holderId, bombType: bomb.type });
    }
    return;
  }

  const holder = game.players.get(bomb.holderId);
  if (!holder || !holder.alive) {  // el portador se ha desconectado
    bomb.holderId = null;
    bomb.type = null;
    bomb.pause = 1;
    return;
  }

  bomb.left -= dt;
  if (bomb.left <= 0) {
    explodeBomb(game, holder, events);
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
    holder.stats.bombsPassed++;
    target.stats.bombsReceived++;
    events.push({ type: 'pass', from: holder.id, to: target.id, bombType: bomb.type });
  }
}

// Avanza la partida dt segundos. Devuelve lo que ha pasado y, si la hay, el id del ganador.
function step(game, dt) {
  game.time += dt;
  const events = [];
  for (const p of alivePlayers(game)) {
    p.stats.survivalTime += dt;
    trySprint(game, p, events);
    movePlayer(game, p, dt);
    usePonds(game, p, events);
    useGadgets(game, p, events);
  }
  if (game.mode === 'coinRush') updateCoins(game, events);
  else updateBomb(game, dt, events);
  const winnerIds = game.mode === 'coinRush'
    ? findCoinWinners(game)
    : (findWinner(game) === null ? [] : [findWinner(game)]);
  return { events, winnerId: winnerIds[0] || null, winnerIds };
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

module.exports = {
  createGame, step, effectsOf, sprintWait, TILE, COLS, ROWS, RADIUS, GADGET_RADIUS, SPEED, TICK_MS,
  MAP_THEMES, GAME_MODES, SHAPES, SKIN_COLORS,
};
