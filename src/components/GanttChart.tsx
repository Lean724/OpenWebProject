/**
 * OpenWebProject - Gantt Chart Component
 * Section 29, 30, 32: Interactive SVG/HTML Gantt with dependencies,
 * baselines, critical path, zoom scales, and inline dragging.
 */
import React, { useRef, useState, useMemo } from 'react';
import { Task, Baseline, ProjectCalendar } from '../types/project';
import {
  parseDateParts,
  dateStringToUtc,
  utcToDateString,
  stepDays,
  isWorkingDay,
  formatDate,
  formatDisplayDate,
  getTodayString,
} from '../domain/calendar';

interface GanttChartProps {
  tasks: Task[];
  allTasks: Task[];
  calendar: ProjectCalendar;
  zoomLevel: 'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'year';
  activeBaseline: Baseline | null;
  onlyCritical: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onOpenTaskDetail: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  allTasks,
  calendar,
  zoomLevel,
  activeBaseline,
  onlyCritical,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onOpenTaskDetail,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: 'move' | 'resize';
    startX: number;
    origStartDate: string;
    origDurationDays: number;
  } | null>(null);

  // Column width configuration based on zoom
  const dayWidth = useMemo(() => {
    switch (zoomLevel) {
      case 'day': return 36;
      case 'week': return 20;
      case 'fortnight': return 14;
      case 'month': return 9;
      case 'quarter': return 5;
      case 'year': return 3;
      default: return 36;
    }
  }, [zoomLevel]);

  const rowHeight = 32; // Matches table row height exactly

  // Calculate project bounds for the timeline
  const { minDate, totalDays, datesList } = useMemo(() => {
    if (tasks.length === 0) {
      const today = getTodayString();
      return { minDate: today, totalDays: 30, datesList: Array.from({ length: 30 }, (_, i) => stepDays(today, i)) };
    }

    let min = tasks[0].startDate;
    let max = tasks[0].endDate;

    tasks.forEach((t) => {
      if (t.startDate < min) min = t.startDate;
      if (t.endDate > max) max = t.endDate;
    });

    // Also factor active baseline dates
    if (activeBaseline) {
      Object.values(activeBaseline.tasks).forEach((bt) => {
        if (bt.startDate < min) min = bt.startDate;
        if (bt.endDate > max) max = bt.endDate;
      });
    }

    // Add padding days around the project
    const paddedMin = stepDays(min, -7);
    const paddedMax = stepDays(max, 14);

    const utcMin = dateStringToUtc(paddedMin);
    const utcMax = dateStringToUtc(paddedMax);
    const diffMs = utcMax.getTime() - utcMin.getTime();
    const count = Math.max(30, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
      dates.push(stepDays(paddedMin, i));
    }

    return { minDate: paddedMin, totalDays: count, datesList: dates };
  }, [tasks, activeBaseline]);

  // Coordinate helper: converts date string to X pixel position
  const getXForDate = (dateStr: string): number => {
    const utcStart = dateStringToUtc(minDate);
    const utcCurrent = dateStringToUtc(dateStr);
    const daysDiff = (utcCurrent.getTime() - utcStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, daysDiff * dayWidth);
  };

  // Group dates into months for the top header row
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIdx: number; count: number }[] = [];
    let currentLabel = '';
    let startIdx = 0;
    let count = 0;

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    datesList.forEach((d, idx) => {
      const [y, m] = parseDateParts(d);
      const label = `${monthNames[m - 1]} ${y}`;
      if (label !== currentLabel) {
        if (currentLabel) {
          groups.push({ label: currentLabel, startIdx, count });
        }
        currentLabel = label;
        startIdx = idx;
        count = 1;
      } else {
        count++;
      }
    });

    if (currentLabel) {
      groups.push({ label: currentLabel, startIdx, count });
    }

    return groups;
  }, [datesList]);

  const today = getTodayString();
  const todayX = getXForDate(today);

  // Mouse drag handlers for Gantt bars
  const handleMouseDown = (
    e: React.MouseEvent,
    task: Task,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    if (task.type === 'summary') return; // Summary tasks are auto-calculated from children

    setDragState({
      taskId: task.id,
      mode,
      startX: e.clientX,
      origStartDate: task.startDate,
      origDurationDays: task.durationDays,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (dragState.mode === 'move') {
      const newStartDate = stepDays(dragState.origStartDate, deltaDays);
      onUpdateTask(dragState.taskId, { startDate: newStartDate });
    } else if (dragState.mode === 'resize') {
      const newDuration = Math.max(0, dragState.origDurationDays + deltaDays);
      onUpdateTask(dragState.taskId, {
        durationDays: newDuration,
        type: newDuration === 0 ? 'milestone' : 'normal',
      });
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  // Map task IDs to vertical center Y position for dependency arrow rendering
  const taskRowPositions = useMemo(() => {
    const map = new Map<string, { y: number; startX: number; endX: number }>();
    tasks.forEach((t, idx) => {
      const startX = getXForDate(t.startDate);
      const width = Math.max(dayWidth, t.durationDays * dayWidth);
      const endX = startX + width;
      const y = idx * rowHeight + rowHeight / 2;
      map.set(t.id, { y, startX, endX });
    });
    return map;
  }, [tasks, dayWidth, minDate]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="h-full w-full overflow-auto bg-white select-none relative"
    >
      <div
        className="relative"
        style={{ width: `${totalDays * dayWidth}px`, minHeight: '100%' }}
      >
        {/* TIME SCALE HEADER (Sticky Top) */}
        <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
          {/* Top Month Header Row */}
          <div className="flex h-5 border-b border-slate-200 text-[10px] font-semibold text-slate-700">
            {monthGroups.map((g, idx) => (
              <div
                key={idx}
                className="px-2 py-0.5 border-r border-slate-200 truncate flex items-center bg-slate-100/70"
                style={{ width: `${g.count * dayWidth}px` }}
              >
                {g.label}
              </div>
            ))}
          </div>

          {/* Lower Day / Week Header Row */}
          <div className="flex h-5 text-[10px] text-slate-500 font-mono">
            {datesList.map((d, idx) => {
              const [, , dayNum] = parseDateParts(d);
              const isWorkDay = isWorkingDay(d, calendar);
              const isToday = d === today;

              return (
                <div
                  key={d}
                  className={`text-center py-0.5 border-r border-slate-200 truncate ${
                    isToday
                      ? 'bg-amber-100/80 font-bold text-amber-900'
                      : !isWorkDay
                      ? 'bg-slate-200/50 text-slate-400'
                      : ''
                  }`}
                  style={{ width: `${dayWidth}px` }}
                  title={`${formatDisplayDate(d)}${!isWorkDay ? ' (No laborable)' : ''}`}
                >
                  {dayWidth >= 20 ? dayNum : idx % 5 === 0 ? dayNum : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* BACKGROUND DAY COLUMNS & NON-WORKING DAYS SHADING */}
        <div className="absolute inset-0 top-10 pointer-events-none flex">
          {datesList.map((d) => {
            const isWorkDay = isWorkingDay(d, calendar);
            const isToday = d === today;

            return (
              <div
                key={d}
                className={`border-r border-slate-100 h-full ${
                  isToday
                    ? 'bg-amber-50/20'
                    : !isWorkDay
                    ? 'bg-slate-100/60'
                    : ''
                }`}
                style={{ width: `${dayWidth}px` }}
              />
            );
          })}
        </div>

        {/* TODAY INDICATOR LINE */}
        {todayX >= 0 && (
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none border-l-2 border-rose-500 shadow-xs"
            style={{ left: `${todayX + dayWidth / 2}px` }}
          >
            <div className="bg-rose-500 text-white font-mono text-[9px] px-1 py-0.5 rounded-b font-bold tracking-tight -translate-x-1/2">
              Hoy
            </div>
          </div>
        )}

        {/* SVG DEPENDENCY ARROWS OVERLAY */}
        <svg
          className="absolute inset-0 top-10 pointer-events-none z-10 w-full h-full"
          style={{ width: `${totalDays * dayWidth}px`, height: `${tasks.length * rowHeight}px` }}
        >
          <defs>
            <marker
              id="gantt-arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#64748B" />
            </marker>
            <marker
              id="gantt-arrow-crit"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#EF4444" />
            </marker>
          </defs>

          {tasks.map((task) =>
            task.dependencies.map((dep) => {
              const predPos = taskRowPositions.get(dep.predecessorId);
              const succPos = taskRowPositions.get(task.id);
              if (!predPos || !succPos) return null;

              const isCrit = (task.isCritical || onlyCritical) && allTasks.find(t => t.id === dep.predecessorId)?.isCritical;
              const strokeColor = isCrit ? '#EF4444' : '#64748B';
              const markerId = isCrit ? 'url(#gantt-arrow-crit)' : 'url(#gantt-arrow)';

              let startX = predPos.endX;
              let startY = predPos.y;
              let endX = succPos.startX;
              let endY = succPos.y;

              // Orthogonal route: exit right, vertical bend, enter left
              const midX = startX + Math.max(8, (endX - startX) / 2);
              const pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

              return (
                <path
                  key={`${dep.predecessorId}_${task.id}`}
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeDasharray={dep.type !== 'FS' ? '3,2' : undefined}
                  markerEnd={markerId}
                />
              );
            })
          )}
        </svg>

        {/* GANTT TASK BARS ROWS */}
        <div className="relative pt-10">
          {tasks.map((task, idx) => {
            const isSelected = selectedTaskId === task.id;
            const startX = getXForDate(task.startDate);
            const isSummary = task.type === 'summary';
            const isMilestone = task.type === 'milestone';
            const barWidth = isMilestone ? 16 : Math.max(dayWidth, task.durationDays * dayWidth);
            const isCrit = (onlyCritical || task.isCritical) && !isMilestone;

            // Baseline task data if active
            const baselineTask = activeBaseline ? activeBaseline.tasks[task.id] : null;
            const baselineStartX = baselineTask ? getXForDate(baselineTask.startDate) : 0;
            const baselineWidth = baselineTask ? Math.max(dayWidth, baselineTask.durationDays * dayWidth) : 0;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`relative h-8 border-b border-slate-100 flex items-center transition-colors ${
                  isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* 1. Baseline Ghost Bar (Section 21: Baseline vs Actual) */}
                {baselineTask && (
                  <div
                    className="absolute h-1.5 bg-slate-400/80 rounded-xs top-[23px] z-5"
                    style={{ left: `${baselineStartX}px`, width: `${baselineWidth}px` }}
                    title={`Línea Base: ${formatDisplayDate(baselineTask.startDate)} a ${formatDisplayDate(baselineTask.endDate)} (${baselineTask.durationDays}d)`}
                  />
                )}

                {/* 2. Main Task Bar */}
                {isSummary ? (
                  /* Summary Task Bar (Bracket style) */
                  <div
                    className="absolute h-3.5 bg-slate-800 rounded-xs z-15 flex items-center cursor-pointer shadow-xs"
                    style={{ left: `${startX}px`, width: `${barWidth}px` }}
                    onClick={() => onOpenTaskDetail(task)}
                    title={`Resumen: ${task.name} (${task.progress}%)`}
                  >
                    {/* Inner progress fill */}
                    <div
                      className="h-full bg-indigo-500 rounded-xs"
                      style={{ width: `${task.progress}%` }}
                    />
                    {/* Left & Right Bracket Downward Wings */}
                    <div className="absolute left-0 -bottom-1.5 w-1.5 h-2 bg-slate-800" />
                    <div className="absolute right-0 -bottom-1.5 w-1.5 h-2 bg-slate-800" />
                  </div>
                ) : isMilestone ? (
                  /* Milestone (45 degree rotated diamond) */
                  <div
                    className="absolute z-15 cursor-pointer -translate-x-1/2"
                    style={{ left: `${startX + dayWidth / 2}px` }}
                    onClick={() => onOpenTaskDetail(task)}
                    title={`Hito: ${task.name} (${formatDisplayDate(task.startDate)})`}
                  >
                    <div className="w-3.5 h-3.5 bg-indigo-600 rotate-45 border-2 border-white shadow-xs hover:scale-125 transition-transform" />
                  </div>
                ) : (
                  /* Normal Task Bar */
                  <div
                    className={`group absolute h-5 rounded-md z-15 flex items-center cursor-move overflow-hidden border shadow-xs ${
                      isCrit
                        ? 'bg-rose-100 border-rose-300'
                        : 'bg-indigo-100 border-indigo-200'
                    }`}
                    style={{ left: `${startX}px`, width: `${barWidth}px` }}
                    onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                    onDoubleClick={() => onOpenTaskDetail(task)}
                    title={`${task.name}: ${formatDisplayDate(task.startDate)} a ${formatDisplayDate(task.endDate)} (${task.durationDays}d, ${task.progress}%)`}
                  >
                    {/* Inner Progress Bar */}
                    <div
                      className={`h-full ${
                        isCrit ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />

                    {/* Task Title Overlay inside bar */}
                    {barWidth > 60 && (
                      <span className="absolute left-2 text-[10px] font-medium text-slate-800 truncate pointer-events-none drop-shadow-2xs">
                        {task.name}
                      </span>
                    )}

                    {/* Resize handle on right edge */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 hover:bg-slate-900/20 cursor-ew-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, task, 'resize');
                      }}
                      title="Arrastrar para ajustar duración"
                    />
                  </div>
                )}

                {/* External Task Label on the right of bar */}
                <div
                  className="absolute text-[11px] font-medium text-slate-600 truncate pointer-events-none pl-2 flex items-center gap-1.5"
                  style={{ left: `${startX + barWidth}px` }}
                >
                  <span className="truncate max-w-xs">{task.name}</span>
                  {task.assignedResources.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      [{task.assignedResources.join(', ')}]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
