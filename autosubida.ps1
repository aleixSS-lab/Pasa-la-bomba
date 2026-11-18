# Sube a GitHub las ramas con commits nuevos, pero SOLO cuando alguien lo ha pedido:
# el agente, después de que el usuario diga que sí, crea el archivo .subir-ahora.
# La tarea programada que crea instalar-autosubida.bat lo comprueba cada minuto,
# con la sesión de GitHub del usuario de Windows (la misma que usa subir.bat).
# Nunca sube main (ahí solo se entra por pull request) y nunca fuerza nada.

Set-Location -LiteralPath $PSScriptRoot
$env:GIT_TERMINAL_PROMPT = '0'   # sin ventanas pidiendo contraseña: si falla, se apunta en el log
$env:GCM_INTERACTIVE = 'never'
$log = Join-Path $PSScriptRoot 'autosubida.log'
$request = Join-Path $PSScriptRoot '.subir-ahora'

# Sin petición de subida, no se hace nada.
if (-not (Test-Path -LiteralPath $request)) { exit 0 }

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

# La petición se atiende ahora: se borra para que no se repita, pase lo que pase.
Remove-Item -LiteralPath $request -Force -ErrorAction SilentlyContinue
Write-Log 'Petición de subida recibida.'
$pushed = 0

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
        $pushed++
    } else {
        Write-Log "ERROR al subir ${branch}: $output"
    }
}

if ($pushed -eq 0) { Write-Log 'Nada nuevo que subir.' }
Write-Log 'Fin.'
