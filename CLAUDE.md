# CLAUDE.md — Normas del proyecto DevChallenge3

Este archivo lo debe leer cualquier agente de IA antes de tocar el proyecto (Claude, Codex, ChatGPT u otro; `AGENTS.md` remite aquí). Las normas son obligatorias. Si una petición del usuario choca con ellas, avisa y pregunta antes de seguir.

**Equipo.** El proyecto es de dos coautores: **Aleix**, que trabaja con Claude, y **Adriana**, que trabaja con Codex/ChatGPT. Los dos pueden pedir cambios. Al empezar, si no sabes con quién hablas, pregúntalo: hace falta para el campo «Autor» del diario.

**Fecha de entrega:** hacia el 2 de diciembre de 2026 (unas dos semanas desde el 18-11). Lo que no sea necesario para entregar va detrás.

## 0. Antes de empezar cualquier sesión

1. Lee este archivo entero y el **resumen** y la **última entrada** de `DIARIO.md`, que dicen en qué punto está el proyecto y qué quedó pendiente.
2. Ejecuta `git pull`, `git status` y `git log --oneline -5`. El otro coautor puede haber subido cambios. Si hay cambios sin commit de una sesión anterior, avisa al usuario antes de tocar nada.
3. Ejecuta `npm test` para partir de un estado que funciona. Si falla, díselo al usuario antes de empezar lo que te pida.
4. Lee la sección 10 (limitaciones del entorno de la IA) para no prometer cosas que no puedes hacer.

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
- Nombres de variables, funciones, archivos y eventos en inglés (`createRoom`, `game_event`, `BOMB_SECONDS`).
- Ningún texto visible se escribe directamente en el HTML o en el JS: todos van en `public/js/i18n.js` y se leen con `t('clave')` o con el atributo `data-i18n`. Así el selector de idiomas (opcional, sección 8) no obliga a rehacer nada. De momento solo existe `es`.
- El servidor no envía frases, solo códigos de error (`room_not_found`); el cliente los traduce con la clave `error_<código>`.

## 5. Arquitectura

