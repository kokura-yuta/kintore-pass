import type { ExerciseOption } from './exerciseCatalog';

export function filterPickerExercises(catalog: readonly ExerciseOption[], category: string, query: string, favoriteIds: readonly string[]) {
  const normalizedQuery = query.trim().toLowerCase();
  const favorites = new Set(favoriteIds);
  return catalog.filter(exercise => {
    const matchesCategory = category === 'すべて' || (category === 'お気に入り'
      ? favorites.has(exercise.id) : exercise.category === category);
    const matchesQuery = !normalizedQuery || `${exercise.name}${exercise.equipment}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}
