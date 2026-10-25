import { describe, expect, it } from 'vitest';

import type { Application } from '@/types/application';

import { filterApplications, sortApplications, DEFAULT_FILTERS } from './filters';

function makeApplication(overrides: Partial<Application>): Application {
  return {
    id: 'id-1',
    user_id: 'user-1',
    company: 'Яндекс',
    position: 'Frontend-разработчик',
    url: null,
    description: null,
    location: null,
    work_format: null,
    salary_min: null,
    salary_max: null,
    status: 'saved',
    priority: 'medium',
    applied_at: null,
    next_action_at: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

const applications = [
  makeApplication({ id: '1', company: 'Яндекс', position: 'Frontend', status: 'saved', priority: 'high', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' }),
  makeApplication({ id: '2', company: 'Ozon', position: 'React-разработчик', status: 'interview', priority: 'low', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' }),
  makeApplication({ id: '3', company: 'Т-Банк', position: 'Middle Frontend', status: 'offer', priority: 'medium', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z' }),
];

describe('filterApplications', () => {
  it('без фильтров возвращает всё', () => {
    expect(filterApplications(applications, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it('ищет по компании и должности без учёта регистра', () => {
    const byCompany = filterApplications(applications, { ...DEFAULT_FILTERS, search: 'ozon' });
    expect(byCompany).toHaveLength(1);
    expect(byCompany[0].id).toBe('2');

    const byPosition = filterApplications(applications, { ...DEFAULT_FILTERS, search: 'react' });
    expect(byPosition).toHaveLength(1);
    expect(byPosition[0].id).toBe('2');
  });

  it('фильтрует по статусу и приоритету', () => {
    expect(filterApplications(applications, { ...DEFAULT_FILTERS, status: 'offer' })).toHaveLength(1);
    expect(filterApplications(applications, { ...DEFAULT_FILTERS, priority: 'high' })).toHaveLength(1);
  });
});

describe('sortApplications', () => {
  it('сортирует по последнему изменению (новые сверху)', () => {
    const sorted = sortApplications(applications, 'updated_desc');
    expect(sorted.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('сортирует по дате создания (новые сверху)', () => {
    const sorted = sortApplications(applications, 'created_desc');
    expect(sorted.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('по ближайшему действию: без даты — в конец', () => {
    const withDates = [
      makeApplication({ id: 'later', next_action_at: '2026-06-02' }),
      makeApplication({ id: 'sooner', next_action_at: '2026-06-01' }),
      makeApplication({ id: 'nodate', next_action_at: null }),
    ];
    const sorted = sortApplications(withDates, 'next_action_asc');
    expect(sorted.map((item) => item.id)).toEqual(['sooner', 'later', 'nodate']);
  });
});
