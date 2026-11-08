import Icon from "./Icon";

const BARS = [
  [38, 24], [52, 30], [44, 36], [66, 34], [58, 40], [82, 46],
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-2">
            <span className="size-1.5 rounded-full bg-income" />
            Miễn phí · Không cần đăng ký
          </span>
          <h1 className="mt-5 text-[34px] leading-[1.12] font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-[56px]">
            Biết tiền đi đâu,{" "}
            <span className="bg-gradient-to-r from-accent to-income bg-clip-text text-transparent">giữ tiền được lâu</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-base leading-relaxed text-fg-2 sm:text-lg">
            Ghi lại thu chi hằng ngày trong vài giây, xem biểu đồ rõ ràng và nắm chắc số dư của bạn. Dữ liệu nằm hoàn toàn trên thiết bị của bạn.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#dung-thu" className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white shadow-pop transition-opacity hover:opacity-90">
              Dùng thử ngay <Icon name="arrow" className="size-4" />
            </a>
            <a href="#tinh-nang" className="rounded-[10px] border border-line bg-surface px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface-alt">
              Xem tính năng
            </a>
          </div>
          <dl className="mt-10 grid max-w-[480px] grid-cols-3 gap-4 border-t border-line-light pt-6">
            {[
              ["100%", "riêng tư"],
              ["10 giây", "ghi một khoản"],
              ["0đ", "chi phí"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-mono text-xl font-bold sm:text-2xl">{v}</dt>
                <dd className="mt-0.5 text-xs text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Decorative product preview */}
        <div className="relative animate-fade-up [animation-delay:120ms]" aria-hidden="true">
          <div className="card p-5 shadow-pop">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Số dư tháng này</div>
                <div className="mt-1.5 font-mono text-3xl font-bold text-income">+25.700.000</div>
              </div>
              <span className="rounded-full bg-income-soft px-2.5 py-1 text-xs font-semibold text-income">+12%</span>
            </div>
            <div className="mt-6 flex h-32 items-end gap-3">
              {BARS.map(([a, b], i) => (
                <div key={i} className="flex h-full flex-1 items-end gap-1">
                  <div className="flex-1 rounded-t bg-income" style={{ height: `${a}%` }} />
                  <div className="flex-1 rounded-t bg-expense" style={{ height: `${b}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2.5 border-t border-line-light pt-4">
              {[
                ["🍜", "Ăn uống", "-4,2Tr", "text-expense"],
                ["💼", "Lương tháng", "+18Tr", "text-income"],
                ["🏠", "Nhà cửa", "-3,5Tr", "text-expense"],
              ].map(([i, n, v, c]) => (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-surface-alt">{i}</span>
                  <span className="flex-1 font-medium">{n}</span>
                  <span className={`font-mono font-semibold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-line bg-surface px-4 py-3 shadow-pop sm:block">
            <div className="flex items-center gap-2 text-xs font-semibold text-fg-2">
              <Icon name="trend" className="size-4 text-income" /> Tiết kiệm 44% thu nhập
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
