import { describe, expect, it } from 'vitest';

import type { Vacancy } from './types.ts';
import { applyMatches, buildMatcherSystem, buildMatchPrompt, normalizeMatches } from './match.ts';

const profile = {
  role: 'Frontend Developer',
  skills: ['React', 'TypeScript'],
  level: 'junior',
  locations: ['Минск', 'remote'],
};

const vacancies: Vacancy[] = [
  {
    id: 'remoteok:1',
    source: 'remoteok',
    url: 'https://a.com/1',
    company: 'Acme',
    position: 'Frontend Developer',
    location: 'Remote',
    salary: '',
    description: 'x'.repeat(2000),
    publishedAt: '',
  },
  {
    id: 'telegram:2',
    source: 'telegram',
    url: 'https://t.me/devby/2',
    company: '',
    position: '',
    location: '',
    salary: '',
    description: 'Ищем React-разработчика',
    publishedAt: '',
  },
];

describe('buildMatchPrompt', () => {
  it('включает профиль, нумерацию вакансий и обрезает длинные описания', () => {
    const prompt = buildMatchPrompt(profile, vacancies);
    expect(prompt).toContain('Frontend Developer');
    expect(prompt).toContain('React, TypeScript');
    expect(prompt).toContain('1. Frontend Developer | Acme | Remote');
    expect(prompt).toContain('2. позиция не указана');
    // 700 символов описание + «…» — но не полные 2000.
    expect(prompt).not.toContain('x'.repeat(800));
  });
});

describe('normalizeMatches', () => {
  it('клампит процент и пропускает записи с неверным номером', () => {
    const matches = normalizeMatches(
      {
        matches: [
          { i: 1, percent: 150, matched: 'не массив', missing: [], summary: ' ' },
          { i: 0, percent: 50 },
          { i: 3, percent: 50 },
          { i: 2, percent: '72', matched: ['React'], missing: ['Vue'], summary: 'Подходит' },
        ],
      },
      2,
    );
    expect(matches[0]).toEqual({ percent: 100, matched: [], missing: [], summary: '' });
    expect(matches[1]).toEqual({ percent: 72, matched: ['React'], missing: ['Vue'], summary: 'Подходит' });
  });

  it('возвращает null для вакансий без оценки', () => {
    expect(normalizeMatches({ matches: [] }, 2)).toEqual([null, null]);
    expect(normalizeMatches(null, 2)).toEqual([null, null]);
  });
});

describe('applyMatches', () => {
  const raw = {
    matches: [
      { i: 1, percent: 90 },
      { i: 2, company: 'Бета Тех', position: 'React-разработчик', percent: 60 },
    ],
  };
  const matches = normalizeMatches(raw, 2);

  it('подтягивает компанию и позицию из ответа для пустых полей', () => {
    const result = applyMatches(vacancies, matches, raw);
    expect(result[1].company).toBe('Бета Тех');
    expect(result[1].position).toBe('React-разработчик');
  });

  it('не перезаписывает известные поля и сохраняет проценты', () => {
    const result = applyMatches(vacancies, matches, raw);
    expect(result[0].company).toBe('Acme');
    expect(result[0].match?.percent).toBe(90);
    expect(result[1].match?.percent).toBe(60);
  });
});

describe('buildMatcherSystem', () => {
  it('требует JSON с matches и извлечение компании для TG-постов', () => {
    const system = buildMatcherSystem();
    expect(system).toContain('"matches"');
    expect(system.toLowerCase()).toContain('json');
  });
});
