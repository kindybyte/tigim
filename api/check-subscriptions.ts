// Vercel cron — раз в сутки. Проверяет все компании:
//   1. paid_until < today → subscription_status = 'expired'
//   2. trial_ends_at < today И plan='trial' → subscription_status = 'expired'
//   3. Для всех у кого ≤3 дня до конца → отправляет сводку в Telegram владельцу.
//
// Защита: Vercel дёргает по cron с заголовком Authorization: Bearer ${CRON_SECRET}.
// Если CRON_SECRET установлен — отвергаем запросы без правильного токена.
//
// Расписание задаётся в vercel.json через "crons": [{ "path": "...", "schedule": "..." }].

import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

interface CompanyRow {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  paid_until: string | null;
}

function daysUntil(isoDate: string | null): number {
  if (!isoDate) return 9999;
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

async function notifyTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.warn("[cron] telegram error:", e);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function runCheck(): Promise<{ scanned: number; expired: number; warned: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env vars not configured");
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await sb
    .from("companies")
    .select("id, name, plan, subscription_status, trial_ends_at, paid_until");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CompanyRow[];

  let expired = 0;
  let warned = 0;
  const warnings: string[] = [];
  const expirations: string[] = [];

  for (const c of rows) {
    const target = c.paid_until ?? c.trial_ends_at;
    const dleft = daysUntil(target);

    // Истёк период — отмечаем expired.
    if (dleft < 0 && c.subscription_status !== "expired" && c.subscription_status !== "cancelled") {
      await sb
        .from("companies")
        .update({ subscription_status: "expired" })
        .eq("id", c.id);
      expired++;
      expirations.push(`• ${escapeHtml(c.name)} (${c.plan})`);
    }

    // За 3 дня предупреждаем владельца Tigim.
    if (
      dleft >= 0 &&
      dleft <= 3 &&
      c.subscription_status !== "expired" &&
      c.subscription_status !== "cancelled"
    ) {
      const word = dleft === 1 ? "день" : dleft >= 2 && dleft <= 4 ? "дня" : "дней";
      const kind = c.subscription_status === "trial" ? "trial" : "подписка";
      warnings.push(
        `• ${escapeHtml(c.name)} (${c.plan}) — ${kind} истекает через ${dleft} ${word}`,
      );
      warned++;
    }
  }

  // Шлём сводку только если есть что сообщать.
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const lines: string[] = [];
  if (warnings.length > 0) {
    lines.push(`⏰ <b>Скоро истекают (${warnings.length}):</b>`);
    lines.push(...warnings);
  }
  if (expirations.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`💀 <b>Истекли сегодня (${expirations.length}):</b>`);
    lines.push(...expirations);
  }
  if (lines.length > 0) {
    const msg = `📊 <b>Tigim · ${today}</b>\n\n${lines.join("\n")}`;
    await notifyTelegram(msg);
  }

  return { scanned: rows.length, expired, warned };
}

export async function GET(req: Request): Promise<Response> {
  // Проверка авторизации (Vercel cron посылает Bearer CRON_SECRET).
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  try {
    const result = await runCheck();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[cron] check-subscriptions failed:", e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
