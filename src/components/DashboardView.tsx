/**
 * OpenWebProject - Dashboard View
 * Section 33: High-density executive KPI analytics and status overview.
 */
import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Ban,
  Activity,
  Calendar,
  Users,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Project, Task } from '../types/project';
import { formatDisplayDate, getTodayString } from '../domain/calendar';

interface DashboardViewProps {
  project: Project;
  onGoToGantt: () => void;
  onOpenTaskDetail: (task: Task) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  onGoToGantt,
  onOpenTaskDetail,
}) => {
  const tasks = project.tasks;
  const today = getTodayString();

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.progress === 100 || t.status === 'completed');
  const inProgressTasks = tasks.filter((t) => t.progress > 0 && t.progress < 100);
  const overdueTasks = tasks.filter((t) => t.trafficLight === 'red');
  const warningTasks = tasks.filter((t) => t.trafficLight === 'yellow');
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const criticalTasks = tasks.filter((t) => t.isCritical);

  // Overall Weighted Progress
  const totalWork = tasks.reduce((sum, t) => sum + (t.workHours || 1), 0);
  const weightedProgress = totalWork > 0
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress * (t.workHours || 1), 0) / totalWork)
    : 0;

  // Upcoming deadlines (tasks ending in the next 14 days and not completed)
  const upcomingTasks = tasks
    .filter((t) => t.progress < 100 && t.endDate >= today)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .slice(0, 6);

  // Resource workload count
  const resourceMap: Record<string, number> = {};
  tasks.forEach((t) => {
    t.assignedResources.forEach((r) => {
      resourceMap[r] = (resourceMap[r] || 0) + 1;
    });
  });
  const topResources = Object.entries(resourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/50 p-6 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{project.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Responsable: <span className="text-slate-800 font-medium">{project.manager || 'No asignado'}</span> · Inicio: {formatDisplayDate(project.startDate)} · Fin previsto: {formatDisplayDate(project.endDate)}
            </p>
          </div>
          <button
            onClick={onGoToGantt}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs self-start"
          >
            <span>Abrir Diagrama de Gantt</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tareas Totales</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{totalTasks}</div>
            <div className="text-[11px] text-slate-400 mt-1">{completedTasks.length} finalizadas</div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progreso Global</span>
            <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">{weightedProgress}%</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${weightedProgress}%` }} />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">En Progreso</span>
            <div className="text-2xl font-bold font-mono text-sky-600 mt-1">{inProgressTasks.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Activas actualmente</div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Atrasadas (Rojo)</span>
            <div className="text-2xl font-bold font-mono text-rose-600 mt-1">{overdueTasks.length}</div>
            <div className="text-[11px] text-rose-500 font-medium mt-1">Vencidas sin finalizar</div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Desviadas (Amarillo)</span>
            <div className="text-2xl font-bold font-mono text-amber-600 mt-1">{warningTasks.length}</div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">Bajo progreso esperado</div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Camino Crítico</span>
            <div className="text-2xl font-bold font-mono text-slate-800 mt-1">{criticalTasks.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Margen libre 0 días</div>
          </div>
        </div>

        {/* Split Grid: Overdue Tasks Alert & Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue / High Attention Tasks */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tareas Críticas y Atrasadas
                </h3>
              </div>
              <span className="text-[11px] font-mono text-rose-600 font-semibold">{overdueTasks.length} tareas</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {overdueTasks.length > 0 ? (
                overdueTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t)}
                    className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg flex items-center justify-between gap-3 text-xs hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 truncate">{t.name}</div>
                      <div className="text-[11px] text-rose-600 font-mono mt-0.5">
                        Venció: {formatDisplayDate(t.endDate)} · Progreso: {t.progress}%
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 rounded">
                      DESVIADA
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                  <span>No hay tareas vencidas. ¡El cronograma marcha en plazo!</span>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Próximos Vencimientos
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Próximos 14 días</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTaskDetail(t)}
                    className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 text-xs hover:bg-slate-100/80 cursor-pointer transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-medium text-slate-900 truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Entrega: {formatDisplayDate(t.endDate)} ({t.durationDays}d)
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-slate-700 text-xs font-semibold">{t.progress}%</span>
                      {t.assignedResources[0] && (
                        <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                          {t.assignedResources[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No hay entregas pendientes en los próximos días.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resources Workload Summary */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Asignación de Recursos y Personas
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topResources.map(([resourceName, count]) => (
              <div key={resourceName} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="text-xs font-semibold text-slate-800 truncate">{resourceName}</div>
                <div className="flex items-center justify-between mt-2 text-xs font-mono text-slate-500">
                  <span>Tareas asignadas:</span>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
              </div>
            ))}
            {topResources.length === 0 && (
              <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                No hay recursos asignados a las tareas aún.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
