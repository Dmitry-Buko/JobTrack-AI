import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

import type { Vacancy } from './types.ts';
import { dedupeVacancies } from './dedupe.ts';

function make(partial: Partial<Vacancy> & { url: string; source: Vacancy['source'] }): Vacancy {
  return {
    id: `${partial.source}:${partial.url}`,
    company: 'Acme',
    position: 'Frontend Developer',
    location: 'Remote',
    salary: '',
    description: 'React TypeScript CSS',
    publishedAt: '2026-11-01T00:00:00.000Z',
    ...partial,
  };
}

describe('dedupeVacancies', () => {
  it('схлопывает точные дубли между источниками', () => {
    const result = dedupeVacancies([
      make({ source: 'remoteok', url: 'https://a.com/1' }),
      make({ source: 'wwr', url: 'https://b.com/2' }),
    ]);
    expect(result).toHaveLength(1);
  });

  it('оставляет более информативную запись (с зарплатой)', () => {
    const result = dedupeVacancies([
      make({ source: 'wwr', url: 'https://b.com/2' }),
      make({ source: 'remoteok', url: 'https://a.com/1', salary: '$60k–$90k' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://a.com/1');
  });

  it('схлопывает похожие ключи по Jaccard ≥ 0.8', () => {
    // {acme, corp, software, frontend, developer} vs {acme, corp, frontend, developer} → 0.8
    const result = dedupeVacancies([
      make({ source: 'remoteok', url: 'https://a.com/1', company: 'Acme Corp Software' }),
      make({ source: 'wwr', url: 'https://b.com/2', company: 'Acme Corp' }),
    ]);
    expect(result).toHaveLength(1);
  });

  it('не схлопывает разные позиции одной компании', () => {
    const result = dedupeVacancies([
      make({ source: 'remoteok', url: 'https://a.com/1', position: 'Frontend Developer' }),
      make({ source: 'wwr', url: 'https://b.com/2', position: 'Backend Developer' }),
    ]);
    expect(result).toHaveLength(2);
  });

  it('Telegram-посты без компании дедуплицируются по ссылке', () => {
    const tg = (url: string): Vacancy =>
      make({ source: 'telegram', url, company: '', position: '', description: 'пост' });
    const result = dedupeVacancies([tg('https://t.me/devby/100'), tg('https://t.me/devby/100')]);
    expect(result).toHaveLength(1);
  });
});
