# Diario de desarrollo — Coin Rush (DevChallenge3)

Registro de cómo se ha construido el juego con agentes de IA. Cada sesión añade una entrada al final. Las normas del diario están en `CLAUDE.md`, sección 7.

---

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
