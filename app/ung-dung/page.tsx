import type { Metadata } from "next";
import AppShell from "@/components/app/AppShell";

export const metadata: Metadata = {
  title: "Ứng dụng | Quản Lý Chi Tiêu",
  description: "Theo dõi giao dịch, ngân sách, mục tiêu tiết kiệm và tài khoản.",
};

export default function AppPage() {
  return <AppShell />;
}
