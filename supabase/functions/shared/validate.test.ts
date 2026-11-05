import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { z } from 'zod';

import { clampText, clampedString, parseBody } from './validate.ts';

describe('clampText', () => {
  it('не трогает текст в пределах лимита', () => {
    expect(clampText('привет')).toBe('привет');
    expect(clampText('a'.repeat(8000))).toBe('a'.repeat(8000));
  });

  it('обрезает сверхдлинный текст до лимита по умолчанию', () => {
    expect(clampText('a'.repeat(9000))).toHaveLength(8000);
  });

  it('принимает собственный лимит', () => {
    expect(clampText('abcdef', 3)).toBe('abc');
  });
});

describe('clampedString', () => {
  it('обрезает сверхдлинный текст ещё до валидации (диктовка не роняет запрос 400)', () => {
    const schema = clampedString(100);
    const parsed = schema.safeParse('x'.repeat(5000));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toHaveLength(100);
  });

  it('сохраняет min-проверку для коротких строк', () => {
    const schema = clampedString(10, { min: 2 });
    expect(schema.safeParse('a').success).toBe(false);
    expect(schema.safeParse('ab').success).toBe(true);
  });

  it('отбивает не-строки базовой схемой', () => {
    const schema = clampedString(10);
    expect(schema.safeParse(42).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });
});

describe('parseBody', () => {
  const schema = z.object({ topic: z.string().min(2) });

  it('возвращает data для валидного JSON', async () => {
    const req = new Request('https://example.com/fn', {
      method: 'POST',
      body: '{"topic":"react"}',
    });
    const result = await parseBody(req, schema);
    expect('error' in result).toBe(false);
    if (!('error' in result)) expect(result.data.topic).toBe('react');
  });

  it('возвращает 400 для не-JSON тела', async () => {
    const req = new Request('https://example.com/fn', {
      method: 'POST',
      body: 'не json',
    });
    const result = await parseBody(req, schema);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(400);
      const payload = JSON.parse(await result.error.text());
      expect(payload.error).toContain('JSON');
    }
  });

  it('возвращает 400 с путём до поля при провале схемы', async () => {
    const req = new Request('https://example.com/fn', {
      method: 'POST',
      body: '{"topic":""}',
    });
    const result = await parseBody(req, schema);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.status).toBe(400);
      const payload = JSON.parse(await result.error.text());
      expect(payload.error).toContain('topic');
    }
  });
});
