-- =============================================================================
-- Tigim — migration 0019: platform admin + доступ к leads
-- =============================================================================
-- Зачем:
--   Владелец Tigim (kadyr.b14@gmail.com) хочет видеть в самом приложении
--   список входящих заявок и менять их статус (новый → связался → выиграл).
--
--   В отличие от ролей внутри компании (owner/manager/...), это «глобальная
--   роль» платформы. Только один-два аккаунта.
--
-- Что добавляется:
--   1. profiles.is_platform_admin boolean default false.
--   2. RLS политики на leads:
--      - INSERT остаётся «anyone insert» (миграция 0002) — лендинг должен
--        работать без логина.
--      - SELECT / UPDATE / DELETE — только platform_admin.
--   3. Helper RPC is_platform_admin() — для удобного fetch из клиента.
-- =============================================================================

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- Helper для проверки в RLS и в клиенте.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- RLS policies на leads для platform admins.
drop policy if exists "leads_admin_select" on public.leads;
create policy "leads_admin_select"
  on public.leads for select
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads for update
  to authenticated
  using (public.is_platform_admin());

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (public.is_platform_admin());

-- Чтобы дать себе admin доступ — после применения миграции запусти:
--   update public.profiles
--     set is_platform_admin = true
--     where id = (select id from auth.users where email = 'kadyr.b14@gmail.com');

-- Done.
