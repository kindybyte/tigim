-- =============================================================================
-- Tigim — migration 0002: Row Level Security policies
-- =============================================================================
-- Принципы:
--   • READ:  все члены company видят данные своей company.
--   • WRITE: зависит от роли в company_members.role:
--       - owner    — всё
--       - manager  — заказы, склад, сотрудники, брак, финансы
--       - master   — заказы, этапы, брак, сотрудники цеха
--       - warehouse— материалы и движения
--       - qc       — этап ОТК, фиксация брака
--       - staff    — только READ (default)
--   • leads:  anyone INSERT; SELECT/UPDATE/DELETE только service_role (omit policy).
--
-- Безопасно повторно применять — каждый раз дропаем политики перед созданием.
-- =============================================================================


-- ---------- Helper: проверка роли в company ----------
create or replace function public.has_role_in_company(
  p_company_id uuid,
  p_roles public.company_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;


-- =============================================================================
-- profiles
-- =============================================================================
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id in (
      select cm.user_id
      from public.company_members cm
      where cm.company_id in (select public.user_company_ids())
    )
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


-- =============================================================================
-- companies (INSERT через RPC create_company, прямой INSERT запрещён)
-- =============================================================================
drop policy if exists "companies_select" on public.companies;
drop policy if exists "companies_update_owner" on public.companies;

create policy "companies_select" on public.companies
  for select to authenticated
  using (id in (select public.user_company_ids()));

create policy "companies_update_owner" on public.companies
  for update to authenticated
  using (public.has_role_in_company(id, array['owner']::public.company_role[]))
  with check (public.has_role_in_company(id, array['owner']::public.company_role[]));


-- =============================================================================
-- company_members (INSERT/DELETE/UPDATE — только owner)
-- =============================================================================
drop policy if exists "company_members_select" on public.company_members;
drop policy if exists "company_members_insert_owner" on public.company_members;
drop policy if exists "company_members_update_owner" on public.company_members;
drop policy if exists "company_members_delete_owner" on public.company_members;

create policy "company_members_select" on public.company_members
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "company_members_insert_owner" on public.company_members
  for insert to authenticated
  with check (public.has_role_in_company(company_id, array['owner']::public.company_role[]));

create policy "company_members_update_owner" on public.company_members
  for update to authenticated
  using (public.has_role_in_company(company_id, array['owner']::public.company_role[]))
  with check (public.has_role_in_company(company_id, array['owner']::public.company_role[]));

create policy "company_members_delete_owner" on public.company_members
  for delete to authenticated
  using (public.has_role_in_company(company_id, array['owner']::public.company_role[]));


-- =============================================================================
-- employees
-- =============================================================================
drop policy if exists "employees_select" on public.employees;
drop policy if exists "employees_insert" on public.employees;
drop policy if exists "employees_update" on public.employees;
drop policy if exists "employees_delete" on public.employees;

create policy "employees_select" on public.employees
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "employees_insert" on public.employees
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));

create policy "employees_update" on public.employees
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));

create policy "employees_delete" on public.employees
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));


-- =============================================================================
-- materials
-- =============================================================================
drop policy if exists "materials_select" on public.materials;
drop policy if exists "materials_insert" on public.materials;
drop policy if exists "materials_update" on public.materials;
drop policy if exists "materials_delete" on public.materials;

create policy "materials_select" on public.materials
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "materials_insert" on public.materials
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse']::public.company_role[]));

create policy "materials_update" on public.materials
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','warehouse']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse']::public.company_role[]));

create policy "materials_delete" on public.materials
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));


-- =============================================================================
-- material_movements (история — только append, без UPDATE/DELETE для обычных)
-- =============================================================================
drop policy if exists "material_movements_select" on public.material_movements;
drop policy if exists "material_movements_insert" on public.material_movements;
drop policy if exists "material_movements_delete_owner" on public.material_movements;

create policy "material_movements_select" on public.material_movements
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "material_movements_insert" on public.material_movements
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse','master']::public.company_role[]));

create policy "material_movements_delete_owner" on public.material_movements
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner']::public.company_role[]));


-- =============================================================================
-- orders
-- =============================================================================
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;
drop policy if exists "orders_delete" on public.orders;

create policy "orders_select" on public.orders
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "orders_insert" on public.orders
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master']::public.company_role[]));

create policy "orders_update" on public.orders
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master','qc']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc']::public.company_role[]));

create policy "orders_delete" on public.orders
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));


-- =============================================================================
-- order_sizes (доступ через parent order)
-- =============================================================================
create or replace function public.user_can_access_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.company_members cm on cm.company_id = o.company_id
    where o.id = p_order_id and cm.user_id = auth.uid()
  );
$$;

create or replace function public.user_can_write_order(p_order_id uuid, p_roles public.company_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.company_members cm on cm.company_id = o.company_id
    where o.id = p_order_id
      and cm.user_id = auth.uid()
      and cm.role = any(p_roles)
  );
$$;

drop policy if exists "order_sizes_select" on public.order_sizes;
drop policy if exists "order_sizes_write" on public.order_sizes;

create policy "order_sizes_select" on public.order_sizes
  for select to authenticated
  using (public.user_can_access_order(order_id));

create policy "order_sizes_write" on public.order_sizes
  for all to authenticated
  using (public.user_can_write_order(order_id,
    array['owner','manager','master']::public.company_role[]))
  with check (public.user_can_write_order(order_id,
    array['owner','manager','master']::public.company_role[]));


-- =============================================================================
-- order_stages (qc может менять статус этапов ОТК)
-- =============================================================================
drop policy if exists "order_stages_select" on public.order_stages;
drop policy if exists "order_stages_write" on public.order_stages;

create policy "order_stages_select" on public.order_stages
  for select to authenticated
  using (public.user_can_access_order(order_id));

create policy "order_stages_write" on public.order_stages
  for all to authenticated
  using (public.user_can_write_order(order_id,
    array['owner','manager','master','qc']::public.company_role[]))
  with check (public.user_can_write_order(order_id,
    array['owner','manager','master','qc']::public.company_role[]));


-- =============================================================================
-- defects (qc фиксирует, manager/owner могут удалять)
-- =============================================================================
drop policy if exists "defects_select" on public.defects;
drop policy if exists "defects_insert" on public.defects;
drop policy if exists "defects_update" on public.defects;
drop policy if exists "defects_delete" on public.defects;

create policy "defects_select" on public.defects
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "defects_insert" on public.defects
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc']::public.company_role[]));

create policy "defects_update" on public.defects
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','qc']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','qc']::public.company_role[]));

create policy "defects_delete" on public.defects
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager']::public.company_role[]));


-- =============================================================================
-- activity_events (append-only log)
-- =============================================================================
drop policy if exists "activity_select" on public.activity_events;
drop policy if exists "activity_insert" on public.activity_events;

create policy "activity_select" on public.activity_events
  for select to authenticated
  using (company_id in (select public.user_company_ids()));

create policy "activity_insert" on public.activity_events
  for insert to authenticated
  with check (company_id in (select public.user_company_ids()));


-- =============================================================================
-- leads (anyone INSERT; SELECT/UPDATE/DELETE — service_role only)
-- =============================================================================
drop policy if exists "leads_anyone_insert" on public.leads;

create policy "leads_anyone_insert" on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- Намеренно нет SELECT/UPDATE/DELETE политик — только service_role (бэкенд)
-- сможет читать лиды. Это защищает PII если фронт скомпрометирован.

-- Done.
