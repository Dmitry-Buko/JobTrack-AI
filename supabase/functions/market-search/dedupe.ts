/**
 * Дедупликация вакансий из разных источников.
 * Ключ — нормализованные токены «компания + позиция»; у Telegram-постов,
 * где компания неизвестна до AI-извлечения, ключом служит ссылка.
 * Похожие, но не идентичные ключи схлопываются по Jaccard ≥ 0.8
 * (проще и дешевле, чем отдельный fuzzy-запрос к Gemini).
 */

import type { Vacancy } from './types.ts';

const JACCARD_THRESHOLD = 0.8;

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .filter((word) => word.length >= 2 && !STOP_WORDS.has(word)),
  );
}

const STOP_WORDS = new Set(['the', 'and', 'for', 'inc', 'llc', 'ltd', 'remote', 'Fully']);

function vacancyKeyTokens(vacancy: Vacancy): Set<string> | null {
  if (!vacancy.company || !vacancy.position) return null;
  const tokens = tokenize(`${vacancy.company} ${vacancy.position}`);
  return tokens.size >= 2 ? tokens : null;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Насколько вакансия «полезнее» другой: у кого больше данных — тот и остаётся. */
function informativeness(vacancy: Vacancy): number {
  return (
    (vacancy.company ? 2 : 0) +
    (vacancy.salary ? 1 : 0) +
    (vacancy.publishedAt ? 1 : 0) +
    Math.min(vacancy.description.length / 500, 4)
  );
}

export function dedupeVacancies(vacancies: Vacancy[]): Vacancy[] {
  const kept: Vacancy[] = [];
  const keptKeys: (Set<string> | null)[] = [];

  for (const vacancy of vacancies) {
    const key = vacancyKeyTokens(vacancy);
    let duplicateOf = -1;

    for (let i = 0; i < kept.length; i += 1) {
      if (key && keptKeys[i]) {
        if (jaccard(key, keptKeys[i]) >= JACCARD_THRESHOLD) {
          duplicateOf = i;
          break;
        }
      } else if (kept[i].url === vacancy.url) {
        duplicateOf = i;
        break;
      }
    }

    if (duplicateOf === -1) {
      kept.push(vacancy);
      keptKeys.push(key);
      continue;
    }

    // Оставляем более информативную запись; порядок (свежесть) сохраняем по оставшейся.
    if (informativeness(vacancy) > informativeness(kept[duplicateOf])) {
      kept[duplicateOf] = vacancy;
      keptKeys[duplicateOf] = key;
    }
  }

  return kept;
}
