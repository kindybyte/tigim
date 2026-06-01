import { getSupabase } from "./supabase";
import type { VisibleRole } from "./company";

export interface Invitation {
  id: string;
  email: string;
  role: VisibleRole | "master";
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: VisibleRole | "master";
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

function mapRow(row: InvitationRow): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedBy: row.accepted_by,
  };
}

// Локальное хранилище для токена. Когда коллега кликает по ссылке
// /signup?invite=TOKEN, мы сохраняем токен сюда, потому что после
// email-подтверждения и логина URL-параметр потеряется.
const STORAGE_KEY = "tigim_invite_token";

export function rememberInviteToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* private mode etc. — ignore */
  }
}

export function popInviteToken(): string | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v) window.localStorage.removeItem(STORAGE_KEY);
    return v;
  } catch {
    return null;
  }
}

export async function listInvitations(companyId: string): Promise<Invitation[]> {
  const { data, error } = await getSupabase()
    .from("invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as InvitationRow[]).map(mapRow);
}

export async function createInvitation(
  companyId: string,
  createdBy: string | null,
  email: string,
  role: VisibleRole,
): Promise<Invitation> {
  const { data, error } = await getSupabase()
    .from("invitations")
    .insert({
      company_id: companyId,
      email: email.trim().toLowerCase(),
      role,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as InvitationRow);
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await getSupabase().from("invitations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Принять приглашение. Вызывается фронтом после логина — RPC сама
 * добавит юзера в company_members и пометит invite использованным.
 * Возвращает company_id куда пользователь попал.
 */
export async function redeemInvitation(token: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("redeem_invitation", {
    p_token: token,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Полная URL-ссылка для отправки коллеге.
 */
export function inviteUrl(token: string): string {
  return `${window.location.origin}/signup?invite=${token}`;
}
