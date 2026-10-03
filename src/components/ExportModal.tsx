/**
 * OpenWebProject - Universal Export Modal
 * Section 46, 47, 48, 49, 50: Export to .project, Excel (XLSX), MS Project XML, CSV, PDF, and JSON.
 */
import React from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  Share2,
  FileDown,
  Layers,
  Laptop,
  Container,
} from 'lucide-react';
import { Project, Workspace, Task } from '../types/project';
import {
  downloadFile,
  exportProjectToJson,
  exportWorkspaceToJson,
  exportTasksToCsv,
  exportTasksToXlsx,
  exportGanttToPdf,
} from '../services/importExport';
import { exportToMsProjectXml } from '../services/xmlProject';

interface ExportModalProps {
  project: Project;
  workspace: Workspace;
  filteredTasks: Task[];
  onClose: () => void;
  onOpenRunLocalModal?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  workspace,
  filteredTasks,
  onClose,
  onOpenRunLocalModal,
}) => {
  const sanitizeFilename = (name: string) => name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

  const handleDownloadOfflineApp = async () => {
    try {
      const response = await fetch('./OpenWebProject.html');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'OpenWebProject.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
        return;
      }
    } catch {
      // Fallback si no está disponible la ruta estática
    }

    try {
      // Si el fetch relativo falló, intentar fetch a la raíz
      const response = await fetch('/OpenWebProject.html');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'OpenWebProject.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
        return;
      }
    } catch {
      // Fallback
    }

    // Fallback: descargar documento actual
    const currentHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    downloadFile(currentHtml, 'OpenWebProject.html', 'text/html');
    onClose();
  };

  const handleExportProjectFile = () => {
    const jsonStr = exportProjectToJson(project);
    downloadFile(jsonStr, `${sanitizeFilename(project.name)}.project`, 'application/json');
    onClose();
  };

  const handleExportWorkspaceFile = () => {
    const jsonStr = exportWorkspaceToJson(workspace);
    downloadFile(jsonStr, `Workspace_${sanitizeFilename(workspace.name)}.project`, 'application/json');
    onClose();
  };

  const handleExportMsProjectXml = () => {
    const xmlStr = exportToMsProjectXml(project);
    downloadFile(xmlStr, `${sanitizeFilename(project.name)}_msproject.xml`, 'application/xml');
    onClose();
  };

  const handleExportCsv = () => {
    const csvStr = exportTasksToCsv(project.tasks);
    downloadFile(csvStr, `${sanitizeFilename(project.name)}_tareas.csv`, 'text/csv;charset=utf-8;');
    onClose();
  };

  const handleExportXlsx = () => {
    exportTasksToXlsx(project);
    onClose();
  };

  const handleExportPdf = () => {
    exportGanttToPdf(project, filteredTasks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Exportar Proyecto o Workspace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 overflow-y-auto space-y-2.5 text-xs text-slate-700">
          {/* 0. Aplicación Completa Autoejecutable (.html) */}
          <div
            onClick={handleDownloadOfflineApp}
            className="p-3.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group ring-1 ring-indigo-500/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block transition-colors flex items-center gap-1.5">
                  Descargar Aplicación Completa Offline (.html)
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-600 text-white rounded">Recomendado</span>
                </span>
                <p className="text-[11px] text-indigo-900/80 mt-0.5 leading-relaxed">
                  Descarga un único archivo <code>OpenWebProject.html</code> con la aplicación completa. Llévalo en un pendrive o envíalo por correo: se abre con doble clic en cualquier navegador y computadora sin internet ni instalación.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
          </div>

          {/* 0.5 Versión Dockerizada & Opciones de Despliegue */}
          {onOpenRunLocalModal && (
            <div
              onClick={() => {
                onClose();
                onOpenRunLocalModal();
              }}
              className="p-3.5 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group ring-1 ring-blue-500/20"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
                  <Container className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-blue-950 block transition-colors flex items-center gap-1.5">
                    Versión Dockerizada & Despliegue Local
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-600 text-white rounded">Docker / Compose</span>
                  </span>
                  <p className="text-[11px] text-blue-900/80 mt-0.5 leading-relaxed">
                    Ejecuta OpenWebProject en contenedores Docker aislados (Nginx Alpine), servidores locales (Python/Node) o descarga el paquete Docker listo para usar.
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
            </div>
          )}

          {/* 1. OpenWebProject .project */}
          <div
            onClick={handleExportProjectFile}
            className="p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <FileDown className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                  Archivo Portable OpenWebProject (.project)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conserva tareas, jerarquía, baselines, snapshots, calendarios y dependencias para transferir a otra PC.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
          </div>

          {/* 2. Microsoft Project XML */}
          <div
            onClick={handleExportMsProjectXml}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <Code className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-amber-800 transition-colors">
                  Microsoft Project XML (.xml)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Esquema estándar MSPDI compatible con MS Project 2003/2007/2010+ (tareas, links FS/SS/FF, recursos).
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-800 shrink-0" />
          </div>

          {/* 3. Excel XLSX */}
          <div
            onClick={handleExportXlsx}
            className="p-3.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-emerald-700 transition-colors">
                  Hoja de Cálculo Excel (.xlsx)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Planilla con WBS, fechas, duraciones, avance, responsables y estado del cronograma.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
          </div>

          {/* 4. PDF Document */}
          <div
            onClick={handleExportPdf}
            className="p-3.5 bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block group-hover:text-rose-600 transition-colors">
                  Informe Documental PDF (.pdf)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reporte apaisado con tabla de cronograma y semáforos de desviación listo para imprimir o enviar.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-600 shrink-0" />
          </div>

          {/* 5. CSV Tabular */}
          <div
            onClick={handleExportCsv}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-200 text-slate-700 shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block transition-colors">
                  Valores Separados por Comas (.csv)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Datos planos para análisis en bases de datos u otras herramientas.
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* 6. Entire Workspace Bundle */}
          <div
            onClick={handleExportWorkspaceFile}
            className="p-3 bg-white border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                Exportar Workspace Completo ({workspace.projects.length} proyectos)
              </span>
            </div>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
