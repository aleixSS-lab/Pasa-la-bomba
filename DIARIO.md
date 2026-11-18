# Diario de desarrollo — Pasa la bomba (DevChallenge3)

Registro de cómo se ha construido el juego con agentes de IA. Tiene dos partes: un **resumen para la presentación**, que se actualiza al final de cada sesión, y las **sesiones**, una entrada por sesión que no se modifica después. Las normas están en `CLAUDE.md`, sección 7.

> El juego empezó llamándose **Coin Rush** (recoger monedas) y en la sesión 2 pasó a ser **Pasa la bomba**. Las entradas de la sesión 1 hablan todavía de monedas.

---

# Resumen para la presentación

*Última actualización: sesión 13, 18-11-2026.*

## Estado actual

- **Publicado:** https://pasa-la-bomba-0db0.onrender.com (Render, gratis). Se actualiza solo con cada fusión en `main`.
- **Funciona:** salas con código, sala de espera con máster, mapa aleatorio, bomba, gadgets, eliminación, resultados, endpoint `GET /api/games/:id`, prueba automática (`npm test`) superada en Windows con las librerías reales.
- **No funciona todavía:** el enlace de invitación sigue diciendo `localhost` si el máster entra así (el arreglo de la sesión 3 no llegó a guardarse; ver sesión 5).
- **Sin probar:** una partida real entre personas en PC distintos (ya basta con la web de Render). `start.bat` y el túnel quedan como plan B.
- **Fase:** 4 de 5 (red real y ajuste jugando).
- **Entrega:** hacia el 2-12-2026.
- **Idea sin decidir:** versión `.exe` además de la web.
- **Próximas sesiones (reparto de la sesión 12):** Adriana, estética y usabilidad (`view-`); Aleix, jugabilidad (`game-`). Lista completa en la sesión 12.

## Sesiones

| # | Fecha | Tema | Resultado |
|---|---|---|---|
| 1 | 16-11 | Planteamiento, `CLAUDE.md` y primera versión (Coin Rush) | Jugable; planteamiento inicial recortado por el alumno |
| 2 | 16-11 | Cambio de objetivo a Pasa la bomba | Idea del alumno + 4 ajustes de la IA; pruebas a la primera |
| 3 | 16-11 | La compañera no podía entrar | Causa encontrada (`localhost`); el arreglo del servidor se perdió |
| 4 | 18-11 | Iconos dibujados de gadgets y bomba | La IA rehízo la trampa de oso al ver que no se reconocía |
| 5 | 18-11 | Mejora de `CLAUDE.md`, diario y `README.md` | Detectado el fallo perdido de la sesión 3 |
| 6 | 18-11 | El Codex de Adriana no encontraba las dependencias | No era incompatibilidad: un clon nuevo no trae `node_modules/`; documentado en `AGENTS.md` |
| 7 | 18-11 | Publicar el juego gratis en internet | Vercel y Supabase descartados tras leer su documentación; publicado en Render desde el Chrome del alumno |
| 8 | 18-11 | Subir a GitHub sin clics | El agente pregunta «¿Subo los cambios?» y, con el sí, una tarea de Windows los sube; GitHub Actions abre el pull request |
| 9 | 18-11 | Documentar siempre y aprovechar ramas | Lista de documentos que actualizar al terminar cada tarea; las ramas salen de la rama que se aprovecha |
| 10 | 18-11 | Icono en la pestaña del navegador | La bomba como favicon (SVG e ICO); no se veía porque Render solo publica `main` y no se había fusionado nada |
| 11 | 18-11 | Fusionar en `main` con normas | Lista de comprobaciones decidida por el alumno con un test; el agente fusiona solo tras el «sí» |
| 12 | 18-11 | Lluvia de ideas y reparto de tareas | La IA propuso ~30 mejoras; el alumno las aprobó todas y repartió: Adriana estética y usabilidad, Aleix jugabilidad |
| 13 | 18-11 | El ordenador de Adriana no aguanta tareas pesadas | Su agente solo hace tareas ligeras (`view-`, docs) sin preguntar; para las pesadas le pregunta antes |

## 1. Herramientas de IA

- **Claude** (Anthropic) en la aplicación de escritorio, con acceso a la carpeta del proyecto. Modelo `claude-fable-5-2` en las sesiones 1 y 2, `claude-opus-5-5` desde la sesión 3.
- **Codex / ChatGPT** (OpenAI), que usa Adriana. Desde la sesión 5 hay un `AGENTS.md` para que su agente siga las mismas normas.
- Sesiones 1 a 5: Aleix con Claude, un único agente, sin subagentes.
- **Claude in Chrome** (extensión del navegador) desde la sesión 7, para manejar Render en el Chrome del alumno. No funcionó en Opera GX.
- `CLAUDE.md` hace de «contrato»: cualquier agente lo lee antes de tocar nada.

## 2. La idea y cómo se pidió

- Se partió del enunciado del instituto pegado tal cual: «Planteame este challenge».
- La IA hizo **preguntas tipo test** antes de programar (conexión, dispositivos, lenguaje, idioma, diario…), y con las respuestas se escribió `CLAUDE.md`.
- Primera idea: la del ejemplo del enunciado (monedas, gana quien recoge 15 de 50), que la IA desarrolló. Segunda idea (**del alumno**): pasa la bomba con gadgets; la IA solo propuso ajustes para que fuera jugable.

## 3. Prompts clave y a dónde llevaron

| Prompt (resumido) | A dónde llevó |
|---|---|
| «Créame el CLAUDE.md… hazme preguntas» | Normas escritas antes que el código; el resto de sesiones las respetan |
| «Analiza… que sea un proyecto pequeño, no nos vamos a gastar dinero» | Recorte de 7 a 4 fases; túnel gratuito en vez de hosting |
| «Recorta… tienes vía libre» | Fases 1 a 3 hechas en una sola sesión |
| «Te doy permiso a instalar npm» | No era un permiso sino la red bloqueada → `probar.bat` + `prueba.log` |
| «Cambia el objetivo… mejórame las ideas» | Pasa la bomba; la IA añadió velocidad extra, inmunidad, parada al recibir y espectadores |
| «No deja acceder a Adriana a mi local» | Lección: probar la red desde otro PC |
| «Que los emoticonos sean tal cual lo que son» | Dibujos en canvas en vez de emojis |
| «Que los agentes suban todo sin tener que darle clic a un .bat» | El agente pregunta y, con el sí, deja una marca que una tarea de Windows convierte en `git push`; GitHub Actions abre el pull request |
| «Haz un nuevo documento que haga el rol de normas… verificar un número x de cosas que podemos establecer tú y yo mediante un test» | `FUSION.md`: qué comprobar antes y después de fusionar en `main`, decidido con preguntas tipo test |
| «Mira a ver si nos vendría bien Vercel y Supabase» | La IA leyó su documentación y los descartó; propuso Render, que no obliga a cambiar el código |
| «Vamos a hacer una lluvia de ideas para añadir funciones y mejoras» | Lista de mejoras por temas con esfuerzo y rama; el alumno la convirtió en el plan de trabajo de las dos últimas semanas |
| «Antes de hacer nada, que lean el repositorio» y «si hay una rama que puedan aprovechar, que salgan de ella» | Varias conversaciones y dos agentes a la vez sin pisarse: cada uno lee lo nuevo y construye encima |

## 4. Qué tuvo que investigar el alumno

La IA eligió y explicó las tecnologías, pero el alumno tiene que poder defenderlas. Lista acumulada (detalle en cada sesión):

- WebSocket frente a HTTP, y qué añade Socket.IO.
- Servidor autoritativo.
- Túnel de Cloudflare y por qué no hace falta abrir puertos.
- `localhost`, IP de red local y firewall.
- Endpoint REST (`GET /api/games/:id`).
- Detección de choques (distancia entre centros) y *flood fill* para el mapa.
- Canvas 2D (`arc`, `lineTo`, `fill`) e imágenes `data:`.
- Git: remoto, `commit` frente a `push`, ramas y pull requests.
- Tareas programadas de Windows y GitHub Actions (automatizar subida y pull requests).
- Hosting: servidor persistente (Render) frente a funciones *serverless* (Vercel), y qué es un servicio *realtime* como Supabase.

## 5. Qué no funcionó a la primera

