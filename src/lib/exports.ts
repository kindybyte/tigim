import { getSupabase } from "./supabase";
import { getFinanceData } from "./finance";

// xlsx — ~280 KB после минификации. Грузим лениво в момент когда
// пользователь нажал «Скачать», а не на старте приложения.
// Тип импортируется без runtime-стоимости (import type).
type XLSXModule = typeof import("xlsx");

let xlsxPromise: Promise<XLSXModule> | null = null;
function loadXlsx(): Promise<XLSXModule> {
  if (!xlsxPromise) xlsxPromise = import("xlsx");
  return xlsxPromise;
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Excel ----------

export async function exportOrdersXlsx(companyId: string): Promise<void> {
  const XLSX = await loadXlsx();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("number, client, client_phone, product, fabric, qty, unit_price, unit_cost, deadline, status, progress, priority, comment, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((o) => ({
    "Номер": o.number,
    "Клиент": o.client,
    "Телефон": o.client_phone ?? "",
    "Изделие": o.product,
    "Ткань": o.fabric ?? "",
    "Количество": o.qty,
    "Цена за ед": Number(o.unit_price),
    "Себестоимость ед": Number(o.unit_cost),
    "Выручка": o.qty * Number(o.unit_price),
    "Прибыль": o.qty * (Number(o.unit_price) - Number(o.unit_cost)),
    "Дедлайн": o.deadline ?? "",
    "Статус": o.status,
    "Прогресс, %": o.progress,
    "Приоритет": o.priority,
    "Создан": new Date(o.created_at).toLocaleDateString("ru-RU"),
    "Комментарий": o.comment ?? "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Заказы");
  XLSX.writeFile(wb, `tigim-orders-${timestamp()}.xlsx`);
}

export async function exportDefectsXlsx(companyId: string): Promise<void> {
  const XLSX = await loadXlsx();
  const { data, error } = await getSupabase()
    .from("defects")
    .select("date, qty, reason, stage, loss, size, product, orders(number), employees(name)")
    .eq("company_id", companyId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((d) => ({
    "Дата": d.date,
    "Заказ": (d.orders as { number?: string } | null)?.number ?? "",
    "Изделие": d.product ?? "",
    "Размер": d.size ?? "",
    "Количество": d.qty,
    "Причина": d.reason,
    "Этап": d.stage ?? "",
    "Сотрудник": (d.employees as { name?: string } | null)?.name ?? "",
    "Потеря, сом": Number(d.loss),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Брак");
  XLSX.writeFile(wb, `tigim-defects-${timestamp()}.xlsx`);
}

export async function exportEmployeesXlsx(companyId: string): Promise<void> {
  const XLSX = await loadXlsx();
  const { data, error } = await getSupabase()
    .from("employees")
    .select("name, role, stage, norm, pay_type, salary, rate_per_piece, status")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((e) => ({
    "Имя": e.name,
    "Должность": e.role,
    "Этап": e.stage ?? "",
    "Норма, шт": e.norm,
    "Тип оплаты": e.pay_type === "per_piece" ? "сдельно" : "оклад",
    "Оклад, сом/мес": e.pay_type === "monthly" ? Number(e.salary) : "",
    "Ставка, сом/шт": e.pay_type === "per_piece" ? Number(e.rate_per_piece) : "",
    "Статус": e.status,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Сотрудники");
  XLSX.writeFile(wb, `tigim-employees-${timestamp()}.xlsx`);
}

export async function exportWarehouseXlsx(companyId: string): Promise<void> {
  const XLSX = await loadXlsx();
  const { data, error } = await getSupabase()
    .from("materials")
    .select("name, type, color, unit, stock, min_stock, price_per_unit, supplier")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((m) => ({
    "Материал": m.name,
    "Тип": m.type,
    "Цвет": m.color ?? "",
    "Ед.": m.unit,
    "Остаток": Number(m.stock),
    "Мин. остаток": Number(m.min_stock),
    "Цена за ед, сом": Number(m.price_per_unit),
    "Стоимость, сом": Number(m.stock) * Number(m.price_per_unit),
    "Поставщик": m.supplier ?? "",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Склад");
  XLSX.writeFile(wb, `tigim-warehouse-${timestamp()}.xlsx`);
}

export async function exportFinanceXlsx(companyId: string): Promise<void> {
  const XLSX = await loadXlsx();
  const data = await getFinanceData(companyId);

  const ordersRows = data.orderFinancials.map((o) => ({
    "Заказ": o.orderId,
    "Изделие": o.product,
    "Выручка, сом": o.revenue,
    "Ткань, сом": o.fabric,
    "Работа, сом": o.work,
    "Фурнитура, сом": o.accessories,
    "Упаковка, сом": o.packaging,
    "Брак, сом": o.defects,
    "Прибыль, сом": o.profit,
    "Маржа, %": o.margin,
  }));

  const statsRows = [
    { Показатель: "Выручка, сом", Значение: data.stats.revenue },
    { Показатель: "Себестоимость, сом", Значение: data.stats.cost },
    { Показатель: "Потери от брака, сом", Значение: data.stats.defectsLoss },
    { Показатель: "Прибыль, сом", Значение: data.stats.profit },
    { Показатель: "Зарплаты (фонд), сом", Значение: data.stats.salaries },
    { Показатель: "Заказов", Значение: data.stats.ordersCount },
    { Показатель: "Средняя прибыль с заказа, сом", Значение: data.stats.avgOrderProfit },
  ];

  const trendsRows = data.monthlyRevenue.map((m, i) => ({
    "Месяц": m.label,
    "Выручка, тыс. сом": m.value,
    "Прибыль, тыс. сом": data.monthlyProfit[i]?.value ?? 0,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), "Сводка");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersRows), "По заказам");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendsRows), "Помесячно");
  XLSX.writeFile(wb, `tigim-finance-${timestamp()}.xlsx`);
}

// ---------- PDF via browser print (нативный, без библиотек) ----------

export function printCurrentPage(): void {
  window.print();
}
