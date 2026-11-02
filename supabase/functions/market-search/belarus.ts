/**
 * Гео-фильтр: приложение ищет работу только в Республике Беларусь.
 * Посты белорусских TG-каналов (например, devby — портал о работе
 * в Беларуси) считаем релевантными по умолчанию; остальные вакансии
 * проходят текстовый фильтр по маркерам страны и городов.
 */

import type { Vacancy } from './types.ts';

/** TG-каналы, чьи вакансии по умолчанию относятся к Беларуси. */
export const BELARUS_CHANNELS = new Set(['devby']);

/**
 * Страна (ru/en), типовое сокращение и города Беларуси.
 * Для «РБ» границы слов заданы явно: \b в JS не работает с кириллицей.
 */
const BELARUS_MARKERS =
  /беларус|белорус|belarus|минск|minsk|(?:^|[^а-яёa-z])рб(?![а-яёa-z])|гомел|homel|гродно|grodno|витебск|vitebsk|брест|brest|могил[её]в|mogilev|баранович|пинск|бобруйск|орш[ае]|(?:^|[^а-яёa-z])лида(?![а-яёa-z])|полоцк|новополоцк|солигорск|молодечно/i;

/** Проверяет, что вакансия находится в Республике Беларусь. */
export function isBelarusVacancy(vacancy: Vacancy): boolean {
  if (vacancy.source === 'telegram' && BELARUS_CHANNELS.has(vacancy.channel ?? '')) {
    return true;
  }
  return BELARUS_MARKERS.test(
    `${vacancy.location} ${vacancy.position} ${vacancy.company} ${vacancy.description}`,
  );
}
