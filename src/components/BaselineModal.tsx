/**
 * OpenWebProject - Baselines Management Modal
 * Section 20 & 21: Manage multiple immutable project baselines and compare with actual.
 */
import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Baseline } from '../types/project';
import { formatDisplayDate } from '../domain/calendar';

interface BaselineModalProps {
  baselines: Baseline[];
  activeBaselineId: string | null;
  onSelectActiveBaseline: (id: string | null) => void;
  onCreateBaseline: (name: string) => void;
  onDeleteBaseline: (id: string) => void;
  onClose: () => void;
}

export const BaselineModal: React.FC<BaselineModalProps> = ({
  baselines,
  activeBaselineId,
  onSelectActiveBaseline,
  onCreateBaseline,
  onDeleteBaseline,
  onClose,
}) => {
  const [newBaselineName, setNewBaselineName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBaselineName.trim()) {
      onCreateBaseline(newBaselineName.trim());
      setNewBaselineName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Líneas Base del Proyecto (Baselines)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
          Una línea base congela el estado completo de planificación (fechas, duraciones, trabajo, dependencias y WBS) para medir desviaciones en el Gantt.
        </div>

        {/* Existing Baselines List */}
        <div className="p-5 max-h-72 overflow-y-auto space-y-2">
          {baselines.map((bl) => {
            const isComparing = activeBaselineId === bl.id;
            const taskCount = Object.keys(bl.tasks).length;

            return (
              <div
                key={bl.id}
                className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 text-xs ${
                  isComparing ? 'bg-indigo-50/60 border-indigo-200 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{bl.name}</span>
                    {isComparing && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                        Visible en Gantt
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Creada: {formatDisplayDate(bl.createdAt.split('T')[0])} · {taskCount} tareas congeladas
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectActiveBaseline(isComparing ? null : bl.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isComparing
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isComparing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isComparing ? 'Ocultar' : 'Comparar'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la línea base "${bl.name}"?`)) {
                        onDeleteBaseline(bl.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Eliminar línea base"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {baselines.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Aún no has creado ninguna línea base para este proyecto.
            </div>
          )}
        </div>

        {/* Create new baseline form */}
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Nombre de la nueva línea base (ej. Plan Inicial Aprobado)..."
            value={newBaselineName}
            onChange={(e) => setNewBaselineName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
          />
          <button
            type="submit"
            disabled={!newBaselineName.trim()}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Línea Base</span>
          </button>
        </form>
      </div>
    </div>
  );
};
