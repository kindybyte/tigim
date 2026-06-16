-- =============================================================================
-- Tigim — migration 0018: режим расчёта себестоимости (точный / по факту)
-- =============================================================================
-- Зачем:
--   Многие цеха закупают ткань рулонами на «глаз», узнают точные размеры и
--   цены за единицу уже после раскроя. Старая модель «введи unit_cost
--   заранее» им не подходит.
--
-- Что добавляется:
--   1. companies.cost_mode = 'precise' | 'post_cut'.
--     - 'precise' (дефолт): как сейчас — себестоимость задаётся вручную при
--        создании заказа.
--     - 'post_cut': себестоимость вычисляется автоматически из реальных
--        расходов (order_expenses) + ставок на единицу × фактический выход +
--        зарплат (work_logs × ставка).
--
--   2. Новая таблица public.order_unit_rates — per-unit ставки заказа:
--        accessories (фурнитура), embroidery (вышивка/печать),
--        packaging (упаковка), other.
--      Уникальная пара (order_id, category) — одна ставка на категорию.
--
--   3. Чтобы можно было создать заказ без точной разбивки по размерам:
--      убираем NOT NULL с order_sizes.qty? Нет — оставляем NOT NULL, default 0
--      допустим (CHECK qty >= 0). Размеры с qty=0 — «заявка», заполнится при
--      раскрое через work_logs trigger или вручную через UI.
--
--   4. orders.unit_cost — оставляем NOT NULL, default 0. В режиме post_cut
--      просто не используется в финансовых отчётах (себес считается из
--      order_expenses + rates).
-- =============================================================================

-- 1. cost_mode на компании.
alter table public.companies
  add column if not exists cost_mode text not null default 'precise';

alter table public.companies
  drop constraint if exists companies_cost_mode_check;
alter table public.companies
  add constraint companies_cost_mode_check
  check (cost_mode in ('precise', 'post_cut'));

-- 2. Таблица per-unit ставок.
create table if not exists public.order_unit_rates (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  category        text not null
                  check (category in ('accessories','embroidery','packaging','other')),
  rate_per_piece  numeric(12,2) not null default 0
                  check (rate_per_piece >= 0),
  created_at      timestamptz not null default now(),
  unique (order_id, category)
);

create index if not exists idx_order_unit_rates_order
  on public.order_unit_rates(order_id);

-- 3. RLS — read/write через company_members заказа.
alter table public.order_unit_rates enable row level security;

drop policy if exists "order_unit_rates_select" on public.order_unit_rates;
create policy "order_unit_rates_select"
  on public.order_unit_rates for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.company_members cm on cm.company_id = o.company_id
      where o.id = order_unit_rates.order_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "order_unit_rates_insert" on public.order_unit_rates;
create policy "order_unit_rates_insert"
  on public.order_unit_rates for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders o
      join public.company_members cm on cm.company_id = o.company_id
      where o.id = order_unit_rates.order_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','manager','technologist')
    )
  );

drop policy if exists "order_unit_rates_update" on public.order_unit_rates;
create policy "order_unit_rates_update"
  on public.order_unit_rates for update
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.company_members cm on cm.company_id = o.company_id
      where o.id = order_unit_rates.order_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','manager','technologist')
    )
  );

drop policy if exists "order_unit_rates_delete" on public.order_unit_rates;
create policy "order_unit_rates_delete"
  on public.order_unit_rates for delete
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.company_members cm on cm.company_id = o.company_id
      where o.id = order_unit_rates.order_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','manager','technologist')
    )
  );

-- Done.
