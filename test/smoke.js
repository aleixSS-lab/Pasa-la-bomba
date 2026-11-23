'use strict';
// Prueba automática. Tiene dos partes:
//   A) Reglas del juego, sin red: velocidades, gadgets, pasar la bomba, explosión y ganador.
//   B) Partida completa por red con 3 jugadores simulados (con la bomba acelerada para no esperar).
// Uso: npm test

const assert = require('assert');
const { io: connect } = require('socket.io-client');
const CONFIG = require('../server/config');
const game = require('../server/game');
const { start, io } = require('../server/index');

const PORT = 3999;
const URL = `http://localhost:${PORT}`;
const ok = (text) => console.log(`  ✓ ${text}`);
const near = (value, expected, margin, what) =>
  assert.ok(Math.abs(value - expected) <= margin, `${what}: se esperaba ${expected} y salió ${value.toFixed(1)}`);

// ---------- A) Reglas del juego ----------

// Partida en un mapa vacío (solo el borde), sin gadgets y sin bomba, para medir con precisión.
function arena(names) {
  const g = game.createGame(names.map((name, index) => ({ id: name, name, index })));
  g.walls = g.walls.map((row, y) => row.map((_, x) => x === 0 || y === 0 || x === game.COLS - 1 || y === game.ROWS - 1));
  g.gadgets.clear();
  g.bomb = { holderId: null, left: 0, pause: 999 };
  names.forEach((name, i) => Object.assign(g.players.get(name), { x: 100, y: 100 + i * 200 }));
  return g;
}

function run(g, seconds) {
  const out = { events: [], winnerId: null };
  for (let i = 0; i < Math.round(seconds * 20); i++) {
    const r = game.step(g, 0.05);
    out.events.push(...r.events);
    if (r.winnerId !== null) out.winnerId = r.winnerId;
  }
  return out;
}

// Distancia que recorre un jugador en un segundo tras pisar (o no) un gadget.
function distanceInOneSecond(gadgetType, withBomb) {
  const g = arena(['A', 'B']);
  const a = g.players.get('A');
  if (gadgetType) {
    g.gadgets.set(999, { id: 999, type: gadgetType, x: a.x, y: a.y });
    const { events } = run(g, 0.05);
    assert.strictEqual(events[0].kind, gadgetType);
    assert.ok(g.gadgets.has(events[0].added.id), 'el gadget usado debe reaparecer en otro sitio');
    g.gadgets.clear();
  }
  if (withBomb) g.bomb = { holderId: 'A', left: 99, pause: 0 };
  a.input.right = true;
  const from = a.x;
  run(g, 1);
  return a.x - from;
}

