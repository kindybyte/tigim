import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import MaterialFormModal from "../components/MaterialFormModal";
import MovementModal from "../components/MovementModal";
import { formatNumber, materials as mockMaterials } from "../data/mockData";
import type { Material, MaterialType } from "../types";
import { useAuth } from "../lib/auth";
import { listMaterials, subscribeToMaterials, type MovementKind } from "../lib/warehouse";

const TYPES: MaterialType[] = ["ткань", "фурнитура", "упаковка", "нить"];

export default function Warehouse() {
  const { configured, companyId, company } = useAuth();
  const useRealData = configured && !!companyId;
  const usdRate = company?.usdRate ?? 88;

  const [materials, setMaterials] = useState<Material[]>(useRealData ? [] : mockMaterials);
  const [loading, setLoading] = useState(useRealData);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "Все">("Все");

  const [addOpen, setAddOpen] = useState(false);
  const [movement, setMovement] = useState<{
    open: boolean;
    kind: MovementKind;
    materialId?: string;
  }>({ open: false, kind: "in" });

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setFetchError(null);
    try {
      const rows = await listMaterials(companyId!);
      setMaterials(rows);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить материалы");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: остаток меняется у другого юзера → обновляем без F5
  useEffect(() => {
    if (!useRealData || !companyId) return;
    return subscribeToMaterials(companyId, () => {
      void refetch();
    });
  }, [useRealData, companyId, refetch]);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.color.toLowerCase().includes(q) ||
        m.supplier.toLowerCase().includes(q);
      const matchesT = typeFilter === "Все" || m.type === typeFilter;
      return matchesQ && matchesT;
    });
  }, [materials, query, typeFilter]);

  const lowCount = materials.filter((m) => m.stock < m.minStock).length;
  // Стоимость склада: USD-цены конвертируем по текущему курсу компании.
  const totalValue = materials.reduce((s, m) => {
    const kgsPrice = m.priceCurrency === "USD" ? m.pricePerUnit * usdRate : m.pricePerUnit;
    return s + m.stock * kgsPrice;
  }, 0);

  function openMovement(kind: MovementKind, materialId?: string) {
    setMovement({ open: true, kind, materialId });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Склад"
        description="Ткань, фурнитура и упаковка"
        actions={
          <>
            <button
              onClick={() => openMovement("write_off")}
              disabled={!useRealData || materials.length === 0}
              className="btn-secondary"
            >
              <Trash2 className="h-4 w-4" /> Списать
            </button>
            <button
              onClick={() => openMovement("out")}
              disabled={!useRealData || materials.length === 0}
              className="btn-secondary"
            >
              <ArrowUpFromLine className="h-4 w-4" /> Расход
            </button>
            <button
              onClick={() => openMovement("in")}
              disabled={!useRealData || materials.length === 0}
              className="btn-secondary"
            >
              <ArrowDownToLine className="h-4 w-4" /> Приход
            </button>
            <button
              onClick={() => setAddOpen(true)}
              disabled={!useRealData}
              title={useRealData ? undefined : "В демо-режиме создание недоступно"}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" /> Добавить материал
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Позиций на складе" value={String(materials.length)} icon={Boxes} iconTone="brand" />
        <StatCard
          label="Низкий остаток"
          value={`${lowCount} поз.`}
          icon={AlertTriangle}
          iconTone="warning"
          hint="ниже минимального"
        />
        <StatCard
          label="Стоимость склада"
          value={`${formatNumber(totalValue)} сом`}
          icon={PackagePlus}
          iconTone="success"
          hint="ориентировочно"
        />
      </div>

      <Card padding={false} className="mt-6">
        <div className="flex flex-wrap items-center gap-3 border-b border-panel-border p-4">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по материалу, цвету, поставщику…"
              className="input pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MaterialType | "Все")}
            className="input min-w-[150px] py-2"
          >
            <option value="Все">Все типы</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем склад…
          </div>
        ) : fetchError ? (
          <div className="mx-5 my-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            Не удалось загрузить материалы: {fetchError}.{" "}
            <button onClick={refetch} className="font-semibold underline">Повторить</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={materials.length === 0 ? "Склад пустой" : "Ничего не найдено"}
            description={
              materials.length === 0
                ? "Добавьте материалы, чтобы начать вести учёт остатков."
                : "Попробуйте изменить фильтры или поисковый запрос."
            }
            action={
              materials.length === 0 && useRealData ? (
                <button onClick={() => setAddOpen(true)} className="btn-brand">
                  <Plus className="h-4 w-4" /> Добавить материал
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border bg-panel-muted/60 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-600">
                  <th className="px-5 py-3">Материал</th>
                  <th className="px-3 py-3">Тип</th>
                  <th className="px-3 py-3">Цвет</th>
                  <th className="px-3 py-3 text-right">Остаток</th>
                  <th className="px-3 py-3 text-right">Мин. остаток</th>
                  <th className="px-3 py-3">Поставщик</th>
                  <th className="px-3 py-3">Статус</th>
                  <th className="px-3 py-3 text-right">Цена/ед.</th>
                  <th className="px-3 py-3 text-right">Операции</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const low = m.stock < m.minStock;
                  const warn = !low && m.stock < m.minStock * 1.4;
                  return (
                    <tr key={m.id} className="border-b border-panel-border last:border-0 hover:bg-panel-muted/50">
                      <td className="px-5 py-3 align-middle font-medium text-ink-900">{m.name}</td>
                      <td className="px-3 py-3 align-middle"><Badge tone="neutral">{m.type}</Badge></td>
                      <td className="px-3 py-3 align-middle text-ink-800">{m.color || "—"}</td>
                      <td className={`px-3 py-3 text-right align-middle font-semibold tabular-nums ${low ? "text-rose-300" : "text-ink-900"}`}>
                        {formatNumber(m.stock)} {m.unit}
                      </td>
                      <td className="px-3 py-3 text-right align-middle text-ink-600 tabular-nums">
                        {formatNumber(m.minStock)} {m.unit}
                      </td>
                      <td className="px-3 py-3 align-middle text-ink-800">{m.supplier || "—"}</td>
                      <td className="px-3 py-3 align-middle">
                        {low ? (
                          <Badge tone="danger" dot>Низкий остаток</Badge>
                        ) : warn ? (
                          <Badge tone="warning" dot>Скоро закончится</Badge>
                        ) : (
                          <Badge tone="success" dot>В норме</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right align-middle tabular-nums">
                        {m.priceCurrency === "USD" ? (
                          <div className="flex flex-col items-end leading-tight">
                            <span className="font-semibold text-ink-900">
                              ${formatNumber(m.pricePerUnit)}
                            </span>
                            <span className="text-[11px] text-ink-600">
                              ≈ {formatNumber(m.pricePerUnit * usdRate)} сом
                            </span>
                          </div>
                        ) : (
                          <span>{formatNumber(m.pricePerUnit)} сом</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openMovement("in", m.id)}
                            disabled={!useRealData}
                            className="rounded-md p-1.5 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Приход"
                          >
                            <ArrowDownToLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openMovement("out", m.id)}
                            disabled={!useRealData}
                            className="rounded-md p-1.5 text-brand-300 hover:bg-brand-500/15 disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Расход"
                          >
                            <ArrowUpFromLine className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openMovement("write_off", m.id)}
                            disabled={!useRealData}
                            className="rounded-md p-1.5 text-rose-300 hover:bg-rose-500/15 disabled:opacity-40 disabled:hover:bg-transparent"
                            title="Списать"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
        <>
          <MaterialFormModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onCreated={() => {
              setAddOpen(false);
              refetch();
            }}
            companyId={companyId}
          />
          <MovementModal
            open={movement.open}
            onClose={() => setMovement({ open: false, kind: "in" })}
            onSaved={() => {
              setMovement({ open: false, kind: "in" });
              refetch();
            }}
            companyId={companyId}
            initialKind={movement.kind}
            materials={materials}
            materialId={movement.materialId}
          />
        </>
      )}
    </div>
  );
}
