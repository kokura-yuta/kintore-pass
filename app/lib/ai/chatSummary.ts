import { maxChatSummaryCharacters } from '@/app/lib/ai/config';

const marker = '過去の重要な相談:';
// 本人記録は別途毎回取得する。ここでは古い相談だけをAPI通信なしで保持する。
export async function buildChatSummary({ existingSummary, newlyOldUserMessages }: {
  clerkUserId: string; existingSummary: string; newlyOldUserMessages: string[];
}) {
  const position = existingSummary.indexOf(marker);
  const previous = position < 0 ? [] : existingSummary.slice(position + marker.length).split(' / ');
  const notes = [...new Set([...previous, ...newlyOldUserMessages]
    .map(note => note.replace(/\s+/g, ' ').trim().slice(0, 120)).filter(Boolean))].slice(-5);
  return notes.length ? `${marker}${notes.join(' / ')}`.slice(0, maxChatSummaryCharacters) : '';
}
