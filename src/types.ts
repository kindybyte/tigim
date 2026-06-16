export type OrderStatus =
  | "Новый"
  | "Раскрой"
  | "Пошив"
  | "ОТК"
  | "Упаковка"
  | "Готово"
  | "Отгружено"
  | "Проблема";

export type StageName =
  | "Раскрой"
  | "Печать/вышивка"
  | "Пошив"
  | "ОТК"
  | "Упаковка"
  | "Готово";

export type StageStatus = "Ожидает" | "В работе" | "Завершено" | "Проблема";

export type Priority = "low" | "normal" | "high";

export interface SizeBreakdown {
  size: string;
  qty: number;
  done?: number;
}

export interface Stage {
  id?: string; // DB uuid — отсутствует у моков, есть у реальных данных
  name: StageName;
  status: StageStatus;
  responsible: string;
  responsibleId?: string;
  startedAt?: string;
  finishedAt?: string;
  progress: number; // 0..100
  comment?: string;
}

export interface Order {
  id: string; // "1045" (display number)
  uuid?: string; // DB primary key — отсутствует у моков, есть у реальных данных
  client: string;
  clientPhone: string;
  product: string;
  fabric: string;
  colors: string[];
  sizes: SizeBreakdown[];
  qty: number;
  deadline: string; // ISO yyyy-mm-dd
  status: OrderStatus;
  progress: number; // 0..100
  responsible: string;
  unitPrice: number; // сом
  unitCost: number; // сом
  revenue: number; // сом
  cost: number; // сом
  profit: number; // сом
  margin: number; // %
  priority: Priority;
  comment?: string;
  stages: Stage[];
  defectsCount: number;
  costBreakdown: OrderCostBreakdown;
}

export type ExpenseCategory =
  | "fabric"
  | "accessories"
  | "packaging"
  | "overhead"
  | "other";

export interface OrderExpense {
  id: string;
  orderId: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  date: string;
  sourceMovementId: string | null;
  createdAt: string;
}

export interface OrderCostBreakdown {
  // Ручные/складские расходы по категориям
  fabric: number;
  accessories: number;
  packaging: number;
  overhead: number;
  other: number;
  // Работа
  laborPerPiece: number;   // сдельщики: Σ work_logs.qty × rate_per_piece
  laborMonthly: number;    // доля окладов, разнесённая пропорционально выработке месяца
  // Per-unit ставки × фактический выход (только post_cut режим)
  unitRates: {
    accessories: number;
    embroidery: number;
    packaging: number;
    other: number;
  };
  actualOutput: number;    // суммарный фактический выход (sum order_sizes.qty)
  // Аггрегаты для обратной совместимости
  work: number;            // = laborPerPiece + laborMonthly
  defects: number;
  total: number;           // сумма всего
}

export type MaterialType = "ткань" | "фурнитура" | "упаковка" | "нить";
export type MaterialUnit = "кг" | "м" | "шт" | "рул";

export type Currency = "KGS" | "USD";

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  color: string;
  stock: number;
  unit: MaterialUnit;
  minStock: number;
  supplier: string;
  pricePerUnit: number;          // в исходной валюте (priceCurrency)
  priceCurrency: Currency;
}

export type WarehouseMode = "simple" | "full";

// precise = указываешь себестоимость вручную при создании заказа (как раньше).
// post_cut = себес считается автоматически из расходов + per-unit ставок × выход.
export type CostMode = "precise" | "post_cut";

export type UnitRateCategory = "accessories" | "embroidery" | "packaging" | "other";

export interface OrderUnitRate {
  id: string;
  orderId: string;
  category: UnitRateCategory;
  ratePerPiece: number;
}

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  plan: "trial" | "start" | "pro" | "factory";
  usdRate: number;               // курс USD→KGS, дефолт 88
  warehouseMode: WarehouseMode;  // simple = упрощённый UI склада, full = со всеми полями
  costMode: CostMode;            // precise = ручной unit_cost, post_cut = автосчёт
  trialEndsAt: string | null;
}

export interface Defect {
  id: string;
  date: string;
  orderId: string;
  product: string;
  size: string;
  qty: number;
  reason: DefectReason;
  employee: string;
  stage: StageName;
  loss: number; // сом
}

export type DefectReason =
  | "Неровный шов"
  | "Пятно на ткани"
  | "Неправильный размер"
  | "Ошибка в крое"
  | "Ошибка вышивки/печати"
  | "Повреждение ткани";

// Distinct from a literal union: real workshops have roles outside the original
// six (Технолог, Кладовщик, Контролёр ОТК, etc.). Stored as free text.
export type EmployeeRole = string;

// Подсказки в выпадашке формы. Можно ввести и любую другую должность.
export const COMMON_EMPLOYEE_ROLES = [
  "Швея",
  "Закройщик",
  "ОТК",
  "Упаковщик",
  "Мастер цеха",
  "Менеджер",
  "Технолог",
  "Кладовщик",
  "Гладильщик",
] as const;

export type PayType = "monthly" | "per_piece";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  // null = «не назначен на конкретный этап» — это валидно для технолога,
  // мастера, менеджера и других руководящих позиций.
  stage: StageName | null;
  monthDone: number; // изделия за месяц
  defectsPct: number; // 0..100
  payType: PayType;
  salary: number; // сом — для monthly: оклад; для per_piece: фикс/аванс (часто 0)
  ratePerPiece: number; // сом за единицу при сдельной оплате
  status: "active" | "vacation" | "sick";
  norm: number; // план в месяц (только для monthly)
  avatarColor: string;
}

export interface ActivityEvent {
  id: string;
  time: string; // "10:42"
  text: string;
  type: "order" | "defect" | "stock" | "employee" | "finance";
}

export interface ChartPoint {
  label: string;
  value: number;
}
