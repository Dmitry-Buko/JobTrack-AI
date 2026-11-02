/**
 * Текстовые утилиты парсинга: чистые функции без зависимостей,
 * чтобы их можно было тестировать через vitest и переиспользовать в Deno.
 */

const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&laquo;': '«',
  '&raquo;': '»',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&nbsp': ' ',
};

/**
 * RemoteOK иногда присылает уже «поломанный» UTF-8 (en-dash как â€“ и т.п.) —
 * чиним типовые mojibake-последовательности до нормальных символов.
 */
const MOJIBAKE: Array<[RegExp, string]> = [
  [/\u00e2\u20ac\u201c/g, '–'],
  [/\u00e2\u20ac\u201d/g, '—'],
  [/\u00e2\u20ac\u2122|\u00e2\u20ac\u02d9/g, '’'],
  [/\u00e2\u20ac\u0153/g, '“'],
  [/\u00e2\u20ac\u009d/g, '”'],
  [/\u00e2\u20ac\u00a6/g, '…'],
  [/\u00c2\u00a0/g, ' '],
];

export function decodeEntities(text: string): string {
  let result = text
    .replace(/&#(\d+);/g, (_, code: string) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return '';
      }
    })
    .replace(/&[a-z]+;?/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity);
  for (const [pattern, replacement] of MOJIBAKE) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** HTML → обычный текст: <br> и закрывающие блочные теги становятся переносами строк. */
export function stripHtml(html: string): string {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  );
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Обрезает текст до max символов, добавляя многоточие на границе слова. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Короткий стабильный хеш (FNV-1a, base36) — для идентификаторов вакансий. */
export function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
