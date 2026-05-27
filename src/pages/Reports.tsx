import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Users,
  Wallet,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";

const REPORTS = [
  {
    title: "Отчёт по заказам",
    desc: "Список всех заказов, статусы, прогресс, дедлайны",
    icon: ClipboardList,
    tone: "brand",
  },
  {
    title: "Отчёт по браку",
    desc: "Брак за период по сотрудникам, этапам и причинам",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    title: "Отчёт по сотрудникам",
    desc: "Выработка, нормы, зарплаты и процент брака",
    icon: Users,
    tone: "purple",
  },
  {
    title: "Отчёт по складу",
    desc: "Остатки, обороты, движения материалов",
    icon: Boxes,
    tone: "info",
  },
  {
    title: "Финансовый отчёт",
    desc: "Выручка, расходы, прибыль и маржинальность",
    icon: Wallet,
    tone: "success",
  },
] as const;

const toneMap = {
  brand: "bg-brand-500/15 text-brand-300",
  warning: "bg-amber-500/15 text-amber-300",
  purple: "bg-violet-500/15 text-violet-300",
  info: "bg-sky-500/15 text-sky-300",
  success: "bg-emerald-500/15 text-emerald-300",
};

export default function Reports() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Отчёты" description="Готовые отчёты с выбором периода и фильтров" />

      {/* Period selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-ink-800">Период:</span>
          <div className="flex flex-wrap gap-1.5">
            {["Сегодня", "Эта неделя", "Этот месяц", "Май 2026", "Квартал", "Год"].map((p, i) => (
              <button
                key={p}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  i === 2 ? "bg-brand-600 text-white shadow-soft" : "border border-panel-border text-ink-700 hover:bg-panel-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select className="input min-w-[160px] py-2">
              <option>Все заказы</option>
              <option>Только активные</option>
              <option>Только завершённые</option>
            </select>
            <select className="input min-w-[180px] py-2">
              <option>Все сотрудники</option>
              <option>Только швеи</option>
              <option>Только ОТК</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.title}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-xl ${toneMap[r.tone]}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink-900">{r.title}</h3>
                <p className="mt-0.5 text-sm text-ink-600">{r.desc}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-secondary flex-1 justify-center"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
              <button className="btn-secondary flex-1 justify-center"><Download className="h-4 w-4" /> PDF</button>
              <button className="btn-brand w-full justify-center">
                Сформировать <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}

        <Card>
          <div className="flex h-full flex-col items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 text-white">
              <FileBarChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink-900">Собственный отчёт</h3>
              <p className="mt-0.5 text-sm text-ink-600">
                Соберите свой отчёт — выберите данные, поля и формат экспорта.
              </p>
            </div>
            <button className="btn-primary mt-auto w-full justify-center">Создать отчёт</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
