import { Download, TrendingUp, Wallet, Coins, ReceiptText } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import {
  expensesByCategory,
  formatSom,
  orders,
  profitByMonth,
  revenueByMonth,
} from "../data/mockData";

export default function Finance() {
  const revenue = orders.reduce((s, o) => s + o.revenue, 0);
  const cost = orders.reduce((s, o) => s + o.cost, 0);
  const profit = revenue - cost;
  const avgOrderProfit = profit / orders.length;
  const salaries = 358000;
  const defectsLoss = 31180;

  const donut = expensesByCategory.map((e, i) => ({
    label: e.label,
    value: e.value,
    color: ["#3B82F6", "#22D3EE", "#A78BFA", "#F59E0B", "#F87171"][i],
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Финансы"
        description="Выручка, расходы и прибыль вашего цеха"
        actions={<button className="btn-secondary"><Download className="h-4 w-4" /> Финансовый отчёт</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Выручка, май" value={formatSom(revenue)} icon={Wallet} iconTone="brand" trend={{ value: "+18%", positive: true }} />
        <StatCard label="Себестоимость" value={formatSom(cost)} icon={ReceiptText} iconTone="warning" />
        <StatCard label="Прибыль" value={formatSom(profit)} icon={TrendingUp} iconTone="success" trend={{ value: "+22%", positive: true }} />
        <StatCard label="Средняя прибыль/заказ" value={formatSom(avgOrderProfit)} icon={Coins} iconTone="purple" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-1" title="Зарплаты">
          <p className="mt-1 text-xl font-bold text-ink-900">{formatSom(salaries)}</p>
          <p className="text-xs text-ink-600">за май</p>
        </Card>
        <Card className="sm:col-span-1" title="Потери от брака">
          <p className="mt-1 text-xl font-bold text-rose-300">−{formatSom(defectsLoss)}</p>
          <p className="text-xs text-ink-600">за май</p>
        </Card>
        <Card className="sm:col-span-2" title="Маржинальность по заказам">
          <div className="flex h-10 gap-1.5">
            {orders.map((o) => (
              <div key={o.id} className="flex-1 rounded-md bg-panel-muted" title={`#${o.id}: ${o.margin}%`}>
                <div className="h-full rounded-md bg-gradient-to-t from-brand-600 to-teal-500" style={{ height: `${(o.margin / 40) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-600">Средняя маржа: 34%</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Выручка и прибыль по месяцам" subtitle="Тысяч сом">
          <LineChart data={revenueByMonth} formatValue={(v) => `${v} тыс. сом`} />
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-600">Прибыль</p>
            <BarChart data={profitByMonth} color="#22D3EE" formatValue={(v) => `${v} тыс. сом`} />
          </div>
        </Card>
        <Card title="Расходы по категориям">
          <DonutChart items={donut} centerLabel="Май" centerValue="1.48М" />
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
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                  <td className="px-5 py-3 align-middle">
                    <p className="font-bold text-ink-900">#{o.id}</p>
                    <p className="text-xs text-ink-600">{o.product}</p>
                  </td>
                  <td className="px-3 py-3 text-right align-middle tabular-nums">{formatSom(o.revenue)}</td>
                  <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.costBreakdown.fabric)}</td>
                  <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.costBreakdown.work)}</td>
                  <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.costBreakdown.accessories)}</td>
                  <td className="px-3 py-3 text-right align-middle text-ink-700 tabular-nums">{formatSom(o.costBreakdown.packaging)}</td>
                  <td className="px-3 py-3 text-right align-middle text-rose-300 tabular-nums">−{formatSom(o.costBreakdown.defects)}</td>
                  <td className="px-3 py-3 text-right align-middle font-bold text-emerald-300 tabular-nums">{formatSom(o.profit)}</td>
                  <td className="px-3 py-3 text-right align-middle font-semibold text-ink-900">{o.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
