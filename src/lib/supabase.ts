import { createClient } from '@supabase/supabase-js';

import { env } from './env';

/**
 * Единый клиент Supabase. Когда .env не настроен, клиент создаётся с
 * заглушкой — приложение при этом показывает экран настройки (см. App),
 * и реальных запросов не происходит.
 */
export const supabase = createClient(
  env?.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  env?.VITE_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
    },
  },
);
