# AGENTS.md

Instrucciones para agentes de IA (Codex, ChatGPT y otros) que trabajen en **Pasa la bomba**.

Las normas del proyecto están en **[CLAUDE.md](CLAUDE.md)** y valen para cualquier agente, no solo para Claude. Léelo entero antes de tocar nada y síguelo como si estuviera escrito aquí.

Lo imprescindible:

- Todo en castellano. Nombres de código en inglés.
- No salgas del stack: Node.js, Express, Socket.IO y cliente sin framework. Nada nuevo sin permiso.
- Antes de nada: `git status` y `npm test`.
- **Una rama por cada cosa nueva**, creada desde `main` actualizado, con prefijo `view-`, `game-`, `net-`, `fix-`, `docs-` o `test-` (ver `CLAUDE.md` 6.3). Nunca trabajes en `main`.
- Antes de commit y push: `npm test` y una entrada nueva al final de `DIARIO.md` con **Autor: Adriana** (o quien corresponda) y **Herramienta:** el agente y el modelo usados.
- Sube la rama y abre un pull request a `main`. Lo fusiona el otro coautor; las ramas no se borran.
- Si encuentras un fallo que no te han pedido arreglar, avisa y pregunta.
