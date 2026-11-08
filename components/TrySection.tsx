import ExpenseDashboard from "./ExpenseDashboard";
import { SectionHead } from "./Features";

export default function TrySection() {
  return (
    <section id="dung-thu" className="scroll-mt-16 py-16 sm:py-24">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6">
        <SectionHead eyebrow="Dùng thử" title="Ghi chép ngay tại đây" desc="Thêm giao dịch của bạn và xem biểu đồ cập nhật theo thời gian thực." />
        <div className="mt-10">
          <ExpenseDashboard />
        </div>
      </div>
    </section>
  );
}
