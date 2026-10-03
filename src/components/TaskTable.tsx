/**
 * OpenWebProject - Task Table Component
 * Section 28: Interactive, editable spreadsheet table for tasks.
 */
import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Lock,
  MoreVertical,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Flag,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TrafficLight } from '../types/project';
import { formatDisplayDate } from '../domain/calendar';
import { useLanguage } from '../i18n/LanguageContext';

interface TaskTableProps {
  tasks: Task[];
  allTasks: Task[];
  selectedTaskIds: string[];
  onToggleSelect: (id: string, isShift: boolean, isCtrl: boolean) => void;
  onSelectAll: (select: boolean) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onOpenTaskDetail: (task: Task) => void;
  onAddSubtask: (parentId: string) => void;
  resourcesList: string[];
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  allTasks,
  selectedTaskIds,
  onToggleSelect,
  onSelectAll,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onOpenTaskDetail,
  onAddSubtask,
  resourcesList,
}) => {
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [collapsedSummaryIds, setCollapsedSummaryIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSummaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Filter out children of collapsed summary tasks
  const isHiddenByParentCollapse = (task: Task): boolean => {
    let currParentId = task.parentId;
    while (currParentId) {
      if (collapsedSummaryIds.has(currParentId)) return true;
      const parent = allTasks.find((t) => t.id === currParentId);
      currParentId = parent ? parent.parentId : null;
    }
    return false;
  };

  const visibleTasks = tasks.filter((t) => !isHiddenByParentCollapse(t));

  const allSelected = visibleTasks.length > 0 && visibleTasks.every((t) => selectedTaskIds.includes(t.id));

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderTrafficLight = (task: Task) => {
    const colors: Record<TrafficLight, string> = {
      green: 'bg-emerald-500 shadow-emerald-500/30',
      yellow: 'bg-amber-500 shadow-amber-500/30',
      red: 'bg-rose-500 shadow-rose-500/30',
    };
    const titles: Record<TrafficLight, string> = {
      green: `En plazo o completada (Progreso: ${task.progress}%, Esperado: ${task.expectedProgress ?? 0}%)`,
      yellow: `Atrasada respecto al plan (Progreso real: ${task.progress}%, Esperado: ${task.expectedProgress ?? 0}%)`,
      red: `Vencida sin completar (Fecha fin superada, Progreso: ${task.progress}%)`,
    };

    return (
      <div className="flex items-center justify-center" title={titles[task.trafficLight]}>
        <span className={`w-2.5 h-2.5 rounded-full shadow-xs ${colors[task.trafficLight]}`} />
      </div>
    );
  };

  const formatPredecessorsString = (task: Task): string => {
    return task.dependencies
      .map((d) => {
        const pred = allTasks.find((t) => t.id === d.predecessorId);
        const wbs = pred ? pred.wbs : '?';
        const lag = d.lagDays !== 0 ? (d.lagDays > 0 ? `+${d.lagDays}d` : `${d.lagDays}d`) : '';
        return `${wbs}${d.type}${lag}`;
      })
      .join('; ');
  };

  const { t } = useLanguage();

  return (
    <div className="h-full w-full overflow-auto bg-white select-none border-r border-slate-200">
      <table className="w-full border-collapse text-left text-xs font-sans">
        <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
          <tr>
            <th className="w-8 px-2 py-2 text-center border-r border-slate-200">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
            </th>
            <th className="w-12 px-2 py-2 text-center border-r border-slate-200">WBS</th>
            <th className="w-6 px-1 py-2 text-center border-r border-slate-200">●</th>
            <th className="min-w-[200px] px-3 py-2 border-r border-slate-200">{t('colName')}</th>
            <th className="w-24 px-2 py-2 border-r border-slate-200">{t('colStart')}</th>
            <th className="w-24 px-2 py-2 border-r border-slate-200">{t('colFinish')}</th>
            <th className="w-24 px-2 py-2 border-r border-slate-200">{t('colDuration')}</th>
            <th className="w-16 px-2 py-2 border-r border-slate-200 text-right">Horas</th>
            <th className="w-20 px-2 py-2 border-r border-slate-200 text-center">{t('colProgress')}</th>
            <th className="w-28 px-2 py-2 border-r border-slate-200">{t('colStatus')}</th>
            <th className="w-28 px-2 py-2 border-r border-slate-200">{t('colResources')}</th>
            <th className="w-24 px-2 py-2 border-r border-slate-200">{t('colPredecessors')}</th>
            <th className="w-20 px-2 py-2 border-r border-slate-200">Prioridad</th>
            <th className="w-12 px-1 py-2 text-center">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans">
          {visibleTasks.map((task) => {
            const isSelected = selectedTaskIds.includes(task.id);
            const isSummary = task.type === 'summary';
            const isMilestone = task.type === 'milestone';
            const isCollapsed = collapsedSummaryIds.has(task.id);
            const indentLevel = Math.max(0, task.wbs.split('.').length - 1);

            return (
              <tr
                key={task.id}
                onClick={(e) => onToggleSelect(task.id, e.shiftKey, e.ctrlKey || e.metaKey)}
                className={`transition-colors cursor-pointer group text-slate-800 h-8 ${
                  isSelected
                    ? 'bg-indigo-50/70 hover:bg-indigo-50'
                    : isSummary
                    ? 'bg-slate-50/60 font-semibold hover:bg-slate-100/60'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Select checkbox */}
                <td className="w-8 px-2 py-1 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleSelect(task.id, false, true)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                </td>

                {/* WBS */}
                <td className="w-12 px-2 py-1 font-mono text-[11px] text-slate-500 border-r border-slate-100 text-center">
                  {task.wbs}
                </td>

                {/* Traffic light */}
                <td className="w-6 px-1 py-1 text-center border-r border-slate-100">
                  {renderTrafficLight(task)}
                </td>

                {/* Name & Tree Indentation */}
                <td
                  className="min-w-[200px] px-3 py-1 border-r border-slate-100 truncate"
                  style={{ paddingLeft: `${Math.max(12, indentLevel * 18 + 12)}px` }}
                  onDoubleClick={() => setEditingCell({ taskId: task.id, field: 'name' })}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isSummary && (
                      <button
                        onClick={(e) => toggleCollapse(task.id, e)}
                        className="p-0.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
                      >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isMilestone && <Flag className="w-3 h-3 text-indigo-600 shrink-0" />}
                    
                    {editingCell?.taskId === task.id && editingCell?.field === 'name' ? (
                      <input
                        type="text"
                        defaultValue={task.name}
                        onBlur={(e) => {
                          onUpdateTask(task.id, { name: e.target.value.trim() || task.name });
                          handleCellBlur();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateTask(task.id, { name: (e.target as HTMLInputElement).value.trim() || task.name });
                            handleCellBlur();
                          }
                          if (e.key === 'Escape') handleCellBlur();
                        }}
                        autoFocus
                        className="w-full text-xs px-1.5 py-0.5 border border-indigo-500 rounded bg-white focus:outline-none"
                      />
                    ) : (
                      <span className={`truncate ${isSummary ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {task.name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Start Date */}
                <td
                  className="w-24 px-2 py-1 font-mono text-[11px] text-slate-600 border-r border-slate-100"
                  onDoubleClick={() => !isSummary && setEditingCell({ taskId: task.id, field: 'startDate' })}
                >
                  {isSummary ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-2.5 h-2.5 opacity-50" />
                      {formatDisplayDate(task.startDate)}
                    </span>
                  ) : editingCell?.taskId === task.id && editingCell?.field === 'startDate' ? (
                    <input
                      type="date"
                      defaultValue={task.startDate}
                      onBlur={(e) => {
                        if (e.target.value) onUpdateTask(task.id, { startDate: e.target.value });
                        handleCellBlur();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                      autoFocus
                      className="text-[11px] p-0 border border-indigo-500 rounded bg-white"
                    />
                  ) : (
                    <span>{formatDisplayDate(task.startDate)}</span>
                  )}
                </td>

                {/* End Date */}
                <td
                  className="w-24 px-2 py-1 font-mono text-[11px] text-slate-600 border-r border-slate-100"
                  onDoubleClick={() => !isSummary && setEditingCell({ taskId: task.id, field: 'endDate' })}
                >
                  {isSummary ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-2.5 h-2.5 opacity-50" />
                      {formatDisplayDate(task.endDate)}
                    </span>
                  ) : editingCell?.taskId === task.id && editingCell?.field === 'endDate' ? (
                    <input
                      type="date"
                      defaultValue={task.endDate}
                      onBlur={(e) => {
                        if (e.target.value) onUpdateTask(task.id, { endDate: e.target.value });
                        handleCellBlur();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                      autoFocus
                      className="text-[11px] p-0 border border-indigo-500 rounded bg-white"
                    />
                  ) : (
                    <span>{formatDisplayDate(task.endDate)}</span>
                  )}
                </td>

                {/* Duration */}
                <td
                  className="w-24 px-2 py-1 font-mono text-[11px] text-slate-600 border-r border-slate-100"
                  onDoubleClick={() => !isSummary && setEditingCell({ taskId: task.id, field: 'durationDays' })}
                >
                  {isSummary ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-2.5 h-2.5 opacity-50" />
                      {task.durationDays} d
                    </span>
                  ) : editingCell?.taskId === task.id && editingCell?.field === 'durationDays' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        defaultValue={task.durationDays}
                        onBlur={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          onUpdateTask(task.id, { durationDays: val, type: val === 0 ? 'milestone' : 'normal' });
                          handleCellBlur();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                        autoFocus
                        className="w-12 text-[11px] px-1 py-0.5 border border-indigo-500 rounded bg-white"
                      />
                      <span className="text-[10px] text-slate-400">d</span>
                    </div>
                  ) : (
                    <span>{task.durationDays} d ({task.workHours} h)</span>
                  )}
                </td>

                {/* Work Hours */}
                <td className="w-16 px-2 py-1 font-mono text-[11px] text-slate-600 border-r border-slate-100 text-right">
                  {task.workHours} h
                </td>

                {/* % Progress */}
                <td
                  className="w-20 px-2 py-1 border-r border-slate-100 text-center"
                  onDoubleClick={() => !isSummary && setEditingCell({ taskId: task.id, field: 'progress' })}
                >
                  {isSummary ? (
                    <span className="font-mono text-[11px] text-slate-600 font-semibold">{task.progress}%</span>
                  ) : editingCell?.taskId === task.id && editingCell?.field === 'progress' ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={task.progress}
                        onBlur={(e) => {
                          const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                          onUpdateTask(task.id, { progress: val });
                          handleCellBlur();
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                        autoFocus
                        className="w-12 text-[11px] px-1 py-0.5 border border-indigo-500 rounded bg-white text-center"
                      />
                      <span className="text-[10px] text-slate-400">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">{task.progress}%</span>
                    </div>
                  )}
                </td>

                {/* Status */}
                <td className="w-28 px-2 py-1 border-r border-slate-100">
                  <select
                    value={task.status}
                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                    className="w-full text-[11px] bg-transparent border-0 text-slate-700 hover:text-slate-900 focus:ring-0 cursor-pointer p-0 font-medium"
                  >
                    <option value="not_started">No iniciada</option>
                    <option value="in_progress">En progreso</option>
                    <option value="completed">Completada</option>
                    <option value="blocked">Bloqueada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="on_hold">En espera</option>
                  </select>
                </td>

                {/* Responsible Resources */}
                <td
                  className="w-28 px-2 py-1 text-[11px] text-slate-600 border-r border-slate-100 truncate"
                  onDoubleClick={() => setEditingCell({ taskId: task.id, field: 'resources' })}
                >
                  {editingCell?.taskId === task.id && editingCell?.field === 'resources' ? (
                    <input
                      type="text"
                      defaultValue={task.assignedResources.join(', ')}
                      placeholder="Juan, Pedro..."
                      onBlur={(e) => {
                        const res = e.target.value
                          .split(',')
                          .map((r) => r.trim())
                          .filter((r) => r.length > 0);
                        onUpdateTask(task.id, { assignedResources: res });
                        handleCellBlur();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                      autoFocus
                      className="w-full text-[11px] px-1 py-0.5 border border-indigo-500 rounded bg-white"
                    />
                  ) : (
                    <span className="truncate" title={task.assignedResources.join(', ')}>
                      {task.assignedResources.length > 0 ? task.assignedResources.join(', ') : '-'}
                    </span>
                  )}
                </td>

                {/* Predecessors */}
                <td
                  className="w-24 px-2 py-1 font-mono text-[10px] text-slate-500 border-r border-slate-100 truncate"
                  title={formatPredecessorsString(task)}
                >
                  {formatPredecessorsString(task) || '-'}
                </td>

                {/* Priority */}
                <td className="w-20 px-2 py-1 border-r border-slate-100">
                  <select
                    value={task.priority}
                    onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as TaskPriority })}
                    className="w-full text-[11px] bg-transparent border-0 text-slate-700 hover:text-slate-900 focus:ring-0 cursor-pointer p-0"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </td>

                {/* Actions */}
                <td className="w-12 px-1 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onOpenTaskDetail(task)}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                      title="Ver detalle completo de la tarea"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onAddSubtask(task.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                      title="Agregar subtarea"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {visibleTasks.length === 0 && (
            <tr>
              <td colSpan={14} className="py-12 text-center text-slate-400 text-xs">
                No hay tareas que coincidan con la búsqueda o filtros activos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
