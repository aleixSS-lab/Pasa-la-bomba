@echo off
rem Instala la subida automatica a GitHub: una tarea programada de Windows que,
rem cada 2 minutos, sube las ramas con commits nuevos (nunca main) sin abrir ventanas.
rem Lo que hace queda apuntado en autosubida.log. Para quitarla: quitar-autosubida.bat
title Instalar subida automatica
cd /d "%~dp0"
schtasks /Create /F /TN "PasaLaBomba-autosubida" /SC MINUTE /MO 2 /TR "wscript.exe \"%~dp0autosubida.vbs\"" >nul
if errorlevel 1 (
  echo  No se ha podido crear la tarea programada.
  pause
  exit /b 1
)
schtasks /Run /TN "PasaLaBomba-autosubida" >nul
echo.
echo  Subida automatica instalada. Cada 2 minutos se suben las ramas con commits nuevos.
echo  Registro: autosubida.log    Para quitarla: quitar-autosubida.bat
echo.
timeout /t 8
