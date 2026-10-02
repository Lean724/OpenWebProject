/**
 * OpenWebProject - Microsoft Project XML (MSPDI) Exporter and Importer
 * Standard compatible XML representation for Microsoft Project.
 */
import { Project, Task, TaskDependency, DependencyType } from '../types/project';
import { getTodayString } from '../domain/calendar';

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

  const nameEl = xmlDoc.querySelector('Project > Name') || xmlDoc.querySelector('Project > Title');
  const projectName = nameEl?.textContent || 'Proyecto Importado (MS Project)';

  // Resources
  const resources: string[] = [];
  const resourceEls = xmlDoc.querySelectorAll('Resource');
  resourceEls.forEach((resEl) => {
    const name = resEl.querySelector('Name')?.textContent?.trim();
    if (name && !resources.includes(name)) {
      resources.push(name);
    }
  });

  // Tasks
  const taskEls = xmlDoc.querySelectorAll('Task');
  const parsedTasks: Partial<Task>[] = [];
  const uidToIdMap = new Map<string, string>();

  taskEls.forEach((taskEl, index) => {
    const uid = taskEl.querySelector('UID')?.textContent?.trim() || `${index + 1}`;
    const name = taskEl.querySelector('Name')?.textContent?.trim() || `Tarea ${index + 1}`;
    const wbs = taskEl.querySelector('WBS')?.textContent?.trim() ||
                taskEl.querySelector('OutlineNumber')?.textContent?.trim() ||
                `${index + 1}`;
    const isSummary = taskEl.querySelector('Summary')?.textContent?.trim() === '1';
    const isMilestone = taskEl.querySelector('Milestone')?.textContent?.trim() === '1';

    const startRaw = taskEl.querySelector('Start')?.textContent?.trim();
    const finishRaw = taskEl.querySelector('Finish')?.textContent?.trim();

    const startDate = startRaw ? startRaw.split('T')[0] : getTodayString();
    const endDate = finishRaw ? finishRaw.split('T')[0] : startDate;

    const percentComplete = parseInt(taskEl.querySelector('PercentComplete')?.textContent || '0', 10);
    const notes = taskEl.querySelector('Notes')?.textContent || '';

    // Duration parsing
    let durationDays = 1;
    const durRaw = taskEl.querySelector('Duration')?.textContent?.trim();
    if (isMilestone) {
      durationDays = 0;
    } else if (durRaw && durRaw.startsWith('PT')) {
      const matchHours = durRaw.match(/PT(\d+)H/);
      if (matchHours) {
        durationDays = Math.max(1, Math.round(parseInt(matchHours[1], 10) / 8));
      }
    }

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
      workHours: durationDays * 8,
      progress: Math.min(100, Math.max(0, percentComplete)),
      status: percentComplete >= 100 ? 'completed' : percentComplete > 0 ? 'in_progress' : 'not_started',
      priority: 'medium',
      assignedResources: [],
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

  // Re-link dependencies now that all UIDs are mapped
  taskEls.forEach((taskEl, index) => {
    const task = parsedTasks[index];
    const predLinks = taskEl.querySelectorAll('PredecessorLink');
    const deps: TaskDependency[] = [];

    predLinks.forEach((pl, pIdx) => {
      const predUid = pl.querySelector('PredecessorUID')?.textContent?.trim();
      const typeNum = parseInt(pl.querySelector('Type')?.textContent || '1', 10);
      const lagTenths = parseInt(pl.querySelector('LinkLag')?.textContent || '0', 10);
      const lagDays = Math.round(lagTenths / (8 * 60 * 10));

      if (predUid && uidToIdMap.has(predUid)) {
        deps.push({
          id: `dep_${index}_${pIdx}`,
          predecessorId: uidToIdMap.get(predUid)!,
          type: msProjectToDepType(typeNum),
          lagDays,
        });
      } else {
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