```
DevChallenge3/
├── README.md              presentación del juego y cómo arrancarlo (para quien llega al repositorio)
├── CLAUDE.md              normas para los agentes de IA (este archivo)
├── AGENTS.md              entrada para Codex y otros agentes; remite a CLAUDE.md
├── DIARIO.md              diario de desarrollo con IA (material de la presentación)
├── package.json
├── start.bat              arranca servidor + túnel y muestra la URL
├── probar.bat             instala dependencias, ejecuta la prueba y guarda prueba.log (ignorado por git)
├── subir.bat              git push a GitHub con doble clic (local, ignorado por git)
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
- **Valores en `server/config.js`.** Todos los números de *equilibrio* del juego (tiempos, multiplicadores, cantidad de gadgets) están ahí y solo ahí, para ajustarlos probando. No los escribas a mano en otro archivo ni en los textos: si un texto necesita un número, el servidor lo envía (por ejemplo `bombSeconds`). Si cambias uno, ejecuta `npm test`. Las constantes *estructurales* (tamaño del mapa y de las casillas, velocidad base y frecuencia del servidor en `server/game.js`; mínimo 2 y máximo 8 jugadores en `server/index.js`) se quedan donde están.
- **20 actualizaciones por segundo.** El servidor emite las posiciones cada 50 ms y el cliente las suaviza al dibujar. No hace falta nada más sofisticado.
- **Sin login.** El jugador escribe un apodo (único dentro de la sala) y crea una sala o se une con un código de 4 letras. Quien crea la sala es el máster y es el único que puede iniciar la partida. Si el máster se va, lo es el siguiente jugador.
- **Mapa.** Cuadrícula de 40×30 casillas con muros aleatorios. Gadgets y apariciones solo se colocan en casillas alcanzables.
- **Endpoints REST** (solo lectura, en `server/index.js`):
  - `GET /api/games/:id` (el id es el código de sala) devuelve en JSON `id`, `status` (`lobby`, `playing` o `finished`), `bombSeconds`, `players` (por puesto), `eliminationOrder` y `winner`. Si no existe, 404 con `{ "error": "game_not_found" }`. El resultado se guarda aunque la sala se vacíe. El final de partida también se notifica por WebSocket (`game_over`).
  - `GET /api/lan` devuelve `{ addresses, port }` con las IP del portátil en la red local, sin adaptadores virtuales (VirtualBox, WSL, Hyper-V). Lo usa el cliente para que el enlace de invitación no diga `localhost`. **Ojo:** a 18-11-2026 el cliente ya lo llama pero la parte del servidor no existe (ver `DIARIO.md`, sesión 5).
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

**Fallos fuera de la petición.** Si encuentras un fallo que no tiene que ver con lo que te han pedido, no lo arregles por tu cuenta: avisa al usuario, explica en una o dos frases qué pasa y pregunta si quiere que lo arregles. Anótalo en el diario de la sesión, se arregle o no.

### 6.1 bis Cómo responder al usuario

- Breve: qué has hecho y el resultado, sin repasar paso a paso.
- Al final, si aparece algo que el alumno tendrá que saber explicar en la exposición, nómbralo en una línea («para investigar: …») y añádelo al diario.
- Las explicaciones largas van al diario, no a la respuesta.

### 6.2 Probar antes de entregar

Ningún cambio se da por terminado sin haberlo probado:

1. Ejecuta `npm test` (comprueba las reglas del juego y simula una partida completa por red).
2. Si el cambio afecta a la interfaz, arranca `npm start`, ábrela en dos pestañas y comprueba el flujo completo: crear sala, unirse, iniciar, jugar y ver el resultado. Revisa capturas de pantalla ampliadas: así se detectó que la primera trampa de oso no se reconocía.
3. Si el cambio afecta a la red (enlaces, IP, túnel), la prueba buena es desde **otro PC**. Desde el mismo ordenador `localhost` siempre funciona y esconde los fallos (sesión 3). Si no puedes hacerlo tú, pídeselo al alumno con pasos concretos.
4. **Comprueba que los cambios están en el disco del alumno** antes de hacer commit: `git status` debe listar todos los archivos que has tocado, y un `grep` de lo nuevo debe encontrarlo. En la sesión 3 el arreglo del servidor no llegó a guardarse y nadie se dio cuenta hasta la sesión 5.

Si algo no se ha podido probar, dilo claramente al usuario y anótalo en el diario. No afirmes que funciona sin haberlo verificado.

### 6.3 Git

- Repositorio público en GitHub: `aleixSS-lab/pasa-la-bomba`, rama `main`. `node_modules/`, los `.log` y `subir.bat` van en `.gitignore`.
- Un commit al cerrar cada sesión o cambio importante, solo después de probar. El commit incluye la entrada del diario de esa sesión.
- Mensajes en castellano: una primera línea corta que diga qué cambia y, si hace falta, un párrafo con el porqué.
- Autor de los commits: la dirección anónima de GitHub del alumno (`…@users.noreply.github.com`). Nunca su correo personal: el repositorio es público.
- No reescribas el historial.
- **Al cerrar cada sesión, haz commit y push** a `origin main`, después de probar y con la entrada del diario incluida. No hace falta pedir permiso para esto.
- Antes del commit, `git pull` para traer lo que haya subido el otro coautor. Si hay conflicto, no lo resuelvas a ciegas: para y explica al usuario qué choca.
- Si el push falla (sin credenciales, sin red), dilo y pide al alumno que ejecute `subir.bat`. No des la sesión por subida sin haberlo comprobado con `git status -sb`.

### 6.4 Accesibilidad obligatoria

Todo cambio de interfaz debe cumplir estos cinco puntos:

- **No depender solo del color.** Cada jugador se distingue por color y además por forma, y su apodo es visible. Los gadgets y la bomba se dibujan como lo que son (trampa de oso con dientes y muelles, chicle rosa, acelerador con rayo, bomba con mecha) con las funciones de iconos de `public/js/game.js`, y siempre van acompañados de su nombre en la leyenda; el portador de la bomba lleva además un anillo y el texto «bomba» en el marcador.
- **Contraste** mínimo de 4,5:1 en textos y 3:1 en elementos gráficos importantes.
- **Teclado.** Menús y sala de espera se usan enteros con Tab y Enter, con el foco siempre visible. El juego se controla con WASD y con las flechas.
- **HTML semántico**: botones que son `<button>`, campos con `<label>`, encabezados ordenados.
- **Lector de pantalla.** Los eventos importantes (un jugador entra, empieza la partida, quién tiene la bomba, quién queda eliminado, alguien gana) se anuncian en la región `aria-live`.

## 7. DIARIO.md

El diario es el material de la presentación final. Tiene dos partes:

1. **Resumen para la presentación** (arriba). Responde a las cinco preguntas del profesorado: qué herramientas de IA, qué idea y cómo se pidió, prompts clave y a dónde llevaron, qué tuvo que investigar el alumno, qué no funcionó a la primera. Más una tabla con una línea por sesión y el estado actual. **Es la única parte que se puede editar**: actualízala al final de cada sesión.
2. **Sesiones** (debajo). Una entrada por sesión, que no se toca una vez escrita.

Al terminar cada sesión de trabajo, y antes de dar la tarea por acabada, añade una entrada al final con este formato:

```
## Sesión N — AAAA-MM-DD — Título corto

