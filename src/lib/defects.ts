import { getSupabase } from "./supabase";
import type { Defect, DefectReason, StageName } from "../types";

interface DefectRow {
  id: string;
  company_id: string;
  order_id: string | null;
  date: string;
  product: string | null;
  size: string | null;
  qty: number;
  reason: DefectReason;
  stage: StageName | null;
  employee_id: string | null;
  loss: number | string;
  photo_url: string | null;
  orders?: { number: string; product: string } | null;
  employees?: { name: string } | null;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapDefect(row: DefectRow): Defect & { photoUrl?: string } {
  return {
    id: row.id,
    date: row.date,
    orderId: row.orders?.number ?? "—",
    product: row.product ?? row.orders?.product ?? "—",
    size: row.size ?? "—",
    qty: row.qty,
    reason: row.reason,
    employee: row.employees?.name ?? "—",
    stage: row.stage ?? "Пошив",
    loss: num(row.loss),
    photoUrl: row.photo_url ?? undefined,
  };
}

export async function listDefects(companyId: string): Promise<(Defect & { photoUrl?: string })[]> {
  const { data, error } = await getSupabase()
    .from("defects")
    .select("*, orders(number, product), employees(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DefectRow[]).map(mapDefect);
}

export interface NewDefectInput {
  orderNumber?: string;
  date?: string;
  product?: string;
  size?: string;
  qty: number;
  reason: DefectReason;
  stage: StageName;
  loss: number;
  employeeId?: string;
  photoFile?: File;
}

export async function createDefect(companyId: string, input: NewDefectInput): Promise<string> {
  const supabase = getSupabase();

  // Resolve order id if number provided
  let orderId: string | null = null;
  let resolvedProduct: string | undefined = input.product;
  if (input.orderNumber) {
    const { data: order, error: ordErr } = await supabase
      .from("orders")
      .select("id, product")
      .eq("company_id", companyId)
      .eq("number", input.orderNumber)
      .maybeSingle();
    if (ordErr) throw new Error(ordErr.message);
    orderId = order?.id ?? null;
    if (!resolvedProduct && order?.product) resolvedProduct = order.product;
  }

  // 1) Insert defect row
  const { data: row, error: insErr } = await supabase
    .from("defects")
    .insert({
      company_id: companyId,
      order_id: orderId,
      date: input.date || new Date().toISOString().slice(0, 10),
      product: resolvedProduct || null,
      size: input.size || null,
      qty: input.qty,
      reason: input.reason,
      stage: input.stage,
      loss: input.loss,
      employee_id: input.employeeId || null,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);

  // 2) Upload photo if provided
  if (input.photoFile) {
    const ext = input.photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${companyId}/${row.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("defect-photos")
      .upload(path, input.photoFile, { upsert: true, contentType: input.photoFile.type });
    if (upErr) {
      console.warn("[defects] photo upload failed:", upErr.message);
    } else {
      const { data: pub } = supabase.storage.from("defect-photos").getPublicUrl(path);
      await supabase.from("defects").update({ photo_url: pub.publicUrl }).eq("id", row.id);
    }
  }

  return row.id;
}

export async function deleteDefect(defectId: string): Promise<void> {
  const { error } = await getSupabase().from("defects").delete().eq("id", defectId);
  if (error) throw new Error(error.message);
}

export function subscribeToDefects(companyId: string, onChange: () => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`defects:${companyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "defects",
        filter: `company_id=eq.${companyId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Fetch orders list as { number, product, unitCost } for the dropdown. */
export async function listOrdersForDefect(
  companyId: string,
): Promise<{ number: string; product: string; unitCost: number }[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("number, product, unit_cost")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as { number: string; product: string; unit_cost: number | string }[]).map((r) => ({
    number: r.number,
    product: r.product,
    unitCost: num(r.unit_cost),
  }));
}
