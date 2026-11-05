-- Проверка схемы url вакансии: ссылка попадает в <a href> на клиенте,
-- поэтому в БД допускаются только http(s)-адреса (или NULL).
-- not valid: в таблице могут быть старые записи, не проходящие проверку, —
-- миграция не должна падать на существующих данных. После чистки выполните:
--   alter table public.applications validate constraint applications_url_http_check;
-- (как найти старые записи — см. README, раздел «Безопасность»).

alter table public.applications
  add constraint applications_url_http_check
  check (url is null or url ~* '^https?://')
  not valid;
