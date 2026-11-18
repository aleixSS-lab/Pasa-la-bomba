@echo off
rem Instala la subida a GitHub bajo peticion, en ESTE ordenador (sirve igual para Aleix y para Adriana).
rem Crea una tarea programada de Windows que cada minuto mira si un agente ha dejado el
rem archivo .subir-ahora (lo hace solo despues de preguntar y de que digas que si).
rem Si lo hay, sube las ramas con commits nuevos (nunca main) sin abrir ventanas.
rem Lo que hace queda en autosubida.log. Para quitarla: quitar-autosubida.bat
title Instalar subida a GitHub
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo  Git no esta instalado en este ordenador. Instalalo desde https://git-scm.com y repite.
  pause
  exit /b 1
)
schtasks /Create /F /TN "PasaLaBomba-autosubida" /SC MINUTE /MO 1 /TR "wscript.exe \"%~dp0autosubida.vbs\"" >nul
if errorlevel 1 (
  echo  No se ha podido crear la tarea programada.
  pause
  exit /b 1
)
echo.
echo  Subida bajo peticion instalada en este ordenador.
echo  Cuando un agente te pregunte si sube los cambios y digas que si, se subiran en un minuto.
echo  Registro: autosubida.log    Para quitarla: quitar-autosubida.bat
echo.
timeout /t 8
