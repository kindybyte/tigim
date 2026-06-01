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
