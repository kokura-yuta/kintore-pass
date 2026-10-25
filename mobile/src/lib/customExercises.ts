import type { ExerciseOption, ExerciseCategory } from './exerciseCatalog';

const parts = ['胸', '背中', '肩', '腕', '脚', '腹筋'];
export function makeCustomExercise(id: string, name: string, category: ExerciseCategory, equipment: string, catalog: readonly ExerciseOption[]): ExerciseOption {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) throw new Error('種目名を1〜60文字で入力してください。');
  if (!parts.includes(category)) throw new Error('部位を選んでください。');
  if (equipment.trim().length > 40) throw new Error('器具は40文字以内で入力してください。');
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '');
  if (catalog.some(item => normalize(item.name) === normalize(cleanName))) throw new Error('同じ名前の種目があります。検索して追加してください。');
  return { id, name: cleanName, category, equipment: equipment.trim() || '自作種目' };
}
export function parseCustomExercises(raw: string | null): ExerciseOption[] {
  const items: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(items)) throw new Error('Invalid custom exercises');
  const result: ExerciseOption[] = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.startsWith('custom-') || typeof item.name !== 'string' || typeof item.equipment !== 'string' || result.some(e => e.id === item.id)) throw new Error('Invalid custom exercise');
    result.push(makeCustomExercise(item.id, item.name, item.category, item.equipment, result));
  }
  return result;
}
