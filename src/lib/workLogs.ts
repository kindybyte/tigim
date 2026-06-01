import { getSupabase } from "./supabase";
import type { StageName } from "../types";

// ---------- Types ----------

export interface WorkLog {
  id: string;
  orderId: string;
  stageId: string;
  stageName: StageName;
  size: string | null;
  qty: number;
  employeeId: string | null;
  employeeName: string;
  employeeColor: string;
  loggedBy: string | null;
  date: string;
  comment: string | null;
  createdAt: string;
}

interface WorkLogRow {
  id: string;
  company_id: string;
  order_id: string;
  stage_id: string;
  size: string | null;
  qty: number;
  employee_id: string | null;
  logged_by: string | null;
  date: string;
  comment: string | null;
  created_at: string;
  order_stages?: { name: StageName } | null;
  employees?: { name: string; avatar_color: string | null } | null;
}

function mapRow(row: WorkLogRow): WorkLog {
  return {
    id: row.id,
    orderId: row.order_id,
    stageId: row.stage_id,
    stageName: row.order_stages?.name ?? "Пошив",
    size: row.size,
    qty: row.qty,
    employeeId: row.employee_id,
    employeeName: row.employees?.name ?? "—",
    employeeColor: row.employees?.avatar_color ?? "#2563EB",
    loggedBy: row.logged_by,
    date: row.date,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

// ---------- Queries ----------

export async function listWorkLogsForOrder(orderId: string): Promise<WorkLog[]> {
  const { data, error } = await getSupabase()
    .from("work_logs")
    .select(`
      id, company_id, order_id, stage_id, size, qty, employee_id, logged_by,
      date, comment, created_at,
      order_stages ( name ),
      employees ( name, avatar_color )
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as WorkLogRow[]).map(mapRow);
}

// ---------- Mutations ----------

export interface NewWorkLogInput {
  orderId: string;
  stageId: string;
  size?: string | null;
  qty: number;
  employeeId?: string | null;
  date?: string;
  comment?: string;
}

export async function createWorkLog(
  companyId: string,
  loggedBy: string | null,
  input: NewWorkLogInput,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("work_logs")
    .insert({
      company_id: companyId,
      order_id: input.orderId,
      stage_id: input.stageId,
      size: input.size || null,
      qty: input.qty,
      employee_id: input.employeeId || null,
      logged_by: loggedBy,
      date: input.date || new Date().toISOString().slice(0, 10),
      comment: input.comment || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteWorkLog(id: string): Promise<void> {
  const { error } = await getSupabase().from("work_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Realtime ----------

export function subscribeToWorkLogs(
  orderId: string,
  onChange: () => void,
): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`work_logs:${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "work_logs",
        filter: `order_id=eq.${orderId}`,
      },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
