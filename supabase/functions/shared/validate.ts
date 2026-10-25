import { z } from 'npm:zod@3';

import { jsonError } from './cors.ts';

export const MAX_TEXT_LENGTH = 8000;

/** Урезает длинные пользовательские данные до безопасного лимита. */
export function clampText(value: string, max = MAX_TEXT_LENGTH): string {
  return value.length > max ? value.slice(0, max) : value;
}

export type BodyResult<T> = { data: T } | { error: Response };

export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<BodyResult<T>> {
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
