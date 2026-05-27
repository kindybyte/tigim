// Sends lead form to a configured endpoint (Formspree / Web3Forms / custom).
// If no endpoint is configured, stores locally so leads aren't lost.

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

const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT as string | undefined;
const FORM_ACCESS_KEY = import.meta.env.VITE_FORM_ACCESS_KEY as string | undefined;
const STORAGE_KEY = "tigim:pending_leads";

export async function submitLead(payload: LeadPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const enriched = {
    ...payload,
    submittedAt: new Date().toISOString(),
    locale: typeof navigator !== "undefined" ? navigator.language : undefined,
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
  };

  // No endpoint configured — keep lead locally for the dev/preview environment.
  if (!FORM_ENDPOINT) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      existing.push(enriched);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    // Pretend network latency so the UI feels real.
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  try {
    const body: Record<string, unknown> = { ...enriched };
    if (FORM_ACCESS_KEY) body.access_key = FORM_ACCESS_KEY;

    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
