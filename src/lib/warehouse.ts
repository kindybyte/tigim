import { getSupabase } from "./supabase";
import type { Currency, Material, MaterialType, MaterialUnit } from "../types";

// ---------- DB row shape ----------

interface MaterialRow {
  id: string;
  company_id: string;
  name: string;
  type: MaterialType;
  color: string | null;
  unit: MaterialUnit;
  stock: number | string;
  min_stock: number | string;
  price_per_unit: number | string;
  price_currency: Currency | null;
  supplier: string | null;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color ?? "",
    unit: row.unit,
    stock: num(row.stock),
    minStock: num(row.min_stock),
    supplier: row.supplier ?? "",
    pricePerUnit: num(row.price_per_unit),
    priceCurrency: row.price_currency ?? "KGS",
  };
}

// ---------- Queries ----------

export async function listMaterials(companyId: string): Promise<Material[]> {
  const { data, error } = await getSupabase()
    .from("materials")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MaterialRow[]).map(mapMaterial);
}

// ---------- Mutations ----------

export interface NewMaterialInput {
  name: string;
  type: MaterialType;
  color?: string;
  unit: MaterialUnit;
  stock?: number;
  minStock?: number;
  pricePerUnit?: number;
  priceCurrency?: Currency;
  supplier?: string;
}

export async function createMaterial(
  companyId: string,
  input: NewMaterialInput,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("materials")
    .insert({
      company_id: companyId,
      name: input.name,
      type: input.type,
      color: input.color || null,
      unit: input.unit,
      stock: input.stock ?? 0,
      min_stock: input.minStock ?? 0,
      price_per_unit: input.pricePerUnit ?? 0,
      price_currency: input.priceCurrency ?? "KGS",
      supplier: input.supplier || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateMaterial(
  materialId: string,
  patch: Partial<NewMaterialInput>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.color !== undefined) updates.color = patch.color || null;
  if (patch.unit !== undefined) updates.unit = patch.unit;
  if (patch.minStock !== undefined) updates.min_stock = patch.minStock;
  if (patch.pricePerUnit !== undefined) updates.price_per_unit = patch.pricePerUnit;
  if (patch.priceCurrency !== undefined) updates.price_currency = patch.priceCurrency;
  if (patch.supplier !== undefined) updates.supplier = patch.supplier || null;
  // Note: stock не редактируем напрямую — только через recordMovement.

  const { error } = await getSupabase().from("materials").update(updates).eq("id", materialId);
  if (error) throw new Error(error.message);
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const { error } = await getSupabase().from("materials").delete().eq("id", materialId);
  if (error) throw new Error(error.message);
}

export type MovementKind = "in" | "out" | "write_off";

export interface NewMovementInput {
  materialId: string;
  kind: MovementKind;
  qty: number;
  orderId?: string;
  note?: string;
}

/**
 * Записать движение материала. Триггер в БД автоматически обновит
 * materials.stock в той же транзакции.
 */
export async function recordMovement(companyId: string, input: NewMovementInput): Promise<void> {
  const { error } = await getSupabase().from("material_movements").insert({
    company_id: companyId,
    material_id: input.materialId,
    kind: input.kind,
    qty: input.qty,
    order_id: input.orderId || null,
    note: input.note || null,
  });
  if (error) throw new Error(error.message);
}

export function subscribeToMaterials(companyId: string, onChange: () => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`materials:${companyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "materials",
        filter: `company_id=eq.${companyId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
