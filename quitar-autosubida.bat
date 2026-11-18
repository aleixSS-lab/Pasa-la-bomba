@echo off
rem Quita la tarea programada de la subida automatica a GitHub.
title Quitar subida automatica
schtasks /Delete /F /TN "PasaLaBomba-autosubida"
echo.
echo  Subida automatica quitada. Para subir a mano, usa subir.bat.
echo.
timeout /t 8
