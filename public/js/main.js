'use strict';
// Conexión con el servidor y control de las pantallas (inicio, sala de espera, partida, resultados).

const socket = io();
const $ = (id) => document.getElementById(id);

let room = null;        // último estado de la sala recibido del servidor
let screen = 'home';
let hudKey = '';        // para no repintar el marcador si no ha cambiado nada
let bannerText = '';
let warned = false;     // aviso de «quedan 5 segundos» ya dado en esta bomba
let toastTimer = null;

applyI18n();

// Recuperar el apodo de la última vez y el código si se entra con un enlace de invitación.
try { $('name').value = localStorage.getItem('bomba-name') || ''; } catch (e) { /* sin almacenamiento */ }
const invited = new URLSearchParams(location.search).get('sala');
if (invited) $('code').value = invited.toUpperCase().slice(0, 4);
$('name').focus();

// Si el máster ha abierto el juego con localhost, el enlace de invitación tiene que llevar
// la dirección del portátil en la red local; si no, en el PC del invitado apuntaría a sí mismo.
let shareOrigin = location.origin;
let shareNote = '';
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
  shareNote = t('share_local_only');
  fetch('api/lan')
    .then((r) => r.json())
    .then((info) => {
      if (!info.addresses.length) return;
      shareOrigin = `${location.protocol}//${info.addresses[0]}:${location.port || info.port}`;
      shareNote = t('share_lan');
      if (room && room.status === 'lobby') renderLobby();
    })
    .catch(() => { /* se queda el enlace con localhost */ });
}

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

// Mensaje para lectores de pantalla.
function announce(text) {
  $('live').textContent = text;
}

// Mensaje para lectores de pantalla y, además, visible un par de segundos durante la partida.
function notify(text) {
  announce(text);
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2500);
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

const playerById = (id) => (room ? room.players.find((p) => p.id === id) : null) || { name: '', index: 0 };
const hostName = () => playerById(room.hostId).name;
const isHost = () => room && room.hostId === socket.id;

function renderLobby() {
  $('lobby-code').textContent = room.code;
  $('share-url').value = `${shareOrigin}${location.pathname}?sala=${room.code}`;
  $('share-note').textContent = shareNote;
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

// Marcador de la partida: quién tiene la bomba y quién está eliminado.
function renderHud(state) {
  const key = `${state.bomb.holder}|${state.players.map((p) => `${p.id}${p.alive ? 1 : 0}`).join()}`;
  if (key === hudKey) return;
  hudKey = key;
  $('hud').replaceChildren(...state.players.map((s) => {
    const hasBomb = s.id === state.bomb.holder;
    const li = playerItem({ ...playerById(s.id), id: s.id }, hasBomb ? t('tag_bomb') : (s.alive ? '' : t('tag_out')));
    li.classList.toggle('bomb', hasBomb);
    li.classList.toggle('out', !s.alive);
    return li;
  }));
  $('hint').textContent = t(Game.isSpectator() ? 'spectator_hint' : 'controls_hint');
}

// Cartel superior con la cuenta atrás de la bomba.
function renderBanner(bomb) {
  const mine = bomb.holder === socket.id;
  let text;
  if (!bomb.holder) text = t('bomb_wait', { n: Math.ceil(bomb.pause) });
  else if (mine) text = t('bomb_you', { n: Math.ceil(bomb.left) });
  else text = t('bomb_other', { name: playerById(bomb.holder).name, n: Math.ceil(bomb.left) });
  if (text === bannerText) return;
  bannerText = text;
  $('banner').textContent = text;
  $('banner').classList.toggle('danger', mine);

  if (mine && !warned && bomb.left <= 5) {
    warned = true;
    announce(t('announce_5s'));
  }
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
  try { localStorage.setItem('bomba-name', name); } catch (e) { /* sin almacenamiento */ }
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
  hudKey = '';
  bannerText = '';
  $('toast').hidden = true;
  show('game');
  Game.start(data, socket.id, (input) => socket.emit('input', input));
  renderHud({ players: data.players, bomb: { holder: null } });
  announce(t('announce_start'));
});

socket.on('state', (state) => {
  Game.onState(state);
  renderHud(state);
  renderBanner(state.bomb);
});

socket.on('game_event', (event) => {
  Game.onEvent(event);
  const me = socket.id;
  if (event.type === 'bomb' || event.type === 'pass') {
    const to = event.type === 'bomb' ? event.holder : event.to;
    if (event.type === 'bomb') warned = false;
    if (to === me) notify(t('announce_bomb_you'));
    else if (event.from === me) notify(t('announce_passed', { name: playerById(to).name }));
    else announce(t('announce_bomb_other', { name: playerById(to).name }));
  } else if (event.type === 'explosion') {
    notify(event.id === me ? t('announce_out_you') : t('announce_out_other', { name: playerById(event.id).name }));
  } else if (event.type === 'gadget' && event.by === me) {
    notify(t(`announce_${event.kind}`));
  }
});

socket.on('game_over', (result) => {
  Game.stop();
  const title = result.winnerId === socket.id ? t('win_you') : t('win_other', { name: result.winner });
  $('results-title').textContent = title;
  const byName = new Map((room ? room.players : []).map((p) => [p.name, p]));
  $('ranking').replaceChildren(...result.players.map((p) => {
    const info = byName.get(p.name) || { index: 0 };
    return playerItem({ ...info, name: p.name }, t(p.eliminated ? 'tag_out' : 'tag_winner'));
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
