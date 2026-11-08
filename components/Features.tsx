import Icon, { type IconName } from "./Icon";

const ITEMS: { icon: IconName; title: string; desc: string }[] = [
  { icon: "zap", title: "Ghi chép siêu nhanh", desc: "Nhập số tiền, chọn danh mục là xong. Không màn hình rườm rà, không bước thừa." },
  { icon: "chart", title: "Biểu đồ trực quan", desc: "Thu chi theo tháng, phân bổ theo danh mục và biến động số dư hiển thị ngay khi bạn thêm giao dịch." },
  { icon: "layers", title: "Danh mục rõ ràng", desc: "5 nhóm thu nhập và 8 nhóm chi tiêu quen thuộc: ăn uống, đi lại, nhà cửa, giáo dục…" },
  { icon: "wallet", title: "Nắm số dư tức thì", desc: "Biết ngay mình còn bao nhiêu và đã chi bao nhiêu phần trăm thu nhập." },
  { icon: "shield", title: "Riêng tư tuyệt đối", desc: "Dữ liệu chỉ lưu trong trình duyệt của bạn, không máy chủ, không tài khoản, không theo dõi." },
  { icon: "moon", title: "Sáng và tối", desc: "Giao diện tự theo hệ thống hoặc đổi tay bằng một nút, dịu mắt cả khi ghi chép ban đêm." },
];

export default function Features() {
  return (
    <section id="tinh-nang" className="scroll-mt-16 border-y border-line-light bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Tính năng" title="Mọi thứ bạn cần để quản lý chi tiêu" desc="Đơn giản vừa đủ để bạn duy trì thói quen ghi chép mỗi ngày." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line-light bg-bg p-6 transition-shadow hover:shadow-pop">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
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
