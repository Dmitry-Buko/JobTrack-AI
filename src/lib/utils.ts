/** Склейка CSS-классов (пустые значения отбрасываются). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const;

const numberFmt = new Intl.NumberFormat('ru-RU');

function parseDate(iso: string): Date | null {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** «5 мар» в текущем году, «5 мар 2025» — в прошлом. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseDate(iso);
  if (!date) return '—';
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return sameYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
}

/** «Сегодня, 14:30», «Вчера, 09:05» или «5 мар, 14:30». */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseDate(iso);
  if (!date) return '—';
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const diffDays = Math.round(
    (startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY,
  );
  if (diffDays === 0) return `Сегодня, ${time}`;
  if (diffDays === -1) return `Вчера, ${time}`;
  return `${formatDate(iso)}, ${time}`;
}

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** «Сегодня», «Завтра», «через 3 дня», «5 дней назад». */
export function formatRelativeDate(iso: string): string {
  const date = parseDate(iso);
  if (!date) return '—';

  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === -1) return 'Вчера';
  if (diffDays > 1) return `через ${diffDays} ${pluralize(diffDays, ['день', 'дня', 'дней'])}`;
  return `${-diffDays} ${pluralize(-diffDays, ['день', 'дня', 'дней'])} назад`;
}

/** Дата-«дедлайн» для карточек: «Сегодня», «Завтра», «через 3 дня» или «5 мар». */
export function formatDueDate(iso: string): string {
  const date = parseDate(iso);
  if (!date) return '—';
  const diffDays = Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
  if (diffDays >= -1) return formatRelativeDate(iso);
  return formatDate(iso);
}

/** Просрочено ли действие: дата раньше сегодняшнего дня (null — не просрочено). */
export function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = parseDate(iso);
  if (!date) return false;
  return startOfDay(date) < startOfDay(new Date());
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
  const date = parseDate(iso);
  if (!date) return '';
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
