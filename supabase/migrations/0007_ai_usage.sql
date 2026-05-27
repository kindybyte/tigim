-- =============================================================================
-- Tigim — migration 0007: AI assistant usage tracking
-- =============================================================================
-- Зачем:
--   • Серверная функция /api/ai/chat считает сколько сообщений пользователь
--     потратил за сутки, чтобы держать стоимость токенов под контролем.
--   • Лимит per-plan: trial/start — 20 msg/day, pro — 100, factory — без лимита.
--     Сам лимит проверяет серверная функция; таблица хранит счётчик.
--
-- Доступ:
--   • Пишет в неё только service_role (через серверную функцию).
--   • Пользователь видит только свои строки (через RLS) — нужно для UI
--     "осталось 17/20 сообщений сегодня".
-- =============================================================================

create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  date          date not null default current_date,
  messages      int  not null default 0,
  tokens_in     int  not null default 0,
  tokens_out    int  not null default 0,
  updated_at    timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_ai_usage_user_date on public.ai_usage(user_id, date desc);
create index if not exists idx_ai_usage_company_date on public.ai_usage(company_id, date desc);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid());

-- Намеренно нет INSERT/UPDATE/DELETE политик — пишет только service_role
-- через серверную функцию. Это защищает счётчик от подделки клиентом.

-- Done.
