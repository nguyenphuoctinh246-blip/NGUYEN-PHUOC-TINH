"use client";

import { useState } from "react";
import { useApp } from "../app/AppContext";
import DataTools from "../DataTools";
import { Button, Card } from "../ui";

export default function DataView() {
  const { s, cloud } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <DataTools transactions={s.tx} accounts={s.accounts} hasSamples={s.hasSamples} synced={!!cloud.user} onImport={s.addManyTx} onClear={s.clearAll} />
      {!cloud.user && (
        <Card title="Dữ liệu mẫu" icon="database" color={4}>
          <p className="mb-3 text-[13px] text-muted">Dữ liệu mẫu giúp bạn xem thử biểu đồ và báo cáo. Bạn có thể nạp lại bất cứ lúc nào (thay thế toàn bộ giao dịch và mục tiêu hiện có).</p>
          {confirm ? (
            <span className="flex flex-wrap gap-2"><Button variant="danger" onClick={() => { s.restoreSamples(); setConfirm(false); }}>Xác nhận: thay bằng dữ liệu mẫu</Button><Button onClick={() => setConfirm(false)}>Hủy</Button></span>
          ) : (<Button onClick={() => setConfirm(true)}>Nạp lại dữ liệu mẫu</Button>)}
        </Card>
      )}
      <Card title="Về quyền riêng tư" icon="shield" color={3}>
        <p className="m-0 text-[13px] leading-relaxed text-fg-2">
          {cloud.user
            ? "Bạn đang đăng nhập: dữ liệu được lưu trong tài khoản riêng của bạn trên Supabase và đồng bộ giữa các thiết bị. Chỉ tài khoản của bạn đọc và ghi được dữ liệu này. Vẫn nên sao lưu định kỳ bằng nút Sao lưu (.json)."
            : "Khi chưa đăng nhập, mọi dữ liệu chỉ lưu trong trình duyệt của bạn, không máy chủ nào nhận hay lưu. Xóa dữ liệu trang web hoặc đổi trình duyệt sẽ mất dữ liệu, vì vậy hãy sao lưu định kỳ bằng nút Sao lưu (.json), hoặc đăng nhập ở mục Đồng bộ."}
        </p>
      </Card>
    </div>
  );
}
