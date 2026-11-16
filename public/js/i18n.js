'use strict';
// Todos los textos visibles del juego. Para añadir un idioma, copia el bloque "es" y tradúcelo.

const I18N = {
  es: {
    title: 'Coin Rush',
    tagline: 'Recoge 15 monedas antes que nadie.',
    name_label: 'Tu apodo',
    create_room: 'Crear sala',
    or_join: 'o únete a una sala',
    code_label: 'Código de sala',
    join_room: 'Unirse',
    how_title: 'Cómo se juega',
    how_1: 'Crea una sala y comparte el enlace o el código con tus amigos.',
    how_2: 'Muévete con las teclas W, A, S, D o con las flechas.',
    how_3: 'Hay 50 monedas en el mapa. Gana el primero que consiga 15.',

    lobby_title: 'Sala de espera',
    room_code: 'Código de sala:',
    share_label: 'Enlace para invitar',
    copy: 'Copiar',
    copied: 'Enlace copiado',
    players_count: 'Jugadores ({n} de 8)',
    host: 'máster',
    you: 'tú',
    start_game: 'Empezar partida',
    leave: 'Salir',
    wait_players: 'Hacen falta al menos 2 jugadores para empezar.',
    wait_ready: 'Todo listo. Puedes empezar cuando quieras.',
    wait_host: 'Esperando a que {name} empiece la partida.',

    game_title: 'Partida en curso',
    canvas_label: 'Mapa del juego',
    scoreboard: 'Marcador',
    controls_hint: 'Muévete con W A S D o con las flechas',

    win_you: '¡Has ganado!',
    win_other: '¡{name} gana la partida!',
    ranking: 'Clasificación',
    coins: '{n} monedas',
    api_link: 'Ver el resultado en la API (JSON)',
    play_again: 'Volver a la sala',
    wait_host_again: 'Esperando a que {name} vuelva a la sala.',

    announce_joined: '{name} ha entrado en la sala.',
    announce_left: '{name} ha salido.',
    announce_start: 'Empieza la partida. Recoge 15 monedas.',
    announce_score: 'Tienes {n} monedas.',

    error_invalid_name: 'Escribe un apodo de 1 a 12 caracteres.',
    error_missing_code: 'Escribe el código de 4 letras de la sala.',
    error_room_not_found: 'No existe ninguna sala con ese código.',
    error_game_in_progress: 'Esa sala ya está jugando. Espera a que termine.',
    error_room_full: 'La sala está llena (máximo 8 jugadores).',
    error_name_taken: 'Ese apodo ya está en uso en la sala. Elige otro.',
    error_not_host: 'Solo el máster puede empezar la partida.',
    error_need_players: 'Hacen falta al menos 2 jugadores.',
    error_connection_lost: 'Se ha perdido la conexión con el servidor.',
  },
};

let currentLang = 'es';

// Devuelve el texto de una clave, sustituyendo {variables}.
function t(key, vars = {}) {
  const text = (I18N[currentLang] && I18N[currentLang][key]) || key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''));
}

// Rellena los elementos marcados con data-i18n (texto) y data-i18n-label (aria-label).
function applyI18n() {
  document.documentElement.lang = currentLang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
}
