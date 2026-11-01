import type { Application } from '@/types/application';

/** Строки iCalendar разделяются CRLF — иначе Outlook и Google Calendar отвергают файл. */
const CRLF = '\r\n';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Дата/время UTC в базовом формате iCal: YYYYMMDDTHHMMSSZ. */
function toIcsDateTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function parseIso(iso: string): Date | null {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Экранирование текстовых значений по RFC 5545 (§3.3.11). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/[\r\n]/g, '\\n');
}

/**
 * Перенос длинных строк по 75 октетам с продолжением с пробела (RFC 5545 §3.1).
 * Разрез не может попадать внутрь многобайтового символа UTF-8.
 */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    let limit = offset === 0 ? 75 : 74; // продолжения начинаются с пробела
    if (offset + limit >= bytes.length) {
      chunks.push(decoder.decode(bytes.subarray(offset)));
      break;
    }
    // Не разрезаем многобайтовый символ: байт 10xxxxxx — продолжение.
    while (limit > 0 && (bytes[offset + limit] & 0xc0) === 0x80) limit -= 1;
    chunks.push(decoder.decode(bytes.subarray(offset, offset + limit)));
    offset += limit;
  }
  return chunks.join(CRLF + ' ');
}

/** Безопасное имя файла: латиница/цифры/дефис, остальное — в подчёркивания. */
export function icsFileName(company: string, position: string): string {
  const slug = `${company}-${position}`
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `followup-${slug || 'jobtrack'}.ics`;
}

interface IcsEventDates {
  /** DTSTART с параметром VALUE=DATE для дат без времени, иначе полный UTC-формат. */
  start: string;
  end: string;
}

/** All-day событие занимает DTEND не включительно — на следующий день. */
function eventDates(iso: string): IcsEventDates | null {
  const date = parseIso(iso);
  if (!date) return null;

  if (iso.length === 10) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      start: `DTSTART;VALUE=DATE:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
      end: `DTEND;VALUE=DATE:${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`,
    };
  }

  // Событие длительностью час — «напоминание», а не встреча.
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  return {
    start: `DTSTART:${toIcsDateTime(date)}`,
    end: `DTEND:${toIcsDateTime(end)}`,
  };
}

/**
 * Файл .ics для следующего действия по вакансии: клиентская генерация,
 * скачивается Blob-ом без участия бэкенда.
 */
export function buildApplicationIcs(application: Application): string {
  const dates = application.next_action_at
    ? eventDates(application.next_action_at)
    : null;
  if (!dates) {
    throw new Error('У вакансии нет даты следующего действия — календарь не построить.');
  }

  const descriptionParts = [
    `Вакансия: ${application.position} — ${application.company}`,
  ];
  if (application.salary_min != null || application.salary_max != null) {
    descriptionParts.push(
      `Зарплата: ${application.salary_min ?? '—'}–${application.salary_max ?? '—'}`,
    );
  }
  if (application.notes) descriptionParts.push(`Заметки: ${application.notes}`);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobTrack AI//Follow-up//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${application.id}@jobtrack.ai`,
    `DTSTAMP:${toIcsDateTime(new Date())}`,
    dates.start,
    dates.end,
    `SUMMARY:${escapeIcsText(`Follow-up: ${application.company} — ${application.position}`)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
  ];
  if (application.location) {
    lines.push(`LOCATION:${escapeIcsText(application.location)}`);
  }
  if (application.url) {
    lines.push(`URL:${escapeIcsText(application.url)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}

/** Скачивание .ics через Blob: URL освобождаем сразу после клика. */
export function downloadApplicationIcs(application: Application): void {
  const content = buildApplicationIcs(application);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = icsFileName(application.company, application.position);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
