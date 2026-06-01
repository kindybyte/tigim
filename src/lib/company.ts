import { getSupabase } from "./supabase";
import type { Company } from "../types";

interface CompanyRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  plan: Company["plan"];
  usd_rate: number | string;
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
    trialEndsAt: row.trial_ends_at,
  };
}

export async function getCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await getSupabase()
    .from("companies")
    .select("id, name, phone, address, plan, usd_rate, trial_ends_at")
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
}

// Все «видимые» в UI системные роли (master намеренно скрыт — см. roadmap).
// Совпадает по значению с DB enum public.company_role.
export type VisibleRole = "owner" | "manager" | "warehouse" | "qc" | "staff";

export type RoleCounts = Record<VisibleRole, number> & { master?: number };

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
    warehouse: 0,
    qc: 0,
    staff: 0,
  };
  (data ?? []).forEach((row) => {
    const r = row.role as VisibleRole | "master";
    if (r in counts) {
      counts[r as VisibleRole] = (counts[r as VisibleRole] ?? 0) + 1;
    } else if (r === "master") {
      counts.master = (counts.master ?? 0) + 1;
    }
  });
  return counts;
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

  if (Object.keys(updates).length === 0) return;

  const { error } = await getSupabase()
    .from("companies")
    .update(updates)
    .eq("id", companyId);
  if (error) throw new Error(error.message);
}
