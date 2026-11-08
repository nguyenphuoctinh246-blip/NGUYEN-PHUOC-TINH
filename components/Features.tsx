import Icon, { type IconName } from "./Icon";

const ITEMS: { icon: IconName; title: string; desc: string; color: number }[] = [
  { icon: "zap", title: "Ghi giao dịch đầy đủ", desc: "Số tiền, danh mục tự tạo, ngày, tài khoản, nơi chi tiêu, nhãn và ghi chú. Gõ nhanh với gợi ý từ những lần trước.", color: 1 },
  { icon: "pie", title: "Ngân sách theo danh mục", desc: "Đặt hạn mức mỗi tháng, thanh tiến độ đổi màu khi sắp hết hoặc vượt mức, kèm gợi ý quy tắc 50/30/20.", color: 4 },
  { icon: "target", title: "Mục tiêu tiết kiệm", desc: "Đặt số tiền và hạn hoàn thành, ứng dụng tính ra số tiền cần để dành mỗi tháng.", color: 3 },
  { icon: "wallet", title: "Nhiều tài khoản và ví", desc: "Tiền mặt, ngân hàng, ví điện tử, thẻ tín dụng. Xem tổng tài sản ròng và số dư từng tài khoản.", color: 9 },
  { icon: "chart", title: "Báo cáo theo năm, tháng", desc: "Chọn kỳ bất kỳ để xem thu chi, so sánh với kỳ trước, phân bổ danh mục và nơi chi nhiều nhất.", color: 5 },
  { icon: "shield", title: "Riêng tư, xuất Excel", desc: "Dữ liệu chỉ nằm trong trình duyệt của bạn. Xuất Excel (.csv), sao lưu và nhập lại bất cứ lúc nào.", color: 7 },
];

export default function Features() {
  return (
    <section id="tinh-nang" className="scroll-mt-16 border-y border-line-light bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Tính năng" title="Mọi thứ bạn cần để quản lý chi tiêu" desc="Đơn giản vừa đủ để bạn duy trì thói quen ghi chép mỗi ngày." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line-light bg-bg p-6 transition-shadow hover:shadow-pop">
              <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, var(--cat-${f.color}) 16%, transparent)`, color: `var(--cat-${f.color})` }}>
                <Icon name={f.icon} />
              </span>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{f.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-bold tracking-[0.1em] text-accent uppercase">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">{title}</h2>
      {desc && <p className="mt-3 text-base text-fg-2">{desc}</p>}
    </div>
  );
}
