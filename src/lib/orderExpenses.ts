import { getSupabase } from "./supabase";
import type { ExpenseCategory, OrderExpense } from "../types";

interface OrderExpenseRow {
  id: string;
  company_id: string;
  order_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number | string;
  date: string;
  source_movement_id: string | null;
  created_by: string | null;
  created_at: string;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapRow(row: OrderExpenseRow): OrderExpense {
  return {
    id: row.id,
    orderId: row.order_id,
    category: row.category,
    description: row.description,
    amount: num(row.amount),
    date: row.date,
    sourceMovementId: row.source_movement_id,
    createdAt: row.created_at,
  };
}

export const CATEGORY_LABEL_RU: Record<ExpenseCategory, string> = {
  fabric: "Ткань",
  accessories: "Фурнитура",
  packaging: "Упаковка",
  overhead: "Накладные",
  other: "Прочее",
};

export async function listOrderExpenses(orderId: string): Promise<OrderExpense[]> {
  const { data, error } = await getSupabase()
    .from("order_expenses")
    .select("*")
    .eq("order_id", orderId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as OrderExpenseRow[]).map(mapRow);
}

export interface NewOrderExpenseInput {
  orderId: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  date?: string;
}

export async function createOrderExpense(
  companyId: string,
  createdBy: string | null,
  input: NewOrderExpenseInput,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("order_expenses")
    .insert({
      company_id: companyId,
      order_id: input.orderId,
      category: input.category,
      description: input.description?.trim() || null,
      amount: input.amount,
      date: input.date || new Date().toISOString().slice(0, 10),
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteOrderExpense(id: string): Promise<void> {
  const { error } = await getSupabase().from("order_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeToOrderExpenses(
  orderId: string,
  onChange: () => void,
): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`order_expenses:${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_expenses",
        filter: `order_id=eq.${orderId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
