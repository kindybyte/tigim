import { getSupabase } from "./supabase";
import type { OrderUnitRate, UnitRateCategory } from "../types";

interface UnitRateRow {
  id: string;
  order_id: string;
  category: UnitRateCategory;
  rate_per_piece: number | string;
}

export const UNIT_RATE_CATEGORIES: UnitRateCategory[] = [
  "accessories",
  "embroidery",
  "packaging",
  "other",
];

export const UNIT_RATE_LABELS: Record<UnitRateCategory, string> = {
  accessories: "Фурнитура",
  embroidery: "Вышивка / печать",
  packaging: "Упаковка",
  other: "Прочее",
};

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function map(row: UnitRateRow): OrderUnitRate {
  return {
    id: row.id,
    orderId: row.order_id,
    category: row.category,
    ratePerPiece: num(row.rate_per_piece),
  };
}

export async function listOrderUnitRates(orderId: string): Promise<OrderUnitRate[]> {
  const { data, error } = await getSupabase()
    .from("order_unit_rates")
    .select("*")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  return (data as UnitRateRow[]).map(map);
}

// Upsert по уникальному (order_id, category). rate_per_piece = 0 удаляет.
export async function setOrderUnitRate(
  orderId: string,
  category: UnitRateCategory,
  ratePerPiece: number,
): Promise<void> {
  const sb = getSupabase();
  if (ratePerPiece <= 0) {
    const { error } = await sb
      .from("order_unit_rates")
      .delete()
      .eq("order_id", orderId)
      .eq("category", category);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await sb
    .from("order_unit_rates")
    .upsert(
      {
        order_id: orderId,
        category,
        rate_per_piece: ratePerPiece,
      },
      { onConflict: "order_id,category" },
    );
  if (error) throw new Error(error.message);
}

export async function deleteOrderUnitRate(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("order_unit_rates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
