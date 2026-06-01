-- =============================================================================
-- Tigim — migration 0008: гибкие должности и сдельная оплата
-- =============================================================================
-- Зачем:
--   • Реальные цеха имеют должности вне 6 предзаданных (Технолог, Контролёр ОТК,
--     Кладовщик, Гладильщик, и т.д.). Жёсткий CHECK блокировал ввод.
--   • Многие цеха платят сдельно — за единицу отшитого/упакованного изделия.
--     Одного поля `salary` (месячный оклад) недостаточно.
--
-- Что меняется:
--   1. employees.role — снимаем CHECK, оставляем только проверку на непустую строку.
--   2. Добавляем pay_type ('monthly' | 'per_piece') и rate_per_piece.
--      Для существующих строк pay_type = 'monthly' (поведение не меняется).
-- =============================================================================

-- 1. Снять старый CHECK на role.
-- Имя ограничения может варьироваться (зависит от того как Postgres его назвал).
-- Поэтому ищем динамически и удаляем.
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.employees'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%in%';
  if v_name is not null then
    execute format('alter table public.employees drop constraint %I', v_name);
  end if;
end
$$;

-- Новая мягкая проверка — только что роль не пустая.
alter table public.employees
  drop constraint if exists employees_role_not_empty;
alter table public.employees
  add constraint employees_role_not_empty
  check (length(trim(role)) > 0);

-- 2. Тип оплаты + ставка за единицу.
alter table public.employees
  add column if not exists pay_type text not null default 'monthly'
    check (pay_type in ('monthly','per_piece'));

alter table public.employees
  add column if not exists rate_per_piece numeric(12,2) not null default 0;

-- Done.
