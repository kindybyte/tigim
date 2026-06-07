-- =============================================================================
-- Tigim — migration 0016: окончательный снос CHECK на employees.role
-- =============================================================================
-- Зачем:
--   Миграция 0008 пыталась найти ограничение динамически по pattern '%role%in%',
--   но Postgres хранит "role IN (...)" как "role = ANY (ARRAY[...])". Поиск
--   ничего не находил, и старый CHECK 'employees_role_check' оставался.
--   Из-за этого добавление кастомной должности (напр. «Технолог») падало с
--   ошибкой "violates check constraint employees_role_check".
--
-- Что делаем:
--   1. Удаляем employees_role_check по имени (стандартное автоимя Postgres).
--     На всякий случай чистим любой другой CHECK, ссылающийся на role.
--   2. Гарантируем что мягкий CHECK на непустую роль (employees_role_not_empty) есть.
--   3. Заодно расширяем CHECK на stage — раньше он жёстко перечислял 6 этапов,
--     но stage уже nullable («не назначен») и в будущем должен быть настраиваемым.
--     Достаточно проверки что значение либо null, либо непустая строка.
-- =============================================================================

-- 1a. Явное удаление по стандартному имени.
alter table public.employees
  drop constraint if exists employees_role_check;

-- 1b. Подчищаем любые другие CHECK на колонку role (динамически, надёжно).
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.employees'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~* '\mrole\M'
      and conname <> 'employees_role_not_empty'
  loop
    execute format('alter table public.employees drop constraint %I', c.conname);
  end loop;
end
$$;

-- 2. Мягкий CHECK на непустую роль (на случай если 0008 тоже не прошла).
alter table public.employees
  drop constraint if exists employees_role_not_empty;
alter table public.employees
  add constraint employees_role_not_empty
  check (length(trim(role)) > 0);

-- 3. Расширяем CHECK на stage (раньше был хардкод 6 этапов).
alter table public.employees
  drop constraint if exists employees_stage_check;
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.employees'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ~* '\mstage\M'
      and conname <> 'employees_stage_valid'
  loop
    execute format('alter table public.employees drop constraint %I', c.conname);
  end loop;
end
$$;
alter table public.employees
  add constraint employees_stage_valid
  check (stage is null or length(trim(stage)) > 0);

-- Done.
