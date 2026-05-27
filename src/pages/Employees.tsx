import { Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import StatCard from "../components/ui/StatCard";
import { Users, BadgeCheck, AlertTriangle } from "lucide-react";
import { employees, formatSom } from "../data/mockData";

export default function Employees() {
  const [query, setQuery] = useState("");
  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()) || e.role.toLowerCase().includes(query.toLowerCase()),
  );
  const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
  const avgDefects = employees.reduce((s, e) => s + e.defectsPct, 0) / employees.length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Сотрудники"
        description={`${employees.length} человек в цехе · фонд оплаты ${formatSom(totalSalary)}`}
        actions={<button className="btn-brand"><UserPlus className="h-4 w-4" /> Добавить сотрудника</button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Сотрудников" value={String(employees.length)} icon={Users} iconTone="brand" />
        <StatCard label="Средний % брака" value={`${avgDefects.toFixed(1)}%`} icon={AlertTriangle} iconTone="warning" />
        <StatCard label="Фонд оплаты, май" value={formatSom(totalSalary)} icon={BadgeCheck} iconTone="success" />
      </div>

      <Card padding={false} className="mt-6">
        <div className="border-b border-panel-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-9" placeholder="Поиск по имени или должности…" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-border bg-panel-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                <th className="px-5 py-3">Имя</th>
                <th className="px-3 py-3">Должность</th>
                <th className="px-3 py-3">Этап</th>
                <th className="px-3 py-3">За май</th>
                <th className="px-3 py-3">% брака</th>
                <th className="px-3 py-3 text-right">Зарплата</th>
                <th className="px-3 py-3">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const pct = e.norm > 0 ? Math.round((e.monthDone / e.norm) * 100) : 0;
                const tone = e.defectsPct < 1 ? "success" : e.defectsPct < 2.5 ? "warning" : "danger";
                return (
                  <tr key={e.id} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} color={e.avatarColor} size="sm" />
                        <div>
                          <p className="font-semibold text-ink-900">{e.name}</p>
                          <p className="text-xs text-ink-600">ID: {e.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle"><Badge tone="brand">{e.role}</Badge></td>
                    <td className="px-3 py-3 align-middle text-ink-800">{e.stage}</td>
                    <td className="px-3 py-3 align-middle">
                      {e.norm > 0 ? (
                        <div className="min-w-[150px]">
                          <div className="flex justify-between text-xs">
                            <span className="text-ink-600">{e.monthDone}/{e.norm}</span>
                            <span className="font-semibold text-ink-800">{pct}%</span>
                          </div>
                          <ProgressBar value={Math.min(pct, 120)} tone={pct >= 100 ? "success" : "brand"} className="mt-1" />
                        </div>
                      ) : (
                        <span className="text-xs text-ink-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Badge tone={tone}>{e.defectsPct.toFixed(1)}%</Badge>
                    </td>
                    <td className="px-3 py-3 text-right align-middle font-semibold text-ink-900 tabular-nums">{formatSom(e.salary)}</td>
                    <td className="px-3 py-3 align-middle">
                      {e.status === "active" && <Badge tone="success" dot>На смене</Badge>}
                      {e.status === "vacation" && <Badge tone="warning" dot>В отпуске</Badge>}
                      {e.status === "sick" && <Badge tone="danger" dot>Больничный</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
