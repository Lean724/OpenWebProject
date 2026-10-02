/**
 * OpenWebProject - Task Detail Modal
 * Full inspection and editing of task properties, dependencies, constraints,
 * actual dates, custom fields, and notes.
 */
import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Link,
  Users,
  Tag,
  CheckCircle,
  FileText,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import {
  Task,
  TaskDependency,
  DependencyType,
  ConstraintType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../types/project';
import { formatDisplayDate } from '../domain/calendar';

interface TaskDetailModalProps {
  task: Task | null;
  allTasks: Task[];
  availableResources: string[];
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  allTasks,
  availableResources,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!task) return null;

  const [activeTab, setActiveTab] = useState<'general' | 'scheduling' | 'dependencies' | 'notes'>('general');

  // Form local state
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || '');
  const [startDate, setStartDate] = useState(task.startDate);
  const [durationDays, setDurationDays] = useState(task.durationDays);
  const [workHours, setWorkHours] = useState(task.workHours);
  const [progress, setProgress] = useState(task.progress);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [taskType, setTaskType] = useState<TaskType>(task.type);
  const [constraintType, setConstraintType] = useState<ConstraintType>(task.constraintType);
  const [constraintDate, setConstraintDate] = useState(task.constraintDate || '');
  const [actualStartDate, setActualStartDate] = useState(task.actualStartDate || '');
  const [actualEndDate, setActualEndDate] = useState(task.actualEndDate || '');
  const [assignedResources, setAssignedResources] = useState<string[]>(task.assignedResources);
  const [newResourceInput, setNewResourceInput] = useState('');
  const [tags, setTags] = useState<string[]>(task.tags);
  const [newTagInput, setNewTagInput] = useState('');
  const [notes, setNotes] = useState(task.notes || '');
  const [dependencies, setDependencies] = useState<TaskDependency[]>(task.dependencies);

  // New dependency input
  const [selectedPredId, setSelectedPredId] = useState('');
  const [depType, setDepType] = useState<DependencyType>('FS');
  const [depLag, setDepLag] = useState<number>(0);

  const isSummary = task.type === 'summary';

  const handleAddDependency = () => {
    if (!selectedPredId || selectedPredId === task.id) return;
    if (dependencies.some((d) => d.predecessorId === selectedPredId)) return;

    setDependencies([
      ...dependencies,
      {
        id: `dep_${Date.now()}`,
        predecessorId: selectedPredId,
        type: depType,
        lagDays: depLag,
      },
    ]);
    setSelectedPredId('');
    setDepLag(0);
  };

  const handleRemoveDependency = (depId: string) => {
    setDependencies(dependencies.filter((d) => d.id !== depId));
  };

  const handleAddResource = () => {
    if (newResourceInput.trim() && !assignedResources.includes(newResourceInput.trim())) {
      setAssignedResources([...assignedResources, newResourceInput.trim()]);
      setNewResourceInput('');
    }
  };

  const handleRemoveResource = (res: string) => {
    setAssignedResources(assignedResources.filter((r) => r !== res));
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const handleSave = () => {
    onSave(task.id, {
      name,
      description,
      startDate,
      durationDays,
      workHours,
      progress,
      status,
      priority,
      type: taskType,
      constraintType,
      constraintDate: constraintDate || undefined,
      actualStartDate: actualStartDate || undefined,
      actualEndDate: actualEndDate || undefined,
      assignedResources,
      tags,
      notes,
      dependencies,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
              {task.wbs}
            </span>
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{task.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-white gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'general' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            General & Recursos
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'scheduling' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Planificación & Fechas Reales
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'dependencies' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Predecesoras ({dependencies.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2.5 border-b-2 transition-colors ${
              activeTab === 'notes' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Notas
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nombre de la tarea</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de tarea</label>
                  <select
                    value={taskType}
                    disabled={isSummary}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white disabled:bg-slate-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="milestone">Hito (Duración 0)</option>
                    <option value="summary">Resumen (Calculada)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Resources */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Responsables asignados</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assignedResources.map((res) => (
                    <span
                      key={res}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-xs font-medium"
                    >
                      <Users className="w-3 h-3 text-slate-500" />
                      {res}
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(res)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {assignedResources.length === 0 && (
                    <span className="text-slate-400 text-xs italic">Sin responsables asignados</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nuevo responsable..."
                    value={newResourceInput}
                    onChange={(e) => setNewResourceInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddResource())}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddResource}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700"
                  >
                    Asignar
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Etiquetas</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tg) => (
                    <span
                      key={tg}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      {tg}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tg)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva etiqueta..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-medium hover:bg-slate-200"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scheduling' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha de Inicio Planificada</label>
                  <input
                    type="date"
                    value={startDate}
                    disabled={isSummary}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duración (días laborales)</label>
                  <input
                    type="number"
                    min="0"
                    value={durationDays}
                    disabled={isSummary}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setDurationDays(val);
                      setWorkHours(val * 8);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Trabajo Total (Horas)</label>
                  <input
                    type="number"
                    min="0"
                    value={workHours}
                    disabled={isSummary}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setWorkHours(val);
                      setDurationDays(Math.max(1, Math.round(val / 8)));
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">% de Progreso Real</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      disabled={isSummary}
                      onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono font-bold text-slate-800 text-xs">{progress}%</span>
                  </div>
                </div>
              </div>

              {/* Constraints (Section 16) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Restricciones de Planificación (Section 16)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Tipo de restricción</label>
                    <select
                      value={constraintType}
                      disabled={isSummary}
                      onChange={(e) => setConstraintType(e.target.value as ConstraintType)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="ASAP">Lo antes posible (ASAP)</option>
                      <option value="ALAP">Lo más tarde posible (ALAP)</option>
                      <option value="SNET">No comenzar antes de (SNET)</option>
                      <option value="SNLT">No comenzar después de (SNLT)</option>
                      <option value="MSO">Debe comenzar el (MSO)</option>
                      <option value="FNET">No finalizar antes de (FNET)</option>
                      <option value="FNLT">No finalizar después de (FNLT)</option>
                      <option value="MFO">Debe finalizar el (MFO)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fecha de restricción</label>
                    <input
                      type="date"
                      value={constraintDate}
                      disabled={isSummary || constraintType === 'ASAP' || constraintType === 'ALAP'}
                      onChange={(e) => setConstraintDate(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Real Dates Comparison (Section 19: Fechas reales) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Seguimiento de Fechas Reales (Plan vs Real)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fecha Real de Inicio</label>
                    <input
                      type="date"
                      value={actualStartDate}
                      onChange={(e) => setActualStartDate(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fecha Real de Fin</label>
                    <input
                      type="date"
                      value={actualEndDate}
                      onChange={(e) => setActualEndDate(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Tareas de las que depende directamente la tarea <strong className="text-slate-800">{task.name}</strong>.
              </div>

              <div className="space-y-2">
                {dependencies.map((dep) => {
                  const pred = allTasks.find((t) => t.id === dep.predecessorId);
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Link className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-slate-500 font-semibold">{pred?.wbs}</span>
                        <span className="font-medium text-slate-800 truncate">{pred?.name || 'Tarea no encontrada'}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 rounded">
                          {dep.type} {dep.lagDays !== 0 ? (dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`) : ''}
                        </span>
                        <button
                          onClick={() => handleRemoveDependency(dep.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {dependencies.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No tiene predecesoras configuradas.
                  </div>
                )}
              </div>

              {/* Add Predecessor Form */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Vincular Nueva Predecesora
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedPredId}
                    onChange={(e) => setSelectedPredId(e.target.value)}
                    className="col-span-1 sm:col-span-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">Seleccionar tarea...</option>
                    {allTasks
                      .filter((t) => t.id !== task.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.wbs} - {t.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={depType}
                    onChange={(e) => setDepType(e.target.value as DependencyType)}
                    className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="FS">Fin a Inicio (FS)</option>
                    <option value="SS">Inicio a Inicio (SS)</option>
                    <option value="FF">Fin a Fin (FF)</option>
                    <option value="SF">Inicio a Fin (SF)</option>
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Lag (días)"
                      value={depLag}
                      onChange={(e) => setDepLag(parseInt(e.target.value, 10) || 0)}
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded text-xs text-center"
                    />
                    <button
                      type="button"
                      onClick={handleAddDependency}
                      disabled={!selectedPredId}
                      className="flex-1 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 disabled:opacity-40"
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notas y Observaciones de la Tarea</label>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe comentarios, especificaciones de entrega, riesgos o acuerdos técnicos..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-slate-900"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`¿Eliminar la tarea "${task.name}"?`)) {
                onDelete(task.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Tarea</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
