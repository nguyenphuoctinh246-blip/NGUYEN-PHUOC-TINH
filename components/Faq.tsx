import Icon from "./Icon";
import { SectionHead } from "./Features";

const QA = [
  ["Dữ liệu của tôi được lưu ở đâu?", "Toàn bộ dữ liệu lưu trong trình duyệt của bạn (localStorage). Chúng tôi không có máy chủ nên không thể xem hay thu thập dữ liệu của bạn."],
  ["Xóa lịch sử duyệt web thì có mất dữ liệu không?", "Có. Vì dữ liệu nằm trên trình duyệt, việc xóa dữ liệu trang web sẽ xóa luôn các giao dịch đã ghi. Hãy cẩn thận khi dọn dẹp trình duyệt."],
  ["Có cần tạo tài khoản không?", "Không. Bạn chỉ cần mở trang và bắt đầu ghi chép."],
  ["Dữ liệu mẫu là gì?", "Lần đầu mở, ứng dụng nạp một vài giao dịch và mục tiêu mẫu để bạn xem thử. Khi thêm giao dịch đầu tiên của mình, dữ liệu mẫu tự biến mất. Bạn cũng có thể nạp lại dữ liệu mẫu trong mục Dữ liệu."],
  ["Làm sao chuyển dữ liệu sang máy khác?", "Vào mục Dữ liệu, bấm Sao lưu (.json) hoặc Xuất Excel (.csv), rồi mở ứng dụng ở máy kia và bấm Nhập từ file."],
  ["Dùng được trên điện thoại không?", "Được. Giao diện tự co giãn cho điện thoại, máy tính bảng và máy tính."],
];

export default function Faq() {
  return (
    <section id="hoi-dap" className="scroll-mt-16 border-t border-line-light bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHead eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" />
        <div className="mt-10 divide-y divide-line-light rounded-2xl border border-line-light bg-bg">
          {QA.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <Icon name="chevron" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-fg-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
