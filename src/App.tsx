/**
 * OpenWebProject - Main Application Entry
 * Section 1 & 2: Offline-first, browser-executable, no install, no accounts.
 */
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useWorkspace } from './application/useWorkspace';
import { TopHeader, ActiveView } from './components/TopHeader';
import { ProjectTabs } from './components/ProjectTabs';
import { Toolbar } from './components/Toolbar';
import { TaskTable } from './components/TaskTable';
import { GanttChart } from './components/GanttChart';
import { TimelineView } from './components/TimelineView';
import { DashboardView } from './components/DashboardView';
import { ReprogramModal } from './components/ReprogramModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { BaselineModal } from './components/BaselineModal';
import { SnapshotModal } from './components/SnapshotModal';
import { CalendarModal } from './components/CalendarModal';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { RunLocalModal } from './components/RunLocalModal';
import { NotificationToast } from './components/NotificationToast';
import { Task } from './types/project';
import { exportProjectToJson, downloadFile } from './services/importExport';

export default function App() {
  const {
    workspace,
    activeProject,
    selectedTaskIds,
    setSelectedTaskIds,
    reprogramPrompt,
    confirmReprogramming,
    canUndo,
    canRedo,
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
  } = useWorkspace();

  // Active Main View Navigation
  const [activeView, setActiveView] = useState<ActiveView>('split');

  // Split view resizable percentage (Table width vs Gantt width)
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Active Modals
  const [inspectingTask, setInspectingTask] = useState<Task | null>(null);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  // Split resizer mouse drag handlers
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  };

  const handleSplitMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingSplit || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const pct = Math.min(80, Math.max(20, (currentX / rect.width) * 100));
      setSplitPercent(pct);
    },
    [isResizingSplit]
  );

  const handleSplitMouseUp = useCallback(() => {
    setIsResizingSplit(false);
  }, []);

  useEffect(() => {
    if (isResizingSplit) {
      window.addEventListener('mousemove', handleSplitMouseMove);
      window.addEventListener('mouseup', handleSplitMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleSplitMouseMove);
        window.removeEventListener('mouseup', handleSplitMouseUp);
      };
    }
  }, [isResizingSplit, handleSplitMouseMove, handleSplitMouseUp]);

  // Global Keyboard Shortcuts (Section 73: Atajos de teclado)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S -> Quick Save .project
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const json = exportProjectToJson(activeProject);
        downloadFile(json, `${activeProject.name.replace(/\s+/g, '_')}.project`, 'application/json');
      }
      // Ctrl+O / Cmd+O -> Open Import Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsImportModalOpen(true);
      }
      // Delete key with selected tasks
      if (e.key === 'Delete' && selectedTaskIds.length > 0) {
        if (!inspectingTask && !isImportModalOpen && !isExportModalOpen) {
          deleteSelectedTasks();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [activeProject, selectedTaskIds, inspectingTask, isImportModalOpen, isExportModalOpen, deleteSelectedTasks]);

  // Filter tasks based on active search, status, traffic light, and critical path
  const filteredTasks = useMemo(() => {
    return activeProject.tasks.filter((t) => {
      // Search text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesWbs = t.wbs.toLowerCase().includes(q);
        const matchesResource = t.assignedResources.some((r) => r.toLowerCase().includes(q));
        const matchesTag = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesWbs && !matchesResource && !matchesTag) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Traffic light filter
      if (trafficFilter !== 'all' && t.trafficLight !== trafficFilter) return false;

      // Critical path filter
      if (onlyCritical && !t.isCritical) return false;

      // Overdue filter
      if (onlyOverdue && t.trafficLight !== 'red') return false;

      return true;
    });
  }, [activeProject.tasks, searchQuery, statusFilter, trafficFilter, onlyCritical, onlyOverdue]);

  // Selection handlers
  const handleToggleSelect = (taskId: string, isShift: boolean, isCtrl: boolean) => {
    setSelectedTaskIds((prev) => {
      if (isCtrl) {
        return prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      }
      if (isShift && prev.length > 0) {
        const lastSelectedId = prev[prev.length - 1];
        const lastIdx = filteredTasks.findIndex((t) => t.id === lastSelectedId);
        const currIdx = filteredTasks.findIndex((t) => t.id === taskId);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const rangeIds = filteredTasks.slice(start, end + 1).map((t) => t.id);
          return Array.from(new Set([...prev, ...rangeIds]));
        }
      }
      return prev.includes(taskId) && prev.length === 1 ? [] : [taskId];
    });
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const firstSelectedId = selectedTaskIds[0] || null;

  // Active baseline object if selected
  const activeBaseline = activeProject.baselines.find((b) => b.id === activeBaselineId) || null;

  // Quick action: Download standalone offline executable HTML
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
        return;
      }
    } catch {
      // Fallback
    }

    try {
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
        return;
      }
    } catch {
      // Fallback
    }

    const currentHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    downloadFile(currentHtml, 'OpenWebProject.html', 'text/html');
  };

  // Quick action: Fit to screen
  const handleFitToScreen = () => {
    if (activeProject.tasks.length > 60) setZoomLevel('month');
    else if (activeProject.tasks.length > 25) setZoomLevel('fortnight');
    else if (activeProject.tasks.length > 10) setZoomLevel('week');
    else setZoomLevel('day');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* 1. Universal Top Bar Header */}
      <TopHeader
        workspace={workspace}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onDownloadOfflineApp={handleDownloadOfflineApp}
        onOpenRunLocalModal={() => setIsRunModalOpen(true)}
        onQuickSave={() => {
          const json = exportProjectToJson(activeProject);
          downloadFile(json, `${activeProject.name.replace(/\s+/g, '_')}.project`, 'application/json');
        }}
      />

      {/* 2. Workspace Project Tabs */}
      <ProjectTabs
        workspace={workspace}
        activeProjectId={activeProject.id}
        onSwitchProject={switchProject}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
      />

      {/* 3. Planning & Productivity Toolbar */}
      <Toolbar
        project={activeProject}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onCreateTask={() => createTask()}
        onQuickMilestone={() => createTask({ durationDays: 0, name: 'Nuevo Hito' })}
        selectedTaskCount={selectedTaskIds.length}
        onIndent={() => firstSelectedId && handleIndent(firstSelectedId)}
        onOutdent={() => firstSelectedId && handleOutdent(firstSelectedId)}
        onMoveUp={() => firstSelectedId && handleMoveUp(firstSelectedId)}
        onMoveDown={() => firstSelectedId && handleMoveDown(firstSelectedId)}
        onDeleteSelected={deleteSelectedTasks}
        onOpenCalendar={() => setIsCalendarModalOpen(true)}
        onOpenBaselines={() => setIsBaselineModalOpen(true)}
        onOpenSnapshots={() => setIsSnapshotModalOpen(true)}
        onlyCritical={onlyCritical}
        onToggleCritical={() => setOnlyCritical(!onlyCritical)}
        activeBaselineId={activeBaselineId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        trafficFilter={trafficFilter}
        onTrafficChange={setTrafficFilter}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onFitToScreen={handleFitToScreen}
      />

      {/* 4. Main View Body */}
      <main className="flex-1 overflow-hidden relative">
        {/* VIEW 1: Split View (Table + Gantt with Resizable Divider) */}
        {activeView === 'split' && (
          <div ref={splitContainerRef} className="flex h-full w-full overflow-hidden select-none">
            {/* Left pane: Task Table */}
            <div style={{ width: `${splitPercent}%` }} className="h-full overflow-hidden flex flex-col shrink-0">
              <TaskTable
                tasks={filteredTasks}
                allTasks={activeProject.tasks}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onDuplicateTask={duplicateTask}
                onOpenTaskDetail={(t) => setInspectingTask(t)}
                onAddSubtask={(parentId) => createTask({ parentId, name: 'Nueva Subtarea' })}
                resourcesList={activeProject.resources}
              />
            </div>

            {/* Draggable Divider */}
            <div
              onMouseDown={handleSplitMouseDown}
              className={`w-1.5 h-full bg-slate-200 hover:bg-indigo-500 cursor-col-resize shrink-0 transition-colors z-30 relative ${
                isResizingSplit ? 'bg-indigo-600' : ''
              }`}
              title="Arrastrar para redimensionar tabla y diagrama de Gantt"
            />

            {/* Right pane: Gantt Chart */}
            <div style={{ width: `${100 - splitPercent}%` }} className="h-full overflow-hidden flex flex-col flex-1">
              <GanttChart
                tasks={filteredTasks}
                allTasks={activeProject.tasks}
                calendar={activeProject.calendar}
                zoomLevel={zoomLevel}
                activeBaseline={activeBaseline}
                onlyCritical={onlyCritical}
                selectedTaskId={firstSelectedId}
                onSelectTask={(id) => setSelectedTaskIds([id])}
                onUpdateTask={updateTask}
                onOpenTaskDetail={(t) => setInspectingTask(t)}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: Table Only */}
        {activeView === 'table' && (
          <div className="h-full w-full overflow-hidden">
            <TaskTable
              tasks={filteredTasks}
              allTasks={activeProject.tasks}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onDuplicateTask={duplicateTask}
              onOpenTaskDetail={(t) => setInspectingTask(t)}
              onAddSubtask={(parentId) => createTask({ parentId, name: 'Nueva Subtarea' })}
              resourcesList={activeProject.resources}
            />
          </div>
        )}

        {/* VIEW 3: Gantt Only */}
        {activeView === 'gantt' && (
          <div className="h-full w-full overflow-hidden">
            <GanttChart
              tasks={filteredTasks}
              allTasks={activeProject.tasks}
              calendar={activeProject.calendar}
              zoomLevel={zoomLevel}
              activeBaseline={activeBaseline}
              onlyCritical={onlyCritical}
              selectedTaskId={firstSelectedId}
              onSelectTask={(id) => setSelectedTaskIds([id])}
              onUpdateTask={updateTask}
              onOpenTaskDetail={(t) => setInspectingTask(t)}
            />
          </div>
        )}

        {/* VIEW 4: Timeline Roadmap */}
        {activeView === 'timeline' && (
          <TimelineView project={activeProject} onOpenTaskDetail={(t) => setInspectingTask(t)} />
        )}

        {/* VIEW 5: Dashboard Analytics */}
        {activeView === 'dashboard' && (
          <DashboardView
            project={activeProject}
            onGoToGantt={() => setActiveView('split')}
            onOpenTaskDetail={(t) => setInspectingTask(t)}
          />
        )}
      </main>

      {/* 5. Modals and Dialogues */}
      {/* Reprogramming Impact Dialogue */}
      <ReprogramModal
        prompt={reprogramPrompt}
        onConfirm={confirmReprogramming}
        onCancel={() => confirmReprogramming(false)}
      />

      {/* Task Inspection & Editing Modal */}
      <TaskDetailModal
        task={inspectingTask}
        allTasks={activeProject.tasks}
        availableResources={activeProject.resources}
        onClose={() => setInspectingTask(null)}
        onSave={(taskId, updates) => updateTask(taskId, updates)}
        onDelete={(taskId) => deleteTask(taskId)}
      />

      {/* Baselines Modal */}
      {isBaselineModalOpen && (
        <BaselineModal
          baselines={activeProject.baselines}
          activeBaselineId={activeBaselineId}
          onSelectActiveBaseline={setActiveBaselineId}
          onCreateBaseline={createBaseline}
          onDeleteBaseline={deleteBaseline}
          onClose={() => setIsBaselineModalOpen(false)}
        />
      )}

      {/* Snapshots / Version History Modal */}
      {isSnapshotModalOpen && (
        <SnapshotModal
          snapshots={activeProject.snapshots}
          onCreateSnapshot={createSnapshot}
          onRestoreSnapshot={restoreSnapshot}
          onClose={() => setIsSnapshotModalOpen(false)}
        />
      )}

      {/* Calendar & Days Off Modal */}
      {isCalendarModalOpen && (
        <CalendarModal
          calendar={activeProject.calendar}
          onUpdateCalendar={updateCalendar}
          onAddDayOff={addDayOff}
          onRemoveDayOff={removeDayOff}
          onClose={() => setIsCalendarModalOpen(false)}
        />
      )}

      {/* Import Wizard Modal */}
      {isImportModalOpen && (
        <ImportModal
          existingProjectNames={workspace.projects.map((p) => p.name)}
          onImportProject={importProjectData}
          onImportWorkspace={importWorkspaceData}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Export Options Modal */}
      {isExportModalOpen && (
        <ExportModal
          project={activeProject}
          workspace={workspace}
          filteredTasks={filteredTasks}
          onClose={() => setIsExportModalOpen(false)}
          onOpenRunLocalModal={() => setIsRunModalOpen(true)}
        />
      )}

      {/* Local Execution & Docker Options Modal */}
      {isRunModalOpen && (
        <RunLocalModal
          onClose={() => setIsRunModalOpen(false)}
          onDownloadOfflineApp={handleDownloadOfflineApp}
        />
      )}

      {/* Domain Notification Toast */}
      <NotificationToast notification={notification} />
    </div>
  );
}
