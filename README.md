# OpenWebProject 📊

[🇪🇸 Español](#-openwebproject---español) | [🇬🇧 English](#-openwebproject---english) | [🇧🇷 Português](#-openwebproject---português)

---

## 🇪🇸 OpenWebProject - Español

**OpenWebProject** es una plataforma moderna, profesional y ligera para la gestión y planificación de proyectos inspirada en herramientas clásicas como Microsoft Project y Primavera P6, diseñada para ejecutarse de forma 100% autónoma, privada y sin requerir cuentas ni servidores externos obligatorios.

### Características Principales
* 📅 **Diagrama de Gantt Interactivo**: Arrastre de barras, vínculos visuales entre tareas (FS, SS, FF, SF) y cálculo de lag/adelanto.
* ⚡ **Método del Camino Crítico (CPM)**: Identificación instantánea de holguras libres, holgura total y tareas críticas con cálculo en tiempo real.
* 📏 **Líneas Base (Baselines) y Snapshots**: Guarda y compara hasta múltiples líneas base para auditar variaciones de fechas y avance.
* 🔄 **Compatibilidad con Microsoft Project**: Importación y exportación de archivos XML MSPDI estándar y compatibilidad bidireccional con hojas de cálculo Excel (`.xlsx`), CSV y reportes en PDF.
* 🌐 **Soporte Multilingüe**: Interfaz disponible en Español, Inglés y Portugués con persistencia local.

---

### 🚀 Opciones de Instalación y Ejecución

Tienes **4 formas diferentes** de ejecutar OpenWebProject en tu computadora o servidor:

#### Opción 1: Archivo Autocontenido Único (`.html`) — Cero Instalación (La más rápida)
Ideal si estás en una computadora personal y no tienes Docker ni Node.js instalados:
1. Descarga o abre el archivo **`OpenWebProject.html`**.
2. Haz **doble clic** sobre él.
3. Se abrirá inmediatamente en tu navegador favorito (Edge, Chrome, Firefox, Safari, Brave) bajo Windows, Mac o Linux.
4. **100% Offline**: Funciona sin conexión a internet, no requiere servidores ni permisos especiales. Puedes llevarlo en un pendrive USB o enviarlo por correo.

#### Opción 2: Ejecución con Docker & Docker Compose (Recomendado para Servidores y NAS)
Totalmente aislado de tu sistema operativo en un contenedor Nginx Alpine ultraligero (< 25 MB):

**Con Docker Compose (1 solo comando):**
```bash
# 1. Iniciar el contenedor en segundo plano
docker compose up -d

# 2. Abrir en tu navegador web:
# 👉 http://localhost:8080

# Para detener el contenedor cuando termines:
docker compose down
```

**Con Docker CLI directo:**
```bash
# 1. Construir la imagen
docker build -t openwebproject .

# 2. Correr el contenedor mapeando el puerto 8080
docker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject

# 3. Acceder en http://localhost:8080
```

> **Atajo rápido**: También puedes hacer doble clic en `run-docker.bat` (Windows) o ejecutar `./run-docker.sh` (Linux / macOS).

#### Opción 3: Instalación y Ejecución con Node.js & npm (Desarrollo y Compilación)
Para programadores que desean modificar o compilar el código fuente:

**Requisitos**: Node.js 18 o superior instalado.

```bash
# 1. Clonar el repositorio y entrar a la carpeta
cd openwebproject

# 2. Instalar todas las dependencias
npm install

# 3. Iniciar el servidor de desarrollo en tiempo real
npm run dev
# 👉 Acceder en: http://localhost:3000

# 4. Compilar la versión de producción optimizada y el archivo autocontenido
npm run build
```
El comando `npm run build` genera la carpeta `dist/` para hosting web tradicional y además compila automáticamente el archivo standalone `OpenWebProject.html`.

#### Opción 4: Servidor Local Ligero (Python / npx)
Para servir la aplicación en tu red Wi-Fi u oficina local sin Docker:

```bash
# Con Python 3:
python -m http.server 8080

# Con npx (Node.js):
npx serve dist -p 8080
```

---

## 🇬🇧 OpenWebProject - English

**OpenWebProject** is a modern, professional, and lightweight project management and scheduling platform inspired by classic tools like Microsoft Project and Primavera P6, engineered to run 100% offline, privately, with zero obligatory servers or user accounts.

### Key Features
* 📅 **Interactive Gantt Chart**: Drag-and-drop bars, visual dependencies (FS, SS, FF, SF), and lag lead-time calculations.
* ⚡ **Critical Path Method (CPM)**: Real-time calculation of total float, free float, and critical paths.
* 📏 **Baselines & Version Snapshots**: Save, audit, and compare multiple baselines to evaluate schedule slippage and progress variance.
* 🔄 **Microsoft Project Compatibility**: Bidirectional import/export with standard MSPDI XML format, Excel (`.xlsx`), CSV, and printable PDF reports.
* 🌐 **Multi-language Support**: Available in English, Spanish, and Portuguese with automatic local preference retention.

---

### 🚀 Installation and Run Options

You have **4 flexible options** to run OpenWebProject on your workstation or server:

#### Option 1: Standalone Single File (`.html`) — Zero Installation (Fastest)
Perfect for personal computers with no Docker or Node.js required:
1. Download or locate **`OpenWebProject.html`**.
2. **Double-click** the file.
3. It launches instantly in any modern web browser (Edge, Chrome, Firefox, Safari, Brave) on Windows, macOS, or Linux.
4. **100% Offline**: Operates without an internet connection, requires no background daemon, and can be easily transferred via USB drive or email.

#### Option 2: Run with Docker & Docker Compose (Recommended for Servers & NAS)
Fully isolated from your host operating system using an ultra-lean Nginx Alpine image (< 25 MB):

**Using Docker Compose (Single command):**
```bash
# 1. Start the container in background
docker compose up -d

# 2. Open in your web browser:
# 👉 http://localhost:8080

# To stop the container:
docker compose down
```

**Using standard Docker CLI:**
```bash
# 1. Build the image
docker build -t openwebproject .

# 2. Run the container mapping port 8080
docker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject

# 3. Browse to http://localhost:8080
```

> **1-Click Launchers**: Double-click `run-docker.bat` on Windows or execute `./run-docker.sh` on Linux / macOS.

#### Option 3: Install & Run with Node.js & npm (Source Code & Development)
For software engineers wishing to customize, test, or extend components:

**Requirements**: Node.js 18 or higher.

```bash
# 1. Open the project directory
cd openwebproject

# 2. Install project dependencies
npm install

# 3. Start local development server with instant hot-reload
npm run dev
# 👉 Access at: http://localhost:3000

# 4. Compile the production bundle and the single-file executable
npm run build
```
Running `npm run build` produces both the static distribution in `dist/` and the self-contained `OpenWebProject.html` file.

#### Option 4: Lightweight Local HTTP Server (Python / npx)
Share the scheduler across your local Wi-Fi or office network without Docker:

```bash
# Using Python 3:
python -m http.server 8080

# Using Node npx:
npx serve dist -p 8080
```

---

## 🇧🇷 OpenWebProject - Português

**OpenWebProject** é uma plataforma moderna, profissional e leve de gerenciamento e planejamento de projetos inspirada em ferramentas clássicas como Microsoft Project e Primavera P6, projetada para ser executada de forma 100% autônoma, privada e sem necessidade de contas ou servidores externos.

### Principais Recursos
* 📅 **Gráfico de Gantt Interativo**: Arrastar e soltar tarefas, vínculos visuais (TI, II, TT, IT) e cálculo de atrasos/antecipações.
* ⚡ **Método do Caminho Crítico (CPM)**: Cálculo em tempo real de folga total, folga livre e identificação das tarefas críticas.
* 📏 **Linhas de Base (Baselines) e Snapshots**: Salve e compare múltiplas linhas de base para auditar desvios de prazos e avanço real.
* 🔄 **Compatibilidade com Microsoft Project**: Importação e exportação de arquivos XML MSPDI padrão, além de compatibilidade com Excel (`.xlsx`), CSV e relatórios em PDF.
* 🌐 **Suporte Multilíngue**: Interface disponível em Português, Espanhol e Inglês com persistência local de preferência.

---

### 🚀 Opções de Instalação e Execução

Você dispõe de **4 maneiras** de executar o OpenWebProject no seu computador ou servidor:

#### Opção 1: Arquivo Autocontido Único (`.html`) — Zero Instalação (Mais Rápido)
Ideal para computadores pessoais sem Docker ou Node.js instalados:
1. Baixe ou abra o arquivo **`OpenWebProject.html`**.
2. Dê um **duplo clique** sobre ele.
3. Ele abrirá imediatamente no seu navegador favorito (Edge, Chrome, Firefox, Safari, Brave) no Windows, Mac ou Linux.
4. **100% Offline**: Funciona sem internet, sem servidores e sem necessidade de permissões de administrador. Pode ser transportado em pendrive ou enviado por e-mail.

#### Opção 2: Execução com Docker & Docker Compose (Recomendado para Servidores e NAS)
Totalmente isolado do seu sistema operacional em um contêiner Nginx Alpine ultraleve (< 25 MB):

**Com Docker Compose (1 comando só):**
```bash
# 1. Iniciar o contêiner em segundo plano
docker compose up -d

# 2. Abrir no navegador:
# 👉 http://localhost:8080

# Para parar o contêiner:
docker compose down
```

**Com Docker CLI padrão:**
```bash
# 1. Construir a imagem
docker build -t openwebproject .

# 2. Executar o contêiner na porta 8080
docker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject

# 3. Acessar em http://localhost:8080
```

> **Início rápido**: Dê um duplo clique em `run-docker.bat` (Windows) ou execute `./run-docker.sh` (Linux / macOS).

#### Opção 3: Instalação e Execução com Node.js & npm (Código Fonte)
Para programadores que desejam modificar o código:

**Requisitos**: Node.js 18 ou superior.

```bash
# 1. Entrar na pasta do projeto
cd openwebproject

# 2. Instalar dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev
# 👉 Acessar em: http://localhost:3000

# 4. Gerar build de produção e o arquivo autocontenido
npm run build
```

#### Opção 4: Servidor Local Leve (Python / npx)
Para compartilhar na rede Wi-Fi da empresa ou casa sem Docker:

```bash
# Com Python 3:
python -m http.server 8080

# Com npx:
npx serve dist -p 8080
```

---

## Licença & Privacidade
OpenWebProject é código aberto sob licença MIT. Todos os seus projetos permanecem 100% no seu dispositivo (armazenamento local do navegador ou em arquivos `.project`), sem envio de telemetria nem dados confidenciais para servidores remotos.
