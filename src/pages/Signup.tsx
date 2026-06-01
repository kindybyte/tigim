import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail, UserPlus } from "lucide-react";
import Logo from "../components/ui/Logo";
import DemoModeBanner from "../components/DemoModeBanner";
import { useAuth } from "../lib/auth";
import { rememberInviteToken } from "../lib/invitations";

export default function Signup() {
  const { signUp, configured } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Если зашли по ссылке-приглашению — сразу сохраняем токен в localStorage,
  // чтобы после email-подтверждения и логина Onboarding его подхватил.
  useEffect(() => {
    if (inviteToken) rememberInviteToken(inviteToken);
  }, [inviteToken]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!configured) {
      setError(
        "Регистрация не настроена. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в Vercel и сделайте Redeploy.",
      );
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, fullName || undefined);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setNeedsConfirmation(true);
      return;
    }
    navigate("/app", { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="На главную" className="inline-block">
          <Logo />
        </Link>

        <DemoModeBanner />
        <div className="rounded-2xl border border-panel-border bg-panel p-7 shadow-soft">
          {needsConfirmation ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                <Mail className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-ink-900">Подтвердите email</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Мы отправили письмо на <span className="font-semibold text-ink-900">{email}</span>.
                Откройте его и перейдите по ссылке, чтобы активировать аккаунт.
              </p>
              <Link to="/login" className="btn-brand mt-6 w-full justify-center">
                Вернуться ко входу
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">Создать аккаунт</h1>
              <p className="mt-1 text-sm text-ink-600">
                {inviteToken
                  ? "Вас пригласили в существующую компанию."
                  : "14 дней бесплатно. Без банковской карты."}
              </p>

              {inviteToken && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-500/15 px-3 py-2.5 text-xs text-brand-200 ring-1 ring-brand-500/30">
                  <UserPlus className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    После регистрации и подтверждения email вы автоматически попадёте в компанию которая вас пригласила — со своей ролью доступа.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signup-name" className="label">Имя</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input mt-1.5"
                    placeholder="Айбек Турдубеков"
                    autoComplete="name"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="label">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input mt-1.5"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="signup-pw" className="label">Пароль</label>
                  <div className="relative mt-1.5">
                    <input
                      id="signup-pw"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="Минимум 6 символов"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-600 hover:bg-panel-muted hover:text-ink-700"
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brand mt-2 w-full justify-center py-3 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Создаём аккаунт…
                    </>
                  ) : (
                    <>
                      Создать аккаунт <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] leading-relaxed text-ink-600">
                  Создавая аккаунт, вы соглашаетесь с{" "}
                  <Link to="/terms" className="font-semibold text-brand-300 hover:underline">условиями использования</Link>
                  {" "}и{" "}
                  <Link to="/privacy" className="font-semibold text-brand-300 hover:underline">политикой конфиденциальности</Link>.
                </p>

                <div className="space-y-1.5 pt-2 text-xs text-ink-600">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Полный доступ ко всем функциям 14 дней
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Без банковской карты, отмена в любой момент
                  </p>
                </div>

                <p className="pt-4 text-center text-sm text-ink-600">
                  Уже есть аккаунт?{" "}
                  <Link to="/login" className="font-semibold text-brand-300 hover:underline">
                    Войти
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
