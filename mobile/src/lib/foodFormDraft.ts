import type { MealType } from './foodRecords';
export type FoodFormDraft = { entryDate: string; editingId: string | null; mealType: MealType; name: string; calories: string; protein: string };
export function parseFoodDraft(raw: string | null): FoodFormDraft | null {
  const value = raw ? JSON.parse(raw) : null;
  if (value === null) return null;
  if (!value || !['entryDate', 'name', 'calories', 'protein'].every(k => typeof value[k] === 'string')
    || !(value.editingId === null || typeof value.editingId === 'string')
    || !['朝食', '昼食', '夕食', '間食'].includes(value.mealType)) throw new Error('Invalid food draft');
  return value;
}
