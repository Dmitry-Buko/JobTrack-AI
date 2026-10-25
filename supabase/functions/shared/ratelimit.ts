import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const DEFAULT_LIMIT_PER_HOUR = 60;

/**
 * Ограничение частоты AI-запросов на пользователя (по таблице ai_usage).
 * Возвращает false, когда лимит превышен. Ошибка учёта не блокирует пользователя.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
): Promise<boolean> {
  const limit = Number(Deno.env.get('AI_RATE_LIMIT_PER_HOUR'));
  const perHour = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT_PER_HOUR;
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const { count, error } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('function_name', functionName)
    .gte('created_at', oneHourAgo);

  if (error) return true;
  if ((count ?? 0) >= perHour) return false;

  await supabase.from('ai_usage').insert({ user_id: userId, function_name: functionName });
  return true;
}
