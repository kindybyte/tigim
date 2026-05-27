import { getSupabase } from "./supabase";
import { getEmployeeProductivity } from "./finance";
import type { ChartPoint, OrderStatus, Priority } from "../types";

// ---------- Types returned to the Dashboard page ----------

export interface DashboardOrder {
  id: string; // display number, e.g. "1045"
  product: string;
  client: string;
  qty: number;
  deadline: string;
  status: OrderStatus;
  progress: number;
  priority: Priority;
  responsible: string; // joined name or "—"
  dleft: number; // days remaining (negative = overdue)
}

export interface DashboardEmployee {
  id: string;
  name: string;
  role: string;
  stage: string;
  avatarColor: string;
  norm: number;
  monthDone: number;
  defectsPct: number;
  progressPct: number;
}

export interface DashboardMaterial {
  id: string;
  name: string;
  color: string;
  stock: number;
  minStock: number;
  unit: string;
}

export interface DashboardData {
  activeOrdersCount: number;
  inWorkCount: number;
  overdueCount: number;
  readyCount: number;
  monthDefectsQty: number;
  monthProfit: number;
  atRisk: DashboardOrder[];
  stageCounts: { name: OrderStatus; count: number; tone: string }[];
  topEmployees: DashboardEmployee[];
  lowStock: DashboardMaterial[];
  weeklyDefects: ChartPoint[];
  monthlyRevenue: ChartPoint[];
}

// ---------- Helpers ----------

const STAGES_FOR_BAR: OrderStatus[] = [
  "Новый", "Раскрой", "Пошив", "ОТК", "Упаковка", "Готово",
];

const STAGE_TONES: Record<OrderStatus, string> = {
  "Новый": "bg-ink-600",
  "Раскрой": "bg-sky-500",
  "Пошив": "bg-brand-500",
  "ОТК": "bg-violet-500",
  "Упаковка": "bg-amber-500",
  "Готово": "bg-emerald-500",
  "Отгружено": "bg-emerald-500",
  "Проблема": "bg-rose-500",
};

const RU_MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

