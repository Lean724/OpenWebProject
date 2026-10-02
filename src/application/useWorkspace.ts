/**
 * OpenWebProject - Application Layer: Workspace & Command Bus Hook
 * Manages reactive Workspace state, Undo/Redo history, Autosave,
 * and passes user requests through the Planning Engine.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Workspace,
  Project,
  Task,
  TaskDependency,
  DependencyType,
  Baseline,
  Snapshot,
  ProjectCalendar,
} from '../types/project';
import {
  loadWorkspaceFromStorage,
  saveWorkspaceToStorage,
} from '../services/storage';
import {
  calculateSchedule,
  checkReprogrammingImpact,
  wouldCreateCycle,
} from '../domain/planningEngine';
import {
  indentTask,
  outdentTask,
  moveTaskUp,
  moveTaskDown,
  recalculateHierarchy,
} from '../domain/hierarchy';
import {
  calculateEndDate,
  countWorkingDays,
  DEFAULT_CALENDAR,
  getNextWorkingDay,
  getTodayString,
  stepDays,
} from '../domain/calendar';

export interface ReprogramPrompt {
  updatedTask: Task;
  affectedTasks: Task[];
  proposedSchedule: Task[];
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspaceFromStorage());
  
  // History for Undo (Ctrl+Z) & Redo (Ctrl+Y)
  const [history, setHistory] = useState<Workspace[]>([]);
  const [redoStack, setRedoStack] = useState<Workspace[]>([]);

  // Reprogramming impact modal state
  const [reprogramPrompt, setReprogramPrompt] = useState<ReprogramPrompt | null>(null);

  // Selected tasks IDs (for multi-selection & batch operations)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  // Active filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trafficFilter, setTrafficFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false);
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);

  // Gantt zoom level
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'fortnight' | 'month' | 'quarter' | 'year'>('day');
  
  // Active baseline comparison (null if none, or baseline id)
  const [activeBaselineId, setActiveBaselineId] = useState<string | null>(null);

  // Notification / Alert message for domain feedback (replaces browser alerts)
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  const activeProject = workspace.projects.find((p) => p.id === workspace.activeProjectId) || workspace.projects[0];

  // Autosave whenever workspace changes
  useEffect(() => {
    saveWorkspaceToStorage(workspace);
  }, [workspace]);

  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }, []);

  /**
   * Helper to push current state to Undo history before mutating
   */
  const commitChange = useCallback((newWorkspace: Workspace) => {
    setHistory((prev) => [...prev.slice(-30), workspace]); // keep last 30 actions
    setRedoStack([]);
    setWorkspace(newWorkspace);
  }, [workspace]);

  /**
   * Updates the active project with recalculated schedule
   */
  const updateActiveProject = useCallback((mutator: (curr: Project) => Project) => {
    setWorkspace((currWs) => {
      const projIndex = currWs.projects.findIndex((p) => p.id === currWs.activeProjectId);
      if (projIndex === -1) return currWs;

      const currentProj = currWs.projects[projIndex];
      const mutatedProj = mutator(currentProj);

      // Re-run planning engine
      const updatedTasks = calculateSchedule(mutatedProj.tasks, mutatedProj.calendar);

      const finalProj: Project = {
        ...mutatedProj,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      const updatedProjects = [...currWs.projects];
      updatedProjects[projIndex] = finalProj;

      const nextWs = {
        ...currWs,
        projects: updatedProjects,
      };

      // Push previous to history
      setHistory((prev) => [...prev.slice(-30), currWs]);
      setRedoStack([]);
      return nextWs;
    });
  }, []);

  // UNDO & REDO
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setRedoStack((r) => [...r, workspace]);
    setWorkspace(prev);
    showNotification('Acción deshecha', 'info');
  }, [history, workspace, showNotification]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, r.length - 1));
    setHistory((h) => [...h, workspace]);
    setWorkspace(next);
    showNotification('Acción rehecha', 'info');
  }, [redoStack, workspace, showNotification]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // TASK COMMANDS
  const createTask = useCallback((taskPartial?: Partial<Task>) => {
    updateActiveProject((proj) => {
      const today = getTodayString();
      const newDisplayId = proj.tasks.length + 1;
      const newTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const startDate = taskPartial?.startDate || getNextWorkingDay(today, proj.calendar);
      const durationDays = taskPartial?.durationDays !== undefined ? taskPartial.durationDays : 1;
      const endDate = calculateEndDate(startDate, durationDays, proj.calendar);

      const newTask: Task = {
        id: newTaskId,
        displayId: newDisplayId,
        wbs: `${newDisplayId}`,
        name: taskPartial?.name || `Nueva Tarea ${newDisplayId}`,
        startDate,
        endDate,
        durationDays,
        workHours: durationDays * (proj.calendar.hoursPerDay || 8),
        progress: 0,
        status: 'not_started',
        priority: 'medium',
        assignedResources: [],
        tags: [],
        dependencies: [],
        constraintType: 'ASAP',
        type: durationDays === 0 ? 'milestone' : 'normal',
        trafficLight: 'green',
        customFields: {},
        parentId: null,
        order: proj.tasks.length,
        ...taskPartial,
      };

      return {
        ...proj,
        tasks: [...proj.tasks, newTask],
      };
    });
    showNotification('Tarea creada correctamente', 'success');
  }, [updateActiveProject, showNotification]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>, bypassReprogramPrompt: boolean = false) => {
    const currentTask = activeProject.tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const mergedTask: Task = { ...currentTask, ...updates };

    // Auto-update duration and work hours consistency (Section 10 & 67)
    if (updates.durationDays !== undefined && updates.workHours === undefined) {
      mergedTask.workHours = updates.durationDays * (activeProject.calendar.hoursPerDay || 8);
    } else if (updates.workHours !== undefined && updates.durationDays === undefined) {
      mergedTask.durationDays = updates.workHours / (activeProject.calendar.hoursPerDay || 8);
    }

    // Auto-update status according to progress if not manually changing status (Section 24)
    if (updates.progress !== undefined && updates.status === undefined) {
      if (updates.progress === 0) mergedTask.status = 'not_started';
      else if (updates.progress === 100) mergedTask.status = 'completed';
      else if (currentTask.status === 'not_started' || currentTask.status === 'completed') {
        mergedTask.status = 'in_progress';
      }
    }

    // Recalculate end date if startDate or duration changed
    if (updates.startDate || updates.durationDays !== undefined) {
      mergedTask.endDate = calculateEndDate(
        mergedTask.startDate,
        mergedTask.durationDays,
        activeProject.calendar
      );
    }

    // Check impact on downstream tasks (Section 14 & AC-05)
    if (!bypassReprogramPrompt && (updates.startDate || updates.durationDays !== undefined)) {
      const impact = checkReprogrammingImpact(activeProject.tasks, mergedTask, activeProject.calendar);
      if (impact.hasImpact) {
        setReprogramPrompt({
          updatedTask: mergedTask,
          affectedTasks: impact.affectedTasks,
          proposedSchedule: impact.proposedSchedule,
        });
        return;
      }
    }

    updateActiveProject((proj) => ({
      ...proj,
      tasks: proj.tasks.map((t) => (t.id === taskId ? mergedTask : t)),
    }));
  }, [activeProject, updateActiveProject]);

  const confirmReprogramming = useCallback((proceed: boolean) => {
    if (!reprogramPrompt) return;
    const { updatedTask, proposedSchedule } = reprogramPrompt;
    setReprogramPrompt(null);

    if (proceed) {
      // Reprogram successors
      updateActiveProject((proj) => ({
        ...proj,
        tasks: proposedSchedule,
      }));
      showNotification('Tareas sucesoras reprogramadas', 'success');
    } else {
      // Keep manual modification without moving successors (Section 15)
      updateActiveProject((proj) => ({
        ...proj,
        tasks: proj.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }));
      showNotification('Modificación manual conservada', 'info');
    }
  }, [reprogramPrompt, updateActiveProject, showNotification]);

  const deleteTask = useCallback((taskId: string) => {
    const taskToDelete = activeProject.tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    // Check dependencies
    const hasIncoming = taskToDelete.dependencies.length;
    const hasOutgoing = activeProject.tasks.filter((t) =>
      t.dependencies.some((d) => d.predecessorId === taskId)
    ).length;

    updateActiveProject((proj) => {
      // Remove task and clean up any dependencies pointing to it
      const remainingTasks = proj.tasks
        .filter((t) => t.id !== taskId && t.parentId !== taskId)
        .map((t) => ({
          ...t,
          dependencies: t.dependencies.filter((d) => d.predecessorId !== taskId),
        }));

      return {
        ...proj,
        tasks: recalculateHierarchy(remainingTasks),
      };
    });

    if (hasIncoming > 0 || hasOutgoing > 0) {
      showNotification('Tarea y dependencias asociadas eliminadas', 'info');
    } else {
      showNotification('Tarea eliminada', 'info');
    }
  }, [activeProject, updateActiveProject, showNotification]);

  const deleteSelectedTasks = useCallback(() => {
    if (selectedTaskIds.length === 0) return;
    updateActiveProject((proj) => {
      const selectedSet = new Set(selectedTaskIds);
      const remaining = proj.tasks
        .filter((t) => !selectedSet.has(t.id) && (!t.parentId || !selectedSet.has(t.parentId)))
        .map((t) => ({
          ...t,
          dependencies: t.dependencies.filter((d) => !selectedSet.has(d.predecessorId)),
        }));
      return {
        ...proj,
        tasks: recalculateHierarchy(remaining),
      };
    });
    setSelectedTaskIds([]);
    showNotification('Tareas seleccionadas eliminadas', 'info');
  }, [selectedTaskIds, updateActiveProject, showNotification]);

  const duplicateTask = useCallback((taskId: string) => {
    const task = activeProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    createTask({
      name: `${task.name} (Copia)`,
      durationDays: task.durationDays,
      workHours: task.workHours,
      assignedResources: [...task.assignedResources],
      tags: [...task.tags],
      priority: task.priority,
      parentId: task.parentId,
    });
  }, [activeProject, createTask]);

  // HIERARCHY COMMANDS
  const handleIndent = useCallback((taskId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      tasks: indentTask(proj.tasks, taskId),
    }));
    showNotification('Nivel de jerarquía aumentado', 'info');
  }, [updateActiveProject, showNotification]);

  const handleOutdent = useCallback((taskId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      tasks: outdentTask(proj.tasks, taskId),
    }));
    showNotification('Nivel de jerarquía reducido', 'info');
  }, [updateActiveProject, showNotification]);

  const handleMoveUp = useCallback((taskId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      tasks: moveTaskUp(proj.tasks, taskId),
    }));
  }, [updateActiveProject]);

  const handleMoveDown = useCallback((taskId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      tasks: moveTaskDown(proj.tasks, taskId),
    }));
  }, [updateActiveProject]);

  // DEPENDENCIES
  const addDependency = useCallback((
    taskId: string,
    predecessorId: string,
    type: DependencyType = 'FS',
    lagDays: number = 0
  ) => {
    if (taskId === predecessorId) {
      showNotification('Una tarea no puede depender de sí misma', 'warning');
      return false;
    }

    // Cycle check (Section 62 & AC-06)
    if (wouldCreateCycle(activeProject.tasks, predecessorId, taskId)) {
      showNotification(
        'No se puede crear la dependencia porque generaría un ciclo de planificación.',
        'error'
      );
      return false;
    }

    updateActiveProject((proj) => {
      const updatedTasks = proj.tasks.map((t) => {
        if (t.id === taskId) {
          const exists = t.dependencies.some((d) => d.predecessorId === predecessorId);
          if (exists) {
            return {
              ...t,
              dependencies: t.dependencies.map((d) =>
                d.predecessorId === predecessorId ? { ...d, type, lagDays } : d
              ),
            };
          }
          const newDep: TaskDependency = {
            id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            predecessorId,
            type,
            lagDays,
          };
          return {
            ...t,
            dependencies: [...t.dependencies, newDep],
          };
        }
        return t;
      });

      return {
        ...proj,
        tasks: updatedTasks,
      };
    });

    showNotification('Dependencia vinculada', 'success');
    return true;
  }, [activeProject, updateActiveProject, showNotification]);

  const removeDependency = useCallback((taskId: string, depId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      tasks: proj.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            dependencies: t.dependencies.filter((d) => d.id !== depId),
          };
        }
        return t;
      }),
    }));
    showNotification('Dependencia eliminada', 'info');
  }, [updateActiveProject, showNotification]);

  // BASELINES (Section 20)
  const createBaseline = useCallback((name: string) => {
    updateActiveProject((proj) => {
      const baselineTasks: Record<string, any> = {};
      proj.tasks.forEach((t) => {
        baselineTasks[t.id] = {
          id: t.id,
          startDate: t.startDate,
          endDate: t.endDate,
          durationDays: t.durationDays,
          workHours: t.workHours,
          progress: t.progress,
          status: t.status,
          assignedResources: [...t.assignedResources],
          wbs: t.wbs,
          type: t.type,
        };
      });

      const newBaseline: Baseline = {
        id: `bl_${Date.now()}`,
        name: name || `Línea Base ${proj.baselines.length + 1}`,
        createdAt: new Date().toISOString(),
        tasks: baselineTasks,
      };

      return {
        ...proj,
        baselines: [...proj.baselines, newBaseline],
      };
    });
    showNotification('Línea base creada exitosamente', 'success');
  }, [updateActiveProject, showNotification]);

  const deleteBaseline = useCallback((baselineId: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      baselines: proj.baselines.filter((b) => b.id !== baselineId),
    }));
    if (activeBaselineId === baselineId) {
      setActiveBaselineId(null);
    }
    showNotification('Línea base eliminada', 'info');
  }, [activeBaselineId, updateActiveProject, showNotification]);

  // SNAPSHOTS (Section 37 & 38)
  const createSnapshot = useCallback((name: string, description: string = '') => {
    const newSnapshot: Snapshot = {
      id: `snap_${Date.now()}`,
      name: name || `Snapshot ${new Date().toLocaleDateString('es-ES')}`,
      description,
      createdAt: new Date().toISOString(),
      projectData: JSON.parse(JSON.stringify(activeProject)),
    };

    updateActiveProject((proj) => ({
      ...proj,
      snapshots: [...proj.snapshots, newSnapshot],
    }));
    showNotification('Snapshot guardado en el historial', 'success');
  }, [activeProject, updateActiveProject, showNotification]);

  const restoreSnapshot = useCallback((snapshotId: string, createBackupFirst: boolean) => {
    const snapshot = activeProject.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;

    if (createBackupFirst) {
      createSnapshot('Respaldo previo a restauración', 'Generado automáticamente antes de restaurar.');
    }

    setWorkspace((currWs) => {
      const projIndex = currWs.projects.findIndex((p) => p.id === currWs.activeProjectId);
      if (projIndex === -1) return currWs;

      const restoredProject: Project = {
        ...JSON.parse(JSON.stringify(snapshot.projectData)),
        updatedAt: new Date().toISOString(),
      };

      const updatedProjects = [...currWs.projects];
      updatedProjects[projIndex] = restoredProject;

      setHistory((prev) => [...prev.slice(-30), currWs]);
      setRedoStack([]);

      return {
        ...currWs,
        projects: updatedProjects,
      };
    });

    showNotification('Snapshot restaurado correctamente', 'success');
  }, [activeProject, createSnapshot, showNotification]);

  // CALENDAR & DAYS OFF (Section 11)
  const updateCalendar = useCallback((calendar: ProjectCalendar) => {
    updateActiveProject((proj) => ({
      ...proj,
      calendar,
    }));
    showNotification('Calendario laboral actualizado', 'success');
  }, [updateActiveProject, showNotification]);

  const addDayOff = useCallback((dateStr: string) => {
    updateActiveProject((proj) => {
      if (proj.calendar.daysOff.includes(dateStr)) return proj;
      return {
        ...proj,
        calendar: {
          ...proj.calendar,
          daysOff: [...proj.calendar.daysOff, dateStr].sort(),
        },
      };
    });
    showNotification(`Día no laborable agregado: ${dateStr}`, 'info');
  }, [updateActiveProject, showNotification]);

  const removeDayOff = useCallback((dateStr: string) => {
    updateActiveProject((proj) => ({
      ...proj,
      calendar: {
        ...proj.calendar,
        daysOff: proj.calendar.daysOff.filter((d) => d !== dateStr),
      },
    }));
  }, [updateActiveProject]);

  // WORKSPACE / PROJECT MANAGEMENT (Section 4 & 5)
  const switchProject = useCallback((projectId: string) => {
    setWorkspace((curr) => ({
      ...curr,
      activeProjectId: projectId,
    }));
    setSelectedTaskIds([]);
  }, []);

  const createProject = useCallback((name: string) => {
    const today = getTodayString();
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: name || `Nuevo Proyecto ${workspace.projects.length + 1}`,
      description: 'Nuevo proyecto creado en el Workspace.',
      startDate: today,
      endDate: stepDays(today, 30),
      status: 'Planificación',
      priority: 'medium',
      tags: [],
      customFieldDefinitions: [],
      calendar: DEFAULT_CALENDAR,
      tasks: [],
      resources: [],
      baselines: [],
      snapshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWorkspace((curr) => ({
      ...curr,
      activeProjectId: newProj.id,
      projects: [...curr.projects, newProj],
    }));
    showNotification(`Proyecto "${newProj.name}" creado`, 'success');
  }, [workspace.projects.length, showNotification]);

  const renameProject = useCallback((projectId: string, newName: string) => {
    setWorkspace((curr) => ({
      ...curr,
      projects: curr.projects.map((p) => (p.id === projectId ? { ...p, name: newName } : p)),
    }));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    if (workspace.projects.length <= 1) {
      showNotification('No se puede eliminar el único proyecto del Workspace', 'warning');
      return;
    }
    setWorkspace((curr) => {
      const remaining = curr.projects.filter((p) => p.id !== projectId);
      const nextActiveId = curr.activeProjectId === projectId ? remaining[0].id : curr.activeProjectId;
      return {
        ...curr,
        activeProjectId: nextActiveId,
        projects: remaining,
      };
    });
    showNotification('Proyecto eliminado', 'info');
  }, [workspace.projects.length, showNotification]);

  const importProjectData = useCallback((importedProj: Project, conflictAction: 'replace' | 'copy' = 'copy') => {
    setWorkspace((curr) => {
      let finalProj = { ...importedProj };
      const exists = curr.projects.some((p) => p.name.trim().toLowerCase() === importedProj.name.trim().toLowerCase());

      if (exists) {
        if (conflictAction === 'replace') {
          return {
            ...curr,
            activeProjectId: finalProj.id,
            projects: curr.projects.map((p) => (p.name.trim().toLowerCase() === importedProj.name.trim().toLowerCase() ? finalProj : p)),
          };
        } else {
          finalProj.id = `proj_imported_${Date.now()}`;
          finalProj.name = `${importedProj.name} (Copia)`;
        }
      }

      return {
        ...curr,
        activeProjectId: finalProj.id,
        projects: [...curr.projects, finalProj],
      };
    });
    showNotification(`Proyecto "${importedProj.name}" importado`, 'success');
  }, [showNotification]);

  const importWorkspaceData = useCallback((importedWs: Workspace) => {
    setWorkspace(importedWs);
    showNotification('Workspace importado exitosamente', 'success');
  }, [showNotification]);

  // Batch operations on selected tasks (Section 64)
  const batchUpdateSelected = useCallback((updates: Partial<Task>) => {
    if (selectedTaskIds.length === 0) return;
    updateActiveProject((proj) => ({
      ...proj,
      tasks: proj.tasks.map((t) => (selectedTaskIds.includes(t.id) ? { ...t, ...updates } : t)),
    }));
    showNotification(`Actualizadas ${selectedTaskIds.length} tareas`, 'success');
  }, [selectedTaskIds, updateActiveProject, showNotification]);

  return {
    workspace,
    activeProject,
    selectedTaskIds,
    setSelectedTaskIds,
    reprogramPrompt,
    confirmReprogramming,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    notification,
    createTask,
    updateTask,
    deleteTask,
    deleteSelectedTasks,
    duplicateTask,
    handleIndent,
    handleOutdent,
    handleMoveUp,
    handleMoveDown,
    addDependency,
    removeDependency,
    createBaseline,
    deleteBaseline,
    activeBaselineId,
    setActiveBaselineId,
    createSnapshot,
    restoreSnapshot,
    updateCalendar,
    addDayOff,
    removeDayOff,
    switchProject,
    createProject,
    renameProject,
    deleteProject,
    importProjectData,
    importWorkspaceData,
    batchUpdateSelected,
    // Filters and Zoom
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    trafficFilter,
    setTrafficFilter,
    resourceFilter,
    setResourceFilter,
    onlyCritical,
    setOnlyCritical,
    onlyOverdue,
    setOnlyOverdue,
    zoomLevel,
    setZoomLevel,
  };
}
