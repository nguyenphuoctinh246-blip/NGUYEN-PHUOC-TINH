import AppLink from "./AppLink";
import Icon from "./Icon";

export default function CtaBanner() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand-from to-brand-to px-6 py-12 text-center text-white sm:px-12">
          <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em] sm:text-4xl">Bắt đầu quản lý chi tiêu ngay hôm nay</h2>
          <p className="mx-auto mt-3 max-w-xl text-base opacity-90">Không cần đăng ký. Mở ứng dụng, xem thử với dữ liệu mẫu, rồi ghi giao dịch đầu tiên của bạn.</p>
          <AppLink href="/ung-dung" className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-sm font-bold text-[#1d4ed8] transition-opacity hover:opacity-90">
            Mở ứng dụng <Icon name="arrow" className="size-4" />
          </AppLink>
        </div>
      </div>
    </section>
  );
}
