import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  ImageIcon,
  Loader2,
  Plus,
  TrendingDown,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import DefectFormModal from "../components/DefectFormModal";
import {
  defects as mockDefects,
  formatDateShort,
  formatNumber,
  formatSom,
} from "../data/mockData";
import type { ChartPoint, Defect } from "../types";
import { useAuth } from "../lib/auth";
import { getSignedDefectPhotoUrl, listDefects, subscribeToDefects } from "../lib/defects";

type DefectWithPhoto = Defect & { photoUrl?: string };

const DONUT_PALETTE = [
  "#3B82F6",
  "#22D3EE",
  "#F59E0B",
  "#F87171",
  "#A78BFA",
  "#34D399",
];

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Get Monday of this week
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 1 - day);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function Defects() {
  const { configured, companyId } = useAuth();
  const useRealData = configured && !!companyId;

  const [defects, setDefects] = useState<DefectWithPhoto[]>(
    useRealData ? [] : (mockDefects as DefectWithPhoto[]),
  );
  const [loading, setLoading] = useState(useRealData);
  const [createOpen, setCreateOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!useRealData) return;
    setLoading(true);
    setFetchError(null);
    try {
      const rows = await listDefects(companyId!);
      setDefects(rows);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить брак");
    } finally {
      setLoading(false);
    }
  }, [useRealData, companyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!useRealData || !companyId) return;
    return subscribeToDefects(companyId, () => void refetch());
  }, [useRealData, companyId, refetch]);

  // Aggregates
  const totalQty = useMemo(() => defects.reduce((s, d) => s + d.qty, 0), [defects]);
  const totalLoss = useMemo(() => defects.reduce((s, d) => s + d.loss, 0), [defects]);

  const byReason = useMemo(() => {
    const map: Record<string, number> = {};
    defects.forEach((d) => {
      map[d.reason] = (map[d.reason] || 0) + d.qty;
    });
    return map;
  }, [defects]);

  const donutItems = useMemo(
    () =>
      Object.entries(byReason).map(([label, value], i) => ({
        label,
        value,
        color: DONUT_PALETTE[i % DONUT_PALETTE.length],
      })),
    [byReason],
  );

  const byEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    defects.forEach((d) => {
      if (d.employee && d.employee !== "—") {
        map[d.employee] = (map[d.employee] || 0) + d.qty;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [defects]);

  const byWeek: ChartPoint[] = useMemo(() => {
    const map = new Map<string, number>();
    defects.forEach((d) => {
      const key = isoWeekKey(d.date);
      map.set(key, (map.get(key) || 0) + d.qty);
    });
    // Last 5 buckets in chronological order
    return Array.from(map.entries())
      .slice(-5)
      .reverse()
      .map(([label, value]) => ({ label, value }));
  }, [defects]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Брак"
        description="Учёт бракованных изделий и финансовых потерь"
        actions={
          <>
            <button className="btn-secondary" disabled>
              <Download className="h-4 w-4" /> Экспорт
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              disabled={!useRealData}
              title={useRealData ? undefined : "В демо-режиме создание недоступно"}
              className="btn-brand"
            >
              <Plus className="h-4 w-4" /> Зафиксировать брак
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Брак за период"
          value={`${totalQty} шт`}
          icon={AlertTriangle}
          iconTone="warning"
        />
        <StatCard
          label="Потери в деньгах"
          value={formatSom(totalLoss)}
          icon={TrendingDown}
          iconTone="danger"
          hint="сумма всех записей"
        />
        <StatCard
          label="Записей"
          value={String(defects.length)}
          icon={AlertTriangle}
          iconTone="warning"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Брак по неделям" subtitle="Последние 5 недель">
          {byWeek.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">Пока нет данных для графика</p>
          ) : (
            <BarChart data={byWeek} color="#EF4444" formatValue={(v) => `${v} шт`} />
          )}
        </Card>
        <Card title="По причинам" subtitle="Распределение по типам">
          {donutItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">Нет записей</p>
          ) : (
            <DonutChart items={donutItems} centerValue={`${totalQty}`} centerLabel="шт" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="История брака">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Загружаем…
            </div>
          ) : fetchError ? (
            <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
              {fetchError}.{" "}
              <button onClick={refetch} className="font-semibold underline">Повторить</button>
            </p>
          ) : defects.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Записей пока нет"
              description="Зафиксируйте первый брак — он сразу появится в истории и в графиках."
              action={
                useRealData ? (
                  <button onClick={() => setCreateOpen(true)} className="btn-brand">
                    <Plus className="h-4 w-4" /> Зафиксировать брак
                  </button>
                ) : undefined
              }
            />
          ) : (
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
                    <th className="py-2.5 pr-3">Этап</th>
                    <th className="py-2.5 pr-3 text-right">Потеря</th>
                    <th className="py-2.5">Фото</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((d) => (
                    <tr key={d.id} className="border-b border-panel-border last:border-0">
                      <td className="py-3 pr-3 text-ink-700">{formatDateShort(d.date)}</td>
                      <td className="py-3 pr-3 font-semibold text-ink-900">
                        {d.orderId !== "—" ? `#${d.orderId}` : "—"}
                      </td>
                      <td className="py-3 pr-3 text-ink-800">{d.product}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded-md bg-panel-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-700">
                          {d.size}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums">{d.qty}</td>
                      <td className="py-3 pr-3"><Badge tone="warning">{d.reason}</Badge></td>
                      <td className="py-3 pr-3 text-ink-800">{d.stage}</td>
                      <td className="py-3 pr-3 text-right font-bold text-rose-300 tabular-nums">
                        −{formatSom(d.loss)}
                      </td>
                      <td className="py-3">
                        {d.photoUrl ? (
                          <DefectPhotoThumb pathOrUrl={d.photoUrl} />
                        ) : (
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel-muted text-ink-600">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Брак по сотрудникам" subtitle={byEmployee.length === 0 ? "Сотрудники появятся на Шаге 17" : "Кто чаще ошибается"}>
          {byEmployee.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">
              Пока нет привязки брака к сотрудникам.
            </p>
          ) : (
            <ul className="space-y-3">
              {byEmployee.map(([name, qty]) => {
                const max = byEmployee[0]?.[1] || 1;
                const pct = Math.round((qty / max) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-800">{name}</span>
                      <span className="font-semibold tabular-nums text-ink-900">{qty} шт</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-panel-muted">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {useRealData && companyId && (
        <DefectFormModal
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

// Bucket приватный (миграция 0013) — каждое фото требует signed URL.
// Подгружаем лениво на mount строки. Ссылка живёт 1 час.
function DefectPhotoThumb({ pathOrUrl }: { pathOrUrl: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedDefectPhotoUrl(pathOrUrl)
      .then((u) => {
        if (cancelled) return;
        if (!u) setFailed(true);
        else setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  if (failed) {
    return (
      <span
        title="Не удалось загрузить фото"
        className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300"
      >
        <ImageIcon className="h-4 w-4" />
      </span>
    );
  }
  if (!url) {
    return (
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel-muted text-ink-600">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt="brak"
        className="h-8 w-8 rounded-md object-cover ring-1 ring-panel-border hover:opacity-80"
      />
    </a>
  );
}
