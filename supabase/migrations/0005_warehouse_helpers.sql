-- =============================================================================
-- Tigim — migration 0005: warehouse helpers
-- =============================================================================
-- Триггер: при INSERT в material_movements автоматически обновляет
-- materials.stock в той же транзакции.
--   kind = 'in'        →  stock += qty   (приход)
--   kind = 'out'       →  stock -= qty   (расход на производство)
--   kind = 'write_off' →  stock -= qty   (списание брака / порчи)
-- Negative stock не запрещается — может быть валидным сценарием (предзаказ),
-- в UI помечается красным.
-- =============================================================================

create or replace function public.material_movements_apply_to_stock()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'in' then
    update public.materials
      set stock = stock + new.qty
    where id = new.material_id;
  else
    update public.materials
      set stock = stock - new.qty
    where id = new.material_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_material_movements_stock on public.material_movements;
create trigger trg_material_movements_stock
  after insert on public.material_movements
  for each row execute function public.material_movements_apply_to_stock();

-- Done.
