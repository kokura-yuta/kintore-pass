export function readTrainingDraft(key: string): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
}
export function writeTrainingDraft(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}
