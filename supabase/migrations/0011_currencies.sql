-- =============================================================================
-- Tigim — migration 0011: валюты материалов и курс USD
-- =============================================================================
-- Зачем:
--   • Часть тканей/фурнитуры закупается в долларах. Раньше price_per_unit
--     был только в сомах — нельзя было корректно вести импорт.
--   • Теперь каждый материал хранит свою цену в исходной валюте (KGS или
--     USD), а конверсия в сомы происходит в момент списания на заказ —
--     по курсу компании, актуальному на момент movement.
--
-- Что меняется:
--   1. companies.usd_rate — текущий курс USD→KGS, настраивается в
--      Настройках. Дефолт 88 сом/$ — типичное значение на 2026 год.
--   2. materials.price_currency — KGS | USD.
--   3. Триггер material_movements_to_expense (из 0010) пересоздаётся,
--      теперь умножает USD-цены на companies.usd_rate.
-- =============================================================================

-- 1. Курс на уровне компании
alter table public.companies
  add column if not exists usd_rate numeric(10,4) not null default 88.0;


-- 2. Валюта цены на уровне материала
alter table public.materials
  add column if not exists price_currency text not null default 'KGS';

-- Снять старый CHECK если был, поставить актуальный
alter table public.materials
  drop constraint if exists materials_price_currency_check;
alter table public.materials
  add constraint materials_price_currency_check
  check (price_currency in ('KGS','USD'));


-- 3. Обновлённый триггер: USD-цены конвертируются в сомы по курсу компании
create or replace function public.material_movements_to_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materials%rowtype;
  v_rate     numeric(10,4);
  v_amount   numeric(14,2);
  v_category text;
  v_desc     text;
begin
  -- Только расходные движения с привязкой к заказу.
  if new.kind not in ('out','write_off') or new.order_id is null then
    return new;
  end if;

  select * into v_material from public.materials where id = new.material_id;
  if v_material is null then
    return new;
  end if;

  -- Конверсия в сомы
  if v_material.price_currency = 'USD' then
    select usd_rate into v_rate from public.companies where id = new.company_id;
    v_rate := coalesce(v_rate, 88.0);
    v_amount := new.qty * v_material.price_per_unit * v_rate;
    v_desc := v_material.name
              || ' (со склада, '
              || v_material.price_per_unit::text || ' USD × '
              || v_rate::text || ')';
  else
    v_amount := new.qty * v_material.price_per_unit;
    v_desc := v_material.name || ' (со склада)';
  end if;

  if v_amount <= 0 then
    return new;
  end if;

  v_category := case v_material.type
    when 'ткань'     then 'fabric'
    when 'фурнитура' then 'accessories'
    when 'упаковка'  then 'packaging'
    when 'нить'      then 'accessories'
    else 'other'
  end;

  insert into public.order_expenses (
    company_id, order_id, category, description, amount,
    source_movement_id, created_by, date
  ) values (
    new.company_id,
    new.order_id,
    v_category,
    v_desc,
    v_amount,
    new.id,
    new.created_by,
    new.created_at::date
  );

  return new;
end;
$$;

-- Триггер уже привязан в 0010, пересоздавать не нужно — CREATE OR REPLACE
-- функции достаточно, триггер вызовет новую версию автоматически.

-- Done.
