import { getSupabase } from "./supabase";

// ---------- Types returned to UI ----------

export interface OrderFinancialsRow {
  orderId: string; // human-readable order number
  product: string;
  revenue: number;
  fabric: number;
  work: number;
  accessories: number;
  packaging: number;
  defects: number;
  profit: number;
  margin: number;
}

export interface OverallStats {
  revenue: number;
  cost: number;
  profit: number;
  salaries: number;
  defectsLoss: number;
  avgOrderProfit: number;
  ordersCount: number;
}

export interface MonthPoint {
  label: string;
  value: number; // in thousands of som for charts
}

export interface EmployeeProductivity {
  employeeId: string;
  monthDone: number;
  defectsQty: number;
  defectsPct: number;
}

// ---------- Helpers ----------

const RU_MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// ---------- Queries ----------

/**
 * Polls everything we need for /app/finance in a few parallel queries.
 * Aggregation is done client-side — that's fine at MVP scale per company.
 */
export async function getFinanceData(companyId: string): Promise<{
  stats: OverallStats;
  orderFinancials: OrderFinancialsRow[];
  monthlyRevenue: MonthPoint[];
  monthlyProfit: MonthPoint[];
  expensesByCategory: { label: string; value: number }[];
}> {
  const supabase = getSupabase();

  const [
    { data: orders, error: oErr },
    { data: defects, error: dErr },
    { data: employees, error: eErr },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, product, qty, unit_price, unit_cost, created_at")
      .eq("company_id", companyId),
    supabase.from("defects").select("order_id, qty, loss, date").eq("company_id", companyId),
    supabase.from("employees").select("salary").eq("company_id", companyId).neq("status", "fired"),
  ]);

  if (oErr) throw new Error(oErr.message);
  if (dErr) throw new Error(dErr.message);
  if (eErr) throw new Error(eErr.message);

  // Aggregate defects loss per order
  const lossByOrder = new Map<string, number>();
  defects?.forEach((d) => {
    if (d.order_id) {
      lossByOrder.set(d.order_id, (lossByOrder.get(d.order_id) || 0) + num(d.loss));
    }
  });

  // Per-order financials
  const orderFinancials: OrderFinancialsRow[] = (orders ?? []).map((o) => {
    const qty = o.qty;
    const revenue = qty * num(o.unit_price);
    const baseCost = qty * num(o.unit_cost);
    const fabric = Math.round(baseCost * 0.4);
    const work = Math.round(baseCost * 0.35);
    const accessories = Math.round(baseCost * 0.15);
    const packaging = Math.round(baseCost * 0.1);
    const defectsLoss = lossByOrder.get(o.id) || 0;
    const totalCost = baseCost + defectsLoss;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return {
      orderId: o.number,
      product: o.product,
      revenue,
      fabric,
      work,
      accessories,
      packaging,
      defects: defectsLoss,
      profit,
      margin,
    };
  });

  // Overall stats
  const revenue = orderFinancials.reduce((s, o) => s + o.revenue, 0);
  const cost = orderFinancials.reduce(
    (s, o) => s + o.fabric + o.work + o.accessories + o.packaging,
    0,
  );
  const defectsLoss = orderFinancials.reduce((s, o) => s + o.defects, 0);
  const profit = revenue - cost - defectsLoss;
  const salaries = (employees ?? []).reduce((s, e) => s + num(e.salary), 0);
  const ordersCount = orderFinancials.length;
  const avgOrderProfit = ordersCount > 0 ? Math.round(profit / ordersCount) : 0;

  const stats: OverallStats = {
    revenue,
    cost,
    profit,
    salaries,
    defectsLoss,
    avgOrderProfit,
    ordersCount,
  };

  // Last 6 months trends
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: RU_MONTH_SHORT[d.getMonth()] });
  }

  const revByMonth = new Map<string, number>();
  const profitByMonth = new Map<string, number>();

  (orders ?? []).forEach((o) => {
    const created = new Date(o.created_at);
    const key = monthKey(startOfMonth(created));
    const orev = o.qty * num(o.unit_price);
    const ocost = o.qty * num(o.unit_cost) + (lossByOrder.get(o.id) || 0);
    const oprof = orev - ocost;
    revByMonth.set(key, (revByMonth.get(key) || 0) + orev);
    profitByMonth.set(key, (profitByMonth.get(key) || 0) + oprof);
  });

  const monthlyRevenue: MonthPoint[] = months.map((m) => ({
    label: m.label,
    value: Math.round((revByMonth.get(m.key) || 0) / 1000),
  }));
  const monthlyProfit: MonthPoint[] = months.map((m) => ({
    label: m.label,
    value: Math.round((profitByMonth.get(m.key) || 0) / 1000),
  }));

  // Expenses pie
  const fabricTotal = orderFinancials.reduce((s, o) => s + o.fabric, 0);
  const workTotal = orderFinancials.reduce((s, o) => s + o.work, 0);
  const accTotal = orderFinancials.reduce((s, o) => s + o.accessories, 0);
  const packTotal = orderFinancials.reduce((s, o) => s + o.packaging, 0);

  const expensesByCategory = [
    { label: "Ткань", value: Math.round(fabricTotal / 1000) },
    { label: "Работа", value: Math.round(workTotal / 1000) },
    { label: "Фурнитура", value: Math.round(accTotal / 1000) },
    { label: "Упаковка", value: Math.round(packTotal / 1000) },
    { label: "Брак", value: Math.round(defectsLoss / 1000) },
  ].filter((e) => e.value > 0);

  return { stats, orderFinancials, monthlyRevenue, monthlyProfit, expensesByCategory };
}

// ---------- Employee productivity ----------

/**
 * Per-employee monthDone (sum qty of orders they were responsible for,
 * this month) and defectsPct (their defects / their qty * 100).
 */
export async function getEmployeeProductivity(
  companyId: string,
): Promise<Map<string, EmployeeProductivity>> {
  const supabase = getSupabase();

  const monthStart = startOfMonth(new Date()).toISOString();

  const [{ data: orders }, { data: defects }] = await Promise.all([
    supabase
      .from("orders")
      .select("qty, responsible_id, created_at")
      .eq("company_id", companyId)
      .gte("created_at", monthStart),
    supabase
      .from("defects")
      .select("qty, employee_id, date")
      .eq("company_id", companyId)
      .gte("date", monthStart.slice(0, 10)),
  ]);

  const map = new Map<string, EmployeeProductivity>();

  (orders ?? []).forEach((o) => {
    if (!o.responsible_id) return;
    const existing = map.get(o.responsible_id) ?? {
      employeeId: o.responsible_id,
      monthDone: 0,
      defectsQty: 0,
      defectsPct: 0,
    };
    existing.monthDone += o.qty;
    map.set(o.responsible_id, existing);
  });

  (defects ?? []).forEach((d) => {
    if (!d.employee_id) return;
    const existing = map.get(d.employee_id) ?? {
      employeeId: d.employee_id,
      monthDone: 0,
      defectsQty: 0,
      defectsPct: 0,
    };
    existing.defectsQty += d.qty;
    map.set(d.employee_id, existing);
  });

  // Compute pct
  for (const v of map.values()) {
    v.defectsPct = v.monthDone > 0 ? Math.round((v.defectsQty / v.monthDone) * 1000) / 10 : 0;
  }

  return map;
}
