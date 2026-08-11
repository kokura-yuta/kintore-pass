export type PreviousSetPreview = {
  weightKg: string;
  reps: string;
};

export const previousRecordPreview: Record<string, PreviousSetPreview[]> = {
  'bench-press': [
    { weightKg: '60', reps: '10' },
    { weightKg: '70', reps: '8' },
    { weightKg: '70', reps: '7' },
  ],
  'incline-dumbbell-press': [
    { weightKg: '20', reps: '10' },
    { weightKg: '22', reps: '9' },
    { weightKg: '22', reps: '8' },
  ],
  'side-raise': [
    { weightKg: '8', reps: '12' },
    { weightKg: '8', reps: '12' },
    { weightKg: '8', reps: '10' },
  ],
};
