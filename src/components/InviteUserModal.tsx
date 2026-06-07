import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Loader2, Send, X } from "lucide-react";

import { createInvitation, inviteUrl } from "../lib/invitations";
import { useAuth } from "../lib/auth";
import type { VisibleRole } from "../lib/company";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  companyId: string;
}

const ROLE_OPTIONS: { value: VisibleRole; label: string }[] = [
  { value: "manager", label: "Менеджер — операционка + финансы" },
  { value: "technologist", label: "Технолог — производство без финансов" },
  { value: "warehouse", label: "Склад — материалы и движения" },
  { value: "qc", label: "ОТК — этап ОТК, брак" },
  { value: "staff", label: "Сотрудник — только просмотр" },
  { value: "owner", label: "Владелец — полный доступ" },
];

export default function InviteUserModal({
  open,
  onClose,
  onCreated,
  companyId,
}: InviteUserModalProps) {
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<VisibleRole>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // После создания показываем экран с ссылкой и копированием.
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("staff");
      setError(null);
      setCreatedUrl(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Укажите корректный email.");
      return;
    }
    setLoading(true);
    try {
      const inv = await createInvitation(companyId, user?.id ?? null, trimmed, role);
      setCreatedUrl(inviteUrl(inv.token));
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать приглашение");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — fallback ниже */
    }
  }

  function handleShareWhatsApp() {
    if (!createdUrl) return;
    const text = encodeURIComponent(
      `Приглашаю тебя в Tigim — система управления цехом. Перейди по ссылке и зарегистрируйся:\n${createdUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl border border-panel-border bg-panel shadow-soft sm:rounded-2xl"
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

        <div className="px-5 py-5 sm:px-7 sm:py-7">
          <h2 className="text-lg font-bold text-ink-900">Пригласить пользователя</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Создаём ссылку — копируете и отправляете коллеге в WhatsApp / Telegram. Ссылка живёт 14 дней.
          </p>

          {!createdUrl ? (
            <form onSubmit={handleSubmit} className="mt-5">
              <label htmlFor="iv-email" className="label">
                Email коллеги <span className="text-rose-300">*</span>
              </label>
              <input
                id="iv-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1.5"
                placeholder="manager@example.com"
                autoFocus
              />

              <label htmlFor="iv-role" className="label mt-4 block">Роль</label>
              <select
                id="iv-role"
                value={role}
                onChange={(e) => setRole(e.target.value as VisibleRole)}
                className="input mt-1.5"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              {error && (
                <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                  {error}
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                  Отмена
                </button>
                <button type="submit" disabled={loading} className="btn-brand flex-1 justify-center">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Создаём…</>
                  ) : (
                    <>Создать ссылку</>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5">
              <div className="rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/30">
                <p className="font-semibold">Ссылка создана</p>
                <p className="mt-0.5 text-xs text-emerald-200/80">
                  Отправьте её на <span className="font-semibold">{email}</span> в WhatsApp, Telegram или email.
                  После регистрации по этой ссылке коллега автоматически попадёт в вашу компанию с ролью «{ROLE_OPTIONS.find(r => r.value === role)?.label.split(" — ")[0]}».
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-panel-border bg-panel-muted/40 p-2">
                <code className="flex-1 truncate px-2 text-xs text-ink-800">{createdUrl}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-3 text-xs font-semibold transition ${
                    copied
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-brand-600 text-white hover:bg-brand-500"
                  }`}
                >
                  {copied ? <><Check className="h-3 w-3" /> Скопировано</> : <><Copy className="h-3 w-3" /> Копировать</>}
                </button>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="btn-secondary mt-3 w-full justify-center"
              >
                <Send className="h-4 w-4" /> Отправить в WhatsApp
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn-brand mt-3 w-full justify-center"
              >
                Готово
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