- **Planteamiento demasiado grande** → el alumno lo reformuló pidiendo algo pequeño y gratis.
- **La IA no puede instalar npm ni usar Windows** → `probar.bat` y lectura de `prueba.log`.
- **La IA no puede crear el repositorio en GitHub** → lo creó el alumno; la IA dejó `subir.bat`.
- **Correo personal en el primer commit** → rehecho con la dirección anónima antes de subir.
- **Bomba que se devolvía sin parar** → la IA añadió por su cuenta la parada de medio segundo al recibirla.
- **Enlace de invitación con `localhost`** → arreglo en la sesión 3 que **no se guardó** en el servidor; detectado en la sesión 5.
- **Trampa de oso irreconocible** → la IA lo vio en las capturas y la redibujó.
- **El agente no puede hacer `git push`** (su red lo bloquea) → la subida la hace una tarea programada del portátil con la sesión de GitHub del alumno.
- **El usuario pidió usar su Opera** → la extensión no funciona en Opera; se hizo desde Chrome.
- **Una conversación de la IA trabajaba con copias viejas** de los documentos mientras otras conversaciones avanzaban → la norma de leer el repositorio antes de empezar lo detectó (sesión 9) y no se pisó nada.
- **Lo que las pruebas automáticas no dicen:** si el juego es divertido o está equilibrado. Hace falta jugar con personas.

---

# Sesiones

## Sesión 1 — 2026-11-16 — Planteamiento, normas y primera versión jugable

**Herramienta:** Claude en modo Cowork (aplicación de escritorio), modelo configurado `claude-fable-5-2`. Un único agente; no se usaron subagentes ni otras IA.

**Qué se pidió** (cinco prompts, en este orden):

1. «Planteame este challenge» — con el enunciado del instituto como descripción del proyecto.
2. «El juego estará corriendo todo en un portátil, lee las características del portátil y hazme las preguntas necesarias».
3. «Créame el CLAUDE.md para que otros agentes puedan cumplir las normas del proyecto, hazme preguntas para crear el definitivo».
4. «Analiza el planteamiento y verifica que todo cumpla para hacer un proyecto pequeño […] no nos vamos a gastar dinero […] un portátil corriendo como servidor».
5. «Recorta y añade lo que tengas que hacer y tienes vía libre, utiliza los agentes que necesites».

**Qué se hizo:**

- Planteamiento del juego: 2 a 8 jugadores, mapa aleatorio, 50 monedas, gana quien llega a 15.
- Dos rondas de preguntas tipo test al alumno (conexión, dispositivos, lenguaje, herramientas de IA; idioma, diario, dependencias, normas).
- `CLAUDE.md` con las normas para cualquier agente, y después su versión recortada.
- Juego completo (fases 1 a 3): servidor con salas, sala de espera y máster; mapa aleatorio; movimiento, monedas y victoria; pantalla de resultados; endpoint `GET /api/games/:id`; interfaz accesible.
- Prueba automática `npm test` que simula 3 jugadores y una partida entera.
- `start.bat` para arrancar servidor y túnel (fase 4, a medias: ver «Qué falló»).

**Decisiones y por qué:**

- **Node.js + Express + Socket.IO.** Un solo lenguaje en servidor y cliente, y WebSockets resuelve el «protocolo asíncrono» del enunciado. Se descartaron Python, Java y .NET (también instalados en el portátil) por requerir más código para lo mismo. Lo eligió el alumno entre cuatro opciones.
- **Cliente sin framework** (HTML, Canvas y JS). Suficiente para un juego así y más fácil de explicar.
- **Servidor autoritativo.** El navegador solo envía las teclas; el servidor decide posiciones, monedas y ganador. Evita trampas y que cada jugador vea algo distinto.
- **Túnel de Cloudflare** para jugar por internet con el portátil como servidor, sin pagar hosting. Plan B: misma red WiFi. Se descartó desplegar en la nube.
- **Sin login ni base de datos.** Apodo y código de sala de 4 letras; todo en memoria.
- **Regla añadida por la IA:** con varios jugadores las 50 monedas pueden acabarse sin que nadie llegue a 15 (por ejemplo 13, 13, 12, 12). En ese caso gana quien más tenga. El enunciado no lo contemplaba.
- **Textos en un único archivo** (`i18n.js`), porque el alumno quiere añadir más adelante un selector de idiomas.
- **Jugador = color + forma**, para no depender solo del color (accesibilidad).
- **Subagentes:** el alumno dio permiso para usarlos, pero no se usaron; el proyecto es pequeño y repartirlo habría costado más que hacerlo seguido.

**Qué falló y cómo se arregló:**

- **El primer planteamiento era demasiado grande.** La IA propuso 7 fases, servidor en 4 archivos, mapa con semilla, siete requisitos de accesibilidad y selector de idiomas obligatorio. El alumno tuvo que reformular (prompt 4) recordando que es un miniproyecto de instituto sin presupuesto. Resultado: 4 fases, 2 archivos de servidor, 5 requisitos de accesibilidad y selector de idiomas opcional.
- **La IA no pudo leer bien el portátil.** Solo vio el procesador y el sistema operativo; ni la memoria RAM ni si Node.js está instalado en Windows, porque accede a la carpeta desde un entorno aislado. Lo dijo y quedó como comprobación pendiente.
- **La IA no pudo instalar las librerías reales.** Su entorno no tiene acceso al registro de npm (error 403), ni desde la nube ni desde el portátil. Para poder probar igualmente escribió unos sustitutos mínimos de Express y Socket.IO, solo para la prueba y que no forman parte del proyecto. Con ellos la prueba automática y el flujo en navegador (dos jugadores, capturas de pantalla revisadas) pasaron a la primera. **Consecuencia: el juego todavía no se ha ejecutado con las librerías reales ni en Windows.**
- **`start.bat` y el túnel no están probados.** No se pueden ejecutar desde el entorno de la IA. Tampoco se pudo confirmar leyendo la documentación que el túnel rápido de Cloudflare siga siendo gratuito y sin cuenta; se da por bueno por conocimiento previo.
- **Un solo commit en vez de uno por fase.** Las fases 1 a 3 se escribieron seguidas en la misma sesión, así que no hay un commit por fase como pide `CLAUDE.md`.
- Retoques menores tras ver las capturas: el marcador tenía el «15» escrito a mano en vez de leerlo del servidor, y el enlace a la API quedaba pegado a la clasificación.

**Pendiente de investigar por el alumno:**

- Qué es un WebSocket y en qué se diferencia de una petición HTTP normal (y qué añade Socket.IO).
- Qué significa «servidor autoritativo» y por qué el cliente no decide quién coge la moneda.
- Qué hace un túnel (Cloudflare Tunnel) y por qué permite entrar a un portátil desde internet sin abrir puertos.
- Cómo se comprueba que todo el mapa es alcanzable (relleno por inundación o *flood fill*).
- Qué es un endpoint REST y qué devuelve `GET /api/games/:id`.

**Siguiente paso:**

1. En el portátil: comprobar `node -v`, ejecutar `npm install` y `npm test`. Es la primera prueba con las librerías reales.
2. `npm start` y jugar con dos pestañas.
3. Instalar `cloudflared`, ejecutar `start.bat` y probar con otro PC (fase 4).
4. Anotar aquí lo que falle.

### Actualización de la sesión 1 (mismo día)

- **Primera prueba real superada.** El alumno ejecutó `probar.bat` en el portátil: Node.js v25.3.0, `npm install` sin errores (96 paquetes, 0 vulnerabilidades) y `npm test` con «Todo correcto» usando ya Express y Socket.IO reales. El código no necesitó ningún cambio respecto a lo probado con los sustitutos. Sigue sin probarse `start.bat` ni el túnel.
- **Prompt:** «te doy permiso a instalar npm». No era un problema de permiso sino de red: el entorno de la IA tiene bloqueado el registro de npm y tampoco puede teclear en la terminal de Windows. Solución: un `probar.bat` de doble clic que guarda el resultado en `prueba.log`, que la IA sí puede leer.
- **Prompt:** «invita a mi compañera […] sube el repositorio a github y ponlo como público». La IA no pudo crear el repositorio ni invitar: su acceso a GitHub solo funciona con repositorios ya existentes y autorizados para la sesión. Dejó configurado el remoto y un `subir.bat`; crear el repositorio vacío e invitar a la compañera lo hace el alumno en la web.
- **Corrección de privacidad.** El primer commit llevaba el correo personal del alumno como autor. Como el repositorio va a ser público, la IA rehízo ese commit (todavía sin subir) con la dirección anónima de GitHub. Es la única vez que se ha reescrito historial.
- **Para investigar:** qué es un remoto de git (`origin`) y la diferencia entre `commit` y `push`.

