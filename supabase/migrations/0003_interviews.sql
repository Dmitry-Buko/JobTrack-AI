-- Тренировки AI Interview Coach и сообщения диалогов (ТЗ 5, 6, 7).

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  mode text not null check (mode in ('text', 'voice')),
  topic text not null
    check (topic in ('javascript', 'typescript', 'react', 'redux_toolkit', 'html_css', 'browser_apis', 'networking', 'mixed')),
  difficulty text not null check (difficulty in ('junior', 'junior_plus', 'middle')),
  language text not null check (language in ('ru', 'en')),
  status text not null default 'active' check (status in ('active', 'completed', 'aborted')),
  -- Настройка «количество вопросов» сохраняется вместе с сессией.
  question_count integer not null default 5 check (question_count between 1 and 20),
  started_at timestamptz,
  completed_at timestamptz,
  summary text,
  -- Итоговый отчёт: строго типизированный jsonb, формат в src/types/interview.ts.
  report jsonb,
  created_at timestamptz not null default now()
);

create index interview_sessions_user_idx on public.interview_sessions (user_id, created_at desc);
create index interview_sessions_application_idx on public.interview_sessions (application_id);

create table public.interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  turn_index integer not null check (turn_index >= 0),
  -- Оценка ответа (jsonb): либо { skipped: true }, либо структура AnswerEvaluation
  -- из src/types/interview.ts. Формат валидируется zod на клиенте.
  evaluation jsonb,
  created_at timestamptz not null default now()
);

create index interview_messages_session_idx on public.interview_messages (session_id, turn_index);

alter table public.interview_sessions enable row level security;

create policy interview_sessions_select_own on public.interview_sessions
  for select using (auth.uid() = user_id);
create policy interview_sessions_insert_own on public.interview_sessions
  for insert with check (auth.uid() = user_id);
create policy interview_sessions_update_own on public.interview_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy interview_sessions_delete_own on public.interview_sessions
  for delete using (auth.uid() = user_id);

-- Доступ к сообщениям — через принадлежность родительской сессии пользователю.
alter table public.interview_messages enable row level security;

create policy interview_messages_select_own on public.interview_messages
  for select using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = interview_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy interview_messages_insert_own on public.interview_messages
  for insert with check (
    exists (
      select 1 from public.interview_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy interview_messages_update_own on public.interview_messages
  for update using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = interview_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy interview_messages_delete_own on public.interview_messages
  for delete using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = interview_messages.session_id and s.user_id = auth.uid()
    )
  );
