import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import { isScreenshotMode } from '@/lib/api';

export type GoalBodySelection =
  | { kind: 'preset'; bodyTypeId: 'lean-muscle' | 'v-shape' | 'physique' | 'bulk-up' }
  | { kind: 'custom-image'; imageUri: string; fileName: string | null };

export type TrainingLocation = 'home' | 'gym' | 'both';
export type TrainingStyle = 'full-body' | 'split' | 'ai';

export type ProfileDraft = {
  heightCm: string;
  weightKg: string;
  bodyFatPercentage: string;
  weeklyTrainingDays: number | null;
  availableMinutes: number | null;
  trainingLocation: TrainingLocation | null;
  trainingStyle: TrainingStyle | null;
  weakBodyParts: string[];
};

const initialProfile: ProfileDraft = {
  heightCm: isScreenshotMode ? '175' : '',
  weightKg: isScreenshotMode ? '67.8' : '',
  bodyFatPercentage: isScreenshotMode ? '13.2' : '',
  weeklyTrainingDays: isScreenshotMode ? 4 : null,
  availableMinutes: isScreenshotMode ? 60 : null,
  trainingLocation: isScreenshotMode ? 'gym' : null,
  trainingStyle: isScreenshotMode ? 'split' : null,
  weakBodyParts: isScreenshotMode ? ['背中', '肩'] : [],
};

type OnboardingContextValue = {
  goalBody: GoalBodySelection | null;
  profile: ProfileDraft;
  setGoalBody: (selection: GoalBodySelection) => void;
  setProfile: (profile: ProfileDraft) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [goalBody, setGoalBody] = useState<GoalBodySelection | null>(
    isScreenshotMode ? { kind: 'preset', bodyTypeId: 'lean-muscle' } : null,
  );
  const [profile, setProfile] = useState<ProfileDraft>(initialProfile);
  const value = useMemo(
    () => ({ goalBody, profile, setGoalBody, setProfile }),
    [goalBody, profile],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider.');
  return context;
}
