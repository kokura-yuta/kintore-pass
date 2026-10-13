type Store = { get: (key: string) => string | null; set: (key: string, value: string) => void };
type Manifest = { slot: number; count: number };
function manifest(store: Store, key: string): Manifest | null {
  const raw = store.get(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (![0, 1].includes(value.slot) || !Number.isInteger(value.count) || value.count < 1 || value.count > 10000) throw new Error('Invalid draft manifest');
  return value;
}
export function readChunks(store: Store, key: string): string | null {
  const meta = manifest(store, key);
  if (!meta) return null;
  let result = '';
  for (let index = 0; index < meta.count; index++) {
    const part = store.get(`${key}.${meta.slot}.${index}`);
    if (part === null) throw new Error('Incomplete draft');
    result += part;
  }
  return result;
}
export function writeChunks(store: Store, key: string, value: string): void {
  const previous = manifest(store, key);
  const slot = previous?.slot === 0 ? 1 : 0;
  // Two banks keep the previous draft intact if any individual write fails.
  // 400 Unicode code points stay under 1600 UTF-8 bytes without splitting emoji.
  const parts = value.match(/[\s\S]{1,400}/gu) ?? [''];
  parts.forEach((part, index) => store.set(`${key}.${slot}.${index}`, part));
  store.set(key, JSON.stringify({ slot, count: parts.length }));
}
