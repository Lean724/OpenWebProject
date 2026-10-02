/**
 * OpenWebProject - Microsoft Project XML (MSPDI) Exporter and Importer
 * Standard compatible XML representation for Microsoft Project.
 */
import { Project, Task, TaskDependency, DependencyType } from '../types/project';
import { getTodayString, stepDays } from '../domain/calendar';

/**
 * Dependency type mapping for MS Project:
 * 1: Finish-to-Start (FS)
 * 2: Start-to-Start (SS)
 * 3: Finish-to-Finish (FF)
 * 4: Start-to-Finish (SF)
 */
function depTypeToMsProject(type: DependencyType): number {
  switch (type) {
    case 'FS': return 1;
    case 'SS': return 2;
    case 'FF': return 3;
    case 'SF': return 4;
  }
}

function msProjectToDepType(val: number): DependencyType {
  switch (val) {
    case 1: return 'FS';
    case 2: return 'SS';
    case 3: return 'FF';
    case 4: return 'SF';
    default: return 'FS';
  }
}

// Helper to query XML elements ignoring namespace prefixes
function findTags(parent: Element | Document, tagName: string): Element[] {
  if (parent.getElementsByTagNameNS) {
    const byNs = Array.from(parent.getElementsByTagNameNS('*', tagName));
    if (byNs.length > 0) return byNs;
  }
  const byTag = Array.from(parent.getElementsByTagName(tagName));
  if (byTag.length > 0) return byTag;
  try {
    return Array.from(parent.querySelectorAll(tagName));
  } catch {
    return [];
  }
}

function findTagText(parent: Element | Document, tagName: string): string | null {
  const els = findTags(parent, tagName);
  return els.length > 0 ? els[0].textContent?.trim() || null : null;
}

/**
 * Parse ISO 8601 or MS Project duration strings like "PT40H0M0S", "PT8H", "PT0S", "P5D"
 */
function parseMsProjectDuration(durRaw: string | null | undefined, isMilestone: boolean, hoursPerDay = 8): { days: number; hours: number } {
  if (isMilestone) return { days: 0, hours: 0 };
  if (!durRaw) return { days: 1, hours: hoursPerDay };

  const str = durRaw.trim();
  if (str === 'PT0S' || str === 'PT0H0M0S' || str === 'PT0M0S') {
    return { days: 0, hours: 0 };
  }

  // Format: PT40H0M0S or PT8H
  const hMatch = str.match(/PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (hMatch && (hMatch[1] || hMatch[2])) {
    const hours = parseFloat(hMatch[1] || '0');
    const minutes = parseFloat(hMatch[2] || '0');
    const totalHours = hours + (minutes / 60);
    const days = Math.max(1, Math.round(totalHours / hoursPerDay));
    return { days, hours: Math.round(totalHours) };
  }

  // Format: P5D or P1W
  const dMatch = str.match(/P(?:(\d+)D)?(?:(\d+)W)?/i);
  if (dMatch && (dMatch[1] || dMatch[2])) {
    const days = parseInt(dMatch[1] || '0', 10) + (parseInt(dMatch[2] || '0', 10) * 5);
    return { days: Math.max(1, days), hours: days * hoursPerDay };
  }

  // Numeric fallback (e.g. minutes or hours)
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num > 100) {
      // Likely minutes
      const hours = Math.round(num / 60);
      return { days: Math.max(1, Math.round(hours / hoursPerDay)), hours };
    }
    return { days: Math.max(1, Math.round(num)), hours: Math.round(num) * hoursPerDay };
  }

  return { days: 1, hours: hoursPerDay };
}

