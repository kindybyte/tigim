-- =============================================================================
-- Tigim — migration 0021: конфигурируемые этапы производства per company
-- =============================================================================
-- Зачем:
--   У разных цехов разные этапы. Кто-то не делает печать/вышивку (отдаёт
--   другому цеху). Кто-то добавляет «Утюжка» отдельным этапом, кто-то «DTG-печать».
--   Сейчас хардкод 6 этапов из migration 0001 — всех под одну гребёнку.
--
-- Что меняется:
--   1. Новая таблица company_stages — список этапов производства per цех.
--      Дефолт: 6 стандартных (Раскрой → Готово), но владелец может править
--      в Настройки → Этапы производства.
--   2. RLS: SELECT для членов компании. CRUD для owner/manager/technologist.
--   3. Бэкфилл: каждой существующей компании создаём 6 стандартных этапов.
--   4. Триггер: при создании новой компании автоматически создаются 6 стандартных.
--   5. Обновляется триггер orders_create_default_stages — теперь читает из
--      company_stages вместо хардкода.
--   6. Снимаем CHECK с defects.stage (как сделали с employees.stage в 0016)
--      — теперь любое строковое значение допустимо.
-- =============================================================================

-- 1. Таблица этапов компании.
create table if not exists public.company_stages (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  position     int not null,
  is_terminal  boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (company_id, name),
  unique (company_id, position)
);

create index if not exists idx_company_stages_company
  on public.company_stages(company_id, position);

alter table public.company_stages enable row level security;

-- SELECT: любой член компании.
drop policy if exists "company_stages_member_select" on public.company_stages;
create policy "company_stages_member_select"
  on public.company_stages for select
  to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_stages.company_id and cm.user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE: owner / manager / technologist.
drop policy if exists "company_stages_admin_write" on public.company_stages;
create policy "company_stages_admin_write"
  on public.company_stages for all
  to authenticated
  using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_stages.company_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','manager','technologist')
    )
  )
  with check (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = company_stages.company_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','manager','technologist')
    )
  );

-- 2. Бэкфилл: каждой существующей компании создаём стандартные 6 этапов.
--    do nothing если уже есть (т.е. идемпотентно).
insert into public.company_stages (company_id, name, position, is_terminal, is_active)
select c.id, x.name, x.pos, x.terminal, true
from public.companies c
cross join (values
  ('Раскрой',         1, false),
  ('Печать/вышивка',  2, false),
  ('Пошив',           3, false),
  ('ОТК',             4, false),
  ('Упаковка',        5, false),
  ('Готово',          6, true)
) x(name, pos, terminal)
on conflict (company_id, name) do nothing;

-- 3. Триггер для новых компаний.
create or replace function public.companies_create_default_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_stages (company_id, name, position, is_terminal, is_active)
  values
    (new.id, 'Раскрой',         1, false, true),
    (new.id, 'Печать/вышивка',  2, false, true),
    (new.id, 'Пошив',           3, false, true),
    (new.id, 'ОТК',             4, false, true),
    (new.id, 'Упаковка',        5, false, true),
    (new.id, 'Готово',          6, true,  true);
  return new;
end;
$$;

drop trigger if exists trg_companies_default_stages on public.companies;
create trigger trg_companies_default_stages
  after insert on public.companies
  for each row execute function public.companies_create_default_stages();

-- 4. Перепишем триггер для заказов — берёт этапы из company_stages.
create or replace function public.orders_create_default_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_stages (order_id, name, status, position)
  select new.id, cs.name, 'Ожидает', cs.position
  from public.company_stages cs
  where cs.company_id = new.company_id and cs.is_active = true
  order by cs.position;
  return new;
end;
$$;

-- 5. Снимаем CHECK с defects.stage — теперь любое значение допустимо
--    (мы записываем туда выбранный этап из company_stages).
alter table public.defects
  drop constraint if exists defects_stage_check;

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.defects'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~* '\mstage\M'
      and conname <> 'defects_stage_valid'
  loop
    execute format('alter table public.defects drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.defects
  add constraint defects_stage_valid
  check (stage is null or length(trim(stage)) > 0);

-- Done.
