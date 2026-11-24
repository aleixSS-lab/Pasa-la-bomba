# 💣 Pasa la bomba

Juego web multijugador *hyper-casual* para el **DevChallenge3**. De 2 a 8 jugadores, cada uno desde su ordenador y su navegador, comparten un mapa 2D generado al azar. Alguien lleva una bomba a punto de estallar y tiene que pasársela a otro antes de que explote. Gana el último que quede en pie.

Todo el proyecto se ha desarrollado con agentes de IA (Claude). Cómo se hizo, qué se pidió y qué falló está en **[DIARIO.md](DIARIO.md)**.

## Jugar ahora

**[https://pasa-la-bomba-0db0.onrender.com](https://pasa-la-bomba-0db0.onrender.com)**

Abre el enlace, crea una sala y pasa el enlace de invitación a los demás. Está alojado gratis en Render: si nadie ha jugado en los últimos 15 minutos, la primera carga tarda alrededor de un minuto mientras el servidor se despierta. Si se reinicia, las salas abiertas se pierden.

## Cómo se juega

1. Escribe un apodo y **crea una sala**, eligiendo uno de los tres mapas pixelados, o **únete** con un código de 4 letras (o con el enlace de invitación).
2. En la sala de espera, el máster puede cambiar el mapa y el modo; cada jugador puede escoger una forma y un color para su skin. El máster inicia la partida cuando estén todos listos.
3. Tras una cuenta atrás, un jugador al azar recibe la **bomba**. Su temporizador no se reinicia al pasarla.
4. Quien la lleva corre un poco más. Para pasarla, **toca a otro jugador**. Quien la acaba de pasar es inmune un instante, y quien la recibe se queda parado un momento, para que no se la devuelvan sin parar.
5. Los **estanques** del mapa te teletransportan a una zona lejana y despejada.
6. Cuando la bomba explota, su portador queda **eliminado** y pasa a ser espectador. Poco después, otro jugador vivo recibe una bomba nueva.
7. Pulsa **Espacio** para esprintar: vas mucho más rápido un momento y después tiene que recargarse.
8. **Gana el último vivo.** También puedes elegir **Coin Rush**: recoge monedas durante 90 segundos; gana quien consiga más.

En el modo de bomba pueden aparecer cuatro variantes: estándar, congelada (ralentiza a quienes están cerca), explosiva (radio mayor) y misteriosa (su efecto se revela al explotar). Al final se muestra la clasificación, estadísticas de cada jugador y premios especiales.

Gadgets repartidos por el mapa (al pisarlos se gastan y reaparecen en otro sitio):

| Gadget | Efecto |
|---|---|
| Trampa de oso | Te deja inmóvil un momento |
| Chicle | Te frena a la mitad de velocidad durante unos segundos |
| Acelerador | Te hace más rápido durante unos segundos |

Los tiempos y multiplicadores exactos están en [`server/config.js`](server/config.js) y se pueden ajustar.

### Controles

| Acción | Tecla |
|---|---|
| Moverse | **WASD** o **flechas** |
| Esprint (con recarga) | **Espacio** |
| Menús y sala de espera | **Tab** y **Enter** |

## Cómo arrancarlo en tu ordenador

No hace falta para jugar (usa el enlace de arriba), pero sirve como plan B o para desarrollar. Necesitas [Node.js](https://nodejs.org) 18 o superior. El servidor corre en un único ordenador; los demás jugadores solo necesitan un navegador.

### En Windows, con doble clic

| Archivo | Qué hace |
|---|---|
| `probar.bat` | Instala las dependencias y ejecuta la prueba automática. Deja el resultado en `prueba.log`. |
| `start.bat` | Arranca el servidor y, si está instalado `cloudflared`, el túnel para jugar por internet. Muestra la dirección que hay que compartir. |
| `instalar-autosubida.bat` | Para quien desarrolla (una vez por ordenador): permite que los agentes de IA suban los cambios a GitHub cuando les dices que sí, sin clics. Nunca sube `main`. También pone al día con `main` las ramas sin fusionar que se quedan atrás. `quitar-autosubida.bat` lo quita. |

### Desde la terminal

```
npm install     instala las dependencias (solo la primera vez)
npm start       arranca el servidor en http://localhost:3000
npm test        comprueba las reglas y simula una partida con 3 jugadores (unos 10 s)
```

### Cómo se conectan los demás jugadores

- **Mismo ordenador:** `http://localhost:3000` (solo sirve para probar).
- **Misma red WiFi:** `http://IP-del-servidor:3000`. La IP aparece en la consola al arrancar. Si otro PC no puede entrar, permite Node.js en el Firewall de Windows. Algunas redes de centros educativos aíslan los dispositivos entre sí; en ese caso, usa el túnel.
- **Por internet:** instala `cloudflared` gratis (`winget install --id Cloudflare.cloudflared`) y ejecuta `start.bat`. Comparte la dirección `https://….trycloudflare.com` que aparece; cambia cada vez que se arranca.

## API

El servidor gestiona las partidas y devuelve el resultado:

```
GET /api/games/:codigo
```

```json
{
  "id": "KQPR",
  "status": "finished",
  "mode": "bomb",
  "bombSeconds": 30,
  "modeSeconds": 90,
  "players": [
    { "name": "Luis",  "place": 1, "eliminated": false },
    { "name": "Ana",   "place": 2, "eliminated": true },
    { "name": "Marta", "place": 3, "eliminated": true }
  ],
  "eliminationOrder": ["Marta", "Ana"],
  "winner": "Luis",
  "winners": ["Luis"],
  "statistics": [
    { "name": "Luis", "survivalTime": 42.5, "boosts": 2, "teleports": 1,
      "traps": 0, "eliminations": 1, "bombsPassed": 2, "bombsReceived": 1,
      "distance": 86, "coins": 0, "wins": 1 }
  ],
  "awards": [{ "key": "fastest", "player": "Luis" }]
}
```

`status` puede ser `lobby`, `playing` o `finished`. Si la partida no existe, responde `404` con `{ "error": "game_not_found" }`. El resultado sigue disponible aunque todos salgan de la sala.

La partida en tiempo real va por **WebSockets** (Socket.IO). Los eventos están descritos en [`CLAUDE.md`](CLAUDE.md#5-arquitectura).

## Cómo está hecho

- **Servidor:** Node.js, Express y Socket.IO. Es *autoritativo*: los navegadores solo envían las teclas pulsadas, y el servidor mueve a los jugadores, decide quién lleva la bomba y quién gana. Envía el estado 20 veces por segundo.
- **Cliente:** HTML, CSS, Canvas 2D y JavaScript, sin frameworks ni compilación.
- **Publicación:** Render, plan gratuito. Cada cambio que se fusiona en la rama `main` se publica solo.
- **Flujo de trabajo:** una rama por cambio; al subirla, GitHub Actions abre el pull request a `main` automáticamente, y el otro coautor lo revisa y lo fusiona.
- **Sin login ni base de datos:** apodo y código de sala; todo vive en memoria.
- **Mapas:** bosque con árboles y una laguna, desierto con cactus, rocas y un oasis, y ruinas con columnas rotas y una fuente antigua. Hay estanques de varias formas y tamaños que teletransportan a otra zona; el tablero reserva sus alrededores para que sigan accesibles.
- **Modos:** Pasa la bomba y Coin Rush (recuento de monedas durante 90 segundos). La bomba puede ser estándar, congelada, explosiva o misteriosa.
- **Resultados:** supervivencia, aceleradores, teletransportes, trampas, eliminaciones, bombas pasadas y recibidas, distancia, monedas y victorias de cada jugador; añade premios informales.
- **Personalización:** en la sala de espera cada jugador elige entre círculo, cuadrado, triángulo, rombo, estrella, hexágono, cruz y pentágono, además de cualquier color. La forma y el color se comparten con toda la sala.

```
server/   index.js (salas, WebSockets y API) · game.js (reglas, sin red) · config.js (valores ajustables)
public/   index.html · css/style.css · js/main.js (pantallas y conexión) · js/game.js (dibujo y teclado) · js/i18n.js (textos)
test/     smoke.js (prueba automática)
```

## Accesibilidad

- Cada jugador se distingue por **color y forma**, con su apodo visible. Gadgets y bomba son dibujos reconocibles y siempre aparecen con su nombre en la leyenda.
- Contraste mínimo de 4,5:1 en los textos.
- Todo se usa con **teclado**, con el foco visible.
- Los sucesos importantes (quién entra, quién tiene la bomba, quién explota, quién gana) se anuncian al **lector de pantalla**.

## Documentación del proyecto

| Archivo | Para qué |
|---|---|
| [DIARIO.md](DIARIO.md) | Diario de desarrollo con IA: herramientas, prompts, decisiones y fallos. Material de la presentación. |
| [CLAUDE.md](CLAUDE.md) | Normas que sigue cualquier agente de IA que trabaje en el proyecto. |
| [AGENTS.md](AGENTS.md) | Entrada para Codex y otros agentes; remite a `CLAUDE.md`. |
| [FUSION.md](FUSION.md) | Qué se comprueba antes y después de fusionar un cambio en `main` (lo que se publica). |

## Autores

**Aleix** y **Adriana**, con la ayuda de Claude (Anthropic) y Codex/ChatGPT (OpenAI). Proyecto de clase sin fines comerciales, DevChallenge3, 2026.
