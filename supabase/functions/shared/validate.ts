import { z } from 'zod';

import { jsonError } from './cors.ts';

export const MAX_TEXT_LENGTH = 8000;

/** Урезает длинные пользовательские данные до безопасного лимита. */
export function clampText(value: string, max = MAX_TEXT_LENGTH): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Строка, которая обрезается до max ещё ДО валидации: сверхдлинный
 * пользовательский текст (например, голосовая диктовка) не должен
 * ронять запрос 400-й ошибкой схемы.
 *
 * Явный тип возврата важен: без него вывод типа z.preprocess
 * деградирует до unknown в consumer'ах (deno check).
 */
export function clampedString(
  max: number,
  options: { min?: number } = {},
): z.ZodType<string, z.ZodTypeDef, unknown> {
  const base = options.min != null ? z.string().min(options.min).max(max) : z.string().max(max);
  return z.preprocess(
    (value) => (typeof value === 'string' ? clampText(value, max) : value),
    base,
  );
}

export type BodyResult<T> = { data: T } | { error: Response };

export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<BodyResult<z.output<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: jsonError(400, 'Некорректное тело запроса: ожидается JSON.') };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: jsonError(400, `Некорректные параметры запроса${issue ? `: ${issue.path.join('.') || 'тело'} — ${issue.message}` : ''}.`),
    };
  }

  return { data: parsed.data };
}
