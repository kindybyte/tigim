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
  name: StageName;
  status: StageStatus;
  responsible: string;
  startedAt?: string;
  finishedAt?: string;
  progress: number; // 0..100
  comment?: string;
}

export interface Order {
  id: string; // "1045"
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
  costBreakdown: {
    fabric: number;
    work: number;
    accessories: number;
    packaging: number;
    defects: number;
  };
}

export type MaterialType = "ткань" | "фурнитура" | "упаковка" | "нить";
export type MaterialUnit = "кг" | "м" | "шт" | "рул";

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  color: string;
  stock: number;
  unit: MaterialUnit;
  minStock: number;
  supplier: string;
  pricePerUnit: number;
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

export type EmployeeRole =
  | "Закройщик"
  | "Швея"
  | "ОТК"
  | "Упаковщик"
  | "Менеджер"
  | "Мастер цеха";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  stage: StageName;
  monthDone: number; // изделия за месяц
  defectsPct: number; // 0..100
  salary: number; // сом
  status: "active" | "vacation" | "sick";
  norm: number; // план в месяц
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
