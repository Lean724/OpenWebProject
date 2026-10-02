/**
 * Script de post-procesamiento para convertir la compilación de Vite
 * en un archivo HTML 100% autocontenido y autoejecutable en el protocolo file://
 * compatible con cualquier navegador (Chrome, Edge, Firefox, Safari)
 * sin requerir servidor HTTP ni NodeJS.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distPath = path.resolve(rootDir, 'dist', 'index.html');
const rootAppPath = path.resolve(rootDir, 'OpenWebProject.html');
const publicDir = path.resolve(rootDir, 'public');
const publicAppPath = path.resolve(publicDir, 'OpenWebProject.html');

if (!fs.existsSync(distPath)) {
  console.error('dist/index.html no encontrado. Ejecuta primero npm run build.');
  process.exit(1);
}

let html = fs.readFileSync(distPath, 'utf8');

// 1. Eliminar de forma segura SOLO los pequeños scripts auxiliares de desarrollo/redirección
html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
  if (match.length < 5000 && (match.includes('OpenWebProject.html') || match.includes('file-protocol-fallback'))) {
    return '';
  }
  return match;
});

// Eliminar el contenedor visual de fallback para que no aparezca en el archivo compilado
html = html.replace(/<div id="file-protocol-fallback"[\s\S]*?<\/div>(\s*<\/div>)?/gi, '');

// 2. Eliminar cualquier atributo crossorigin y type="module" del bundle principal
html = html.replace(/<script\s+type=["']module["']\s+crossorigin[^>]*>/gi, '<script>');
html = html.replace(/<script\s+type=["']module["'][^>]*>/gi, '<script>');
html = html.replace(/<script\s+crossorigin[^>]*>/gi, '<script>');

// 3. Eliminar etiquetas <link rel="modulepreload" ...>
html = html.replace(/<link[^>]*rel=["']modulepreload["'][^>]*>/gi, '');

// 4. Reemplazar la función de precarga __vitePreload de Vite para evitar creación de <link> y errores de CORS/fetch en file://
html = html.replace(
  /=function\([a-zA-Z0-9_]+,[a-zA-Z0-9_]+,[a-zA-Z0-9_]+\)\{let [a-zA-Z0-9_]+=Promise\.resolve\(\);[\s\S]*?vite:preloadError[\s\S]*?\.catch\([a-zA-Z0-9_]+\)\}\)\}/g,
  '=function(e){return Promise.resolve().then(()=>e())}'
);

// 5. Neutralizar cualquier ocurrencia restante de vite:preloadError
html = html.replace(/vite:preloadError/g, 'vite:disabledPreloadError');

// 6. Inyectar protección permanente contra errores y bucles
const antiReloadGuard = `<script>
  // Prevención de recargas accidentales en protocolo file://
  if (typeof window !== 'undefined') {
    window.addEventListener('vite:preloadError', function(e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
    window.addEventListener('vite:disabledPreloadError', function(e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }
</script>`;

html = html.replace('<head>', '<head>\n    ' + antiReloadGuard);

// 7. Reemplazar import.meta para que sea válido en script clásico (no-módulo)
html = html.replace(/\bimport\.meta\.resolve\b/g, '(function(e){return e})');
html = html.replace(/\bimport\.meta\b/g, '({url: (typeof location !== "undefined" ? location.href : "")})');

// 8. Asegurar que <div id="root"> esté siempre visible y limpio
html = html.replace(/<div id="root"[^>]*><\/div>/gi, '<div id="root" class="h-full w-full"></div>');

// 9. Guardar en dist/index.html
fs.writeFileSync(distPath, html, 'utf8');
console.log(`✅ dist/index.html optimizado (${(html.length / 1024).toFixed(1)} KB) para ejecución offline directa (file://)`);

// 10. Guardar en la raíz como OpenWebProject.html
fs.writeFileSync(rootAppPath, html, 'utf8');
console.log(`✅ OpenWebProject.html generado (${(html.length / 1024).toFixed(1)} KB) en la raíz del proyecto`);

// 11. Guardar en public/ para descarga directa desde la UI de la aplicación
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(publicAppPath, html, 'utf8');
console.log('✅ public/OpenWebProject.html generado para descarga desde la aplicación');
