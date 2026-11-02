/**
 * AI-матчинг: один батчевый запрос Gemini сразу для всех вакансий
 * (экономия токенов против поштучных запросов). Чистые функции —
 * строят промпт и нормализуют ответ модели, что легко тестируется.
 */

import type { MatchResult, Vacancy, VacancyProfile } from './types.ts';
import { truncate } from './text.ts';

const MAX_DESCRIPTION_IN_PROMPT = 700;
const MAX_SKILLS = 10;
const MAX_SUMMARY = 300;

export function buildMatcherSystem(): string {
  return (
    'Ты — карьерный консультант технического рекрутинга. Тебе дают профиль соискателя ' +
    'и список вакансий с номерами. Для каждой вакансии оцени, насколько она подходит ' +
    'проффилю: процент совпадения (0–100), совпавшие навыки, недостающие навыки и ' +
    'короткое пояснение по-русски. Если позиция явно не по профилю — процент до 20 и ' +
    'пояснение одной строкой. Для Telegram-постов без компании и позиции извлеки их ' +
    'из текста (company — кто нанимает, position — название роли). ' +
    'Отвечай только JSON: {"matches":[{"i":<номер>,"company":"...","position":"...",' +
    '"percent":<0-100>,"matched":["..."],"missing":["..."],"summary":"..."}]}. ' +
    'Элемент для каждой вакансии из списка, без пропусков.'
  );
}

export function buildMatchPrompt(profile: VacancyProfile, vacancies: Vacancy[]): string {
  const skills = profile.skills.slice(0, MAX_SKILLS).join(', ') || 'не указаны';
  const locations = profile.locations.filter(Boolean).join(', ') || 'не указаны';
  const levelLabel =
    { junior: 'junior', junior_plus: 'junior+', middle: 'middle' }[profile.level] ?? profile.level;

  const lines = vacancies.map((vacancy, index) => {
    const parts = [
      `${index + 1}. ${vacancy.position || 'позиция не указана'}`,
      vacancy.company || 'компания не указана',
      vacancy.location || 'локация не указана',
    ];
    if (vacancy.salary) parts.push(vacancy.salary);
    const header = parts.join(' | ');
    const body = truncate(vacancy.description, MAX_DESCRIPTION_IN_PROMPT) || 'без описания';
    return `${header}\n${body}`;
  });

  return (
    `Профиль соискателя:\n` +
    `- Роль: ${profile.role}\n` +
    `- Уровень: ${levelLabel}\n` +
    `- Навыки: ${skills}\n` +
    `- Желаемые локации: ${locations}\n\n` +
    `Вакансии:\n${lines.join('\n\n')}\n\n` +
    `Оцени каждую вакансию (i — её номер в списке выше).`
  );
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_SKILLS);
}

/**
 * Приводит ответ Gemini к массиву результатов по индексам вакансий.
 * Модели иногда путают номера или пропускают элементы — тогда позиция
 * получает null и фронт покажет её без процента.
 */
export function normalizeMatches(raw: unknown, count: number): (MatchResult | null)[] {
  const results: (MatchResult | null)[] = new Array(count).fill(null);
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? (raw as { matches?: unknown }).matches : null;
  if (!Array.isArray(list)) return results;

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    const index = Number(entry.i);
    if (!Number.isInteger(index) || index < 1 || index > count) continue;

    const percent = Number(entry.percent);
    results[index - 1] = {
      percent: Number.isFinite(percent) ? Math.min(100, Math.max(0, Math.round(percent))) : 0,
      matched: strArray(entry.matched),
      missing: strArray(entry.missing),
      summary: truncate(typeof entry.summary === 'string' ? entry.summary.trim() : '', MAX_SUMMARY),
    };
  }
  return results;
}

/**
 * Встраивает результаты матчинга в вакансии: проценты, а для пустых
 * полей — компанию/позицию, извлечённые моделью из текста поста.
 */
export function applyMatches(
  vacancies: Vacancy[],
  matches: (MatchResult | null)[],
  raw: unknown,
): (Vacancy & { match: MatchResult | null })[] {
  const extracted = Array.isArray(
    raw && typeof raw === 'object' ? (raw as { matches?: unknown }).matches : null,
  )
    ? ((raw as { matches: unknown[] }).matches as Record<string, unknown>[])
    : [];

  return vacancies.map((vacancy, index) => {
    const source = extracted.find((item) => Number(item?.i) === index + 1) ?? {};
    return {
      ...vacancy,
      company: vacancy.company || (typeof source.company === 'string' ? source.company.trim() : ''),
      position:
        vacancy.position ||
        (typeof source.position === 'string' ? source.position.trim() : ''),
      match: matches[index] ?? null,
    };
  });
}
