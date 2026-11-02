/** Ключи источников вакансий (адаптеры с одинаковым интерфейсом). */
export type SourceKey = 'telegram' | 'remoteok' | 'wwr';

/** Нормализованная вакансия — общий формат для всех источников. */
export interface Vacancy {
  /** Стабильный идентификатор: источник + хеш ссылки. */
  id: string;
  source: SourceKey;
  /** TG-канал происхождения (для остальных источников не заполняется). */
  channel?: string;
  url: string;
  company: string;
  position: string;
  location: string;
  /** Человекочитаемая зарплатная вилка ('' если неизвестна). */
  salary: string;
  /** Очищенный от разметки текст описания. */
  description: string;
  /** ISO-дата публикации ('' если неизвестна). */
  publishedAt: string;
}

/** Результат AI-матчинга вакансии под профиль пользователя. */
export interface MatchResult {
  percent: number;
  matched: string[];
  missing: string[];
  summary: string;
}

/** Профиль пользователя для подбора вакансий. */
export interface VacancyProfile {
  role: string;
  skills: string[];
  level: string;
  locations: string[];
}

/** Сколько вакансий максимум уходит в один батч-запрос Gemini (экономия токенов). */
export const MAX_PROMPT_VACANCIES = 30;
