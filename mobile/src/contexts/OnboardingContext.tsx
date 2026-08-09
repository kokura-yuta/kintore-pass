import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

export type GoalBodySelection =
  | { kind: 'preset'; bodyTypeId: 'lean-muscle' | 'v-shape' | 'physique' | 'bulk-up' }
  | { kind: 'custom-image'; imageUri: string; fileName: string | null };

export type TrainingLocation = 'home' | 'gym' | 'both';

export type ProfileDraft = {
  heightCm: string;
  weightKg: string;
  bodyFatPercentage: string;
  weeklyTrainingDays: number | null;
  availableMinutes: number | null;
  trainingLocation: TrainingLocation | null;
  weakBodyParts: string[];
};

const initialProfile: ProfileDraft = {
  heightCm: '',
  weightKg: '',
  bodyFatPercentage: '',
  weeklyTrainingDays: null,
  availableMinutes: null,
  trainingLocation: null,
  weakBodyParts: [],
};

type OnboardingContextValue = {
  goalBody: GoalBodySelection | null;
  profile: ProfileDraft;
  setGoalBody: (selection: GoalBodySelection) => void;
  setProfile: (profile: ProfileDraft) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [goalBody, setGoalBody] = useState<GoalBodySelection | null>(null);
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
