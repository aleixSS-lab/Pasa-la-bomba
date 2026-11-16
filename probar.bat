@echo off
rem Instala las dependencias y ejecuta la prueba automatica.
rem Guarda todo lo que sale en prueba.log para poder revisarlo despues.
title Prueba de Coin Rush
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado. Descargalo gratis de https://nodejs.org ^(version LTS^). > prueba.log
  type prueba.log
  pause
  exit /b 1
)

echo Instalando dependencias y probando. Puede tardar un minuto...
echo ---- node -v ---- > prueba.log
node -v >> prueba.log 2>&1
echo ---- npm install ---- >> prueba.log
call npm install >> prueba.log 2>&1
echo ---- npm test ---- >> prueba.log
call npm test >> prueba.log 2>&1
echo ---- fin ---- >> prueba.log

type prueba.log
echo.
echo Resultado guardado en prueba.log
pause
