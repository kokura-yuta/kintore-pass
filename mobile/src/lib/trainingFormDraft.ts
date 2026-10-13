import type { ExerciseRecord } from '../components/ExerciseRecordCard';

export type TrainingFormDraft = {
  version: 1;
  exercises: ExerciseRecord[];
  trainingMinutes: string;
  condition: number | null;
  memo: string;
  performedAt: string;
};

export function trainingDraftKey(userId: string, editId?: string) {
  // Encode every code point to avoid collisions and SecureStore-invalid characters.
  const encode = (value: string) => Array.from(value, c => c.codePointAt(0)!.toString(16)).join('-');
  return `training-draft-v1.${encode(userId)}.${editId ? encode(editId) : 'new'}`;
}

export function parseTrainingDraft(raw: string | null): TrainingFormDraft | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value === null) return null;
  if (value.version !== 1 || !Array.isArray(value.exercises)
    || typeof value.trainingMinutes !== 'string' || typeof value.memo !== 'string'
    || !(value.condition === null || (Number.isInteger(value.condition) && value.condition >= 1 && value.condition <= 10))
    || typeof value.performedAt !== 'string' || !Number.isFinite(Date.parse(value.performedAt))
    || !value.exercises.every((e: ExerciseRecord) => e && typeof e.id === 'string'
      && typeof e.name === 'string' && typeof e.category === 'string' && typeof e.equipment === 'string'
      && Array.isArray(e.sets) && e.sets.every(s => s && typeof s.id === 'string' && typeof s.weightKg === 'string' && typeof s.reps === 'string'))) {
    throw new Error('下書きを読み込めませんでした。');
  }
  return value;
}
