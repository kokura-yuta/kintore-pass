import { apiRequest } from '@/lib/api';

export type TrainingRecordSetInput = {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
};

export type TrainingRecordExerciseInput = {
  exerciseId: string;
  exerciseName: string;
  bodyPart: string;
  bodyArea: string | null;
  displayOrder: number;
  sets: TrainingRecordSetInput[];
};

export type CreateTrainingRecordInput = {
  performedAt: string;
  durationMinutes: number | null;
  conditionScore: number | null;
  memo: string | null;
  exercises: TrainingRecordExerciseInput[];
};

export type CreateTrainingRecordResponse = {
  message: string;
  trainingSessionId: string;
};

export function createTrainingRecord(token: string, input: CreateTrainingRecordInput) {
  return apiRequest<CreateTrainingRecordResponse>('/api/training-records', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}
