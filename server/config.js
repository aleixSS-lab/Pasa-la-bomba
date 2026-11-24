'use strict';
// Valores del juego. Cambia aquí los números para ajustar la partida y vuelve a arrancar el servidor.

module.exports = {
  BOMB_SECONDS: 30,       // segundos que tarda la bomba en explotar
  BOMB_TYPES: ['standard', 'frozen', 'explosive', 'mystery'],
  FROZEN_RADIUS: 210,     // radio de jugadores ralentizados por la bomba congelada
  FROZEN_SECONDS: 3,      // duración de la ralentización de la bomba congelada
  EXPLOSIVE_RADIUS: 150,  // radio de eliminación de la bomba explosiva
  COIN_RUSH_SECONDS: 90,  // duración del modo Coin Rush
  COINS_ON_MAP: 44,       // monedas visibles al mismo tiempo
  COIN_RESPAWN_SECONDS: 2.5, // segundos para que reaparezca una moneda recogida
  START_COUNTDOWN: 3,     // segundos de espera al empezar, antes de repartir la primera bomba
  EXPLOSION_PAUSE: 3,     // segundos entre una explosión y la bomba siguiente
  BOMB_SPEED: 1.15,       // quien lleva la bomba corre un poco más (x1,15) para poder alcanzar a los demás
  PASS_IMMUNITY: 1,       // segundos en los que quien acaba de pasar la bomba no puede recibirla
  RECEIVE_STUN: 0.5,      // segundos que se queda parado quien recibe la bomba (da ventaja al que huye)

  TRAP_SECONDS: 1.5,      // trampa de oso: segundos sin poder moverse
  GUM_FACTOR: 0.5,        // chicle: velocidad multiplicada por este valor
  GUM_SECONDS: 3,         // chicle: duración
  BOOST_FACTOR: 1.5,      // acelerador: velocidad multiplicada por este valor
  BOOST_SECONDS: 3,       // acelerador: duración
  GADGETS_PER_TYPE: 8,    // cuántos gadgets de cada tipo hay en el mapa
  POND_TELEPORT_COOLDOWN: 1.5, // estanques: pausa antes de poder teletransportarse otra vez

  SPRINT_FACTOR: 1.6,     // esprint (tecla Espacio): velocidad multiplicada por este valor
  SPRINT_SECONDS: 1.5,    // esprint: cuánto dura
  SPRINT_COOLDOWN: 6,     // esprint: segundos de recarga desde que termina hasta que se puede repetir
};