const IN_WORK: OrderStatus[] = ["Раскрой", "Пошив", "ОТК", "Упаковка"];
const DONE: OrderStatus[] = ["Готово", "Отгружено"];

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function daysUntil(iso: string | null): number {
  if (!iso) return 99;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

function mondayKey(d: Date): string {
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 1 - day);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------- Main entry ----------

export async function getDashboardData(companyId: string): Promise<DashboardData> {
  const supabase = getSupabase();

  const [
    ordersRes,
    defectsRes,
    materialsRes,
    employeesRes,
    productivity,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, client, product, qty, unit_price, unit_cost, status, progress, priority, deadline, responsible_id, created_at")
      .eq("company_id", companyId),
    supabase.from("defects").select("qty, loss, date").eq("company_id", companyId),
    supabase
      .from("materials")
      .select("id, name, type, color, stock, min_stock, unit")
      .eq("company_id", companyId),
    supabase
      .from("employees")
      .select("id, name, role, stage, norm, salary, avatar_color")
      .eq("company_id", companyId)
      .neq("status", "fired"),
    getEmployeeProductivity(companyId),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (defectsRes.error) throw new Error(defectsRes.error.message);
  if (materialsRes.error) throw new Error(materialsRes.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);

  const orders = ordersRes.data ?? [];
  const defects = defectsRes.data ?? [];
  const materials = materialsRes.data ?? [];
  const employees = employeesRes.data ?? [];

  // Employees by id for quick joins
  const empById = new Map<string, { name: string; avatar_color: string | null }>();
  employees.forEach((e) => {
    empById.set(e.id, { name: e.name, avatar_color: e.avatar_color });
  });

  // ---------- Counts ----------
  const activeOrdersCount = orders.filter((o) => !DONE.includes(o.status as OrderStatus)).length;
  const inWorkCount = orders.filter((o) => IN_WORK.includes(o.status as OrderStatus)).length;
  const overdueCount = orders.filter(
    (o) => daysUntil(o.deadline) < 0 && !DONE.includes(o.status as OrderStatus),
  ).length;
  const readyCount = orders.filter((o) => DONE.includes(o.status as OrderStatus)).length;

  // ---------- This-month aggregates ----------
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthDefectsQty = defects
    .filter((d) => new Date(d.date) >= monthStart)
    .reduce((s, d) => s + d.qty, 0);

  // Month profit ≈ sum of (qty * (price-cost)) for orders created this month, minus defects loss this month
  const monthOrders = orders.filter((o) => new Date(o.created_at) >= monthStart);
  const orderProfitMonth = monthOrders.reduce(
    (s, o) => s + o.qty * (num(o.unit_price) - num(o.unit_cost)),
    0,
  );
  const monthDefectsLoss = defects
    .filter((d) => new Date(d.date) >= monthStart)
    .reduce((s, d) => s + num(d.loss), 0);
  const monthProfit = orderProfitMonth - monthDefectsLoss;

  // ---------- At-risk top 4 ----------
  const atRisk: DashboardOrder[] = orders
    .filter((o) => !DONE.includes(o.status as OrderStatus))
    .map((o) => ({
      id: o.number,
      product: o.product,
      client: o.client,
      qty: o.qty,
      deadline: o.deadline ?? "",
      status: o.status as OrderStatus,
      progress: o.progress,
      priority: o.priority as Priority,
      responsible: o.responsible_id
        ? empById.get(o.responsible_id)?.name ?? "—"
        : "—",
      dleft: daysUntil(o.deadline),
    }))
    .sort((a, b) => a.dleft - b.dleft)
    .slice(0, 4);

  // ---------- Stage counts ----------
  const stageCounts = STAGES_FOR_BAR.map((s) => ({
    name: s,
    count: orders.filter((o) => o.status === s).length,
    tone: STAGE_TONES[s],
  }));

  // ---------- Top employees by productivity ----------
  const topEmployees: DashboardEmployee[] = employees
    .map((e) => {
      const prod = productivity.get(e.id);
      const monthDone = prod?.monthDone ?? 0;
      const defectsPct = prod?.defectsPct ?? 0;
      const progressPct = e.norm > 0 ? Math.round((monthDone / e.norm) * 100) : 0;
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        stage: e.stage ?? "",
        avatarColor: e.avatar_color ?? "#2563EB",
        norm: e.norm,
        monthDone,
        defectsPct,
        progressPct,
      };
    })
    .filter((e) => e.norm > 0)
    .sort((a, b) => b.progressPct - a.progressPct)
    .slice(0, 5);

  // ---------- Low stock ----------
  const lowStock: DashboardMaterial[] = materials
    .filter((m) => m.type === "ткань")
    .map((m) => ({
      m,
      ratio: num(m.min_stock) > 0 ? num(m.stock) / num(m.min_stock) : 999,
    }))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5)
    .map(({ m }) => ({
      id: m.id,
      name: m.name,
      color: m.color ?? "",
      stock: num(m.stock),
      minStock: num(m.min_stock),
      unit: m.unit,
    }));

  // ---------- Weekly defects (last 5 ISO weeks) ----------
  const weekMap = new Map<string, number>();
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weekMap.set(mondayKey(d), 0);
  }
  defects.forEach((def) => {
    const d = new Date(def.date);
    const key = mondayKey(d);
    if (weekMap.has(key)) {
      weekMap.set(key, (weekMap.get(key) || 0) + def.qty);
    }
  });
  const weeklyDefects: ChartPoint[] = Array.from(weekMap.entries()).map(
    ([label, value]) => ({ label, value }),
  );

  // ---------- Monthly revenue (last 6 months, in thousands) ----------
  const today = new Date();
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: RU_MONTH_SHORT[d.getMonth()],
      value: 0,
    });
  }
  orders.forEach((o) => {
    const created = new Date(o.created_at);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) {
      m.value += o.qty * num(o.unit_price);
    }
  });
  const monthlyRevenue: ChartPoint[] = months.map((m) => ({
    label: m.label,
    value: Math.round(m.value / 1000),
  }));

  return {
    activeOrdersCount,
    inWorkCount,
    overdueCount,
    readyCount,
    monthDefectsQty,
    monthProfit,
    atRisk,
    stageCounts,
    topEmployees,
    lowStock,
    weeklyDefects,
    monthlyRevenue,
  };
}
