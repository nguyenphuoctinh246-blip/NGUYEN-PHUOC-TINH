# Quản Lý Chi Tiêu — Next.js (App Router) + Tailwind CSS

Ứng dụng theo dõi thu chi cá nhân, chuyển từ bản HTML tĩnh sang Next.js 16 + Tailwind CSS 4 + TypeScript.

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # bản production
```

## Đưa lên web

Xem [DEPLOY.md](./DEPLOY.md) (Vercel hoặc GitHub Pages).

## Cấu trúc

```
app/page.tsx            # trang giới thiệu (landing)
app/ung-dung/page.tsx   # ứng dụng quản lý chi tiêu (/ung-dung)
components/app/         # khung ứng dụng: sidebar, chọn kỳ, hộp thoại giao dịch, context
components/views/       # Tổng quan, Giao dịch, Ngân sách, Mục tiêu, Tài khoản, Báo cáo, Dữ liệu
components/             # biểu đồ, bảng tháng, công cụ nhập/xuất, các khối của landing
hooks/useStore.ts       # toàn bộ dữ liệu + lưu localStorage (khóa vn_expense_v3)
lib/                    # kiểu dữ liệu, danh mục, tài khoản, ngân sách, thống kê, nhập/xuất CSV-JSON
preview/, scripts/      # bản xem trước một file HTML (npm run build:preview)
```

Đồng bộ nhiều thiết bị (tùy chọn): `lib/cloud/` (engine đồng bộ, Supabase), `hooks/useCloud.ts`, `supabase/schema.sql`, `tests/`. Xem DEPLOY.md.

Dữ liệu cũ (khóa `vn_expense_v2`) được tự động chuyển sang định dạng mới.
