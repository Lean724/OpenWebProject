/**
 * OpenWebProject - Local Execution & Deployment Options Modal
 * Provides interactive guidance and 1-click downloads for:
 * 1. Docker & Docker Compose
 * 2. Standalone Self-contained HTML (.html)
 * 3. Lightweight Local Server (Python / npx)
 * 4. Node.js Development Source
 */
import React, { useState } from 'react';
import {
  X,
  Server,
  Laptop,
  Terminal,
  Code2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Layers,
  Container,
  Cpu,
  FolderArchive,
  Info,
} from 'lucide-react';
import JSZip from 'jszip';
import { downloadFile } from '../services/importExport';
import { useLanguage } from '../i18n/LanguageContext';

interface RunLocalModalProps {
  onClose: () => void;
  onDownloadOfflineApp: () => void;
}

type TabType = 'docker' | 'html' | 'server' | 'dev';

export const RunLocalModal: React.FC<RunLocalModalProps> = ({
  onClose,
  onDownloadOfflineApp,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleDownloadDockerZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Dockerfile
      const dockerfileContent = `# OpenWebProject - Multi-Stage Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json vite.config.ts index.html metadata.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/
RUN npm run build

FROM nginx:alpine AS runner
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/OpenWebProject.html /usr/share/nginx/html/OpenWebProject.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;
      zip.file('Dockerfile', dockerfileContent);

      // docker-compose.yml
      const dockerComposeContent = `services:
  openwebproject:
    build:
      context: .
      dockerfile: Dockerfile
    image: openwebproject:latest
    container_name: openwebproject
    restart: unless-stopped
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    environment:
      - NODE_ENV=production
`;
      zip.file('docker-compose.yml', dockerComposeContent);

      // nginx.conf
      const nginxContent = `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html OpenWebProject.html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        access_log off;
        return 200 'healthy\\n';
        add_header Content-Type text/plain;
    }
}
`;
      zip.file('nginx.conf', nginxContent);

      // .dockerignore
      zip.file('.dockerignore', `node_modules\ndist\n.git\n.vscode\n*.log\nOpenWebProject.html\n`);

      // run-docker.sh
      zip.file('run-docker.sh', `#!/usr/bin/env bash\nset -e\necho "Iniciando OpenWebProject con Docker..."\ndocker compose up -d --build\necho "Listo! Abre http://localhost:8080"\n`);

      // run-docker.bat
      zip.file('run-docker.bat', `@echo off\ntitle OpenWebProject Docker Runner\necho Iniciando OpenWebProject con Docker...\ndocker compose up -d --build\necho Listo! Abriendo navegador...\nstart http://localhost:8080\npause\n`);

      // README.txt
      zip.file(
        'LEEME_INSTRUCCIONES.txt',
        `OPENWEBPROJECT - PAQUETE DOCKER
======================================
1. Descomprime esta carpeta en el directorio raíz de tu proyecto.
2. Abre una terminal y ejecuta:
     docker compose up -d --build
3. Abre tu navegador en:
     http://localhost:8080

Para detener el contenedor:
     docker compose down
`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OpenWebProject-Docker-Config.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
              <Container className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {t('runModalTitle')}
              </h3>
              <p className="text-xs text-slate-300">
                {t('runModalSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'docker'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Container className="w-4 h-4 text-blue-600" />
            <span>{t('tabDocker')}</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-700 rounded-full font-bold">
              {t('badgeNew')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'html'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4 text-indigo-600" />
            <span>{t('tabHtml')}</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-700 rounded-full font-bold">
              {t('badgeEasiest')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'server'
                ? 'border-slate-800 text-slate-900 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-slate-700" />
            <span>{t('tabServer')}</span>
          </button>

          <button
            onClick={() => setActiveTab('dev')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dev'
                ? 'border-slate-800 text-slate-900 bg-white rounded-t-lg shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4 text-slate-700" />
            <span>{t('tabDev')}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-xs">
          {/* TAB 1: DOCKER */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                  <Container className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Despliegue Aislado en Contenedor Docker (Nginx Alpine)
                  </h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Totalmente aislado de tu sistema operativo. Utiliza una imagen ligera de Nginx (&lt;25 MB) optimizada con compresión Gzip, caché inmutable de assets y healthchecks. Ideal para tu computadora, servidores locales, NAS (Synology, QNAP) o VPS.
                  </p>
                </div>
              </div>

              {/* Sub-opción A: docker compose */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      A
                    </span>
                    Con Docker Compose (1 solo comando)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'docker compose up -d',
                        'compose-cmd'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {copiedKey === 'compose-cmd' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar comando</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
                  docker compose up -d
                </div>
                <p className="text-[11px] text-slate-500">
                  Levanta el servicio en segundo plano y queda disponible en{' '}
                  <strong className="text-slate-800">http://localhost:8080</strong>. Para detenerlo: <code>docker compose down</code>.
                </p>
              </div>

              {/* Sub-opción B: docker run */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">
                      B
                    </span>
                    Con Docker CLI estándar
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'docker build -t openwebproject .\ndocker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject',
                        'docker-cli-cmd'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {copiedKey === 'docker-cli-cmd' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar comandos</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto select-all whitespace-pre">
                  {`# 1. Construir la imagen\ndocker build -t openwebproject .\n\n# 2. Correr el contenedor\ndocker run -d -p 8080:80 --name openwebproject --restart unless-stopped openwebproject`}
                </div>
              </div>

              {/* Actions: Download Docker ZIP */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Descarga los archivos ya configurados (<code>Dockerfile</code>, <code>docker-compose.yml</code>, <code>nginx.conf</code>, scripts .bat y .sh):
                </div>
                <button
                  onClick={handleDownloadDockerZip}
                  disabled={isZipping}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors shrink-0"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>
                    {isZipping ? t('generatingZip') : t('downloadDockerZip')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STANDALONE HTML */}
          {activeTab === 'html' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    Aplicación Autocontenida en un Único Archivo HTML
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded-full font-bold">
                      Recomendado para la mayoría
                    </span>
                  </h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Todo el código React, Tailwind, librerías, iconos SVG y motor de cálculo de Gantt están integrados dentro de <strong>un solo archivo (.html)</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-900">¿Por qué es la opción más práctica?</h5>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✓</span>
                    <span><strong>Cero instalación:</strong> No necesitas Docker, ni Node.js, ni terminal ni permisos de administrador.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✓</span>
                    <span><strong>Doble clic directo:</strong> Se abre al instante en Edge, Chrome, Firefox, Safari o Brave en Windows, Mac o Linux.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0">✓</span>
                    <span><strong>Portabilidad absoluta:</strong> Puedes guardarlo en un pendrive, en tu Google Drive / OneDrive o enviarlo por correo electrónico a tus clientes o equipo.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Archivo listo para usar: <code>OpenWebProject.html</code> (~1.6 MB)
                </span>
                <button
                  onClick={() => {
                    onDownloadOfflineApp();
                    onClose();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('downloadHtmlBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL SERVER */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-slate-800 text-white rounded-lg shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Servidor HTTP Local Ultraligero (Sin Docker)
                  </h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Ideal si quieres compartir la aplicación con otros dispositivos conectados a la misma red local (Wi-Fi de tu oficina o casa) usando herramientas que ya tienes instaladas.
                  </p>
                </div>
              </div>

              {/* Con Python */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    Con Python 3 (Presente en la mayoría de PCs)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'python -m http.server 8080',
                        'python-cmd'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md"
                  >
                    {copiedKey === 'python-cmd' ? (
                      <span className="text-emerald-600 font-bold">¡Copiado!</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                  python -m http.server 8080
                </div>
                <p className="text-[11px] text-slate-500">
                  Ejecútalo en la carpeta donde tengas <code>dist</code> o <code>OpenWebProject.html</code> y accede en <strong>http://localhost:8080</strong>.
                </p>
              </div>

              {/* Con npx serve */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    Con Node.js (npx serve)
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard('npx serve dist -p 8080', 'npx-cmd')
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-md"
                  >
                    {copiedKey === 'npx-cmd' ? (
                      <span className="text-emerald-600 font-bold">¡Copiado!</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
                  npx serve dist -p 8080
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEVELOPER SOURCE */}
          {activeTab === 'dev' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-purple-700 text-white rounded-lg shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Modo Desarrollo y Modificación de Código
                  </h4>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Si eres programador o quieres modificar componentes, añadir plugins o personalizar estilos con Vite, React 19 y Tailwind CSS.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Comandos de terminal</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'npm install\nnpm run dev',
                        'dev-cmd'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-white border border-slate-200 px-2 py-1 rounded-md"
                  >
                    {copiedKey === 'dev-cmd' ? (
                      <span className="text-emerald-600 font-bold">¡Copiado!</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar comandos</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre">
                  {`# 1. Instalar dependencias\nnpm install\n\n# 2. Iniciar servidor Vite\nnpm run dev\n\n# 3. Compilar para producción (genera dist/ y OpenWebProject.html)\nnpm run build`}
                </div>
                <p className="text-[11px] text-slate-500">
                  Abre tu navegador en <strong>http://localhost:3000</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('interopNotice')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
