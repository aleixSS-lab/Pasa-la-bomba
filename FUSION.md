# FUSION.md — Normas para fusionar en `main`

`main` es lo que está publicado: cada vez que avanza, Render vuelve a publicar el juego en https://pasa-la-bomba-0db0.onrender.com. Por eso a `main` solo se llega siguiendo estas normas, que valen para cualquier agente (Claude, Codex u otro). Las decidió Aleix en la sesión 11 respondiendo a un test; solo se cambian si el usuario lo pide, y en una rama `docs-`.

## 1. Cuándo y con el «sí» de quién

- Se fusiona **solo con el «sí» de quien está hablando con el agente** (Aleix o Adriana) en esa misma conversación. No hace falta esperar al otro coautor.
- El agente puede proponerlo cuando una rama está terminada y subida, o hacerlo cuando el usuario lo pide. **Nunca sin preguntar.**
- Primero se hacen las comprobaciones de la sección 2. Después se pregunta, enseñando el resultado:

  > ¿Fusiono `<rama>` en `main`? Incluye: `<lista de ramas o pull requests>`. Comprobaciones: npm test ✓ · navegador ✓ · documentación ✓ · sin conflictos ✓.

- **Qué incluye:** si la rama sale de otras que aún no están en `main`, al fusionarla entran todas. Lista los commits con `git log --oneline origin/main..<rama>` y dile al usuario qué ramas y pull requests van dentro.

## 2. Comprobaciones antes de fusionar (todas obligatorias)

Si una sola falla, **no se fusiona**: explica qué falla, arréglalo (en la misma rama si es parte de ella, o en una rama `fix-`) y vuelve a empezar.

| # | Qué | Cómo se comprueba |
|---|---|---|
| 1 | **`npm test` pasa** | En la rama que se va a fusionar, `npm test` termina con «Todo correcto». |
| 2 | **Prueba en el navegador** | Con el código de esa rama: dos jugadores, crear sala, unirse, empezar, jugar hasta ver el resultado (o, como mínimo, una bomba y una eliminación). Revisa capturas de pantalla ampliadas. Si el cambio es visual, comprueba que lo nuevo se ve. |
| 3 | **Documentación al día** | Lo que pide `CLAUDE.md`, sección 0 bis: entrada y resumen de `DIARIO.md`, y `README.md`, `CLAUDE.md` y `AGENTS.md` si les afecta. Repasa `git diff --stat origin/main...<rama>`: cada archivo cambiado tiene que estar explicado en el diario. |
| 4 | **Sin conflictos ni sorpresas** | `git status` limpio (nada sin commit). La rama está subida tal cual (`git status -sb` no dice *ahead*). Contiene todo lo de `main`: `git merge-base --is-ancestor origin/main <rama>` (si tu entorno no puede hacer `git fetch`, confirma con `git ls-remote` que el `main` de GitHub es el que tienes). En el diff no hay nada que no se haya pedido. |

## 3. Cómo se fusiona

Siempre como **avance de `main`** (*fast-forward*): `main` pasa a apuntar al último commit de la rama. Sin commits de fusión, sin forzar y sin reescribir nada.

- **Si tu entorno puede hacer push** (por ejemplo, Codex en el PC de Adriana): `git fetch`, repite la comprobación 4 y `git push origin <rama>:main`. Nunca `--force`.
- **Si no puede** (Claude en Cowork): escribe el nombre de la rama, solo eso, en el archivo `.fusionar-main` de la raíz del proyecto. En menos de un minuto, la tarea programada de Windows (`autosubida.ps1`) trae lo último de GitHub, repite la comprobación 4 y avanza `main`. El resultado queda en `autosubida.log`: «Fusionada `<rama>` en main» o un ERROR que explica por qué no.
- **Si `main` tiene algo que la rama no tiene** (el otro coautor fusionó antes): pon la rama al día con `git merge origin/main` dentro de la rama, resuelve los conflictos con el usuario si los hay, repite las comprobaciones y vuelve a preguntar.
- Nunca: commits directos en `main`, `--force` ni `rebase` de algo ya subido.

## 4. Comprobaciones después de fusionar (todas obligatorias)

| # | Qué | Cómo se comprueba |
|---|---|---|
| 1 | **GitHub al día** | `git ls-remote origin refs/heads/main` devuelve el último commit de la rama. Los pull requests incluidos aparecen como fusionados (GitHub los marca solo). |
| 2 | **La web de Render** | Espera unos 2 o 3 minutos a que Render publique (uno más si estaba dormido). Abre la web, crea una sala y comprueba que lo nuevo está. Si Render falla al publicar, mira el registro en su panel y avisa al usuario. |
| 3 | **Avisar al otro coautor** | Antes de fusionar, la entrada del diario de la rama dice qué se fusiona en `main` y qué incluye, así que queda escrito en `main`. Además, dile al usuario que avise al otro coautor de que haga `git pull` antes de seguir trabajando. El resultado de estas comprobaciones va en la siguiente entrada del diario. |

## 5. Si algo sale mal después de fusionar

No se reescribe `main`. Se abre una rama `fix-` (o se deshace con `git revert` en una rama nueva), se siguen estas mismas normas y se fusiona el arreglo. Mientras tanto, el plan B es el portátil (`npm start` o `start.bat`).
