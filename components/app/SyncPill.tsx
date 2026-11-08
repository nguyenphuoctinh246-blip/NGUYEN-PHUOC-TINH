"use client";

import { useApp } from "./AppContext";

/** Chấm trạng thái đồng bộ ở thanh trên cùng */
export default function SyncPill() {
  const { cloud, go } = useApp();
  if (!cloud.configured) return null;
  const { user, info } = cloud;
  let text = "Chưa đăng nhập";
  let tone = "bg-surface-alt text-fg-2";
  let dot = "bg-muted";
  if (user && cloud.device.status !== "approved") { text = cloud.device.status === "checking" ? "Đang kiểm tra…" : "Chờ xác nhận thiết bị"; tone = "bg-warn-soft text-warn"; dot = "bg-warn animate-pulse"; }
  else if (user && cloud.pendingDevices.length > 0) { text = `${cloud.pendingDevices.length} thiết bị chờ duyệt`; tone = "bg-warn-soft text-warn"; dot = "bg-warn animate-pulse"; }
  else if (user) {
    if (info.status === "syncing" || info.status === "idle") { text = "Đang đồng bộ…"; tone = "bg-warn-soft text-warn"; dot = "bg-warn animate-pulse"; }
    else if (info.status === "synced") { text = info.pending ? `Chờ gửi ${info.pending}` : "Đã đồng bộ"; tone = info.pending ? "bg-warn-soft text-warn" : "bg-income-soft text-income"; dot = info.pending ? "bg-warn" : "bg-income"; }
    else if (info.status === "offline") { text = "Mất kết nối"; tone = "bg-warn-soft text-warn"; dot = "bg-warn"; }
    else { text = "Lỗi đồng bộ"; tone = "bg-expense-soft text-expense"; dot = "bg-expense"; }
  }
  return (
    <button type="button" onClick={() => go("dong-bo")} title={user ? user.email ?? "" : "Đăng nhập để dùng trên nhiều thiết bị"}
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none px-3 text-xs font-semibold ${tone}`}>
      <span className={`size-2 rounded-full ${dot}`} />{text}
    </button>
  );
}
