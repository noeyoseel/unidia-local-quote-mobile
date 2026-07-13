import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { QuoteRecord } from "@shared/quote";

const STORAGE_KEY = "@unidia/quote-records/v1";

type QuoteStoreValue = {
  records: QuoteRecord[];
  isHydrated: boolean;
  saveRecord: (record: QuoteRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
  getRecord: (id: string) => QuoteRecord | undefined;
};

const QuoteStoreContext = createContext<QuoteStoreValue | null>(null);

export function QuoteStoreProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<QuoteRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        const parsed = JSON.parse(value) as QuoteRecord[];
        if (Array.isArray(parsed)) setRecords(parsed);
      })
      .catch(() => setRecords([]))
      .finally(() => {
        if (active) setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: QuoteRecord[]) => {
    setRecords(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const saveRecord = useCallback(
    async (record: QuoteRecord) => {
      const next = [record, ...records.filter((item) => item.id !== record.id)].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
      await persist(next);
    },
    [persist, records],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      await persist(records.filter((item) => item.id !== id));
    },
    [persist, records],
  );

  const clearRecords = useCallback(async () => {
    setRecords([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const getRecord = useCallback(
    (id: string) => records.find((item) => item.id === id),
    [records],
  );

  const value = useMemo(
    () => ({ records, isHydrated, saveRecord, deleteRecord, clearRecords, getRecord }),
    [clearRecords, deleteRecord, getRecord, isHydrated, records, saveRecord],
  );

  return <QuoteStoreContext.Provider value={value}>{children}</QuoteStoreContext.Provider>;
}

export function useQuoteStore() {
  const value = useContext(QuoteStoreContext);
  if (!value) throw new Error("useQuoteStore must be used inside QuoteStoreProvider");
  return value;
}
