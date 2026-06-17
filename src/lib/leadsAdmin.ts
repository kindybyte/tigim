// Админ-side операции с заявками. Работает только если у юзера
// profiles.is_platform_admin = true (RLS отрежет иначе).

import { getSupabase } from "./supabase";

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Новая",
  contacted: "Связались",
  qualified: "Квалифицирована",
  won: "Выиграна",
  lost: "Потеряна",
};

export const LEAD_STATUS_TONE: Record<LeadStatus, "brand" | "warning" | "success" | "danger" | "neutral"> = {
  new: "brand",
  contacted: "warning",
  qualified: "warning",
  won: "success",
  lost: "danger",
};

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  workshopType: string | null;
  teamSize: string | null;
  tier: string | null;
  comment: string | null;
  source: string | null;
  pageUrl: string | null;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
}

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  workshop_type: string | null;
  team_size: string | null;
  tier: string | null;
  comment: string | null;
  source: string | null;
  page_url: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
}

function map(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    workshopType: row.workshop_type,
    teamSize: row.team_size,
    tier: row.tier,
    comment: row.comment,
    source: row.source,
    pageUrl: row.page_url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_platform_admin");
  if (error) {
    console.warn("[admin] is_platform_admin rpc failed:", error.message);
    return false;
  }
  return data === true;
}

export async function listLeads(): Promise<Lead[]> {
  const { data, error } = await getSupabase()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as LeadRow[]).map(map);
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  const { error } = await getSupabase()
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function updateLeadNotes(leadId: string, notes: string): Promise<void> {
  const { error } = await getSupabase()
    .from("leads")
    .update({ notes: notes.trim() || null })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}

export async function deleteLead(leadId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("leads")
    .delete()
    .eq("id", leadId);
  if (error) throw new Error(error.message);
}
