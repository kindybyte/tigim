import { getSupabase } from "./supabase";
import type {
  Company,
  PaidPlan,
  Payment,
  SubscriptionStatus,
} from "../types";

// --- Customer view: company + краткая инфа о платежах + кол-во членов ---

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: Company["plan"];
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  paidUntil: string | null;
  lastPaidAt: string | null;
  lastPaidAmount: number | null;
  memberCount: number;
  createdAt: string;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  plan: Company["plan"];
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  paid_until: string | null;
  last_paid_at: string | null;
  last_paid_amount: number | string | null;
  created_at: string;
}

function num(n: number | string | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  return typeof n === "string" ? parseFloat(n) : n;
}

// Список всех компаний. Доступен только platform admin (RLS отрежет иначе).
export async function listCustomers(): Promise<Customer[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("companies")
    .select(
      "id, name, phone, plan, subscription_status, trial_ends_at, paid_until, last_paid_at, last_paid_amount, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CustomerRow[];

  // Подтянем имена владельцев через company_members + profiles.
  // Email в profiles нет — он в auth.users (требует service role). Для админ-
  // панели пока обходимся именем + телефоном компании.
  const ids = rows.map((r) => r.id);
  const ownersByCompany = new Map<string, { name: string | null }>();
  if (ids.length > 0) {
    const { data: members } = await sb
      .from("company_members")
      .select("company_id, profiles(full_name)")
      .in("company_id", ids)
      .eq("role", "owner");
    type MemberRow = {
      company_id: string;
      profiles: { full_name: string | null } | null;
    };
    ((members ?? []) as unknown as MemberRow[]).forEach((m) => {
      if (!ownersByCompany.has(m.company_id)) {
        ownersByCompany.set(m.company_id, {
          name: m.profiles?.full_name ?? null,
        });
      }
    });
  }

  // И количество членов.
  const countsByCompany = new Map<string, number>();
  if (ids.length > 0) {
    const { data: allMembers } = await sb
      .from("company_members")
      .select("company_id")
      .in("company_id", ids);
    type CountRow = { company_id: string };
    ((allMembers ?? []) as CountRow[]).forEach((m) => {
      countsByCompany.set(m.company_id, (countsByCompany.get(m.company_id) ?? 0) + 1);
    });
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    ownerName: ownersByCompany.get(r.id)?.name ?? null,
    ownerEmail: null,
    plan: r.plan,
    subscriptionStatus: r.subscription_status,
    trialEndsAt: r.trial_ends_at,
    paidUntil: r.paid_until,
    lastPaidAt: r.last_paid_at,
    lastPaidAmount: num(r.last_paid_amount),
    memberCount: countsByCompany.get(r.id) ?? 0,
    createdAt: r.created_at,
  }));
}

// --- Payments ---

interface PaymentRow {
  id: string;
  company_id: string;
  amount: number | string;
  currency: string;
  period_start: string;
  period_end: string;
  plan: PaidPlan;
  method: Payment["method"];
  notes: string | null;
  created_at: string;
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    companyId: row.company_id,
    amount: typeof row.amount === "string" ? parseFloat(row.amount) : row.amount,
    currency: row.currency,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    plan: row.plan,
    method: row.method,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listPaymentsForCompany(companyId: string): Promise<Payment[]> {
  const { data, error } = await getSupabase()
    .from("payments")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PaymentRow[]).map(mapPayment);
}

export interface NewPaymentInput {
  companyId: string;
  amount: number;
  plan: PaidPlan;
  periodStart: string;     // ISO date
  periodEnd: string;       // ISO date
  method: Payment["method"];
  notes?: string;
}

// Записать оплату. Триггер payments_after_insert сам обновит companies.paid_until,
// last_paid_at, last_paid_amount и subscription_status = 'active'.
export async function recordPayment(input: NewPaymentInput): Promise<void> {
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { error } = await sb.from("payments").insert({
    company_id: input.companyId,
    amount: input.amount,
    currency: "KGS",
    period_start: input.periodStart,
    period_end: input.periodEnd,
    plan: input.plan,
    method: input.method,
    notes: input.notes ?? null,
    recorded_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
}

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: "Trial",
  active: "Оплачено",
  past_due: "Просрочено",
  cancelled: "Отменено",
  expired: "Истекло",
};

export const SUBSCRIPTION_STATUS_TONE: Record<
  SubscriptionStatus,
  "brand" | "success" | "warning" | "danger" | "neutral"
> = {
  trial: "warning",
  active: "success",
  past_due: "danger",
  cancelled: "neutral",
  expired: "danger",
};
