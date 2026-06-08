-- =============================================================================
-- Tigim — migration 0017: режим ведения склада (простой / полный)
-- =============================================================================
-- Зачем:
--   Многие цеха не ведут детальную инвентаризацию: им хватает списка материалов
--   с остатком и средней ценой. Минимальный остаток, USD-валюта, поставщики,
--   движения с датой/комментарием — лишняя сложность.
--
-- Что делаем:
--   Добавляем companies.warehouse_mode = 'simple' | 'full'. Дефолт 'full' —
--   обратная совместимость для существующих компаний.
--   Сам слой данных НЕ меняется: все колонки materials остаются, триггер
--   material_movements_to_expense продолжает работать. Режим — чисто
--   UI-настройка: при 'simple' фронт прячет лишние поля и форсит KGS.
-- =============================================================================

alter table public.companies
  add column if not exists warehouse_mode text not null default 'full';

alter table public.companies
  drop constraint if exists companies_warehouse_mode_check;
alter table public.companies
  add constraint companies_warehouse_mode_check
  check (warehouse_mode in ('simple', 'full'));

-- Done.
