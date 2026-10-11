// Explicit opt-in keeps numeric-only apps (Build 19 and earlier) working.
export const nullableFoodHeader = 'x-kintorepas-food-contract';
export const nullableFoodVersion = 'nullable-v1';

export function acceptsNullableFood(request: Request) {
  return request.headers.get(nullableFoodHeader) === nullableFoodVersion;
}

export function foodResponseRecord<T extends { calories: number | null; proteinGrams: number | null }>(record: T, nullable: boolean) {
  if (nullable) return record;
  // These zeros are transport-only legacy placeholders, never written to the DB.
  return { ...record, calories: record.calories ?? 0, proteinGrams: record.proteinGrams ?? 0 };
}
