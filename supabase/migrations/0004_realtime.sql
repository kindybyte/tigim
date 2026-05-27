-- =============================================================================
-- Tigim — migration 0004: enable Realtime on key tables
-- =============================================================================
-- Supabase Realtime требует, чтобы таблица была в публикации supabase_realtime.
-- Включаем для самых "живых" таблиц: orders, order_stages, defects, materials,
-- activity_events. Каждое INSERT/UPDATE/DELETE будет транслироваться клиентам
-- (RLS политики применяются — подписчик увидит только записи своей company).
-- =============================================================================

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_stages;
alter publication supabase_realtime add table public.defects;
alter publication supabase_realtime add table public.materials;
alter publication supabase_realtime add table public.activity_events;

-- Done.
