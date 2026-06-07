import { useCallback, useEffect, useState } from "react";
import { Coins, Download, Loader2, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import {
  expensesByCategory as mockExpenses,
  formatSom,
  orders as mockOrders,
  profitByMonth as mockProfitByMonth,
  revenueByMonth as mockRevenueByMonth,
} from "../data/mockData";
import { useAuth } from "../lib/auth";
import { canSeeFinance } from "../lib/company";
import NoAccess from "../components/ui/NoAccess";
import {
  getFinanceData,
  type MonthPoint,
  type OrderFinancialsRow,
  type OverallStats,
} from "../lib/finance";
import { exportFinanceXlsx } from "../lib/exports";

const DONUT_PALETTE = ["#3B82F6", "#22D3EE", "#A78BFA", "#F59E0B", "#F87171"];

export default function Finance() {
  const { configured, companyId, currentRole } = useAuth();
  const useRealData = configured && !!companyId;

  // Технолог/Склад/ОТК/Сотрудник — финансы недоступны. В демо пускаем всех.
  if (useRealData && !canSeeFinance(currentRole)) {
    return <NoAccess />;
  }

  const [loading, setLoading] = useState(useRealData);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<OverallStats>({
    revenue: useRealData ? 0 : mockOrders.reduce((s, o) => s + o.revenue, 0),
    cost: useRealData ? 0 : mockOrders.reduce((s, o) => s + o.cost, 0),
    profit: useRealData ? 0 : mockOrders.reduce((s, o) => s + o.profit, 0),
    salaries: useRealData ? 0 : 358000,
    defectsLoss: useRealData ? 0 : 31180,
    avgOrderProfit: useRealData ? 0 : Math.round(mockOrders.reduce((s, o) => s + o.profit, 0) / mockOrders.length),
    ordersCount: useRealData ? 0 : mockOrders.length,
  });
  const [orderRows, setOrderRows] = useState<OrderFinancialsRow[]>(
    useRealData
      ? []
      : mockOrders.map((o) => ({
          orderId: o.id,
          product: o.product,
          revenue: o.revenue,
          fabric: o.costBreakdown.fabric,
          work: o.costBreakdown.work,
          accessories: o.costBreakdown.accessories,
          packaging: o.costBreakdown.packaging,
          defects: o.costBreakdown.defects,
          profit: o.profit,
          margin: o.margin,
        })),
  );
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthPoint[]>(
    useRealData ? [] : mockRevenueByMonth,
  );
  const [monthlyProfit, setMonthlyProfit] = useState<MonthPoint[]>(
    useRealData ? [] : mockProfitByMonth,
  );
  const [expenses, setExpenses] = useState<{ label: string; value: number }[]>(
    useRealData ? [] : mockExpenses,
  );

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFinanceData(companyId!);
      setStats(data.stats);
      setOrderRows(data.orderFinancials);
      setMonthlyRevenue(data.monthlyRevenue);
      setMonthlyProfit(data.monthlyProfit);
      setExpenses(data.expensesByCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить финансы");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleExport() {
    if (!useRealData || !companyId) return;
    setExporting(true);
    try {
      await exportFinanceXlsx(companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  const donutItems = expenses.map((e, i) => ({
    label: e.label,
    value: e.value,
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));

  const totalExpensesValue = expenses.reduce((s, e) => s + e.value, 0);
  const totalExpensesLabel =
    totalExpensesValue >= 1000
      ? `${(totalExpensesValue / 1000).toFixed(1)}М`
      : `${totalExpensesValue}К`;

  const maxMargin = Math.max(1, ...orderRows.map((o) => o.margin));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Финансы"
        description="Выручка, расходы и прибыль вашего цеха"
        actions={
          <button
            onClick={handleExport}
            disabled={!useRealData || exporting || orderRows.length === 0}
            className="btn-secondary"
          >
            {exporting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Экспорт…</>
            ) : (
              <><Download className="h-4 w-4" /> Финансовый отчёт</>
            )}
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Считаем агрегаты…
        </div>
      ) : error ? (
        <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}.{" "}
          <button onClick={refetch} className="font-semibold underline">Повторить</button>
        </div>
      ) : useRealData && stats.ordersCount === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Нет данных для финансов"
            description="Создайте первые заказы — выручка, прибыль и расходы посчитаются автоматически."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Выручка"
              value={formatSom(stats.revenue)}
              icon={Wallet}
              iconTone="brand"
            />
            <StatCard
              label="Себестоимость"
              value={formatSom(stats.cost)}
              icon={ReceiptText}
              iconTone="warning"
            />
            <StatCard
              label="Прибыль"
              value={formatSom(stats.profit)}
              icon={TrendingUp}
              iconTone="success"
            />
            <StatCard
              label="Средняя прибыль/заказ"
              value={formatSom(stats.avgOrderProfit)}
              icon={Coins}
              iconTone="purple"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="sm:col-span-1" title="Зарплаты">
              <p className="mt-1 text-xl font-bold text-ink-900">{formatSom(stats.salaries)}</p>
              <p className="text-xs text-ink-600">фонд оплаты сейчас</p>
            </Card>
            <Card className="sm:col-span-1" title="Потери от брака">
              <p className="mt-1 text-xl font-bold text-rose-300">−{formatSom(stats.defectsLoss)}</p>
              <p className="text-xs text-ink-600">за всё время</p>
            </Card>
            <Card className="sm:col-span-2" title="Маржинальность по заказам">
              {orderRows.length === 0 ? (
                <p className="py-2 text-xs text-ink-600">Нет заказов</p>
              ) : (
                <>
                  <div className="flex h-10 gap-1.5">
                    {orderRows.map((o) => (
                      <div key={o.orderId} className="flex-1 rounded-md bg-panel-muted" title={`#${o.orderId}: ${o.margin}%`}>
                        <div
                          className="h-full rounded-md bg-gradient-to-t from-brand-600 to-teal-500"
                          style={{ height: `${Math.max(8, (Math.max(0, o.margin) / maxMargin) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-600">
                    Средняя маржа:{" "}
                    {Math.round(orderRows.reduce((s, o) => s + o.margin, 0) / Math.max(1, orderRows.length))}%
                  </p>
                </>
              )}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2" title="Выручка и прибыль по месяцам" subtitle="Тысяч сом · 6 месяцев">
              <LineChart data={monthlyRevenue} formatValue={(v) => `${v} тыс. сом`} />
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">Прибыль</p>
                <BarChart data={monthlyProfit} color="#22D3EE" formatValue={(v) => `${v} тыс. сом`} />
              </div>
            </Card>
            <Card title="Расходы по категориям">
              {donutItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-600">Нет данных</p>
              ) : (
                <DonutChart
                  items={donutItems}
                  centerLabel="Всего"
                  centerValue={totalExpensesLabel}
                />
              )}
            </Card>
          </div>

          <Card padding={false} className="mt-6" title="Финансы по заказам" subtitle="Что приносит больше всего прибыли">
            <div className="overflow-x-auto p-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel-border bg-panel-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                    <th className="px-5 py-3">Заказ</th>
                    <th className="px-3 py-3 text-right">Выручка</th>
                    <th className="px-3 py-3 text-right">Ткань</th>
                    <th className="px-3 py-3 text-right">Работа</th>
                    <th className="px-3 py-3 text-right">Фурнитура</th>
                    <th className="px-3 py-3 text-right">Упаковка</th>
                    <th className="px-3 py-3 text-right">Брак</th>
                    <th className="px-3 py-3 text-right">Прибыль</th>
                    <th className="px-3 py-3 text-right">Маржа</th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map((o) => (
                    <tr key={o.orderId} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                      <td className="px-5 py-3 align-middle">
                        <p className="font-bold text-ink-900">#{o.orderId}</p>
                        <p className="text-xs text-ink-600">{o.product}</p>
                      </td>
                      <td className="px-3 py-3 text-right align-middle tabular-nums">{formatSom(o.revenue)}</td>
                      <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.fabric)}</td>
                      <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.work)}</td>
                      <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.accessories)}</td>
                      <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.packaging)}</td>
                      <td className="px-3 py-3 text-right align-middle text-rose-300 tabular-nums">−{formatSom(o.defects)}</td>
                      <td className="px-3 py-3 text-right align-middle font-bold text-emerald-300 tabular-nums">{formatSom(o.profit)}</td>
                      <td className="px-3 py-3 text-right align-middle font-semibold text-ink-900">{o.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
