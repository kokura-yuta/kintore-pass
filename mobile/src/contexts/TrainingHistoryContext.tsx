import { useAuth } from '@clerk/expo';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { exerciseCatalog } from '@/lib/exerciseCatalog';
import { getTrainingRecords } from '@/lib/trainingRecords';

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
  isLoading: boolean;
  errorMessage: string;
  reloadRecords: () => Promise<void>;
};

const TrainingHistoryContext = createContext<TrainingHistoryContextValue | null>(null);

export function TrainingHistoryProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [records, setRecords] = useState<SavedTrainingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const reloadRecords = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const token = await getToken();
      if (!token) throw new Error('ログインを確認できませんでした。');
      const response = await getTrainingRecords(token);
      const mappedRecords = response.records
        .map((record): SavedTrainingRecord => ({
          id: record.id,
          performedOn: formatLocalDate(new Date(record.performedAt)),
          menuId: null,
          exercises: record.exercises.map((exercise, index) => ({
            exerciseId: exerciseCatalog.find((item) => item.name === exercise.exerciseName)?.id ?? `${record.id}-exercise-${index}`,
            name: exercise.exerciseName,
            sets: [...exercise.sets]
              .sort((a, b) => a.setNumber - b.setNumber)
              .map((set) => ({
                weightKg: set.weightKg === null ? null : String(set.weightKg),
                reps: set.reps === null ? null : String(set.reps),
              })),
          })),
          trainingMinutes: record.durationMinutes,
          condition: record.conditionScore,
          memo: record.memo,
        }))
        .sort((a, b) => b.performedOn.localeCompare(a.performedOn));
      setRecords(mappedRecords);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '履歴の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    const timeoutId = setTimeout(() => {
      if (isSignedIn) void reloadRecords();
      else setRecords([]);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, reloadRecords]);

  const value = useMemo(() => ({
    records,
    addRecord: (record: SavedTrainingRecord) => setRecords((current) => [record, ...current]),
    isLoading,
    errorMessage,
    reloadRecords,
  }), [errorMessage, isLoading, records, reloadRecords]);

  return <TrainingHistoryContext.Provider value={value}>{children}</TrainingHistoryContext.Provider>;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useTrainingHistory() {
  const context = useContext(TrainingHistoryContext);
  if (!context) throw new Error('useTrainingHistory must be used inside TrainingHistoryProvider.');
  return context;
}
