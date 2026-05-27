-- =============================================================================
-- Tigim — migration 0006: Storage bucket для фото брака
-- =============================================================================
-- Bucket: defect-photos (public — фото можно показывать через прямой URL,
-- но INSERT/UPDATE/DELETE защищены RLS по company).
--
-- Структура путей: {company_id}/{defect_id}.{ext}
-- Первый сегмент пути сверяется со списком компаний пользователя.
--
-- Лимиты: до 5 МБ на файл, только image/jpeg|png|webp.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'defect-photos',
  'defect-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------- INSERT ----------
drop policy if exists "defect_photos_insert" on storage.objects;
create policy "defect_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'defect-photos'
    and exists (
      select 1 from public.company_members
      where user_id = auth.uid()
        and company_id::text = split_part(name, '/', 1)
    )
  );

-- ---------- SELECT (for storage.list() API; public URL bypasses RLS) ----------
drop policy if exists "defect_photos_select" on storage.objects;
create policy "defect_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'defect-photos'
    and exists (
      select 1 from public.company_members
      where user_id = auth.uid()
        and company_id::text = split_part(name, '/', 1)
    )
  );

-- ---------- DELETE ----------
drop policy if exists "defect_photos_delete" on storage.objects;
create policy "defect_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'defect-photos'
    and exists (
      select 1 from public.company_members
      where user_id = auth.uid()
        and company_id::text = split_part(name, '/', 1)
    )
  );

-- Done.
