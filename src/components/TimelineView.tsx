/**
 * OpenWebProject - Timeline Roadmap View
 * Section 31: Simplified, high-level chronological roadmap.
 */
import React, { useState } from 'react';
import { Flag, CheckCircle, Calendar, ArrowRight, Layers, Clock } from 'lucide-react';
import { Project, Task } from '../types/project';
import { formatDisplayDate } from '../domain/calendar';

interface TimelineViewProps {
  project: Project;
  onOpenTaskDetail: (task: Task) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ project, onOpenTaskDetail }) => {
  const [filterType, setFilterType] = useState<'all' | 'milestones' | 'summaries'>('all');

  const filteredTasks = project.tasks.filter((t) => {
    if (filterType === 'milestones') return t.type === 'milestone';
    if (filterType === 'summaries') return t.type === 'summary';
    return t.type === 'milestone' || t.type === 'summary' || t.priority === 'urgent' || t.priority === 'high';
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/50 p-6 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Línea de Tiempo del Proyecto</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hitos estratégicos, fases principales y entregables clave de {project.name}.
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg self-start">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Destacadas
            </button>
            <button
              onClick={() => setFilterType('milestones')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterType === 'milestones' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hitos (0d)
            </button>
            <button
              onClick={() => setFilterType('summaries')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterType === 'summaries' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fases / Resúmenes
            </button>
          </div>
        </div>

        {/* Timeline Path */}
        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
          {filteredTasks.map((task) => {
            const isMilestone = task.type === 'milestone';
            const isCompleted = task.progress === 100;
            const isSummary = task.type === 'summary';

            return (
              <div
                key={task.id}
                onClick={() => onOpenTaskDetail(task)}
                className="relative group cursor-pointer"
              >
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-transform group-hover:scale-110 shadow-xs ${
                    isCompleted
                      ? 'border-emerald-500 text-emerald-600'
                      : isMilestone
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-slate-400 text-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : isMilestone ? (
                    <Flag className="w-3 h-3" />
                  ) : (
                    <Layers className="w-3 h-3" />
                  )}
                </div>

                {/* Card */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-400">{task.wbs}</span>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {task.name}
                      </h3>
                      {isMilestone && (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          HITO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDisplayDate(task.startDate)}</span>
                      {!isMilestone && (
                        <>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span>{formatDisplayDate(task.endDate)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description / Resources */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      {task.assignedResources.length > 0 && (
                        <span>Resp: <strong className="text-slate-700">{task.assignedResources.join(', ')}</strong></span>
                      )}
                      {!isMilestone && (
                        <span>Duración: <strong className="text-slate-700">{task.durationDays} días ({task.workHours}h)</strong></span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-700">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay hitos ni tareas destacadas registradas en el cronograma.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
