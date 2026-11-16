@echo off
rem Arranca el servidor de Pasa la bomba y el tunel de Cloudflare.
rem Sin acentos a proposito, para evitar problemas de codificacion en la consola de Windows.
title Pasa la bomba
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js no esta instalado. Descargalo gratis de https://nodejs.org ^(version LTS^)
  echo  y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias, solo la primera vez...
  call npm install
  if errorlevel 1 (
    echo  No se han podido instalar las dependencias. Revisa la conexion a internet.
    pause
    exit /b 1
  )
)

echo Arrancando el servidor en otra ventana...
start "Servidor Pasa la bomba" cmd /k "node server/index.js"

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo  El servidor ya funciona, pero cloudflared no esta instalado, asi que no hay tunel.
  echo  Para instalarlo gratis:  winget install --id Cloudflare.cloudflared
  echo.
  echo  Mientras tanto se puede jugar en la misma red WiFi con la direccion
  echo  "En la red local" que aparece en la ventana del servidor.
  echo.
  pause
  exit /b 0
)

echo.
echo  ==============================================================
echo   Busca abajo la direccion  https://....trycloudflare.com
echo   y compartela con los demas jugadores.
echo   Para parar el tunel pulsa Ctrl+C. Cierra tambien la ventana
echo   del servidor cuando termines.
echo  ==============================================================
echo.
cloudflared tunnel --url http://localhost:3000
pause
