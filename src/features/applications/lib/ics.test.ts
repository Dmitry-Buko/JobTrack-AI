import { describe, expect, it } from 'vitest';

import type { Application } from '@/types/application';

import { buildApplicationIcs, escapeIcsText, foldIcsLine, icsFileName } from './ics';

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'user-1',
    company: 'Яндекс',
    position: 'Frontend-разработчик',
    url: 'https://example.com/vacancy?ref=mail&from=top',
    description: null,
    location: 'Москва',
    work_format: 'hybrid',
    salary_min: 200000,
    salary_max: 300000,
    status: 'applied',
    priority: 'high',
    applied_at: '2026-10-01',
    next_action_at: '2026-11-05',
    notes: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

describe('escapeIcsText', () => {
  it('экранирует ; , \\ и переводы строк', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });
});

describe('foldIcsLine', () => {
  it('не трогает короткие строки', () => {
    expect(foldIcsLine('SUMMARY:Короткая тема')).toBe('SUMMARY:Короткая тема');
  });

  it('режет длинные строки по 75 октетам с продолжением через пробел', () => {
    const long = `DESCRIPTION:${'Привет, мир! '.repeat(20)}`;
    const folded = foldIcsLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const [index, line] of lines.entries()) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      if (index > 0) expect(line.startsWith(' ')).toBe(true);
    }
  });
});

describe('buildApplicationIcs', () => {
  it('строит all-day событие из даты без времени (DTEND — следующий день)', () => {
    const ics = buildApplicationIcs(makeApplication());
    expect(ics).toContain('DTSTART;VALUE=DATE:20261105');
    expect(ics).toContain('DTEND;VALUE=DATE:20261106');
    expect(ics).toContain('SUMMARY:Follow-up: Яндекс — Frontend-разработчик');
    expect(ics).toContain('UID:11111111-2222-3333-4444-555555555555@jobtrack.ai');
  });

  it('дата со временем превращается в часовой слот в UTC', () => {
    const ics = buildApplicationIcs(makeApplication({ next_action_at: '2026-11-05T12:30:00+03:00' }));
    expect(ics).toContain('DTSTART:20261105T093000Z');
    expect(ics).toContain('DTEND:20261105T103000Z');
  });

  it('использует CRLF между строками', () => {
    const ics = buildApplicationIcs(makeApplication());
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('экранирует URL и включает заметки в описание', () => {
    const ics = buildApplicationIcs(
      makeApplication({ notes: 'Уточнить статус\nчерез неделю' }),
    );
    expect(ics).toContain('URL:https://example.com/vacancy?ref=mail&from=top');
    expect(ics).toContain('LOCATION:Москва');
    // Перенос строки в заметках превращается в литерал \n.
    // Длинные строки сфолджены — для проверки разворачиваем продолжения.
    const unfolded = ics.split('\r\n ').join('');
    expect(unfolded).toContain('Заметки: Уточнить статус\\nчерез неделю');
  });

  it('бросает ошибку без даты следующего действия', () => {
    expect(() => buildApplicationIcs(makeApplication({ next_action_at: null }))).toThrow();
  });
});

describe('icsFileName', () => {
  it('делает безопасный slug из компании и должности', () => {
    expect(icsFileName('ООО «Ромашка»', 'Frontend / React')).toBe(
      'followup-ооо-ромашка-frontend-react.ics',
    );
  });

  it('подставляет запасное имя для пустой строки', () => {
    expect(icsFileName('   ', '   ')).toBe('followup-jobtrack.ics');
  });
});
