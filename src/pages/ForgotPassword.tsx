import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import Logo from "../components/ui/Logo";
import DemoModeBanner from "../components/DemoModeBanner";
import { useAuth } from "../lib/auth";

export default function ForgotPassword() {
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!configured) {
      setTimeout(() => {
        setSent(true);
        setLoading(false);
      }, 500);
      return;
    }

    const result = await resetPassword(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="На главную" className="inline-block">
          <Logo />
        </Link>

        <DemoModeBanner />
        <div className="rounded-2xl border border-panel-border bg-panel p-7 shadow-soft">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                <Mail className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-ink-900">Проверьте почту</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Если аккаунт с email <span className="font-semibold text-ink-900">{email}</span> существует,
                мы отправили ссылку для сброса пароля. Перейдите по ней в течение часа.
              </p>
              <Link to="/login" className="btn-brand mt-6 w-full justify-center">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Назад ко входу
              </Link>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
                Восстановить пароль
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                Укажите email, на который зарегистрирован аккаунт.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="fp-email" className="label">Email</label>
                  <input
                    id="fp-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input mt-1.5"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand w-full justify-center py-3 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Отправляем…
                    </>
                  ) : (
                    <>Отправить ссылку</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
