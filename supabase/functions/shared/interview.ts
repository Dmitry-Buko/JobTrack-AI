/** Общие данные и промпт-строители для AI-тренажёра. */

import { DATA_ONLY_RULE, tagBlock } from './prompt.ts';
import type { InterviewTopic } from './schemas.ts';

export interface ApplicationContext {
  company: string;
  position: string;
  description: string | null;
}

/** Ключи проверяются компилятором против INTERVIEW_TOPICS (schemas.ts). */
export const TOPIC_LABELS: Record<InterviewTopic, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  redux_toolkit: 'Redux Toolkit и RTK Query',
  html_css: 'HTML и CSS',
  browser_apis: 'Браузерные API (DOM, события, хранилища, Web APIs)',
  networking: 'Работа с сетью (HTTP, REST, WebSocket, CORS, кэширование)',
  mixed: 'смешанная тема (JavaScript, TypeScript, React, Redux Toolkit, HTML/CSS, браузерные API, работа с сетью)',
};

export function topicLabel(topic: string): string {
  // Ключ приходит из zod-enum (schemas.ts), но на случай ручного вызова
  // неизвестное значение возвращается как есть.
  return TOPIC_LABELS[topic as InterviewTopic] ?? topic;
}

export function languageName(language: string): string {
  return language === 'en' ? 'английском' : 'русском';
}

export function difficultyExpectations(difficulty: string): string {
  switch (difficulty) {
    case 'junior':
      return 'уровень Junior: базовые понятия, типичные заблуждения, простые практические сценарии';
    case 'junior_plus':
      return 'уровень Junior+: базовые и промежуточные темы, понимание внутреннего устройства, разбор несложного кода';
    case 'middle':
      return 'уровень Middle: глубокое понимание, компромиссы решений, поиск ошибок в коде, оптимизация и лучшие практики';
    default:
      return 'уровень Junior';
  }
}

/**
 * Блок контекста вакансии для промптов. Поля пользователя (позиция,
 * компания, описание) — внутри тега <application> и санитизированы;
 * ничего не выдумываем сверх описания.
 */
export function applicationBlock(application: ApplicationContext | null): string {
  if (!application) return '';
  const header = `Позиция: ${application.position} в компании «${application.company}».`;
  const body = application.description
    ? `${header}\nОписание вакансии:\n${application.description}`
    : header;
  return (
    `\n\nКонтекст вакансии (используй только эти данные, не выдумывай требований):\n` +
    tagBlock('application', body)
  );
}

export const INTERVIEWER_SYSTEM =
  'Ты — опытный, доброжелательный технический интервьюер по frontend-разработке. ' +
  'Ты честно оцениваешь ответы, хвалишь за сильные стороны и мягко указываешь на пробелы. ' +
  'Ты всегда отвечаешь строго валидным JSON без markdown-обёрток. ' +
  DATA_ONLY_RULE;
