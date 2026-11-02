/**
 * Адаптер Telegram-каналов: публичное превью t.me/s/<канал> отдаёт HTML,
 * в котором каждый пост лежит в блоке с атрибутом data-post="<канал>/<id>".
 * Одна страница ≈ 20 постов; пагинация (?before=) в MVP не используется.
 */

import type { Vacancy } from './types.ts';
import { shortHash, stripHtml, truncate } from './text.ts';

const VACANCY_HINTS = /вакан|vacanc|hiring|ищ[её]м\s|looking\s+for|\bjobs?\b|позиция| Junior| Middle| Senior| Frontend| Backend| Fullstack| React| Vue| Angular| Node\.js| TypeScript| JavaScript| Python| QA| DevOps| Designer| Product Manager| Data| Analyst/i;
const MIN_POST_LENGTH = 120;
const MAX_DESCRIPTION = 2000;

interface PostSegment {
  postId: string;
  html: string;
}

/** Разбивает страницу на сегменты постов по атрибуту data-post. */
function splitPosts(html: string): PostSegment[] {
  const marker = 'data-post="';
  const segments: PostSegment[] = [];
  let cursor = html.indexOf(marker);
  while (cursor !== -1) {
    const idStart = cursor + marker.length;
    const idEnd = html.indexOf('"', idStart);
    if (idEnd === -1) break;
    const next = html.indexOf(marker, idEnd);
    segments.push({ postId: html.slice(idStart, idEnd), html: html.slice(idEnd, next === -1 ? html.length : next) });
    cursor = next;
  }
  return segments;
}

function extractText(segmentHtml: string): string {
  const match = segmentHtml.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!match) return '';
  // Блоки «комментарии выключены» и служебные посты без текста пропускаем.
  return stripHtml(match[1]);
}

function extractDate(segmentHtml: string): string {
  const match = segmentHtml.match(/<time[^>]+datetime="([^"]+)"/);
  if (!match) return '';
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Достаёт из HTML-превью канала вакансии.
 * Позицию и компанию не парсим регэкспами — их извлечёт Gemini на этапе матчинга.
 */
export function parseTelegramHtml(html: string, channel: string): Vacancy[] {
  const vacancies: Vacancy[] = [];
  const prefix = `${channel}/`;
  for (const segment of splitPosts(html)) {
    const text = extractText(segment.html);
    if (text.length < MIN_POST_LENGTH) continue;
    if (!VACANCY_HINTS.test(text)) continue;
    if (!segment.postId.startsWith(prefix)) continue;

    const url = `https://t.me/${segment.postId}`;
        vacancies.push({
          id: `telegram:${shortHash(url)}`,
          source: 'telegram',
          channel,
          url,
      company: '',
      position: '',
      location: '',
      salary: '',
      description: truncate(text, MAX_DESCRIPTION),
      publishedAt: extractDate(segment.html),
    });
  }
  // Превью отдаёт посты от новых к старым; пропущенные фильтром не меняют порядок.
  return vacancies;
}
