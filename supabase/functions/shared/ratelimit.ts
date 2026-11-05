import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_LIMIT_PER_HOUR = 60;

export type RateLimitResult = 'ok' | 'limited' | 'error';

/**
 * Ограничение частоты AI-запросов на пользователя. Лимит у каждой функции
 * свой (60/час по умолчанию, переопределяется env AI_RATE_LIMIT_PER_HOUR).
 *
 * Атомарность гарантирует RPC public.consume_ai_quota (миграция 0006):
 * подсчёт записей за час и вставка новой выполняются в одной транзакции
 * под advisory-локом, поэтому параллельные запросы не обходят лимит.
 *
 * 'error' означает, что RPC недоступен: вызывающая сторона обязана
 * ответить 503 (fail-closed), а не пропускать запрос мимо лимита.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  functionName: string,
): Promise<RateLimitResult> {
  const limit = Number(Deno.env.get('AI_RATE_LIMIT_PER_HOUR'));
  const perHour = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT_PER_HOUR;

  const { data, error } = await supabase.rpc('consume_ai_quota', {
    p_function: functionName,
    p_limit: perHour,
  });

  if (error) {
    console.error(`consume_ai_quota failed (${functionName}):`, error.message);
    return 'error';
  }
  return data === true ? 'ok' : 'limited';
}
