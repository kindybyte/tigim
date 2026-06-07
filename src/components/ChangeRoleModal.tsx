import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";

import { updateMemberRole, type VisibleRole } from "../lib/company";

interface ChangeRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  memberId: string;
  memberName: string;
  currentRole: VisibleRole | "master";
  isSelf: boolean;        // меняем свою же роль — предупреждаем
  isLastOwner: boolean;   // последний владелец, нельзя понизить
}

const ROLE_OPTIONS: { value: VisibleRole; label: string }[] = [
  { value: "owner", label: "Владелец — полный доступ" },
  { value: "manager", label: "Менеджер — операционка + финансы" },
  { value: "technologist", label: "Технолог — производство без финансов" },
  { value: "warehouse", label: "Склад — материалы и движения" },
  { value: "qc", label: "ОТК — этап ОТК, брак" },
  { value: "staff", label: "Сотрудник — только просмотр" },
];

export default function ChangeRoleModal({
  open,
  onClose,
  onSaved,
  memberId,
  memberName,
  currentRole,
  isSelf,
  isLastOwner,
}: ChangeRoleModalProps) {
  const initial: VisibleRole = currentRole === "master" ? "manager" : currentRole;
  const [role, setRole] = useState<VisibleRole>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setRole(initial);
      setError(null);
      setConfirmed(false);
    }
  }, [open, initial]);

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

  const downgradingSelf = isSelf && currentRole === "owner" && role !== "owner";
  const downgradingLastOwner = isLastOwner && role !== "owner";
  const needsConfirm = downgradingSelf || downgradingLastOwner;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsConfirm && !confirmed) {
      setError("Подтвердите галочкой что понимаете последствия.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await updateMemberRole(memberId, role);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-7 sm:py-7">
          <h2 className="text-lg font-bold text-ink-900">Изменить роль</h2>
          <p className="mt-0.5 text-sm text-ink-600">
            Пользователь: <span className="font-semibold text-ink-800">{memberName}</span>
          </p>

          <label htmlFor="cr-role" className="label mt-5 block">
            Новая роль
          </label>
          <select
            id="cr-role"
            value={role}
            onChange={(e) => setRole(e.target.value as VisibleRole)}
            className="input mt-1.5"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {currentRole === "master" && (
            <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-500/30">
              У этого пользователя сейчас устаревшая роль «Мастер цеха». Сохранив, вы переведёте его на одну из актуальных ролей.
            </p>
          )}

          {needsConfirm && (
            <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {downgradingSelf
                  ? "Я понимаю что потеряю доступ к настройкам компании, приглашениям и управлению пользователями."
                  : "Я понимаю что в компании не останется владельцев — настройки и приглашения станут недоступны."}
              </span>
            </label>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || role === currentRole}
              className="btn-brand flex-1 justify-center"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…</>
              ) : (
                <>Сохранить</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
