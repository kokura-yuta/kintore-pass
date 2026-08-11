import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

export type WeightRecord = {
  id: string;
  recordedOn: string;
  weightKg: number;
};

const previewRecords: WeightRecord[] = [
  { id: 'preview-1', recordedOn: '2026-08-01', weightKg: 67.4 },
  { id: 'preview-2', recordedOn: '2026-08-03', weightKg: 67.1 },
  { id: 'preview-3', recordedOn: '2026-08-05', weightKg: 66.8 },
  { id: 'preview-4', recordedOn: '2026-08-07', weightKg: 66.9 },
  { id: 'preview-5', recordedOn: '2026-08-09', weightKg: 66.5 },
];

type WeightHistoryContextValue = {
  records: WeightRecord[];
  saveRecord: (record: WeightRecord) => void;
};

const WeightHistoryContext = createContext<WeightHistoryContextValue | null>(null);

export function WeightHistoryProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<WeightRecord[]>(previewRecords);
  const value = useMemo(() => ({
    records,
    saveRecord: (record: WeightRecord) => setRecords((current) => {
      const withoutSameDate = current.filter((item) => item.recordedOn !== record.recordedOn);
      return [...withoutSameDate, record].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
    }),
  }), [records]);

  return <WeightHistoryContext.Provider value={value}>{children}</WeightHistoryContext.Provider>;
}

export function useWeightHistory() {
  const context = useContext(WeightHistoryContext);
  if (!context) throw new Error('useWeightHistory must be used inside WeightHistoryProvider.');
  return context;
}
