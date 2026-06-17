import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import NoAccess from "../components/ui/NoAccess";
import { useAuth } from "../lib/auth";
import {
  deletePayment,
  listCustomers,
  listPaymentsForCompany,
  recordPayment,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_TONE,
  type Customer,
} from "../lib/billing";
import {
  daysUntil,
  nextPeriodEnd,
  PLAN_LABEL,
  PLANS,
} from "../lib/plans";
import type { PaidPlan, Payment, SubscriptionStatus } from "../types";

type StatusFilter = "all" | SubscriptionStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "trial", label: "Trial" },
  { key: "active", label: "Оплачено" },
  { key: "past_due", label: "Просрочено" },
  { key: "expired", label: "Истекло" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function dayWord(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export default function AdminCustomers() {
  const { configured, isPlatformAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recordOpen, setRecordOpen] = useState<Customer | null>(null);

  const refetch = useCallback(async () => {
    if (!configured || !isPlatformAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setLoading(false);
    }
  }, [configured, isPlatformAdmin]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.subscriptionStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.ownerName ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query, statusFilter]);

  // Сводка вверху.
  const stats = useMemo(() => {
    const s = {
      total: customers.length,
      trial: 0,
      active: 0,
      expired: 0,
      revenue30d: 0,
    };
    const cutoff = Date.now() - 30 * 86_400_000;
    customers.forEach((c) => {
      if (c.subscriptionStatus === "trial") s.trial++;
      if (c.subscriptionStatus === "active") s.active++;
      if (c.subscriptionStatus === "expired" || c.subscriptionStatus === "past_due") s.expired++;
      if (
        c.lastPaidAt &&
        c.lastPaidAmount &&
        new Date(c.lastPaidAt).getTime() > cutoff
      ) {
        s.revenue30d += c.lastPaidAmount;
      }
    });
    return s;
  }, [customers]);

  if (!configured) {
    return <NoAccess message="Раздел доступен только после подключения Supabase." />;
  }
  if (!isPlatformAdmin) {
    return <NoAccess message="Раздел доступен только владельцу платформы Tigim." />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Клиенты"
        description={`${stats.total} компаний · ${stats.active} оплачено · ${stats.trial} в trial · ${stats.expired} истекло`}
      />

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatRow icon={Building2} tone="brand" label="Всего" value={stats.total} />
        <StatRow icon={CheckCircle2} tone="success" label="Оплачено" value={stats.active} />
        <StatRow
          icon={AlertTriangle}
          tone="warning"
          label="В trial"
          value={stats.trial}
        />
        <StatRow
          icon={AlertTriangle}
          tone="danger"
          label="Просрочено / истекло"
          value={stats.expired}
        />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatusFilter(s.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-panel-muted text-ink-700 hover:bg-panel-hover"
              }`}
            >
              {s.label}
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
              placeholder="Поиск по компании, телефону, владельцу…"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Загружаем клиентов…
          </div>
        ) : error ? (
          <div className="mx-5 my-6 rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {error}{" "}
            <button onClick={() => void refetch()} className="font-semibold underline">
              Повторить
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={customers.length === 0 ? "Клиентов ещё нет" : "Ничего не найдено"}
            description={
              customers.length === 0
                ? "Когда кто-то зарегистрируется через лендинг — появится здесь."
                : "Попробуйте сменить фильтр или поисковый запрос."
            }
          />
        ) : (
          <ul className="divide-y divide-panel-border">
            {filtered.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                onRecordPayment={() => setRecordOpen(c)}
              />
            ))}
          </ul>
        )}
      </Card>

      {recordOpen && (
        <RecordPaymentModal
          customer={recordOpen}
          onClose={() => setRecordOpen(null)}
          onSaved={() => {
            setRecordOpen(null);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

function StatRow({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Building2;
  tone: "brand" | "success" | "warning" | "danger";
  label: string;
  value: number;
}) {
  const toneClass = {
    brand: "bg-brand-500/15 text-brand-300",
    success: "bg-emerald-500/15 text-emerald-300",
    warning: "bg-amber-500/15 text-amber-300",
    danger: "bg-rose-500/15 text-rose-300",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-panel-border bg-panel p-4">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-ink-600">{label}</p>
        <p className="text-2xl font-bold text-ink-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function CustomerRow({
  customer,
  onRecordPayment,
}: {
  customer: Customer;
  onRecordPayment: () => void;
}) {
  const target = customer.paidUntil ?? customer.trialEndsAt;
  const dleft = daysUntil(target);
  const isUrgent = dleft <= 3;
  const isExpired = dleft < 0;

  const phoneClean = (customer.phone ?? "").replace(/[^\d+]/g, "");
  const whatsappLink = phoneClean
    ? `https://wa.me/${phoneClean.replace(/^\+/, "")}`
    : null;

  return (
    <li className="p-4 hover:bg-panel-muted/40 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-900">{customer.name}</p>
            <Badge tone={SUBSCRIPTION_STATUS_TONE[customer.subscriptionStatus]} dot>
              {SUBSCRIPTION_STATUS_LABEL[customer.subscriptionStatus]}
            </Badge>
            <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200">
              {PLAN_LABEL[customer.plan]}
            </span>
            <span className="text-[11px] text-ink-600">
              · {customer.memberCount} {customer.memberCount === 1 ? "юзер" : "юзеров"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
            {customer.ownerName && <span>{customer.ownerName}</span>}
            {customer.phone && (
              <a
                href={`tel:${phoneClean}`}
                className="inline-flex items-center gap-1 hover:text-brand-300"
              >
                <Phone className="h-3 w-3" /> {customer.phone}
              </a>
            )}
            <span className="text-ink-600">регистрация {fmtDate(customer.createdAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className={isExpired ? "text-rose-300" : isUrgent ? "text-amber-300" : "text-ink-700"}>
              {customer.subscriptionStatus === "trial" ? "Trial до" : "Оплачено до"}{" "}
              {fmtDate(target)}{" "}
              <span className="text-ink-600">
                ({dleft >= 0 ? `${dleft} ${dayWord(dleft)}` : `просрочка ${-dleft} ${dayWord(-dleft)}`})
              </span>
            </span>
            {customer.lastPaidAt && customer.lastPaidAmount !== null && (
              <span className="text-ink-600">
                · последний платёж {customer.lastPaidAmount.toLocaleString("ru-RU")} сом{" "}
                {fmtDate(customer.lastPaidAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
            >
              WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={onRecordPayment}
            className="btn-brand text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Зафиксировать оплату
          </button>
        </div>
      </div>
    </li>
  );
}

// --- Record Payment Modal ---

interface RecordPaymentModalProps {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}

function RecordPaymentModal({ customer, onClose, onSaved }: RecordPaymentModalProps) {
  const [plan, setPlan] = useState<PaidPlan>(
    customer.plan === "trial" ? "pro" : (customer.plan as PaidPlan),
  );
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(() =>
    String(PLANS[customer.plan === "trial" ? "pro" : (customer.plan as PaidPlan)].monthlyPrice),
  );
  const [method, setMethod] = useState<Payment["method"]>("manual");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      setHistory(await listPaymentsForCompany(customer.id));
    } catch (err) {
      console.warn("[admin] load payments failed:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Когда меняется тариф или месяцы — пересчитываем сумму.
  useEffect(() => {
    setAmount(String(PLANS[plan].monthlyPrice * months));
  }, [plan, months]);

  const periodStart =
    customer.paidUntil && new Date(customer.paidUntil) > new Date()
      ? customer.paidUntil
      : new Date().toISOString().slice(0, 10);
  const periodEnd = nextPeriodEnd(customer.paidUntil, months);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const amt = parseFloat(amount) || 0;
      if (amt <= 0) {
        setError("Укажите сумму больше 0.");
        setSaving(false);
        return;
      }
      await recordPayment({
        companyId: customer.id,
        amount: amt,
        plan,
        periodStart,
        periodEnd,
        method,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("Удалить этот платёж? Подписка не пересчитается автоматически.")) return;
    try {
      await deletePayment(id);
      await loadHistory();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-600 hover:bg-panel-muted hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <h2 className="text-xl font-bold text-ink-900">Оплата от «{customer.name}»</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Зафиксируй полученный платёж — система продлит подписку и поменяет тариф.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Тариф</label>
              <div className="mt-1.5 inline-flex w-full rounded-lg border border-panel-border bg-panel-muted p-1">
                {(Object.keys(PLANS) as PaidPlan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                      plan === p
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-ink-700 hover:text-ink-900"
                    }`}
                  >
                    {PLANS[p].name}
                    <span className="ml-1 text-[10px] opacity-80">
                      {PLANS[p].monthlyPrice.toLocaleString("ru-RU")}/мес
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="pay-months" className="label">На сколько месяцев</label>
              <select
                id="pay-months"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                className="input mt-1.5"
              >
                <option value={1}>1 месяц</option>
                <option value={3}>3 месяца</option>
                <option value={6}>6 месяцев</option>
                <option value={12}>12 месяцев</option>
              </select>
            </div>

            <div>
              <label htmlFor="pay-amount" className="label">Сумма (сом)</label>
              <input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input mt-1.5 tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="pay-method" className="label">Способ</label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Payment["method"])}
                className="input mt-1.5"
              >
                <option value="manual">Вручную</option>
                <option value="whatsapp">WhatsApp перевод</option>
                <option value="bank">Банк</option>
                <option value="cash">Наличные</option>
                <option value="freedompay">FreedomPay</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            <div>
              <label className="label">Период действия</label>
              <p className="mt-1.5 rounded-lg border border-panel-border bg-panel-muted px-3 py-2 text-sm tabular-nums">
                {fmtDate(periodStart)} — {fmtDate(periodEnd)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="pay-notes" className="label">Заметки <span className="text-ink-600">(необязательно)</span></label>
              <textarea
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input mt-1.5 resize-none"
                placeholder="Пометки про оплату: банк, номер транзакции, и т.д."
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Отмена
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-brand flex-1 justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…
                </>
              ) : (
                <>Зафиксировать оплату</>
              )}
            </button>
          </div>

          {/* History */}
          <div className="mt-8 border-t border-panel-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              История платежей
            </p>
            {historyLoading ? (
              <p className="mt-3 text-xs text-ink-600">Загружаем…</p>
            ) : history.length === 0 ? (
              <p className="mt-3 text-xs text-ink-600">Платежей ещё не было.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg bg-panel-muted/40 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-ink-900 tabular-nums">
                      {p.amount.toLocaleString("ru-RU")} сом
                    </span>
                    <span className="text-ink-600">{PLAN_LABEL[p.plan]}</span>
                    <span className="text-ink-600">
                      {fmtDate(p.periodStart)} — {fmtDate(p.periodEnd)}
                    </span>
                    <span className="ml-auto text-[11px] text-ink-600">{p.method}</span>
                    <button
                      type="button"
                      onClick={() => void handleDeletePayment(p.id)}
                      aria-label="Удалить платёж"
                      className="rounded p-1 text-ink-600 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