---

## Sesión 2 — 2026-11-16 — Cambio de objetivo: de las monedas a «Pasa la bomba»

**Herramienta:** Claude en modo Cowork (aplicación de escritorio), modelo configurado `claude-fable-5-2`. Un único agente.

**Qué se pidió:**

1. «El nombre coin rush ya existe, dime otro nombre».
2. «Vamos a intentar cambiar el objetivo del juego, dime otro objetivo similar».
3. La idea del alumno: un juego de bombas en el que quien tiene la bomba se la pasa a otro al tocarlo; explota a los 30 segundos, elimina al portador y pasa a un jugador al azar; con gadgets en el mapa (trampa de oso que bloquea 1,5 s, chicle que frena y acelerador ×1,5). «Mejórame las ideas si quieres y te diré que sí».
4. «Pasa-la-bomba, modifícame el subir.bat» y, después, «sigue con el proyecto».

**Qué se hizo:**

- El repositorio se subió a GitHub como `aleixSS-lab/pasa-la-bomba` (lo creó y subió el alumno con `subir.bat`).
- Se rehízo la lógica de la partida: bomba con cuenta atrás, paso al tocar, eliminación, bomba nueva al azar, tres gadgets y victoria del último vivo.
- Cliente: cartel con la cuenta atrás, anillo e icono de bomba sobre el portador, gadgets con color y símbolo, avisos en pantalla, modo espectador con cámara libre para los eliminados, clasificación final.
- Nuevo `server/config.js` con todos los valores ajustables.
- El endpoint devuelve ahora los jugadores por puesto, el orden de eliminación y el ganador.
- Prueba automática nueva en dos partes: reglas (velocidades, gadgets, paso de bomba, explosión) y partida completa por red.
- `CLAUDE.md` actualizado con las reglas nuevas y el nombre.

**Decisiones y por qué:**

- **La idea del juego es del alumno; la IA propuso cuatro ajustes** para que funcionara:
  - *Quien lleva la bomba corre ×1,15.* A la misma velocidad nunca alcanzaría a nadie.
  - *Un segundo de inmunidad para quien la acaba de pasar.* Si no, dos jugadores pegados se la devuelven sin parar.
  - *Chicle a mitad de velocidad durante 3 s.* El «0.05» del alumno era ambiguo (¿5 % más lento o al 5 %?); la mitad se nota y se distingue de la trampa.
  - *Los eliminados pasan a espectadores* en vez de quedarse con la pantalla vacía.
- **Ajuste añadido al programar, sin consultarlo antes:** quien recibe la bomba se queda parado medio segundo. Al hacer cuentas, la inmunidad sola no bastaba: el nuevo portador corre más y seguía pegado al otro, así que al acabar el segundo se la devolvía. Está en `config.js` (`RECEIVE_STUN`) y se puede poner a 0.
- **El tiempo de la bomba no se reinicia al pasarla.** Así cada ronda dura como mucho 30 s y la tensión sube.
- **Valores en un solo archivo.** El alumno avisó de que los irá cambiando «mediante comprobaciones»; por eso la prueba lee los valores de `config.js` en vez de tenerlos fijos.
- **Se conservó todo lo que no era el objetivo:** salas, sala de espera, mapa aleatorio, movimiento, túnel. El cambio afectó sobre todo a `server/game.js` y a la parte visual.
- **Nombre:** la IA propuso «Mecha Corta»; el alumno eligió «Pasa la bomba».
- **Otras opciones de objetivo descartadas:** contrarreloj de monedas, robo de monedas, llevar monedas a un cofre, moneda maldita y pilla-pilla.

**Qué falló y cómo se arregló:**

- **El primer objetivo (monedas) se abandonó** por decisión del alumno a mitad de proyecto. El trabajo de las fases 2 y 3 hubo que rehacerlo en parte.
- **La IA no puede crear repositorios en GitHub ni invitar colaboradores** desde su entorno; lo hizo el alumno.
- **El código nuevo pasó las pruebas a la primera**, primero con los sustitutos de las librerías y después con Express y Socket.IO reales (los que el alumno instaló con `probar.bat`). Limitación: esa prueba real se ejecutó en el entorno Linux aislado del portátil, no en Windows directamente.
- **No se ha jugado todavía con personas.** Las pruebas las hacen jugadores automáticos que se mueven al azar; no dicen si el juego es divertido ni si los valores están equilibrados.
- Retoque tras ver las capturas: el icono de la bomba tapaba el apodo del jugador y se movió a un lado.
- Un texto de ayuda llevaba los «30 segundos» escritos a mano; se quitó el número para que no contradiga a `config.js` si se cambia.

**Pendiente de investigar por el alumno:**

- Cómo detecta el servidor que dos jugadores se tocan (distancia entre centros menor que la suma de radios).
- Por qué hacen falta la inmunidad y la parada al recibir la bomba: probar a poner `PASS_IMMUNITY` y `RECEIVE_STUN` a 0 y ver qué pasa.
- Qué diferencia hay entre el mensaje `state` (20 veces por segundo) y `game_event` (solo cuando pasa algo).

**Siguiente paso:**

1. Doble clic en `probar.bat` para confirmar la prueba en Windows, y `git push` (o `subir.bat`) para subir estos cambios.
2. Jugar una partida real con Adriana y ajustar `server/config.js`.
3. Fase 4: instalar `cloudflared`, probar `start.bat` y jugar desde otro PC.

---

## Sesión 3 — 2026-11-16 — La compañera no podía entrar al servidor local

**Herramienta:** Claude en modo Cowork. A partir de esta sesión el modelo configurado pasa a ser `claude-opus-5-5`.

**Qué se pidió:** «No deja acceder a Adriana a mi local, arréglalo».

**Qué se hizo:**

- **Fallo encontrado en el juego.** El enlace de invitación de la sala de espera se construía con la dirección con la que el máster abría la página. Si el máster entraba por `http://localhost:3000`, el enlace también decía `localhost`, y en el PC de la compañera «localhost» es su propio ordenador, así que no llegaba nunca al portátil.
- **Arreglo.** El servidor tiene un endpoint nuevo, `GET /api/lan`, con las direcciones del portátil en la red local. Si el máster ha entrado por `localhost`, el cliente pide esas direcciones y monta el enlace con la primera. Debajo del enlace aparece una nota que dice si sirve para la misma WiFi o solo para ese ordenador.
- Se descartan los adaptadores de red virtuales (VirtualBox, WSL, Hyper-V…). El portátil tiene VirtualBox instalado, y su red interna (`192.168.56.x`) habría dado un enlace que nadie más puede usar.
- Al arrancar, el servidor avisa de revisar el Firewall de Windows si otro PC no puede entrar.

**Decisiones y por qué:**

- **El firewall no lo toca la IA.** Cambiar la configuración de seguridad de Windows no lo hace un agente; se le explicó al alumno cómo permitir Node.js.
- **Si la WiFi del instituto aísla los dispositivos** entre sí, no hay arreglo en el código: la solución es el túnel (fase 4).

**Qué falló y cómo se arregló:**

- El fallo venía de la primera versión y ninguna prueba lo detectó, porque todas se hacían desde el mismo ordenador. Lección: probar desde otro PC antes de dar por buena la parte de red.
- Al verificarlo, el navegador del entorno de la IA no pudo unirse por la dirección de red: su proxy rechazaba la conexión WebSocket. Una conexión directa a esa misma dirección sí funcionó, así que el servidor acepta jugadores de la red, pero la prueba completa desde otro PC la tiene que hacer el alumno.

**Pendiente de investigar por el alumno:** qué es `localhost` y por qué cada ordenador tiene el suyo; qué es una IP de red local; qué hace un firewall.

**Siguiente paso:** probar de nuevo con Adriana; si sigue sin entrar, revisar el firewall y, si la red del centro lo bloquea, pasar al túnel.

---

