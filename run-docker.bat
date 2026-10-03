@echo off
REM OpenWebProject - Script de inicio rápido con Docker para Windows
title OpenWebProject Docker Runner

echo ==========================================
echo   Iniciando OpenWebProject con Docker
echo ==========================================

where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo Construyendo contenedor...
docker compose up -d --build

echo.
echo ==========================================
echo   Listo! OpenWebProject esta corriendo.
echo   Abriendo navegador en http://localhost:8080 ...
echo ==========================================

start http://localhost:8080
pause
