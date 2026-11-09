import type { SupabaseClient } from "@supabase/supabase-js";

/** legacy = cơ sở dữ liệu chưa chạy schema.sql bản mới (chưa có tính năng tài khoản con) */
export interface Workspace { workspaceId: string; role: "owner" | "member"; name: string; canViewAll: boolean; legacy?: boolean }
export interface Person { id: string; name: string; role: "owner" | "member"; canViewAll: boolean | null; joined: string | null }
export interface Invite { id: string; name: string; canViewAll: boolean; expiresAt: string }

type Rpc = { data: unknown; error: { message: string; code?: string } | null };
const rpc = (db: SupabaseClient, fn: string, args?: Record<string, unknown>) => db.rpc(fn, args) as unknown as Promise<Rpc>;

export function friendlyWorkspaceError(msg: string): string {
  if (/invalid_code/.test(msg)) return "Mã mời không đúng, đã hết hạn (7 ngày) hoặc đã được dùng.";
  if (/own_code/.test(msg)) return "Đây là mã bạn tạo; hãy đưa mã cho người khác dùng.";
  if (/already_member/.test(msg)) return "Tài khoản này đã là tài khoản con của một kho dữ liệu.";
  if (/has_data/.test(msg)) return "Tài khoản này đã có giao dịch hoặc mục tiêu riêng nên không thể tham gia kho khác. Hãy tạo tài khoản mới để nhập mã mời.";
  if (/members_cannot_invite|not_approved/.test(msg)) return "Bạn không có quyền thực hiện thao tác này.";
  if (/too_many_invites/.test(msg)) return "Đang có quá nhiều mã mời chưa dùng (tối đa 20). Hãy thu hồi bớt.";
  if (/name_required/.test(msg)) return "Vui lòng nhập tên cho tài khoản con.";
  if (/PGRST202|Could not find the function/i.test(msg)) return "Máy chủ chưa có tính năng tài khoản con. Hãy chạy lại file schema.sql bản mới nhất trong Supabase (SQL Editor).";
  return msg;
}
const fail = (e: { message: string }) => new Error(friendlyWorkspaceError(e.message));

export async function myWorkspace(db: SupabaseClient, fallbackId: string): Promise<Workspace> {
  const { data, error } = await rpc(db, "my_workspace");
  if (error) {
    // Chưa chạy lược đồ mới: coi như chủ tài khoản của chính mình để ứng dụng vẫn chạy
    if (/PGRST202|Could not find the function/i.test(error.message)) return { workspaceId: fallbackId, role: "owner", name: "Chủ tài khoản", canViewAll: true, legacy: true };
    throw fail(error);
  }
  const r = data as { workspace_id: string; role: "owner" | "member"; name: string; can_view_all: boolean };
  return { workspaceId: r.workspace_id, role: r.role, name: r.name, canViewAll: !!r.can_view_all };
}

export async function workspacePeople(db: SupabaseClient): Promise<Person[]> {
  const { data, error } = await rpc(db, "workspace_people");
  if (error) throw fail(error);
  return ((data as { id: string; name: string; role: "owner" | "member"; can_view_all: boolean | null; joined: string | null }[]) ?? []).map((p) => ({ id: p.id, name: p.name, role: p.role, canViewAll: p.can_view_all, joined: p.joined }));
}

export async function createInvite(db: SupabaseClient, name: string, viewAll: boolean): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await rpc(db, "create_invite", { p_name: name, p_view_all: viewAll });
  if (error) throw fail(error);
  const r = data as { code: string; expires_at: string };
  return { code: r.code, expiresAt: r.expires_at };
}

export async function listInvites(db: SupabaseClient): Promise<Invite[]> {
  const { data, error } = await rpc(db, "list_invites");
  if (error) throw fail(error);
  return ((data as { id: string; name: string; can_view_all: boolean; expires_at: string }[]) ?? []).map((i) => ({ id: i.id, name: i.name, canViewAll: i.can_view_all, expiresAt: i.expires_at }));
}

export async function revokeInvite(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await rpc(db, "revoke_invite", { p_id: id });
  if (error) throw fail(error);
}

export async function joinWorkspace(db: SupabaseClient, code: string): Promise<void> {
  const { error } = await rpc(db, "join_workspace", { p_code: code });
  if (error) throw fail(error);
}

export async function updateMember(db: SupabaseClient, id: string, viewAll: boolean | null, name: string | null): Promise<void> {
  const { error } = await rpc(db, "update_member", { p_member: id, p_view_all: viewAll, p_name: name });
  if (error) throw fail(error);
}

export async function removeMember(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await rpc(db, "remove_member", { p_member: id });
  if (error) throw fail(error);
}