## Sesión 4 — 2026-11-18 — Iconos que se reconocen: trampa, chicle, acelerador y bomba

**Herramienta:** Claude en modo Cowork, modelo configurado `claude-opus-5-5`.

**Qué se pidió:** «Vamos a hacer que los modelos sean más visibles, primero los emoticonos, que sean tal cual lo que son».

**Qué se hizo:**

- Los gadgets dejaron de ser símbolos de texto (×, ≈, ») y pasaron a ser dibujos de lo que son:
  - **Trampa de oso:** dos mandíbulas con dientes, placa central y muelles a los lados.
  - **Chicle:** mancha rosa con brillo y una pompa.
  - **Acelerador:** plataforma verde con un rayo.
  - **Bomba:** esfera negra con brillo, mecha y chispa.
- Los mismos dibujos se usan en el mapa, debajo del jugador mientras dura el efecto, en el marcador (la bomba junto al portador), en la leyenda de la partida y en las instrucciones de la pantalla de inicio, cada uno con su nombre.

**Decisiones y por qué:**

- **Dibujos hechos con código en el canvas, no emojis.** Los emojis cambian de aspecto según el sistema operativo y el navegador, y no existe un emoji de trampa de oso (🪤 es una ratonera) ni de chicle. Así se ven igual en todos los PC.
- **Una sola función por icono.** Sirve para el mapa y, convertida en imagen, para la leyenda; si se retoca un dibujo, cambia en todas partes.
- **Accesibilidad:** cada icono tiene forma y color propios y siempre aparece con su nombre al lado; el borde blanco de la bomba la separa del suelo oscuro.

**Qué falló y cómo se arregló:**

- **La primera trampa de oso no se reconocía.** Era un aro con dientes alrededor y parecía una sierra o un ventilador. La IA lo detectó al revisar las capturas ampliadas, sin que el alumno lo dijera. Se rehízo con lo que identifica a una trampa de verdad (dos mandíbulas separadas y los muelles a los lados) y se dibujó algo más grande en el mapa porque se veía más pequeña que el resto.
- Prueba automática: correcta (no cambia la lógica, solo el dibujo).

**Pendiente de investigar por el alumno:** cómo se dibuja con la API Canvas 2D (`arc`, `lineTo`, `fill`, `stroke`) y qué es una imagen `data:` (`toDataURL`).

**Siguiente paso:** hacer más visibles los jugadores (la segunda parte de la petición), probar con Adriana y subir los commits pendientes.

---

## Sesión 5 — 2026-11-18 — Mejora de las instrucciones: CLAUDE.md, diario y README

**Autor:** Aleix.

**Herramienta:** Claude en la aplicación de escritorio, modelo `claude-opus-5-5`.

**Qué se pidió:**

1. «Vamos a mejorar las instrucciones, tanto claude.md, diario.md y el readme.md».
2. «Hazme las preguntas para mejorar la precisión de los próximos modelos».
3. «Por cada cosa nueva me gustaría que se hiciera una rama nueva […] si es de aspecto visual sería view-…».
4. «También añade que antes de hacer nada nuevo verifique cada agente el repositorio por si hay cosas nuevas y estar actualizados».

**Qué se hizo:**

- **`README.md` nuevo** (no existía): qué es el juego, reglas, cómo arrancarlo en local, en red local y por túnel, controles, API, estructura, accesibilidad y enlace al diario.
- **`DIARIO.md`:** título corregido (decía «Coin Rush»), y un **resumen para la presentación** arriba que responde a las cinco preguntas del profesorado, con tabla de sesiones y estado actual. Las entradas anteriores no se han tocado.
- **`CLAUDE.md`:**
  - Lista de comprobación al empezar cada sesión (leer diario, `git status`, `npm test`).
  - Sección nueva con las limitaciones del entorno de la IA aprendidas hasta ahora (npm, Windows, WebSocket por IP, GitHub, firewall).
  - Al probar: comprobar que los cambios están de verdad en el disco, y probar la red desde otro PC.
  - Git al día: repositorio público, autor anónimo, quién hace el `push`.
  - Endpoints documentados con sus campos, incluido `/api/lan`.
  - Aclarado qué números van en `config.js` y cuáles no (antes la norma decía «todos» y no se cumplía con el tamaño del mapa ni el máximo de jugadores).
  - Quitado un ejemplo que quedaba de las monedas (`coin_collected`).
  - Fases al día, con los pendientes conocidos y una fase 5 de presentación.
- **Segunda ronda, con preguntas tipo test al alumno** para que los próximos agentes acierten más. Respuestas y lo que cambió:
  - *Adriana es coautora y usa Codex/ChatGPT* → `AGENTS.md` nuevo que remite a `CLAUDE.md`, y campo **Autor** en cada entrada del diario.
  - *Fallos fuera de la petición: avisar y preguntar* → norma nueva en `CLAUDE.md`.
  - *El agente hace commit y push al cerrar cada sesión* → antes había que pedirlo; ahora con `git pull` previo por si el otro coautor ha subido cambios.
  - *Respuestas breves con «para investigar»* → norma de cómo responder.
  - *Solo PC con teclado; habrá versión web y `.exe`* → el `.exe` queda como idea sin decidir (no se sabe si solo arranca el servidor o es el juego entero) y necesitará permiso para añadir una herramienta de empaquetado.
  - *Entrega en unas dos semanas* → fecha aproximada en `CLAUDE.md` y en el resumen.
- **Tercer prompt:** «Por cada cosa nueva me gustaría que se hiciera una rama nueva, por ejemplo, si es de aspecto visual sería view-…». La IA propuso seis prefijos y preguntó cómo se fusionan las ramas:
  - Prefijos `view-`, `game-`, `net-`, `fix-`, `docs-` y `test-`.
  - Cada rama llega a `main` con un **pull request** que revisa y fusiona el otro coautor. El agente no fusiona nunca.
  - Las ramas no se borran, para enseñar el historial en la presentación.
  - Los dos primeros commits de esta sesión ya estaban en `main` (el alumno los subió con `subir.bat`) y no se mueven, porque no se reescribe lo que ya está subido. Este último cambio es el primero que va en una rama: `docs-instrucciones`.
  - `subir.bat` ahora sube la rama actual en vez de `main` siempre.
- **Cuarto prompt:** «Antes de hacer nada nuevo, que cada agente verifique el repositorio por si hay cosas nuevas y estar actualizados». Nuevo primer paso en `CLAUDE.md` y `AGENTS.md`: `git fetch`, `git pull`, revisar las ramas y los pull requests del otro coautor, y avisar si alguno toca lo mismo. Si el agente no llega a GitHub (es lo que le pasa a Claude), tiene que pedir al alumno que haga `git pull`, en vez de dar por hecho que está al día.

**Decisiones y por qué:**

- **El resumen va arriba y es lo único editable del diario.** Las entradas siguen siendo intocables (honestidad), pero el profesorado necesita una vista rápida, y montarla al final a partir de cinco sesiones sería mucho trabajo.
- **El README no repite los valores de `config.js`**, para que no se desfase cuando el alumno los ajuste.
- **Un fallo antiguo no se corrige reescribiendo su entrada**, sino anotándolo en la sesión en que se descubre. Queda escrito en `CLAUDE.md`.

**Qué falló y cómo se arregló:**

- **El arreglo de la sesión 3 no está en el servidor.** Al revisar el código para documentar la API, la IA vio que `public/js/main.js` llama a `GET /api/lan`, pero `server/index.js` no tiene ese endpoint: el commit de la sesión 3 incluye el cliente y el diario, pero no el servidor. El cliente, al no recibir respuesta, se queda con `localhost`, así que **el problema de Adriana sigue sin resolverse**. Tampoco están el filtro de adaptadores virtuales ni el aviso del firewall al arrancar. La sesión 3 se dio por buena sin comprobar que todos los archivos se habían guardado. **Todavía no se ha arreglado**: esta sesión era solo de documentación y se ha consultado al alumno.
- Para que no se repita, `CLAUDE.md` obliga ahora a comprobar con `git status` y `grep` que los cambios están en el disco antes de hacer commit.

**Pendiente de investigar por el alumno:** qué es un `README` y por qué es lo primero que se mira en un repositorio; qué es Markdown.

**Siguiente paso:**

