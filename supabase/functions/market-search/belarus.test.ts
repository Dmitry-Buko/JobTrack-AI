import { describe, expect, it } from 'vitest';

import { BELARUS_CHANNELS, isBelarusVacancy } from './belarus.ts';
import type { Vacancy } from './types.ts';

function vacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return {
    id: 'test:1',
    source: 'remoteok',
    url: 'https://example.com/job/1',
    company: 'Acme',
    position: 'Frontend Developer',
    location: 'Remote',
    salary: '',
    description: 'We are looking for a frontend developer to join our team.',
    publishedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isBelarusVacancy', () => {
  it('пропускает вакансии с белорусской географией в любом поле', () => {
    expect(isBelarusVacancy(vacancy({ location: 'Minsk, Belarus' }))).toBe(true);
    expect(isBelarusVacancy(vacancy({ description: 'Офис в Гомеле, гибрид.' }))).toBe(true);
    expect(isBelarusVacancy(vacancy({ company: 'Wargaming', position: 'Game Developer (Минск)' }))).toBe(true);
    expect(isBelarusVacancy(vacancy({ description: 'Удалённо из РБ, белорусская компания.' }))).toBe(true);
  });

  it('отсекает worldwide-remote и другие страны', () => {
    expect(isBelarusVacancy(vacancy())).toBe(false);
    expect(isBelarusVacancy(vacancy({ location: 'Remote (Worldwide)' }))).toBe(false);
    expect(isBelarusVacancy(vacancy({ location: 'Berlin, Germany' }))).toBe(false);
    expect(isBelarusVacancy(vacancy({ description: 'Office in Warsaw, relocation to Poland.' }))).toBe(false);
  });

  it('не путает РБ с обычными словами', () => {
    expect(isBelarusVacancy(vacancy({ description: 'Работа с рбд и табличными базами данных.' }))).toBe(false);
    expect(isBelarusVacancy(vacancy({ description: 'Москва, команда разработки рбк-медиа.' }))).toBe(false);
  });

  it('доверяет белорусским TG-каналам без текстовой проверки', () => {
    expect(
      isBelarusVacancy(
        vacancy({ source: 'telegram', channel: 'devby', description: 'Ищем разработчика, удалённо.' }),
      ),
    ).toBe(true);
    expect(BELARUS_CHANNELS.has('devby')).toBe(true);
  });

  it('проверяет текстом посты остальных TG-каналов', () => {
    const post = { source: 'telegram' as const, channel: 'remotejobs' };
    expect(isBelarusVacancy(vacancy({ ...post, description: 'Hiring React dev, office in Minsk.' }))).toBe(true);
    expect(isBelarusVacancy(vacancy({ ...post, description: 'Hiring React dev anywhere in Europe.' }))).toBe(false);
  });
});
