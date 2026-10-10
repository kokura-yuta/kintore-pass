import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { foodRecords, weightRecords } from '@/db/schema';
import { getUserAiContext } from '@/app/lib/ai/getUserAiContext';
import { formatChatContext } from '@/app/lib/ai/chatContextFormat';

// OpenAIは呼ばない。認証済み本人のDB記録を1つの固定形式へ変換する。
export async function getChatContext(clerkUserId: string) {
  const context = await getUserAiContext(clerkUserId, { includeMenuDetails: true, skipFoodRecords: true });
  if (!context) throw new Error('Authenticated user context unavailable');
  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, index) =>
    new Date(now.getTime() + 9 * 60 * 60 * 1000 - index * 86400000).toISOString().slice(0, 10));
  const db = getDb();
  const [dailyFood, weights] = await Promise.all([
    db.select({ date: foodRecords.recordedDate, entries: sql<number>`count(*)::int`,
      calories: sql<number>`coalesce(sum(${foodRecords.calories}), 0)::float8`,
      proteinGrams: sql<number>`coalesce(sum(${foodRecords.proteinGrams}), 0)::float8` })
      .from(foodRecords).where(and(eq(foodRecords.userId, context.userId), gte(foodRecords.recordedDate, dates[6]), lte(foodRecords.recordedDate, dates[0])))
      .groupBy(foodRecords.recordedDate),
    db.select({ recordedDate: weightRecords.recordedDate, weightKg: weightRecords.weightKg })
      .from(weightRecords).where(and(eq(weightRecords.userId, context.userId), lte(weightRecords.recordedDate, dates[0])))
      .orderBy(desc(weightRecords.recordedDate)).limit(7),
  ]);
  const byDate = new Map(dailyFood.map(row => [row.date, row]));
  return formatChatContext(context, dates.map(date => byDate.get(date) ?? { date, entries: 0, calories: 0, proteinGrams: 0 }), weights, now);
}
