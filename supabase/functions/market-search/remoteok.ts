/**
 * Адаптер RemoteOK: публичный JSON https://remoteok.com/api.
 * Первый элемент массива — служебная запись (legal), она отсеётся сама:
 * у неё нет полей position/url.
 */

import type { Vacancy } from './types.ts';
import { shortHash, stripHtml, truncate } from './text.ts';

const MAX_DESCRIPTION = 2000;

interface RemoteOkItem {
  position?: unknown;
  company?: unknown;
  url?: unknown;
  location?: unknown;
  salary_min?: unknown;
  salary_max?: unknown;
  description?: unknown;
  date?: unknown;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Форматирует годовую вилку RemoteOK (USD) в компактный вид; нули — «не указана». */
function formatSalary(min: unknown, max: unknown): string {
  const lo = typeof min === 'number' && Number.isFinite(min) && min > 0 ? Math.round(min / 1000) : null;
  const hi = typeof max === 'number' && Number.isFinite(max) && max > 0 ? Math.round(max / 1000) : null;
  if (lo == null && hi == null) return '';
  if (lo != null && hi != null && lo !== hi) return `$${lo}k–$${hi}k`;
  return `$${lo ?? hi}k`;
}

function isoDate(value: unknown): string {
  const raw = str(value);
  if (!raw) return '';
  let date = new Date(raw);
  // Дата без таймзоны трактуется как UTC (RemoteOK отдаёт UTC).
  if (Number.isNaN(date.getTime()) && !/(?:z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    date = new Date(`${raw}Z`);
  }
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function parseRemoteOkJson(data: unknown): Vacancy[] {
  if (!Array.isArray(data)) return [];
  const vacancies: Vacancy[] = [];
  for (const entry of data as RemoteOkItem[]) {
    if (!entry || typeof entry !== 'object') continue;
    const position = str(entry.position);
    const company = str(entry.company);
    const url = str(entry.url);
    if (!position || !company || !url) continue;

    vacancies.push({
      id: `remoteok:${shortHash(url)}`,
      source: 'remoteok',
      url,
      company,
      position,
      location: str(entry.location) || 'Remote',
      salary: formatSalary(entry.salary_min, entry.salary_max),
      description: truncate(stripHtml(str(entry.description)), MAX_DESCRIPTION),
      publishedAt: isoDate(entry.date),
    });
  }
  return vacancies;
}
