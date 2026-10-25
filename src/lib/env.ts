import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL должен быть корректным URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY не задан'),
});

const parsed = envSchema.safeParse(import.meta.env);

/** Валидированные публичные переменные окружения или null, если .env не настроен. */
export const env = parsed.success ? parsed.data : null;

export const ENV_ERROR_MESSAGE =
  'Приложение не настроено: скопируйте .env.example в .env и укажите адрес и анонимный ключ вашего проекта Supabase. Инструкция — в README.';
