-- =============================================================================
-- Tigim — migration 0003: order helpers
-- =============================================================================
-- При создании любого нового заказа автоматически создаём 6 этапов
-- в статусе "Ожидает" (Раскрой → Печать → Пошив → ОТК → Упаковка → Готово).
-- Это нужно для kanban-доски: каждый заказ сразу имеет полный цикл.
--
-- Триггер AFTER INSERT — RLS-политика на order_stages пройдёт, так как
-- к моменту выполнения parent-order уже в таблице (в той же транзакции).
-- =============================================================================

create or replace function public.orders_create_default_stages()
returns trigger
language plpgsql
as $$
begin
  insert into public.order_stages (order_id, name, status, position) values
    (new.id, 'Раскрой',         'Ожидает', 1),
    (new.id, 'Печать/вышивка',  'Ожидает', 2),
    (new.id, 'Пошив',           'Ожидает', 3),
    (new.id, 'ОТК',             'Ожидает', 4),
    (new.id, 'Упаковка',        'Ожидает', 5),
    (new.id, 'Готово',          'Ожидает', 6);
  return new;
end;
$$;

drop trigger if exists trg_orders_default_stages on public.orders;
create trigger trg_orders_default_stages
  after insert on public.orders
  for each row execute function public.orders_create_default_stages();

-- Done.
