import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { useAuth } from "./auth";
import type { CompanyStage } from "../types";

interface CompanyStageRow {
  id: string;
  company_id: string;
  name: string;
  position: number;
  is_terminal: boolean;
  is_active: boolean;
}

function map(row: CompanyStageRow): CompanyStage {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    position: row.position,
    isTerminal: row.is_terminal,
    isActive: row.is_active,
  };
}

export async function listCompanyStages(companyId: string): Promise<CompanyStage[]> {
  const { data, error } = await getSupabase()
    .from("company_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as CompanyStageRow[]).map(map);
}

export interface NewStageInput {
  name: string;
  isTerminal?: boolean;
}

// Создать этап. position автоматически = max(position) + 1.
export async function createCompanyStage(
  companyId: string,
  input: NewStageInput,
): Promise<void> {
  const sb = getSupabase();
  const { data: maxRow } = await sb
    .from("company_stages")
    .select("position")
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow as { position: number } | null)?.position ?? 0) + 1;
  const { error } = await sb.from("company_stages").insert({
    company_id: companyId,
    name: input.name.trim(),
    position: nextPos,
    is_terminal: input.isTerminal ?? false,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function renameCompanyStage(stageId: string, newName: string): Promise<void> {
  const { error } = await getSupabase()
    .from("company_stages")
    .update({ name: newName.trim() })
    .eq("id", stageId);
  if (error) throw new Error(error.message);
}

export async function setStageActive(stageId: string, isActive: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("company_stages")
    .update({ is_active: isActive })
    .eq("id", stageId);
  if (error) throw new Error(error.message);
}

export async function deleteCompanyStage(stageId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("company_stages")
    .delete()
    .eq("id", stageId);
  if (error) throw new Error(error.message);
}

// Поменять местами две позиции (drag-drop / up-down).
export async function swapStagePositions(
  companyId: string,
  aId: string,
  bId: string,
): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb
    .from("company_stages")
    .select("id, position")
    .eq("company_id", companyId)
    .in("id", [aId, bId]);
  const rows = (data ?? []) as { id: string; position: number }[];
  if (rows.length !== 2) throw new Error("Этапы не найдены");
  const a = rows.find((r) => r.id === aId)!;
  const b = rows.find((r) => r.id === bId)!;
  // Используем временное значение чтобы обойти UNIQUE constraint.
  const tmp = -1;
  await sb.from("company_stages").update({ position: tmp }).eq("id", aId);
  await sb.from("company_stages").update({ position: a.position }).eq("id", bId);
  await sb.from("company_stages").update({ position: b.position }).eq("id", aId);
}

// --- React-хук с кэшем для использования в EmployeeFormModal, DefectFormModal и т.д. ---

export interface UseCompanyStagesResult {
  stages: CompanyStage[];
  activeStages: CompanyStage[];     // только is_active
  activeStageNames: string[];        // shortcut — имена активных, в порядке position
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCompanyStages(): UseCompanyStagesResult {
  const { configured, companyId } = useAuth();
  const [stages, setStages] = useState<CompanyStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!configured || !companyId) {
      setStages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCompanyStages(companyId);
      setStages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить этапы");
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [configured, companyId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const activeStages = stages.filter((s) => s.isActive);
  const activeStageNames = activeStages.map((s) => s.name);

  return { stages, activeStages, activeStageNames, loading, error, refetch };
}
