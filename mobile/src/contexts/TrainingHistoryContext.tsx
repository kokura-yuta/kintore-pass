import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

export type SavedTrainingSet = {
  weightKg: string | null;
  reps: string | null;
};

export type SavedTrainingExercise = {
  exerciseId: string;
  name: string;
  sets: SavedTrainingSet[];
};

export type SavedTrainingRecord = {
  id: string;
  performedOn: string;
  menuId: string | null;
  exercises: SavedTrainingExercise[];
  trainingMinutes: number | null;
  condition: number | null;
  memo: string | null;
};

type TrainingHistoryContextValue = {
  records: SavedTrainingRecord[];
  addRecord: (record: SavedTrainingRecord) => void;
};

const TrainingHistoryContext = createContext<TrainingHistoryContextValue | null>(null);

export function TrainingHistoryProvider({ children }: PropsWithChildren) {
  const [records, setRecords] = useState<SavedTrainingRecord[]>([]);
  const value = useMemo(() => ({
    records,
    addRecord: (record: SavedTrainingRecord) => setRecords((current) => [record, ...current]),
  }), [records]);

  return <TrainingHistoryContext.Provider value={value}>{children}</TrainingHistoryContext.Provider>;
}

export function useTrainingHistory() {
  const context = useContext(TrainingHistoryContext);
  if (!context) throw new Error('useTrainingHistory must be used inside TrainingHistoryProvider.');
  return context;
}
