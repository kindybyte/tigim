import type {
  ActivityEvent,
  ChartPoint,
  Defect,
  Employee,
  Material,
  Order,
  OrderCostBreakdown,
} from "../types";

// Демо-моки не различают сдельную и окладную работу — кладём всё в labourPerPiece.
function mockCost(
  fabric: number,
  work: number,
  accessories: number,
  packaging: number,
  defects: number,
): OrderCostBreakdown {
  return {
    fabric,
    accessories,
    packaging,
    overhead: 0,
    other: 0,
    laborPerPiece: work,
    laborMonthly: 0,
    work,
    defects,
    total: fabric + accessories + packaging + work + defects,
  };
}

export const company = {
  name: "Цех «Бишкек Текстиль»",
  address: "г. Бишкек, ул. Льва Толстого, 17",
  phone: "+996 555 12 34 56",
  currency: "сом",
  owner: "Айбек Турдубеков",
};

export const orders: Order[] = [
  {
    id: "1045",
    client: 'ИП "Айзаада"',
    clientPhone: "+996 555 11 22 33",
    product: "Футболка «Холодок»",
    fabric: "Холодок 180",
    colors: ["Чёрный", "Белый"],
    sizes: [
      { size: "S", qty: 150, done: 110 },
      { size: "M", qty: 300, done: 220 },
      { size: "L", qty: 350, done: 200 },
      { size: "XL", qty: 200, done: 90 },
    ],
    qty: 1000,
    deadline: "2026-05-28",
    status: "Пошив",
    progress: 62,
    responsible: "Гульнара А.",
    unitPrice: 420,
    unitCost: 280,
    revenue: 420000,
    cost: 280000,
    profit: 140000,
    margin: 33,
    priority: "high",
    comment: "Срочный заказ, клиент звонил утром",
    stages: [
      {
        name: "Раскрой",
        status: "Завершено",
        responsible: "Эркин Б.",
        startedAt: "2026-05-18",
        finishedAt: "2026-05-20",
        progress: 100,
      },
      {
        name: "Печать/вышивка",
        status: "Завершено",
        responsible: "Айнура К.",
        startedAt: "2026-05-21",
        finishedAt: "2026-05-22",
        progress: 100,
      },
      {
        name: "Пошив",
        status: "В работе",
        responsible: "Бригада №2",
        startedAt: "2026-05-22",
        progress: 62,
        comment: "Нужна вторая швея для ускорения",
      },
      { name: "ОТК", status: "Ожидает", responsible: "Назгуль О.", progress: 0 },
      { name: "Упаковка", status: "Ожидает", responsible: "Чолпон С.", progress: 0 },
      { name: "Готово", status: "Ожидает", responsible: "—", progress: 0 },
    ],
    defectsCount: 14,
    costBreakdown: mockCost(120000, 95000, 25000, 12000, 5800),
  },
  {
    id: "1046",
    client: 'Бренд "Almazza"',
    clientPhone: "+996 700 44 55 66",
    product: "Худи oversize",
    fabric: "Трёхнитка с начёсом",
    colors: ["Серый меланж", "Бордовый"],
    sizes: [
      { size: "S", qty: 60, done: 60 },
      { size: "M", qty: 90, done: 80 },
      { size: "L", qty: 90, done: 40 },
      { size: "XL", qty: 60, done: 0 },
    ],
    qty: 300,
    deadline: "2026-05-30",
    status: "Раскрой",
    progress: 28,
    responsible: "Бакыт М.",
    unitPrice: 1450,
    unitCost: 960,
    revenue: 435000,
    cost: 288000,
    profit: 147000,
    margin: 34,
    priority: "normal",
    comment: "Требуется образец перед упаковкой",
    stages: [
      {
        name: "Раскрой",
        status: "В работе",
        responsible: "Эркин Б.",
        startedAt: "2026-05-23",
        progress: 80,
      },
      { name: "Печать/вышивка", status: "Ожидает", responsible: "Айнура К.", progress: 0 },
      { name: "Пошив", status: "Ожидает", responsible: "Бригада №1", progress: 0 },
      { name: "ОТК", status: "Ожидает", responsible: "Назгуль О.", progress: 0 },
      { name: "Упаковка", status: "Ожидает", responsible: "Чолпон С.", progress: 0 },
      { name: "Готово", status: "Ожидает", responsible: "—", progress: 0 },
    ],
    defectsCount: 3,
    costBreakdown: mockCost(165000, 84000, 24000, 9000, 1200),
  },
  {
    id: "1047",
    client: 'Школа №62',
    clientPhone: "+996 312 45 67 89",
    product: "Школьная форма",
    fabric: "Габардин",
    colors: ["Тёмно-синий"],
    sizes: [
      { size: "28", qty: 120, done: 120 },
      { size: "30", qty: 200, done: 200 },
      { size: "32", qty: 200, done: 180 },
      { size: "34", qty: 180, done: 160 },
    ],
    qty: 700,
    deadline: "2026-06-02",
    status: "ОТК",
    progress: 86,
    responsible: "Назгуль О.",
    unitPrice: 980,
    unitCost: 640,
    revenue: 686000,
    cost: 448000,
    profit: 238000,
    margin: 35,
    priority: "high",
    comment: "Большой контракт, повтор возможен",
    stages: [
      {
        name: "Раскрой",
        status: "Завершено",
        responsible: "Эркин Б.",
        startedAt: "2026-05-10",
        finishedAt: "2026-05-14",
        progress: 100,
      },
      { name: "Печать/вышивка", status: "Завершено", responsible: "Айнура К.", startedAt: "2026-05-14", finishedAt: "2026-05-16", progress: 100 },
      { name: "Пошив", status: "Завершено", responsible: "Бригада №1", startedAt: "2026-05-16", finishedAt: "2026-05-23", progress: 100 },
      { name: "ОТК", status: "В работе", responsible: "Назгуль О.", startedAt: "2026-05-24", progress: 70 },
      { name: "Упаковка", status: "Ожидает", responsible: "Чолпон С.", progress: 0 },
      { name: "Готово", status: "Ожидает", responsible: "—", progress: 0 },
    ],
    defectsCount: 22,
    costBreakdown: mockCost(210000, 168000, 38000, 20000, 12000),
  },
  {
    id: "1048",
    client: 'Кафе "Plov House"',
    clientPhone: "+996 707 22 88 99",
    product: "Поварская форма",
    fabric: "Сатори",
    colors: ["Белый"],
    sizes: [
      { size: "M", qty: 20, done: 0 },
      { size: "L", qty: 40, done: 0 },
      { size: "XL", qty: 20, done: 0 },
    ],
    qty: 80,
    deadline: "2026-06-10",
    status: "Новый",
    progress: 0,
    responsible: "Бакыт М.",
    unitPrice: 1200,
    unitCost: 780,
    revenue: 96000,
    cost: 62400,
    profit: 33600,
    margin: 35,
    priority: "low",
    stages: [
      { name: "Раскрой", status: "Ожидает", responsible: "Эркин Б.", progress: 0 },
      { name: "Печать/вышивка", status: "Ожидает", responsible: "Айнура К.", progress: 0 },
      { name: "Пошив", status: "Ожидает", responsible: "Бригада №1", progress: 0 },
      { name: "ОТК", status: "Ожидает", responsible: "Назгуль О.", progress: 0 },
      { name: "Упаковка", status: "Ожидает", responsible: "Чолпон С.", progress: 0 },
      { name: "Готово", status: "Ожидает", responsible: "—", progress: 0 },
    ],
    defectsCount: 0,
    costBreakdown: mockCost(0, 0, 0, 0, 0),
  },
  {
    id: "1049",
    client: 'OOO "Жибек Жолу"',
    clientPhone: "+996 555 33 44 55",
    product: "Спортивные шорты",
    fabric: "Лакоста спорт",
    colors: ["Чёрный", "Синий"],
    sizes: [
      { size: "S", qty: 100, done: 100 },
      { size: "M", qty: 150, done: 150 },
      { size: "L", qty: 100, done: 100 },
      { size: "XL", qty: 50, done: 50 },
    ],
    qty: 400,
    deadline: "2026-05-22",
    status: "Готово",
    progress: 100,
    responsible: "Гульнара А.",
    unitPrice: 520,
    unitCost: 340,
    revenue: 208000,
    cost: 136000,
    profit: 72000,
    margin: 35,
    priority: "normal",
    stages: [
      { name: "Раскрой", status: "Завершено", responsible: "Эркин Б.", startedAt: "2026-05-04", finishedAt: "2026-05-06", progress: 100 },
      { name: "Печать/вышивка", status: "Завершено", responsible: "Айнура К.", startedAt: "2026-05-06", finishedAt: "2026-05-07", progress: 100 },
      { name: "Пошив", status: "Завершено", responsible: "Бригада №2", startedAt: "2026-05-08", finishedAt: "2026-05-16", progress: 100 },
      { name: "ОТК", status: "Завершено", responsible: "Назгуль О.", startedAt: "2026-05-17", finishedAt: "2026-05-19", progress: 100 },
      { name: "Упаковка", status: "Завершено", responsible: "Чолпон С.", startedAt: "2026-05-19", finishedAt: "2026-05-20", progress: 100 },
      { name: "Готово", status: "Завершено", responsible: "—", finishedAt: "2026-05-21", progress: 100 },
    ],
    defectsCount: 8,
    costBreakdown: mockCost(64000, 50000, 14000, 5000, 3000),
  },
  {
    id: "1050",
    client: 'Маркет "Asia Mall"',
    clientPhone: "+996 312 90 80 70",
    product: "Платье летнее",
    fabric: "Штапель",
    colors: ["Цветочный принт"],
    sizes: [
      { size: "S", qty: 60, done: 0 },
      { size: "M", qty: 80, done: 0 },
      { size: "L", qty: 60, done: 0 },
    ],
    qty: 200,
    deadline: "2026-05-24",
    status: "Проблема",
    progress: 12,
    responsible: "Бакыт М.",
    unitPrice: 1100,
    unitCost: 720,
    revenue: 220000,
    cost: 144000,
    profit: 76000,
    margin: 35,
    priority: "high",
    comment: "Брак на партии ткани, ждём замену от поставщика",
    stages: [
      { name: "Раскрой", status: "Проблема", responsible: "Эркин Б.", startedAt: "2026-05-18", progress: 30, comment: "Брак на ткани" },
      { name: "Печать/вышивка", status: "Ожидает", responsible: "Айнура К.", progress: 0 },
      { name: "Пошив", status: "Ожидает", responsible: "Бригада №1", progress: 0 },
      { name: "ОТК", status: "Ожидает", responsible: "Назгуль О.", progress: 0 },
      { name: "Упаковка", status: "Ожидает", responsible: "Чолпон С.", progress: 0 },
      { name: "Готово", status: "Ожидает", responsible: "—", progress: 0 },
    ],
    defectsCount: 18,
    costBreakdown: mockCost(45000, 18000, 6000, 0, 9000),
  },
  {
    id: "1051",
    client: 'ИП "Жаныл"',
    clientPhone: "+996 559 87 65 43",
    product: "Толстовка с молнией",
    fabric: "Футер 3-нитка",
    colors: ["Серый", "Чёрный"],
    sizes: [
      { size: "S", qty: 40, done: 40 },
      { size: "M", qty: 80, done: 80 },
      { size: "L", qty: 60, done: 60 },
      { size: "XL", qty: 20, done: 20 },
    ],
    qty: 200,
    deadline: "2026-05-18",
    status: "Отгружено",
    progress: 100,
    responsible: "Гульнара А.",
    unitPrice: 1600,
    unitCost: 1080,
    revenue: 320000,
    cost: 216000,
    profit: 104000,
    margin: 33,
    priority: "normal",
    stages: [
      { name: "Раскрой", status: "Завершено", responsible: "Эркин Б.", startedAt: "2026-04-28", finishedAt: "2026-05-01", progress: 100 },
      { name: "Печать/вышивка", status: "Завершено", responsible: "Айнура К.", startedAt: "2026-05-01", finishedAt: "2026-05-03", progress: 100 },
      { name: "Пошив", status: "Завершено", responsible: "Бригада №2", startedAt: "2026-05-03", finishedAt: "2026-05-13", progress: 100 },
      { name: "ОТК", status: "Завершено", responsible: "Назгуль О.", startedAt: "2026-05-13", finishedAt: "2026-05-15", progress: 100 },
      { name: "Упаковка", status: "Завершено", responsible: "Чолпон С.", startedAt: "2026-05-15", finishedAt: "2026-05-16", progress: 100 },
      { name: "Готово", status: "Завершено", responsible: "—", finishedAt: "2026-05-17", progress: 100 },
    ],
    defectsCount: 5,
    costBreakdown: mockCost(105000, 78000, 22000, 8000, 3000),
  },
];