1. Añadir `GET /api/lan` al servidor y comprobarlo desde el PC de Adriana.
2. Hacer más visibles a los jugadores (pendiente de la sesión 4).
3. Probar `start.bat` con el túnel.
4. Subir la rama `docs-instrucciones` con `subir.bat`, abrir el pull request y que Adriana lo revise.

## Sesión 6 — 2026-11-18 — Codex de Adriana sin dependencias en un clon nuevo

**Autor:** Aleix.

**Herramienta:** Claude (Claude Opus 5.5), con un subagente para el cambio de documentación.

**Qué se pidió:**

1. Aleix pegó el aviso del Codex de Adriana: «incompatibilidad de chatgpt de adriana». Codex había clonado el repositorio de cero en una carpeta nueva y `npm test` falló porque «no encuentra socket.io-client»; Codex paró y avisó, como mandan las normas.
2. «si pero ejecuta el agente docs para ello».

**Qué se hizo:**

- Diagnóstico: no era una incompatibilidad entre Claude y Codex ni un fallo del código. `node_modules/` está en `.gitignore`, así que un clon nuevo no trae las dependencias, y el entorno de Codex no tiene red para `npm install`.
- `AGENTS.md`: nuevo punto en «Lo imprescindible»: en un clon nuevo, pedir al usuario que ejecute `probar.bat` en esa carpeta y leer `prueba.log` antes de `npm test`; mejor trabajar en la copia ya instalada.
- `CLAUDE.md`, sección 10: una frase con lo mismo en el punto del registro de npm.
- Resumen del diario: línea de la sesión 6 en la tabla.
- `npm test` en la copia de Aleix (con dependencias): todo correcto. Solo cambia documentación.

**Decisiones y por qué:**

- La IA propuso documentarlo en `AGENTS.md` (es lo que lee Codex) en vez de cambiar código; Aleix aceptó.
- La IA decidió, sin consultarlo, añadir el cambio como un commit más en la rama `docs-instrucciones` en vez de abrir una rama nueva, porque esa rama aún no está fusionada y toca los mismos archivos: una rama aparte habría chocado con ella.
- Solución para Adriana: doble clic en `probar.bat` en su clon, o que Codex trabaje en la copia que ella ya tiene instalada.

**Qué falló y cómo se arregló:**

- El primer mensaje hablaba de «incompatibilidad»; la causa real era la falta de dependencias en el clon. Las normas no avisaban de este caso; ahora sí.
- No se ha podido comprobar desde el entorno de Claude que `probar.bat` funcione en la carpeta de Adriana: lo tiene que hacer ella.

**Pendiente de investigar por el alumno:** por qué `node_modules/` no se sube a git y qué hacen `package-lock.json` y `npm install`.

**Siguiente paso:** Adriana ejecuta `probar.bat` en su clon y Codex continúa con los mapas y la selección de sala.

---

## Sesión 7 — 2026-11-18 — Publicar el juego gratis en internet: Render

**Autor:** Aleix.
**Herramienta:** Claude en modo Cowork, modelo configurado `claude-opus-5-5`, con búsqueda web, la extensión Claude in Chrome y el control del ordenador (solo para el Explorador de archivos). Esta sesión empezó antes que las sesiones 5 y 6, que se hicieron en otra conversación; las encontró en el repositorio al ir a guardar.

**Qué se pidió:**

1. «Mejoremos el juego, vamos a hacer que el juego se pueda correr en una página web gratis, por ejemplo Vercel o el mismo GitHub, mira a ver si nos vendría bien Vercel y Supabase».
2. «Vamos con Render pues, utiliza el navegador para hacer todo, intenta acceder a mi Opera».
3. «Ya he creado la cuenta, intenta acceder a mi Chrome».

**Qué se hizo:**

- Comparación de opciones gratuitas leyendo la documentación oficial de Vercel, Supabase y Render.
- Web Service gratuito en Render (región Frankfurt), enlazado a GitHub con acceso solo al repositorio `pasa-la-bomba`. Publicado en **https://pasa-la-bomba-0db0.onrender.com**.
- Prueba en la web publicada: dos jugadores en pestañas distintas crearon y se unieron a una sala y la partida arrancó (mapa, gadgets, cuenta atrás de la bomba).
- `CLAUDE.md` (secciones 1, 2, 3, 8, 9 y 10), `README.md` («Jugar ahora») y este diario actualizados.

**Decisiones y por qué:**

- **Vercel descartado (lo propuso el alumno; lo descartó la IA tras leer la documentación):** el plan gratuito ya admite WebSockets, pero cada conexión se corta a los 5 minutos (una partida de 8 dura unos 4 más la sala de espera) y cada jugador puede caer en una instancia distinta del servidor, así que las salas en memoria no funcionarían sin añadir una base de datos.
- **Supabase descartado:** sus canales en tiempo real podrían sustituir a Socket.IO, pero no ejecutan el bucle del juego. Habría que convertir el navegador del máster en servidor (reescribir medio proyecto, perder el servidor autoritativo) y su plan gratuito permite 100 mensajes por segundo, justo en el límite con 8 jugadores a 20 actualizaciones por segundo.
- **GitHub Pages descartado:** solo sirve archivos, no ejecuta un servidor.
- **Render elegido (propuesta de la IA, aceptada por el alumno):** ejecuta el mismo servidor sin cambios, una sola instancia, WebSockets sin límite de duración, gratis y, según su web, sin tarjeta. Pega: se duerme tras 15 minutos sin uso.
- **Conectar GitHub a Render** lo decidió el alumno (la IA le preguntó antes, porque da permisos), para que cada fusión en `main` se publique sola. Se limitó el acceso a un solo repositorio.
- **Rama `net-render` creada a partir de `docs-instrucciones` y no de `main`** (decisión de la IA): las dos añaden una sesión al final del diario y tocan el resumen, y partir de `main` habría provocado un conflicto seguro. Si `docs-instrucciones` se fusiona primero, este pull request solo mostrará lo de la sesión 7.

**Qué falló y cómo se arregló:**

- **La extensión de Claude no funciona en Opera GX:** cada intento de abrir una pestaña devolvía «No group with id». El control del ordenador tampoco deja hacer clic en navegadores. Se probó el navegador integrado de Claude, pero era un perfil sin sesiones y el alumno no llegó a iniciar sesión. Al final el alumno conectó **Chrome** y desde ahí funcionó.
- **Render marca por defecto el plan de 7 $/mes.** La IA cambió a **Free** antes de publicar. Queda en `CLAUDE.md` como aviso.
- **La autorización de GitHub se abrió en una ventana emergente** que el agente no puede ver; la completó el alumno.
- **Al ir a guardar apareció trabajo de otra conversación** (sesiones 5 y 6, ramas nuevas y normas nuevas). Se leyó antes de tocar nada y se siguieron las normas nuevas (rama propia y pull request).
- **Corrección a la sesión 3** (ya señalada en la sesión 5): esta misma conversación hizo aquel arreglo y lo dio por terminado sin comprobar que `server/index.js` aparecía en el commit. Por eso falta `/api/lan` en el servidor. En la web de Render no afecta, porque el enlace de invitación usa la dirección pública; sí afecta al plan B en el portátil. No se ha arreglado en esta sesión: se ha preguntado al alumno, como pide la norma de fallos fuera de la petición.
- No se pudo comprobar la web con `curl` desde el entorno de la IA (su proxy no llega a Render); se comprobó con el navegador.

**Pendiente de investigar por el alumno:** diferencia entre un servidor que está siempre encendido (Render) y las funciones *serverless* (Vercel); qué es un servicio *realtime* como Supabase; qué es un despliegue automático desde GitHub.

**Siguiente paso:** fusionar `docs-instrucciones` y `net-render` en `main`; arreglar `/api/lan` si el alumno lo pide; jugar una partida real con Adriana desde la web de Render.

---

## Sesión 8 — 2026-11-18 — Subir a GitHub sin clics: tarea programada y pull requests automáticos

**Autor:** Aleix.
**Herramienta:** Claude en modo Cowork, modelo configurado `claude-opus-5-5`, con control del ordenador (Explorador de archivos) y PowerShell 7 en el entorno de la IA para probar el script.

**Qué se pidió:** «Hay que hacer que los agentes suban todo sin tener que ir a darle un click a un .bat, queremos que lo hagáis vosotros, más automatizado».

**Qué se hizo:**

