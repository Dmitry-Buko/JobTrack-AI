/** Склейка CSS-классов (пустые значения отбрасываются). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const numberFmt = new Intl.NumberFormat('ru-RU');

/** «05.03.2026». Принимает дату в формате YYYY-MM-DD или ISO-дату. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFmt.format(date);
}

/** «05.03.2026, 14:30». */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFmt.format(date);
}

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** «сегодня», «завтра», «через 3 дня», «5 дн. назад». */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'завтра';
  if (diffDays === -1) return 'вчера';
  if (diffDays > 1) return `через ${diffDays} ${pluralize(diffDays, ['день', 'дня', 'дней'])}`;
  return `${-diffDays} ${pluralize(-diffDays, ['день', 'дня', 'дней'])} назад`;
}

/** Диапазон зарплаты: «100 000 – 150 000» (с обычными пробелами). */
export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  // Intl даёт неразрывные пробелы — заменяем на обычные для предсказуемости.
  const fmt = (value: number) => numberFmt.format(value).replace(/\u00A0/g, ' ');
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `от ${fmt(min)}`;
  if (max != null) return `до ${fmt(max)}`;
  return '—';
}

/** Дата в формате value для <input type="date"> (YYYY-MM-DD). */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Русская плюрализация: pluralize(3, ['вопрос', 'вопроса', 'вопросов']). */
export function pluralize(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

/** Прошедшее время для метрик вроде «обновлено N часов назад». */
export function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / MS_PER_HOUR;
}
