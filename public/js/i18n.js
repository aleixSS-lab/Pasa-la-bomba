'use strict';
// Todos los textos visibles del juego. Para añadir un idioma, copia el bloque "es" y tradúcelo.

const I18N = {
  es: {
    title: 'Pasa la bomba',
    tagline: 'Que no te explote encima: sé el último en pie.',
    name_label: 'Tu apodo',
    create_room: 'Crear sala',
    or_join: 'o únete a una sala',
    code_label: 'Código de sala',
    join_room: 'Unirse',
    how_title: 'Cómo se juega',
    how_1: 'Un jugador al azar recibe una bomba con cuenta atrás.',
    how_2: 'Si la tienes, toca a otro jugador para pasársela. Si te explota, quedas eliminado.',
    how_3: 'Cuidado con lo que pisas:',
    gadget_desc_trap: 'Trampa de oso: te deja clavado un momento.',
    gadget_desc_gum: 'Chicle: te pegas al suelo y vas más lento.',
    gadget_desc_boost: 'Acelerador: sales disparado durante unos segundos.',
    how_4: 'Muévete con W, A, S, D o con las flechas, y pulsa Espacio para esprintar (luego tiene que recargarse). Gana el último que quede.',

    lobby_title: 'Sala de espera',
    room_code: 'Código de sala:',
    share_label: 'Enlace para invitar',
    copy: 'Copiar',
    copied: 'Enlace copiado',
    share_lan: 'Este enlace sirve para quien esté conectado a tu misma WiFi.',
    share_local_only: 'Este enlace solo funciona en este ordenador: no se ha encontrado ninguna red. Usa start.bat para jugar por internet.',
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
    scoreboard: 'Jugadores',
    controls_hint: 'Muévete con W A S D o con las flechas · Espacio: esprint',
    sprint_label: 'Esprint',
    sprint_ready: 'listo · Espacio',
    sprint_active: '¡ahora!',
    sprint_wait: 'recargando · {n} s',
    announce_sprint_ready: 'Esprint listo.',
    gadget_trap: 'Trampa de oso',
    gadget_gum: 'Chicle',
    gadget_boost: 'Acelerador',
    spectator_hint: 'Estás eliminado. Mueve la cámara con W A S D o con las flechas',
    tag_bomb: 'bomba',
    tag_out: 'eliminado',

    bomb_wait: 'Nueva bomba en {n}…',
    bomb_you: '¡Tienes la bomba! {n} s',
    bomb_other: '{name} tiene la bomba · {n} s',

    win_you: '¡Has ganado!',
    win_other: '¡{name} gana la partida!',
    ranking: 'Clasificación',
    tag_winner: 'superviviente',
    api_link: 'Ver el resultado en la API (JSON)',
    play_again: 'Volver a la sala',
    wait_host_again: 'Esperando a que {name} vuelva a la sala.',

    announce_joined: '{name} ha entrado en la sala.',
    announce_left: '{name} ha salido.',
    announce_start: 'Empieza la partida. Prepárate.',
    announce_bomb_you: '¡Tienes la bomba! Toca a otro jugador.',
    announce_bomb_other: '{name} tiene la bomba.',
    announce_passed: 'Le has pasado la bomba a {name}.',
    announce_5s: '¡Quedan 5 segundos!',
    announce_out_you: 'La bomba te ha explotado. Estás eliminado.',
    announce_out_other: 'La bomba ha explotado. {name} queda eliminado.',
    announce_trap: '¡Trampa de oso! No puedes moverte.',
    announce_gum: 'Chicle: vas más lento.',
    announce_boost: 'Acelerador: vas más rápido.',

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