export function exportToMsProjectXml(project: Project): string {
  const uidMap = new Map<string, number>();
  project.tasks.forEach((t, index) => {
    uidMap.set(t.id, index + 1);
  });

  const taskXmlList = project.tasks.map((t) => {
    const uid = uidMap.get(t.id)!;
    const isSummary = t.type === 'summary';
    const isMilestone = t.type === 'milestone';
    const durHours = t.durationDays * (project.calendar.hoursPerDay || 8);
    const durationStr = `PT${durHours}H0M0S`;

    const predLinks = t.dependencies.map((d) => {
      const predUid = uidMap.get(d.predecessorId);
      if (!predUid) return '';
      const typeNum = depTypeToMsProject(d.type);
      const lagTenthsOfMinutes = d.lagDays * (project.calendar.hoursPerDay || 8) * 60 * 10;
      return `
        <PredecessorLink>
          <PredecessorUID>${predUid}</PredecessorUID>
          <Type>${typeNum}</Type>
          <LinkLag>${lagTenthsOfMinutes}</LinkLag>
        </PredecessorLink>`;
    }).join('');

    return `
    <Task>
      <UID>${uid}</UID>
      <ID>${t.displayId}</ID>
      <Name><![CDATA[${t.name}]]></Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${t.wbs}</WBS>
      <OutlineNumber>${t.wbs}</OutlineNumber>
      <OutlineLevel>${t.wbs.split('.').length}</OutlineLevel>
      <Priority>${t.priority === 'urgent' ? 900 : t.priority === 'high' ? 700 : t.priority === 'medium' ? 500 : 300}</Priority>
      <Start>${t.startDate}T08:00:00</Start>
      <Finish>${t.endDate}T17:00:00</Finish>
      <Duration>${durationStr}</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>PT${t.workHours}H0M0S</Work>
      <PercentComplete>${t.progress}</PercentComplete>
      <PercentWorkComplete>${t.progress}</PercentWorkComplete>
      <Summary>${isSummary ? 1 : 0}</Summary>
      <Milestone>${isMilestone ? 1 : 0}</Milestone>
      <Critical>${t.isCritical ? 1 : 0}</Critical>
      <Notes><![CDATA[${t.notes || ''}]]></Notes>
      ${predLinks}
    </Task>`;
  }).join('');

  const resourceXmlList = (project.resources || []).map((r, idx) => `
    <Resource>
      <UID>${idx + 1}</UID>
      <ID>${idx + 1}</ID>
      <Name><![CDATA[${r}]]></Name>
      <Type>1</Type>
    </Resource>`).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name><![CDATA[${project.name}]]></Name>
  <Title><![CDATA[${project.name}]]></Title>
  <Author><![CDATA[${project.manager || 'OpenWebProject'}]]></Author>
  <CreationDate>${project.createdAt}T08:00:00</CreationDate>
  <StartDate>${project.startDate}T08:00:00</StartDate>
  <FinishDate>${project.endDate}T17:00:00</FinishDate>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>${(project.calendar.hoursPerDay || 8) * 60}</MinutesPerDay>
  <MinutesPerWeek>${(project.calendar.hoursPerDay || 8) * 60 * 5}</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <Tasks>${taskXmlList}
  </Tasks>
  <Resources>${resourceXmlList}
  </Resources>
</Project>`;
}

export interface MsProjectImportResult {
  projectName: string;
  tasks: Partial<Task>[];
  resources: string[];
  warnings: string[];
}

export function importFromMsProjectXml(xmlString: string): MsProjectImportResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const warnings: string[] = [];

  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('El archivo no es un XML válido: ' + parseError.textContent);
  }

  const projectName = findTagText(xmlDoc, 'Name') ||
                      findTagText(xmlDoc, 'Title') ||
                      'Proyecto Importado (MS Project)';

  // 1. Resources mapping: UID -> Name
  const resourceUidToName = new Map<string, string>();
  const resources: string[] = [];
  const resourceEls = findTags(xmlDoc, 'Resource');

  resourceEls.forEach((resEl) => {
    const uid = findTagText(resEl, 'UID');
    const name = findTagText(resEl, 'Name');
    if (uid && name) {
      resourceUidToName.set(uid, name);
      if (!resources.includes(name)) {
        resources.push(name);
      }
    }
  });

  // 2. Resource Assignments: TaskUID -> Array of Resource Names
  const taskUidToResources = new Map<string, string[]>();
  const assignmentEls = findTags(xmlDoc, 'Assignment');

  assignmentEls.forEach((assignEl) => {
    const taskUid = findTagText(assignEl, 'TaskUID');
    const resUid = findTagText(assignEl, 'ResourceUID');
    if (taskUid && resUid && resourceUidToName.has(resUid)) {
      const resName = resourceUidToName.get(resUid)!;
      const list = taskUidToResources.get(taskUid) || [];
      if (!list.includes(resName)) {
        list.push(resName);
      }
      taskUidToResources.set(taskUid, list);
    }
  });

  // 3. Tasks parsing
  const taskEls = findTags(xmlDoc, 'Task');
  const parsedTasks: Partial<Task>[] = [];
  const uidToIdMap = new Map<string, string>();

  taskEls.forEach((taskEl, index) => {
    const uid = findTagText(taskEl, 'UID') || `${index + 1}`;
    const name = findTagText(taskEl, 'Name') || `Tarea ${index + 1}`;
    const wbs = findTagText(taskEl, 'WBS') ||
                findTagText(taskEl, 'OutlineNumber') ||
                `${index + 1}`;
    const isSummary = findTagText(taskEl, 'Summary') === '1';
    const isMilestone = findTagText(taskEl, 'Milestone') === '1';

    const startRaw = findTagText(taskEl, 'Start');
    const finishRaw = findTagText(taskEl, 'Finish');

    const startDate = startRaw ? startRaw.split('T')[0] : getTodayString();
    const endDate = finishRaw ? finishRaw.split('T')[0] : startDate;

    const percentComplete = parseInt(findTagText(taskEl, 'PercentComplete') || '0', 10);
    const notes = findTagText(taskEl, 'Notes') || '';

    // Duration calculation
    const durRaw = findTagText(taskEl, 'Duration');
    const { days: durationDays, hours: workHours } = parseMsProjectDuration(durRaw, isMilestone);

    // Resources from Assignments or ResourceNames tag
    const assignedFromAssigns = taskUidToResources.get(uid) || [];
    const directResNames = findTagText(taskEl, 'ResourceNames');
    const directList = directResNames
      ? directResNames.split(/[,;]/).map(r => r.trim()).filter(Boolean)
      : [];
    
    const assignedResources = Array.from(new Set([...assignedFromAssigns, ...directList]));

    // Priority mapping (MS Project uses 0 to 1000)
    const prioVal = parseInt(findTagText(taskEl, 'Priority') || '500', 10);
    const priority = prioVal >= 800 ? 'urgent' : prioVal >= 650 ? 'high' : prioVal <= 400 ? 'low' : 'medium';

    const taskId = `task_msp_${uid}`;
    uidToIdMap.set(uid, taskId);

    parsedTasks.push({
      id: taskId,
      displayId: index + 1,
      wbs,
      name,
      startDate,
      endDate,
      durationDays,
      workHours,
      progress: Math.min(100, Math.max(0, isNaN(percentComplete) ? 0 : percentComplete)),
      status: percentComplete >= 100 ? 'completed' : percentComplete > 0 ? 'in_progress' : 'not_started',
      priority,
      assignedResources,
      tags: [],
      dependencies: [],
      constraintType: 'ASAP',
      notes,
      type: isSummary ? 'summary' : isMilestone ? 'milestone' : 'normal',
      trafficLight: 'green',
      customFields: {},
      parentId: null,
      order: index,
    });
  });

  // 4. Re-link dependencies
  taskEls.forEach((taskEl, index) => {
    const task = parsedTasks[index];
    const predLinks = findTags(taskEl, 'PredecessorLink');
    const deps: TaskDependency[] = [];

    predLinks.forEach((pl, pIdx) => {
      const predUid = findTagText(pl, 'PredecessorUID');
      const typeNum = parseInt(findTagText(pl, 'Type') || '1', 10);
      const lagTenths = parseInt(findTagText(pl, 'LinkLag') || '0', 10);
      const lagDays = Math.round(lagTenths / (8 * 60 * 10));

      if (predUid && uidToIdMap.has(predUid)) {
        deps.push({
          id: `dep_${index}_${pIdx}`,
          predecessorId: uidToIdMap.get(predUid)!,
          type: msProjectToDepType(typeNum),
          lagDays,
        });
      } else if (predUid) {
        warnings.push(`Predecesora con UID ${predUid} no encontrada para tarea "${task.name}".`);
      }
    });

    task.dependencies = deps;
  });

  return {
    projectName,
    tasks: parsedTasks,
    resources,
    warnings,
  };
}

/**
 * Returns a high-quality sample MS Project XML document to test import
 */
export function getSampleMsProjectXml(): string {
  const today = getTodayString();
  const d5 = stepDays(today, 5);
  const d10 = stepDays(today, 10);
  const d15 = stepDays(today, 15);
  const d20 = stepDays(today, 20);
  const d25 = stepDays(today, 25);
  const d30 = stepDays(today, 30);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>Despliegue ERP Corporativo (Demo MS Project)</Name>
  <Title>Despliegue ERP Corporativo (Demo MS Project)</Title>
  <Author>Microsoft Project Export</Author>
  <CreationDate>${today}T08:00:00</CreationDate>
  <StartDate>${today}T08:00:00</StartDate>
  <FinishDate>${d30}T17:00:00</FinishDate>
  <Tasks>
    <Task>
      <UID>1</UID>
      <ID>1</ID>
      <Name>1. Fase de Análisis y Alcance</Name>
      <WBS>1</WBS>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>${today}T08:00:00</Start>
      <Finish>${d10}T17:00:00</Finish>
      <Duration>PT80H0M0S</Duration>
      <PercentComplete>100</PercentComplete>
      <Summary>1</Summary>
      <Milestone>0</Milestone>
    </Task>
    <Task>
      <UID>2</UID>
      <ID>2</ID>
      <Name>Levantamiento de Requerimientos</Name>
      <WBS>1.1</WBS>
      <OutlineNumber>1.1</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${today}T08:00:00</Start>
      <Finish>${d5}T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <PercentComplete>100</PercentComplete>
      <Summary>0</Summary>
      <Milestone>0</Milestone>
      <Priority>700</Priority>
    </Task>
    <Task>
      <UID>3</UID>
      <ID>3</ID>
      <Name>Aprobación de Arquitectura de Datos</Name>
      <WBS>1.2</WBS>
      <OutlineNumber>1.2</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d5}T08:00:00</Start>
      <Finish>${d10}T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <PercentComplete>100</PercentComplete>
      <Summary>0</Summary>
      <Milestone>0</Milestone>
      <PredecessorLink>
        <PredecessorUID>2</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>4</UID>
      <ID>4</ID>
      <Name>Hito: Acta de Alcance Firmada</Name>
      <WBS>1.3</WBS>
      <OutlineNumber>1.3</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d10}T17:00:00</Start>
      <Finish>${d10}T17:00:00</Finish>
      <Duration>PT0S</Duration>
      <PercentComplete>100</PercentComplete>
      <Summary>0</Summary>
      <Milestone>1</Milestone>
      <PredecessorLink>
        <PredecessorUID>3</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>5</UID>
      <ID>5</ID>
      <Name>2. Fase de Configuración y Migración</Name>
      <WBS>2</WBS>
      <OutlineNumber>2</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>${d10}T08:00:00</Start>
      <Finish>${d20}T17:00:00</Finish>
      <Duration>PT80H0M0S</Duration>
      <PercentComplete>50</PercentComplete>
      <Summary>1</Summary>
      <Milestone>0</Milestone>
    </Task>
    <Task>
      <UID>6</UID>
      <ID>6</ID>
      <Name>Parametrización de Módulos Financieros</Name>
      <WBS>2.1</WBS>
      <OutlineNumber>2.1</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d10}T08:00:00</Start>
      <Finish>${d15}T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <PercentComplete>70</PercentComplete>
      <Summary>0</Summary>
      <Milestone>0</Milestone>
      <PredecessorLink>
        <PredecessorUID>4</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>7</UID>
      <ID>7</ID>
      <Name>Migración y Limpieza de Datos Maestros</Name>
      <WBS>2.2</WBS>
      <OutlineNumber>2.2</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d15}T08:00:00</Start>
      <Finish>${d20}T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <PercentComplete>30</PercentComplete>
      <Summary>0</Summary>
      <Milestone>0</Milestone>
      <PredecessorLink>
        <PredecessorUID>6</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>8</UID>
      <ID>8</ID>
      <Name>3. Pruebas UAT y Salida en Vivo</Name>
      <WBS>3</WBS>
      <OutlineNumber>3</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>${d20}T08:00:00</Start>
      <Finish>${d30}T17:00:00</Finish>
      <Duration>PT80H0M0S</Duration>
      <PercentComplete>0</PercentComplete>
      <Summary>1</Summary>
      <Milestone>0</Milestone>
    </Task>
    <Task>
      <UID>9</UID>
      <ID>9</ID>
      <Name>Capacitación de Usuarios Clave</Name>
      <WBS>3.1</WBS>
      <OutlineNumber>3.1</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d20}T08:00:00</Start>
      <Finish>${d25}T17:00:00</Finish>
      <Duration>PT40H0M0S</Duration>
      <PercentComplete>0</PercentComplete>
      <Summary>0</Summary>
      <Milestone>0</Milestone>
      <PredecessorLink>
        <PredecessorUID>7</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>10</UID>
      <ID>10</ID>
      <Name>Hito: Go-Live del Sistema</Name>
      <WBS>3.2</WBS>
      <OutlineNumber>3.2</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${d30}T17:00:00</Start>
      <Finish>${d30}T17:00:00</Finish>
      <Duration>PT0S</Duration>
      <PercentComplete>0</PercentComplete>
      <Summary>0</Summary>
      <Milestone>1</Milestone>
      <PredecessorLink>
        <PredecessorUID>9</PredecessorUID>
        <Type>1</Type>
        <LinkLag>0</LinkLag>
      </PredecessorLink>
    </Task>
  </Tasks>
  <Resources>
    <Resource>
      <UID>1</UID>
      <ID>1</ID>
      <Name>Ing. Carlos Mendoza (Líder Proyecto)</Name>
      <Type>1</Type>
    </Resource>
    <Resource>
      <UID>2</UID>
      <ID>2</ID>
      <Name>Lic. Mariana Torres (Consultora ERP)</Name>
      <Type>1</Type>
    </Resource>
    <Resource>
      <UID>3</UID>
      <ID>3</ID>
      <Name>Equipo de DBA y Migración</Name>
      <Type>1</Type>
    </Resource>
  </Resources>
  <Assignments>
    <Assignment>
      <TaskUID>2</TaskUID>
      <ResourceUID>1</ResourceUID>
    </Assignment>
    <Assignment>
      <TaskUID>3</TaskUID>
      <ResourceUID>2</ResourceUID>
    </Assignment>
    <Assignment>
      <TaskUID>6</TaskUID>
      <ResourceUID>2</ResourceUID>
    </Assignment>
    <Assignment>
      <TaskUID>7</TaskUID>
      <ResourceUID>3</ResourceUID>
    </Assignment>
    <Assignment>
      <TaskUID>9</TaskUID>
      <ResourceUID>1</ResourceUID>
    </Assignment>
  </Assignments>
</Project>`;
}
