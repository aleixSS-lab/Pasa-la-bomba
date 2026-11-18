# CLAUDE.md — Normas del proyecto DevChallenge3

Este archivo lo debe leer cualquier agente de IA antes de tocar el proyecto. Las normas son obligatorias. Si una petición del usuario choca con ellas, avisa y pregunta antes de seguir.

## 1. Qué es el proyecto

**Pasa la bomba**: juego web multijugador hyper-casual para una actividad de instituto (DevChallenge3). De 2 a 8 jugadores comparten un mapa 2D generado aleatoriamente. Repositorio: `https://github.com/aleixSS-lab/pasa-la-bomba` (público).

Reglas del juego:

- Tras una cuenta atrás, un jugador al azar recibe una bomba que explota a los 30 segundos.
- Quien la lleva corre un poco más y se la pasa a otro jugador al tocarlo. El tiempo de la bomba no se reinicia al pasarla.
- Quien la acaba de pasar es inmune 1 segundo, y quien la recibe se queda parado medio segundo, para que no se la devuelvan sin parar.
- Cuando explota, el portador queda eliminado y pasa a ser espectador. Tras una pausa, la bomba siguiente va a otro jugador vivo al azar.
- Gana el último jugador vivo.
- Por el suelo hay gadgets que afectan a quien los pisa: **trampa de oso** (inmóvil 1,5 s), **chicle** (mitad de velocidad 3 s) y **acelerador** (velocidad ×1,5 durante 3 s). Al usarse reaparecen en otro sitio.

La primera versión del juego era de recoger monedas (Coin Rush); se cambió por decisión del alumno. No queda nada de las monedas en el código.

Alcance, que manda sobre todo lo demás:

- Es un **miniproyecto de clase**. No se va a publicar ni a mantener. Ante la duda, elige siempre la solución más simple que cumpla el enunciado.
- **Coste cero.** Nada de servicios de pago, cuentas con tarjeta ni hosting. Solo software libre y el portátil del alumno.
- No añadas funciones que el enunciado no pide (cuentas de usuario, base de datos, chat, niveles, sonido...) salvo que el usuario lo pida.

La actividad evalúa dos cosas con el mismo peso:

1. Que el juego funcione y cuide la estética, la usabilidad y la accesibilidad.
2. La documentación de cómo se ha construido con agentes de IA. Por eso el `DIARIO.md` (sección 7) es tan importante como el código.

Requisitos del enunciado que no se pueden perder:

- Más de un jugador, cada uno desde su propia máquina.
- Sala de espera, con un máster que inicia la partida.
- Tablero aleatorio en el que los jugadores aparecen en puntos distintos.
- Comunicación asíncrona (WebSockets).
- Un endpoint que gestione la partida y devuelva quién ha ganado.

## 2. Entorno de ejecución

- Todo corre en un único portátil con Windows (x64, Ryzen 7 7435HS), que hace de servidor.
- Un solo proceso Node.js (versión 18 o superior) sirve la web, gestiona las salas por WebSocket y expone la API REST. Puerto 3000.
- Los jugadores se conectan por internet a través de un túnel rápido y gratuito de Cloudflare (`cloudflared`, sin cuenta), desde el navegador de otros PC. No instalan nada.
- La URL del túnel cambia en cada arranque: nunca escribas una URL fija en el código. El cliente usa siempre rutas relativas y `window.location`.
- El mismo servidor tiene que seguir funcionando por red local (`http://IP-del-portátil:3000`) sin cambiar código. Es el plan B.
- No hay base de datos. El estado de las partidas vive en memoria.

## 3. Stack cerrado

| Parte | Tecnología permitida |
|---|---|
| Servidor | Node.js, Express, Socket.IO |
| Cliente | HTML, CSS, Canvas 2D y JavaScript sin framework ni paso de compilación |
| Pruebas | `socket.io-client` como dependencia de desarrollo, para simular jugadores |
| Túnel | `cloudflared` |

Está prohibido añadir cualquier otra librería, framework, bundler o servicio externo sin permiso explícito del usuario. Si crees que hace falta una, explica por qué, espera el visto bueno y anótalo en el diario.

