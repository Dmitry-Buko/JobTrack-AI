-- Вакансии и история AI-анализов требований (ТЗ 4.3, 5.6, 7).

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company text not null,
  position text not null,
  url text,
  description text,
  location text,
  work_format text check (work_format in ('office', 'remote', 'hybrid')),
  salary_min numeric check (salary_min >= 0),
  salary_max numeric check (salary_max >= 0),
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'screening', 'interview', 'test_task', 'offer', 'rejected')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  applied_at date,
  next_action_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_user_id_idx on public.applications (user_id);
create index applications_status_idx on public.applications (user_id, status);
create index applications_created_at_idx on public.applications (user_id, created_at desc);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- Результаты AI-анализа вакансии с датой (просмотр истории прошлых анализов).
create table public.application_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  -- Строго типизированный jsonb; формат описан в src/types/job-analysis.ts
  -- и валидируется zod-схемой на клиенте.
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index application_analyses_application_idx on public.application_analyses (application_id, created_at desc);

alter table public.applications enable row level security;

create policy applications_select_own on public.applications
  for select using (auth.uid() = user_id);
create policy applications_insert_own on public.applications
  for insert with check (auth.uid() = user_id);
create policy applications_update_own on public.applications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy applications_delete_own on public.applications
  for delete using (auth.uid() = user_id);

alter table public.application_analyses enable row level security;

create policy application_analyses_select_own on public.application_analyses
  for select using (auth.uid() = user_id);
create policy application_analyses_insert_own on public.application_analyses
  for insert with check (auth.uid() = user_id);
