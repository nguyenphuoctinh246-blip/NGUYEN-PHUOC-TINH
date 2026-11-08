import { SectionHead } from "./Features";

const STEPS = [
  ["1", "Thiết lập", "Thêm tài khoản của bạn (tiền mặt, ngân hàng, ví) và đặt hạn mức chi cho từng danh mục."],
  ["2", "Ghi giao dịch", "Nhập khoản thu, chi kèm danh mục, nơi chi tiêu và nhãn. Sửa hoặc xóa lại bất cứ lúc nào."],
  ["3", "Xem báo cáo", "Chọn năm, tháng để xem thu chi, ngân sách, mục tiêu và so sánh với kỳ trước."],
];

export default function HowItWorks() {
  return (
    <section id="cach-dung" className="scroll-mt-16 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Cách dùng" title="Bắt đầu chỉ với ba bước" />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="relative rounded-2xl border border-line-light bg-surface p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to font-mono text-sm font-bold text-white">{n}</span>
              <h3 className="mt-4 text-base font-bold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
