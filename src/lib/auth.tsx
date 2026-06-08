import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";
import type { Company } from "../types";

type CompanyRoleDb = "owner" | "manager" | "warehouse" | "qc" | "staff" | "master" | "technologist";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  companyId: string | null;
  company: Company | null;
  /** Роль текущего пользователя в текущей компании. null если данных нет. */
  currentRole: CompanyRoleDb | null;
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
  const [company, setCompany] = useState<Company | null>(null);
  const [currentRole, setCurrentRole] = useState<CompanyRoleDb | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const fetchCompany = useCallback(async (uid: string | undefined) => {
    if (!uid || !supabaseConfigured) {
      setCompanyId(null);
      setCompany(null);
      setCurrentRole(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    try {
      type CompanyJoinRow = {
        company_id: string;
        role: CompanyRoleDb;
        companies: {
          id: string;
          name: string;
          phone: string | null;
          address: string | null;
          plan: Company["plan"];
          usd_rate: number | string;
          warehouse_mode: Company["warehouseMode"] | null;
          trial_ends_at: string | null;
        } | null;
      };
      const queryPromise: Promise<{
        data: CompanyJoinRow | null;
        error: { message: string } | null;
      }> = Promise.resolve(
        getSupabase()
          .from("company_members")
          .select(
            "company_id, role, companies(id, name, phone, address, plan, usd_rate, warehouse_mode, trial_ends_at)",
          )
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle() as unknown as Promise<{
          data: CompanyJoinRow | null;
          error: { message: string } | null;
        }>,
      );
      const result = await withTimeout(queryPromise, 10000);
      if (result.error) {
        console.warn("[auth] fetch company failed:", result.error.message);
        setCompanyId(null);
        setCompany(null);
        setCurrentRole(null);
      } else {
        setCompanyId(result.data?.company_id ?? null);
        setCurrentRole(result.data?.role ?? null);
        const c = result.data?.companies ?? null;
        setCompany(
          c
            ? {
                id: c.id,
                name: c.name,
                phone: c.phone,
                address: c.address,
                plan: c.plan,
                usdRate:
                  typeof c.usd_rate === "string"
                    ? parseFloat(c.usd_rate)
                    : c.usd_rate ?? 88,
                warehouseMode: c.warehouse_mode ?? "full",
                trialEndsAt: c.trial_ends_at,
              }
            : null,
        );
      }
    } catch (e) {
      console.warn("[auth] fetch company timed out / failed:", e);
      setCompanyId(null);
      setCompany(null);
      setCurrentRole(null);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let mounted = true;
    let lastUserId: string | null = null;

    // Single place to react to session changes. Skipped if user id didn't change
    // (so TOKEN_REFRESHED doesn't re-fetch the company).
    const applySession = (newSession: Session | null) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      const uid = newSession?.user?.id ?? null;
      if (uid === lastUserId) return;
      lastUserId = uid;
      if (uid) {
        // Optimistically show spinner; defer fetch out of the auth-lock.
        setCompanyLoading(true);
        setTimeout(() => {
          if (mounted) void fetchCompany(uid);
        }, 0);
      } else {
        setCompanyId(null);
        setCompany(null);
        setCurrentRole(null);
        setCompanyLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // CRITICAL: do NOT make supabase.from() calls directly here — that
      // causes a deadlock with the auth-state lock. applySession defers
      // any DB call to setTimeout(0).
      applySession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    setCompany(null);
    setCurrentRole(null);
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
        company,
        currentRole,
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
    return "Пароль слишком короткий (минимум 8 символов)";
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
