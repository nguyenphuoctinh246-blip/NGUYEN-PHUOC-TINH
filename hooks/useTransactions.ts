"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";
import { getSamples } from "@/lib/samples";
import { loadTransactions, saveTransactions } from "@/lib/storage";

/**
 * Giao dịch được lưu trong localStorage.
 * Nạp sau khi trang hiển thị để HTML của server và trình duyệt khớp nhau (không lỗi hydration).
 */
export function useTransactions() {
  const [tx, setTx] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTx(loadTransactions() ?? getSamples());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveTransactions(tx);
  }, [tx, ready]);

  const hasSamples = tx.some((t) => t.isSample);

  const add = useCallback((t: Transaction) => {
    // Giao dịch thật đầu tiên sẽ thay thế dữ liệu mẫu
    setTx((prev) => [...prev.filter((p) => !p.isSample), t]);
  }, []);

  const update = useCallback((t: Transaction) => {
    setTx((prev) => prev.map((p) => (p.id === t.id ? { ...t, isSample: false } : p)));
  }, []);

  const remove = useCallback((id: string) => {
    setTx((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Thêm nhiều giao dịch (nhập file). Dữ liệu mẫu bị loại bỏ. */
  const addMany = useCallback((items: Transaction[]) => {
    setTx((prev) => [...prev.filter((p) => !p.isSample), ...items]);
  }, []);

  const clear = useCallback(() => setTx([]), []);

  return { tx, ready, hasSamples, add, update, remove, addMany, clear };
}
