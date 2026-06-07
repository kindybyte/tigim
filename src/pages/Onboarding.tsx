import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  Loader2,
  LogOut,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import Logo from "../components/ui/Logo";
import { useAuth } from "../lib/auth";
import { getSupabase, supabaseConfigured } from "../lib/supabase";
import { popInviteToken, redeemInvitation } from "../lib/invitations";

type Step = "welcome" | "company" | "done" | "redeeming" | "invite_failed";

const FEATURES = [
  { icon: ClipboardList, text: "Все заказы и этапы в одном окне" },
  { icon: Workflow, text: "Канбан производства" },
  { icon: Boxes, text: "Склад тканей и фурнитуры" },
  { icon: Users, text: "Сотрудники, нормы, зарплаты" },
  { icon: Wallet, text: "Финансовая аналитика" },
  { icon: AlertTriangle, text: "Учёт брака и потерь" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshCompany, signOut, configured } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("KGS");
  const [timezone, setTimezone] = useState("Asia/Bishkek");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // На старте — если в localStorage висит invite token, погашаем его и
  // отправляем пользователя в приложение. Свою компанию НЕ создаём.
  useEffect(() => {
    if (!configured || !user) return;
    const token = popInviteToken();
    if (!token) return;

    setStep("redeeming");
    redeemInvitation(token)
      .then(async () => {
        await refreshCompany();
        navigate("/app", { replace: true });
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        setInviteError(translateInviteError(msg));
        setStep("invite_failed");
      });
  }, [configured, user, refreshCompany, navigate]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!configured) {
      // Mock mode: pretend it worked
      setTimeout(() => {
        setStep("done");
        setLoading(false);
      }, 500);
      return;
    }

    // 1) Create company via RPC (atomic: company + owner membership)
    const { data: newCompanyId, error: rpcError } = await getSupabase().rpc("create_company", {
      p_name: name.trim(),
      p_phone: phone.trim() || null,
      p_address: address.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    // 2) Update non-default fields if user changed them
    if (currency !== "KGS" || timezone !== "Asia/Bishkek") {
      const { error: updErr } = await getSupabase()
        .from("companies")
        .update({ currency, timezone })
        .eq("id", newCompanyId as string);
      if (updErr) {
        // Non-fatal — company exists; just log it.
        console.warn("[onboarding] settings update failed:", updErr.message);
      }
    }

    // 3) Refresh auth context so it picks up the new companyId
    await refreshCompany();

    setStep("done");
    setLoading(false);
  }

  async function handleSignOut() {
    if (configured) await signOut();
    navigate("/login");
  }

  return (
    <div className="grid min-h-screen bg-surface">
      {/* Header strip */}
      <header className="flex h-16 items-center justify-between border-b border-panel-border px-4 sm:px-6">
        <Link to="/" aria-label="На главную">
          <Logo />
        </Link>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900"
        >
          <LogOut className="h-3.5 w-3.5" /> Выйти
        </button>
      </header>

      <main className="flex items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-xl">
          {/* Progress (скрыт во время приёма приглашения) */}
          {step !== "redeeming" && step !== "invite_failed" && <ProgressBar step={step} />}

          {step === "redeeming" && (
            <div className="rounded-2xl border border-panel-border bg-panel p-8 text-center shadow-soft">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-300" />
              <p className="mt-4 text-sm text-ink-700">Принимаем приглашение в команду…</p>
            </div>
          )}

          {step === "invite_failed" && (
            <div className="rounded-2xl border border-panel-border bg-panel p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30">
                <ArrowLeft className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-xl font-bold text-ink-900">
                Не удалось принять приглашение
              </h1>
              <p className="mt-2 text-sm text-ink-700">{inviteError}</p>
              <button
                onClick={() => setStep("welcome")}
                className="btn-brand mt-5 w-full justify-center"
              >
                Создать свою компанию вместо этого
              </button>
            </div>
          )}

          {step === "welcome" && (
            <div className="rounded-2xl border border-panel-border bg-panel p-8 shadow-soft">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                <Factory className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">
                Добро пожаловать в Tigim
                {user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name as string}` : ""}!
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Давайте создадим ваш цех в системе. Это займёт меньше минуты.
                Потом сможете добавить сотрудников, заказы и материалы.
              </p>

              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm text-ink-800">
                    <f.icon className="h-4 w-4 shrink-0 text-brand-300" />
                    {f.text}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30">
                <p className="font-semibold">14 дней бесплатно</p>
                <p className="mt-0.5 text-xs text-emerald-200/80">
                  Полный доступ ко всем функциям. Без банковской карты.
                </p>
              </div>

              <button
                onClick={() => setStep("company")}
                className="btn-brand mt-6 w-full justify-center py-3 text-base"
              >
                Создать цех <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === "company" && (
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-panel-border bg-panel p-8 shadow-soft"
            >
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Назад
              </button>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
                Данные вашего цеха
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                Эти данные используются в счетах, отчётах и заголовках страниц.
              </p>

              <div className="mt-6 grid gap-4">
                <div>
                  <label htmlFor="onb-name" className="label">
                    Название компании <span className="text-rose-300">*</span>
                  </label>
                  <input
                    id="onb-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input mt-1.5"
                    placeholder='Цех "Бишкек Текстиль"'
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="onb-phone" className="label">Телефон</label>
                  <input
                    id="onb-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input mt-1.5"
                    placeholder="+996 555 12 34 56"
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label htmlFor="onb-address" className="label">Адрес</label>
                  <input
                    id="onb-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input mt-1.5"
                    placeholder="г. Бишкек, ул. Льва Толстого, 17"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="onb-currency" className="label">Валюта</label>
                    <select
                      id="onb-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="input mt-1.5"
                    >
                      <option value="KGS">сом (KGS)</option>
                      <option value="KZT">тенге (KZT)</option>
                      <option value="RUB">рубль (RUB)</option>
                      <option value="UZS">сум (UZS)</option>
                      <option value="USD">доллар (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="onb-tz" className="label">Часовой пояс</label>
                    <select
                      id="onb-tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="input mt-1.5"
                    >
                      <option value="Asia/Bishkek">Бишкек (UTC+6)</option>
                      <option value="Asia/Almaty">Алматы (UTC+5)</option>
                      <option value="Asia/Tashkent">Ташкент (UTC+5)</option>
                      <option value="Europe/Moscow">Москва (UTC+3)</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || name.trim().length < 2}
                className="btn-brand mt-6 w-full justify-center py-3 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Создаём…
                  </>
                ) : (
                  <>
                    Создать цех <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="rounded-2xl border border-panel-border bg-panel p-8 text-center shadow-soft">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">
                Цех создан!
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {name ? `«${name}»` : "Ваш цех"} готов к работе. Trial 14 дней активирован —
                полный доступ ко всем функциям.
              </p>

              <div className="mt-6 grid gap-2 rounded-xl bg-panel-muted p-4 text-left text-xs text-ink-700">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Добавьте первый заказ
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Загрузите остатки склада
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Пригласите сотрудников (Настройки → Пользователи)
                </p>
              </div>

              <button
                onClick={() => navigate("/app", { replace: true })}
                className="btn-brand mt-6 w-full justify-center py-3 text-base"
              >
                Перейти в дашборд <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function translateInviteError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("expired"))
    return "Срок приглашения истёк. Попросите владельца сгенерировать новую ссылку.";
  if (m.includes("already used"))
    return "Приглашение уже было использовано. Если это были вы — просто зайдите в Tigim. Иначе попросите новую ссылку.";
  if (m.includes("not found"))
    return "Ссылка некорректна или была отозвана. Попросите владельца сгенерировать новую.";
  if (m.includes("not authenticated"))
    return "Сессия истекла. Зайдите снова и переоткройте ссылку.";
  return msg;
}

function ProgressBar({ step }: { step: Step }) {
  const stepIndex = step === "welcome" ? 0 : step === "company" ? 1 : 2;
  const dots = [
    { label: "Начало" },
    { label: "Данные цеха" },
    { label: "Готово" },
  ];
  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      {dots.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                i < stepIndex
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : i === stepIndex
                    ? "bg-brand-600 text-white"
                    : "bg-panel-muted text-ink-600"
              }`}
            >
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={`mt-1.5 text-[10px] font-medium tracking-wide ${
                i <= stepIndex ? "text-ink-800" : "text-ink-600"
              }`}
            >
              {d.label}
            </span>
          </div>
          {i < dots.length - 1 && (
            <span
              className={`h-px w-8 sm:w-12 ${
                i < stepIndex ? "bg-emerald-500/60" : "bg-panel-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
