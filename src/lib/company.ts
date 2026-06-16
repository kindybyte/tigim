import { getSupabase } from "./supabase";
import type { Company, CostMode, WarehouseMode } from "../types";

interface CompanyRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  plan: Company["plan"];
  usd_rate: number | string;
  warehouse_mode: WarehouseMode | null;
  cost_mode: CostMode | null;
  trial_ends_at: string | null;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapRow(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    plan: row.plan,
    usdRate: num(row.usd_rate),
    warehouseMode: row.warehouse_mode ?? "full",
    costMode: row.cost_mode ?? "precise",
    trialEndsAt: row.trial_ends_at,
  };
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await getSupabase()
    .from("companies")
    .select("id, name, phone, address, plan, usd_rate, warehouse_mode, cost_mode, trial_ends_at")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as CompanyRow);
}

export interface UpdateCompanyInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  usdRate?: number;
  warehouseMode?: WarehouseMode;
  costMode?: CostMode;
}

// Все «видимые» в UI системные роли (master намеренно скрыт — см. roadmap).
// Совпадает по значению с DB enum public.company_role.
export type VisibleRole = "owner" | "manager" | "technologist" | "warehouse" | "qc" | "staff";

// Любая роль которая может прийти из БД (включая legacy master).
export type AnyRole = VisibleRole | "master";

export type RoleCounts = Record<VisibleRole, number> & { master?: number };

// ---------- Permission helpers (UI-side gating, не security boundary) ----------

/** Видит ли роль финансовые цифры: выручку, прибыль, маржу, расходы. */
export function canSeeFinance(role: AnyRole | null): boolean {
  return role === "owner" || role === "manager";
}

/** Может ли роль управлять командой и настройками компании. */
export function canManageCompany(role: AnyRole | null): boolean {
  return role === "owner";
}

/** Видит ли роль ИИ-помощника (он раскрывает финансы в ответах). */
export function canUseAi(role: AnyRole | null): boolean {
  return role === "owner" || role === "manager";
}

/**
 * Сколько у компании членов с каждой ролью. master сохраняется отдельно —
 * UI его не показывает, но если кто-то унаследован с этой ролью, важно
 * знать что он есть.
 */
export async function getRoleCounts(companyId: string): Promise<RoleCounts> {
  const { data, error } = await getSupabase()
    .from("company_members")
    .select("role")
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);

  const counts: RoleCounts = {
    owner: 0,
    manager: 0,
    technologist: 0,
    warehouse: 0,
    qc: 0,
    staff: 0,
  };
  (data ?? []).forEach((row) => {
    const r = row.role as AnyRole;
    if (r in counts) {
      counts[r as VisibleRole] = (counts[r as VisibleRole] ?? 0) + 1;
    } else if (r === "master") {
      counts.master = (counts.master ?? 0) + 1;
    }
  });
  return counts;
}

// ---------- Members ----------

export interface CompanyMember {
  id: string;            // company_members.id
  userId: string;        // profiles.id = auth.users.id
  fullName: string;
  role: VisibleRole | "master";
  joinedAt: string;
}

interface CompanyMemberRow {
  id: string;
  user_id: string;
  role: VisibleRole | "master";
  created_at: string;
  profiles?: { id: string; full_name: string | null } | null;
}

export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data, error } = await getSupabase()
    .from("company_members")
    .select(`id, user_id, role, created_at, profiles ( id, full_name )`)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as unknown as CompanyMemberRow[]) ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.profiles?.full_name ?? "—",
    role: r.role,
    joinedAt: r.created_at,
  }));
}

export async function updateMemberRole(
  memberId: string,
  role: VisibleRole,
): Promise<void> {
  const { error } = await getSupabase()
    .from("company_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("company_members")
    .delete()
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function updateCompany(
  companyId: string,
  patch: UpdateCompanyInput,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.phone !== undefined) updates.phone = patch.phone;
  if (patch.address !== undefined) updates.address = patch.address;
  if (patch.usdRate !== undefined) updates.usd_rate = patch.usdRate;
  if (patch.warehouseMode !== undefined) updates.warehouse_mode = patch.warehouseMode;
  if (patch.costMode !== undefined) updates.cost_mode = patch.costMode;

  if (Object.keys(updates).length === 0) return;

  const { error } = await getSupabase()
    .from("companies")
    .update(updates)
    .eq("id", companyId);
  if (error) throw new Error(error.message);
}
