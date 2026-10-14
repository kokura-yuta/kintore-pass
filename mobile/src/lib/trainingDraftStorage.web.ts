import { trainingDraftKey } from './trainingFormDraft';
export function readTrainingDraft(key: string): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
}
export function writeTrainingDraft(key: string, value: string): void {
  if (removedUsers.has(prefixOf(key))) throw new Error('削除済みアカウントです。');
  window.localStorage.setItem(key, value);
}
const removedUsers = new Set<string>();
const prefixOf = (key: string) => key.split('.').slice(0, 2).join('.') + '.';
export async function clearUserDrafts(userId: string): Promise<void> {
  const prefix = prefixOf(trainingDraftKey(userId));
  removedUsers.add(prefix);
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(prefix)) window.localStorage.removeItem(key);
  }
}
