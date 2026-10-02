/**
 * OpenWebProject - Top Bar Header
 * Follows the Universal Top Bar Contract:
 * [Brand Zone] - [Navigation Views] - [Primary Actions]
 */
import React from 'react';
import { Download, Upload, Save, Sparkles, FolderKanban, Laptop } from 'lucide-react';
import { Workspace } from '../types/project';

export type ActiveView = 'split' | 'gantt' | 'table' | 'timeline' | 'dashboard';

interface TopHeaderProps {
  workspace: Workspace;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onQuickSave: () => void;
  onDownloadOfflineApp?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  workspace,
  activeView,
  setActiveView,
  onOpenImport,
  onOpenExport,
  onQuickSave,
  onDownloadOfflineApp,
}) => {
  const views: { id: ActiveView; label: string }[] = [
    { id: 'split', label: 'Tabla & Gantt' },
    { id: 'table', label: 'Solo Tabla' },
    { id: 'gantt', label: 'Solo Gantt' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'dashboard', label: 'Dashboard' },
  ];

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
          P
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">
          OpenWebProject
        </span>
        <span className="hidden sm:inline text-xs text-slate-400 font-mono">v1.0</span>
      </div>

      {/* Zone 2: Clean text navigation views */}
      <nav className="flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-lg">
        {views.map((v) => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-2">
        {onDownloadOfflineApp && (
          <button
            onClick={onDownloadOfflineApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors shadow-2xs"
            title="Descargar OpenWebProject.html autocontenido para abrir en cualquier PC sin internet"
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden lg:inline">App Offline (.html)</span>
          </button>
        )}

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs"
          title="Importar desde .project, XML de MS Project, Excel o CSV"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Importar</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs"
          title="Exportar a .project, Excel, MS Project XML, CSV o PDF"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Exportar</span>
        </button>

        <button
          onClick={onQuickSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          title="Guardar archivo portable de proyecto (.project)"
        >
          <Save className="w-3.5 h-3.5 text-slate-200" />
          <span className="hidden sm:inline">Guardar .project</span>
        </button>
      </div>
    </header>
  );
};
