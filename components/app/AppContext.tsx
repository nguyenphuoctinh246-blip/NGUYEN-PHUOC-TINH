"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { useStore, type StoreApi } from "@/hooks/useStore";
import { useCloud, type CloudApi } from "@/hooks/useCloud";
import { inPeriod, prevPeriod, totals, type Period } from "@/lib/period";
import type { IconName } from "../Icon";

export const VIEWS = [
  { id: "tong-quan", label: "Tổng quan", icon: "home", color: 1 },
  { id: "giao-dich", label: "Giao dịch", icon: "list", color: 7 },
  { id: "ngan-sach", label: "Ngân sách", icon: "pie", color: 4 },
  { id: "muc-tieu", label: "Mục tiêu", icon: "target", color: 3 },
  { id: "tai-khoan", label: "Tài khoản", icon: "bank", color: 9 },
  { id: "bao-cao", label: "Báo cáo", icon: "chart", color: 5 },
  { id: "danh-muc", label: "Danh mục", icon: "tag", color: 2 },
  { id: "dong-bo", label: "Đồng bộ", icon: "cloud", color: 10 },
  { id: "du-lieu", label: "Dữ liệu", icon: "database", color: 12 },
] as const satisfies readonly { id: string; label: string; icon: IconName; color: number }[];

export type ViewId = (typeof VIEWS)[number]["id"];
export const isView = (s: string): s is ViewId => VIEWS.some((v) => v.id === s);

interface Ctx {
  s: StoreApi;
  cloud: CloudApi;
  period: Period;
  setPeriod: (p: Period) => void;
  inView: Transaction[];
  prev: { inc: number; exp: number; bal: number };
  view: ViewId;
  go: (v: ViewId) => void;
  txModal: { open: boolean; editing: Transaction | null };
  openTx: (t?: Transaction | null) => void;
  closeTx: () => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp phải nằm trong AppProvider");
  return c;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const cloud = useCloud(s);
  const [period, setPeriod] = useState<Period>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [view, setView] = useState<ViewId>("tong-quan");
  const [txModal, setTxModal] = useState<{ open: boolean; editing: Transaction | null }>({ open: false, editing: null });

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      setView(isView(h) ? h : "tong-quan");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = useCallback((v: ViewId) => {
    window.location.hash = v;
    window.scrollTo({ top: 0 });
  }, []);

  const inView = useMemo(() => s.tx.filter((t) => inPeriod(t, period)), [s.tx, period]);
  const prev = useMemo(() => totals(s.tx.filter((t) => inPeriod(t, prevPeriod(period)))), [s.tx, period]);

  const value: Ctx = {
    s, cloud, period, setPeriod, inView, prev, view, go, txModal,
    openTx: (t = null) => setTxModal({ open: true, editing: t }),
    closeTx: () => setTxModal({ open: false, editing: null }),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
