import { eq, sql } from 'drizzle-orm';
import { getClerkUserId } from '@/app/lib/auth/clerk-auth';
import { getDb } from '@/db';
import { appUsageDays, users } from '@/db/schema';
import { logServerError } from '@/app/lib/observability/serverLog';

// userId・日付をクライアントから受け取らない。本人の当日分だけ、重複なしで保存する。
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const clerkId = await getClerkUserId(request);
    if (!clerkId) return Response.json({ error: 'ログインが必要です。' }, { status: 401, headers });
    const db = getDb();
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkId)).limit(1);
    if (!user) return Response.json({ error: 'ユーザー初期化待ちです。' }, { status: 404, headers });
    await db.insert(appUsageDays).values({ userId: user.id, activityDate: sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date` }).onConflictDoNothing();
    return Response.json({ recorded: true }, { headers });
  } catch (error) {
    logServerError('activity.record', error);
    return Response.json({ error: '利用状況を記録できませんでした。' }, { status: 503, headers });
  }
}
