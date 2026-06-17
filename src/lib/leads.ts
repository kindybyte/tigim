// Принимает форму «Получить демо» и сохраняет заявку в Supabase + отправляет
// уведомление в Telegram через /api/lead-notify. При неудаче сети пишет
// в localStorage как backup чтобы данные не терялись.

import { getSupabase, supabaseConfigured } from "./supabase";

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  workshopType?: string;
  teamSize?: string;
  tier?: string;
  comment?: string;
  source: string; // CTA that triggered the form
}

const STORAGE_KEY = "tigim:pending_leads";

interface LeadRow {
  name: string;
  phone: string;
  email: string | null;
  workshop_type: string | null;
  team_size: string | null;
  tier: string | null;
  comment: string | null;
  source: string | null;
  page_url: string | null;
}

function toRow(payload: LeadPayload): LeadRow {
  return {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || null,
    workshop_type: payload.workshopType ?? null,
    team_size: payload.teamSize ?? null,
    tier: payload.tier ?? null,
    comment: payload.comment?.trim() || null,
    source: payload.source ?? null,
    page_url: typeof window !== "undefined" ? window.location.href : null,
  };
}

function backupLocally(payload: LeadPayload, reason: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.push({
      ...payload,
      submittedAt: new Date().toISOString(),
      failedReason: reason,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage недоступен (private mode и т.д.) — ничего страшного, заявка
    // уже в БД к этому моменту.
  }
}

async function notifyTelegram(payload: LeadPayload): Promise<void> {
  // Fire-and-forget: если телега ляжет, заявка всё равно есть в БД.
  try {
    await fetch("/api/lead-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        workshopType: payload.workshopType,
        teamSize: payload.teamSize,
        tier: payload.tier,
        comment: payload.comment,
        source: payload.source,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });
  } catch (e) {
    console.warn("[leads] telegram notify failed (non-fatal):", e);
  }
}

export async function submitLead(
  payload: LeadPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Без Supabase — fallback на localStorage (например в dev без env vars).
  if (!supabaseConfigured) {
    backupLocally(payload, "supabase_not_configured");
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true };
  }

  try {
    const { error } = await getSupabase()
      .from("leads")
      .insert(toRow(payload));
    if (error) {
      backupLocally(payload, `supabase_error:${error.message}`);
      return {
        ok: false,
        error: "Не удалось отправить. Попробуйте позже или напишите в WhatsApp.",
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network_error";
    backupLocally(payload, msg);
    return {
      ok: false,
      error: "Нет соединения. Заявка сохранилась локально — попробуйте позже.",
    };
  }

  // Telegram — не критично если упадёт.
  void notifyTelegram(payload);

  return { ok: true };
}
