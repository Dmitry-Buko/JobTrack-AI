/**
 * Allowlist подтем JavaScript для тестового режима.
 * Ключи обязаны совпадать с клиентским конфигом:
 * src/features/interview-coach/lib/subtopics.ts
 * Свободный текст от пользователя в промпт не попадает —
 * любой ключ вне списка отбивается zod-схемой функции.
 */
export const JS_SUBTOPICS: Record<string, string> = {
  variables_scope: 'Переменные и область видимости (var/let/const, hoisting)',
  types_coercion: 'Типы данных и приведение типов',
  functions_closures: 'Функции и замыкания',
  this_context: 'this и контекст вызова',
  arrays_methods: 'Массивы и их методы',
  objects_destructuring: 'Объекты и деструктуризация',
  prototypes_classes: 'Прототипы и классы',
  promises_async: 'Промисы и async/await',
  event_loop: 'Event Loop',
  fetch_network: 'fetch и работа с сетью',
  dom_events: 'DOM и события',
  error_handling: 'Обработка ошибок',
  es_modules: 'Модули ES6',
  map_set: 'Map и Set',
  iterators_generators: 'Итераторы и генераторы',
};

export const JS_SUBTOPIC_KEYS = Object.keys(JS_SUBTOPICS);

export function subtopicLabel(key: string): string {
  return JS_SUBTOPICS[key] ?? key;
}
