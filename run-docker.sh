#!/usr/bin/env bash
# OpenWebProject - Script de inicio rápido con Docker
set -e

echo "=========================================="
echo "  Iniciando OpenWebProject con Docker     "
echo "=========================================="

if ! command -v docker &> /dev/null; then
    echo "Error: Docker no está instalado en este sistema."
    echo "Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "1. Construyendo imagen y levantando contenedor..."
docker compose up -d --build

echo ""
echo "=========================================="
echo "  ¡Listo! OpenWebProject está corriendo   "
echo "  Abre en tu navegador:                   "
echo "  👉 http://localhost:8080               "
echo "=========================================="
