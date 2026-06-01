-- =============================================================================
-- Tigim — migration 0010: расходы по заказу (order_expenses)
-- =============================================================================
-- Зачем:
--   Реальная себестоимость заказа = сумма расходов + сдельная работа из
--   work_logs + доля окладов + потери на браке.
--   До этой миграции себестоимость считалась как unit_cost × qty с
--   произвольным разбиением 40/35/15/10. Это фикция.
--
-- Что внутри:
--   1. Таблица order_expenses — строки расходов с категорией.
--   2. Триггер: когда в material_movements падает out/write_off с указанием
--      order_id, автоматически создаётся order_expense на сумму
--      qty × materials.price_per_unit. Категория мапится по materials.type.
--      При удалении movement расход уходит каскадом (FK on delete cascade).
--   3. RLS + realtime.
-- =============================================================================

-- ---------- Таблица ----------
create table if not exists public.order_expenses (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  order_id            uuid not null references public.orders(id) on delete cascade,
  category            text not null
                      check (category in ('fabric','accessories','packaging','overhead','other')),
  description         text,
  amount              numeric(14,2) not null check (amount >= 0),
  date                date not null default current_date,
  -- если строка создана автоматически из material_movement — храним связь,
  -- чтобы удаление движения каскадом снесло расход.
  source_movement_id  uuid references public.material_movements(id) on delete cascade,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_order_expenses_company on public.order_expenses(company_id);
create index if not exists idx_order_expenses_order on public.order_expenses(order_id);
create index if not exists idx_order_expenses_movement on public.order_expenses(source_movement_id);


-- ---------- Триггер: materials → order_expenses ----------
create or replace function public.material_movements_to_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materials%rowtype;
  v_amount   numeric(14,2);
  v_category text;
begin
  -- Только расходные движения с привязкой к заказу.
  if new.kind not in ('out','write_off') or new.order_id is null then
    return new;
  end if;

  select * into v_material from public.materials where id = new.material_id;
  if v_material is null then
    return new;
  end if;

  v_amount := new.qty * v_material.price_per_unit;
  if v_amount <= 0 then
    return new;
  end if;

  v_category := case v_material.type
    when 'ткань'      then 'fabric'
    when 'фурнитура'  then 'accessories'
    when 'упаковка'   then 'packaging'
    when 'нить'       then 'accessories'
    else 'other'
  end;

  insert into public.order_expenses (
    company_id, order_id, category, description, amount,
    source_movement_id, created_by, date
  ) values (
    new.company_id,
    new.order_id,
    v_category,
    v_material.name || ' (со склада)',
    v_amount,
    new.id,
    new.created_by,
    new.created_at::date
  );

  return new;
end;
$$;

drop trigger if exists trg_material_movements_to_expense on public.material_movements;
create trigger trg_material_movements_to_expense
  after insert on public.material_movements
  for each row execute function public.material_movements_to_expense();


-- ---------- RLS ----------
alter table public.order_expenses enable row level security;

drop policy if exists "order_expenses_select" on public.order_expenses;
drop policy if exists "order_expenses_insert" on public.order_expenses;
drop policy if exists "order_expenses_update" on public.order_expenses;
drop policy if exists "order_expenses_delete" on public.order_expenses;

create policy "order_expenses_select" on public.order_expenses
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

-- INSERT/UPDATE/DELETE — финансовые данные, ограничиваем сильнее.
create policy "order_expenses_insert" on public.order_expenses
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));

create policy "order_expenses_update" on public.order_expenses
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));

create policy "order_expenses_delete" on public.order_expenses
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));


-- ---------- Realtime ----------
alter publication supabase_realtime add table public.order_expenses;

-- Done.
