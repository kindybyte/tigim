import { AlertTriangle, Download, ImageIcon, Plus, TrendingDown } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import {
  defects,
  defectsByWeek,
  formatDateShort,
  formatNumber,
  formatSom,
} from "../data/mockData";

export default function Defects() {
  const totalQty = defects.reduce((s, d) => s + d.qty, 0);
  const totalLoss = defects.reduce((s, d) => s + d.loss, 0);
  const byEmployee: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  defects.forEach((d) => {
    byEmployee[d.employee] = (byEmployee[d.employee] || 0) + d.qty;
    byReason[d.reason] = (byReason[d.reason] || 0) + d.qty;
  });

  const employeeRanking = Object.entries(byEmployee)
    .filter(([n]) => n !== "—")
    .sort((a, b) => b[1] - a[1]);

  const reasonItems = [
    { color: "#3B82F6" },
    { color: "#22D3EE" },
    { color: "#F59E0B" },
    { color: "#F87171" },
    { color: "#A78BFA" },
    { color: "#06B6D4" },
  ];
  const donutItems = Object.entries(byReason).map(([label, value], i) => ({
    label,
    value,
    color: reasonItems[i % reasonItems.length].color,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Брак"
        description="Учёт бракованных изделий и финансовых потерь"
        actions={
          <>
            <button className="btn-secondary"><Download className="h-4 w-4" /> Экспорт</button>
            <button className="btn-brand"><Plus className="h-4 w-4" /> Зафиксировать брак</button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Брак за май" value={`${totalQty} шт`} icon={AlertTriangle} iconTone="warning" trend={{ value: "−12%", positive: true }} />
        <StatCard label="Потери в деньгах" value={formatSom(totalLoss)} icon={TrendingDown} iconTone="danger" hint="за месяц" />
        <StatCard label="Доля брака" value="1.4%" icon={AlertTriangle} iconTone="warning" trend={{ value: "−0.6", positive: true }} hint="от всего объёма" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Брак по неделям" subtitle="Май">
          <BarChart data={defectsByWeek} color="#EF4444" formatValue={(v) => `${v} шт`} />
        </Card>
        <Card title="По причинам" subtitle="Распределение по типам">
          <DonutChart items={donutItems} centerValue={`${totalQty}`} centerLabel="шт" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="История брака">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                  <th className="py-2.5 pr-3">Дата</th>
                  <th className="py-2.5 pr-3">Заказ</th>
                  <th className="py-2.5 pr-3">Изделие</th>
                  <th className="py-2.5 pr-3">Размер</th>
                  <th className="py-2.5 pr-3 text-right">Кол-во</th>
                  <th className="py-2.5 pr-3">Причина</th>
                  <th className="py-2.5 pr-3">Этап / Сотрудник</th>
                  <th className="py-2.5 pr-3 text-right">Потеря</th>
                  <th className="py-2.5">Фото</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((d) => (
                  <tr key={d.id} className="border-b border-panel-border last:border-0">
                    <td className="py-3 pr-3 text-ink-700">{formatDateShort(d.date)}</td>
                    <td className="py-3 pr-3 font-semibold text-ink-900">#{d.orderId}</td>
                    <td className="py-3 pr-3 text-ink-800">{d.product}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-md bg-panel-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-700">{d.size}</span>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums">{d.qty}</td>
                    <td className="py-3 pr-3"><Badge tone="warning">{d.reason}</Badge></td>
                    <td className="py-3 pr-3 text-ink-800">
                      <p>{d.stage}</p>
                      <p className="text-xs text-ink-600">{d.employee}</p>
                    </td>
                    <td className="py-3 pr-3 text-right font-bold text-rose-300 tabular-nums">−{formatSom(d.loss)}</td>
                    <td className="py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel-muted text-ink-600">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Брак по сотрудникам" subtitle="Кто чаще ошибается">
          <ul className="space-y-3">
            {employeeRanking.map(([name, qty]) => {
              const max = employeeRanking[0]?.[1] || 1;
              const pct = Math.round((qty / max) * 100);
              return (
                <li key={name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-800">{name}</span>
                    <span className="font-semibold tabular-nums text-ink-900">{qty} шт · {formatNumber(qty * 600)} сом</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-panel-muted">
                    <div className="h-1.5 rounded-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
