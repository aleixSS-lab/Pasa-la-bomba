'use strict';
// Conexión con el servidor y control de las pantallas (inicio, sala de espera, partida, resultados).

const socket = io();
const $ = (id) => document.getElementById(id);

let room = null;        // último estado de la sala recibido del servidor
let screen = 'home';
let lastScores = '';
let goal = 15;

applyI18n();

// Recuperar el apodo de la última vez y el código si se entra con un enlace de invitación.
try { $('name').value = localStorage.getItem('coinrush-name') || ''; } catch (e) { /* sin almacenamiento */ }
const invited = new URLSearchParams(location.search).get('sala');
if (invited) $('code').value = invited.toUpperCase().slice(0, 4);
$('name').focus();

// ---------- Pantallas ----------

function show(name) {
  if (screen === name) return;
  screen = name;
  for (const s of ['home', 'lobby', 'game', 'results']) $(`screen-${s}`).hidden = s !== name;
  document.body.classList.toggle('playing', name === 'game');
  // Llevar el foco al título de la pantalla nueva ayuda a teclado y lectores de pantalla.
  const heading = $(`screen-${name}`).querySelector('h1');
  if (heading) heading.focus();
}

function announce(text) {
  $('live').textContent = text;
}

function showError(code, target = 'error') {
  $(target).textContent = code ? t(`error_${code}`) : '';
}

// Crea un <li> con el símbolo de color del jugador, su apodo y un texto extra.
function playerItem(p, extra) {
  const li = document.createElement('li');
  const symbol = document.createElement('span');
  symbol.className = 'symbol';
  symbol.textContent = Game.SYMBOLS[p.index % 8];
  symbol.style.color = Game.COLORS[p.index % 8];
  symbol.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = p.name;
  li.append(symbol, name);
  if (extra) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = extra;
    li.append(tag);
  }
  if (p.id === socket.id) li.classList.add('me');
  return li;
}

const hostName = () => (room.players.find((p) => p.id === room.hostId) || {}).name || '';
const isHost = () => room && room.hostId === socket.id;

function renderLobby() {
  $('lobby-code').textContent = room.code;
  $('share-url').value = `${location.origin}${location.pathname}?sala=${room.code}`;
  $('lobby-count').textContent = t('players_count', { n: room.players.length });
  $('lobby-players').replaceChildren(...room.players.map((p) => {
    const tags = [p.id === room.hostId && t('host'), p.id === socket.id && t('you')].filter(Boolean);
    return playerItem(p, tags.join(' · '));
  }));
  const enough = room.players.length >= 2;
  $('btn-start').hidden = !isHost();
  $('btn-start').disabled = !enough;
  $('lobby-status').textContent = !isHost()
    ? t('wait_host', { name: hostName() })
    : t(enough ? 'wait_ready' : 'wait_players');
}

function renderHud(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  $('hud').replaceChildren(...sorted.map((p) => playerItem(p, `${p.score} / ${goal}`)));
}

function renderResultsControls() {
  $('btn-again').hidden = !isHost();
  $('results-status').textContent = isHost() ? '' : t('wait_host_again', { name: hostName() });
}

// ---------- Acciones del usuario ----------

function enterRoom(event, payload) {
  showError(null);
  const name = $('name').value.trim();
  if (!name) return showError('invalid_name');
  try { localStorage.setItem('coinrush-name', name); } catch (e) { /* sin almacenamiento */ }
  socket.emit(event, { name, ...payload }, (res) => { if (!res.ok) showError(res.error); });
}

$('btn-create').addEventListener('click', () => enterRoom('create_room', {}));

$('form-home').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('code').value.trim().toUpperCase();
  if (!code) return showError('missing_code');
  enterRoom('join_room', { code });
});

$('btn-start').addEventListener('click', () => {
  socket.emit('start_game', (res) => showError(res.ok ? null : res.error, 'lobby-error'));
});

$('btn-copy').addEventListener('click', async () => {
  const field = $('share-url');
  try {
    await navigator.clipboard.writeText(field.value);
  } catch (e) {
    field.select();
    document.execCommand('copy');
  }
  announce(t('copied'));
  $('btn-copy').textContent = t('copied');
  setTimeout(() => { $('btn-copy').textContent = t('copy'); }, 2000);
});

function leave() {
  socket.emit('leave_room');
  room = null;
  Game.stop();
  show('home');
}
$('btn-leave').addEventListener('click', leave);
$('btn-leave2').addEventListener('click', leave);
$('btn-again').addEventListener('click', () => socket.emit('back_to_lobby'));

// ---------- Mensajes del servidor ----------

socket.on('room_update', (data) => {
  const before = room && room.code === data.code ? room.players : [];
  room = data;

  // Anunciar quién entra y quién sale.
  if (before.length) {
    const was = new Set(before.map((p) => p.id));
    const now = new Set(data.players.map((p) => p.id));
    data.players.filter((p) => !was.has(p.id)).forEach((p) => announce(t('announce_joined', { name: p.name })));
    before.filter((p) => !now.has(p.id)).forEach((p) => announce(t('announce_left', { name: p.name })));
  }

  if (data.status === 'lobby') {
    showError(null, 'lobby-error');
    renderLobby();
    show('lobby');
  } else if (data.status === 'finished') {
    renderResultsControls();
  }
});

socket.on('game_start', (data) => {
  lastScores = '';
  goal = data.goal;
  show('game');
  Game.start(data, socket.id, (input) => socket.emit('input', input));
  renderHud(data.players);
  announce(t('announce_start'));
});

socket.on('state', (players) => {
  Game.onState(players);
  // El marcador solo se vuelve a pintar cuando cambia alguna puntuación.
  const scores = players.map((p) => `${p.id}:${p.score}`).join();
  if (scores !== lastScores) {
    const me = players.find((p) => p.id === socket.id);
    if (lastScores && me && me.score > 0 && !lastScores.includes(`${me.id}:${me.score}`)) {
      announce(t('announce_score', { n: me.score }));
    }
    lastScores = scores;
    renderHud(players);
  }
});

socket.on('coin_collected', (coin) => Game.onCoin(coin.id));

socket.on('game_over', (result) => {
  Game.stop();
  const title = result.winnerId === socket.id ? t('win_you') : t('win_other', { name: result.winner });
  $('results-title').textContent = title;
  const byName = new Map((room ? room.players : []).map((p) => [p.name, p]));
  $('ranking').replaceChildren(...result.players.map((p) => {
    const info = byName.get(p.name) || { index: 0, name: p.name };
    return playerItem({ ...info, name: p.name }, t('coins', { n: p.score }));
  }));
  $('api-link').href = `api/games/${result.id}`;
  if (room) renderResultsControls();
  show('results');
  announce(title);
});

socket.on('disconnect', () => {
  room = null;
  Game.stop();
  show('home');
  showError('connection_lost');
});
