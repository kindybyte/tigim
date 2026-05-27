import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Plus, Search } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import { Boxes, PackagePlus, Truck } from "lucide-react";
import { formatNumber, materials } from "../data/mockData";
import type { MaterialType } from "../types";

const TYPES: MaterialType[] = ["ткань", "фурнитура", "упаковка", "нить"];

export default function Warehouse() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "Все">("Все");

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || m.name.toLowerCase().includes(q) || m.color.toLowerCase().includes(q) || m.supplier.toLowerCase().includes(q);
      const matchesT = typeFilter === "Все" || m.type === typeFilter;
      return matchesQ && matchesT;
    });
  }, [query, typeFilter]);

  const lowCount = materials.filter((m) => m.stock < m.minStock).length;
  const totalValue = materials.reduce((s, m) => s + m.stock * m.pricePerUnit, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Склад"
        description="Ткань, фурнитура и упаковка"
        actions={
          <>
            <button className="btn-secondary"><ArrowUpFromLine className="h-4 w-4" /> Списать</button>
            <button className="btn-secondary"><ArrowDownToLine className="h-4 w-4" /> Приход</button>
            <button className="btn-brand"><Plus className="h-4 w-4" /> Добавить материал</button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Позиций на складе" value={String(materials.length)} icon={Boxes} iconTone="brand" />
        <StatCard label="Низкий остаток" value={`${lowCount} поз.`} icon={AlertTriangle} iconTone="warning" hint="ниже минимального" />
        <StatCard label="Стоимость склада" value={`${formatNumber(totalValue)} сом`} icon={PackagePlus} iconTone="success" hint="ориентировочно" />
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
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

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
                <th className="px-3 py-3"></th>
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
                    <td className="px-3 py-3 align-middle text-ink-800">{m.color}</td>
                    <td className={`px-3 py-3 text-right align-middle font-semibold tabular-nums ${low ? "text-rose-300" : "text-ink-900"}`}>
                      {formatNumber(m.stock)} {m.unit}
                    </td>
                    <td className="px-3 py-3 text-right align-middle text-ink-600 tabular-nums">
                      {formatNumber(m.minStock)} {m.unit}
                    </td>
                    <td className="px-3 py-3 align-middle text-ink-800">{m.supplier}</td>
                    <td className="px-3 py-3 align-middle">
                      {low ? (
                        <Badge tone="danger" dot>Низкий остаток</Badge>
                      ) : warn ? (
                        <Badge tone="warning" dot>Скоро закончится</Badge>
                      ) : (
                        <Badge tone="success" dot>В норме</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right align-middle tabular-nums">{formatNumber(m.pricePerUnit)} сом</td>
                    <td className="px-3 py-3 align-middle">
                      <button className="rounded-md p-1.5 text-ink-600 hover:bg-panel-muted hover:text-ink-700" aria-label="Операция">
                        <Truck className="h-4 w-4" />
                      </button>
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
