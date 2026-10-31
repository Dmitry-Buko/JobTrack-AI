/**
 * Подтемы JavaScript для тестового режима тренажёра.
 * Единственный источник для чипов, zod-валидации и подбора слабых тем.
 * Ключи обязаны совпадать с allowlist на сервере:
 * supabase/functions/shared/subtopics.ts
 */
export interface Subtopic {
  key: string;
  label: string;
}

export const JS_SUBTOPICS: Subtopic[] = [
  { key: 'variables_scope', label: 'Переменные и область видимости' },
  { key: 'types_coercion', label: 'Типы данных и приведение типов' },
  { key: 'functions_closures', label: 'Функции и замыкания' },
  { key: 'this_context', label: 'this и контекст вызова' },
  { key: 'arrays_methods', label: 'Массивы и их методы' },
  { key: 'objects_destructuring', label: 'Объекты и деструктуризация' },
  { key: 'prototypes_classes', label: 'Прототипы и классы' },
  { key: 'promises_async', label: 'Промисы и async/await' },
  { key: 'event_loop', label: 'Event Loop' },
  { key: 'fetch_network', label: 'fetch и работа с сетью' },
  { key: 'dom_events', label: 'DOM и события' },
  { key: 'error_handling', label: 'Обработка ошибок' },
  { key: 'es_modules', label: 'Модули ES6' },
  { key: 'map_set', label: 'Map и Set' },
  { key: 'iterators_generators', label: 'Итераторы и генераторы' },
];

export const JS_SUBTOPIC_KEYS = JS_SUBTOPICS.map((subtopic) => subtopic.key) as [
  string,
  ...string[],
];

export const JS_SUBTOPIC_LABELS: Record<string, string> = Object.fromEntries(
  JS_SUBTOPICS.map((subtopic) => [subtopic.key, subtopic.label]),
);

/** Человекочитаемое имя темы по ключу (fallback — сам ключ). */
export function subtopicLabel(key: string | null | undefined): string {
  if (!key) return 'JavaScript';
  return JS_SUBTOPIC_LABELS[key] ?? key;
}

/** Сколько тем выбирает кнопка «Любые темы». */
export const RANDOM_TOPICS_COUNT = 5;

/** Случайные темы для кнопки «Любые темы» (без повторов). */
export function pickRandomSubtopics(count = RANDOM_TOPICS_COUNT): string[] {
  const pool = [...JS_SUBTOPIC_KEYS];
  const picked: string[] = [];
  while (pool.length > 0 && picked.length < Math.min(count, JS_SUBTOPIC_KEYS.length)) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

/** Порог: подтема со средним баллом ниже считается слабой (для «Повторить слабые темы»). */
export const WEAK_SUBTOPIC_THRESHOLD = 3.5;

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

/**
 * Сопоставляет свободный текст слабых тем из отчётов («Замыкания», «Промисы»)
 * с ключами подтем: совпадение по вхождению нормализованных подстрок.
 */
export function matchWeakSubtopics(weakTopics: string[]): string[] {
  const normalized = weakTopics.map(normalize).filter((value) => value.length >= 3);
  const matched: string[] = [];
  for (const subtopic of JS_SUBTOPICS) {
    const label = normalize(subtopic.label);
    const stem = label.split(/[\s,/]+/)[0];
    const hit = normalized.some(
      (weak) => label.includes(weak) || weak.includes(stem) || weak.includes(label),
    );
    if (hit) matched.push(subtopic.key);
  }
  return matched;
}
