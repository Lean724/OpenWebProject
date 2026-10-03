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
  Maximize2,
} from 'lucide-react';
import { Project } from '../types/project';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { t } = useLanguage();

  return (
    <div className="h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-3 text-xs select-none">
      {/* Group 1: Task Editing & Hierarchy Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800 font-medium transition-colors shadow-2xs"
          title={t('newTask')}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('newTask')}</span>
        </button>

        <button
          onClick={onQuickMilestone}
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors"
          title="Hito / Milestone (0d)"
        >
          <Flag className="w-3 h-3 text-indigo-600" />
          <span>Hito</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          onClick={onIndent}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title={t('indent')}
        >
          <Indent className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOutdent}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title={t('outdent')}
        >
          <Outdent className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMoveUp}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title={t('moveUp')}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMoveDown}
          disabled={selectedTaskCount === 0}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title={t('moveDown')}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {selectedTaskCount > 0 && (
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 p-1.5 text-rose-600 hover:bg-rose-50 rounded ml-1"
            title={`${t('delete')} (${selectedTaskCount})`}
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
          title={`${t('undo')} (Ctrl+Z)`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-30 disabled:pointer-events-none"
          title={`${t('redo')} (Ctrl+Y)`}
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
          title={t('criticalPath')}
        >
          <Activity className="w-3 h-3 text-rose-500" />
          <span>{t('criticalPath')}</span>
        </button>

        <button
          onClick={onOpenBaselines}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
            activeBaselineId
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title={t('baselines')}
        >
          <Layers className="w-3 h-3 text-indigo-500" />
          <span>{t('baselines')} ({project.baselines.length})</span>
        </button>

        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-1.5 px-2 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md font-medium transition-colors"
          title={t('calendar')}
        >
          <Calendar className="w-3 h-3 text-slate-500" />
          <span>{t('calendar')}</span>
        </button>

        <button
          onClick={onOpenSnapshots}
          className="flex items-center gap-1.5 px-2 py-1 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md font-medium transition-colors"
          title={t('snapshots')}
        >
          <History className="w-3 h-3 text-slate-500" />
          <span>{t('snapshots')} ({project.snapshots.length})</span>
        </button>
      </div>

      {/* Group 3: Search, Filters & Gantt Zoom Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative w-32 sm:w-40 lg:w-48">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter State */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none hidden md:block"
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="not_started">{t('statusNotStarted')}</option>
          <option value="in_progress">{t('statusInProgress')}</option>
          <option value="completed">{t('statusCompleted')}</option>
          <option value="on_hold">{t('statusOnHold')}</option>
        </select>

        {/* Filter Semáforo */}
        <select
          value={trafficFilter}
          onChange={(e) => onTrafficChange(e.target.value)}
          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none hidden lg:block"
        >
          <option value="all">{t('allTraffic')}</option>
          <option value="green">🟢 {t('trafficGreen')}</option>
          <option value="yellow">🟡 {t('trafficYellow')}</option>
          <option value="red">🔴 {t('trafficRed')}</option>
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
            title={t('fitScreen')}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
