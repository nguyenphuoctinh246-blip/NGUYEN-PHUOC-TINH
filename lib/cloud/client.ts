import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLOUD_KEY, CLOUD_URL, cloudConfigured } from "./config";

let client: SupabaseClient | null = null;

/** Trả về null khi chưa cấu hình (ứng dụng chạy ở chế độ lưu trên máy). */
export function getCloud(): SupabaseClient | null {
  if (!cloudConfigured || typeof window === "undefined") return null;
  client ??= createClient(CLOUD_URL, CLOUD_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
