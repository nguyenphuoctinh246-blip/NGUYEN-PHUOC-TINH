import { SectionHead } from "./Features";

const STEPS = [
  ["1", "Thêm giao dịch", "Chọn chi tiêu hoặc thu nhập, nhập số tiền, danh mục và ghi chú ngắn."],
  ["2", "Xem biểu đồ", "Ứng dụng tự tổng hợp theo tháng và theo danh mục, không cần tính tay."],
  ["3", "Điều chỉnh thói quen", "Nhìn ra khoản nào tốn nhất và cân đối lại để tiết kiệm nhiều hơn."],
];

export default function HowItWorks() {
  return (
    <section id="cach-dung" className="scroll-mt-16 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Cách dùng" title="Bắt đầu chỉ với ba bước" />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <li key={n} className="relative rounded-2xl border border-line-light bg-surface p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent font-mono text-sm font-bold text-white">{n}</span>
              <h3 className="mt-4 text-base font-bold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
