/**
 * OpenWebProject - Productivity Toolbar
 * Quick actions, planning toggles, search, filters, and Gantt zoom.
 */
import React from 'react';
import {
  Plus,
  Indent,
  Outdent,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  Trash2,
  Flag,
  Calendar,
  Layers,
  History,
  Activity,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { Project } from '../types/project';

interface ToolbarProps {
  project: Project;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCreateTask: () => void;
  onQuickMilestone: () => void;
  selectedTaskCount: number;
  onIndent: () => void;
  onOutdent: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleteSelected: () => void;
  // Modals triggers
  onOpenCalendar: () => void;
  onOpenBaselines: () => void;
  onOpenSnapshots: () => void;
  // Critical path & Baseline toggles
  onlyCritical: boolean;
  onToggleCritical: () => void;
  activeBaselineId: string | null;
  // Filters & Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  trafficFilter: string;
  onTrafficChange: (t: string) => void;
  // Gantt Zoom
  zoomLevel: 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'year';
  onZoomChange: (z: 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'year') => void;
  onFitToScreen: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCreateTask,
  onQuickMilestone,
  selectedTaskCount,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  onDeleteSelected,
  onOpenCalendar,
  onOpenBaselines,
  onOpenSnapshots,
  onlyCritical,
  onToggleCritical,
  activeBaselineId,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  trafficFilter,
  onTrafficChange,
  zoomLevel,
  onZoomChange,
  onFitToScreen,
}) => {
  return (
    <div className="h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-3 text-xs select-none">
      {/* Group 1: Task Editing & Hierarchy Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium transition-colors shadow-2xs"
          title="Crear nueva tarea al final del cronograma"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tarea</span>
        </button>

        <button
          onClick={onQuickMilestone}
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors"
          title="Crear hito (duración 0 días)"
        >
          <Flag className="w-3 h-3 text-indigo-600" />
          <span>Hito</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          onClick={onIndent}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Indentar / Convertir en subtarea"
        >
          <Indent className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOutdent}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Desindentar / Subir nivel de jerarquía"
        >
          <Outdent className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMoveUp}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Mover arriba"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMoveDown}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Mover abajo"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {selectedTaskCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 p-1.5 text-rose-600 hover:bg-rose-50 rounded ml-1"
            title={`Eliminar ${selectedTaskCount} tarea(s) seleccionada(s)`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] font-semibold">{selectedTaskCount}</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Deshacer (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title="Rehacer (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Group 2: Planning Features (Critical Path, Baseline, Calendar, Snapshots) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleCritical}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
            onlyCritical
              ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Destacar tareas pertenecientes al Camino Crítico"
        >
          <Activity className="w-3 h-3 text-rose-500" />
          <span>Camino Crítico</span>
        </button>

        <button
          onClick={onOpenBaselines}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
            activeBaselineId
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Gestionar y comparar Líneas Base (Baselines)"
        >
          <Layers className="w-3 h-3 text-indigo-500" />
          <span>Líneas Base ({project.baselines.length})</span>
        </button>

        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-1.5 px-2 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md font-medium transition-colors"
          title="Configurar calendario laboral y días no laborables (Days Off)"
        >
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>Calendario</span>
        </button>

        <button
          onClick={onOpenSnapshots}
          className="flex items-center gap-1.5 px-2 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md font-medium transition-colors"
          title="Historial de versiones y Snapshots manuales"
        >
          <History className="w-3 h-3 text-slate-500" />
          <span>Snapshots ({project.snapshots.length})</span>
        </button>
      </div>

      {/* Group 3: Search, Filters & Gantt Zoom Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-36 lg:w-48">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter State */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="not_started">No iniciada</option>
          <option value="in_progress">En progreso</option>
          <option value="completed">Completada</option>
          <option value="blocked">Bloqueada</option>
          <option value="cancelled">Cancelada</option>
          <option value="on_hold">En espera</option>
        </select>

        {/* Filter Semáforo */}
        <select
          value={trafficFilter}
          onChange={(e) => onTrafficChange(e.target.value)}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Semáforo (Todos)</option>
          <option value="green">🟢 Verde (En plazo)</option>
          <option value="yellow">🟡 Amarillo (Desviado)</option>
          <option value="red">🔴 Rojo (Vencido)</option>
        </select>

        {/* Gantt Zoom Segmented Control */}
        <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
          {(['day', 'week', 'fortnight', 'month', 'quarter', 'year'] as const).map((z) => (
            <button
              key={z}
              onClick={() => onZoomChange(z)}
              className={`px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                zoomLevel === z ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {z === 'day' ? 'D' : z === 'week' ? 'S' : z === 'fortnight' ? '15d' : z === 'month' ? 'M' : z === 'quarter' ? 'T' : 'A'}
            </button>
          ))}
          <button
            onClick={onFitToScreen}
            className="p-1 text-slate-500 hover:text-slate-800 ml-0.5"
            title="Ajustar proyecto a la pantalla"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
