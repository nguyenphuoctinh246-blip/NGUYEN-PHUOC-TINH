// Bản xem trước một file không có đồng bộ đám mây: thay thư viện Supabase bằng bản rỗng cho nhẹ.
export function createClient(): never {
  throw new Error("Đồng bộ đám mây không có trong bản xem trước");
}
