# Sube a GitHub las ramas con commits nuevos, pero SOLO cuando alguien lo ha pedido:
# el agente, después de que el usuario diga que sí, crea el archivo .subir-ahora.
# Y fusiona una rama en main SOLO si el agente ha creado .fusionar-main (con el nombre
# de la rama dentro) tras pasar las comprobaciones de FUSION.md y el «sí» del usuario.
# La tarea programada que crea instalar-autosubida.bat lo comprueba cada minuto,
# con la sesión de GitHub del usuario de Windows (la misma que usa subir.bat).
# La subida de ramas nunca toca main; main solo avanza con .fusionar-main. Nunca se fuerza nada.

Set-Location -LiteralPath $PSScriptRoot
$env:GIT_TERMINAL_PROMPT = '0'   # sin ventanas pidiendo contraseña: si falla, se apunta en el log
$env:GCM_INTERACTIVE = 'never'
$log = Join-Path $PSScriptRoot 'autosubida.log'
$request = Join-Path $PSScriptRoot '.subir-ahora'
$mergeRequest = Join-Path $PSScriptRoot '.fusionar-main'

# Sin ninguna petición, no se hace nada.
if (-not (Test-Path -LiteralPath $request) -and -not (Test-Path -LiteralPath $mergeRequest)) { exit 0 }

function Write-Log($text) {
    Add-Content -LiteralPath $log -Encoding UTF8 -Value ('{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text)
}

# El log no crece sin fin: se quedan las últimas 300 líneas.
if ((Test-Path -LiteralPath $log) -and (Get-Item -LiteralPath $log).Length -gt 200KB) {
    $last = Get-Content -LiteralPath $log -Tail 300
    Set-Content -LiteralPath $log -Value $last -Encoding UTF8
}

# Si git está ocupado (un agente haciendo commit, una fusión a medias), se espera a la próxima vuelta.
if (Get-ChildItem -LiteralPath '.git' -Filter '*.lock' -ErrorAction SilentlyContinue) { exit 0 }
foreach ($busy in 'MERGE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD') {
    if (Test-Path -LiteralPath (Join-Path '.git' $busy)) { exit 0 }
}

function Push-Branches {
    # La petición se atiende ahora: se borra para que no se repita, pase lo que pase.
    Remove-Item -LiteralPath $request -Force -ErrorAction SilentlyContinue
    Write-Log 'Petición de subida recibida.'
    $script:pushed = 0

    foreach ($branch in (git for-each-ref --format='%(refname:short)' refs/heads)) {
        if ($branch -eq 'main') { continue }
        $local = git rev-parse "refs/heads/$branch"
        $remote = git rev-parse --verify --quiet "refs/remotes/origin/$branch"
        if ($remote -and $remote -eq $local) { continue }   # ya está subida

        if ($remote) {
            # Solo avances normales: si GitHub tiene commits que aquí no están, no se toca.
            git merge-base --is-ancestor $remote $local
            if ($LASTEXITCODE -ne 0) {
                Write-Log "AVISO ${branch}: GitHub tiene commits que aquí no están. No se sube; hace falta git pull."
                continue
            }
        }

        $output = (git push -u origin $branch 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Subida ${branch} ($($local.Substring(0, 7)))"
            $script:pushed++
        } else {
            Write-Log "ERROR al subir ${branch}: $output"
        }
    }

    if ($script:pushed -eq 0) { Write-Log 'Nada nuevo que subir.' }
}

# Fusionar en main = avanzar main hasta la rama en GitHub (fast-forward): sin forzar, sin
# commits de fusión y sin cambiar de rama en el portátil. Si main tiene algo que la rama
# no tiene, GitHub lo rechazaría igualmente; aquí se comprueba antes para explicarlo.
function Merge-IntoMain {
    $branch = (Get-Content -LiteralPath $mergeRequest -Raw -ErrorAction SilentlyContinue)
    if ($branch) { $branch = $branch.Trim() }
    Remove-Item -LiteralPath $mergeRequest -Force -ErrorAction SilentlyContinue
    Write-Log "Petición de fusión en main: ${branch}"

    if (-not $branch -or $branch -eq 'main' -or -not (git rev-parse --verify --quiet "refs/heads/$branch")) {
        Write-Log "ERROR fusión: '${branch}' no es una rama válida (no existe en este ordenador o es main)."; return
    }
    git fetch --quiet origin
    if ($LASTEXITCODE -ne 0) { Write-Log 'ERROR fusión: no se ha podido conectar con GitHub (git fetch).'; return }

    $local = git rev-parse "refs/heads/$branch"
    $remote = git rev-parse --verify --quiet "refs/remotes/origin/$branch"
    if ($remote -ne $local) {
        Write-Log "ERROR fusión: ${branch} no está subida tal cual a GitHub. Súbela antes (.subir-ahora)."; return
    }
    git merge-base --is-ancestor refs/remotes/origin/main $local
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERROR fusión: ${branch} no contiene lo último de main. Hay que ponerla al día con main antes."; return
    }

    $output = (git push origin "${local}:refs/heads/main" 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { Write-Log "ERROR fusión: $output"; return }
    git fetch --quiet origin
    if ((git rev-parse --abbrev-ref HEAD) -ne 'main') { git branch -f main refs/remotes/origin/main 2>&1 | Out-Null }
    Write-Log "Fusionada ${branch} en main ($($local.Substring(0, 7)))"
}

if (Test-Path -LiteralPath $request) { Push-Branches }
if (Test-Path -LiteralPath $mergeRequest) { Merge-IntoMain }
Write-Log 'Fin.'
