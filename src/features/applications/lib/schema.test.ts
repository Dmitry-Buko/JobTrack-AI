import { describe, expect, it } from 'vitest';

import { applicationFormSchema, formValuesToInsert, EMPTY_APPLICATION_FORM } from './schema';

describe('applicationFormSchema', () => {
  it('принимает корректные значения', () => {
    const result = applicationFormSchema.safeParse({
      ...EMPTY_APPLICATION_FORM,
      company: '  Яндекс  ',
      position: 'Frontend',
    });
    expect(result.success).toBe(true);
  });

  it('требует компанию и должность', () => {
    const result = applicationFormSchema.safeParse(EMPTY_APPLICATION_FORM);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('company');
      expect(paths).toContain('position');
    }
  });

  it('отклоняет некорректный URL', () => {
    const result = applicationFormSchema.safeParse({
      ...EMPTY_APPLICATION_FORM,
      company: 'Яндекс',
      position: 'Frontend',
      url: 'не-ссылка',
    });
    expect(result.success).toBe(false);
  });

  it('ловит salary_min > salary_max', () => {
    const result = applicationFormSchema.safeParse({
      ...EMPTY_APPLICATION_FORM,
      company: 'Яндекс',
      position: 'Frontend',
      salary_min: '200000',
      salary_max: '100000',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('salary_min');
    }
  });
});

describe('formValuesToInsert', () => {
  it('пустые строки превращает в null', () => {
    const insert = formValuesToInsert({
      ...EMPTY_APPLICATION_FORM,
      company: 'Яндекс',
      position: 'Frontend',
    });
    expect(insert.url).toBeNull();
    expect(insert.description).toBeNull();
    expect(insert.salary_min).toBeNull();
    expect(insert.applied_at).toBeNull();
    expect(insert.company).toBe('Яндекс');
  });

  it('зарплаты конвертирует в числа', () => {
    const insert = formValuesToInsert({
      ...EMPTY_APPLICATION_FORM,
      company: 'Яндекс',
      position: 'Frontend',
      salary_min: '100000',
      salary_max: '150000',
      applied_at: '2026-03-01',
    });
    expect(insert.salary_min).toBe(100000);
    expect(insert.salary_max).toBe(150000);
    expect(insert.applied_at).toBe('2026-03-01');
  });
});
