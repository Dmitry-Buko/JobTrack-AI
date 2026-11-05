/**
 * Гео-фильтр: приложение ищет работу в Республике Беларусь
 * (плюс TG-каналы из GEO_TRUSTED_CHANNELS — их постам доверяем без проверки).
 * Остальные вакансии проходят текстовый фильтр по маркерам страны и городов.
 */

import type { Vacancy } from './types.ts';

/**
 * TG-каналы, которым доверяем гео без текстовой проверки:
 * devby — вакансии Беларуси; vacancy_it_ulbitv — RU-подборки,
 * добавлены по решению пользователя (гео-фильтр их не отсекает).
 */
export const GEO_TRUSTED_CHANNELS = new Set(['devby', 'vacancy_it_ulbitv']);

/**
 * Страна (ru/en), типовое сокращение и города Беларуси.
 * Для «РБ» границы слов заданы явно: \b в JS не работает с кириллицей.
 */
const BELARUS_MARKERS =
  /беларус|белорус|belarus|минск|minsk|(?:^|[^а-яёa-z])рб(?![а-яёa-z])|гомел|homel|гродно|grodno|витебск|vitebsk|брест|brest|могил[её]в|mogilev|баранович|пинск|бобруйск|орш[ае]|(?:^|[^а-яёa-z])лида(?![а-яёa-z])|полоцк|новополоцк|солигорск|молодечно/i;

/** Проверяет, что вакансия проходит гео-фильтр (Беларусь или доверенный канал). */
export function isBelarusVacancy(vacancy: Vacancy): boolean {
  if (vacancy.source === 'telegram' && GEO_TRUSTED_CHANNELS.has(vacancy.channel ?? '')) {
    return true;
  }
  return BELARUS_MARKERS.test(
    `${vacancy.location} ${vacancy.position} ${vacancy.company} ${vacancy.description}`,
  );
}
