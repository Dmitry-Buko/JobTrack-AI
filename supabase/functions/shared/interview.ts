/** Общие данные и промпт-строители для AI-тренажёра. */

export interface ApplicationContext {
  company: string;
  position: string;
  description: string | null;
}

export const TOPIC_LABELS: Record<string, string> = {
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
  return TOPIC_LABELS[topic] ?? topic;
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

/** Блок контекста вакансии для промптов. Ничего не выдумываем сверх описания. */
export function applicationBlock(application: ApplicationContext | null): string {
  if (!application) return '';
  const description = application.description
    ? `\nОписание вакансии (используй только требования из него, не выдумывай):\n${application.description}`
    : '';
  return `\n\nКонтекст вакансии: ${application.position} в компании «${application.company}».${description}`;
}

export const INTERVIEWER_SYSTEM =
  'Ты — опытный, доброжелательный технический интервьюер по frontend-разработке. ' +
  'Ты честно оцениваешь ответы, хвалишь за сильные стороны и мягко указываешь на пробелы. ' +
  'Ты всегда отвечаешь строго валидным JSON без markdown-обёрток.';
