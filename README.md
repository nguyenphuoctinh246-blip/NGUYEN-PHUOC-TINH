# Quản Lý Chi Tiêu — Next.js (App Router) + Tailwind CSS

Ứng dụng theo dõi thu chi cá nhân, chuyển từ bản HTML tĩnh sang Next.js 16 + Tailwind CSS 4 + TypeScript.

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # bản production
```

## Cấu trúc

```
app/
  layout.tsx         # font Be Vietnam Pro + JetBrains Mono (next/font), metadata
  page.tsx           # trang chính (Server Component)
  globals.css        # design tokens sáng/tối + @theme Tailwind
components/
  ExpenseDashboard.tsx  # Client Component gốc, ghép các khối
  SummaryCards.tsx      # Số dư / Tổng thu / Tổng chi
  BalanceTrend.tsx      # biểu đồ biến động số dư (SVG)
  MonthlyChart.tsx      # cột thu–chi 6 tháng, có tooltip
  BreakdownChart.tsx    # phân bổ theo danh mục (dùng cho cả thu và chi)
  TxForm.tsx            # form thêm giao dịch
  TxHistory.tsx         # lịch sử + tab lọc + xóa 2 bước
hooks/useTransactions.ts  # state + lưu localStorage (nạp sau mount, không lỗi hydration)
lib/                      # types, danh mục, định dạng số/ngày, dữ liệu mẫu, storage
```

Màu sắc khai báo bằng biến CSS trong `globals.css` và ánh xạ sang utility của Tailwind
(`bg-surface`, `text-income`, `border-line`…), tự đổi theo chế độ sáng/tối của hệ thống.
Có thể ép chế độ bằng `<html data-theme="dark">` hoặc `data-theme="light"`.

Dữ liệu lưu trong `localStorage` với key `vn_expense_v2` (giống bản cũ nên dữ liệu cũ vẫn dùng được nếu cùng domain).
