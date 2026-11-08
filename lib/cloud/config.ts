// Next.js chỉ thay thế các biến NEXT_PUBLIC_* khi được viết nguyên văn như dưới đây.
export const CLOUD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const CLOUD_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const cloudConfigured = Boolean(CLOUD_URL && CLOUD_KEY);
