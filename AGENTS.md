# AGENTS.md

Instrucciones para agentes de IA (Codex, ChatGPT y otros) que trabajen en **Pasa la bomba**.

Las normas del proyecto están en **[CLAUDE.md](CLAUDE.md)** y valen para cualquier agente, no solo para Claude. Léelo entero antes de tocar nada y síguelo como si estuviera escrito aquí.

Lo imprescindible:

- Todo en castellano. Nombres de código en inglés.
- No salgas del stack: Node.js, Express, Socket.IO y cliente sin framework. Nada nuevo sin permiso.
- **Antes de hacer nada nuevo, ponte al día con el repositorio:** `git fetch --all`, `git pull` en `main`, y revisa `git log`, el diario y las ramas y pull requests del otro coautor **buscando lo que puedas aprovechar**. Si alguien está haciendo lo mismo que te piden, avisa antes de empezar. Vuelve a leer `CLAUDE.md` después del pull, por si ha cambiado.
- Después: `git status` y `npm test`.
- **Si has clonado el repositorio de cero**, `node_modules/` no viene incluido (está en `.gitignore`) y tu entorno puede no tener red: antes de `npm test`, pide al usuario que haga doble clic en `probar.bat` en esa misma carpeta y después lee `prueba.log`. Mejor aún: trabaja en la copia del repositorio que el usuario ya tiene instalada en vez de clonar otra.
- **Una rama por cada cosa nueva**, con prefijo `view-`, `game-`, `net-`, `fix-`, `docs-` o `test-` (ver `CLAUDE.md` 6.3). Nunca trabajes en `main`. Sale de `main` actualizado, **salvo que una rama sin fusionar tenga algo que te sirva o toque los mismos archivos**: entonces sale de esa (`git checkout -b <nueva> origin/<esa-rama>`), sin clonar otra vez el repositorio. Apúntalo en el diario y en el pull request.
- **Al terminar cada tarea, actualiza la documentación** en la misma rama: siempre la entrada y el resumen de `DIARIO.md`; `README.md`, `CLAUDE.md` o este archivo si lo que has cambiado les afecta (`CLAUDE.md` 0 bis).
- Antes de commit y push: `npm test` y una entrada nueva al final de `DIARIO.md` con **Autor: Adriana** (o quien corresponda) y **Herramienta:** el agente y el modelo usados.
- **Pregunta antes de subir:** «¿Subo los cambios a GitHub?». Con el «sí», haz `git push -u origin <rama>`; si tu entorno no puede, crea el archivo vacío `.subir-ahora` en la raíz y la tarea programada de Windows lo sube en un minuto (`CLAUDE.md` 6.3; se instala una vez por ordenador con `instalar-autosubida.bat`). El pull request a `main` lo abre GitHub Actions al llegar la rama. Lo fusiona el otro coautor; las ramas no se borran.
- **Cada petición distinta, en su propia rama** (un documento nuevo, `docs-`; un cambio visual, `view-`...), y cada rama se sube al terminarla.
- **Para fusionar en `main`, sigue [`FUSION.md`](FUSION.md):** cuatro comprobaciones antes (`npm test`, navegador, documentación, sin conflictos), el «sí» de quien está contigo, `git push origin <rama>:main` sin forzar, y tres comprobaciones después (GitHub, web de Render, avisar al otro coautor).
- Si encuentras un fallo que no te han pedido arreglar, avisa y pregunta.
