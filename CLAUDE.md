# CLAUDE.md — Normas del proyecto DevChallenge3

Este archivo lo debe leer cualquier agente de IA antes de tocar el proyecto (Claude, Codex, ChatGPT u otro; `AGENTS.md` remite aquí). Las normas son obligatorias. Si una petición del usuario choca con ellas, avisa y pregunta antes de seguir.

**Equipo.** El proyecto es de dos coautores: **Aleix**, que trabaja con Claude, y **Adriana**, que trabaja con Codex/ChatGPT. Los dos pueden pedir cambios. Al empezar, si no sabes con quién hablas, pregúntalo: hace falta para el campo «Autor» del diario.

**Fecha de entrega:** hacia el 2 de diciembre de 2026 (unas dos semanas desde el 18-11). Lo que no sea necesario para entregar va detrás.

## 0. Antes de empezar cualquier sesión

1. **Ponte al día con el repositorio antes de hacer nada nuevo.** Los dos coautores trabajan a la vez con agentes distintos, así que puede haber cambios que no conoces:
   - `git fetch --all` y `git pull` en `main`.
   - `git log --oneline main -10` y `git branch -a`: mira qué se ha fusionado y qué ramas nuevas hay del otro coautor.
   - **Busca qué puedes aprovechar.** Revisa las ramas sin fusionar (`git log --oneline main..origin/<rama>` y `git diff --stat main...origin/<rama>`) y las últimas entradas del diario: código, normas, scripts o arreglos que sirvan para lo que te piden, o que toquen los mismos archivos. Si los hay, tu rama sale de esa rama y no de `main` (sección 6.3). Dile al usuario en una línea qué has encontrado y de qué rama partes.
   - Si alguien está haciendo justo lo mismo que te piden, no lo dupliques: avisa y pregunta antes de empezar.
   - Si no puedes conectar con GitHub (sección 10), no supongas que estás al día: pide al alumno que haga `git pull` antes de seguir y díselo con esas palabras.
2. Lee este archivo entero (puede haber cambiado con lo que acabas de traer) y el **resumen** y la **última entrada** de `DIARIO.md`, que dicen en qué punto está el proyecto y qué quedó pendiente.
3. Ejecuta `git status`. Si hay cambios sin commit de una sesión anterior, avisa al usuario antes de tocar nada. Después crea la rama de la tarea a partir de `main` actualizado o de la rama que vayas a aprovechar (sección 6.3).
4. Ejecuta `npm test` para partir de un estado que funciona. Si falla, díselo al usuario antes de empezar lo que te pida.
5. Lee la sección 10 (limitaciones del entorno de la IA) para no prometer cosas que no puedes hacer.

## 0 bis. Al terminar cada tarea: actualizar la documentación

Una tarea no está acabada hasta que la documentación dice lo mismo que el código. Cada vez que termines algo, antes de preguntar «¿Subo los cambios a GitHub?», repasa esta lista y actualiza en la misma rama y el mismo commit lo que toque:

| Archivo | Cuándo | Qué |
|---|---|---|
| `DIARIO.md`, entrada de la sesión | **Siempre** | Añade la entrada de la sesión (sección 7). Si en la misma conversación haces varias tareas, amplía esa misma entrada con cada prompt nuevo; no hace falta una sesión por tarea. |
| `DIARIO.md`, resumen de arriba | **Siempre** | Estado actual, la línea de la sesión en la tabla y, si los hay, prompts clave nuevos, conceptos para investigar y fallos. |
| `README.md` | Si cambia cómo se arranca o se publica, las reglas, los controles, la API o la URL | Lo que vería alguien que llega al repositorio (sección 7 bis). |
| `CLAUDE.md` | Si cambian normas, estructura de archivos, eventos, endpoints, valores de `config.js`, el stack, las fases o descubres una limitación nueva | La sección correspondiente. En las fases, marca lo hecho y añade los pendientes nuevos. |
| `AGENTS.md` | Si cambia algo de lo que hay en su lista «Lo imprescindible» | Que Codex se entere sin tener que leerlo todo. |