export const materials: Material[] = [
  { id: "m1", name: "Холодок 180", type: "ткань", priceCurrency: "KGS", color: "Чёрный", stock: 120, unit: "кг", minStock: 80, supplier: 'ОсОО "Текстиль-Импорт"', pricePerUnit: 580 },
  { id: "m2", name: "Джакард", type: "ткань", priceCurrency: "KGS", color: "Белый", stock: 85, unit: "кг", minStock: 50, supplier: 'ОсОО "Текстиль-Импорт"', pricePerUnit: 720 },
  { id: "m3", name: "Рибана", type: "ткань", priceCurrency: "KGS", color: "Серый меланж", stock: 40, unit: "кг", minStock: 60, supplier: 'Бишкек-Текстиль', pricePerUnit: 640 },
  { id: "m4", name: "Молния спираль 50 см", type: "фурнитура", priceCurrency: "KGS", color: "Чёрный", stock: 500, unit: "шт", minStock: 200, supplier: 'YKK Партнёр', pricePerUnit: 22 },
  { id: "m5", name: "Пакеты упаковочные", type: "упаковка", priceCurrency: "KGS", color: "Прозрачный", stock: 2000, unit: "шт", minStock: 500, supplier: 'PackKG', pricePerUnit: 4 },
  { id: "m6", name: "Габардин", type: "ткань", priceCurrency: "KGS", color: "Тёмно-синий", stock: 95, unit: "кг", minStock: 70, supplier: 'Текстильный двор', pricePerUnit: 690 },
  { id: "m7", name: "Нить швейная №40", type: "нить", priceCurrency: "KGS", color: "Белый", stock: 35, unit: "рул", minStock: 50, supplier: 'Алтын-Жип', pricePerUnit: 95 },
  { id: "m8", name: "Футер 3-нитка с начёсом", type: "ткань", priceCurrency: "KGS", color: "Серый", stock: 18, unit: "кг", minStock: 40, supplier: 'Бишкек-Текстиль', pricePerUnit: 820 },
  { id: "m9", name: "Резинка 30 мм", type: "фурнитура", priceCurrency: "KGS", color: "Чёрный", stock: 240, unit: "м", minStock: 100, supplier: 'Фурнитура+', pricePerUnit: 18 },
  { id: "m10", name: "Этикетки тканевые", type: "фурнитура", priceCurrency: "KGS", color: "Белый", stock: 1500, unit: "шт", minStock: 800, supplier: 'LabelKG', pricePerUnit: 3 },
];

