import { getSupabase } from "./supabase";
import type { Employee, EmployeeRole, StageName } from "../types";

interface EmployeeRow {
  id: string;
  company_id: string;
  name: string;
  role: EmployeeRole;
  stage: StageName | null;
  norm: number;
  salary: number | string;
  status: "active" | "vacation" | "sick" | "fired";
  avatar_color: string | null;
  user_id: string | null;
}

const AVATAR_COLORS = [
  "#2563EB", "#22D3EE", "#A78BFA", "#F59E0B",
  "#F87171", "#34D399", "#EC4899", "#0EA5E9",
  "#10B981", "#6366F1",
];

function pickAvatarColor(name: string): string {
  // Deterministic color from name hash
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  return typeof n === "string" ? parseFloat(n) : n;
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    stage: row.stage ?? "Пошив",
    monthDone: 0, // computed from order_stages once production data is mature
    defectsPct: 0, // computed from defects
    salary: num(row.salary),
    status: row.status === "fired" ? "active" : (row.status as Employee["status"]),
    norm: row.norm,
    avatarColor: row.avatar_color || pickAvatarColor(row.name),
  };
}

export async function listEmployees(companyId: string): Promise<Employee[]> {
  const { data, error } = await getSupabase()
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .neq("status", "fired")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as EmployeeRow[]).map(mapEmployee);
}

export interface NewEmployeeInput {
  name: string;
  role: EmployeeRole;
  stage?: StageName;
  norm?: number;
  salary?: number;
}

export async function createEmployee(
  companyId: string,
  input: NewEmployeeInput,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from("employees")
    .insert({
      company_id: companyId,
      name: input.name,
      role: input.role,
      stage: input.stage || null,
      norm: input.norm ?? 0,
      salary: input.salary ?? 0,
      status: "active",
      avatar_color: pickAvatarColor(input.name),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateEmployee(
  employeeId: string,
  patch: Partial<NewEmployeeInput & { status: Employee["status"] }>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.stage !== undefined) updates.stage = patch.stage || null;
  if (patch.norm !== undefined) updates.norm = patch.norm;
  if (patch.salary !== undefined) updates.salary = patch.salary;
  if (patch.status !== undefined) updates.status = patch.status;

  const { error } = await getSupabase().from("employees").update(updates).eq("id", employeeId);
  if (error) throw new Error(error.message);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  // Soft delete via status = 'fired'
  const { error } = await getSupabase()
    .from("employees")
    .update({ status: "fired" })
    .eq("id", employeeId);
  if (error) throw new Error(error.message);
}
