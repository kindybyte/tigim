import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  companyId: string | null;
  companyLoading: boolean;
  refreshCompany: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const fetchCompany = useCallback(async (uid: string | undefined) => {
    if (!uid || !supabaseConfigured) {
      setCompanyId(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    const { data, error } = await getSupabase()
      .from("company_members")
      .select("company_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[auth] fetch company failed:", error.message);
      setCompanyId(null);
    } else {
      setCompanyId(data?.company_id ?? null);
    }
    setCompanyLoading(false);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) {
        await fetchCompany(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchCompany(newSession.user.id);
      } else {
        setCompanyId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCompany]);

  const refreshCompany = useCallback(async () => {
    await fetchCompany(user?.id);
  }, [fetchCompany, user?.id]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!supabaseConfigured) return { error: "Авторизация не настроена" };
    try {
      const { error } = await withTimeout(
        getSupabase().auth.signInWithPassword({ email, password }),
        15000,
      );
      return error ? { error: translateAuthError(error.message) } : {};
    } catch (e) {
      return { error: errorToMessage(e) };
    }
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName) => {
    if (!supabaseConfigured) return { error: "Регистрация не настроена" };
    try {
      const { data, error } = await withTimeout(
        getSupabase().auth.signUp({
          email,
          password,
          options: {
            data: fullName ? { full_name: fullName } : undefined,
            emailRedirectTo: `${window.location.origin}/login`,
          },
        }),
        15000,
      );
      if (error) return { error: translateAuthError(error.message) };
      return { needsEmailConfirmation: !data.session };
    } catch (e) {
      return { error: errorToMessage(e) };
    }
  };

  const signOut = async () => {
    if (!supabaseConfigured) return;
    await getSupabase().auth.signOut();
    setCompanyId(null);
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    if (!supabaseConfigured) return { error: "Не настроено" };
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (newPassword) => {
    if (!supabaseConfigured) return { error: "Не настроено" };
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        configured: supabaseConfigured,
        companyId,
        companyLoading,
        refreshCompany,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Неверный email или пароль";
  if (m.includes("email not confirmed")) return "Email не подтверждён. Проверьте почту.";
  if (m.includes("user already")) return "Пользователь с таким email уже зарегистрирован";
  if (m.includes("password should be") || m.includes("weak"))
    return "Пароль слишком короткий (минимум 6 символов)";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Слишком много попыток. Подождите и попробуйте снова.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Не удалось подключиться к серверу. Проверьте интернет и URL Supabase.";
  if (m.includes("timeout"))
    return "Сервер не ответил за 15 секунд. Проверьте VITE_SUPABASE_URL и интернет.";
  return msg;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms),
    ),
  ]);
}

function errorToMessage(e: unknown): string {
  if (e instanceof Error) return translateAuthError(e.message);
  return "Неизвестная ошибка";
}
