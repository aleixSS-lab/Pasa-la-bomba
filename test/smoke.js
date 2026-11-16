'use strict';
// Prueba de humo: arranca un servidor de prueba, conecta 3 jugadores simulados,
// comprueba la sala de espera y juega una partida completa hasta que alguien gana.
// Uso: npm test

const assert = require('assert');
const { io: connect } = require('socket.io-client');
const { start, io } = require('../server/index');

const PORT = 3999;
const URL = `http://localhost:${PORT}`;
const ok = (text) => console.log(`  ✓ ${text}`);
const ask = (socket, event, ...args) => new Promise((resolve) => socket.emit(event, ...args, resolve));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const client = () => new Promise((resolve) => {
  const socket = connect(URL, { forceNew: true, transports: ['websocket'] });
  socket.on('connect', () => resolve(socket));
});

// Jugador automático: busca con un recorrido en anchura la moneda más cercana y va hacia ella.
function attachBot(socket) {
  let map = null;
  let coins = null;
  let last = '';
  socket.on('game_start', (data) => {
    map = data;
    coins = new Map(data.coins.map((c) => [c.id, c]));
  });
  socket.on('coin_collected', (c) => coins.delete(c.id));
  socket.on('state', (players) => {
    const me = players.find((p) => p.id === socket.id);
    if (!me || !map) return;
    const T = map.tile;
    const key = (x, y) => y * map.cols + x;
    const coinAt = new Map([...coins.values()].map((c) => [key(Math.floor(c.x / T), Math.floor(c.y / T)), c]));
    const sx = Math.floor(me.x / T);
    const sy = Math.floor(me.y / T);

    let target = coinAt.get(key(sx, sy));
    if (!target) {
      const from = new Map([[key(sx, sy), null]]);
      const queue = [[sx, sy]];
      let found = null;
      for (let i = 0; i < queue.length && !found; i++) {
        const [x, y] = queue[i];
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (map.walls[ny][nx] === '1' || from.has(key(nx, ny))) continue;
          from.set(key(nx, ny), [x, y]);
          if (coinAt.has(key(nx, ny))) { found = [nx, ny]; break; }
          queue.push([nx, ny]);
        }
      }
      if (!found) return;
      // Retroceder por el camino hasta la primera casilla después de la mía.
      let step = found;
      while (from.get(key(step[0], step[1])) && key(...from.get(key(step[0], step[1]))) !== key(sx, sy)) {
        step = from.get(key(step[0], step[1]));
      }
      target = { x: step[0] * T + T / 2, y: step[1] * T + T / 2 };
    }

    const dx = target.x - me.x;
    const dy = target.y - me.y;
    const input = { left: dx < -6, right: dx > 6, up: dy < -6, down: dy > 6 };
    const text = JSON.stringify(input);
    if (text !== last) {
      last = text;
      socket.emit('input', input);
    }
  });
}

async function main() {
  await start(PORT);
  console.log('Prueba de humo de Coin Rush');

  const [ana, luis, marta] = await Promise.all([client(), client(), client()]);
  [ana, luis, marta].forEach(attachBot);

  // --- Sala de espera ---
  assert.strictEqual((await ask(ana, 'create_room', { name: '   ' })).error, 'invalid_name');
  const created = await ask(ana, 'create_room', { name: 'Ana' });
  assert.ok(created.ok && /^[A-Z]{4}$/.test(created.code));
  const code = created.code;
  ok(`sala creada con código ${code}`);

  assert.strictEqual((await ask(ana, 'start_game')).error, 'need_players');
  assert.strictEqual((await ask(luis, 'join_room', { name: 'Luis', code: 'ZZZZ' })).error, 'room_not_found');
  assert.strictEqual((await ask(luis, 'join_room', { name: 'ana', code })).error, 'name_taken');
  ok('se rechazan apodo vacío, código inexistente, apodo repetido y empezar con un solo jugador');

  const update = once(ana, 'room_update');
  assert.ok((await ask(luis, 'join_room', { name: 'Luis', code: code.toLowerCase() })).ok);
  assert.strictEqual((await update).players.length, 2);
  assert.ok((await ask(marta, 'join_room', { name: 'Marta', code })).ok);
  ok('se unen dos jugadores más y el máster recibe la actualización');

  assert.strictEqual((await ask(luis, 'start_game')).error, 'not_host');
  ok('un jugador que no es máster no puede empezar');

  let res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.status, 'lobby');
  assert.strictEqual(res.winner, null);
  assert.strictEqual((await fetch(`${URL}/api/games/NOPE`)).status, 404);
  ok('la API devuelve el estado de la sala y 404 si no existe');

  // --- Partida ---
  const starts = Promise.all([ana, luis, marta].map((s) => once(s, 'game_start')));
  const overs = Promise.all([ana, luis, marta].map((s) => once(s, 'game_over')));
  assert.ok((await ask(ana, 'start_game')).ok);
  const maps = await starts;
  const map = maps[0];
  assert.strictEqual(map.coins.length, 50);
  assert.strictEqual(map.players.length, 3);
  assert.strictEqual(map.walls.length, map.rows);
  assert.strictEqual(new Set(map.players.map((p) => `${p.x},${p.y}`)).size, 3);
  assert.ok(maps.every((m) => JSON.stringify(m.walls) === JSON.stringify(map.walls)));
  for (const item of [...map.coins, ...map.players]) {
    assert.strictEqual(map.walls[Math.floor(item.y / map.tile)][Math.floor(item.x / map.tile)], '0');
  }
  ok('mapa aleatorio igual para todos: 50 monedas y 3 apariciones distintas, ninguna dentro de un muro');

  assert.strictEqual((await ask(marta, 'join_room', { name: 'Tarde', code })).ok, true); // ya está dentro
  const late = await client();
  assert.strictEqual((await ask(late, 'join_room', { name: 'Tarde', code })).error, 'game_in_progress');
  late.close();
  ok('no se puede entrar en una partida ya empezada');

  console.log('  … jugando la partida con jugadores automáticos');
  const results = await overs;
  const result = results[0];
  const top = result.players[0];
  assert.ok(result.winner);
  assert.strictEqual(top.name, result.winner);
  assert.ok(top.score === 15 || result.coinsLeft === 0);
  assert.ok(results.every((r) => r.winner === result.winner));
  ok(`partida terminada: gana ${result.winner} con ${top.score} monedas (${result.players.map((p) => `${p.name} ${p.score}`).join(', ')})`);

  res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.status, 'finished');
  assert.strictEqual(res.winner, result.winner);
  ok('la API devuelve el ganador');

  // --- Revancha y salida ---
  const back = once(luis, 'room_update');
  ana.emit('back_to_lobby');
  let state = await back;
  while (state.status !== 'lobby') state = await once(luis, 'room_update');
  ok('el máster devuelve a todos a la sala de espera');

  const afterLeave = once(luis, 'room_update');
  ana.close();
  const room = await afterLeave;
  assert.strictEqual(room.players.length, 2);
  assert.strictEqual(room.hostId, luis.id);
  ok('si el máster se va, el siguiente jugador pasa a ser máster');

  luis.close();
  marta.close();
  await new Promise((r) => setTimeout(r, 300));
  res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.winner, result.winner);
  ok('el resultado sigue disponible en la API aunque la sala se vacíe');

  console.log('\nTodo correcto.');
  io.close();
  process.exit(0);
}

setTimeout(() => {
  console.error('\nERROR: la prueba ha tardado más de 2 minutos.');
  process.exit(1);
}, 120000).unref();

main().catch((err) => {
  console.error('\nERROR:', err.message || err);
  process.exit(1);
});
