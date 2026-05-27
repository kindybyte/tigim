import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  Sliders,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import { OrderStatusBadge } from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import OrderFormModal from "../components/OrderFormModal";
import {
  daysUntil,
  formatDateShort,
  formatNumber,
  formatSom,
  orders as mockOrders,
} from "../data/mockData";
import type { Order, OrderStatus } from "../types";
import { useAuth } from "../lib/auth";
import { listOrders } from "../lib/orders";

const STATUSES: OrderStatus[] = [
  "Новый",
  "Раскрой",
  "Пошив",
  "ОТК",
  "Упаковка",
  "Готово",
  "Отгружено",
  "Проблема",
];

export default function Orders() {
  const { configured, companyId } = useAuth();
  const useRealData = configured && !!companyId;

  const [orders, setOrders] = useState<Order[]>(useRealData ? [] : mockOrders);
  const [loading, setLoading] = useState(useRealData);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "Все">("Все");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("Все");

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setFetchError(null);
    try {
      const rows = await listOrders(companyId!);
      setOrders(rows);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const responsibles = useMemo(
    () => Array.from(new Set(orders.map((o) => o.responsible).filter((r) => r && r !== "—"))),
    [orders],
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        o.id.includes(q) ||
        o.client.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q) ||
        o.fabric.toLowerCase().includes(q);
      const matchesS = statusFilter === "Все" || o.status === statusFilter;
      const matchesR = responsibleFilter === "Все" || o.responsible === responsibleFilter;
      return matchesQ && matchesS && matchesR;
    });
  }, [orders, query, statusFilter, responsibleFilter]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Заказы"
        description={`Всего ${orders.length} заказов · ${filtered.length} показано`}
        actions={
          <>
            <button className="btn-secondary" disabled>
              <Download className="h-4 w-4" /> Экспорт в Excel
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!useRealData}
              title={useRealData ? undefined : "В демо-режиме создание недоступно"}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" /> Добавить заказ
            </button>
          </>
        }
      />

      <Card padding={false}>
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-panel-border p-4">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по № заказа, клиенту, изделию…"
              className="input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-600" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "Все")}
              className="input min-w-[150px] py-2"
            >
              <option value="Все">Все статусы</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <select
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              className="input min-w-[180px] py-2"
            >
              <option value="Все">Все ответственные</option>
              {responsibles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>

            <button className="btn-ghost">
              <Sliders className="h-4 w-4" /> Ещё фильтры
            </button>
          </div>
        </div>

        {/* Table / states */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем заказы…
          </div>
        ) : fetchError ? (
          <div className="mx-5 my-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            Не удалось загрузить заказы: {fetchError}.{" "}
            <button onClick={refetch} className="font-semibold underline">Повторить</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={orders.length === 0 ? "Пока нет заказов" : "Ничего не найдено"}
            description={
              orders.length === 0
                ? "Добавьте первый заказ — он сразу появится здесь."
                : "Попробуйте изменить фильтры или поисковый запрос."
            }
            action={
              orders.length === 0 && useRealData ? (
                <button onClick={() => setCreateOpen(true)} className="btn-brand">
                  <Plus className="h-4 w-4" /> Добавить заказ
                </button>
              ) : undefined
            }
          />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-border bg-panel-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                <th className="px-5 py-3">№</th>
                <th className="px-3 py-3">Клиент / Изделие</th>
                <th className="px-3 py-3">Ткань</th>
                <th className="px-3 py-3 text-right">Кол-во</th>
                <th className="px-3 py-3">Размеры</th>
                <th className="px-3 py-3">Дедлайн</th>
                <th className="px-3 py-3">Статус</th>
                <th className="px-3 py-3 min-w-[160px]">Прогресс</th>
                <th className="px-3 py-3">Ответственный</th>
                <th className="px-3 py-3 text-right">Прибыль</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const dleft = daysUntil(o.deadline);
                const danger = dleft < 0 && !["Готово", "Отгружено"].includes(o.status);
                return (
                  <tr key={o.id} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                    <td className="px-5 py-3 align-middle">
                      <Link to={`/app/orders/${o.id}`} className="font-bold text-ink-900 hover:text-brand-200">
                        #{o.id}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="font-medium text-ink-900">{o.product}</p>
                      <p className="text-xs text-ink-600">{o.client}</p>
                    </td>
                    <td className="px-3 py-3 align-middle text-ink-800">
                      {o.fabric}
                      <p className="text-xs text-ink-600">{o.colors.join(", ")}</p>
                    </td>
                    <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums">
                      {formatNumber(o.qty)}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-wrap gap-1">
                        {o.sizes.map((s) => (
                          <span key={s.size} className="rounded-md bg-panel-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-700">
                            {s.size}·{s.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className={`text-sm font-semibold ${danger ? "text-rose-300" : "text-ink-800"}`}>
                        {formatDateShort(o.deadline)}
                      </p>
                      <p className={`text-xs ${danger ? "text-rose-400" : "text-ink-600"}`}>
                        {dleft < 0 ? `просрочка ${-dleft} дн.` : `${dleft} дн.`}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <ProgressBar
                        value={o.progress}
                        tone={o.status === "Проблема" ? "danger" : "brand"}
                        showLabel
                      />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.responsible} color="#2563EB" size="xs" />
                        <span className="text-sm text-ink-800">{o.responsible}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right align-middle font-semibold text-ink-900 tabular-nums">
                      {formatSom(o.profit)}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Link
                        to={`/app/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/15"
                      >
                        Подробнее <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-panel-border px-5 py-3 text-xs text-ink-600">
            <p>Показано {filtered.length} из {orders.length}</p>
          </div>
        )}
      </Card>

      {useRealData && companyId && (
        <OrderFormModal
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
