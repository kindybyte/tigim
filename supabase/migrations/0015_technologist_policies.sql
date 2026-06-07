-- =============================================================================
-- Tigim — migration 0015: RLS-политики для роли technologist
-- =============================================================================
-- Применять ПОСЛЕ 0014 (иначе значение enum ещё не существует).
--
-- Что может «Технолог»:
--   ✓ Заказы: создавать, редактировать, не удалять
--   ✓ Этапы / размеры: писать
--   ✓ Сотрудники: добавлять, изменять (не увольнять)
--   ✓ Материалы: добавлять, изменять (он же закупает фурнитуру)
--   ✓ Движения склада: приход / расход / списание
--   ✓ Брак: фиксировать (не удалять)
--   ✓ Выработка (work_logs): полный CRUD
--   ✓ Расходы по заказу: добавлять (фиксирует купленные материалы)
--   ✗ Удаление заказов / сотрудников / расходов — только owner/manager
--   ✗ Финансы / отчёты — гасятся в UI
--   ✗ Управление компанией / пользователями
-- =============================================================================


-- ---------- employees ----------
drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert" on public.employees
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));

drop policy if exists "employees_update" on public.employees;
create policy "employees_update" on public.employees
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));


-- ---------- materials (technologist может закупать) ----------
drop policy if exists "materials_insert" on public.materials;
create policy "materials_insert" on public.materials
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse','technologist']::public.company_role[]));

drop policy if exists "materials_update" on public.materials;
create policy "materials_update" on public.materials
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','warehouse','technologist']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse','technologist']::public.company_role[]));


-- ---------- material_movements ----------
drop policy if exists "material_movements_insert" on public.material_movements;
create policy "material_movements_insert" on public.material_movements
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','warehouse','master','technologist']::public.company_role[]));


-- ---------- orders ----------
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]));


-- ---------- order_sizes ----------
drop policy if exists "order_sizes_write" on public.order_sizes;
create policy "order_sizes_write" on public.order_sizes
  for all to authenticated
  using (public.user_can_write_order(order_id,
    array['owner','manager','master','technologist']::public.company_role[]))
  with check (public.user_can_write_order(order_id,
    array['owner','manager','master','technologist']::public.company_role[]));


-- ---------- order_stages ----------
drop policy if exists "order_stages_write" on public.order_stages;
create policy "order_stages_write" on public.order_stages
  for all to authenticated
  using (public.user_can_write_order(order_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]))
  with check (public.user_can_write_order(order_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]));


-- ---------- defects ----------
drop policy if exists "defects_insert" on public.defects;
create policy "defects_insert" on public.defects
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]));


-- ---------- work_logs ----------
drop policy if exists "work_logs_insert" on public.work_logs;
create policy "work_logs_insert" on public.work_logs
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','qc','technologist']::public.company_role[]));

drop policy if exists "work_logs_update" on public.work_logs;
create policy "work_logs_update" on public.work_logs
  for update to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]))
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));

drop policy if exists "work_logs_delete" on public.work_logs;
create policy "work_logs_delete" on public.work_logs
  for delete to authenticated
  using (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));


-- ---------- order_expenses ----------
-- Technologist может фиксировать купленные материалы; редактировать и
-- удалять — только owner/manager (финансовая чувствительность).
drop policy if exists "order_expenses_insert" on public.order_expenses;
create policy "order_expenses_insert" on public.order_expenses
  for insert to authenticated
  with check (public.has_role_in_company(company_id,
    array['owner','manager','master','technologist']::public.company_role[]));

-- Done.