Al acabar, dile al usuario en una línea qué documentos has actualizado. Si alguno no se ha podido actualizar, dilo.

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

- Es un **miniproyecto de clase**. Está publicado para poder jugarlo y presentarlo, pero no se va a mantener después de la entrega. Ante la duda, elige siempre la solución más simple que cumpla el enunciado.
- **Coste cero.** Nada de servicios de pago ni de cuentas con tarjeta. El único servicio externo es el plan gratuito de Render (sección 2); en Render, comprueba siempre que el plan elegido sea **Free** ($0), porque por defecto sale marcado uno de pago.
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

- **Principal: Render, plan gratuito.** El juego está publicado en **https://pasa-la-bomba-0db0.onrender.com** como *Web Service* gratuito (región Frankfurt), enlazado al repositorio de GitHub. **Cada vez que se fusiona algo en `main`, Render lo vuelve a publicar solo**; las ramas no se publican. Render ejecuta `npm install` y `npm start`, y da el puerto en la variable `PORT` (el servidor ya la lee).
- Limitaciones del plan gratuito que el código tiene que respetar:
  - **Una sola instancia**, así que las salas en memoria funcionan. No añadas nada que dependa de varias instancias.
  - **Se duerme** si nadie entra en 15 minutos, y despertar tarda alrededor de un minuto. Antes de una demo, abrir la web un par de minutos antes.
  - **Puede reiniciarse** en cualquier momento, y entonces se pierden las salas y las partidas. Es aceptable en un proyecto de clase; no añadas base de datos para evitarlo.
  - **Sin disco persistente:** no guardes nada en archivos.
- **Plan B: el portátil del alumno** (Windows x64, Ryzen 7 7435HS) con `npm start`, por la misma WiFi (`http://IP-del-portátil:3000`) o por internet con el túnel de `start.bat`. El mismo código tiene que funcionar en los dos sitios sin cambios.
- Nunca escribas una URL fija en el código. El cliente usa siempre rutas relativas y `window.location`.
- No hay base de datos. El estado de las partidas vive en memoria.
- **Descartados** (sesión 7): Vercel, porque en el plan gratuito cada conexión se corta a los 5 minutos y cada jugador puede caer en una instancia distinta; y Supabase, porque obligaba a mover el servidor del juego al navegador del máster.

## 3. Stack cerrado

| Parte | Tecnología permitida |
|---|---|
| Servidor | Node.js, Express, Socket.IO |
| Cliente | HTML, CSS, Canvas 2D y JavaScript sin framework ni paso de compilación |
| Pruebas | `socket.io-client` como dependencia de desarrollo, para simular jugadores |
| Publicación | Render, plan gratuito (sección 2); túnel `cloudflared` como plan B |

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
├── subir.bat              sube a GitHub la rama actual con doble clic (local, ignorado por git; ahora es el plan B)
├── autosubida.ps1         sube las ramas con commits nuevos (nunca main) cuando existe .subir-ahora
├── autosubida.vbs         lo lanza la tarea programada cada minuto, sin abrir ventanas
├── instalar-autosubida.bat / quitar-autosubida.bat   crean o quitan la tarea programada en el Windows de cada coautor
├── .github/workflows/abrir-pull-request.yml   abre solo el pull request a main al subir una rama
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
- Un commit al cerrar cada sesión o cambio importante, solo después de probar.
- Mensajes en castellano: una primera línea corta que diga qué cambia y, si hace falta, un párrafo con el porqué.
- Autor de los commits: la dirección anónima de GitHub del alumno (`…@users.noreply.github.com`). Nunca su correo personal: el repositorio es público.
- No reescribas el historial de nada que ya esté subido.

