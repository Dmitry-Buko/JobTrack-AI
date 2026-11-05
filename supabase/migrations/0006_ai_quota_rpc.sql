-- Атомарный rate limit AI-функций (ранее count и insert выполнялись
-- раздельно в ratelimit.ts, и параллельные запросы обходили лимит).

-- Под запрос RPC: счёт записей конкретной функции пользователя за час.
create index ai_usage_user_function_idx
  on public.ai_usage (user_id, function_name, created_at desc);

/**
 * Атомарно списывает квоту AI-запроса: в одной транзакции считает записи
 * пользователя за последний час и вставляет новую, если лимит не исчерпан.
 * Advisory-лок по (пользователь, функция) защищает от гонки параллельных
 * запросов. Работает от имени вызывающего JWT (security invoker):
 * RLS-политики ai_usage (select/insert own) пропускают только свои записи.
 */
create or replace function public.consume_ai_quota(p_function text, p_limit int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int;
begin
  if v_user is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text || ' ' || p_function));

  select count(*) into v_count
  from public.ai_usage
  where user_id = v_user
    and function_name = p_function
    and created_at >= now() - interval '1 hour';

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.ai_usage (user_id, function_name)
  values (v_user, p_function);

  return true;
end;
$$;

-- Вызывается только через RPC аутентифицированными клиентами.
revoke execute on function public.consume_ai_quota(text, int) from anon;

/**
 * Очистка старых записей ai_usage (таблица росла бесконечно).
 * security definer: у пользователей нет delete-политики на ai_usage,
 * удалять может только привилегированный запуск (pg_cron / SQL Editor).
 */
create or replace function public.cleanup_ai_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_usage
  where created_at < now() - interval '24 hours';
end;
$$;

revoke execute on function public.cleanup_ai_usage() from public, anon, authenticated;

-- Ежедневная очистка в 03:17 UTC, если расширение pg_cron доступно
-- в проекте. Если нет — запускайте вручную (см. README, раздел про лимиты).
do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron недоступен: очистку ai_usage выполняйте вручную (см. README).';
end
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-ai-usage',
      '17 3 * * *',
      $job$ select public.cleanup_ai_usage(); $job$
    );
  end if;
end
$$;