## 4. Idioma

- Todo en castellano: textos del juego, comentarios, `DIARIO.md`, mensajes de commit y respuestas al usuario.
- Nombres de variables, funciones, archivos y eventos en inglés (`createRoom`, `coin_collected`).
- Ningún texto visible se escribe directamente en el HTML o en el JS: todos van en `public/js/i18n.js` y se leen con `t('clave')` o con el atributo `data-i18n`. Así el selector de idiomas (opcional, sección 8) no obliga a rehacer nada. De momento solo existe `es`.
- El servidor no envía frases, solo códigos de error (`room_not_found`); el cliente los traduce con la clave `error_<código>`.

## 5. Arquitectura

```
DevChallenge3/
├── CLAUDE.md
├── DIARIO.md
├── package.json
├── start.bat              arranca servidor + túnel y muestra la URL
├── probar.bat             instala dependencias, ejecuta la prueba y guarda prueba.log
├── server/
│   ├── index.js           Express, Socket.IO, salas, sala de espera y API REST
│   ├── config.js          valores ajustables del juego (tiempos, velocidades, gadgets)
│   └── game.js            mapa aleatorio, movimiento, bomba, gadgets y victoria (sin red)
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── i18n.js        todos los textos
│       ├── game.js        dibujo en canvas y teclado
│       └── main.js        conexión con el servidor y pantallas
└── test/
    └── smoke.js           comprueba las reglas y simula una partida completa con 3 jugadores
```

No cambies esta estructura sin preguntar.

Reglas de diseño:

- **Servidor autoritativo.** El cliente solo envía sus teclas pulsadas. El servidor mueve a los jugadores, detecta colisiones, decide quién tiene la bomba, quién pisa cada gadget y quién gana.
- **Valores en `server/config.js`.** Todos los números de juego (tiempos, multiplicadores, cantidad de gadgets) están ahí y solo ahí, para ajustarlos probando. No los escribas a mano en otro archivo ni en los textos. Si cambias uno, ejecuta `npm test`.
- **20 actualizaciones por segundo.** El servidor emite las posiciones cada 50 ms y el cliente las suaviza al dibujar. No hace falta nada más sofisticado.
- **Sin login.** El jugador escribe un apodo (único dentro de la sala) y crea una sala o se une con un código de 4 letras. Quien crea la sala es el máster y es el único que puede iniciar la partida. Si el máster se va, lo es el siguiente jugador.
- **Mapa.** Cuadrícula de 40×30 casillas con muros aleatorios. Gadgets y apariciones solo se colocan en casillas alcanzables.
- **Endpoint de resultado.** `GET /api/games/:id` (el id es el código de sala) devuelve en JSON el estado, los jugadores por puesto, el orden de eliminación y el ganador. El final de partida también se notifica por WebSocket.
- **Valida lo que llega del cliente**: tipo y longitud de apodos y códigos, y que el jugador pertenezca a la sala.

Eventos de Socket.IO (no cambies nombres ni datos sin preguntar):

| Dirección | Evento | Para qué |
|---|---|---|
| cliente → servidor | `create_room`, `join_room`, `leave_room` | entrar y salir de salas |
| cliente → servidor | `start_game`, `back_to_lobby` | solo el máster |
| cliente → servidor | `input` | teclas pulsadas |
| servidor → cliente | `room_update` | estado de la sala de espera |
| servidor → cliente | `game_start`, `state`, `game_over` | partida: mapa inicial, posiciones y bomba 20 veces por segundo, resultado |
| servidor → cliente | `game_event` | sucesos sueltos; su campo `type` es `bomb` (bomba nueva), `pass`, `explosion` o `gadget` |

## 6. Normas de trabajo

### 6.1 Preguntar antes de cambios grandes

Antes de hacer cualquiera de estas cosas, explica el plan al usuario y espera su aprobación:

- Reescribir un archivo entero o mover/renombrar archivos.
- Cambiar la arquitectura, el protocolo de eventos o las reglas del juego.
- Añadir una dependencia.
- Borrar código o funcionalidades que ya funcionaban.

Los cambios pequeños y acotados a lo que se ha pedido no necesitan permiso. No hagas refactorizaciones ni "mejoras" que nadie ha pedido.

