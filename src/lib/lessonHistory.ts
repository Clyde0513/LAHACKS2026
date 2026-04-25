import type { LessonRecord } from '../types';

const STORAGE_KEY = 'tmn_lesson_history';
const MAX_RECORDS = 50;

export function getLessonRecords(): LessonRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LessonRecord[];
  } catch {
    return [];
  }
}

export function saveLessonRecord(record: LessonRecord): void {
  try {
    const existing = getLessonRecords().filter((r) => r.id !== record.id);
    const updated  = [record, ...existing].slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage quota or private browsing — silently ignore
  }
}

export function removeLessonRecord(id: string): void {
  try {
    const updated = getLessonRecords().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Returns the number of consecutive days that have at least one completed lesson. */
export function calcStreak(records: LessonRecord[]): number {
  if (!records.length) return 0;
  const daySet = new Set(
    records.map((r) => {
      const d = new Date(r.completedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!daySet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
