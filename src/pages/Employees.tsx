import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Loader2, Search, UserPlus, Users } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import ProgressBar from "../components/ui/ProgressBar";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import EmployeeFormModal from "../components/EmployeeFormModal";
import { employees as mockEmployees, formatSom } from "../data/mockData";
import type { Employee } from "../types";
import { useAuth } from "../lib/auth";
import { listEmployees } from "../lib/employees";
import { getEmployeeProductivity } from "../lib/finance";

export default function Employees() {
  const { configured, companyId } = useAuth();
  const useRealData = configured && !!companyId;

  const [employees, setEmployees] = useState<Employee[]>(useRealData ? [] : mockEmployees);
  const [loading, setLoading] = useState(useRealData);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [rows, productivity] = await Promise.all([
        listEmployees(companyId!),
        getEmployeeProductivity(companyId!),
      ]);
      const enriched = rows.map((e) => {
        const p = productivity.get(e.id);
        return {
          ...e,
          monthDone: p?.monthDone ?? 0,
          defectsPct: p?.defectsPct ?? 0,
        };
      });
      setEmployees(enriched);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить сотрудников");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.role.toLowerCase().includes(query.toLowerCase()),
      ),
    [employees, query],
  );

  // Фонд оплаты: оклад для monthly + (ставка × сделано) для per_piece.
  // Для per_piece это оценка по факту выработки за месяц.
  const totalSalary = employees.reduce((s, e) => {
    if (e.payType === "per_piece") return s + e.monthDone * e.ratePerPiece;
    return s + e.salary;
  }, 0);
  const avgDefects =
    employees.length > 0
      ? employees.reduce((s, e) => s + e.defectsPct, 0) / employees.length
      : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Сотрудники"
        description={`${employees.length} человек в цехе · фонд оплаты ${formatSom(totalSalary)}`}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            disabled={!useRealData}
            title={useRealData ? undefined : "В демо-режиме создание недоступно"}
            className="btn-brand"
          >
            <UserPlus className="h-4 w-4" /> Добавить сотрудника
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Сотрудников" value={String(employees.length)} icon={Users} iconTone="brand" />
        <StatCard
          label="Средний % брака"
          value={`${avgDefects.toFixed(1)}%`}
          icon={AlertTriangle}
          iconTone="warning"
        />
        <StatCard
          label="Фонд оплаты"
          value={formatSom(totalSalary)}
          icon={BadgeCheck}
          iconTone="success"
        />
      </div>

      <Card padding={false} className="mt-6">
        <div className="border-b border-panel-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Поиск по имени или должности…"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем…
          </div>
        ) : fetchError ? (
          <div className="mx-5 my-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {fetchError}.{" "}
            <button onClick={refetch} className="font-semibold underline">Повторить</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={employees.length === 0 ? "Сотрудников ещё нет" : "Никого не нашли"}
            description={
              employees.length === 0
                ? "Добавьте первых работников — закройщика, швей, ОТК, мастера."
                : "Попробуйте изменить поисковый запрос."
            }
            action={
              employees.length === 0 && useRealData ? (
                <button onClick={() => setCreateOpen(true)} className="btn-brand">
                  <UserPlus className="h-4 w-4" /> Добавить сотрудника
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border bg-panel-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                  <th className="px-5 py-3">Имя</th>
                  <th className="px-3 py-3">Должность</th>
                  <th className="px-3 py-3">Этап</th>
                  <th className="px-3 py-3">Норма</th>
                  <th className="px-3 py-3 text-right">Зарплата</th>
                  <th className="px-3 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const pct = e.norm > 0 ? Math.round((e.monthDone / e.norm) * 100) : 0;
                  return (
                    <tr key={e.id} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                      <td className="px-5 py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.name} color={e.avatarColor} size="sm" />
                          <div>
                            <p className="font-semibold text-ink-900">{e.name}</p>
                            <p className="text-xs text-ink-600">ID: {e.id.slice(0, 8)}</p>
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
                            <ProgressBar
                              value={Math.min(pct, 120)}
                              tone={pct >= 100 ? "success" : "brand"}
                              className="mt-1"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-ink-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right align-middle">
                        {e.payType === "per_piece" ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-ink-900 tabular-nums">
                              {formatSom(e.ratePerPiece)} / шт
                            </span>
                            {e.monthDone > 0 && (
                              <span className="text-[11px] text-ink-600 tabular-nums">
                                ≈ {formatSom(e.monthDone * e.ratePerPiece)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-semibold text-ink-900 tabular-nums">
                            {formatSom(e.salary)}
                          </span>
                        )}
                      </td>
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
        )}
      </Card>

      {useRealData && companyId && (
        <EmployeeFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refetch();
          }}
          companyId={companyId}
        />
      )}
    </div>
  );
}
