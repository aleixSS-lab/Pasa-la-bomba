'use strict';
// Lógica del juego, sin nada de red: mapa aleatorio, movimiento, monedas y victoria.

const TILE = 40;          // tamaño de una casilla en píxeles
const COLS = 40;          // casillas de ancho
const ROWS = 30;          // casillas de alto
const COIN_COUNT = 50;    // monedas repartidas por el mapa
const GOAL = 15;          // monedas necesarias para ganar
const RADIUS = 12;        // radio del jugador
const COIN_RADIUS = 10;
const SPEED = 220;        // píxeles por segundo
const TICK_MS = 50;       // el servidor avanza 20 veces por segundo

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

// Crea una partida nueva para la lista de jugadores [{id, name, index}].
function createGame(playerList) {
  const { walls, reachable } = generateMap();

  // Barajar las casillas alcanzables: las 50 primeras son monedas, el resto posibles apariciones.
  for (let i = reachable.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [reachable[i], reachable[j]] = [reachable[j], reachable[i]];
  }
  const coins = new Map();
  reachable.slice(0, COIN_COUNT).forEach((cell, id) => coins.set(id, { id, ...center(cell) }));
  const spawnCells = reachable.slice(COIN_COUNT);

  // Cada jugador aparece lo más lejos posible de los que ya están colocados.
  const players = new Map();
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
    players.set(info.id, {
      id: info.id, name: info.name, index: info.index,
      x: best.x, y: best.y, score: 0, scoredAt: 0,
      input: { up: false, down: false, left: false, right: false },
    });
  }

  return { walls, coins, players, tick: 0 };
}

// ¿Choca con un muro un jugador centrado en (x, y)?
function hitsWall(walls, x, y) {
  const x0 = Math.floor((x - RADIUS) / TILE);
  const x1 = Math.floor((x + RADIUS) / TILE);
  const y0 = Math.floor((y - RADIUS) / TILE);
  const y1 = Math.floor((y + RADIUS) / TILE);
  return walls[y0][x0] || walls[y0][x1] || walls[y1][x0] || walls[y1][x1];
}

// Avanza la partida dt segundos. Devuelve las monedas recogidas y, si la hay, el id del ganador.
function step(game, dt) {
  game.tick++;
  const collected = [];

  for (const p of game.players.values()) {
    const dx = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
    const dy = (p.input.down ? 1 : 0) - (p.input.up ? 1 : 0);
    if (dx || dy) {
      // Movimiento en pasos pequeños y por ejes, para deslizarse a lo largo de los muros.
      const dist = SPEED * dt;
      const steps = Math.ceil(dist / 2);
      const len = Math.hypot(dx, dy);
      const sx = (dx / len) * (dist / steps);
      const sy = (dy / len) * (dist / steps);
      for (let i = 0; i < steps; i++) {
        if (!hitsWall(game.walls, p.x + sx, p.y)) p.x += sx;
        if (!hitsWall(game.walls, p.x, p.y + sy)) p.y += sy;
      }
    }

    for (const coin of game.coins.values()) {
      if (Math.hypot(coin.x - p.x, coin.y - p.y) < RADIUS + COIN_RADIUS) {
        game.coins.delete(coin.id);
        p.score++;
        p.scoredAt = game.tick;
        collected.push({ id: coin.id, by: p.id });
      }
    }
  }

  return { collected, winnerId: findWinner(game) };
}

// Gana quien llega a GOAL. Si se acaban las monedas, quien más tenga (y, si empatan, quien llegó antes).
function findWinner(game) {
  const list = [...game.players.values()];
  const reached = list.find((p) => p.score >= GOAL);
  if (reached) return reached.id;
  if (game.coins.size > 0 || list.length === 0) return null;
  list.sort((a, b) => b.score - a.score || a.scoredAt - b.scoredAt);
  return list[0].id;
}

module.exports = { createGame, step, TILE, COLS, ROWS, COIN_COUNT, GOAL, RADIUS, COIN_RADIUS, TICK_MS };
