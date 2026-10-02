/**
 * OpenWebProject - Local Persistence & Storage Service
 * Fully offline, no server, autosave to local browser storage.
 */
import { Project, Workspace } from '../types/project';
import { calculateSchedule } from '../domain/planningEngine';
import { DEFAULT_CALENDAR, getTodayString, stepDays } from '../domain/calendar';

const STORAGE_KEY = 'openwebproject_workspace_v1';

export function createInitialSampleWorkspace(): Workspace {
  const today = getTodayString();
  const d1 = today;
  const d2 = stepDays(d1, 3);
  const d3 = stepDays(d2, 2);
  const d4 = stepDays(d3, 4);
  const d5 = stepDays(d4, 5);

  const initialProject: Project = {
    id: 'proj_erp_01',
    name: 'Implementación Sistema ERP',
    description: 'Proyecto integral de implementación, desarrollo de módulos e integración tecnológica.',
    startDate: d1,
    endDate: stepDays(d1, 30),
    manager: 'Carlos Méndez',
    status: 'En ejecución',
    priority: 'high',
    tags: ['Core', 'Transformación Digital', '2026'],
    customFieldDefinitions: [
      { id: 'cf_departamento', name: 'Departamento', type: 'select', options: ['TI', 'Finanzas', 'Operaciones', 'Comercial'] },
      { id: 'cf_aprobado', name: 'Aprobado QA', type: 'boolean' },
    ],
    calendar: {
      ...DEFAULT_CALENDAR,
      daysOff: [stepDays(today, 10), stepDays(today, 25)],
    },
    tasks: [],
    resources: ['Juan Gómez', 'Pedro Martínez', 'María Rodriguez', 'Equipo Backend', 'Equipo QA', 'Lucía Rossi'],
    baselines: [],
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Seed tasks according to spec examples (1. Implementación ERP, 1.1 Análisis, etc.)
  const rawTasks = [
    {
      id: 'task_1',
      displayId: 1,
      wbs: '1',
      name: 'Implementación ERP',
      startDate: d1,
      endDate: d5,
      durationDays: 20,
      workHours: 160,
      progress: 35,
      status: 'in_progress' as const,
      priority: 'high' as const,
      assignedResources: ['Carlos Méndez'],
      tags: ['Gestión'],
      dependencies: [],
      constraintType: 'ASAP' as const,
      type: 'summary' as const,
      trafficLight: 'green' as const,
      customFields: {},
      parentId: null,
      order: 0,
    },
    {
      id: 'task_1_1',
      displayId: 2,
      wbs: '1.1',
      name: 'Análisis y Relevamiento',
      startDate: d1,
      endDate: stepDays(d1, 7),
      durationDays: 5,
      workHours: 40,
      progress: 100,
      status: 'completed' as const,
      priority: 'high' as const,
      assignedResources: ['María Rodriguez'],
      tags: ['Análisis'],
      dependencies: [],
      constraintType: 'ASAP' as const,
      type: 'summary' as const,
      trafficLight: 'green' as const,
      customFields: { cf_departamento: 'TI' },
      parentId: 'task_1',
      order: 1,
    },
    {
      id: 'task_1_1_1',
      displayId: 3,
      wbs: '1.1.1',
      name: 'Entrevistas con stakeholders',
      startDate: d1,
      endDate: stepDays(d1, 3),
      durationDays: 3,
      workHours: 24,
      progress: 100,
      status: 'completed' as const,
      priority: 'medium' as const,
      assignedResources: ['María Rodriguez'],
      tags: ['Entrevistas'],
      dependencies: [],
      constraintType: 'ASAP' as const,
      type: 'normal' as const,
      trafficLight: 'green' as const,
      customFields: { cf_departamento: 'Operaciones' },
      parentId: 'task_1_1',
      order: 2,
    },
    {
      id: 'task_1_1_2',
      displayId: 4,
      wbs: '1.1.2',
      name: 'Documento de Especificación de Requerimientos',
      startDate: stepDays(d1, 4),
      endDate: stepDays(d1, 7),
      durationDays: 3,
      workHours: 24,
      progress: 100,
      status: 'completed' as const,
      priority: 'high' as const,
      assignedResources: ['María Rodriguez'],
      tags: ['Documentación'],
      dependencies: [{ id: 'dep_1', predecessorId: 'task_1_1_1', type: 'FS' as const, lagDays: 0 }],
      constraintType: 'ASAP' as const,
      type: 'normal' as const,
      trafficLight: 'green' as const,
      customFields: { cf_departamento: 'TI' },
      parentId: 'task_1_1',
      order: 3,
    },
    {
      id: 'task_1_2',
      displayId: 5,
      wbs: '1.2',
      name: 'Desarrollo de Módulos',
      startDate: stepDays(d1, 8),
      endDate: stepDays(d1, 20),
      durationDays: 10,
      workHours: 80,
      progress: 30,
      status: 'in_progress' as const,
      priority: 'urgent' as const,
      assignedResources: ['Equipo Backend'],
      tags: ['Dev'],
      dependencies: [],
      constraintType: 'ASAP' as const,
      type: 'summary' as const,
      trafficLight: 'green' as const,
      customFields: {},
      parentId: 'task_1',
      order: 4,
    },
    {
      id: 'task_1_2_1',
      displayId: 6,
      wbs: '1.2.1',
      name: 'Desarrollo API y Modelo de Datos',
      startDate: stepDays(d1, 8),
      endDate: stepDays(d1, 14),
      durationDays: 5,
      workHours: 40,
      progress: 60,
      status: 'in_progress' as const,
      priority: 'urgent' as const,
      assignedResources: ['Juan Gómez', 'Pedro Martínez'],
      tags: ['Backend', 'API'],
      dependencies: [{ id: 'dep_2', predecessorId: 'task_1_1_2', type: 'FS' as const, lagDays: 1 }],
      constraintType: 'ASAP' as const,
      type: 'normal' as const,
      trafficLight: 'green' as const,
      customFields: { cf_departamento: 'TI' },
      parentId: 'task_1_2',
      order: 5,
    },
    {
      id: 'task_1_2_2',
      displayId: 7,
      wbs: '1.2.2',
      name: 'Interfaz Web y Formularios',
      startDate: stepDays(d1, 15),
      endDate: stepDays(d1, 20),
      durationDays: 4,
      workHours: 32,
      progress: 10,
      status: 'in_progress' as const,
      priority: 'high' as const,
      assignedResources: ['Lucía Rossi'],
      tags: ['Frontend'],
      dependencies: [{ id: 'dep_3', predecessorId: 'task_1_2_1', type: 'FS' as const, lagDays: 0 }],
      constraintType: 'ASAP' as const,
      type: 'normal' as const,
      trafficLight: 'green' as const,
      customFields: { cf_departamento: 'TI' },
      parentId: 'task_1_2',
      order: 6,
    },
    {
      id: 'task_1_3',
      displayId: 8,
      wbs: '1.3',
      name: 'Pruebas Integrales y QA',
      startDate: stepDays(d1, 21),
      endDate: stepDays(d1, 26),
      durationDays: 4,
      workHours: 32,
      progress: 0,
      status: 'not_started' as const,
      priority: 'high' as const,
      assignedResources: ['Equipo QA'],
      tags: ['Testing'],
      dependencies: [{ id: 'dep_4', predecessorId: 'task_1_2_2', type: 'FS' as const, lagDays: 0 }],
      constraintType: 'ASAP' as const,
      type: 'normal' as const,
      trafficLight: 'green' as const,
      customFields: { cf_aprobado: false },
      parentId: 'task_1',
      order: 7,
    },
    {
      id: 'task_1_4',
      displayId: 9,
      wbs: '1.4',
      name: 'Go Live & Despliegue en Producción',
      startDate: stepDays(d1, 27),
      endDate: stepDays(d1, 27),
      durationDays: 0,
      workHours: 0,
      progress: 0,
      status: 'not_started' as const,
      priority: 'urgent' as const,
      assignedResources: ['Carlos Méndez', 'Juan Gómez'],
      tags: ['Hito', 'Lanzamiento'],
      dependencies: [{ id: 'dep_5', predecessorId: 'task_1_3', type: 'FS' as const, lagDays: 0 }],
      constraintType: 'ASAP' as const,
      type: 'milestone' as const,
      trafficLight: 'green' as const,
      customFields: {},
      parentId: 'task_1',
      order: 8,
    },
  ];

  initialProject.tasks = calculateSchedule(rawTasks, initialProject.calendar, today);

  // Add initial Baseline 1
  const baselineTasks: Record<string, any> = {};
  initialProject.tasks.forEach((t) => {
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

  initialProject.baselines = [
    {
      id: 'bl_initial',
      name: 'Línea Base Inicial (Plan Aprobado)',
      createdAt: new Date().toISOString(),
      tasks: baselineTasks,
    },
  ];

  const infraProject: Project = {
    id: 'proj_infra_02',
    name: 'Infraestructura y Redes',
    description: 'Aprovisionamiento de servidores locales y configuración de conectividad.',
    startDate: d1,
    endDate: stepDays(d1, 15),
    manager: 'Roberto Sánchez',
    status: 'En progreso',
    priority: 'medium',
    tags: ['Infra'],
    customFieldDefinitions: [],
    calendar: DEFAULT_CALENDAR,
    tasks: calculateSchedule(
      [
        {
          id: 'inf_1',
          displayId: 1,
          wbs: '1',
          name: 'Instalación Servidores',
          startDate: d1,
          endDate: stepDays(d1, 4),
          durationDays: 4,
          workHours: 32,
          progress: 100,
          status: 'completed',
          priority: 'high',
          assignedResources: ['Roberto Sánchez'],
          tags: ['Hardware'],
          dependencies: [],
          constraintType: 'ASAP',
          type: 'normal',
          trafficLight: 'green',
          customFields: {},
          parentId: null,
          order: 0,
        },
        {
          id: 'inf_2',
          displayId: 2,
          wbs: '2',
          name: 'Configuración Red y Seguridad',
          startDate: stepDays(d1, 5),
          endDate: stepDays(d1, 9),
          durationDays: 4,
          workHours: 32,
          progress: 50,
          status: 'in_progress',
          priority: 'high',
          assignedResources: ['Roberto Sánchez'],
          tags: ['Redes'],
          dependencies: [{ id: 'dep_inf_1', predecessorId: 'inf_1', type: 'FS', lagDays: 0 }],
          constraintType: 'ASAP',
          type: 'normal',
          trafficLight: 'green',
          customFields: {},
          parentId: null,
          order: 1,
        },
      ],
      DEFAULT_CALENDAR,
      today
    ),
    resources: ['Roberto Sánchez'],
    baselines: [],
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    format: 'OpenWebProject',
    version: '1.0',
    id: 'workspace_default',
    name: 'Workspace Principal',
    activeProjectId: initialProject.id,
    projects: [initialProject, infraProject],
  };
}

export function loadWorkspaceFromStorage(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Workspace;
      if (parsed.format === 'OpenWebProject' && Array.isArray(parsed.projects)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error al cargar Workspace desde almacenamiento local:', err);
  }
  const defaultWs = createInitialSampleWorkspace();
  saveWorkspaceToStorage(defaultWs);
  return defaultWs;
}

export function saveWorkspaceToStorage(workspace: Workspace): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (err) {
    console.error('Error al guardar Workspace en almacenamiento local:', err);
  }
}
