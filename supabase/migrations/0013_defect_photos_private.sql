-- =============================================================================
-- Tigim — migration 0013: defect-photos bucket → private + signed URLs
-- =============================================================================
-- Зачем:
--   Раньше bucket был public — прямой URL вида
--   https://<project>.supabase.co/storage/v1/object/public/defect-photos/...
--   работал без авторизации. Путь содержит UUID, который трудно угадать,
--   но если он попал в лог / переслан в чат / открыли DevTools на чужом
--   устройстве — фото утечёт.
--
--   Теперь bucket private. Фронт получает signed URL через
--   supabase.storage.from('defect-photos').createSignedUrl(path, 3600),
--   ссылка живёт 1 час и привязана к токену пользователя.
--
--   RLS-политики на bucket уже сверяют path с company_members — менять
--   их не нужно. createSignedUrl сработает только если RLS пропустил.
-- =============================================================================

update storage.buckets
set public = false
where id = 'defect-photos';

-- Done.