**Autor:** Aleix o Adriana.
**Herramienta:** agente y modelo usados.
**Qué se pidió:** los prompts del usuario, citados literalmente si son cortos («…»), en orden.
**Qué se hizo:** lista breve de lo construido o cambiado.
**Decisiones y por qué:** quién decidió (alumno o IA), qué se eligió y qué alternativa se descartó.
**Qué falló y cómo se arregló:** errores, resultados que no funcionaron a la primera y qué reformulación de prompt o de código lo solucionó.
**Pendiente de investigar por el alumno:** conceptos o tecnologías que el usuario debería entender para poder explicarlos.
**Siguiente paso:** qué toca en la próxima sesión.
```

Reglas del diario:

- Sé honesto: los fallos y las correcciones son justo lo que el profesorado quiere ver. No los ocultes ni los suavices.
- Distingue siempre qué propuso la IA y qué decidió el alumno. Si la IA hizo algo sin consultarlo, dilo.
- Escribe de forma esquemática, sin pegar respuestas largas de la IA ni bloques de código.
- No borres ni reescribas entradas anteriores. Si una entrada antigua resulta ser incorrecta, la corrección va en la entrada de la sesión actual, citando la sesión afectada.

## 7 bis. README.md

Es lo primero que ve quien abre el repositorio en GitHub (el profesorado incluido). Explica qué es el juego, cómo arrancarlo y jugar, la API y dónde está la documentación del proceso con IA. Si cambias cómo se arranca, las reglas, los controles o la API, actualiza el `README.md` en el mismo commit. No dupliques en él los valores de `config.js`: remite al archivo.

## 8. Fases del proyecto

1. Esqueleto, crear sala y unirse, sala de espera e inicio por el máster. *(hecha)*
2. Mapa aleatorio, movimiento, bomba, gadgets y victoria. *(hecha)*
3. Pantalla de resultados, endpoint `GET /api/games/:id`, estética y accesibilidad. *(hecha)*
4. Túnel, `start.bat` y prueba real con varios PC. Ajuste de los valores de `config.js` jugando. *(en curso)*
   - Pendiente conocido: el endpoint `GET /api/lan` del servidor (sesión 5).
   - Pendiente: que los jugadores se distingan mejor en el mapa (sesión 4).
   - Pendiente: probar `start.bat` y el túnel, y una partida real con otra persona.
5. Presentación: completar el resumen del `DIARIO.md` y preparar la exposición (entrega hacia el 2-12-2026).

Ideas sin decidir (no las empieces sin que el usuario lo pida y concrete):

- **Versión `.exe`** además de la web. Todavía no está decidido si el `.exe` solo arranca el servidor (para no instalar Node.js) o es el juego completo en una ventana. Cualquiera de las dos necesita una herramienta de empaquetado que hoy no está en el stack (sección 3): propón opciones, espera el visto bueno y anótalo en el diario.
- Selector de idiomas.

Se juega **solo en PC con teclado**. No hacen falta controles táctiles.

El estado al día está en el resumen de `DIARIO.md`.

## 9. Comandos

```
npm install     instala dependencias
npm start       arranca el servidor en http://localhost:3000
npm test        comprueba las reglas y simula una partida completa (tarda unos 10 segundos)
start.bat       arranca servidor y túnel, y muestra la URL para compartir
probar.bat      npm install + npm test con doble clic; deja el resultado en prueba.log
subir.bat       git push a GitHub con doble clic
```

## 10. Limitaciones del entorno de la IA

Aprendidas en las sesiones 1 a 5. Tenlas en cuenta antes de prometer nada:

- **Sin acceso al registro de npm** (error 403). No puedes ejecutar `npm install`. Las dependencias ya están en `node_modules/`; si hace falta reinstalar, pide al alumno que haga doble clic en `probar.bat` y lee después `prueba.log`.
- **No puedes usar la terminal de Windows ni el escritorio del alumno** salvo que te dé acceso. Lo que tenga que ejecutarse en Windows (`start.bat`, `cloudflared`, el firewall) lo hace el alumno; dale los pasos exactos.
- **Tu navegador de pruebas no puede conectarse por WebSocket a la IP de red local** (lo bloquea su proxy). Por `localhost` sí. La prueba desde otro PC la hace el alumno.
- **GitHub:** no puedes crear repositorios ni invitar colaboradores; como mucho, trabajar con uno ya autorizado.
- **No cambies la configuración de seguridad de Windows** (firewall, antivirus) aunque tengas forma de hacerlo: explícale al alumno cómo hacerlo él.
- Si encuentras otra limitación, dila al usuario y añádela aquí y en el diario.