- `autosubida.ps1`: sube a GitHub las ramas con commits nuevos. No sube nunca `main` ni fuerza nada; si GitHub tiene commits que no están en el portátil, no sube y lo apunta; si git está ocupado, espera a la vuelta siguiente. Apunta lo que hace en `autosubida.log`.
- `autosubida.vbs` para lanzarlo sin abrir ventanas, e `instalar-autosubida.bat` / `quitar-autosubida.bat`, que crean o quitan una **tarea programada de Windows** que lo ejecuta cada 2 minutos.
- `.github/workflows/abrir-pull-request.yml`: **GitHub Actions** abre el pull request a `main` en cuanto llega una rama nueva, con el título del último commit. No fusiona nada.
- `CLAUDE.md` (secciones 5, 6.3, 9 y 10) y `README.md` actualizados con el flujo nuevo.

**Decisiones y por qué:**

- **Por qué no hace el push el agente directamente** (decisión de la IA, explicada al alumno): el entorno de Claude no puede escribir en GitHub (su red devuelve 403 y no hay forma de conectarle el repositorio desde esta app). El único sitio con permiso para subir es el Windows del alumno, que ya tiene la sesión de GitHub iniciada.
- **Tarea programada cada 2 minutos** en vez de vigilar la carpeta en tiempo real: más simple y sin programas extra. Se descartó también un *hook* de git, porque los commits de la IA se hacen desde su entorno Linux y el hook se ejecutaría allí, donde no se puede subir.
- **Nunca `main` y nunca forzar:** encaja con las normas de la sesión 5 (a `main` solo se llega por pull request y no se reescribe lo subido).
- **GitHub Actions** es gratis en repositorios públicos y viene con GitHub, así que no añade ningún servicio nuevo. Necesita activar una opción en el repositorio (Settings → Actions → General → «Allow GitHub Actions to create and approve pull requests»).
- **Rama `net-autosubida`** a partir de `net-render`, por el mismo motivo que en la sesión 7: evitar conflictos en el diario. Orden de fusión: #1 `docs-instrucciones`, después `net-render`, después esta.

**Qué falló y cómo se arregló:**

- **No se puede probar PowerShell en Windows desde la IA**, así que se descargó PowerShell 7 en su entorno Linux y se probó el script contra un «GitHub» falso (un repositorio local) en cuatro casos: sube ramas nuevas y avanzadas; no sube `main`; no sube si el remoto tiene commits que no están en local; no hace nada si hay un `.lock`. Todo correcto. Falta la prueba de verdad en Windows con la tarea programada.
- **Un fallo evitado al escribirlo:** en PowerShell, `"$rama:"` dentro de un texto se interpreta como otra cosa; hay que escribir `"${rama}:"`.

**Pendiente de investigar por el alumno:** qué es una tarea programada de Windows; qué es GitHub Actions y qué es un *workflow*; por qué el script no fuerza nunca un `push`.

**Cambio de diseño en la misma sesión, a petición del alumno.** La IA propuso una tarea que subía sola cada 2 minutos y pidió permiso para instalarla. El alumno respondió: «¿No se podría hacer una función para los agentes que te preguntara si queremos nosotros que subamos los cambios y directamente ahí subirlo a git?», y después: «pero también tendría que ser para el ordenador de Adriana». Resultado:

- **El agente pregunta siempre** «¿Subo los cambios a GitHub?» al acabar. Con el «sí», si puede hacer `git push` lo hace; si no (Claude), crea el archivo `.subir-ahora`.
- **La tarea programada ya no sube por su cuenta:** cada minuto mira si existe `.subir-ahora`; si no, ni siquiera abre PowerShell. Si existe, lo borra, sube y lo apunta en el log.
- **Sirve en cualquier Windows:** `instalar-autosubida.bat` no tiene rutas fijas y se instala una vez en cada ordenador (Aleix y Adriana). Si el Codex de Adriana puede hacer `git push` por sí mismo, ni siquiera le hace falta. `AGENTS.md` también lo explica.
- La IA lo había descartado al principio por más complicado; la idea del alumno da más control (nada se sube sin un «sí») con el mismo número de clics: ninguno.

**Siguiente paso:** instalar la tarea en el portátil de Aleix (y en el de Adriana si su agente no puede hacer push), activar la opción de GitHub Actions y comprobar con un «sí» que esta rama sube y se abre su pull request.

---

## Sesión 9 — 2026-11-18 — Documentar al terminar cada tarea y aprovechar las ramas de los demás

**Autor:** Aleix.
**Herramienta:** Claude en la aplicación de escritorio, modelo `claude-opus-5-5`. Es la misma conversación que la sesión 5; entre medias se hicieron las sesiones 6 a 8 en otras conversaciones.

**Qué se pidió:** «¿Los agentes tienen asignado que cada vez que acaben de hacer algo actualicen la documentación? ¿Y que cada vez que vayan a hacer algo lean el repositorio en busca de cosas nuevas que puedan aprovechar? Si hay alguna rama que puedan aprovechar, la clonan y lo hacen desde allí».

**Qué se hizo:**

- **Respuesta a la pregunta: solo en parte.** El diario se escribía al cerrar la sesión y el `README` cuando cambiaba el arranque o la API, pero no había una lista para cada tarea. Al empezar, se leía el repositorio solo para no pisar al otro, no para aprovechar lo suyo, y las ramas salían siempre de `main`. En las sesiones 6 a 8 la IA ya partió de otras ramas, pero lo decidía cada vez, sin norma.
- **`CLAUDE.md`:**
  - Sección nueva **0 bis**: tabla de qué documento se actualiza al terminar cada tarea (diario y resumen siempre; `README`, `CLAUDE.md` y `AGENTS.md` según lo que cambie), antes de preguntar si se sube.
  - Sección 0: al empezar, buscar en las ramas sin fusionar y en el diario lo que se pueda aprovechar.
  - Sección 6.3: la rama sale de `main` o de la rama que se aprovecha. Si hay varias encadenadas, de la más avanzada; si se contradicen, se pregunta. Se apunta en el diario y en el pull request.
- **`AGENTS.md`:** las dos normas resumidas para Codex.
- **Esta sesión aplica la norma nueva:** la rama `docs-flujo-agentes` sale de `net-autosubida`, que ya contiene `docs-instrucciones` y `net-render`.

**Decisiones y por qué:**

- **«Clonar» se ha escrito como «salir de esa rama»** (decisión de la IA). Clonar es copiar el repositorio entero en otra carpeta, y eso ya dio problemas en la sesión 6 (un clon nuevo no trae las dependencias). Lo que pide el alumno se consigue en la misma copia con `git checkout -b <nueva> origin/<rama>`.
- **Una entrada de diario por conversación**, ampliada con cada tarea, en vez de una entrada por tarea, para que el diario no se llene de entradas de una línea.
- Las dos peticiones van en una sola rama `docs-`, porque tocan los mismos archivos.

**Qué falló y cómo se arregló:**

- **Esta conversación tenía copias viejas de los documentos.** Las sesiones 6 a 8 se hicieron en otras conversaciones mientras tanto. Al empezar, la IA revisó el repositorio, como pide la norma de la sesión 5, y encontró tres sesiones nuevas, dos ramas nuevas y la carpeta en otra rama. Volvió a leerlo todo antes de editar; si hubiera guardado sus copias, habría borrado las sesiones 6 a 8. Es la prueba de que la norma hacía falta.
- `git fetch` sigue fallando desde el entorno de Claude, así que la revisión se hizo con lo que hay en el portátil. Si Adriana ha subido algo que el portátil aún no tiene, no se ha visto.

**Pendiente de investigar por el alumno:** qué significa que una rama «sale de» otra; qué pasa con un pull request cuya rama sale de otra que todavía no se ha fusionado.

**Siguiente paso:** fusionar en orden `docs-instrucciones`, `net-render`, `net-autosubida` y esta; arreglar `/api/lan` si se pide.

---

## Sesión 10 — 2026-11-18 — Icono de la bomba en la pestaña del navegador

**Autor:** Aleix.
**Herramienta:** Claude en modo Cowork, modelo configurado `claude-opus-5-5`. Es la misma conversación que las sesiones 7 y 8; la entrada va aparte porque entre medias se escribió la sesión 9 en otra conversación.