### 6.2 Probar antes de entregar

Ningún cambio se da por terminado sin haberlo probado:

1. Ejecuta `npm test` (comprueba las reglas del juego y simula una partida completa por red).
2. Si el cambio afecta a la interfaz, arranca `npm start`, ábrela en dos pestañas y comprueba el flujo completo: crear sala, unirse, iniciar, jugar y ver el resultado.

Si algo no se ha podido probar, dilo claramente al usuario. No afirmes que funciona sin haberlo verificado.

### 6.3 Git

- El proyecto es un repositorio git local. `node_modules/` va en `.gitignore`.
- Un commit al cerrar cada fase o cambio importante, solo después de probar.
- Mensajes en castellano, cortos y descriptivos.
- No reescribas el historial. No subas el repositorio a ningún sitio sin que el usuario lo pida.

### 6.4 Accesibilidad obligatoria

Todo cambio de interfaz debe cumplir estos cinco puntos:

- **No depender solo del color.** Cada jugador se distingue por color y además por forma, y su apodo es visible. Los gadgets y la bomba se dibujan como lo que son (trampa de oso con dientes y muelles, chicle rosa, acelerador con rayo, bomba con mecha) con las funciones de iconos de `public/js/game.js`, y siempre van acompañados de su nombre en la leyenda; el portador de la bomba lleva además un anillo y el texto «bomba» en el marcador.
- **Contraste** mínimo de 4,5:1 en textos y 3:1 en elementos gráficos importantes.
- **Teclado.** Menús y sala de espera se usan enteros con Tab y Enter, con el foco siempre visible. El juego se controla con WASD y con las flechas.
- **HTML semántico**: botones que son `<button>`, campos con `<label>`, encabezados ordenados.
- **Lector de pantalla.** Los eventos importantes (un jugador entra, empieza la partida, quién tiene la bomba, quién queda eliminado, alguien gana) se anuncian en la región `aria-live`.

## 7. DIARIO.md

El diario es el material de la presentación final. Al terminar cada sesión de trabajo, y antes de dar la tarea por acabada, añade una entrada al final de `DIARIO.md` con este formato:

```
## Sesión N — AAAA-MM-DD — Título corto

**Herramienta:** agente y modelo usados.
**Qué se pidió:** el prompt o la idea del usuario, resumido en una o dos frases (cita literal si es corto).
**Qué se hizo:** lista breve de lo construido o cambiado.
**Decisiones y por qué:** tecnologías o enfoques elegidos y la alternativa descartada.
**Qué falló y cómo se arregló:** errores, resultados que no funcionaron a la primera y qué reformulación de prompt o de código lo solucionó.
**Pendiente de investigar por el alumno:** conceptos o tecnologías que el usuario debería entender para poder explicarlos.
**Siguiente paso:** qué toca en la próxima sesión.
```

Reglas del diario:

- Sé honesto: los fallos y las correcciones son justo lo que el profesorado quiere ver. No los ocultes ni los suavices.
- Escribe de forma esquemática, sin pegar respuestas largas de la IA ni bloques de código.
- No borres ni reescribas entradas anteriores; solo añade.

## 8. Fases del proyecto

1. Esqueleto, crear sala y unirse, sala de espera e inicio por el máster. *(hecha)*
2. Mapa aleatorio, movimiento, bomba, gadgets y victoria. *(hecha)*
3. Pantalla de resultados, endpoint `GET /api/games/:id`, estética y accesibilidad. *(hecha)*
4. Túnel, `start.bat` y prueba real con varios PC. Ajuste de los valores de `config.js` jugando.

Opcional, solo si sobra tiempo y el usuario lo pide: selector de idiomas.

Consulta el `DIARIO.md` para saber en qué fase está el proyecto.

## 9. Comandos

```
npm install     instala dependencias
npm start       arranca el servidor en http://localhost:3000
npm test        comprueba las reglas y simula una partida completa (tarda unos 10 segundos)
start.bat       arranca servidor y túnel, y muestra la URL para compartir
probar.bat      npm install + npm test con doble clic; deja el resultado en prueba.log
```
