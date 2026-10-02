/**
 * OpenWebProject - Snapshots & Version History Modal
 * Section 37 & 38: Full project snapshots and restoration with safety prompts.
 */
import React, { useState } from 'react';
import { X, History, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { Snapshot } from '../types/project';
import { formatDisplayDate } from '../domain/calendar';

interface SnapshotModalProps {
  snapshots: Snapshot[];
  onCreateSnapshot: (name: string, description: string) => void;
  onRestoreSnapshot: (id: string, createBackupFirst: boolean) => void;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateSnapshot(name.trim(), description.trim());
      setName('');
      setDescription('');
    }
  };

  const handleProceedRestore = (createBackup: boolean) => {
    if (confirmRestoreId) {
      onRestoreSnapshot(confirmRestoreId, createBackup);
      setConfirmRestoreId(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Historial de Versiones y Snapshots</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation dialogue overlay when user clicks restore */}
        {confirmRestoreId ? (
          <div className="p-5 bg-amber-50 border-b border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">¿Desea restaurar este snapshot?</h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Los cambios que haya realizado desde entonces se perderán salvo que genere un snapshot de respaldo antes de continuar.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRestoreId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleProceedRestore(false)}
                className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg"
              >
                Restaurar sin respaldo
              </button>
              <button
                onClick={() => handleProceedRestore(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                Crear snapshot y restaurar
              </button>
            </div>
          </div>
        ) : null}

        {/* List of snapshots */}
        <div className="p-5 max-h-64 overflow-y-auto space-y-2">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between gap-3 text-xs"
            >
              <div className="truncate">
                <div className="font-semibold text-slate-900 truncate">{snap.name}</div>
                {snap.description && (
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{snap.description}</div>
                )}
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {formatDisplayDate(snap.createdAt.split('T')[0])} ({snap.projectData.tasks.length} tareas)
                </div>
              </div>

              <button
                onClick={() => setConfirmRestoreId(snap.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar</span>
              </button>
            </div>
          ))}

          {snapshots.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No hay snapshots guardados en el historial aún.
            </div>
          )}
        </div>

        {/* Create new snapshot */}
        <form onSubmit={handleCreate} className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Crear Snapshot Manual
          </span>
          <input
            type="text"
            placeholder="Nombre del snapshot (ej. Plan Enviado a Dirección)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
          />
          <input
            type="text"
            placeholder="Descripción opcional (alcance, motivo o versión)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
          />
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar Snapshot</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
