-- Профили пользователей и навыки (ТЗ, раздел 7).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  target_role text,
  experience_level text,
  experience_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  self_assessed_level integer not null default 3 check (self_assessed_level between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index profile_skills_user_id_idx on public.profile_skills (user_id);

-- Общий триггер поддержки updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger profile_skills_set_updated_at
  before update on public.profile_skills
  for each row execute function public.set_updated_at();

-- Автосоздание профиля при регистрации через Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: пользователь работает только со своим профилем и навыками.
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

alter table public.profile_skills enable row level security;

create policy profile_skills_select_own on public.profile_skills
  for select using (auth.uid() = user_id);
create policy profile_skills_insert_own on public.profile_skills
  for insert with check (auth.uid() = user_id);
create policy profile_skills_update_own on public.profile_skills
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profile_skills_delete_own on public.profile_skills
  for delete using (auth.uid() = user_id);
