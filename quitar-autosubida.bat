@echo off
rem Quita la tarea programada de la subida a GitHub bajo peticion.
title Quitar subida a GitHub
schtasks /Delete /F /TN "PasaLaBomba-autosubida"
echo.
echo  Subida bajo peticion quitada. Para subir a mano, usa subir.bat.
echo.
timeout /t 8
