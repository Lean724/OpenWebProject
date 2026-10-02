/**
 * OpenWebProject - Reprogramming Confirmation Modal
 * Section 14 & 15: Reprogramming downstream tasks impacted by changes.
 */
import React from 'react';
import { AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { ReprogramPrompt } from '../application/useWorkspace';
import { formatDisplayDate } from '../domain/calendar';

interface ReprogramModalProps {
  prompt: ReprogramPrompt | null;
  onConfirm: (proceed: boolean) => void;
  onCancel: () => void;
}

export const ReprogramModal: React.FC<ReprogramModalProps> = ({ prompt, onConfirm, onCancel }) => {
  if (!prompt) return null;

  const { updatedTask, affectedTasks } = prompt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Impacto en la Planificación del Cronograma
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              La modificación en la tarea <span className="font-semibold text-slate-800">"{updatedTask.name}"</span> afecta las fechas de{' '}
              <span className="font-semibold text-slate-800">{affectedTasks.length} tarea(s) sucesora(s)</span>.
            </p>
          </div>
        </div>

        <div className="p-5 max-h-64 overflow-y-auto space-y-2 bg-slate-50/50">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Tareas que serán desplazadas:
          </div>
          {affectedTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="font-mono text-slate-400 font-semibold">{t.wbs}</span>
                <span className="font-medium text-slate-800 truncate">{t.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDisplayDate(t.startDate)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-semibold text-slate-800">{formatDisplayDate(t.endDate)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onConfirm(false)}
              className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mantiene la modificación manual sin mover las sucesoras"
            >
              No reprogramar
            </button>
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              Reprogramar sucesoras
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
