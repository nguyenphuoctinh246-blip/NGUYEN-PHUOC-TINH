"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, Goal, Store, Transaction } from "@/lib/types";
import { DEFAULT_ACCOUNTS } from "@/lib/accounts";
import { loadStore, sampleStore, saveStore } from "@/lib/storage";

const EMPTY: Store = { tx: [], accounts: DEFAULT_ACCOUNTS, budgets: {}, goals: [] };

/**
 * Toàn bộ dữ liệu ứng dụng, lưu trong localStorage.
 * Nạp sau khi trang hiển thị để HTML của server và trình duyệt khớp nhau.
 */
export function useStore() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  const hasSamples = store.tx.some((t) => t.isSample) || store.goals.some((g) => g.isSample);

  const dropSamples = (s: Store): Store => ({
    ...s,
    tx: s.tx.filter((t) => !t.isSample),
    goals: s.goals.filter((g) => !g.isSample),
  });

  const addTx = useCallback((t: Transaction) => setStore((s) => ({ ...dropSamples(s), tx: [...dropSamples(s).tx, t] })), []);
  const addManyTx = useCallback((items: Transaction[]) => setStore((s) => ({ ...dropSamples(s), tx: [...dropSamples(s).tx, ...items] })), []);
  const updateTx = useCallback((t: Transaction) => setStore((s) => ({ ...s, tx: s.tx.map((p) => (p.id === t.id ? { ...t, isSample: undefined } : p)) })), []);
  const removeTx = useCallback((id: string) => setStore((s) => ({ ...s, tx: s.tx.filter((t) => t.id !== id) })), []);

  const setBudget = useCallback((cat: string, amount: number) => setStore((s) => {
    const budgets = { ...s.budgets };
    if (amount > 0) budgets[cat] = amount;
    else delete budgets[cat];
    return { ...s, budgets };
  }), []);

  const saveAccount = useCallback((a: Account) => setStore((s) => ({
    ...s,
    accounts: s.accounts.some((x) => x.id === a.id) ? s.accounts.map((x) => (x.id === a.id ? a : x)) : [...s.accounts, a],
  })), []);
  const removeAccount = useCallback((id: string) => setStore((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) })), []);

  const saveGoal = useCallback((g: Goal) => setStore((s) => ({
    ...s,
    goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? { ...g, isSample: undefined } : x)) : [...s.goals, g],
  })), []);
  const removeGoal = useCallback((id: string) => setStore((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })), []);

  const clearSamples = useCallback(() => setStore((s) => dropSamples(s)), []);
  const clearAll = useCallback(() => setStore((s) => ({ ...s, tx: [], goals: [] })), []);
  const restoreSamples = useCallback(() => setStore(sampleStore()), []);

  return { ...store, ready, hasSamples, addTx, addManyTx, updateTx, removeTx, setBudget, saveAccount, removeAccount, saveGoal, removeGoal, clearSamples, clearAll, restoreSamples };
}

export type StoreApi = ReturnType<typeof useStore>;