**Una rama por cada cosa nueva.** Nunca se trabaja directamente en `main`.

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `view-` | aspecto visual, interfaz, accesibilidad | `view-jugadores-visibles` |
| `game-` | reglas y jugabilidad, valores de `config.js` | `game-equilibrio-bomba` |
| `net-` | red, servidor, salas, túnel, endpoints | `net-tunel-cloudflare` |
| `fix-` | arreglar un fallo | `fix-api-lan` |
| `docs-` | `DIARIO.md`, `README.md`, `CLAUDE.md`, `AGENTS.md` | `docs-instrucciones` |
| `test-` | pruebas automáticas | `test-gadgets` |

- Nombre: prefijo + dos o tres palabras en castellano, en minúsculas, sin tildes y separadas por guiones.
- Si una petición mezcla temas, usa el prefijo de lo principal. Si son dos cosas independientes, dos ramas.
- Flujo de cada rama:
  1. **Elige de dónde parte la rama:**
     - Por defecto, de `main` actualizado: `git checkout main`, `git pull` y `git checkout -b <prefijo-nombre>`.
     - **Si una rama sin fusionar tiene algo que te sirve o toca los mismos archivos** (el diario casi siempre), parte de ella: `git checkout -b <prefijo-nombre> origin/<esa-rama>`. No clones el repositorio otra vez: trabaja en la copia que ya tiene el alumno y crea tu rama encima de la otra. Así aprovechas su trabajo y evitas conflictos.
     - Si varias ramas encadenadas sirven, parte de la más avanzada, la que ya contiene a las demás (`git log --graph --oneline --all`). Si son ramas separadas que se contradicen, pregunta al usuario cuál usar.
     - Si partes de otra rama, apúntalo en el diario y en la descripción del pull request («sale de `<rama>`: fusionar después de ella»), porque tu pull request incluirá también sus commits hasta que esa se fusione.
  2. Trabaja, prueba, **actualiza la documentación (sección 0 bis)** y haz commit en la rama.
  3. **Subida, siempre preguntando antes.** Al terminar la tarea, con el commit hecho y probado, pregunta al usuario: **«¿Subo los cambios a GitHub?»**. Si dice que no, no subas nada. Si dice que sí:
     - Si tu entorno puede hacer `git push` (por ejemplo, Codex en el PC de Adriana con su sesión de GitHub), haz `git push -u origin <rama>` directamente.
     - Si no puede (Claude en Cowork: su red no llega a GitHub), **crea un archivo vacío `.subir-ahora` en la raíz del proyecto**. La tarea programada `PasaLaBomba-autosubida` del Windows de ese coautor lo ve en menos de un minuto, sube las ramas con commits nuevos (nunca `main`, nunca forzado) con su sesión de GitHub y borra el archivo.
     - Comprueba el resultado: el archivo `.subir-ahora` desaparece y `autosubida.log` dice «Subida <rama>». Si en dos minutos sigue ahí, la tarea no está instalada en ese ordenador: díselo al usuario y ofrécele instalarla con doble clic en `instalar-autosubida.bat` (una sola vez por ordenador) o usar `subir.bat`.
  4. Al llegar la rama a GitHub, **GitHub Actions abre el pull request a `main`** (`.github/workflows/abrir-pull-request.yml`), con la primera línea del último commit como título. El otro coautor lo revisa y lo fusiona. El agente nunca fusiona en `main` por su cuenta.
  5. Las ramas **no se borran** después de fusionarlas: sirven para la presentación.
