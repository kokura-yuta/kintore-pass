// Deterministic, local filtering: no profile/record data is sent to another AI.
// This is a first-line filter, not a substitute for reports and human review.
export const reportReasons = ['harassment', 'inappropriate', 'spam', 'other'] as const;
export type ReportReason = typeof reportReasons[number];
export function safeSocialText(value: string | null, fallback = '筋トレPASユーザー') {
  if (!value) return fallback;
  const normalized = value.normalize('NFKC').toLowerCase().replace(/[\s\u200b-\u200f]/g, '');
  if (/(死ね|殺す|殺して|自殺しろ|レイプ|児童ポルノ|fuck|nigger|killyourself)/i.test(normalized)) return fallback;
  return value;
}

export function filterFriendOutput<T>(value: T): T {
  if (Array.isArray(value)) return value.map(filterFriendOutput) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key,
    key === 'name' && typeof child === 'string' ? safeSocialText(child, '非表示の内容') : filterFriendOutput(child),
  ])) as T;
}
