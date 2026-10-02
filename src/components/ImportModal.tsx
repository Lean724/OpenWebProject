/**
 * OpenWebProject - Universal Import Wizard Modal
 * Section 43, 44, 45, 51, 52: Import from .project, MS Project XML, CSV, XLSX with column mapping.
 */
import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Project, Workspace, Task } from '../types/project';
import { parseCsvRows, parseXlsxFile } from '../services/importExport';
import { importFromMsProjectXml } from '../services/xmlProject';
import { DEFAULT_CALENDAR, getNextWorkingDay, getTodayString, stepDays } from '../domain/calendar';

interface ImportModalProps {
  existingProjectNames: string[];
  onImportProject: (project: Project, conflictAction: 'replace' | 'copy') => void;
  onImportWorkspace: (workspace: Workspace) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  existingProjectNames,
  onImportProject,
  onImportWorkspace,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<'.project' | 'msp_xml' | 'csv' | 'xlsx'>('.project');

  // File parsing states
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: string[][];
    rawFileName: string;
    sheets?: string[];
    selectedSheet?: string;
  } | null>(null);

  // Column mapping state for CSV / XLSX
  const [mapping, setMapping] = useState<{
    nameCol: string;
    startCol: string;
    endCol: string;
    durationCol: string;
    progressCol: string;
    resourceCol: string;
  }>({
    nameCol: '',
    startCol: '',
    endCol: '',
    durationCol: '',
    progressCol: '',
    resourceCol: '',
  });

  // MS Project XML parsing feedback
  const [mspResult, setMspResult] = useState<{
    projectName: string;
    tasksCount: number;
    resourcesCount: number;
    warnings: string[];
    importedTasks: Partial<Task>[];
  } | null>(null);

  // Name conflict prompt
  const [nameConflict, setNameConflict] = useState<string | null>(null);
  const [pendingProject, setPendingProject] = useState<Project | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setParsedData(null);
    setMspResult(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      // 1. Native .project / JSON
      if (ext === 'project' || ext === 'json') {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json.format === 'OpenWebProject') {
          if (json.projects && Array.isArray(json.projects)) {
            // Full workspace
            onImportWorkspace(json as Workspace);
            onClose();
            return;
          } else if (json.project) {
            // Single project container
            checkAndPromptConflict(json.project);
            return;
          }
        } else if (json.tasks && Array.isArray(json.tasks)) {
          // Standard project object
          checkAndPromptConflict(json as Project);
          return;
        }
        throw new Error('Formato JSON / .project no reconocido o inválido.');
      }

      // 2. Microsoft Project XML
      if (ext === 'xml') {
        const text = await file.text();
        const res = importFromMsProjectXml(text);
        setMspResult({
          projectName: res.projectName,
          tasksCount: res.tasks.length,
          resourcesCount: res.resources.length,
          warnings: res.warnings,
          importedTasks: res.tasks,
        });
        return;
      }

      // 3. CSV
      if (ext === 'csv') {
        const text = await file.text();
        const { headers, rows } = parseCsvRows(text);
        if (headers.length === 0) throw new Error('El archivo CSV está vacío.');

        setParsedData({
          headers,
          rows,
          rawFileName: file.name.replace(/\.csv$/i, ''),
        });

        // Auto-guess column mapping
        autoGuessMapping(headers);
        return;
      }

      // 4. XLSX
      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const { sheetNames, getSheetData } = parseXlsxFile(buffer);
        if (sheetNames.length === 0) throw new Error('No se encontraron hojas en el libro Excel.');

        const initialSheet = sheetNames[0];
        const { headers, rows } = getSheetData(initialSheet);

        setParsedData({
          headers,
          rows,
          rawFileName: file.name.replace(/\.xlsx?$/i, ''),
          sheets: sheetNames,
          selectedSheet: initialSheet,
        });

        autoGuessMapping(headers);
        return;
      }

      throw new Error(`Extensión .${ext} no compatible para la importación.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo seleccionado.');
    }
  };

  const autoGuessMapping = (headers: string[]) => {
    const map: any = {
      nameCol: '',
      startCol: '',
      endCol: '',
      durationCol: '',
      progressCol: '',
      resourceCol: '',
    };

    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('nombre') || lower.includes('name') || lower.includes('tarea') || lower.includes('task')) {
        if (!map.nameCol) map.nameCol = h;
      }
      if (lower.includes('inicio') || lower.includes('start') || lower.includes('comienzo')) {
        if (!map.startCol) map.startCol = h;
      }
      if (lower.includes('fin') || lower.includes('finish') || lower.includes('end')) {
        if (!map.endCol) map.endCol = h;
      }
      if (lower.includes('durac') || lower.includes('duration') || lower.includes('días')) {
        if (!map.durationCol) map.durationCol = h;
      }
      if (lower.includes('progr') || lower.includes('%') || lower.includes('avance')) {
        if (!map.progressCol) map.progressCol = h;
      }
      if (lower.includes('respons') || lower.includes('recurso') || lower.includes('resource') || lower.includes('asign')) {
        if (!map.resourceCol) map.resourceCol = h;
      }
    });

    setMapping(map);
  };

  const checkAndPromptConflict = (proj: Project) => {
    const exists = existingProjectNames.some((n) => n.trim().toLowerCase() === proj.name.trim().toLowerCase());
    if (exists) {
      setNameConflict(proj.name);
      setPendingProject(proj);
    } else {
      onImportProject(proj, 'copy');
      onClose();
    }
  };

  const handleFinishMspImport = () => {
    if (!mspResult) return;
    const today = getTodayString();

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: mspResult.projectName,
      description: 'Proyecto importado desde archivo XML de Microsoft Project.',
      startDate: today,
      endDate: stepDays(today, 30),
      status: 'Planificación',
      priority: 'high',
      tags: ['Importado MSP'],
      customFieldDefinitions: [],
      calendar: DEFAULT_CALENDAR,
      tasks: mspResult.importedTasks as Task[],
      resources: mspResult.resourcesCount > 0 ? (mspResult.importedTasks.map(t => t.assignedResources?.[0]).filter(Boolean) as string[]) : [],
      baselines: [],
      snapshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    checkAndPromptConflict(newProject);
  };

  const handleFinishTabularImport = () => {
    if (!parsedData || !mapping.nameCol) {
      setErrorMsg('Debe mapear al menos la columna "Nombre" para importar.');
      return;
    }

    const today = getTodayString();
    const nameIdx = parsedData.headers.indexOf(mapping.nameCol);
    const startIdx = parsedData.headers.indexOf(mapping.startCol);
    const endIdx = parsedData.headers.indexOf(mapping.endCol);
    const durIdx = parsedData.headers.indexOf(mapping.durationCol);
    const progIdx = parsedData.headers.indexOf(mapping.progressCol);
    const resIdx = parsedData.headers.indexOf(mapping.resourceCol);

    const importedTasks: Task[] = [];

    parsedData.rows.forEach((row, i) => {
      const taskName = row[nameIdx]?.trim();
      if (!taskName) return;

      const startDate = (startIdx !== -1 && row[startIdx]?.match(/^\d{4}-\d{2}-\d{2}$/)) ? row[startIdx] : today;
      let durationDays = durIdx !== -1 ? Math.max(0, parseInt(row[durIdx], 10) || 1) : 1;
      const endDate = endIdx !== -1 && row[endIdx]?.match(/^\d{4}-\d{2}-\d{2}$/) ? row[endIdx] : stepDays(startDate, durationDays);
      const progress = progIdx !== -1 ? Math.min(100, Math.max(0, parseInt(row[progIdx], 10) || 0)) : 0;
      const resource = resIdx !== -1 && row[resIdx]?.trim() ? [row[resIdx].trim()] : [];

      importedTasks.push({
        id: `task_imp_${i + 1}`,
        displayId: i + 1,
        wbs: `${i + 1}`,
        name: taskName,
        startDate,
        endDate,
        durationDays,
        workHours: durationDays * 8,
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
        priority: 'medium',
        assignedResources: resource,
        tags: [],
        dependencies: [],
        constraintType: 'ASAP',
        type: durationDays === 0 ? 'milestone' : 'normal',
        trafficLight: 'green',
        customFields: {},
        parentId: null,
        order: i,
      });
    });

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: parsedData.rawFileName || 'Proyecto Importado',
      description: 'Proyecto importado mediante mapeo de columnas tabulares.',
      startDate: today,
      endDate: stepDays(today, 30),
      status: 'Planificación',
      priority: 'medium',
      tags: ['Importado'],
      customFieldDefinitions: [],
      calendar: DEFAULT_CALENDAR,
      tasks: importedTasks,
      resources: [],
      baselines: [],
      snapshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    checkAndPromptConflict(newProject);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Asistente de Importación de Proyectos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conflict Dialogue (Section 51) */}
        {nameConflict && pendingProject && (
          <div className="p-5 bg-amber-50 border-b border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Ya existe un proyecto con el nombre "{nameConflict}" en el Workspace
                </h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  ¿Desea reemplazar el proyecto existente o crear una copia independiente?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNameConflict(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onImportProject(pendingProject, 'replace');
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg"
              >
                Reemplazar
              </button>
              <button
                onClick={() => {
                  onImportProject(pendingProject, 'copy');
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                Crear copia
              </button>
            </div>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 1: Upload File Area */}
          {!parsedData && !mspResult && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 text-xs">
                    Haz clic para seleccionar un archivo o arrástralo aquí
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Formatos admitidos: .project, .json, Microsoft Project XML (.xml), Excel (.xlsx), CSV (.csv)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".project,.json,.xml,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Supported formats highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-xs">.project</span>
                  <span className="text-[10px] text-slate-500">Formato nativo portable OpenWebProject</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-xs">MS Project XML</span>
                  <span className="text-[10px] text-slate-500">Tareas, dependencias, recursos y baseline</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-xs">Excel XLSX</span>
                  <span className="text-[10px] text-slate-500">Mapeador de columnas y selector de hojas</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-xs">CSV</span>
                  <span className="text-[10px] text-slate-500">Detección automática de delimitador</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2A: MS Project XML Results & Warnings (Section 45 & 52) */}
          {mspResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Archivo XML de Microsoft Project analizado con éxito</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-emerald-900 text-xs">
                  <div>Proyecto: <strong>{mspResult.projectName}</strong></div>
                  <div>Tareas detectadas: <strong>{mspResult.tasksCount}</strong></div>
                </div>
              </div>

              {mspResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    ⚠ Advertencias de compatibilidad ({mspResult.warnings.length}):
                  </span>
                  <ul className="list-disc pl-4 text-[11px] text-amber-800 space-y-0.5 max-h-28 overflow-y-auto">
                    {mspResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMspResult(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Volver a seleccionar
                </button>
                <button
                  type="button"
                  onClick={handleFinishMspImport}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Confirmar Importación
                </button>
              </div>
            </div>
          )}

          {/* Step 2B: CSV / XLSX Column Mapping & Preview (Section 43 & 44) */}
          {parsedData && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Mapeo de Columnas ({parsedData.rawFileName})
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Asocia las columnas detectadas en tu archivo a los campos del cronograma.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre *</label>
                  <select
                    value={mapping.nameCol}
                    onChange={(e) => setMapping({ ...mapping, nameCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">Seleccionar columna...</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Inicio</label>
                  <select
                    value={mapping.startCol}
                    onChange={(e) => setMapping({ ...mapping, startCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">(Opcional)</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fin</label>
                  <select
                    value={mapping.endCol}
                    onChange={(e) => setMapping({ ...mapping, endCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">(Opcional)</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duración (días)</label>
                  <select
                    value={mapping.durationCol}
                    onChange={(e) => setMapping({ ...mapping, durationCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">(Opcional)</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">% Progreso</label>
                  <select
                    value={mapping.progressCol}
                    onChange={(e) => setMapping({ ...mapping, progressCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">(Opcional)</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Responsable</label>
                  <select
                    value={mapping.resourceCol}
                    onChange={(e) => setMapping({ ...mapping, resourceCol: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="">(Opcional)</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Vista Previa ({parsedData.rows.length} filas detectadas)
                </span>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-36">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        {parsedData.headers.map((h, i) => (
                          <th key={i} className="px-2.5 py-1.5 border-r border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.rows.slice(0, 4).map((r, ri) => (
                        <tr key={ri}>
                          {r.map((cell, ci) => (
                            <td key={ci} className="px-2.5 py-1 border-r border-slate-100 truncate max-w-xs">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Volver a seleccionar
                </button>
                <button
                  type="button"
                  onClick={handleFinishTabularImport}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Importar Tareas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
