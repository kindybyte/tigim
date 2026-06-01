-- =============================================================================
-- Tigim — migration 0009: журнал выработки (work_logs)
-- =============================================================================
-- Зачем:
--   • Мастер с телефона быстро фиксирует «Гульнара отшила 50 шт размер L
--     по заказу #1045 на этапе Пошив».
--   • Из этих записей автоматически считается:
--       - order_stages.progress  — прогресс по этапу
--       - order_stages.status    — Ожидает / В работе / Завершено
--       - order_stages.started_at / finished_at
--       - order_sizes.done       — сделано по размеру (по этапу «Пошив»)
--       - orders.progress        — общий прогресс заказа (среднее по этапам)
--   • Аккуратное место для сдельной оплаты: monthDone сотрудника =
--     SUM(work_logs.qty) за месяц.
-- =============================================================================

-- ---------- Таблица ----------
create table if not exists public.work_logs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  stage_id      uuid not null references public.order_stages(id) on delete cascade,
  size          text,
  qty           int  not null check (qty > 0),
  employee_id   uuid references public.employees(id) on delete set null,
  logged_by     uuid references public.profiles(id) on delete set null,
  date          date not null default current_date,
  comment       text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_work_logs_company on public.work_logs(company_id);
create index if not exists idx_work_logs_order on public.work_logs(order_id);
create index if not exists idx_work_logs_stage on public.work_logs(stage_id);
create index if not exists idx_work_logs_employee_date on public.work_logs(employee_id, date desc);


-- ---------- Триггер пересчёта прогресса ----------
-- Идемпотентная функция: читает из БД актуальные суммы и обновляет
-- order_stages / orders / order_sizes. Вызывается на INSERT/UPDATE/DELETE
-- work_logs, поэтому корректирует данные в любую сторону.
create or replace function public.work_logs_recompute(
  p_order_id uuid,
  p_stage_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_qty int;
  v_stage_done int;
  v_total_progress int;
begin
  select qty into v_order_qty from public.orders where id = p_order_id;
  if v_order_qty is null or v_order_qty = 0 then return; end if;

  -- 1) Прогресс конкретного этапа
  if p_stage_id is not null then
    select coalesce(sum(qty), 0) into v_stage_done
    from public.work_logs
    where stage_id = p_stage_id;

    update public.order_stages
    set
      progress = least(100, round(v_stage_done * 100.0 / v_order_qty)),
      status = case
        when v_stage_done = 0 then 'Ожидает'
        when v_stage_done >= v_order_qty then 'Завершено'
        else 'В работе'
      end,
      started_at = case
        when v_stage_done > 0 and started_at is null then now()
        when v_stage_done = 0 then null
        else started_at
      end,
      finished_at = case
        when v_stage_done >= v_order_qty then coalesce(finished_at, now())
        else null
      end
    where id = p_stage_id;
  end if;

  -- 2) Общий прогресс заказа = среднее по всем этапам
  select coalesce(round(avg(progress))::int, 0) into v_total_progress
  from public.order_stages
  where order_id = p_order_id;

  update public.orders
  set progress = v_total_progress
  where id = p_order_id;

  -- 3) order_sizes.done — берём из логов этапа "Пошив" как канонической точки
  -- «изделие готово». Если у цеха другой воркфлоу — поменяем настройку позже.
  update public.order_sizes os
  set done = coalesce((
    select sum(wl.qty)
    from public.work_logs wl
    join public.order_stages s on s.id = wl.stage_id
    where wl.order_id = os.order_id
      and wl.size = os.size
      and s.name = 'Пошив'
  ), 0)
  where os.order_id = p_order_id;
end;
$$;

create or replace function public.work_logs_trigger()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.work_logs_recompute(OLD.order_id, OLD.stage_id);
    return OLD;
  else
    perform public.work_logs_recompute(NEW.order_id, NEW.stage_id);
    return NEW;
  end if;
end;
$$;

drop trigger if exists trg_work_logs_recompute on public.work_logs;
create trigger trg_work_logs_recompute
  after insert or update or delete on public.work_logs
  for each row execute function public.work_logs_trigger();


-- ---------- RLS ----------
alter table public.work_logs enable row level security;

drop policy if exists "work_logs_select" on public.work_logs;
drop policy if exists "work_logs_insert" on public.work_logs;
drop policy if exists "work_logs_update" on public.work_logs;
drop policy if exists "work_logs_delete" on public.work_logs;

create policy "work_logs_select" on public.work_logs
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "work_logs_insert" on public.work_logs
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc']::public.company_role[]));

create policy "work_logs_update" on public.work_logs
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));

create policy "work_logs_delete" on public.work_logs
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));


-- ---------- Realtime ----------
-- Чтобы открытая на экране страница заказа сразу обновляла прогресс,
-- когда мастер записал выработку с другого устройства.
alter publication supabase_realtime add table public.work_logs;

-- Done.
