import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

import { parseRemoteOkJson } from './remoteok.ts';

describe('parseRemoteOkJson', () => {
  it('пропускает служебную запись legal и маппит поля', () => {
    const vacancies = parseRemoteOkJson([
      { legal: 'Terms', slug: 'legal' },
      {
        position: 'Frontend Developer',
        company: 'Acme',
        url: 'https://remoteok.com/remote-jobs/123-frontend',
        location: 'Worldwide',
        salary_min: 60000,
        salary_max: 90000,
        date: '2026-11-01T10:00:00-05:00',
        description: '<p>React &amp; TypeScript</p><ul><li>Remote-first</li></ul>',
        tags: ['react'],
      },
    ]);

    expect(vacancies).toHaveLength(1);
    expect(vacancies[0]).toMatchObject({
      source: 'remoteok',
      company: 'Acme',
      position: 'Frontend Developer',
      location: 'Worldwide',
      salary: '$60k–$90k',
      description: 'React & TypeScript\n• Remote-first',
      publishedAt: '2026-11-01T15:00:00.000Z',
    });
    expect(vacancies[0].id).toMatch(/^remoteok:/);
  });

  it('не ломается на записях без обязательных полей', () => {
    expect(parseRemoteOkJson([null, { position: 'No company' }, 'junk'])).toHaveLength(0);
  });

  it('чинит битые даты и отсутствующую локацию', () => {
    const [vacancy] = parseRemoteOkJson([
      {
        position: 'DevOps',
        company: 'Beta',
        url: 'https://remoteok.com/remote-jobs/9',
        date: 'not-a-date',
      },
    ]);
    expect(vacancy.publishedAt).toBe('');
    expect(vacancy.location).toBe('Remote');
    expect(vacancy.salary).toBe('');
  });

  it('не показывает зарплату из нулей (salary_min=0)', () => {
    const [vacancy] = parseRemoteOkJson([
      {
        position: 'Dev',
        company: 'Gamma',
        url: 'https://remoteok.com/remote-jobs/10',
        salary_min: 0,
        salary_max: 0,
      },
    ]);
    expect(vacancy.salary).toBe('');
  });
});
