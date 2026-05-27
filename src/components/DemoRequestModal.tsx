import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { submitLead } from "../lib/leads";
import { track } from "../lib/analytics";

interface DemoRequestModalProps {
  open: boolean;
  onClose: () => void;
  source: string;
  tier?: string;
}

const WORKSHOP_TYPES = [
  "Швейный цех",
  "Малая фабрика",
  "Производство футболок",
  "Производство худи / свитшотов",
  "Школьная форма",
  "Бренд одежды",
  "Другое",
];

const TEAM_SIZES = ["До 5 человек", "5–15", "15–50", "50–100", "Более 100"];

export default function DemoRequestModal({ open, onClose, source, tier }: DemoRequestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [workshopType, setWorkshopType] = useState(WORKSHOP_TYPES[0]);
  const [teamSize, setTeamSize] = useState(TEAM_SIZES[1]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape, lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => firstInputRef.current?.focus(), 50);
    track("demo_modal_opened", { source, tier });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, source, tier]);

  // Reset state when the modal is reopened
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await submitLead({
      name,
      phone,
      email: email || undefined,
      workshopType,
      teamSize,
      tier,
      comment: comment || undefined,
      source,
    });

    setSubmitting(false);

    if (result.ok) {
      setSuccess(true);
      track("demo_request_submitted", { source, tier, workshopType, teamSize });
    } else {
      setError(result.error || "Не удалось отправить. Попробуйте ещё раз.");
      track("demo_request_failed", { source, error: result.error });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg animate-fade-in rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
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

        {success ? (
          <div className="px-6 py-10 text-center sm:px-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 id="demo-modal-title" className="mt-4 text-xl font-bold text-ink-900">
              Заявка принята
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              Спасибо! Мы свяжемся с вами в течение 1 рабочего дня, чтобы показать систему
              на ваших данных и подобрать тариф.
            </p>
            <button onClick={onClose} className="btn-brand mt-6 w-full justify-center">
              Хорошо
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 id="demo-modal-title" className="text-lg font-bold text-ink-900">
                  Получить демо Tigim
                </h2>
                <p className="mt-0.5 text-sm text-ink-600">
                  Покажем систему на ваших данных за 20 минут. Без оплаты.
                </p>
                {tier && (
                  <p className="mt-1 text-xs font-medium text-brand-300">
                    Интересует тариф: {tier}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="lead-name" className="label">Имя</label>
                <input
                  id="lead-name"
                  ref={firstInputRef}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mt-1.5"
                  placeholder="Айбек Турдубеков"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="lead-phone" className="label">Телефон</label>
                <input
                  id="lead-phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input mt-1.5"
                  placeholder="+996 555 12 34 56"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="lead-email" className="label">Email <span className="text-ink-600">(необязательно)</span></label>
                <input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mt-1.5"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="lead-type" className="label">Тип производства</label>
                <select
                  id="lead-type"
                  value={workshopType}
                  onChange={(e) => setWorkshopType(e.target.value)}
                  className="input mt-1.5"
                >
                  {WORKSHOP_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lead-size" className="label">Размер команды</label>
                <select
                  id="lead-size"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="input mt-1.5"
                >
                  {TEAM_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="lead-comment" className="label">Комментарий <span className="text-ink-600">(необязательно)</span></label>
                <textarea
                  id="lead-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="input mt-1.5 resize-none"
                  placeholder="Какие задачи хотите решить с Tigim?"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-brand mt-5 w-full justify-center py-3 text-base">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Отправляем…
                </>
              ) : (
                <>Отправить заявку</>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-ink-600">
              Нажимая «Отправить», вы соглашаетесь на обработку контактных данных
              для связи с вами по поводу Tigim.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
