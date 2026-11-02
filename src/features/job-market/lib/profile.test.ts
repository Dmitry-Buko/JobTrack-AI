import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PROFILE,
  loadProfile,
  parseListInput,
  saveProfile,
  searchProfileSchema,
} from './profile';

describe('parseListInput', () => {
  it('режет по запятым, точкам с запятой и переносам строк', () => {
    expect(parseListInput('React, TypeScript; CSS\nVue')).toEqual([
      'React',
      'TypeScript',
      'CSS',
      'Vue',
    ]);
  });

  it('убирает дубли без учёта регистра и пустые части', () => {
    expect(parseListInput('react, React,, REACT, vue')).toEqual(['react', 'vue']);
  });

  it('ограничивает список 30 значениями', () => {
    expect(parseListInput(Array.from({ length: 40 }, (_, i) => `s${i}`).join(','))).toHaveLength(30);
  });
});

describe('searchProfileSchema', () => {
  it('требует роль минимум из 2 символов', () => {
    expect(searchProfileSchema.safeParse({ ...DEFAULT_PROFILE, role: 'F' }).success).toBe(false);
    expect(
      searchProfileSchema.safeParse({ ...DEFAULT_PROFILE, role: 'Frontend Developer' }).success,
    ).toBe(true);
  });

  it('принимает валидный уровень и навыки', () => {
    const parsed = searchProfileSchema.safeParse({
      role: 'Frontend Developer',
      skills: ['React', 'TypeScript'],
      level: 'junior_plus',
      locations: ['Минск'],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('профиль в localStorage', () => {
  afterEach(() => localStorage.clear());

  it('сохраняется и читается обратно', () => {
    const profile = { role: 'Backend Dev', skills: ['Node.js'], level: 'middle' as const, locations: [] };
    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it('битые данные откатываются к дефолту', () => {
    localStorage.setItem('job-market:profile', '{"role": 123}');
    expect(loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});
