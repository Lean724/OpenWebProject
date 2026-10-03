# Guía de Ejecución y Despliegue de OpenWebProject

Tienes **4 opciones principales** para ejecutar OpenWebProject en tu máquina o servidor:

---

## 🐳 Opción 1: Docker & Docker Compose (Recomendado para Servidores, NAS y Entornos Aislados)

No requiere instalar Node.js ni configurar servidores web manualmente.

### Con Docker Compose (La más fácil):
```bash
# 1. Iniciar en segundo plano
docker compose up -d

# 2. Abrir en tu navegador
# 👉 http://localhost:8080

# Para detener el contenedor:
docker compose down
```

### Con Docker CLI directo:
```bash
# 1. Construir la imagen
docker build -t openwebproject .

# 2. Ejecutar el contenedor en el puerto 8080 (o el que prefieras)
docker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject

# 3. Acceder en:
# 👉 http://localhost:8080
```

---

## ⚡ Opción 2: Archivo Autocontenido Único (.html) — Cero Instalación

Es la opción más inmediata si estás en una computadora personal y no tienes Docker ni Node:

1. Haz doble clic en el archivo `OpenWebProject.html` (o descárgalo desde el botón de la barra superior).
2. Se abre automáticamente en tu navegador (Edge, Chrome, Firefox, Safari).
3. **100% offline**: No requiere internet, no requiere servidor, no tiene dependencias. Puedes llevarlo en un pendrive o guardarlo en cualquier carpeta.

---

## 💻 Opción 3: Servidor Local Ligero (Python / Node npx)

Si tienes Python o Node.js y quieres compartir la aplicación en tu red local (LAN / Wi-Fi) con tu equipo:

### Con Python (Preinstalado en casi todas las computadoras):
```bash
# Desde la carpeta del proyecto (o la carpeta dist):
python -m http.server 8080
# o en Python 2: python -m SimpleHTTPServer 8080

# Abrir en: http://localhost:8080
# O desde otros equipos en tu red: http://TU_IP_LOCAL:8080
```

### Con npx (Node.js):
```bash
npx serve dist -p 8080
# o:
npx http-server dist -p 8080
```

---

## 🛠️ Opción 4: Modo Desarrollo / Código Fuente (Node.js & Vite)

Para programadores que quieran modificar el código fuente:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en tiempo real
npm run dev

# Acceder en: http://localhost:3000
```
