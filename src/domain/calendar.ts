/**
 * OpenWebProject - Calendar & Date Arithmetic
 * Operates purely on YYYY-MM-DD calendar dates to prevent timezone drift.
 */
import { ProjectCalendar } from '../types/project';

export const DEFAULT_CALENDAR: ProjectCalendar = {
  workingDays: [1, 2, 3, 4, 5], // Monday - Friday
  hoursPerDay: 8,
  daysOff: [],
};

/**
 * Parses YYYY-MM-DD to [year, month (1-12), day]
 */
export function parseDateParts(dateStr: string): [number, number, number] {
  const parts = dateStr.split('-');
  return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
}

/**
 * Formats [year, month, day] to YYYY-MM-DD
 */
export function formatDate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Returns Date object in UTC to safely calculate day-of-week and arithmetic
 */
export function dateStringToUtc(dateStr: string): Date {
  const [y, m, d] = parseDateParts(dateStr);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Converts UTC Date object back to YYYY-MM-DD
 */
export function utcToDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return formatDate(y, m, d);
}

/**
 * Returns day of week: 0=Sun, 1=Mon, ..., 6=Sat
 */
export function getDayOfWeek(dateStr: string): number {
  const utc = dateStringToUtc(dateStr);
  return utc.getUTCDay();
}

/**
 * Checks if a date is a working day according to the calendar
 */
export function isWorkingDay(dateStr: string, calendar: ProjectCalendar = DEFAULT_CALENDAR): boolean {
  if (calendar.daysOff && calendar.daysOff.includes(dateStr)) {
    return false;
  }
  const dow = getDayOfWeek(dateStr);
  return calendar.workingDays.includes(dow);
}

/**
 * Finds next working day on or after dateStr
 */
export function getNextWorkingDay(dateStr: string, calendar: ProjectCalendar = DEFAULT_CALENDAR): string {
  let curr = dateStr;
  while (!isWorkingDay(curr, calendar)) {
    curr = stepDays(curr, 1);
  }
  return curr;
}

/**
 * Finds previous working day on or before dateStr
 */
export function getPrevWorkingDay(dateStr: string, calendar: ProjectCalendar = DEFAULT_CALENDAR): string {
  let curr = dateStr;
  while (!isWorkingDay(curr, calendar)) {
    curr = stepDays(curr, -1);
  }
  return curr;
}

/**
 * Simply adds N calendar days (positive or negative) without calendar filter
 */
export function stepDays(dateStr: string, offset: number): string {
  const utc = dateStringToUtc(dateStr);
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utcToDateString(utc);
}

/**
 * Calculates end date given a start date and duration in working days.
 * If duration is 0 (milestone), end date equals start date.
 * If duration is 1, end date equals start date (assuming start date is working day).
 * If duration is N > 1, counts N working days starting from startDate.
 */
export function calculateEndDate(
  startDateStr: string,
  durationDays: number,
  calendar: ProjectCalendar = DEFAULT_CALENDAR
): string {
  let start = getNextWorkingDay(startDateStr, calendar);
  if (durationDays <= 0) {
    return start;
  }
  let curr = start;
  let remainingDays = durationDays - 1;

  while (remainingDays > 0) {
    curr = stepDays(curr, 1);
    if (isWorkingDay(curr, calendar)) {
      remainingDays--;
    }
  }
  return curr;
}

/**
 * Counts total working days between start and end date inclusive.
 */
export function countWorkingDays(
  startDateStr: string,
  endDateStr: string,
  calendar: ProjectCalendar = DEFAULT_CALENDAR
): number {
  if (startDateStr > endDateStr) {
    return 0;
  }
  let count = 0;
  let curr = startDateStr;
  while (curr <= endDateStr) {
    if (isWorkingDay(curr, calendar)) {
      count++;
    }
    curr = stepDays(curr, 1);
  }
  return count;
}

/**
 * Counts working days passed up to a given reference date (e.g. today).
 */
export function getWorkingDaysPassed(
  startDateStr: string,
  endDateStr: string,
  currentDateStr: string,
  calendar: ProjectCalendar = DEFAULT_CALENDAR
): number {
  if (currentDateStr < startDateStr) {
    return 0;
  }
  const effectiveEnd = currentDateStr > endDateStr ? endDateStr : currentDateStr;
  return countWorkingDays(startDateStr, effectiveEnd, calendar);
}

/**
 * Adds or subtracts working days to a date (useful for Lag/Lead).
 */
export function addWorkingDays(
  dateStr: string,
  days: number,
  calendar: ProjectCalendar = DEFAULT_CALENDAR
): string {
  if (days === 0) return dateStr;
  let curr = dateStr;
  let remaining = Math.abs(days);
  const direction = days > 0 ? 1 : -1;

  while (remaining > 0) {
    curr = stepDays(curr, direction);
    if (isWorkingDay(curr, calendar)) {
      remaining--;
    }
  }
  return curr;
}

/**
 * Gets today's calendar date in YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats YYYY-MM-DD to Spanish DD/MM/YYYY for UI display
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr || dateStr.length < 10) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