export const employees: Employee[] = [
  { id: "e1", name: "Эркин Бекболотов", role: "Закройщик", stage: "Раскрой", monthDone: 1850, defectsPct: 1.2, payType: "monthly", salary: 45000, ratePerPiece: 0, status: "active", norm: 1600, avatarColor: "#2563EB" },
  { id: "e2", name: "Гульнара Асанова", role: "Швея", stage: "Пошив", monthDone: 720, defectsPct: 1.8, payType: "per_piece", salary: 0, ratePerPiece: 55, status: "active", norm: 600, avatarColor: "#06B6D4" },
  { id: "e3", name: "Айнура Касымова", role: "Швея", stage: "Печать/вышивка", monthDone: 540, defectsPct: 0.9, payType: "per_piece", salary: 0, ratePerPiece: 60, status: "active", norm: 500, avatarColor: "#8B5CF6" },
  { id: "e4", name: "Назгуль Орозалиева", role: "ОТК", stage: "ОТК", monthDone: 2400, defectsPct: 0.3, payType: "monthly", salary: 32000, ratePerPiece: 0, status: "active", norm: 2200, avatarColor: "#F59E0B" },
  { id: "e5", name: "Чолпон Сатылганова", role: "Упаковщик", stage: "Упаковка", monthDone: 2150, defectsPct: 0.1, payType: "per_piece", salary: 0, ratePerPiece: 12, status: "active", norm: 2000, avatarColor: "#EF4444" },
  { id: "e6", name: "Бакыт Маматов", role: "Мастер цеха", stage: "Пошив", monthDone: 0, defectsPct: 0, payType: "monthly", salary: 55000, ratePerPiece: 0, status: "active", norm: 0, avatarColor: "#1D4ED8" },
  { id: "e7", name: "Айбек Турдубеков", role: "Технолог", stage: "Пошив", monthDone: 0, defectsPct: 0, payType: "monthly", salary: 60000, ratePerPiece: 0, status: "active", norm: 0, avatarColor: "#2563EB" },
  { id: "e8", name: "Жылдыз Кенжебаева", role: "Швея", stage: "Пошив", monthDone: 480, defectsPct: 3.4, payType: "per_piece", salary: 0, ratePerPiece: 50, status: "active", norm: 600, avatarColor: "#22D3EE" },
  { id: "e9", name: "Айгерим Бектурова", role: "Швея", stage: "Пошив", monthDone: 610, defectsPct: 1.1, payType: "per_piece", salary: 0, ratePerPiece: 55, status: "vacation", norm: 600, avatarColor: "#EC4899" },
];

