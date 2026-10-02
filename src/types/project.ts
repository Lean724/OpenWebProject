/**
 * OpenWebProject V1.0 - Core Domain Models & Types
 */

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  id: string;
  predecessorId: string;
  type: DependencyType;
  lagDays: number; // Positive for lag, negative for lead
}

export type ConstraintType =
  | 'ASAP' // Lo antes posible (As Soon As Possible)
  | 'ALAP' // Lo más tarde posible (As Late As Possible)
  | 'SNET' // No comenzar antes de (Start No Earlier Than)
  | 'SNLT' // No comenzar después de (Start No Later Than)
  | 'MSO'  // Debe comenzar el (Must Start On)
  | 'FNET' // No finalizar antes de (Finish No Earlier Than)
  | 'FNLT' // No finalizar después de (Finish No Later Than)
  | 'MFO';  // Debe finalizar el (Must Finish On)

export type TaskStatus =
  | 'not_started' // No iniciada
  | 'in_progress' // En progreso
  | 'completed'   // Completada
  | 'blocked'     // Bloqueada
  | 'cancelled'   // Cancelada
  | 'on_hold';    // En espera

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskType = 'normal' | 'summary' | 'milestone';

export type TrafficLight = 'green' | 'yellow' | 'red';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select';
  options?: string[];
}

export interface Task {
  id: string; // Stable internal UUID
  displayId: number; // 1-based sequential number in view
  wbs: string; // e.g. "1.2.1"
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number; // Work days
  workHours: number; // Total hours (default: durationDays * 8)
  progress: number; // 0 - 100
  status: TaskStatus;
  priority: TaskPriority;
  assignedResources: string[];
  tags: string[];
  dependencies: TaskDependency[];
  constraintType: ConstraintType;
  constraintDate?: string; // YYYY-MM-DD
  notes?: string;
  type: TaskType;
  actualStartDate?: string;
  actualEndDate?: string;
  trafficLight: TrafficLight;
  expectedProgress?: number;
  customFields: Record<string, any>;
  parentId?: string | null;
  order: number;
  isCritical?: boolean;
  slackDays?: number;
  isCollapsed?: boolean;
}

export interface ProjectCalendar {
  workingDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun (default [1,2,3,4,5])
  hoursPerDay: number; // Default 8
  daysOff: string[]; // YYYY-MM-DD list of non-working holidays
}

export interface BaselineTask {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  workHours: number;
  progress: number;
  status: TaskStatus;
  assignedResources: string[];
  wbs: string;
  type: TaskType;
}

export interface Baseline {
  id: string;
  name: string;
  createdAt: string;
  tasks: Record<string, BaselineTask>;
}

export interface Snapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  projectData: Project;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  manager?: string;
  status: string;
  priority: TaskPriority;
  tags: string[];
  customFieldDefinitions: CustomFieldDefinition[];
  calendar: ProjectCalendar;
  tasks: Task[];
  resources: string[];
  baselines: Baseline[];
  snapshots: Snapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  projectData: Omit<Project, 'id' | 'snapshots' | 'baselines'>;
}

export interface Workspace {
  format: 'OpenWebProject';
  version: '1.0';
  id: string;
  name: string;
  activeProjectId: string;
  projects: Project[];
  templates?: ProjectTemplate[];
}
