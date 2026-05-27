import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "./supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
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

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!supabaseConfigured) return { error: "Авторизация не настроена" };
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName) => {
    if (!supabaseConfigured) return { error: "Регистрация не настроена" };
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) return { error: translateAuthError(error.message) };
    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    if (!supabaseConfigured) return;
    await getSupabase().auth.signOut();
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
  if (m.includes("network")) return "Ошибка сети. Проверьте подключение.";
  return msg;
}