export const defects: Defect[] = [
  { id: "d1", date: "2026-05-23", orderId: "1045", product: "Футболка «Холодок»", size: "L", qty: 6, reason: "Неровный шов", employee: "Жылдыз К.", stage: "Пошив", loss: 2400 },
  { id: "d2", date: "2026-05-22", orderId: "1047", product: "Школьная форма", size: "32", qty: 4, reason: "Ошибка в крое", employee: "Эркин Б.", stage: "Раскрой", loss: 2560 },
  { id: "d3", date: "2026-05-22", orderId: "1045", product: "Футболка «Холодок»", size: "M", qty: 3, reason: "Пятно на ткани", employee: "—", stage: "Раскрой", loss: 1200 },
  { id: "d4", date: "2026-05-21", orderId: "1050", product: "Платье летнее", size: "M", qty: 12, reason: "Повреждение ткани", employee: "—", stage: "Раскрой", loss: 8640 },
  { id: "d5", date: "2026-05-20", orderId: "1047", product: "Школьная форма", size: "34", qty: 7, reason: "Неправильный размер", employee: "Жылдыз К.", stage: "Пошив", loss: 4480 },
  { id: "d6", date: "2026-05-19", orderId: "1049", product: "Спортивные шорты", size: "M", qty: 5, reason: "Ошибка вышивки/печати", employee: "Айнура К.", stage: "Печать/вышивка", loss: 1700 },
  { id: "d7", date: "2026-05-18", orderId: "1045", product: "Футболка «Холодок»", size: "XL", qty: 5, reason: "Неровный шов", employee: "Жылдыз К.", stage: "Пошив", loss: 2000 },
  { id: "d8", date: "2026-05-17", orderId: "1051", product: "Толстовка с молнией", size: "L", qty: 2, reason: "Ошибка в крое", employee: "Эркин Б.", stage: "Раскрой", loss: 2160 },
  { id: "d9", date: "2026-05-16", orderId: "1047", product: "Школьная форма", size: "30", qty: 11, reason: "Неровный шов", employee: "Гульнара А.", stage: "Пошив", loss: 7040 },
];

