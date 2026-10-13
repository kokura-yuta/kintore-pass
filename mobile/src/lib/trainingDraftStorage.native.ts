import * as SecureStore from 'expo-secure-store';
import { readChunks, writeChunks } from './chunkedDraftStorage';

const store = {
  get: (key: string) => SecureStore.getItem(key),
  set: (key: string, value: string) => SecureStore.setItem(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
};

// Synchronous writes finish before handing control back to the OS on backgrounding.
export function readTrainingDraft(key: string): string | null {
  return readChunks(store, key);
}
export function writeTrainingDraft(key: string, value: string): void {
  writeChunks(store, key, value);
}