**Qué se pidió:** «Vamos a ponerle un emoticono en la página web».

**Qué se hizo:**

- `public/favicon.svg`: la bomba del juego (cuerpo negro con borde claro, boquilla, mecha y chispa) como icono de la pestaña del navegador, enlazada desde `public/index.html`.
- Se hizo el cuerpo algo más grande después de verlo a 16 px, porque se quedaba pequeño en el cuadrado.
- `CLAUDE.md`: el archivo nuevo en la estructura (sección 5).

**Decisiones y por qué:**

- **«Emoticono en la página web» se interpretó como el icono de la pestaña** (decisión de la IA, sin preguntar). Es donde una web suele llevar su emoticono y no cambia nada del juego.
- **Dibujo propio en SVG en vez del emoji 💣**, por lo mismo que en la sesión 4: un emoji cambia según el sistema y aquí la bomba es la misma que se ve en la partida. SVG se ve nítido a cualquier tamaño y no necesita herramientas para generar imágenes.
- **Borde claro alrededor de la bomba**, para que se distinga tanto en pestañas claras como oscuras (accesibilidad, contraste de elementos gráficos).
- **La rama `view-icono-pestana` sale de `docs-flujo-agentes`**, la más avanzada sin fusionar, como pide la norma de la sesión 9. Hay que fusionarla después de esa.

**Qué falló y cómo se arregló:**

- **El portátil estaba en otra rama** (`docs-flujo-agentes`), creada por otra conversación mientras esta trabajaba. Se revisó antes de empezar y se partió de ella, sin pisar nada.
- En la prueba, el servidor de pruebas de la IA sirvió el SVG como `application/octet-stream`. Es cosa de su servidor simplificado; Express, el real, lo sirve como `image/svg+xml`. Falta verlo en la web publicada cuando se fusione en `main`.

**Segundo prompt:** «No veo el emoticono, tienes que arreglarlo, yo me refiero al emoticono de ventana».

- **Causa:** el icono estaba bien hecho, pero solo en la rama `view-icono-pestana`. Render publica únicamente `main`, y todavía no se ha fusionado ningún pull request, así que la web publicada no lo tiene (la IA lo comprobó: `/favicon.svg` daba 404 en Render). La IA no lo explicó claramente al terminar la primera parte: dijo que haría falta fusionar, pero no que hasta entonces no se vería.
- **Mejora añadida:** `public/favicon.ico` (16, 32 y 48 px, generado a partir del SVG). Los navegadores piden `/favicon.ico` por su cuenta, y algunos sitios (marcadores, historial, accesos directos de Windows) no usan SVG.
- **Para verlo hace falta fusionar en `main`.** Como cada rama sale de la anterior, el pull request #6 contiene todos los cambios pendientes desde el #1: fusionarlo publica todo de una vez. Decide el alumno (o Adriana, que es quien revisa según las normas): la IA no fusiona en `main`.

**Pendiente de investigar por el alumno:** qué es un *favicon* y por qué SVG (gráficos vectoriales) se ve bien a cualquier tamaño.

**Siguiente paso:** fusionar en orden los pull requests pendientes; ver el icono en la pestaña de la web de Render.

---

## Sesión 11 — 2026-11-18 — Normas para fusionar en `main` y una rama por cambio

**Autor:** Aleix.
**Herramienta:** Claude en modo Cowork, modelo configurado `claude-opus-5-5`, con PowerShell 7 en el entorno de la IA para probar el script. Misma conversación que las sesiones 7, 8 y 10.

**Qué se pidió:**

1. Respondiendo a cómo publicar el icono: «Cambia las normas, tenéis que preguntar los agentes si queremos nosotros que ajunte todo al main, o mejor, haz un nuevo documento que haga el rol de normas, ahí cada vez que se tenga que fusionar en el main tiene que verificar un número x de cosas que podemos establecer tú y yo ahora mediante un test».
2. A mitad de la tarea: «Cada cambio nuevo tiene que ir a su rama específica, si vas a crear un documento nuevo, se crea la rama docs-… y se sube, y si se va a hacer otra cosa pues lo mismo, todo bien ordenado».

**Respuestas del alumno al test** (cuatro preguntas tipo test que hizo la IA):

- **Antes de fusionar** hay que comprobar las cuatro cosas propuestas: `npm test` pasa, prueba en el navegador (flujo completo con dos jugadores y capturas), documentación al día, y sin conflictos ni sorpresas.
- **Quién aprueba:** basta el «sí» de quien está con el agente (Aleix o Adriana). Se descartó esperar al otro coautor o a los dos.
- **Cómo:** lo hace el agente, sin clics. Se descartó que el alumno pulse «Merge» en GitHub.
- **Después de fusionar** hay que comprobar las tres cosas propuestas: la web de Render, GitHub al día y dejar avisado al otro coautor.

**Qué se hizo (rama `net-fusion-main`, el mecanismo):**

- `autosubida.ps1` y `autosubida.vbs` atienden una segunda marca, `.fusionar-main`, con el nombre de la rama dentro. La tarea de Windows trae lo último de GitHub (`git fetch`) y comprueba que la rama está subida tal cual y que contiene todo lo que ya tiene `main`. Si es así, avanza `main` hasta la rama (*fast-forward*); si no, no toca nada y explica el motivo en `autosubida.log`.
- Probado con PowerShell 7 contra un «GitHub» falso en seis casos: subir ramas sigue funcionando; fusiona una rama correcta; rechaza una rama con commits sin subir; rechaza si `main` tiene algo que la rama no tiene; rechaza una rama inexistente o `main`; sin marcas no hace nada.

**Decisiones y por qué:**

- **Fusionar = avanzar `main` (fast-forward)** (decisión de la IA): no crea commits de fusión, no cambia de rama en el portátil mientras el alumno trabaja y GitHub rechaza cualquier cosa que no sea un avance limpio, así que no se puede perder trabajo. Los pull requests incluidos aparecen como fusionados solos.
- **Una marca distinta para fusionar**, para que pedir «sube los cambios» nunca pueda tocar `main` por accidente.
- **Cada cambio en su rama** (petición 2): el mecanismo va en `net-fusion-main` y el documento de normas en `docs-normas-fusion`, que sale de la anterior. Cada una se sube con su «sí».

**Qué falló y cómo se arregló:**

- Un mensaje de error decía que la rama `main` «no existe» cuando lo que pasa es que no se puede fusionar `main` en sí misma; se corrigió el texto.
- La prueba se hizo en el entorno Linux de la IA; la primera fusión real en Windows será la prueba de verdad.

**Qué se hizo (rama `docs-normas-fusion`, el documento):**

- **`FUSION.md`, documento nuevo con las normas para fusionar en `main`:** cuándo y con el «sí» de quién, la pregunta exacta que hace el agente con el resultado de las comprobaciones, las cuatro comprobaciones de antes con el comando para cada una, cómo se fusiona (con `git push` o con la marca `.fusionar-main`), las tres comprobaciones de después y qué hacer si algo sale mal.
- `CLAUDE.md`: `FUSION.md` en la estructura y en la tabla de documentación; el paso 5 del flujo de ramas remite a `FUSION.md` en vez de «lo fusiona el otro coautor»; y la norma de **una rama por petición** queda escrita con ejemplos (petición 2).
- `AGENTS.md` y `README.md`: lo mismo, resumido.
- La rama sale de `net-fusion-main`, porque describe ese mecanismo.

**Corrección a la sesión 5:** allí se decidió que «el otro coautor revisa y fusiona; el agente nunca fusiona». Desde esta sesión basta el «sí» de quien está con el agente, siempre con las comprobaciones de `FUSION.md`. Lo decidió el alumno en el test.

**Pendiente de investigar por el alumno:** qué es una fusión *fast-forward* y en qué se diferencia de un *merge commit*.

**Siguiente paso:** escribir `FUSION.md` en la rama `docs-normas-fusion` y hacer la primera fusión siguiendo sus normas.

---

## Sesión 12 — 2026-11-18 — Lluvia de ideas y reparto de tareas para las próximas sesiones

**Autor:** Aleix.
**Herramienta:** Claude en la aplicación de escritorio, modelo `claude-opus-5-5`. Un único agente.

**Qué se pidió:**

