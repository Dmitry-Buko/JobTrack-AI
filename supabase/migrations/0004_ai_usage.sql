-- Учёт AI-запросов для рейт-лимитинга Edge Functions (ТЗ 5.7).

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  function_name text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

-- Пользователь читает и пишет только собственные записи: Edge Functions
-- работают с этим JWT и считают частоту запросов за последний час.
create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);
create policy ai_usage_insert_own on public.ai_usage
  for insert with check (auth.uid() = user_id);
