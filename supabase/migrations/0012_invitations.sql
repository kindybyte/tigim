-- =============================================================================
-- Tigim — migration 0012: приглашения в компанию (invitations)
-- =============================================================================
-- Зачем:
--   Без этого новые пользователи, регистрируясь через /signup, создавали
--   СВОЮ новую компанию вместо того чтобы попасть в команду владельца.
--   Теперь:
--   1. Владелец в Настройках жмёт «Пригласить пользователя» — указывает
--      email + роль. Создаётся запись с токеном.
--   2. Владелец копирует ссылку https://tigim.vercel.app/signup?invite=TOKEN
--      и шлёт коллеге через WhatsApp / Telegram.
--   3. Коллега регистрируется по этой ссылке. Token сохраняется в
--      localStorage до момента когда он войдёт.
--   4. В Onboarding фронт видит токен → дёргает redeem_invitation()
--      → пользователь добавляется в company_members с указанной ролью.
--      Свою компанию НЕ создаёт.
-- =============================================================================

-- ---------- Таблица ----------
create table if not exists public.invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  email        text not null,
  role         public.company_role not null default 'staff',
  -- Токен — короткий случайный hex (32 символа) без дефисов, удобно вставить в URL.
  token        text not null unique
               default replace(gen_random_uuid()::text, '-', ''),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id) on delete set null
);

create index if not exists idx_invitations_company on public.invitations(company_id);
create index if not exists idx_invitations_token on public.invitations(token);


-- ---------- RPC: redeem_invitation ----------
-- Вызывается фронтом после логина. Принимает token, добавляет текущего
-- пользователя в company_members с ролью из invitations, помечает invite
-- как использованный. Возвращает company_id (фронт использует чтобы
-- обновить auth context).
create or replace function public.redeem_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv      public.invitations%rowtype;
  v_user_id  uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv from public.invitations where token = p_token;
  if v_inv.id is null then
    raise exception 'Invitation not found';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'Invitation already used';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Invitation expired';
  end if;

  insert into public.company_members (company_id, user_id, role)
  values (v_inv.company_id, v_user_id, v_inv.role)
  on conflict (company_id, user_id) do nothing;

  update public.invitations
    set accepted_at = now(),
        accepted_by = v_user_id
  where id = v_inv.id;

  return v_inv.company_id;
end;
$$;


-- ---------- RLS ----------
alter table public.invitations enable row level security;

drop policy if exists "invitations_select" on public.invitations;
drop policy if exists "invitations_insert" on public.invitations;
drop policy if exists "invitations_update" on public.invitations;
drop policy if exists "invitations_delete" on public.invitations;

-- SELECT/INSERT/UPDATE/DELETE — только владелец компании.
-- Сами приглашённые видят свой токен через URL, в БД им читать не нужно.
-- redeem_invitation работает через security definer, поэтому RLS не мешает.
create policy "invitations_select" on public.invitations
  for select to authenticated
  using (public.has_role_in_company(company_id, array['owner']::public.company_role[]));

create policy "invitations_insert" on public.invitations
  for insert to authenticated
  with check (public.has_role_in_company(company_id, array['owner']::public.company_role[]));

create policy "invitations_update" on public.invitations
  for update to authenticated
  using (public.has_role_in_company(company_id, array['owner']::public.company_role[]))
  with check (public.has_role_in_company(company_id, array['owner']::public.company_role[]));

create policy "invitations_delete" on public.invitations
  for delete to authenticated
  using (public.has_role_in_company(company_id, array['owner']::public.company_role[]));


-- ---------- Realtime ----------
alter publication supabase_realtime add table public.invitations;

-- Done.