1. «Vamos a hacer una lluvia de ideas para añadir funciones y mejoras en el juego».
2. «Okey, vamos a hacer todo esto, para ello quiero que para Adriana pongas que haga estética y usabilidad, y para Aleix jugabilidad de momento, eso irá en diario, en la sesión de hoy pendiente para hacer las próximas sesiones».

**Qué se hizo:**

- La IA leyó `CLAUDE.md`, el diario y el código, y propuso unas 30 ideas agrupadas por tema, con el esfuerzo aproximado y la rama que tocaría a cada una. Recomendó un orden para las dos semanas que quedan.
- El alumno aprobó la lista entera y la repartió por temas. Solo cambia documentación (este diario y la sección 8 de `CLAUDE.md`); no se ha tocado código.

**Reparto de tareas (pendiente para las próximas sesiones):**

*Adriana (Codex/ChatGPT) — estética y usabilidad, ramas `view-`:*

- [ ] Que los jugadores se distingan mejor en el mapa (pendiente desde la sesión 4).
- [ ] Minimapa en una esquina (el mapa de 40×30 no cabe en pantalla).
- [ ] Flecha en el borde de la pantalla que señala al portador de la bomba (o a ti, si la llevas).
- [ ] Explosión con partículas y temblor de pantalla, desactivados con `prefers-reduced-motion`.
- [ ] Mecha que se acorta y parpadea en los últimos 5 segundos.
- [ ] Estadísticas al final de la partida: veces con la bomba, tiempo con ella y gadgets pisados. Necesita que el servidor cuente esos datos; si se añaden a `GET /api/games/:id`, coordinar con Aleix porque toca `server/game.js`.
- [ ] Elegir color y forma en la sala de espera.
- [ ] Pantalla de «cómo se juega» con los iconos animados.

*Aleix (Claude) — jugabilidad, ramas `game-`:*

- [ ] Bots para rellenar la sala (para probar solo y para la demo). Recomendada como la primera.
- [ ] Esprint con tiempo de recarga (tecla Espacio).
- [ ] Gadgets nuevos: escudo (no se puede recibir la bomba 3 s), portales y hielo. Valores en `config.js`; los dibujos de los iconos siguen la norma de accesibilidad (sección 6.4).
- [ ] Mapa que se encoge en las últimas rondas.
- [ ] Dos bombas a la vez con 6 a 8 jugadores.
- [ ] Partidas al mejor de 3 rondas con puntos acumulados.
- [ ] Tipos de mapa (laberinto, arena abierta, islas). **Ojo:** en la sesión 6 se dijo que el Codex de Adriana iba a trabajar en mapas y selección de sala; confirmar con ella antes de empezar.

*Sin asignar todavía (se decide más adelante):*

- Pendientes de red: el endpoint `GET /api/lan` del servidor (sesión 5) y la partida real con otra persona desde otro PC.
- Accesibilidad extra: modo de alto contraste o para daltónicos, teclas configurables, texto más grande, aviso por `aria-live` a los 5 segundos de la explosión. Encaja con el trabajo de Adriana (`view-`).
- Red y salas (`net-`): reconexión al refrescar la página, botón de revancha, modo espectador o proyector para la exposición, indicador de ping, lista de salas abiertas o «partida rápida».
- Fuera de lo que permite `CLAUDE.md` salvo que se pida expresamente: sonido con la Web Audio API (sin archivos ni dependencias, con botón de silencio) y selector de idiomas con catalán (`i18n.js` ya lo prepara).

**Decisiones y por qué:**

- **Las ideas las propuso la IA; el alumno decidió hacerlas todas y el reparto** (Adriana estética y usabilidad, Aleix jugabilidad). Reparto por temas para que cada uno trabaje en archivos distintos: lo visual vive sobre todo en `public/`, la jugabilidad en `server/game.js` y `server/config.js`.
- **«De momento»:** el reparto puede cambiar; lo que queda sin asignar se reparte cuando alguno termine.
- Todo lo nuevo sigue las normas de siempre: una rama por idea, textos en `i18n.js`, números en `config.js`, los cinco puntos de accesibilidad y `npm test` antes de subir.
- Rama `docs-reparto-ideas`, desde `main` (todas las ramas anteriores ya estaban fusionadas; `autosubida.log` lo confirma con la fusión de `docs-normas-fusion`).

**Qué falló y cómo se arregló:**

- `git fetch` sigue sin funcionar desde el entorno de Claude (403 del proxy), así que no se ha podido ver si Adriana ha subido algo nuevo. Se ha trabajado con lo que hay en el portátil: hace falta que Aleix haga `git pull` si sospecha que hay cambios suyos.
- Al ser una lluvia de ideas, no hay nada que probar en el juego; `npm test` se ejecuta igualmente antes del commit.

**Pendiente de investigar por el alumno:** qué es `prefers-reduced-motion` y por qué importa para la accesibilidad; cómo se programa un bot sencillo (moverse hacia un objetivo o huir de él) en un servidor autoritativo.

**Siguiente paso:** Aleix empieza por los bots (`game-bots`); Adriana, por que los jugadores se distingan mejor (`view-jugadores-visibles`). Avisar a Adriana de este reparto y de que haga `git pull`.

---

## Sesión 13 — 2026-11-18 — Tareas ligeras para el ordenador de Adriana

**Autor:** Aleix.
**Herramienta:** Claude en la aplicación de escritorio, modelo `claude-opus-5-5`. Misma conversación que las sesiones 5 y 9.

**Qué se pidió:** «Modifica los agentes para especificar que Adriana no podrá hacer tareas pesadas por el equipo que tiene, es decir, para hacer views okey, hacer tareas más pesadas no; si va a hacer tareas más pesadas, preguntar a Adriana».

**Qué se hizo:**

- **`CLAUDE.md`**, al principio (junto a «Equipo»): tabla de tareas ligeras (se hacen sin preguntar) y pesadas (se pregunta a Adriana antes), la frase con la que preguntar y qué hacer si dice que no. En la sección 8, el reparto recuerda que a Adriana solo se le dan tareas ligeras.
- **`AGENTS.md`**: la norma resumida como primer punto de «Lo imprescindible», porque es lo que lee el Codex de Adriana.
- Rama `docs-equipo-adriana`, que sale de `docs-reparto-ideas` (sesión 12, sin fusionar todavía y con el reparto de tareas que esta norma completa). Fusionar después de ella.

**Decisiones y por qué:**

- **Qué cuenta como «pesado» lo concretó la IA**, porque el alumno solo dio el ejemplo de las vistas: todo lo que carga el ordenador (varias pestañas o el servidor encendido mucho rato, pruebas repetidas, instalar dependencias, clonar, empaquetar) y lo que sale de lo visual (servidor, jugabilidad, red, cambios grandes, fusionar en `main`, que exige la prueba con dos jugadores). En caso de duda, se pregunta.
- **Se pregunta en vez de prohibir**, como pidió el alumno: Adriana decide si la hace igualmente o se la pasa a Aleix.
- **De su lista de la sesión 12, una tarea es en parte pesada:** las estadísticas del final necesitan que el servidor cuente datos. Su agente hará la parte visual y preguntará antes de tocar `server/`. El resto de su lista es `view-`.
- `FUSION.md` no se ha tocado: la norma de `CLAUDE.md` ya dice que fusionar es pesado para Adriana, y `FUSION.md` solo se cambia si se pide.

**Qué falló y cómo se arregló:**

- Al empezar, la revisión del repositorio encontró tres sesiones nuevas (10 a 12), `main` ya con fusiones y la rama `docs-reparto-ideas`; se leyó todo antes de editar y se partió de esa rama.
- **El diario no llegó a tiempo al disco del portátil** y el primer commit salió sin él (solo `CLAUDE.md` y `AGENTS.md`). La comprobación de la sección 6.2 (comparar el archivo del disco antes del commit) lo detectó; se volvió a copiar y se añadió al mismo commit antes de subir nada. Es el mismo tipo de fallo que el de la sesión 3.
- `git fetch` sigue sin funcionar desde el entorno de Claude: solo se ha visto lo que hay en el portátil de Aleix.

**Pendiente de investigar por el alumno:** qué hace que una tarea sea pesada para un ordenador (memoria, procesador, varias pestañas del navegador, un servidor encendido).

**Siguiente paso:** avisar a Adriana de la norma y de que haga `git pull` cuando se fusione; seguir con el reparto de la sesión 12.
