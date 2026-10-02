/**
 * OpenWebProject - Import & Export Service
 * Supports .project, JSON, CSV, XLSX, MS Project XML, and PDF.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Project, Workspace, Task } from '../types/project';
import { exportToMsProjectXml, importFromMsProjectXml, MsProjectImportResult } from './xmlProject';
import { formatDisplayDate } from '../domain/calendar';

/**
 * Triggers a client-side file download
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1. NATIVE .project / JSON
export function exportWorkspaceToJson(workspace: Workspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function exportProjectToJson(project: Project): string {
  const bundle = {
    format: 'OpenWebProject',
    version: '1.0',
    manifest: {
      exportedAt: new Date().toISOString(),
      generator: 'OpenWebProject V1.0',
    },
    project,
  };
  return JSON.stringify(bundle, null, 2);
}

// 2. CSV EXPORT & IMPORT
export function exportTasksToCsv(tasks: Task[]): string {
  const headers = [
    'ID',
    'WBS',
    'Nombre',
    'Inicio',
    'Fin',
    'Duración (días)',
    'Trabajo (h)',
    'Progreso (%)',
    'Estado',
    'Responsable',
    'Prioridad',
    'Predecesoras',
    'Etiquetas',
    'Semáforo',
  ];

  const rows = tasks.map((t) => {
    const depsStr = t.dependencies
      .map((d) => `${d.predecessorId} [${d.type}${d.lagDays ? (d.lagDays > 0 ? '+' + d.lagDays : d.lagDays) : ''}]`)
      .join('; ');
    const resStr = t.assignedResources.join(', ');
    const tagsStr = t.tags.join(', ');

    return [
      t.displayId,
      `"${t.wbs}"`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      t.startDate,
      t.endDate,
      t.durationDays,
      t.workHours,
      t.progress,
      `"${t.status}"`,
      `"${resStr}"`,
      `"${t.priority}"`,
      `"${depsStr}"`,
      `"${tagsStr}"`,
      t.trafficLight,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function parseCsvRows(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

// 3. XLSX EXPORT & IMPORT (using SheetJS)
export function exportTasksToXlsx(project: Project): void {
  const data = project.tasks.map((t) => ({
    'ID': t.displayId,
    'WBS': t.wbs,
    'Nombre': t.name,
    'Inicio': t.startDate,
    'Fin': t.endDate,
    'Duración (días)': t.durationDays,
    'Trabajo (h)': t.workHours,
    'Progreso (%)': t.progress,
    'Estado': t.status,
    'Responsable': t.assignedResources.join(', '),
    'Prioridad': t.priority,
    'Predecesoras': t.dependencies.map((d) => `${d.predecessorId}:${d.type}`).join('; '),
    'Etiquetas': t.tags.join(', '),
    'Semáforo': t.trafficLight === 'green' ? 'Verde' : t.trafficLight === 'yellow' ? 'Amarillo' : 'Rojo',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tareas');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, `${project.name.replace(/\s+/g, '_')}_cronograma.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export function parseXlsxFile(arrayBuffer: ArrayBuffer): { sheetNames: string[]; getSheetData: (name: string) => { headers: string[]; rows: string[][] } } {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return {
    sheetNames: workbook.SheetNames,
    getSheetData: (sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      if (!json || json.length === 0) return { headers: [], rows: [] };
      const headers = (json[0] || []).map((h) => String(h || '').trim());
      const rows = json.slice(1).map((r) => (r || []).map((cell) => String(cell || '').trim()));
      return { headers, rows };
    },
  };
}

// 4. PDF EXPORT (using jsPDF)
export function exportGanttToPdf(project: Project, tasks: Task[]): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OpenWebProject — Plan de Proyecto', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Proyecto: ${project.name} | Responsable: ${project.manager || 'No asignado'} | Fecha reporte: ${formatDisplayDate(new Date().toISOString().split('T')[0])}`, 14, 18);

  // Table summary
  let startY = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del Cronograma y Desviaciones', 14, startY);

  startY += 6;
  // Header row
  doc.setFillColor(241, 245, 249);
  doc.rect(14, startY, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  doc.text('WBS', 16, startY + 5.5);
  doc.text('Nombre de la Tarea', 32, startY + 5.5);
  doc.text('Inicio', 115, startY + 5.5);
  doc.text('Fin', 135, startY + 5.5);
  doc.text('Duración', 155, startY + 5.5);
  doc.text('Progreso', 175, startY + 5.5);
  doc.text('Estado', 195, startY + 5.5);
  doc.text('Responsable', 225, startY + 5.5);
  doc.text('Semáforo', 265, startY + 5.5);

  startY += 8;
  doc.setFont('helvetica', 'normal');

  tasks.forEach((t) => {
    if (startY > pageHeight - 15) {
      doc.addPage();
      startY = 20;
    }

    const isSummary = t.type === 'summary';
    if (isSummary) {
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(248, 250, 252);
      doc.rect(14, startY, pageWidth - 28, 7, 'F');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    // Traffic light color box
    if (t.trafficLight === 'green') doc.setFillColor(34, 197, 94);
    else if (t.trafficLight === 'yellow') doc.setFillColor(234, 179, 8);
    else doc.setFillColor(239, 68, 68);
    doc.circle(272, startY + 3.5, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.text(t.wbs, 16, startY + 5);
    
    // Indent name visually based on wbs depth
    const indent = Math.max(0, (t.wbs.split('.').length - 1) * 3);
    const truncatedName = t.name.length > 45 ? t.name.slice(0, 42) + '...' : t.name;
    doc.text(truncatedName, 32 + indent, startY + 5);

    doc.text(formatDisplayDate(t.startDate), 115, startY + 5);
    doc.text(formatDisplayDate(t.endDate), 135, startY + 5);
    doc.text(`${t.durationDays} d`, 155, startY + 5);
    doc.text(`${t.progress}%`, 175, startY + 5);
    
    const statusLabels: Record<string, string> = {
      not_started: 'No iniciada',
      in_progress: 'En progreso',
      completed: 'Completada',
      blocked: 'Bloqueada',
      cancelled: 'Cancelada',
      on_hold: 'En espera',
    };
    doc.text(statusLabels[t.status] || t.status, 195, startY + 5);
    doc.text(t.assignedResources[0] || '-', 225, startY + 5);

    startY += 7;
  });

  // Footer page number
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${totalPages} — Generado por OpenWebProject (Offline)`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_cronograma.pdf`);
}
