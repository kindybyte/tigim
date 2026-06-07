import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "../components/ui/Logo";
import DemoModeBanner from "../components/DemoModeBanner";
import { useAuth } from "../lib/auth";

export default function ResetPassword() {
  const { updatePassword, configured, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    setLoading(true);

    if (!configured) {
      setTimeout(() => {
        setDone(true);
        setLoading(false);
      }, 400);
      return;
    }

    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/app", { replace: true }), 1500);
  }

  // Если Supabase настроен, но в сессии нет recovery-токена — не пускаем
  const invalidSession = configured && !authLoading && !user;

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="На главную" className="inline-block">
          <Logo />
        </Link>

        <DemoModeBanner />
        <div className="rounded-2xl border border-panel-border bg-panel p-7 shadow-soft">
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-ink-900">Пароль обновлён</h1>
              <p className="mt-2 text-sm text-ink-700">Сейчас перенаправим вас в приложение…</p>
            </div>
          ) : invalidSession ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-ink-900">Ссылка недействительна</h1>
              <p className="mt-2 text-sm text-ink-700">
                Похоже, ссылка устарела или уже использована. Запросите новую.
              </p>
              <Link to="/forgot-password" className="btn-brand mt-6 w-full justify-center">
                Запросить новую ссылку
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">Новый пароль</h1>
              <p className="mt-1 text-sm text-ink-600">Придумайте надёжный пароль для входа.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="rp-pw" className="label">Новый пароль</label>
                  <div className="relative mt-1.5">
                    <input
                      id="rp-pw"
                      type={show ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="Минимум 8 символов"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-600 hover:bg-panel-muted hover:text-ink-700"
                      aria-label={show ? "Скрыть" : "Показать"}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="rp-pw2" className="label">Повторите пароль</label>
                  <input
                    id="rp-pw2"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input mt-1.5"
                    placeholder="Тот же пароль ещё раз"
                    autoComplete="new-password"
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Сохраняем…
                    </>
                  ) : (
                    <>Сохранить пароль</>
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
