import { createContext, useCallback, useContext, useMemo, type PropsWithChildren } from "react";

import type { QuoteRecord } from "@shared/quote";
import { trpc } from "@/lib/trpc";

type QuoteStoreValue = {
  records: QuoteRecord[];
  isHydrated: boolean;
  saveRecord: (record: QuoteRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
  getRecord: (id: string) => QuoteRecord | undefined;
};

const QuoteStoreContext = createContext<QuoteStoreValue | null>(null);

/**
 * Backs the useQuoteStore() interface with the server (both counselors'
 * quotes live in one MySQL table now), instead of per-device AsyncStorage.
 */
export function QuoteStoreProvider({ children }: PropsWithChildren) {
  const utils = trpc.useUtils();
  const listQuery = trpc.quote.list.useQuery();
  const saveMutation = trpc.quote.save.useMutation({
    onSuccess: () => utils.quote.list.invalidate(),
  });
  const deleteMutation = trpc.quote.delete.useMutation({
    onSuccess: () => utils.quote.list.invalidate(),
  });
  const clearAllMutation = trpc.quote.clearAll.useMutation({
    onSuccess: () => utils.quote.list.invalidate(),
  });

  const records = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const saveRecord = useCallback(
    async (record: QuoteRecord) => {
      await saveMutation.mutateAsync(record);
    },
    [saveMutation],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id });
    },
    [deleteMutation],
  );

  const clearRecords = useCallback(async () => {
    await clearAllMutation.mutateAsync();
  }, [clearAllMutation]);

  const getRecord = useCallback((id: string) => records.find((item) => item.id === id), [records]);

  const value = useMemo(
    () => ({
      records,
      isHydrated: !listQuery.isLoading,
      saveRecord,
      deleteRecord,
      clearRecords,
      getRecord,
    }),
    [records, listQuery.isLoading, saveRecord, deleteRecord, clearRecords, getRecord],
  );

  return <QuoteStoreContext.Provider value={value}>{children}</QuoteStoreContext.Provider>;
}

export function useQuoteStore() {
  const value = useContext(QuoteStoreContext);
  if (!value) throw new Error("useQuoteStore must be used inside QuoteStoreProvider");
  return value;
}
