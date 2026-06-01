import { getSupabase } from "./supabase";
import type { Order, OrderStatus, Priority, SizeBreakdown, Stage, StageName, StageStatus } from "../types";

// --- DB row shapes ---

interface OrderRow {
  id: string;
  company_id: string;
  number: string;
  client: string;
  client_phone: string | null;
  product: string;
  fabric: string | null;
  colors: string[] | null;
  qty: number;
  unit_price: number | string;
  unit_cost: number | string;
  deadline: string | null;
  status: OrderStatus;
  progress: number;
  priority: Priority;
  responsible_id: string | null;
  comment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SizeRow {
  size: string;
  qty: number;
  done: number | null;
}

interface StageRow {
  id: string;
  name: StageName;
  status: StageStatus;
  position: number;
  responsible_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  progress: number;
  comment: string | null;
}

// --- Mappers ---

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapStage(s: StageRow, responsibleName?: string): Stage {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    responsible: responsibleName ?? "—",
    responsibleId: s.responsible_id ?? undefined,
    startedAt: s.started_at ?? undefined,
    finishedAt: s.finished_at ?? undefined,
    progress: s.progress,
    comment: s.comment ?? undefined,
  };
}

function mapOrder(
  row: OrderRow,
  sizes: SizeRow[] = [],
  stages: StageRow[] = [],
  responsibleNamesById: Record<string, string> = {},
  defectsCount = 0,
): Order {
  const unitPrice = num(row.unit_price);
  const unitCost = num(row.unit_cost);
  const revenue = unitPrice * row.qty;
  const cost = unitCost * row.qty;
  const profit = revenue - cost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  return {
    id: row.number, // we use number as display id (#1045)
    uuid: row.id,   // DB primary key — нужен для work_logs.order_id
    client: row.client,
    clientPhone: row.client_phone ?? "",
    product: row.product,
    fabric: row.fabric ?? "",
    colors: row.colors ?? [],
    sizes: sizes
      .slice()
      .sort((a, b) => a.size.localeCompare(b.size))
      .map<SizeBreakdown>((s) => ({ size: s.size, qty: s.qty, done: s.done ?? 0 })),
    qty: row.qty,
    deadline: row.deadline ?? "",
    status: row.status,
    progress: row.progress,
    responsible: row.responsible_id ? responsibleNamesById[row.responsible_id] ?? "—" : "—",
    unitPrice,
    unitCost,
    revenue,
    cost,
    profit,
    margin,
    priority: row.priority,
    comment: row.comment ?? undefined,
    stages: stages
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) =>
        mapStage(
          s,
          s.responsible_id ? responsibleNamesById[s.responsible_id] : undefined,
        ),
      ),
    defectsCount,
    costBreakdown: {
      fabric: 0,
      work: 0,
      accessories: 0,
      packaging: 0,
      defects: 0,
    },
  };
}

// --- Queries ---

export async function listOrders(companyId: string): Promise<Order[]> {
  const supabase = getSupabase();

  // Fetch orders + employees (for responsible names) + defect counts.
  const [{ data: ordersData, error: ordersErr }, { data: employeesData }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("employees").select("id, name").eq("company_id", companyId),
  ]);

  if (ordersErr) throw new Error(ordersErr.message);
  if (!ordersData) return [];

  const responsibleNamesById: Record<string, string> = {};
  employeesData?.forEach((e) => {
    responsibleNamesById[e.id] = e.name;
  });

  return (ordersData as OrderRow[]).map((row) =>
    mapOrder(row, [], [], responsibleNamesById, 0),
  );
}

export async function getOrderByNumber(
  companyId: string,
  numberStr: string,
): Promise<Order | null> {
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from("orders")
    .select("*, order_sizes(*), order_stages(*)")
    .eq("company_id", companyId)
    .eq("number", numberStr)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const { data: employeesData } = await supabase
    .from("employees")
    .select("id, name")
    .eq("company_id", companyId);

  const responsibleNamesById: Record<string, string> = {};
  employeesData?.forEach((e) => {
    responsibleNamesById[e.id] = e.name;
  });

  const { count: defectsCount } = await supabase
    .from("defects")
    .select("*", { count: "exact", head: true })
    .eq("order_id", row.id);

  return mapOrder(
    row as OrderRow,
    (row.order_sizes as SizeRow[] | null) ?? [],
    (row.order_stages as StageRow[] | null) ?? [],
    responsibleNamesById,
    defectsCount ?? 0,
  );
}

// --- Mutations ---

export interface NewOrderInput {
  client: string;
  clientPhone?: string;
  product: string;
  fabric?: string;
  colors: string[];
  qty: number;
  unitPrice: number;
  unitCost: number;
  deadline?: string;
  priority: Priority;
  responsibleId?: string;
  comment?: string;
  sizes: { size: string; qty: number }[];
}

export async function createOrder(companyId: string, input: NewOrderInput): Promise<string> {
  const supabase = getSupabase();

  // 1) Get next order number
  const { data: nextNum, error: numErr } = await supabase.rpc("next_order_number", {
    p_company_id: companyId,
  });
  if (numErr) throw new Error(numErr.message);
  const orderNumber = String(nextNum);

  // 2) Insert order (trigger auto-creates 6 default stages)
  const { data: orderRow, error: insErr } = await supabase
    .from("orders")
    .insert({
      company_id: companyId,
      number: orderNumber,
      client: input.client,
      client_phone: input.clientPhone || null,
      product: input.product,
      fabric: input.fabric || null,
      colors: input.colors,
      qty: input.qty,
      unit_price: input.unitPrice,
      unit_cost: input.unitCost,
      deadline: input.deadline || null,
      priority: input.priority,
      responsible_id: input.responsibleId || null,
      comment: input.comment || null,
    })
    .select("id, number")
    .single();

  if (insErr) throw new Error(insErr.message);

  // 3) Insert sizes if any
  if (input.sizes.length > 0) {
    const { error: sizesErr } = await supabase.from("order_sizes").insert(
      input.sizes.map((s) => ({
        order_id: orderRow.id,
        size: s.size,
        qty: s.qty,
      })),
    );
    if (sizesErr) {
      // Order is created; surface the sub-error but don't roll back manually.
      console.warn("[orders] sizes insert failed:", sizesErr.message);
    }
  }

  return orderRow.number;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  progress?: number,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("orders")
    .update({ status, ...(progress !== undefined ? { progress } : {}) })
    .eq("number", orderId);
  if (error) throw new Error(error.message);
}

export async function deleteOrder(orderNumber: string, companyId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("company_id", companyId)
    .eq("number", orderNumber);
  if (error) throw new Error(error.message);
}

/**
 * Subscribe to realtime INSERT/UPDATE/DELETE on the orders table for a given
 * company. Returns an unsubscribe function. Calls `onChange` on every event
 * — caller should debounce/refetch as needed.
 */
export function subscribeToOrders(companyId: string, onChange: () => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`orders:${companyId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `company_id=eq.${companyId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
