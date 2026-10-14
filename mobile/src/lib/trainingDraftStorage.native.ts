import * as SecureStore from 'expo-secure-store';
import { readChunks, writeChunks } from './chunkedDraftStorage';
import { trainingDraftKey } from './trainingFormDraft';

const removedUsers = new Set<string>();
const cached = new Map<string, string>();
const chunks = new Map<string, string | null>();
const prefixOf = (key: string) => key.split('.').slice(0, 2).join('.');
function register(key: string) {
  const indexKey = `${prefixOf(key)}.index`;
  const keys: string[] = JSON.parse(readChunks(store, indexKey) ?? '[]');
  if (!keys.includes(key)) writeChunks(store, indexKey, JSON.stringify([...keys, key]));
}

const store = {
  get: (key: string) => {
    if (chunks.has(key)) return chunks.get(key)!;
    const value = SecureStore.getItem(key);
    chunks.set(key, value);
    return value;
  },
  set: (key: string, value: string) => {
    if (chunks.get(key) === value) return;
    SecureStore.setItem(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    chunks.set(key, value);
  },
};

// Synchronous writes finish before handing control back to the OS on backgrounding.
export function readTrainingDraft(key: string): string | null {
  if (removedUsers.has(prefixOf(key))) return null;
  register(key);
  return readChunks(store, key);
}
export function writeTrainingDraft(key: string, value: string): void {
  if (removedUsers.has(prefixOf(key))) throw new Error('削除済みアカウントです。');
  if (cached.get(key) === value) return;
  register(key);
  writeChunks(store, key, value);
  cached.set(key, value);
}

export async function clearUserDrafts(userId: string, recordIds: string[] = []): Promise<void> {
  const base = trainingDraftKey(userId);
  const prefix = prefixOf(base);
  removedUsers.add(prefix);
  const indexKey = `${prefix}.index`;
  const cleanupKey = `${prefix}.cleanup`;
  const pending = readChunks(store, cleanupKey);
  const deletionKeys: string[] = pending ? JSON.parse(pending) : [];
  if (!pending) {
    const keys: string[] = JSON.parse(readChunks(store, indexKey) ?? '[]');
    for (const key of new Set([...keys.filter(k => prefixOf(k) === prefix), base, ...recordIds.map(id => trainingDraftKey(userId, id)), indexKey])) {
      for (const bank of [0, 1]) {
        for (let index = 0; index < 10000; index++) {
          const partKey = `${key}.${bank}.${index}`;
          if (await SecureStore.getItemAsync(partKey) === null) break;
          deletionKeys.push(partKey);
        }
      }
      deletionKeys.push(key);
      cached.delete(key);
    }
    writeChunks(store, cleanupKey, JSON.stringify(deletionKeys));
  }
  for (const key of deletionKeys) {
    if (!key.startsWith(prefix + '.')) throw new Error('Invalid cleanup key');
    await SecureStore.deleteItemAsync(key);
    chunks.delete(key);
    cached.delete(key);
  }
  // Keep a non-sensitive retry manifest: repeating deletion is safe after interruption.
}
