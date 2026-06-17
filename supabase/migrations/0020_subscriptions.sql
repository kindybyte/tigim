-- =============================================================================
-- Tigim — migration 0020: трекинг подписок и платежей
-- =============================================================================
-- Зачем:
--   Для пилотных цехов: видеть «осталось X дней trial», кнопка «Оплатить»
--   с переходом в WhatsApp. Для владельца Tigim: страница «Клиенты» где
--   видно кто заплатил, до какого числа, кто в trial, у кого истекает.
--
-- Стратегия платежей (пока без автобиллинга):
--   1. Цех регистрируется → автоматически trial 14 дней (уже работает).
--   2. За 3 дня до конца trial → банер в дашборде + Telegram-алерт владельцу.
--   3. Цех нажимает «Оплатить» → WhatsApp с предзаполненным сообщением.
--   4. Владелец Tigim получает оплату (банк/наличные) → заходит в
--      /app/admin/customers → нажимает «Зафиксировать оплату» → указывает
--      сумму + срок (1/3/6/12 месяцев) → paid_until сдвигается, статус active.
--   5. За 3 дня до истечения paid_until → снова банер + алерт.
--
-- DB:
--   - companies.subscription_status — текущий статус для UI и фильтров.
--   - companies.paid_until — до какой даты оплачено (включительно).
--   - companies.last_paid_at / last_paid_amount — для quick summary.
--   - public.payments — история всех платежей (для аудита и истории клиента).
-- =============================================================================

-- 1. Subscription статус — вычисляемое поле, но удобно держать в БД для
--    быстрых фильтров на страннице «Клиенты».
alter table public.companies
  add column if not exists subscription_status text not null default 'trial';

alter table public.companies
  drop constraint if exists companies_subscription_status_check;
alter table public.companies
  add constraint companies_subscription_status_check
  check (subscription_status in ('trial','active','past_due','cancelled','expired'));

-- 2. До какой даты оплачено. После trial эта дата = trial_ends_at,
--    после первого платежа = paid_until + N месяцев.
alter table public.companies
  add column if not exists paid_until date;

-- 3. Quick info для списка клиентов (без JOIN на payments).
alter table public.companies
  add column if not exists last_paid_at timestamptz;
alter table public.companies
  add column if not exists last_paid_amount numeric(12,2);

-- 4. История платежей.
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  currency        text not null default 'KGS',
  -- За какой период оплачено (start = paid_until до этого, end = новый paid_until).
  period_start    date not null,
  period_end      date not null,
  -- На какой тариф (на момент платежа).
  plan            text not null check (plan in ('start','pro','factory')),
  -- Метод и заметка — для аудита.
  method          text not null default 'manual'
                  check (method in ('manual','whatsapp','bank','cash','freedompay','stripe')),
  notes           text,
  -- Кто зафиксировал (platform admin).
  recorded_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_payments_company
  on public.payments(company_id, created_at desc);

-- 5. RLS — только platform admin видит и пишет.
alter table public.payments enable row level security;

drop policy if exists "payments_admin_select" on public.payments;
create policy "payments_admin_select"
  on public.payments for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "payments_admin_insert" on public.payments;
create policy "payments_admin_insert"
  on public.payments for insert
  to authenticated
  with check (public.is_platform_admin());

drop policy if exists "payments_admin_delete" on public.payments;
create policy "payments_admin_delete"
  on public.payments for delete
  to authenticated
  using (public.is_platform_admin());

-- 6. RLS на companies — расширяем чтобы platform admin видел все компании.
--    Существующая политика разрешает SELECT только своим членам.
--    Добавляем альтернативный путь: platform admin видит ВСЕ.
drop policy if exists "companies_admin_select_all" on public.companies;
create policy "companies_admin_select_all"
  on public.companies for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "companies_admin_update_all" on public.companies;
create policy "companies_admin_update_all"
  on public.companies for update
  to authenticated
  using (public.is_platform_admin());

-- 7. Триггер: при insert в payments — обновить companies.paid_until,
--    last_paid_at, last_paid_amount, subscription_status.
create or replace function public.payments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.companies
    set paid_until = new.period_end,
        last_paid_at = new.created_at,
        last_paid_amount = new.amount,
        subscription_status = 'active',
        plan = new.plan
    where id = new.company_id;
  return new;
end;
$$;

drop trigger if exists payments_after_insert on public.payments;
create trigger payments_after_insert
  after insert on public.payments
  for each row execute function public.payments_after_insert();

-- 8. Для существующих компаний — заполнить subscription_status и paid_until
--    на основе trial_ends_at.
update public.companies
  set paid_until = coalesce(paid_until, trial_ends_at::date)
  where paid_until is null;

update public.companies
  set subscription_status =
    case
      when paid_until is null then 'trial'
      when paid_until < current_date then 'expired'
      when plan = 'trial' then 'trial'
      else 'active'
    end
  where subscription_status = 'trial' and id in (
    select id from public.companies
  );

-- Done.