function testRules() {
  near(distanceInOneSecond(null), game.SPEED, 3, 'velocidad normal');
  near(distanceInOneSecond(null, true), game.SPEED * CONFIG.BOMB_SPEED, 3, 'velocidad con bomba');
  near(distanceInOneSecond('boost'), game.SPEED * CONFIG.BOOST_FACTOR, 3, 'velocidad con acelerador');
  near(distanceInOneSecond('gum'), game.SPEED * CONFIG.GUM_FACTOR, 3, 'velocidad con chicle');
  ok(`velocidades: normal, con bomba (x${CONFIG.BOMB_SPEED}), acelerador (x${CONFIG.BOOST_FACTOR}) y chicle (x${CONFIG.GUM_FACTOR})`);

  // Trampa de oso: inmóvil durante TRAP_SECONDS y después vuelve a moverse.
  let g = arena(['A', 'B']);
  const a = g.players.get('A');
  g.gadgets.set(999, { id: 999, type: 'trap', x: a.x, y: a.y });
  a.input.right = true;
  run(g, 0.05);
  g.gadgets.clear();
  const trappedAt = a.x;
  run(g, CONFIG.TRAP_SECONDS - 0.15);
  near(a.x, trappedAt, 0.01, 'posición dentro de la trampa');
  run(g, 0.5);
  assert.ok(a.x > trappedAt + 20, 'después de la trampa debe volver a moverse');
  ok(`trampa de oso: ${CONFIG.TRAP_SECONDS} s sin moverse`);

  // Esprint: más rápido durante SPRINT_SECONDS y después recarga; mantener la tecla no lo repite.
  g = arena(['A', 'B']);
  const s = g.players.get('A');
  s.input.right = true;
  s.input.sprint = true;
  let from = s.x;
  let r0 = run(g, 1);
  assert.deepStrictEqual(r0.events, [{ type: 'sprint', by: 'A' }]);
  near(s.x - from, game.SPEED * CONFIG.SPRINT_FACTOR, 4, 'distancia en 1 s de esprint');
  run(g, CONFIG.SPRINT_SECONDS - 1 + 0.05);   // se acaba el esprint
  s.input.sprint = true;                      // pedirlo durante la recarga no hace nada...
  r0 = run(g, 0.1);
  assert.strictEqual(r0.events.length, 0, 'en recarga no se puede esprintar');
  assert.strictEqual(s.input.sprint, false, 'la petición se gasta aunque no se pueda usar');
  from = s.x;
  run(g, 1);
  near(s.x - from, game.SPEED, 4, 'velocidad normal durante la recarga');
  assert.ok(game.sprintWait(g, s) > 0, 'sprintWait cuenta la recarga');
  run(g, CONFIG.SPRINT_COOLDOWN);             // ...y al acabar la recarga no se dispara solo
  assert.strictEqual(game.sprintWait(g, s), 0);
  assert.ok(!game.effectsOf(g, s).includes('s'), 'sin pedirlo otra vez, no hay esprint');
  s.input.sprint = true;
  r0 = run(g, 0.05);
  assert.strictEqual(r0.events[0].type, 'sprint', 'acabada la recarga se puede repetir');
  // Atrapado en una trampa no se puede esprintar (y la petición no queda guardada).
  g = arena(['A', 'B']);
  const tr = g.players.get('A');
  tr.frozenUntil = 1;
  tr.input.sprint = true;
  r0 = run(g, 0.1);
  assert.strictEqual(r0.events.length, 0, 'en la trampa no se esprinta');
  run(g, 1);
  assert.ok(!game.effectsOf(g, tr).includes('s'), 'al salir de la trampa no esprinta solo');
  ok(`esprint: x${CONFIG.SPRINT_FACTOR} durante ${CONFIG.SPRINT_SECONDS} s, ${CONFIG.SPRINT_COOLDOWN} s de recarga, no se repite solo ni funciona en la trampa`);

  // Pasar la bomba al tocar, con inmunidad para quien la acaba de pasar.
  g = arena(['A', 'B']);
  Object.assign(g.players.get('B'), { x: 120, y: 100 });
  g.bomb = { holderId: 'A', left: 99, pause: 0 };
  let r = run(g, 0.05);
  assert.deepStrictEqual(r.events, [{ type: 'pass', from: 'A', to: 'B' }]);
  r = run(g, CONFIG.PASS_IMMUNITY - 0.15);
  assert.strictEqual(g.bomb.holderId, 'B', 'A es inmune y no debe recibirla de vuelta todavía');
  run(g, 0.3);
  assert.strictEqual(g.bomb.holderId, 'A', 'pasada la inmunidad, B se la devuelve');
  ok(`la bomba se pasa al tocar y hay ${CONFIG.PASS_IMMUNITY} s de inmunidad`);

  // Quien recibe la bomba se queda parado un instante.
  g = arena(['A', 'B']);
  const b = g.players.get('B');
  Object.assign(b, { x: 120, y: 100 });
  b.input.down = true;
  g.bomb = { holderId: 'A', left: 99, pause: 0 };
  run(g, 0.05);
  const stunnedAt = b.y;
  run(g, CONFIG.RECEIVE_STUN - 0.1);
  near(b.y, stunnedAt, 0.01, 'posición de quien recibe la bomba');
  ok(`quien recibe la bomba se queda parado ${CONFIG.RECEIVE_STUN} s`);

  // Explosión, bomba nueva al azar y ganador.
  g = arena(['A', 'B', 'C']);
  g.bomb = { holderId: 'A', left: 0.2, pause: 0 };
  r = run(g, 0.3);
  assert.strictEqual(r.events[0].type, 'explosion');
  assert.strictEqual(r.events[0].id, 'A');
  assert.strictEqual(g.players.get('A').alive, false);
  assert.strictEqual(r.winnerId, null, 'con dos jugadores vivos todavía no hay ganador');
  r = run(g, CONFIG.EXPLOSION_PAUSE + 0.1);
  const next = r.events.find((e) => e.type === 'bomb');
  assert.ok(next && ['B', 'C'].includes(next.holder), 'la bomba nueva va a un jugador vivo');
  near(g.bomb.left, CONFIG.BOMB_SECONDS, 0.2, 'tiempo de la bomba nueva');
  g.bomb.left = 0.1;
  r = run(g, 0.2);
  assert.strictEqual(r.winnerId, next.holder === 'B' ? 'C' : 'B');
  ok(`explosión: eliminado, bomba nueva al azar a los ${CONFIG.EXPLOSION_PAUSE} s y gana el último vivo`);
}

// ---------- B) Partida completa por red ----------

const ask = (socket, event, ...args) => new Promise((resolve) => socket.emit(event, ...args, resolve));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const client = () => new Promise((resolve) => {
  const socket = connect(URL, { forceNew: true, transports: ['websocket'] });
  socket.on('connect', () => resolve(socket));
});

// Jugador automático: cambia de dirección al azar varias veces por segundo.
function attachBot(socket) {
  const timer = setInterval(() => {
    const dir = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
    socket.emit('input', { [dir]: true });
  }, 300);
  socket.on('disconnect', () => clearInterval(timer));
}