- Nunca crees `.subir-ahora` sin el «sí» del usuario en esa misma conversación, y nunca hagas commit en `main`.
- Si `autosubida.log` dice AVISO o ERROR, explícaselo al alumno. Si tienes forma, confirma también con `git ls-remote` que el commit está en GitHub.
- Plan B si la tarea no está instalada o falla: `subir.bat`, que el agente puede lanzar con un doble clic si el alumno le da acceso al Explorador de archivos. Si no se abre el pull request automático, dale al alumno el título y una descripción de dos o tres líneas para pegarlos en GitHub.
- Si hay conflicto con `main`, no lo resuelvas a ciegas: para y explica al usuario qué choca.
- No des la sesión por subida sin haberlo comprobado con `git status -sb`.

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
4. Publicación en Render *(hecha, sesión 7)*, prueba real con varios PC y ajuste de los valores de `config.js` jugando. *(en curso)*
   - Pendiente conocido: el endpoint `GET /api/lan` del servidor (sesión 5).
   - Pendiente: que los jugadores se distingan mejor en el mapa (sesión 4).
   - Pendiente: una partida real con otra persona desde otro PC (ahora basta con abrir la web de Render). `start.bat` y el túnel quedan como plan B, sin probar.
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
https://pasa-la-bomba-0db0.onrender.com   el juego publicado (rama main)
start.bat       plan B: arranca servidor y túnel en el portátil, y muestra la URL para compartir
probar.bat      npm install + npm test con doble clic; deja el resultado en prueba.log
subir.bat       plan B: sube a GitHub la rama en la que estés, con doble clic
instalar-autosubida.bat   instala la subida bajo petición en ese ordenador (una vez por coautor)
quitar-autosubida.bat     la quita
```

## 10. Limitaciones del entorno de la IA

Aprendidas en las sesiones 1 a 5. Tenlas en cuenta antes de prometer nada:

- **Sin acceso al registro de npm** (error 403). No puedes ejecutar `npm install`. Las dependencias ya están en `node_modules/`; si hace falta reinstalar, pide al alumno que haga doble clic en `probar.bat` y lee después `prueba.log`. Lo mismo en un clon nuevo del repositorio, que no trae `node_modules/` (está en `.gitignore`): le pasó al Codex de Adriana el 18-11. Mejor trabajar en la copia que el alumno ya tiene instalada.
- **No puedes usar la terminal de Windows ni el escritorio del alumno** salvo que te dé acceso. Lo que tenga que ejecutarse en Windows (`start.bat`, `cloudflared`, el firewall) lo hace el alumno; dale los pasos exactos.
- **Tu navegador de pruebas no puede conectarse por WebSocket a la IP de red local** (lo bloquea su proxy). Por `localhost` sí. La prueba desde otro PC la hace el alumno.
- **GitHub:** no puedes crear repositorios ni invitar colaboradores. Desde la terminal del entorno de Claude, `git pull` y `git push` fallan (el proxy devuelve 403). Por eso existe la subida bajo petición (sección 6.3): haz el commit en la rama, pregunta y, con el «sí», crea `.subir-ahora`. Lo que sigue sin poder hacerse es `git pull`: si el otro coautor ha fusionado algo, pide al alumno que haga `git pull` en Windows. Leer GitHub sí se puede (`git clone` o `git ls-remote` desde el entorno de Claude).
- **Git necesita permiso de borrado** en la carpeta (para sus archivos `.lock`). Pídelo con la herramienta de permisos antes del primer commit de la sesión.
- **No cambies la configuración de seguridad de Windows** (firewall, antivirus) aunque tengas forma de hacerlo: explícale al alumno cómo hacerlo él.
- **Navegadores (sesión 7).** La extensión Claude in Chrome **no funciona en Opera GX** (falla al crear el grupo de pestañas); en **Google Chrome** sí, con las sesiones del alumno. Los inicios de sesión, contraseñas y códigos los pone siempre el alumno. Las ventanas emergentes que abre una web (por ejemplo, la autorización de GitHub) quedan fuera del alcance del agente: pide al alumno que las complete.
- **Render:** el panel se maneja desde el Chrome del alumno. El entorno de la IA no puede abrir la web publicada con `curl` (su proxy no llega); para comprobarla, usa el navegador.
- Si encuentras otra limitación, dila al usuario y añádela aquí y en el diario.
