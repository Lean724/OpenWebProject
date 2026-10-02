/**
 * OpenWebProject - Calendar & Days Off Management Modal
 * Section 11: Working days, standard daily hours, and custom non-working days (Days Off).
 */
import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Clock, Check } from 'lucide-react';
import { ProjectCalendar } from '../types/project';
import { formatDisplayDate } from '../domain/calendar';

interface CalendarModalProps {
  calendar: ProjectCalendar;
  onUpdateCalendar: (calendar: ProjectCalendar) => void;
  onAddDayOff: (dateStr: string) => void;
  onRemoveDayOff: (dateStr: string) => void;
  onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  calendar,
  onUpdateCalendar,
  onAddDayOff,
  onRemoveDayOff,
  onClose,
}) => {
  const [newDayOff, setNewDayOff] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(calendar.hoursPerDay || 8);
  const [workingDays, setWorkingDays] = useState<number[]>(calendar.workingDays || [1, 2, 3, 4, 5]);

  const daysOfWeek = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
  ];

  const toggleDay = (dayId: number) => {
    if (workingDays.includes(dayId)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== dayId));
      }
    } else {
      setWorkingDays([...workingDays, dayId]);
    }
  };

  const handleSaveWorkingConfig = () => {
    onUpdateCalendar({
      ...calendar,
      hoursPerDay,
      workingDays,
    });
  };

  const handleAddDayOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDayOff && !calendar.daysOff.includes(newDayOff)) {
      onAddDayOff(newDayOff);
      setNewDayOff('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Calendario Laboral & Días No Laborables</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Working Days Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Días Laborables Semanales
            </label>
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((d) => {
                const isSelected = workingDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div>{d.label.slice(0, 3)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Daily Hours */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800">Horas por Día Laboral</span>
                <p className="text-[11px] text-slate-500">Configuración estándar: 1 día = 8 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="24"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Math.max(1, parseInt(e.target.value, 10) || 8))}
                className="w-16 px-2 py-1 text-center border border-slate-300 rounded font-mono font-bold bg-white text-xs"
              />
              <span className="text-slate-500 font-medium">h/día</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveWorkingConfig}
            className="w-full py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aplicar configuración semanal</span>
          </button>

          {/* Days Off List */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Feriados y Días No Laborables (Days Off)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              El motor de planificación saltea automáticamente estos días al calcular las fechas y duraciones.
            </p>

            <form onSubmit={handleAddDayOffSubmit} className="flex gap-2 mb-3">
              <input
                type="date"
                value={newDayOff}
                onChange={(e) => setNewDayOff(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
              <button
                type="submit"
                disabled={!newDayOff}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </form>

            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {calendar.daysOff && calendar.daysOff.length > 0 ? (
                calendar.daysOff.map((dateStr) => (
                  <div
                    key={dateStr}
                    className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                  >
                    <span className="font-mono text-slate-800">{formatDisplayDate(dateStr)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveDayOff(dateStr)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs italic">
                  No hay días no laborables registrados.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
