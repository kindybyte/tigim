import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Loader2,
  Printer,
  Users,
  Wallet,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { useAuth } from "../lib/auth";
import { canSeeFinance } from "../lib/company";
import NoAccess from "../components/ui/NoAccess";
import {
  exportDefectsXlsx,
  exportEmployeesXlsx,
  exportFinanceXlsx,
  exportOrdersXlsx,
  exportWarehouseXlsx,
  printCurrentPage,
} from "../lib/exports";

type ReportKey = "orders" | "defects" | "employees" | "warehouse" | "finance";

interface ReportDef {
  key: ReportKey;
  title: string;
  desc: string;
  icon: typeof ClipboardList;
  tone: "brand" | "warning" | "purple" | "info" | "success";
  exporter: (companyId: string) => Promise<void>;
}

const REPORTS: ReportDef[] = [
  {
    key: "orders",
    title: "Отчёт по заказам",
    desc: "Список всех заказов, статусы, прогресс, дедлайны",
    icon: ClipboardList,
    tone: "brand",
    exporter: exportOrdersXlsx,
  },
  {
    key: "defects",
    title: "Отчёт по браку",
    desc: "Брак за период по сотрудникам, этапам и причинам",
    icon: AlertTriangle,
    tone: "warning",
    exporter: exportDefectsXlsx,
  },
  {
    key: "employees",
    title: "Отчёт по сотрудникам",
    desc: "Должности, нормы, зарплаты, статусы",
    icon: Users,
    tone: "purple",
    exporter: exportEmployeesXlsx,
  },
  {
    key: "warehouse",
    title: "Отчёт по складу",
    desc: "Остатки, минимальные уровни, стоимость",
    icon: Boxes,
    tone: "info",
    exporter: exportWarehouseXlsx,
  },
  {
    key: "finance",
    title: "Финансовый отчёт",
    desc: "Выручка, расходы, прибыль и маржинальность",
    icon: Wallet,
    tone: "success",
    exporter: exportFinanceXlsx,
  },
];

const toneMap: Record<ReportDef["tone"], string> = {
  brand: "bg-brand-500/15 text-brand-300",
  warning: "bg-amber-500/15 text-amber-300",
  purple: "bg-violet-500/15 text-violet-300",
  info: "bg-sky-500/15 text-sky-300",
  success: "bg-emerald-500/15 text-emerald-300",
};

export default function Reports() {
  const { configured, companyId, currentRole } = useAuth();
  const useRealData = configured && !!companyId;

  if (useRealData && !canSeeFinance(currentRole)) {
    return <NoAccess />;
  }

  const [busy, setBusy] = useState<ReportKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(report: ReportDef) {
    if (!useRealData || !companyId) {
      setError("Экспорт доступен только в реальном режиме (нужны данные в БД)");
      return;
    }
    setError(null);
    setBusy(report.key);
    try {
      await report.exporter(companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка экспорта");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Отчёты"
        description="Готовые отчёты с экспортом в Excel и печать в PDF"
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-ink-800">Период:</span>
          <div className="flex flex-wrap gap-1.5">
            {["Сегодня", "Эта неделя", "Этот месяц", "Квартал", "Год", "Всё время"].map((p, i) => (
              <button
                key={p}
                disabled
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  i === 5 ? "bg-brand-600 text-white shadow-soft" : "border border-panel-border text-ink-700"
                } opacity-60`}
                title="Фильтр по периоду — в следующем шаге"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="ml-auto text-xs text-ink-600">
            Пока экспортируем «всё время». Фильтры по периоду — в следующих шагах.
          </p>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const isBusy = busy === r.key;
          return (
            <Card key={r.key}>
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
                <button
                  onClick={() => handleExport(r)}
                  disabled={isBusy || !useRealData}
                  className="btn-brand flex-1 justify-center"
                >
                  {isBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Готовим…</>
                  ) : (
                    <><FileSpreadsheet className="h-4 w-4" /> Excel</>
                  )}
                </button>
                <button
                  onClick={() => printCurrentPage()}
                  disabled={isBusy}
                  className="btn-secondary"
                  title="Откроется диалог печати — сохраните как PDF"
                >
                  <Printer className="h-4 w-4" /> PDF
                </button>
              </div>
            </Card>
          );
        })}

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
              <p className="mt-2 text-xs text-ink-600">Доступно после Шага 23 (тариф Pro)</p>
            </div>
            <button disabled className="btn-secondary mt-auto w-full justify-center">
              Скоро
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-panel-border bg-panel-muted/30 px-4 py-3 text-xs text-ink-600">
        <div className="flex items-start gap-2">
          <Download className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-ink-800">Excel содержит все строки из БД</p>
            <p className="mt-0.5">
              Без фильтров по периоду пока. Имя файла: <code className="rounded bg-panel-muted px-1">tigim-{`{report}`}-YYYY-MM-DD.xlsx</code>.
              «PDF» открывает диалог печати браузера — выберите «Сохранить как PDF» в Destination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
