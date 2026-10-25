import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { jsonError } from './cors.ts';

export interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Проверяет JWT пользователя из заголовка Authorization и возвращает клиент
 * Supabase, работающий от его имени (RLS продолжает защищать данные).
 */
export async function requireUser(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonError(401, 'Требуется авторизация. Войдите в аккаунт и повторите.');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return jsonError(401, 'Сессия недействительна. Войдите заново.');
  }

  return { supabase, userId: data.user.id };
}
