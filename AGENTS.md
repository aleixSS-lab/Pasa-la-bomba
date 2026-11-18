# AGENTS.md

Instrucciones para agentes de IA (Codex, ChatGPT y otros) que trabajen en **Pasa la bomba**.

Las normas del proyecto están en **[CLAUDE.md](CLAUDE.md)** y valen para cualquier agente, no solo para Claude. Léelo entero antes de tocar nada y síguelo como si estuviera escrito aquí.

Lo imprescindible:

- Todo en castellano. Nombres de código en inglés.
- No salgas del stack: Node.js, Express, Socket.IO y cliente sin framework. Nada nuevo sin permiso.
- **Antes de hacer nada nuevo, ponte al día con el repositorio:** `git fetch --all`, `git pull` en `main`, y revisa `git log` y las ramas y pull requests del otro coautor. Si algo toca lo mismo que te piden, avisa antes de empezar. Vuelve a leer `CLAUDE.md` después del pull, por si ha cambiado.
- Después: `git status` y `npm test`.
- **Si has clonado el repositorio de cero**, `node_modules/` no viene incluido (está en `.gitignore`) y tu entorno puede no tener red: antes de `npm test`, pide al usuario que haga doble clic en `probar.bat` en esa misma carpeta y después lee `prueba.log`. Mejor aún: trabaja en la copia del repositorio que el usuario ya tiene instalada en vez de clonar otra.
- **Una rama por cada cosa nueva**, creada desde `main` actualizado, con prefijo `view-`, `game-`, `net-`, `fix-`, `docs-` o `test-` (ver `CLAUDE.md` 6.3). Nunca trabajes en `main`.
- Antes de commit y push: `npm test` y una entrada nueva al final de `DIARIO.md` con **Autor: Adriana** (o quien corresponda) y **Herramienta:** el agente y el modelo usados.
- Sube la rama y abre un pull request a `main`. Lo fusiona el otro coautor; las ramas no se borran.
- Si encuentras un fallo que no te han pedido arreglar, avisa y pregunta.
