"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";
import { getSamples } from "@/lib/samples";
import { loadTransactions, saveTransactions } from "@/lib/storage";

/**
 * Transactions persisted in localStorage.
 * Loaded after mount so server and client render the same markup (no hydration mismatch).
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
    // First real entry replaces the sample data
    setTx((prev) => (prev.some((p) => p.isSample) ? [t] : [...prev, t]));
  }, []);

  const remove = useCallback((id: string) => {
    setTx((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setTx([]), []);

  return { tx, ready, hasSamples, add, remove, clear };
}
