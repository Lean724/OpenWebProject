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
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { Project, Workspace, Task } from '../types/project';
import { parseCsvRows, parseXlsxFile } from '../services/importExport';
import { importFromMsProjectXml, getSampleMsProjectXml } from '../services/xmlProject';
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
    resourcesList: string[];
    warnings: string[];
    importedTasks: Partial<Task>[];
  } | null>(null);

  // Notice when user uploads a binary .mpp file
  const [mppNotice, setMppNotice] = useState<{ fileName: string } | null>(null);

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
    setMppNotice(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      // 0. Binary .mpp file from Microsoft Project
      if (ext === 'mpp') {
        setMppNotice({ fileName: file.name });
        return;
      }

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

      // 2. Microsoft Project XML (.xml)
      if (ext === 'xml') {
        const text = await file.text();
        const res = importFromMsProjectXml(text);
        setMspResult({
          projectName: res.projectName,
          tasksCount: res.tasks.length,
          resourcesCount: res.resources.length,
          resourcesList: res.resources,
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

  const handleLoadSampleMsp = () => {
    setErrorMsg(null);
    setParsedData(null);
    setMppNotice(null);
    try {
      const sampleXml = getSampleMsProjectXml();
      const res = importFromMsProjectXml(sampleXml);
      setMspResult({
        projectName: res.projectName,
        tasksCount: res.tasks.length,
        resourcesCount: res.resources.length,
        resourcesList: res.resources,
        warnings: res.warnings,
        importedTasks: res.tasks,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar el proyecto de prueba de MS Project.');
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

    const startDates = (mspResult.importedTasks || []).map((t) => t.startDate).filter(Boolean) as string[];
    const endDates = (mspResult.importedTasks || []).map((t) => t.endDate).filter(Boolean) as string[];
    const minStart = startDates.length > 0 ? [...startDates].sort()[0] : today;
    const maxEnd = endDates.length > 0 ? [...endDates].sort().reverse()[0] : stepDays(minStart, 30);

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: mspResult.projectName,
      description: 'Proyecto importado desde Microsoft Project XML (MSPDI).',
      startDate: minStart,
      endDate: maxEnd,
      status: 'Planificación',
      priority: 'high',
      tags: ['Importado MS Project'],
      customFieldDefinitions: [],
      calendar: DEFAULT_CALENDAR,
      tasks: mspResult.importedTasks as Task[],
      resources: mspResult.resourcesList.length > 0
        ? mspResult.resourcesList
        : Array.from(new Set(mspResult.importedTasks.flatMap(t => t.assignedResources || []))),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Importar Proyectos (Compatible con Microsoft Project)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conflict Dialogue */}
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
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-amber-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onImportProject(pendingProject, 'replace');
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-amber-900 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors"
              >
                Reemplazar
              </button>
              <button
                onClick={() => {
                  onImportProject(pendingProject, 'copy');
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
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

          {/* Special Helper Card when .mpp file is selected */}
          {mppNotice && (
            <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                  MPP
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <span>Archivo de Microsoft Project detectado:</span>
                    <code className="text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded font-mono text-[11px]">
                      {mppNotice.fileName}
                    </code>
                  </h4>
                  <p className="text-[11.5px] text-blue-900/90 mt-1 leading-relaxed">
                    Los archivos <code>.mpp</code> son un formato binario propietario cerrado de Microsoft. Para importarlo con el 100% de sus datos (tareas, duraciones, dependencias, recursos y avances), expórtalo como <strong>XML de MS Project</strong> en solo 10 segundos:
                  </p>
                </div>
              </div>

              {/* Steps to convert in MS Project */}
              <div className="bg-white/90 border border-blue-200/80 rounded-lg p-3.5 space-y-2 text-[11.5px] text-slate-800">
                <div className="font-semibold text-slate-900 text-xs">
                  Pasos para guardar en XML desde Microsoft Project:
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
                  <li>
                    Abre tu proyecto en <strong>Microsoft Project</strong>.
                  </li>
                  <li>
                    Haz clic en el menú <strong>Archivo &gt; Guardar como</strong> (o presiona <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">F12</kbd>).
                  </li>
                  <li>
                    En el desplegable <em>"Guardar como tipo"</em>, selecciona <strong>Formato XML (*.xml)</strong>.
                  </li>
                  <li>
                    Guarda el archivo y cárgalo aquí en OpenWebProject.
                  </li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200/60">
                <button
                  type="button"
                  onClick={handleLoadSampleMsp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Probar con proyecto demo de MS Project</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMppNotice(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                  >
                    Cerrar aviso
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                  >
                    Seleccionar archivo .xml
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Upload File Area */}
          {!parsedData && !mspResult && !mppNotice && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors text-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 text-xs">
                    Haz clic para seleccionar tu archivo de proyecto o arrástralo aquí
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Formatos admitidos: <strong>MS Project XML (.xml / .mpp)</strong>, <strong>.project</strong>, <strong>Excel (.xlsx)</strong>, <strong>CSV</strong>
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mpp,.xml,.project,.json,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* MS Project Fast Demo Callout */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    XML
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-[11.5px]">
                      ¿Quieres probar la compatibilidad con Microsoft Project ahora?
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Carga un cronograma real de MS Project con tareas, WBS, dependencias e hitos en 1 clic.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleMsp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cargar Demo MS Project</span>
                </button>
              </div>

              {/* Supported formats highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 block text-xs">MS Project</span>
                    <span className="text-[9px] font-semibold bg-blue-100 text-blue-700 px-1 py-0.2 rounded">.xml / .mpp</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Tareas, WBS, dependencias, recursos y avances</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-900 block text-xs">.project</span>
                  <span className="text-[10px] text-slate-500">Formato nativo portable OpenWebProject</span>
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

          {/* Step 2A: MS Project XML Results & Preview */}
          {mspResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Archivo de Microsoft Project procesado correctamente</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-emerald-950 text-xs pt-1">
                  <div>Proyecto: <strong>{mspResult.projectName}</strong></div>
                  <div>Tareas detectadas: <strong>{mspResult.tasksCount}</strong></div>
                  <div>Recursos / Miembros: <strong>{mspResult.resourcesCount}</strong></div>
                </div>
              </div>

              {/* Task Preview Table */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Vista Previa del Cronograma Importado ({mspResult.importedTasks.length} tareas)
                </span>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">WBS</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Nombre de Tarea</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Tipo</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Inicio</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Fin</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Duración</th>
                        <th className="px-2.5 py-1.5 border-r border-slate-200">Avance</th>
                        <th className="px-2.5 py-1.5">Recursos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {mspResult.importedTasks.slice(0, 7).map((t, idx) => (
                        <tr key={idx} className={t.type === 'summary' ? 'bg-slate-50/80 font-semibold' : ''}>
                          <td className="px-2.5 py-1 border-r border-slate-100 font-mono text-[10px] text-slate-500">{t.wbs}</td>
                          <td className="px-2.5 py-1 border-r border-slate-100 max-w-xs truncate text-slate-900">{t.name}</td>
                          <td className="px-2.5 py-1 border-r border-slate-100 text-[10px] text-slate-500">
                            {t.type === 'summary' ? 'Resumen' : t.type === 'milestone' ? 'Hito' : 'Tarea'}
                          </td>
                          <td className="px-2.5 py-1 border-r border-slate-100 text-slate-600">{t.startDate}</td>
                          <td className="px-2.5 py-1 border-r border-slate-100 text-slate-600">{t.endDate}</td>
                          <td className="px-2.5 py-1 border-r border-slate-100 text-slate-600">{t.durationDays} d</td>
                          <td className="px-2.5 py-1 border-r border-slate-100 text-slate-600">{t.progress}%</td>
                          <td className="px-2.5 py-1 text-slate-600 truncate max-w-xs">
                            {t.assignedResources && t.assignedResources.length > 0 ? t.assignedResources.join(', ') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mspResult.importedTasks.length > 7 && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    ... y {mspResult.importedTasks.length - 7} tareas más.
                  </p>
                )}
              </div>

              {mspResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    ⚠ Advertencias de compatibilidad ({mspResult.warnings.length}):
                  </span>
                  <ul className="list-disc pl-4 text-[11px] text-amber-800 space-y-0.5 max-h-24 overflow-y-auto">
                    {mspResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMspResult(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Volver a seleccionar
                </button>
                <button
                  type="button"
                  onClick={handleFinishMspImport}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Confirmar e Importar al Workspace</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2B: CSV / XLSX Column Mapping & Preview */}
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Volver a seleccionar
                </button>
                <button
                  type="button"
                  onClick={handleFinishTabularImport}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
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
