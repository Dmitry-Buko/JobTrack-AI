/**
 * Адаптер WeWorkRemotely: RSS-лента категории (например, remote-programming-jobs).
 * <item> не бывают вложенными, поэтому достаточно аккуратных регэкспов
 * с поддержкой CDATA — без XML-парсера и зависимостей.
 */

import type { Vacancy } from './types.ts';
import { decodeEntities, isHttpUrl, shortHash, stripHtml, truncate } from './text.ts';

const MAX_DESCRIPTION = 2000;

function tagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return '';
  let value = match[1];
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1];
  return decodeEntities(value).trim();
}

/** Заголовок WWR: «Компания: Позиция (Регион)» — режет по первому двоеточию. */
function parseTitle(title: string): { company: string; position: string; location: string } {
  const colon = title.indexOf(':');
  const company = colon > 0 ? title.slice(0, colon).trim() : '';
  let rest = colon > 0 ? title.slice(colon + 1).trim() : title;
  let location = '';
  // Хвост в скобках — регион («Anywhere», «Americas» и т.п.).
  const region = rest.match(/\s*\(([^)]+)\)\s*$/);
  if (region) {
    location = region[1].trim();
    rest = rest.slice(0, region.index).trim();
  }
  return { company, position: rest, location };
}

function isoDate(rfc822: string): string {
  if (!rfc822) return '';
  const date = new Date(rfc822);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function parseWwrRss(xml: string): Vacancy[] {
  const vacancies: Vacancy[] = [];
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const title = tagValue(item, 'title');
    const url = tagValue(item, 'link');
    // Ссылка попадёт в <a href> на клиенте: пропускаем только http(s).
    if (!title || !isHttpUrl(url)) continue;

    const { company, position, location } = parseTitle(title);
    vacancies.push({
      id: `wwr:${shortHash(url)}`,
      source: 'wwr',
      url,
      company,
      position,
      location: location || 'Remote',
      salary: '',
      description: truncate(stripHtml(tagValue(item, 'description')), MAX_DESCRIPTION),
      publishedAt: isoDate(tagValue(item, 'pubDate')),
    });
  }
  return vacancies;
}