export const activity: ActivityEvent[] = [
  { id: "a1", time: "10:42", text: "Заказ #1047 переведён на этап «ОТК»", type: "order" },
  { id: "a2", time: "10:18", text: "На склад поступило 80 кг ткани «Холодок 180»", type: "stock" },
  { id: "a3", time: "09:55", text: "Зафиксирован брак: 6 шт по заказу #1045 (неровный шов)", type: "defect" },
  { id: "a4", time: "09:30", text: "Швея Жылдыз К. вышла на смену", type: "employee" },
  { id: "a5", time: "09:12", text: "Заказ #1049 отправлен клиенту, выручка 208 000 сом", type: "finance" },
  { id: "a6", time: "08:55", text: "Создан новый заказ #1048 «Поварская форма» (80 шт)", type: "order" },
];

export const revenueByMonth: ChartPoint[] = [
  { label: "Дек", value: 1850 },
  { label: "Янв", value: 2100 },
  { label: "Фев", value: 1980 },
  { label: "Мар", value: 2420 },
  { label: "Апр", value: 2680 },
  { label: "Май", value: 3120 },
];

export const profitByMonth: ChartPoint[] = [
  { label: "Дек", value: 540 },
  { label: "Янв", value: 610 },
  { label: "Фев", value: 580 },
  { label: "Мар", value: 720 },
  { label: "Апр", value: 810 },
  { label: "Май", value: 980 },
];

export const defectsByWeek: ChartPoint[] = [
  { label: "Н1", value: 18 },
  { label: "Н2", value: 24 },
  { label: "Н3", value: 14 },
  { label: "Н4", value: 31 },
  { label: "Н5", value: 22 },
];

export const expensesByCategory: ChartPoint[] = [
  { label: "Ткань", value: 720 },
  { label: "Работа", value: 480 },
  { label: "Фурнитура", value: 180 },
  { label: "Упаковка", value: 65 },
  { label: "Брак", value: 38 },
];

/* --------- Helpers --------- */

export function formatSom(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " сом";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function daysUntil(iso: string, today = new Date("2026-05-25")): number {
  const target = new Date(iso);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
