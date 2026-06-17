import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  Trash2,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import NoAccess from "../components/ui/NoAccess";
import { useAuth } from "../lib/auth";
import {
  deleteLead,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
  listLeads,
  updateLeadNotes,
  updateLeadStatus,
  type Lead,
  type LeadStatus,
} from "../lib/leadsAdmin";

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

export default function AdminLeads() {
  const { configured, isPlatformAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const refetch = useCallback(async () => {
    if (!configured || !isPlatformAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLeads();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заявки");
    } finally {
      setLoading(false);
    }
  }, [configured, isPlatformAdmin]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.comment ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, query, statusFilter]);

  // Счётчики по статусам — для верхних табов.
  const counts = useMemo(() => {
    const c: Record<LeadStatus | "all", number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
    };
    leads.forEach((l) => {
      c[l.status] = (c[l.status] ?? 0) + 1;
    });
    return c;
  }, [leads]);

  async function handleStatus(id: string, status: LeadStatus) {
    try {
      await updateLeadStatus(id, status);
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось обновить");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить заявку безвозвратно?")) return;
    try {
      await deleteLead(id);
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  if (!configured) {
    return <NoAccess message="Раздел доступен только после подключения Supabase." />;
  }
  if (!isPlatformAdmin) {
    return (
      <NoAccess message="Раздел доступен только владельцу платформы Tigim." />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Заявки с лендинга"
        description={`${leads.length} заявок · ${counts.new} новых · ${counts.won} закрыто`}
      />

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", ...STATUS_OPTIONS] as const).map((s) => {
          const active = statusFilter === s;
          const label = s === "all" ? "Все" : LEAD_STATUS_LABEL[s];
          const count = counts[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-panel-muted text-ink-700 hover:bg-panel-hover"
              }`}
            >
              {label}
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active ? "bg-white/20" : "bg-panel"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card padding={false}>
        <div className="border-b border-panel-border p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-9"
              placeholder="Поиск по имени, телефону, email…"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем заявки…
          </div>
        ) : error ? (
          <div className="mx-5 my-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            <AlertTriangle className="mr-1 inline-block h-4 w-4" />
            {error}{" "}
            <button onClick={() => void refetch()} className="font-semibold underline">
              Повторить
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={leads.length === 0 ? "Заявок ещё нет" : "Ничего не найдено"}
            description={
              leads.length === 0
                ? "Когда кто-то заполнит форму на лендинге — она появится здесь."
                : "Попробуйте сменить фильтр или поисковый запрос."
            }
          />
        ) : (
          <ul className="divide-y divide-panel-border">
            {filtered.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onStatusChange={(s) => void handleStatus(lead.id, s)}
                onDelete={() => void handleDelete(lead.id)}
                onRefetch={() => void refetch()}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

interface LeadRowProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onDelete: () => void;
  onRefetch: () => void;
}

function LeadRow({ lead, onStatusChange, onDelete, onRefetch }: LeadRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const created = new Date(lead.createdAt);
  const dateStr = created.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateLeadNotes(lead.id, notes);
      onRefetch();
      setNotesOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingNotes(false);
    }
  }

  const phoneClean = lead.phone.replace(/[^\d+]/g, "");
  const whatsappLink = `https://wa.me/${phoneClean.replace(/^\+/, "")}`;

  return (
    <li className="p-4 hover:bg-panel-muted/40 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-900">{lead.name}</p>
            <Badge tone={LEAD_STATUS_TONE[lead.status]} dot>
              {LEAD_STATUS_LABEL[lead.status]}
            </Badge>
            {lead.tier && (
              <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200">
                {lead.tier}
              </span>
            )}
            <span className="text-[11px] text-ink-600">· {dateStr}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
            <a
              href={`tel:${phoneClean}`}
              className="inline-flex items-center gap-1 hover:text-brand-300"
            >
              <Phone className="h-3 w-3" /> {lead.phone}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="hover:text-brand-300"
              >
                {lead.email}
              </a>
            )}
            {lead.workshopType && <span>{lead.workshopType}</span>}
            {lead.teamSize && <span>· {lead.teamSize}</span>}
          </div>
          {lead.comment && (
            <p className="mt-2 rounded-lg bg-panel-muted/60 px-3 py-2 text-xs text-ink-800">
              💬 {lead.comment}
            </p>
          )}
          {lead.source && (
            <p className="mt-1 text-[10px] text-ink-600">
              источник: {lead.source}
              {lead.pageUrl && (
                <a
                  href={lead.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline hover:text-brand-300"
                >
                  страница
                </a>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
            title="Написать в WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <select
            value={lead.status}
            onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
            className="input max-w-[170px] py-1.5 text-xs"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className="rounded-md bg-panel-muted px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-panel-hover"
          >
            {notesOpen ? "Закрыть" : "Заметки"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Удалить"
            className="rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {notesOpen && (
        <div className="mt-3 border-t border-panel-border pt-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input resize-none text-sm"
            placeholder="Внутренние заметки: договорились о звонке во вторник, нужен Pro, и т.д."
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes}
              className="btn-brand text-xs"
            >
              {savingNotes ? "Сохраняем…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNotes(lead.notes ?? "");
                setNotesOpen(false);
              }}
              className="btn-secondary text-xs"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
