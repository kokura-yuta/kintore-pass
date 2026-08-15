import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import type { GeneratedMenuPreview } from '@/lib/aiMenuPreview';

export type TrainingDraftExercise = {
  exerciseId: string;
  sets: { weightKg: string; reps: string }[];
};

export type TrainingDraft = {
  menuId: string;
  exercises: TrainingDraftExercise[];
};

export type LatestGeneratedMenu = {
  menu: GeneratedMenuPreview;
  condition: number;
};

type TrainingDraftContextValue = {
  draft: TrainingDraft | null;
  latestGeneratedMenu: LatestGeneratedMenu | null;
  setDraft: (draft: TrainingDraft | null) => void;
  setLatestGeneratedMenu: (menu: LatestGeneratedMenu | null) => void;
};

const TrainingDraftContext = createContext<TrainingDraftContextValue | null>(null);

export function TrainingDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<TrainingDraft | null>(null);
  const [latestGeneratedMenu, setLatestGeneratedMenu] = useState<LatestGeneratedMenu | null>(null);
  const value = useMemo(
    () => ({ draft, latestGeneratedMenu, setDraft, setLatestGeneratedMenu }),
    [draft, latestGeneratedMenu],
  );

  return <TrainingDraftContext.Provider value={value}>{children}</TrainingDraftContext.Provider>;
}

export function useTrainingDraft() {
  const context = useContext(TrainingDraftContext);
  if (!context) throw new Error('useTrainingDraft must be used inside TrainingDraftProvider.');
  return context;
}
