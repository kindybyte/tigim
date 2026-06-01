import { getSupabase } from "./supabase";
import type { OrderCostBreakdown } from "../types";

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

// ---------- Per-order real cost breakdown ----------

export function emptyCostBreakdown(): OrderCostBreakdown {
  return {
    fabric: 0,
    accessories: 0,
    packaging: 0,
    overhead: 0,
    other: 0,
    laborPerPiece: 0,
    laborMonthly: 0,
    work: 0,
    defects: 0,
    total: 0,
  };
}

/**
 * Реальная себестоимость заказа = ручные расходы (order_expenses) +
 * сдельная работа (work_logs × ставка сдельщика) + доля окладов
 * (пропорционально выработке месяца) + потери на браке.
 *
 * Доля окладов — динамическая: считается по выработке текущего месяца.
 * После закрытия месяца цифра «фиксируется» естественным образом, т.к.
 * новые work_logs туда уже не падают. Закрытие месяца руками не нужно.
 */
export async function getOrderCostBreakdown(
  companyId: string,
  orderUuid: string,
  orderQty: number,
): Promise<OrderCostBreakdown> {
  const supabase = getSupabase();
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const [
    expensesRes,
    orderLogsRes,
    monthLogsRes,
    employeesRes,
    defectsRes,
  ] = await Promise.all([
    supabase.from("order_expenses").select("category, amount").eq("order_id", orderUuid),
    supabase
      .from("work_logs")
      .select("qty, employee_id")
      .eq("order_id", orderUuid),
    supabase
      .from("work_logs")
      .select("qty, order_id")
      .eq("company_id", companyId)
      .gte("date", monthStart),
    supabase
      .from("employees")
      .select("id, salary, pay_type, rate_per_piece")
      .eq("company_id", companyId)
      .neq("status", "fired"),
    supabase.from("defects").select("loss").eq("order_id", orderUuid),
  ]);

  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (orderLogsRes.error) throw new Error(orderLogsRes.error.message);
  if (monthLogsRes.error) throw new Error(monthLogsRes.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (defectsRes.error) throw new Error(defectsRes.error.message);

  // Расходы по категориям
  const breakdown = emptyCostBreakdown();
  (expensesRes.data ?? []).forEach((e) => {
    const cat = e.category as keyof typeof breakdown;
    if (cat in breakdown) {
      (breakdown[cat] as number) += num(e.amount);
    }
  });

  // Per-piece labor: для логов где сотрудник сдельщик
  const empById = new Map(
    (employeesRes.data ?? []).map((e) => [e.id as string, e]),
  );
  let laborPerPiece = 0;
  (orderLogsRes.data ?? []).forEach((l) => {
    if (!l.employee_id) return;
    const emp = empById.get(l.employee_id);
    if (emp?.pay_type === "per_piece") {
      laborPerPiece += l.qty * num(emp.rate_per_piece);
    }
  });

  // Доля окладов: monthlySalaryFund × (qty заказа в месяце / общая qty месяца)
  const monthlySalaryFund = (employeesRes.data ?? [])
    .filter((e) => e.pay_type === "monthly")
    .reduce((s, e) => s + num(e.salary), 0);
  const monthTotal = (monthLogsRes.data ?? []).reduce((s, l) => s + l.qty, 0);
  const orderMonthQty = (monthLogsRes.data ?? [])
    .filter((l) => l.order_id === orderUuid)
    .reduce((s, l) => s + l.qty, 0);
  const laborMonthly =
    monthTotal > 0
      ? Math.round((monthlySalaryFund * orderMonthQty) / monthTotal)
      : 0;

  // Брак
  const defectsLoss = (defectsRes.data ?? []).reduce(
    (s, d) => s + num(d.loss),
    0,
  );

  breakdown.laborPerPiece = Math.round(laborPerPiece);
  breakdown.laborMonthly = laborMonthly;
  breakdown.work = breakdown.laborPerPiece + breakdown.laborMonthly;
  breakdown.defects = Math.round(defectsLoss);
  breakdown.total =
    breakdown.fabric +
    breakdown.accessories +
    breakdown.packaging +
    breakdown.overhead +
    breakdown.other +
    breakdown.work +
    breakdown.defects;

  // orderQty используется только для контракта функции (его читает вызов
  // выше для расчёта per-unit); сам breakdown в нём не нуждается.
  void orderQty;

  return breakdown;
}

// ---------- Employee productivity ----------

/**
 * Per-employee monthDone (sum qty from work_logs за текущий месяц) и
 * defectsPct (брак сотрудника / его выработка * 100).
 *
 * До добавления work_logs (миграция 0009) monthDone был эвристикой — qty
 * заказов где сотрудник стоял "ответственным". Теперь это честная сумма
 * фактической выработки, которая идёт прямо в сдельную оплату.
 */
export async function getEmployeeProductivity(
  companyId: string,
): Promise<Map<string, EmployeeProductivity>> {
  const supabase = getSupabase();

  const monthStartIso = startOfMonth(new Date()).toISOString();
  const monthStartDate = monthStartIso.slice(0, 10);

  const [{ data: logs }, { data: defects }] = await Promise.all([
    supabase
      .from("work_logs")
      .select("qty, employee_id, date")
      .eq("company_id", companyId)
      .gte("date", monthStartDate),
    supabase
      .from("defects")
      .select("qty, employee_id, date")
      .eq("company_id", companyId)
      .gte("date", monthStartDate),
  ]);

  const map = new Map<string, EmployeeProductivity>();

  (logs ?? []).forEach((l) => {
    if (!l.employee_id) return;
    const existing = map.get(l.employee_id) ?? {
      employeeId: l.employee_id,
      monthDone: 0,
      defectsQty: 0,
      defectsPct: 0,
    };
    existing.monthDone += l.qty;
    map.set(l.employee_id, existing);
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

  for (const v of map.values()) {
    v.defectsPct = v.monthDone > 0 ? Math.round((v.defectsQty / v.monthDone) * 1000) / 10 : 0;
  }

  return map;
}