async function testNetwork() {
  await start(PORT);
  const [ana, luis, marta] = await Promise.all([client(), client(), client()]);

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
  assert.strictEqual((await ask(luis, 'start_game')).error, 'not_host');
  ok('se unen dos jugadores más y solo el máster puede empezar');

  let res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.status, 'lobby');
  assert.strictEqual(res.winner, null);
  assert.strictEqual((await fetch(`${URL}/api/games/NOPE`)).status, 404);
  ok('la API devuelve el estado de la sala y 404 si no existe');

  // --- Partida (con la bomba acelerada) ---
  Object.assign(CONFIG, { BOMB_SECONDS: 3, EXPLOSION_PAUSE: 1, START_COUNTDOWN: 1 });
  const events = [];
  ana.on('game_event', (e) => events.push(e));
  const starts = Promise.all([ana, luis, marta].map((s) => once(s, 'game_start')));
  const overs = Promise.all([ana, luis, marta].map((s) => once(s, 'game_over')));
  assert.ok((await ask(ana, 'start_game')).ok);
  const maps = await starts;
  const map = maps[0];
  assert.strictEqual(map.gadgets.length, 3 * CONFIG.GADGETS_PER_TYPE);
  for (const type of ['trap', 'gum', 'boost']) {
    assert.strictEqual(map.gadgets.filter((g) => g.type === type).length, CONFIG.GADGETS_PER_TYPE);
  }
  assert.strictEqual(map.players.length, 3);
  assert.strictEqual(new Set(map.players.map((p) => `${p.x},${p.y}`)).size, 3);
  assert.ok(maps.every((m) => JSON.stringify(m.walls) === JSON.stringify(map.walls)));
  for (const item of [...map.gadgets, ...map.players]) {
    assert.strictEqual(map.walls[Math.floor(item.y / map.tile)][Math.floor(item.x / map.tile)], '0');
  }
  ok('mapa aleatorio igual para todos: 24 gadgets y 3 apariciones distintas, nada dentro de un muro');

  const late = await client();
  assert.strictEqual((await ask(late, 'join_room', { name: 'Tarde', code })).error, 'game_in_progress');
  late.close();
  ok('no se puede entrar en una partida ya empezada');

  const state = await once(luis, 'state');
  assert.strictEqual(state.players.length, 3);
  assert.ok('holder' in state.bomb && 'left' in state.bomb && 'pause' in state.bomb);
  assert.ok(state.players.every((p) => p.sw === 0), 'al empezar todos tienen el esprint listo');
  assert.ok(map.sprintCooldown > 0, 'el servidor envía la duración de la recarga');

  console.log('  … jugando la partida con jugadores automáticos');
  [ana, luis, marta].forEach(attachBot);
  const results = await overs;
  const result = results[0];
  const nameOf = (id) => map.players.find((p) => p.id === id).name;
  const explosions = events.filter((e) => e.type === 'explosion').map((e) => nameOf(e.id));
  assert.strictEqual(explosions.length, 2);
  assert.ok(events.filter((e) => e.type === 'bomb').length >= 2);
  assert.deepStrictEqual(result.eliminationOrder, explosions);
  assert.ok(result.winner && !explosions.includes(result.winner));
  assert.deepStrictEqual(result.players[0], { name: result.winner, place: 1, eliminated: false });
  assert.strictEqual(result.players[2].name, explosions[0]);
  assert.ok(results.every((r) => r.winner === result.winner));
  ok(`partida terminada: explotan ${explosions.join(' y ')}; gana ${result.winner}`);

  res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.status, 'finished');
  assert.strictEqual(res.winner, result.winner);
  assert.deepStrictEqual(res.eliminationOrder, explosions);
  ok('la API devuelve el ganador y el orden de eliminación');

  // --- Revancha y salida ---
  const back = once(luis, 'room_update');
  ana.emit('back_to_lobby');
  let room = await back;
  while (room.status !== 'lobby') room = await once(luis, 'room_update');
  ok('el máster devuelve a todos a la sala de espera');

  const afterLeave = once(luis, 'room_update');
  ana.close();
  room = await afterLeave;
  assert.strictEqual(room.players.length, 2);
  assert.strictEqual(room.hostId, luis.id);
  ok('si el máster se va, el siguiente jugador pasa a ser máster');

  luis.close();
  marta.close();
  await new Promise((r) => setTimeout(r, 300));
  res = await (await fetch(`${URL}/api/games/${code}`)).json();
  assert.strictEqual(res.winner, result.winner);
  ok('el resultado sigue disponible en la API aunque la sala se vacíe');
}

async function main() {
  console.log('Prueba de Pasa la bomba\n\nA) Reglas del juego');
  testRules();
  console.log('\nB) Partida completa por red');
  await testNetwork();
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
